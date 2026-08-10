import { useEffect, useRef, useState } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { CapitalLearningFlowState } from '@/features/world-countries/learning/capitalLearningFlow'
import { classifyPlaceName } from '@/features/world-countries/learning/answerMatching'
import { CountryLearningMap } from './CountryLearningMap'
import { LearningHeader } from './MemoryPreviewStep'

interface CapitalRecallFeedback {
  correct: boolean
  expectedId: string
  fuzzyMatch: boolean
}

export function CapitalRecallStep({
  continent,
  entries,
  flow,
  fuzzyMatching,
  onSubmit,
  onExit,
  onCorrectionCountryChange,
}: {
  continent: Continent
  entries: readonly Country[]
  flow: CapitalLearningFlowState
  fuzzyMatching: boolean
  onSubmit: (correct: boolean) => void
  onExit: () => void
  onCorrectionCountryChange?: (countryId: string | null) => void
}) {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<CapitalRecallFeedback | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const session = flow.recall

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      setFeedback(null)
      setAnswer('')
    }, feedback.correct ? 500 : 2200)
    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    if (!feedback) inputRef.current?.focus()
  }, [feedback, session?.currentCountryId])

  useEffect(() => {
    onCorrectionCountryChange?.(feedback && !feedback.correct ? feedback.expectedId : null)
  }, [feedback, onCorrectionCountryChange])

  if (!session) return null
  const current = entries.find(entry => entry.id === session.currentCountryId)
  if (!current) return null
  const expected = feedback
    ? entries.find(entry => entry.id === feedback.expectedId) ?? current
    : current
  const candidates = entries.map(entry => entry.capital)

  const submit = () => {
    if (feedback || !answer.trim()) return
    const match = classifyPlaceName(answer, current.capital, {
      fuzzy: fuzzyMatching,
      candidates,
    })
    const correct = match !== 'none'
    setFeedback({ correct, expectedId: current.id, fuzzyMatch: match === 'fuzzy' })
    onSubmit(correct)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label="Capital recall · shuffled round" title={`${session.roundCorrectCount + 1} / ${entries.length}`} onExit={onExit} />
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
        <span className="text-zinc-500">Round {session.roundNumber}</span>
        <span className="font-semibold text-cyan-300">Country → Capital</span>
      </div>
      <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">What is the capital?</p>
        <h2 className="mt-2 text-3xl font-black text-zinc-100">{expected.country}</h2>
      </section>
      <div className="relative">
        <CountryLearningMap
          continent={continent}
          scopeCountries={entries}
          highlightedCountryId={expected.id}
          ariaLabel={`${expected.country} highlighted on the map`}
        />
        {feedback && (
          <section className={`pointer-events-none absolute bottom-2 left-2 right-2 rounded-xl border p-4 bg-zinc-900/90 ${feedback.correct ? 'border-green-500/30' : 'border-red-500/30'}`}>
            <p className={`text-sm font-semibold ${feedback.correct ? 'text-green-300' : 'text-red-300'}`}>
              {feedback.correct
                ? feedback.fuzzyMatch
                  ? `Correct. The canonical answer is ${expected.capital}.`
                  : 'Correct.'
                : `The correct capital is ${expected.capital}.`}
            </p>
            {!feedback.correct && <p className="mt-1 text-xs text-zinc-500">This shuffled round is now non-qualifying. Continue and complete a fresh clean round.</p>}
          </section>
        )}
      </div>
      <form onSubmit={event => { event.preventDefault(); submit() }} className="space-y-3">
        <label htmlFor="capital-answer" className="block text-sm text-zinc-400">Type the capital</label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            id="capital-answer"
            autoComplete="off"
            value={answer}
            onChange={event => setAnswer(event.target.value)}
            disabled={feedback !== null}
            autoFocus
            placeholder="Type the capital…"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-cyan-500 disabled:opacity-60"
          />
          {!feedback && <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Check</button>}
        </div>
      </form>
    </div>
  )
}
