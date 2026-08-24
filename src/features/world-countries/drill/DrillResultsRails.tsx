import { useRails } from '@/app/layout/PageLayoutContext'
import type { Country } from '@/features/world-countries/data/countries'
import { DrillResultStats } from './DrillResultStats'
import { getDrillSkillLabel, getDrillModeDefinition, type WorldCountriesDrillMode } from './drillModes'
import type { DrillAnswerRecord } from './drillSessionState'
import { summarizeDrillAnswers } from './drillResultSummary'

export function DrillResultsRails({
  mode,
  scopeCountries,
  answers,
  retryFailedCountryCount = 0,
  onRetryFailedCountries,
  onAgain,
  onChangeSetup,
}: {
  mode: WorldCountriesDrillMode
  scopeCountries: readonly Country[]
  answers: readonly DrillAnswerRecord[]
  retryFailedCountryCount?: number
  onRetryFailedCountries?: () => void
  onAgain: () => void
  onChangeSetup: () => void
}) {
  const summary = summarizeDrillAnswers(answers)
  const countryById = new Map(scopeCountries.map(entry => [entry.id, entry]))

  useRails(
    {
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-drill-results-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Session complete</p>
            <h2 id="world-countries-drill-results-heading" className="mt-1 text-lg font-bold text-zinc-100">Results</h2>
          </div>
          <DrillResultStats summary={summary} answerCount={answers.length} />
          <ol className="space-y-1.5" aria-label="Drill answers">
            {answers.map((answer, index) => (
              <li key={`${answer.countryId}-${answer.skill}-${index}`} className={`rounded-lg border px-3 py-2 ${answer.correct ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-5 shrink-0 text-xs tabular-nums text-zinc-600">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-200">{countryById.get(answer.countryId)?.country ?? answer.countryId}</span>
                  <span className={answer.correct ? 'text-green-400' : 'text-red-400'}>{answer.correct ? '✓' : '✗'}</span>
                </div>
                <p className="mt-1 pl-7 text-xs text-zinc-500">{getDrillSkillLabel(answer.skill)}</p>
                {!answer.correct && <p className="mt-1 pl-7 text-xs text-red-300">You answered: {answer.answer || '—'}</p>}
              </li>
            ))}
          </ol>
        </section>
      ),
      right: (
        <section className="space-y-4" aria-labelledby="world-countries-drill-next-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">{getDrillModeDefinition(mode).label}</p>
            <h2 id="world-countries-drill-next-heading" className="mt-1 text-lg font-bold text-zinc-100">Next action</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-400">Keep the geographic workspace open while you review this run or change the scope.</p>
          {retryFailedCountryCount > 0 && onRetryFailedCountries && <button type="button" onClick={onRetryFailedCountries} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Retry failed countries ({retryFailedCountryCount})</button>}
          <button type="button" autoFocus onClick={onAgain} className={`w-full rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${retryFailedCountryCount > 0 ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-cyan-600 text-white hover:bg-cyan-500'}`}>Run again</button>
          <button type="button" onClick={onChangeSetup} className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Change scope</button>
        </section>
      ),
      leftLabel: 'Results',
      rightLabel: 'Next action',
    },
    [answers, mode, onAgain, onChangeSetup, onRetryFailedCountries, retryFailedCountryCount, scopeCountries, summary.accuracy, summary.correct],
  )

  return null
}
