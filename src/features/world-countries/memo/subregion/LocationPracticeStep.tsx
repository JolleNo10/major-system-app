import { useEffect, useState } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { CountryLearningFlowState } from '@/features/world-countries/memo/countryLearningFlow'
import { getCountryId } from '@/features/world-countries/domain/country'
import { CountryLearningMap } from './CountryLearningMap'
import { LearningHeader } from './MemoryPreviewStep'

export function LocationPracticeStep({
  continent,
  entries,
  flow,
  onSelect,
  onContinue,
  onExit,
}: {
  continent: Continent
  entries: readonly Country[]
  flow: CountryLearningFlowState
  onSelect: (countryId: string) => void
  onContinue: () => void
  onExit: () => void
}) {
  const [feedback, setFeedback] = useState<{ correct: boolean; expectedId: string } | null>(null)
  const location = flow.location
  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 800)
    return () => window.clearTimeout(timer)
  }, [feedback])

  if (!location) return null

  const expected = entries.find(entry => getCountryId(entry) === location.currentCountryId)
  const feedbackCountry = feedback ? entries.find(entry => getCountryId(entry) === feedback.expectedId) : null
  const highlightedCountryId = feedbackCountry ? getCountryId(feedbackCountry) : expected ? getCountryId(expected) : undefined

  const submit = (countryId: string) => {
    if (feedback) return
    const correct = countryId === location.currentCountryId
    setFeedback({ correct, expectedId: location.currentCountryId })
    onSelect(countryId)
  }

  if (location.completed) {
    return (
      <div className="space-y-4 animate-fade-in">
        <LearningHeader label="Stage A complete" title="Locations learned ✓" onExit={onExit} />
        <section className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 text-center">
          <p className="text-sm text-green-300">You reached a clean streak of {location.target} location recalls.</p>
          <p className="mt-2 text-xs text-zinc-500">Now recall every country in your chosen learning order.</p>
        </section>
        <button type="button" onClick={onContinue} className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Continue to ordered recall</button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label="Stage A · location recall" title={`Find ${expected?.country ?? 'the country'}`} onExit={onExit} />
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
        <span className="text-zinc-500">Clean streak</span>
        <span className="font-semibold tabular-nums text-cyan-300">{location.cleanStreak} / {location.target}</span>
      </div>
      <CountryLearningMap
        continent={continent}
        scopeCountries={entries}
        highlightedCountryId={feedback ? highlightedCountryId : null}
        onCountryClick={submit}
        ariaLabel="Unlabeled map for location recall"
      />
      {feedback && (
        <section className={`rounded-xl border p-4 ${feedback.correct ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
          <p className={`text-sm font-semibold ${feedback.correct ? 'text-green-300' : 'text-red-300'}`}>
            {feedback.correct ? 'Correct location.' : `That was ${entries.find(entry => getCountryId(entry) === feedback.expectedId)?.country ?? 'not the target'}.`}
          </p>
        </section>
      )}
    </div>
  )
}
