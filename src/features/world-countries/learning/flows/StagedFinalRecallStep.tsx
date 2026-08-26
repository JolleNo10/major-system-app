import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { OrderedRecallState } from '@/features/world-countries/learning/orderedRecallSession'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldCountriesMapActivitySurface, type WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import {
  WorldCountriesTypedAnswer,
  type WorldCountriesTypedAnswerEvaluation,
} from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import { getWorldCountriesTaskHighlightFill, type WorldCountriesAnswerKind } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import { useLearningMapPresentation } from './LearningMapSurface'
import type { SchedulerAnswerEvaluation } from './SchedulerPracticeStep'

export function StagedFinalRecallStep({
  continent,
  entries,
  ordered,
  stepLabel,
  answerLabel,
  placeholder,
  showCountryName,
  answerKind,
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
  answerKind: WorldCountriesAnswerKind
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
    taskTargetCountryId: showCountryName ? null : current.id,
    highlightedCountryId: current.id,
    namedCountryId: showCountryName ? current.id : null,
    showHighlightedNames: showCountryName,
    showHoverNames: true,
    ariaLabel: 'Highlighted Country for final recall',
  }, [current.id, showCountryName])
  const activityTask: WorldCountriesActivityTask = {
    direction: showCountryName ? 'Location → Country' : answerKind === 'capital' ? 'Country → Capital' : 'Location → Country',
    cue: showCountryName ? current.country : answerKind === 'capital' ? `Capital of ${current.country}` : 'Name the country',
    sessionContext: ordered.mode === 'repair' ? 'Repair traversal' : stepLabel,
    answerKind,
    progress: { label: 'Country', current: ordered.currentIndex + 1, total: ordered.order.length },
  }

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
          answerKind,
          message: formatFeedback(evaluation, current),
          detail: evaluation.correct ? undefined : 'The ordered repair traversal rewinds before the next clean pass.',
        } satisfies WorldCountriesTypedAnswerEvaluation
      }}
      onAnswer={() => undefined}
      onTransition={result => onSubmit(result.outcome !== 'incorrect')}
    >
      {typed => {
        const dock = (
          <TaskDock variant="form" status={(
            <span className="sr-only">{answerLabel}</span>
          )}>
            {typed.input}
            {!surface && <div className="mt-3 flex gap-2"><button type="button" onClick={onBack} className="w-full rounded-[9px] border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200">Back to Final recall</button><button type="button" onClick={onExit} className="w-full rounded-[9px] border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200">Exit</button></div>}
          </TaskDock>
        )
        if (surface) return dock

        return (
          <div className="space-y-4 animate-fade-in">
            <WorldCountriesMapActivitySurface
              task={activityTask}
              map={<CountryLearningMap continent={continent} scopeCountries={entries} highlightFill={getWorldCountriesTaskHighlightFill(answerKind)} taskTargetCountryId={showCountryName ? null : current.id} highlightedCountryId={current.id} namedCountryId={showCountryName ? current.id : null} showHighlightedNames={showCountryName} showHoverNames ariaLabel="Highlighted Country for final recall" />}
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
