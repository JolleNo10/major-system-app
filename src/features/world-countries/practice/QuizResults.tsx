import { useMemo } from 'react'
import type { CountryId } from '@/features/world-countries/data/countries'
import { getPracticeMissedCountryIds, summarizePracticeAnswers, type PracticeRecallAnswer, type PracticeQuizRun } from './practiceRun'

export function QuizResults({ run, answers, onRetryMissed, onNewQuiz, onChangeSetup }: {
  run: PracticeQuizRun
  answers: readonly PracticeRecallAnswer[]
  onRetryMissed: () => void
  onNewQuiz: () => void
  onChangeSetup: () => void
}) {
  const summary = summarizePracticeAnswers(answers)
  const missedCountryIds = getPracticeMissedCountryIds(run, answers)
  const answerByCountryId = useMemo(() => new Map<CountryId, PracticeRecallAnswer>(answers.map(answer => [answer.countryId, answer])), [answers])
  const countryById = useMemo(() => new Map(run.countries.map(country => [country.id, country])), [run.countries])

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 py-8" aria-labelledby="world-countries-capitals-quiz-results-heading">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-400">Quiz complete</p>
        <h1 id="world-countries-capitals-quiz-results-heading" className="text-3xl font-black text-zinc-100">{summary.correct} / {run.countryIds.length}</h1>
        <p className="text-2xl font-bold text-zinc-300">{summary.accuracy}%</p>
      </div>
      <div className="grid grid-cols-2 gap-3" aria-label="Quiz score"><div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center"><p className="text-xs uppercase tracking-wider text-zinc-500">Correct</p><p className="mt-1 text-2xl font-bold text-green-300">{summary.correct}</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center"><p className="text-xs uppercase tracking-wider text-zinc-500">Missed</p><p className="mt-1 text-2xl font-bold text-red-300">{missedCountryIds.length}</p></div></div>
      {missedCountryIds.length > 0 && <section className="space-y-3" aria-labelledby="world-countries-capitals-quiz-missed-heading"><div><h2 id="world-countries-capitals-quiz-missed-heading" className="text-lg font-bold text-zinc-100">Missed Countries</h2><p className="mt-1 text-sm text-zinc-500">Review follows the order of this quiz run.</p></div><ol className="space-y-2">{missedCountryIds.map(countryId => { const country = countryById.get(countryId); const answer = answerByCountryId.get(countryId); if (!country || !answer) return null; return <li key={countryId} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><span className="font-semibold text-zinc-100">{country.country}</span><span className="font-semibold text-cyan-300">{country.capital}</span></div><p className="mt-2 text-sm text-red-300">{answer.outcome === 'revealed' ? "Didn't know" : `Your answer: ${answer.submittedAnswer || '—'}`}</p></li> })}</ol></section>}
      <div className="space-y-2"><button type="button" autoFocus={missedCountryIds.length === 0} onClick={onRetryMissed} hidden={missedCountryIds.length === 0} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Retry missed</button><button type="button" autoFocus={missedCountryIds.length > 0} onClick={onNewQuiz} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">New quiz</button><button type="button" onClick={onChangeSetup} className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Change setup</button></div>
    </section>
  )
}
