import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SchedulerLearningSession } from '@/features/world-countries/learning/schedulerLearningSession'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldCountriesAnswerKindCue } from '@/features/world-countries/ui/WorldCountriesAnswerKindCue'
import {
  WorldCountriesTypedAnswer,
  type WorldCountriesTypedAnswerKind,
  type WorldCountriesTypedAnswerEvaluation,
} from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import { useLearningMapPresentation } from './LearningMapSurface'
import { LearningHeader } from './MemoryPreviewStep'

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
  answerKind: WorldCountriesTypedAnswerKind
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
  if (!current) return null

  const ariaLabel = showCountryName
    ? `Map showing ${current.country} for practice`
    : 'Map for typed Country practice without the Country name revealed'
  useLearningMapPresentation({
    taskTargetCountryId: showCountryName ? null : current.id,
    highlightedCountryId: current.id,
    namedCountryId: showCountryName ? current.id : null,
    showHighlightedNames: showCountryName,
    ariaLabel,
  }, [current.id, showCountryName, ariaLabel])

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
            <div className="space-y-2">
              <WorldCountriesAnswerKindCue answerKind={answerKind} />
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-cyan-400">{questionLabel} · {showCountryName ? current.country : promptText}</div>
            </div>
          )}>
            {typed.input}
            {!surface && <button type="button" onClick={onBack} className="mt-3 w-full rounded-[9px] border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200">Back</button>}
          </TaskDock>
        )
        if (surface) return dock

        return (
          <div className="space-y-4 animate-fade-in">
            <LearningHeader label={stepLabel} title={questionTitle} onExit={onExit} />
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm"><span className="text-zinc-500">Spaced practice</span><span className="font-semibold text-cyan-300">{questionLabel}</span></div>
            <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-center"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{questionLabel}</p><h2 className="mt-2 text-3xl font-black text-zinc-100">{showCountryName ? current.country : promptText}</h2></section>
            <MapSurface
              context={null}
              map={showMap
                ? <CountryLearningMap continent={continent} scopeCountries={entries} taskTargetCountryId={showCountryName ? null : current.id} highlightedCountryId={current.id} namedCountryId={showCountryName ? current.id : null} showHighlightedNames={showCountryName} ariaLabel={ariaLabel} />
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
