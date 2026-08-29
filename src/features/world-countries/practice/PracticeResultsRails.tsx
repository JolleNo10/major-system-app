import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Country } from '@/features/world-countries/data/countries'
import { getRecallSkillLabel } from '@/features/world-countries/learning/recallLabels'
import { summarizePracticeResultAnswers, type PracticeResultAnswer } from './practiceRun'

export function PracticeResultsRails({ scopeCountries, answers, onAgain, onChangeSetup }: {
  scopeCountries: readonly Country[]
  answers: readonly PracticeResultAnswer[]
  onAgain: () => void
  onChangeSetup: () => void
}) {
  const summary = useMemo(() => summarizePracticeResultAnswers(answers), [answers])
  const countryById = useMemo(() => new Map(scopeCountries.map(entry => [entry.id, entry])), [scopeCountries])
  const rails = useMemo(() => ({
    left: <section className="space-y-4" aria-labelledby="world-countries-practice-results-heading">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Practice complete</p><h2 id="world-countries-practice-results-heading" className="mt-1 text-lg font-bold text-zinc-100">Results</h2></div>
      <PracticeSummaryStats summary={summary} answerCount={answers.length} ariaLabel="Practice summary" />
      <ol className="space-y-1.5" aria-label="Practice answers">{answers.map((answer, index) => <li key={`${answer.countryId}-${answer.skill}-${index}`} className={`rounded-lg border px-3 py-2 ${answer.correct ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}><div className="flex items-center gap-2 text-sm"><span className="w-5 shrink-0 text-xs tabular-nums text-zinc-600">{index + 1}</span><span className="min-w-0 flex-1 truncate text-zinc-200">{countryById.get(answer.countryId)?.country ?? answer.countryId}</span><span className={answer.correct ? 'text-green-400' : 'text-red-400'}>{answer.correct ? '✓' : '×'}</span></div><p className="mt-1 pl-7 text-xs text-zinc-500">{getRecallSkillLabel(answer.skill)}</p></li>)}</ol>
    </section>,
    right: <section className="space-y-3" aria-labelledby="world-countries-practice-next-heading"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Practice</p><h2 id="world-countries-practice-next-heading" className="mt-1 text-lg font-bold text-zinc-100">Next action</h2></div><p className="text-sm leading-relaxed text-zinc-400">Practice results are transient. Run another session or return to the mode selector.</p><button type="button" onClick={onAgain} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Run again</button><button type="button" onClick={onChangeSetup} className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">Change mode</button></section>,
    leftLabel: 'Results',
    rightLabel: 'Next action',
  }), [answers, countryById, onAgain, onChangeSetup, summary])
  useRails(rails)
  return null
}

function PracticeSummaryStats({ summary, answerCount, ariaLabel }: { summary: ReturnType<typeof summarizePracticeResultAnswers>; answerCount: number; ariaLabel: string }) {
  return <section className="grid grid-cols-2 gap-2" aria-label={ariaLabel}><div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"><p className="text-xs uppercase tracking-wider text-zinc-500">Correct</p><p className="mt-1 text-lg font-bold text-zinc-100">{summary.correct}/{answerCount}</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"><p className="text-xs uppercase tracking-wider text-zinc-500">Accuracy</p><p className="mt-1 text-lg font-bold text-zinc-100">{summary.accuracy}%</p></div></section>
}
