import { useEffect, useRef, useState } from 'react'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { CountryLearningFlowState } from '@/features/world-countries/learning/countryLearningFlow'
import { classifyCountryName } from '@/features/world-countries/learning/answerMatching'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { LearningHeader } from './MemoryPreviewStep'

interface OrderedRecallFeedback {
  correct: boolean
  expectedId: string
  fuzzyMatch: boolean
}

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
  const [feedback, setFeedback] = useState<OrderedRecallFeedback | null>(null)
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
    const match = classifyCountryName(answer, current, { fuzzy: fuzzyMatching, candidates })
    const correct = match !== 'none'
    setFeedback({ correct, expectedId, fuzzyMatch: match === 'fuzzy' })
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
          namedCountryId={feedback?.correct ? feedback.expectedId : null}
          showHighlightedNames={false}
          ariaLabel="Highlighted country for ordered blind recall"
        />
        {feedback && (
          <RecallFeedback
            correct={feedback.correct}
            message={feedback.correct
              ? feedback.fuzzyMatch
                ? `Correct. The correct spelling is ${displayCountry.country}.`
                : 'Correct.'
              : `The correct country is ${displayCountry.country}.`}
            detail={!feedback.correct ? 'The session rewinds two positions for a nearby repair pass.' : undefined}
          />
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
