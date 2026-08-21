import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { OrderedRecallState } from '@/features/world-countries/learning/orderedRecallSession'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import {
  WorldCountriesTypedAnswer,
  type WorldCountriesTypedAnswerEvaluation,
} from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import { useLearningMapPresentation } from './LearningMapSurface'
import { LearningHeader } from './MemoryPreviewStep'
import type { SchedulerAnswerEvaluation } from './SchedulerPracticeStep'

export function StagedFinalRecallStep({
  continent,
  entries,
  ordered,
  stepLabel,
  answerLabel,
  placeholder,
  showCountryName,
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
  ordered: OrderedRecallState<string>
  stepLabel: string
  answerLabel: string
  placeholder: string
  showCountryName: boolean
  evaluateAnswer: (answer: string, country: Country) => SchedulerAnswerEvaluation
  formatFeedback: (evaluation: SchedulerAnswerEvaluation, country: Country) => string
  onSubmit: (correct: boolean) => void
  onBack: () => void
  onExit: () => void
  surface?: boolean
  allowIncorrectSpellingPractice?: boolean
}) {
  const current = entries.find(entry => entry.id === ordered.order[ordered.currentIndex])
  if (!current) return null

  useLearningMapPresentation({
    highlightedCountryId: current.id,
    namedCountryId: showCountryName ? current.id : null,
    showHighlightedNames: showCountryName,
    showHoverNames: true,
    ariaLabel: 'Highlighted Country for final recall',
  }, [current.id, showCountryName])

  return (
    <WorldCountriesTypedAnswer
      promptKey={`${ordered.currentIndex}-${current.id}`}
      answerLabel={answerLabel}
      placeholder={placeholder}
      correctAnswer={showCountryName ? current.capital : current.country}
      allowIncorrectSpellingPractice={allowIncorrectSpellingPractice}
      evaluate={answer => {
        const evaluation = evaluateAnswer(answer, current)
        return {
          outcome: evaluation.fuzzyMatch ? 'fuzzy' : evaluation.correct ? 'exact' : 'incorrect',
          canonicalAnswer: evaluation.canonicalAnswer,
          answerKind: showCountryName ? 'capital' : 'country',
          message: formatFeedback(evaluation, current),
          detail: evaluation.correct ? undefined : 'The ordered repair traversal rewinds before the next clean pass.',
        } satisfies WorldCountriesTypedAnswerEvaluation
      }}
      onAnswer={() => undefined}
      onTransition={result => onSubmit(result.outcome !== 'incorrect')}
    >
      {typed => {
        const dock = (
          <TaskDock variant="form" status={<div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.08em] text-cyan-400"><span>{ordered.mode === 'repair' ? 'Repair traversal' : 'Final recall'}</span><span className="text-xs font-normal tabular-nums text-zinc-400">{ordered.currentIndex + 1} / {ordered.order.length}</span></div>}>
            {typed.input}
            {!surface && <button type="button" onClick={onBack} className="mt-3 w-full rounded-[9px] border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200">Back to Final recall</button>}
          </TaskDock>
        )
        if (surface) return dock

        return (
          <div className="space-y-4 animate-fade-in">
            <LearningHeader label={stepLabel} title={`${ordered.currentIndex + 1} / ${ordered.order.length}`} onExit={onExit} />
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm"><span className="text-zinc-500">{ordered.mode === 'repair' ? 'Repair traversal' : 'Effective Country order'}</span><span className="font-semibold text-cyan-300">{answerLabel}</span></div>
            <MapSurface
              context={null}
              map={<CountryLearningMap continent={continent} scopeCountries={entries} highlightedCountryId={current.id} namedCountryId={showCountryName ? current.id : null} showHighlightedNames={showCountryName} showHoverNames ariaLabel="Highlighted Country for final recall" />}
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
