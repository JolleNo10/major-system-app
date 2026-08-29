import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useRails } from '@/app/layout/PageLayoutContext'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { readWorldCountriesGeography } from '@/features/world-countries/geography/worldScope'
import { clearSubregionScope, getCountriesForSubregionScopeInEffectiveOrder, normalizeSubregionScope, selectAllSubregions, toggleContinentInScope, toggleSubregionInScope, type WorldCountriesSubregionScope } from '@/features/world-countries/geography/subregionScope'
import { advanceRecallStep, getCurrentRecallStep, type WorldCountriesRecallSessionState } from '@/features/world-countries/learning/recallSession'
import type { WorldCountriesTypedAnswerResult } from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { GeographySelectionRail } from '@/features/world-countries/ui/GeographySelectionRail'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { CapitalQuizSession } from './CapitalQuizSession'
import { getDefaultPracticeQuestionCount, getPracticeMissedCountryIds, isPracticeQuestionCountValid, normalizePracticeQuestionCount, PRACTICE_QUESTION_COUNTS, type PracticeRecallAnswer, type PracticeQuestionCount, type PracticeQuizRun, createPracticeQuizRun } from './practiceRun'
import { QuizResults } from './QuizResults'

type QuizPhase = 'setup' | 'session' | 'results'

interface ActiveQuizRun {
  run: PracticeQuizRun
  session: WorldCountriesRecallSessionState
  answers: readonly PracticeRecallAnswer[]
}

export function WorldCountriesQuiz({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const geographyRevision = useWorldCountriesGeographyRevision()
  const geography = useMemo(() => {
    void geographyRevision
    return readWorldCountriesGeography(activeCountries)
  }, [activeCountries, geographyRevision])
  const { metadata: selectionMetadata, worldOrder } = geography
  const [phase, setPhase] = useState<QuizPhase>('setup')
  const [setupContinent, setSetupContinent] = useState<Continent | null>(null)
  const [selectedSubregionIds, setSelectedSubregionIds] = useState<readonly SubregionId[]>(() => selectAllSubregions(activeCountries, selectionMetadata).subregionIds)
  const [questionCount, setQuestionCount] = useState<PracticeQuestionCount>(() => getDefaultPracticeQuestionCount(activeCountries.length))
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<ActiveQuizRun | null>(null)

  const selection = useMemo<WorldCountriesSubregionScope>(() => ({ subregionIds: selectedSubregionIds }), [selectedSubregionIds])
  const normalizedSelection = useMemo(() => normalizeSubregionScope(selection, activeCountries, selectionMetadata), [activeCountries, selection, selectionMetadata])
  const setupScopeCountries = useMemo(() => getCountriesForSubregionScopeInEffectiveOrder(normalizedSelection, activeCountries, selectionMetadata), [activeCountries, normalizedSelection, selectionMetadata])
  const normalizedQuestionCount = useMemo(() => normalizePracticeQuestionCount(questionCount, setupScopeCountries.length), [questionCount, setupScopeCountries.length])
  const subregionOrder = useMemo(() => {
    void geographyRevision
    return setupContinent ? getSubregionsForContinentInEffectiveOrder(setupContinent, activeCountries, getContinentMetadata(setupContinent)) : []
  }, [activeCountries, geographyRevision, setupContinent])

  useEffect(() => {
    if (sameIds(selectedSubregionIds, normalizedSelection.subregionIds)) return
    setSelectedSubregionIds(normalizedSelection.subregionIds)
  }, [normalizedSelection.subregionIds, selectedSubregionIds])

  useEffect(() => {
    if (questionCount === normalizedQuestionCount) return
    setQuestionCount(normalizedQuestionCount)
  }, [normalizedQuestionCount, questionCount])

  useEffect(() => {
    if (setupContinent && !worldOrder.includes(setupContinent)) setSetupContinent(null)
  }, [setupContinent, worldOrder])

  const selectContinent = useCallback((continent: Continent) => {
    setSetupContinent(continent)
    setHoveredGroupId(null)
  }, [])
  const goToWorld = useCallback(() => {
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])
  const toggleSubregion = useCallback((subregionId: SubregionId) => {
    if (!setupContinent) return
    setSelectedSubregionIds(toggleSubregionInScope(normalizedSelection, subregionId, activeCountries, selectionMetadata).subregionIds)
  }, [activeCountries, normalizedSelection, selectionMetadata, setupContinent])
  const toggleContinent = useCallback((continent: Continent) => {
    setSelectedSubregionIds(toggleContinentInScope(normalizedSelection, continent, activeCountries, selectionMetadata).subregionIds)
  }, [activeCountries, normalizedSelection, selectionMetadata])
  const selectAllWorld = useCallback(() => setSelectedSubregionIds(selectAllSubregions(activeCountries, selectionMetadata).subregionIds), [activeCountries, selectionMetadata])
  const clearWorld = useCallback(() => setSelectedSubregionIds(clearSubregionScope().subregionIds), [])

  const startNormalQuiz = useCallback(() => {
    if (setupScopeCountries.length === 0 || !isPracticeQuestionCountValid(normalizedQuestionCount, setupScopeCountries.length)) return
    const run = createPracticeQuizRun({ scopeCountries: setupScopeCountries, questionCount: normalizedQuestionCount })
    if (!run) return
    setActiveRun({ run, session: run.session, answers: [] })
    setPhase('session')
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [normalizedQuestionCount, setupScopeCountries])

  const submitAnswer = useCallback((answer: PracticeRecallAnswer) => {
    setActiveRun(current => {
      if (!current || current.session.phase === 'complete') return current
      const step = getCurrentRecallStep(current.session)
      if (!step || step.countryId !== answer.countryId || step.skill !== answer.skill || current.answers.some(candidate => candidate.countryId === answer.countryId)) return current
      return { ...current, answers: [...current.answers, answer] }
    })
  }, [])

  const advanceQuiz = useCallback((_result: WorldCountriesTypedAnswerResult) => {
    setActiveRun(current => {
      if (!current || current.session.phase === 'complete') return current
      const next = advanceRecallStep(current.session).state
      if (next.phase === 'complete') setPhase('results')
      return { ...current, session: next }
    })
  }, [])

  const retryMissed = useCallback(() => {
    if (!activeRun) return
    const missedCountryIds = getPracticeMissedCountryIds(activeRun.run, activeRun.answers)
    if (missedCountryIds.length === 0) return
    const run = createPracticeQuizRun({ scopeCountries: activeRun.run.countries, countryIds: missedCountryIds, questionCount: 'all' })
    if (!run) return
    setActiveRun({ run, session: run.session, answers: [] })
    setPhase('session')
  }, [activeRun])

  const changeSetup = useCallback(() => {
    setActiveRun(null)
    setPhase('setup')
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])

  const setupMap = phase === 'setup' ? <GeographyOverviewMap level={setupContinent ? 'continent' : 'world'} continent={setupContinent ?? undefined} selectedSubregionIds={setupContinent ? normalizedSelection.subregionIds : undefined} hoveredGroupId={hoveredGroupId} onHoverGroup={setHoveredGroupId} onCountryClick={country => setupContinent ? toggleSubregion(country.subregionId) : selectContinent(country.continent)} ariaLabel={setupContinent ? `${setupContinent} map for Capitals Quiz setup` : 'World map for Capitals Quiz setup'} /> : null
  const rails = useMemo(() => phase === 'setup' ? {
    left: <GeographySelectionRail level={setupContinent ? 'continent' : 'world'} setupContinent={setupContinent} selection={normalizedSelection} selectionMetadata={selectionMetadata} worldOrder={worldOrder} subregionOrder={subregionOrder} entries={activeCountries} hoveredGroupId={hoveredGroupId} onHoverGroup={setHoveredGroupId} onWorld={goToWorld} onSelectContinent={selectContinent} onToggleContinent={toggleContinent} onSelectAllWorld={selectAllWorld} onClearWorld={clearWorld} onToggleSubregion={toggleSubregion} onSelectEntireContinent={() => { if (setupContinent) setSelectedSubregionIds(toggleContinentInScope(normalizedSelection, setupContinent, activeCountries, selectionMetadata).subregionIds) }} headingId="world-countries-quiz-geography-heading" />,
    right: <QuizSetupControls questionCount={normalizedQuestionCount} countryCount={setupScopeCountries.length} onQuestionCountChange={setQuestionCount} canStart={setupScopeCountries.length > 0} onStart={startNormalQuiz} />,
    leftLabel: 'Geography',
    rightLabel: 'Quiz',
  } : {}, [activeCountries, clearWorld, goToWorld, hoveredGroupId, normalizedQuestionCount, normalizedSelection, phase, selectAllWorld, selectContinent, selectionMetadata, setupContinent, setupScopeCountries.length, startNormalQuiz, subregionOrder, toggleContinent, toggleSubregion, worldOrder])
  useRails(rails)

  if (phase === 'session' && activeRun) return <CapitalQuizSession run={activeRun.run} session={activeRun.session} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} correctCount={activeRun.answers.filter(answer => answer.outcome === 'exact' || answer.outcome === 'fuzzy').length} onAnswer={submitAnswer} onAdvance={advanceQuiz} />
  if (phase === 'results' && activeRun) return <QuizResults run={activeRun.run} answers={activeRun.answers} onRetryMissed={retryMissed} onNewQuiz={startNormalQuiz} onChangeSetup={changeSetup} />
  return <section className="space-y-3 animate-fade-in" aria-labelledby="world-countries-quiz-heading"><div className="space-y-1 text-center"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries · Quiz</p><h1 id="world-countries-quiz-heading" className="text-2xl font-black text-zinc-100">Capitals quiz</h1><p className="text-sm text-zinc-500">Given a Country, type its Capital.</p></div>{setupMap}<p className="px-1 text-xs text-zinc-500">{setupScopeCountries.length > 0 ? `${setupScopeCountries.length} Countries in current scope` : 'Select at least one Subregion to begin'}</p></section>
}

function QuizSetupControls({ questionCount, countryCount, onQuestionCountChange, canStart, onStart }: { questionCount: PracticeQuestionCount; countryCount: number; onQuestionCountChange: (value: PracticeQuestionCount) => void; canStart: boolean; onStart: () => void }) {
  return <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-quiz-controls-heading"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Quiz</p><h2 id="world-countries-quiz-controls-heading" className="mt-1 text-lg font-bold text-zinc-100">Question count</h2></div><fieldset className="grid grid-cols-2 gap-2"><legend className="sr-only">Question count</legend>{PRACTICE_QUESTION_COUNTS.map(candidate => { const disabled = candidate !== 'all' && candidate > countryCount; return <label key={candidate} className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-sm font-semibold ${questionCount === candidate ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300'} ${disabled ? 'cursor-not-allowed opacity-40' : 'hover:border-cyan-600'}`}><input type="radio" name="world-countries-quiz-question-count" value={candidate} checked={questionCount === candidate} disabled={disabled} onChange={() => onQuestionCountChange(candidate)} className="sr-only" />{candidate === 'all' ? 'All' : candidate}</label> })}</fieldset><p className="text-xs leading-relaxed text-zinc-500">Quiz is Practice: it is randomized, finite, and does not record learner progress.</p><button type="button" disabled={!canStart} onClick={onStart} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">{canStart ? 'Start Quiz' : 'Choose at least one Subregion'}</button></WorldCountriesPanel>
}

function sameIds(left: readonly SubregionId[], right: readonly SubregionId[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}
