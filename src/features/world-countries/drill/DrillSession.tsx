import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { MultipleChoice } from '@/core/ui/MultipleChoice'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import { shuffle } from '@/core/scoring/quiz'
import type { Country } from '@/features/world-countries/data/countries'
import { classifyRecallAnswer } from '@/features/world-countries/learning/recallAnswerMatching'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldCountriesMapActivitySurface, type WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import { getWorldCountriesTaskHighlightFill, type WorldCountriesAnswerKind } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import { WorldCountriesTypedAnswer } from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import type { WorldCountriesDrillSelection } from './drillSelection'
import { DrillSessionRails } from './DrillSessionRails'
import { PracticeSessionRails } from './PracticeSessionRails'
import { getDrillModeDefinition } from './drillModes'
import type { WorldCountriesProficiencySelection } from './drillProficiencyScope'
import { deriveDrillSessionProgress } from './drillSessionProgress'
import { deriveDrillTaskPresentation, type DrillTaskPresentation } from './drillTaskPresentation'
import {
  getCurrentDrillStep,
  type DrillAnswerRecord,
  type DrillSessionState,
} from './drillSessionState'

const SUCCESS_FEEDBACK_DURATION_MS = 500
const CORRECTION_FEEDBACK_DURATION_MS = 1800

interface StepFeedback {
  answer: string
  correct: boolean
  match: 'none' | 'exact' | 'fuzzy'
  expectedAnswer: string
  answerKind: WorldCountriesAnswerKind
}

export type DrillSessionInteraction = 'recall' | 'location-click'

function answerValues(skill: WorldCountriesRecallSkill, entries: readonly Country[]): string[] {
  return entries.map(entry => skill === 'country-to-capital' ? entry.capital : entry.country)
}

function buildChoiceOptions(expected: string, values: readonly string[]): string[] {
  const alternatives = [...new Set(values.filter(value => value !== expected))]
  return shuffle([expected, ...shuffle(alternatives).slice(0, 3)])
}

export function DrillSession({
  answerMode,
  fuzzyMatching,
  state,
  selection,
  entries,
  onAnswer,
  onContinue,
  onExit,
  interaction = 'recall',
  activity = 'drill',
  learningStates = [],
  proficiencySelection = [],
  activeCountries,
  mnemonicVersion = 0,
  onMnemonicChanged = () => undefined,
}: {
  answerMode: AnswerMode
  fuzzyMatching: boolean
  state: DrillSessionState
  selection: WorldCountriesDrillSelection
  entries: readonly Country[]
  /** Full active population used for geographic feedback context. */
  activeCountries?: readonly Country[]
  onAnswer: (record: DrillAnswerRecord) => void
  onContinue: (correct: boolean) => void
  onExit: () => void
  interaction?: DrillSessionInteraction
  activity?: 'drill' | 'practice'
  learningStates?: LearningStates
  proficiencySelection?: WorldCountriesProficiencySelection
  mnemonicVersion?: number
  onMnemonicChanged?: () => void
}) {
  const step = getCurrentDrillStep(state)
  const [feedback, setFeedback] = useState<StepFeedback | null>(null)
  const [mnemonicOpenFor, setMnemonicOpenFor] = useState<string | null>(null)
  const [assistedFor, setAssistedFor] = useState<string | null>(null)
  const startedAtRef = useRef(typeof performance === 'undefined' ? Date.now() : performance.now())
  const stepKey = step ? `${step.countryId}-${step.skill}` : null
  const mnemonicOpen = stepKey !== null && mnemonicOpenFor === stepKey
  const assisted = stepKey !== null && assistedFor === stepKey

  useEffect(() => {
    setFeedback(null)
    setMnemonicOpenFor(null)
    setAssistedFor(null)
    startedAtRef.current = typeof performance === 'undefined' ? Date.now() : performance.now()
  }, [stepKey])

  useEffect(() => {
    if (!feedback || feedback.match === 'fuzzy' || mnemonicOpen) return
    const timer = window.setTimeout(() => {
      setFeedback(null)
      onContinue(feedback.correct)
    }, feedback.correct ? SUCCESS_FEEDBACK_DURATION_MS : CORRECTION_FEEDBACK_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [feedback, mnemonicOpen, onContinue, step?.countryId, step?.skill])

  const country = step ? entries.find(entry => entry.id === step.countryId) : undefined
  const countryById = useMemo(() => new Map(entries.map(entry => [entry.id, entry])), [entries])
  const answerOptions = useMemo(() => {
    if (!step) return []
    const expected = country && step.skill === 'country-to-capital' ? country.capital : country?.country
    return expected ? buildChoiceOptions(expected, answerValues(step.skill, entries)) : []
  }, [country, entries, step])

  if (!step || !country) return null

  const expectedAnswer = step.skill === 'country-to-capital' ? country.capital : country.country
  const task = deriveDrillTaskPresentation(step.skill, country)
  const answerKind = task.answerKind
  const isLocationQuestion = step.skill === 'location-to-country'
  const isShapeQuestion = step.skill === 'shape-to-country'
  const isCapitalQuestion = step.skill === 'capital-to-country'
  const isLocationPractice = interaction === 'location-click' && isLocationQuestion
  const isCapitalLocationPractice = interaction === 'location-click' && isCapitalQuestion
  const isMapClickPractice = isLocationPractice || isCapitalLocationPractice
  const isTypedRecall = answerMode === 'typing' && !isMapClickPractice
  const scopeCountries = state.countryIds
    .map(countryId => countryById.get(countryId))
    .filter((entry): entry is Country => entry !== undefined)
  const mapCountries = isShapeQuestion ? (activeCountries ?? entries) : entries
  const shapeSubregionCountries = mapCountries.filter(entry => entry.subregionId === country.subregionId)
  const getShapeMapCountryIds = (outcome: string | null): readonly string[] | undefined => {
    if (!isShapeQuestion) return undefined
    return outcome === 'incorrect'
      ? shapeSubregionCountries.map(entry => entry.id)
      : [country.id]
  }
  const now = () => typeof performance === 'undefined' ? Date.now() : performance.now()

  const submit = (answer: string) => {
    if (feedback) return
    const match = classifyRecallAnswer(step.skill, answer, country, {
      fuzzy: fuzzyMatching,
      countryCandidates: scopeCountries,
      capitalCandidates: scopeCountries.map(entry => entry.capital),
    })
    const correct = match !== 'none'
    const elapsed = Math.max(0, now() - startedAtRef.current)
    setFeedback({ answer, correct, match, expectedAnswer, answerKind })
    onAnswer({
      countryId: step.countryId,
      skill: step.skill,
      answer,
      correct,
      at: Date.now(),
      ms: elapsed,
      evidenceKind: answerMode === 'typing' ? 'recall' : 'recognition',
      ...(assisted ? { assisted: true } : {}),
    })
  }

  const submitLocation = (countryId: string) => {
    if (feedback) return
    const selectedCountry = scopeCountries.find(entry => entry.id === countryId)
    if (!selectedCountry) return
    const correct = selectedCountry.id === country.id
    const elapsed = Math.max(0, now() - startedAtRef.current)
    setFeedback({ answer: selectedCountry.country, correct, match: 'exact', expectedAnswer: country.country, answerKind })
    onAnswer({
      countryId: country.id,
      skill: isCapitalLocationPractice ? 'capital-to-country' : 'location-to-country',
      answer: selectedCountry.country,
      correct,
      at: Date.now(),
      ms: elapsed,
      evidenceKind: 'recognition',
      ...(assisted ? { assisted: true } : {}),
    })
  }

  const feedbackText = feedback
    ? feedback.correct
      ? feedback.match === 'fuzzy'
        ? `Correct. The canonical answer is ${feedback.expectedAnswer}.`
        : 'Correct.'
      : `The correct ${feedback.answerKind} is ${feedback.expectedAnswer}.`
    : null
  const displayedFeedback = feedback
  const highlightedCountryId = isShapeQuestion
    ? feedback ? country.id : null
    : isMapClickPractice
    ? feedback ? country.id : null
    : isCapitalQuestion ? (feedback ? country.id : null) : country.id
  const namedCountryId = isShapeQuestion
    ? feedback ? country.id : null
    : isLocationQuestion || isCapitalQuestion
    ? feedback ? country.id : null
    : country.id
  const practiceNamedCountryId = isMapClickPractice ? (feedback ? country.id : null) : namedCountryId
  const practiceFeedbackText = displayedFeedback
    ? displayedFeedback.correct
      ? 'Correct location.'
      : `That was ${displayedFeedback.answer} — ${country.country} is highlighted.`
    : null
  const progress = deriveDrillSessionProgress(state)
  const activityTask: WorldCountriesActivityTask = {
    direction: task.direction,
    cue: task.cue,
    sessionContext: (
      <>
        <span className="text-zinc-300">{selection.continent}</span> · {activity === 'practice' ? 'Practice' : getDrillModeDefinition(state.mode).label}
      </>
    ),
    answerKind,
    progress: {
      label: 'Country',
      current: progress.countryPosition,
      total: progress.totalCountries,
      percent: progress.progressPercent,
    },
  }

  const rails = activity === 'practice' ? (
    <PracticeSessionRails selection={selection} proficiencySelection={proficiencySelection} state={state} onExit={onExit} entries={entries} learningStates={learningStates} />
  ) : (
    <DrillSessionRails
      selection={selection}
      proficiencySelection={proficiencySelection}
      mode={state.mode}
      state={state}
      entries={entries}
      mnemonicOpen={mnemonicOpen}
      onOpenMnemonic={() => {
        if (!stepKey) return
        setMnemonicOpenFor(stepKey)
        setAssistedFor(stepKey)
      }}
      onCloseMnemonic={() => setMnemonicOpenFor(null)}
      mnemonicVersion={mnemonicVersion}
      onMnemonicChanged={onMnemonicChanged}
    />
  )

  if (isTypedRecall) {
    return (
      <WorldCountriesTypedAnswer
        promptKey={`${step.countryId}-${step.skill}`}
        answerLabel={task.typedAnswerLabel}
        placeholder={task.typedPlaceholder}
        correctAnswer={expectedAnswer}
        allowIncorrectSpellingPractice={activity === 'practice'}
        evaluate={answer => {
          const match = classifyRecallAnswer(step.skill, answer, country, {
            fuzzy: fuzzyMatching,
            countryCandidates: scopeCountries,
            capitalCandidates: scopeCountries.map(entry => entry.capital),
          })
          return {
            outcome: match === 'exact' ? 'exact' : match === 'fuzzy' ? 'fuzzy' : 'incorrect',
            canonicalAnswer: expectedAnswer,
            answerKind,
            message: match === 'exact'
              ? 'Correct.'
              : match === 'fuzzy'
                ? `Correct. The canonical answer is ${expectedAnswer}.`
                : `The correct ${answerKind} is ${expectedAnswer}.`,
          }
        }}
        onAnswer={(answer, evaluation, latencyMs) => {
          onAnswer({
            countryId: step.countryId,
            skill: step.skill,
            answer,
            correct: evaluation.outcome !== 'incorrect',
            at: Date.now(),
            ms: latencyMs,
            evidenceKind: 'recall',
            ...(assisted ? { assisted: true } : {}),
          })
        }}
        onTransition={result => onContinue(result.outcome !== 'incorrect')}
      >
        {typed => (
          <>
            {rails}
            <WorldCountriesMapActivitySurface
              task={activityTask}
              map={(
                <CountryLearningMap
                  continent={selection.continent}
                  scopeCountries={mapCountries}
                  highlightFill={getWorldCountriesTaskHighlightFill(answerKind)}
                  taskTargetCountryId={isLocationQuestion ? country.id : null}
                  highlightedCountryId={isShapeQuestion
                    ? typed.outcome ? country.id : null
                    : isCapitalQuestion ? (typed.outcome && typed.outcome !== 'incorrect' ? country.id : null) : country.id}
                  namedCountryId={isShapeQuestion
                    ? typed.outcome ? country.id : null
                    : isLocationQuestion || isCapitalQuestion ? (typed.outcome && typed.outcome !== 'incorrect' ? country.id : null) : country.id}
                  showHighlightedNames={isShapeQuestion
                    ? Boolean(typed.outcome)
                    : isLocationQuestion || isCapitalQuestion ? Boolean(typed.outcome && typed.outcome !== 'incorrect') : true}
                  visibleCountryIds={getShapeMapCountryIds(typed.outcome)}
                  zoomCountryIds={getShapeMapCountryIds(typed.outcome)}
                  ariaLabel={isShapeQuestion && !typed.outcome
                    ? 'Map showing the isolated Country shape without the Country name revealed'
                    : isLocationQuestion && !typed.outcome
                    ? 'Map showing the selected location for recall without the Country name revealed'
                    : isCapitalQuestion && !typed.outcome
                      ? 'Map of the selected geographic scope without the target Country revealed'
                      : `Map with ${country.country} highlighted for ${activity === 'practice' ? 'Practice' : 'Drill'} recall`}
                />
              )}
              feedbackOverlay={typed.feedbackOverlay}
              dockPlacement="stacked"
              dock={(
                <TaskDock variant="form">
                  <section className="space-y-3">
                    {typed.input}
                  </section>
                </TaskDock>
              )}
            />
          </>
        )}
      </WorldCountriesTypedAnswer>
    )
  }

  return (
    <>
      {activity === 'practice' ? (
        <PracticeSessionRails selection={selection} proficiencySelection={proficiencySelection} state={state} onExit={onExit} entries={entries} learningStates={learningStates} />
      ) : (
        <DrillSessionRails
          selection={selection}
          proficiencySelection={proficiencySelection}
          mode={state.mode}
          state={state}
          entries={entries}
          mnemonicOpen={mnemonicOpen}
          onOpenMnemonic={() => {
            if (!stepKey) return
            setMnemonicOpenFor(stepKey)
            setAssistedFor(stepKey)
          }}
          onCloseMnemonic={() => setMnemonicOpenFor(null)}
          mnemonicVersion={mnemonicVersion}
          onMnemonicChanged={onMnemonicChanged}
        />
      )}
            <WorldCountriesMapActivitySurface
              task={activityTask}
              map={(
                <div className="relative">
                  <CountryLearningMap
                    continent={selection.continent}
                    scopeCountries={mapCountries}
                    highlightFill={getWorldCountriesTaskHighlightFill(answerKind)}
                    answerSelectionCountryIds={isMapClickPractice ? scopeCountries.map(entry => entry.id) : undefined}
                    taskTargetCountryId={(!isMapClickPractice && isLocationQuestion) || (isMapClickPractice && feedback) ? country.id : null}
                    highlightedCountryId={isShapeQuestion ? feedback ? country.id : null : highlightedCountryId}
                    namedCountryId={isShapeQuestion ? feedback ? country.id : null : isMapClickPractice ? practiceNamedCountryId : namedCountryId}
                    showHighlightedNames={isShapeQuestion ? Boolean(feedback) : isMapClickPractice ? Boolean(practiceNamedCountryId) : Boolean(namedCountryId)}
                    visibleCountryIds={getShapeMapCountryIds(feedback ? (feedback.correct ? 'correct' : 'incorrect') : null)}
                    zoomCountryIds={getShapeMapCountryIds(feedback ? (feedback.correct ? 'correct' : 'incorrect') : null)}
                    onCountryClick={isMapClickPractice ? submitLocation : undefined}
                    ariaLabel={isShapeQuestion && !feedback
                      ? 'Map showing the isolated Country shape without the Country name revealed'
                      : isMapClickPractice && !feedback
                      ? isCapitalLocationPractice
                        ? 'Map for clicking the Country whose Capital is shown'
                        : 'Map for clicking the target Country'
                      : isLocationQuestion && !feedback
                        ? 'Map showing the selected location for recall without the Country name revealed'
                      : isCapitalQuestion && !feedback
                        ? 'Map of the selected geographic scope without the target Country revealed'
                      : `Map with ${country.country} highlighted for ${activity === 'practice' ? 'Practice' : 'Drill'} recall`}
                  />
                  {displayedFeedback && <RecallFeedback correct={displayedFeedback.correct} message={isMapClickPractice ? practiceFeedbackText : feedbackText} />}
                </div>
              )}
              dockPlacement={answerMode === 'typing' && !isMapClickPractice ? 'stacked' : 'attached'}
              dock={isMapClickPractice ? (
                <p className="sr-only">Click a Country on the map to answer.</p>
              ) : (
          <TaskDock variant={answerMode === 'typing' ? 'form' : 'navigation'}>
            <section className="space-y-3">
            {answerMode === 'multiple-choice' ? (
              <MultipleChoice
                key={`${step.countryId}-${step.skill}`}
                options={answerOptions}
                correctAnswer={expectedAnswer}
                onAnswer={submit}
                answered={feedback?.answer ?? null}
              />
            ) : null}
            </section>
          </TaskDock>
              )}
            />
    </>
  )
}
