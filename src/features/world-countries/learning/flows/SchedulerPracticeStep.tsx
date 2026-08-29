import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SchedulerLearningSession } from '@/features/world-countries/learning/schedulerLearningSession'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldCountriesMapActivitySurface, type WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import {
  WorldCountriesTypedAnswer,
  type WorldCountriesTypedAnswerEvaluation,
} from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import { getWorldCountriesTaskHighlightFill, type WorldCountriesAnswerKind } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import { useLearningMapPresentation } from './LearningMapSurface'

export interface SchedulerAnswerEvaluation {
  correct: boolean
  fuzzyMatch: boolean
  canonicalAnswer: string
}

export function SchedulerPracticeStep({
  continent,
  entries,
  session,
  stepLabel,
  questionLabel,
  questionTitle,
  answerLabel,
  placeholder,
  showCountryName,
  answerKind,
  showMap = true,
  promptText = 'Identify the highlighted location',
  evaluateAnswer,
  formatFeedback,
  onSubmit,
  onBack,
  onExit,
  surface = false,
  allowIncorrectSpellingPractice = false,
}: {
  continent: Continent
  entries: readonly Country[]
  session: SchedulerLearningSession
  stepLabel: string
  questionLabel: string
  questionTitle: string
  answerLabel: string
  placeholder: string
  showCountryName: boolean
  answerKind: WorldCountriesAnswerKind
  showMap?: boolean
  promptText?: string
  evaluateAnswer: (answer: string, country: Country) => SchedulerAnswerEvaluation
  formatFeedback: (evaluation: SchedulerAnswerEvaluation, country: Country) => string
  onSubmit: (correct: boolean, latencyMs: number) => void
  onBack: () => void
  onExit: () => void
  surface?: boolean
  allowIncorrectSpellingPractice?: boolean
}) {
  const currentId = session.currentKey
  const current = entries.find(entry => entry.id === currentId)
  const ariaLabel = current && showCountryName
    ? `Map showing ${current.country} for practice`
    : 'Map for typed Country practice without the Country name revealed'
  const presentationCountryId = current?.id ?? null
  useLearningMapPresentation({
    taskTargetCountryId: showCountryName ? null : presentationCountryId,
    highlightedCountryId: presentationCountryId,
    namedCountryId: showCountryName ? presentationCountryId : null,
    showHighlightedNames: showCountryName,
    ariaLabel,
  }, [presentationCountryId, showCountryName, ariaLabel])

  if (!current) return null
  const activityTask: WorldCountriesActivityTask = {
    direction: questionLabel,
    cue: showCountryName ? current.country : promptText,
    sessionContext: stepLabel,
    answerKind,
  }

  return (
    <WorldCountriesTypedAnswer
      promptKey={current.id}
      answerLabel={answerLabel}
      placeholder={placeholder}
      correctAnswer={showCountryName ? current.capital : current.country}
      allowIncorrectSpellingPractice={allowIncorrectSpellingPractice}
      evaluate={answer => {
        const evaluation = evaluateAnswer(answer, current)
        return {
          outcome: evaluation.fuzzyMatch ? 'fuzzy' : evaluation.correct ? 'exact' : 'incorrect',
          canonicalAnswer: evaluation.canonicalAnswer,
          answerKind,
          message: formatFeedback(evaluation, current),
        } satisfies WorldCountriesTypedAnswerEvaluation
      }}
      onAnswer={() => undefined}
      onTransition={result => onSubmit(result.outcome !== 'incorrect', result.latencyMs)}
    >
      {typed => {
        const dock = (
          <TaskDock variant="form" status={(
            <span className="sr-only">{questionLabel}</span>
          )}>
            {typed.input}
            {!surface && <div className="mt-3 flex gap-2"><button type="button" onClick={onBack} className="w-full rounded-[9px] border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200">Back</button><button type="button" onClick={onExit} className="w-full rounded-[9px] border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200">Exit</button></div>}
          </TaskDock>
        )
        if (surface) return dock

        return (
          <div className="space-y-4 animate-fade-in">
            <WorldCountriesMapActivitySurface
              task={activityTask}
              map={showMap
                ? <CountryLearningMap continent={continent} scopeCountries={entries} highlightFill={getWorldCountriesTaskHighlightFill(answerKind)} taskTargetCountryId={showCountryName ? null : current.id} highlightedCountryId={current.id} namedCountryId={showCountryName ? current.id : null} showHighlightedNames={showCountryName} ariaLabel={ariaLabel} />
                : <div className="hidden" aria-hidden="true" />}
              feedbackOverlay={typed.feedbackOverlay}
              dockPlacement="stacked"
              dock={dock}
            />
          </div>
        )
      }}
    </WorldCountriesTypedAnswer>
  )
}
