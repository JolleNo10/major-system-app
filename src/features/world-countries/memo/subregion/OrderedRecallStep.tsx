import { useEffect, useRef, useState } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { CountryLearningFlowState } from '@/features/world-countries/learning/countryLearningFlow'
import { matchesCountryName } from '@/features/world-countries/learning/answerMatching'
import { CountryLearningMap } from './CountryLearningMap'
import { LearningHeader } from './MemoryPreviewStep'

export function OrderedRecallStep({
  continent,
  entries,
  flow,
  fuzzyMatching,
  onSubmit,
  onExit,
}: {
  continent: Continent
  entries: readonly Country[]
  flow: CountryLearningFlowState
  fuzzyMatching: boolean
  onSubmit: (correct: boolean) => void
  onExit: () => void
}) {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ correct: boolean; expectedId: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const session = flow.ordered
  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      setFeedback(null)
      setAnswer('')
    }, feedback.correct ? 500 : 1800)
    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    if (!feedback) inputRef.current?.focus()
  }, [feedback, session?.currentIndex])

  if (!session) return null

  const current = entries[session.currentIndex]
  if (!current) return null
  const expectedId = current.id
  const displayCountry = feedback
    ? entries.find(entry => entry.id === feedback.expectedId) ?? current
    : current
  const candidates = entries.map(entry => entry.country)

  const submit = () => {
    if (feedback || !answer.trim()) return
    const correct = matchesCountryName(answer, current, { fuzzy: fuzzyMatching, candidates })
    setFeedback({ correct, expectedId })
    onSubmit(correct)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label="Stage B · ordered blind recall" title={`${session.currentIndex + 1} / ${entries.length}`} onExit={onExit} />
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
        <span className="text-zinc-500">{session.mode === 'repair' ? 'Repair traversal' : 'Clean pass'}</span>
        <span className="font-semibold text-cyan-300">Recall the highlighted country</span>
      </div>
      <div className="relative">
        <CountryLearningMap
          continent={continent}
          scopeCountries={entries}
          highlightedCountryId={displayCountry.id}
          ariaLabel="Highlighted country for ordered blind recall"
        />
        {feedback && (
          <section className={`pointer-events-none absolute bottom-2 left-2 right-2 rounded-xl border p-4 bg-zinc-900/90 ${feedback.correct ? 'border-green-500/30' : 'border-red-500/30'}`}>
            <p className={`text-sm font-semibold ${feedback.correct ? 'text-green-300' : 'text-red-300'}`}>
              {feedback.correct ? 'Correct.' : `The correct country is ${displayCountry.country}.`}
            </p>
            {!feedback.correct && <p className="mt-1 text-xs text-zinc-500">The session rewinds two positions for a nearby repair pass.</p>}
          </section>
        )}
      </div>
      <form onSubmit={event => { event.preventDefault(); submit() }} className="space-y-3">
        <label htmlFor="ordered-country-answer" className="block text-sm text-zinc-400">Which country is this?</label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            id="ordered-country-answer"
            autoComplete="off"
            value={answer}
            onChange={event => setAnswer(event.target.value)}
            disabled={feedback !== null}
            autoFocus
            placeholder="Type the country…"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-cyan-500 disabled:opacity-60"
          />
          {!feedback && <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Check</button>}
        </div>
      </form>
    </div>
  )
}
