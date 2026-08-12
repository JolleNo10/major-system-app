import { useEffect, useState } from 'react'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { CountryLearningFlowState } from '@/features/world-countries/learning/countryLearningFlow'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
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
  const [feedback, setFeedback] = useState<{ correct: boolean; expectedId: string; selectedId: string } | null>(null)
  const location = flow.location
  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), feedback.correct ? 500 : 1800)
    return () => window.clearTimeout(timer)
  }, [feedback])

  if (!location) return null

  const expected = entries.find(entry => entry.id === location.currentCountryId)
  const feedbackCountry = feedback ? entries.find(entry => entry.id === feedback.expectedId) : null
  const highlightedCountryId = feedbackCountry?.id ?? expected?.id

  const submit = (countryId: string) => {
    if (feedback) return
    const correct = countryId === location.currentCountryId
    setFeedback({ correct, expectedId: location.currentCountryId, selectedId: countryId })
    onSelect(countryId)
  }

  if (location.completed) {
    return (
      <div className="space-y-4 animate-fade-in">
        <LearningHeader label="Phase 2 complete" title="Locations learned ✓" onExit={onExit} />
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
      <LearningHeader label="Phase 2 · locate countries" title={`Find ${expected?.country ?? 'the country'}`} onExit={onExit} />
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
        <span className="text-zinc-500">Clean streak</span>
        <span className="font-semibold tabular-nums text-cyan-300">{location.cleanStreak} / {location.target}</span>
      </div>
      <div className="relative">
        <CountryLearningMap
          continent={continent}
          scopeCountries={entries}
          highlightedCountryId={feedback ? highlightedCountryId : null}
          onCountryClick={submit}
          ariaLabel="Unlabeled map for location recall"
        />
        {feedback && (
          <RecallFeedback
            correct={feedback.correct}
            message={feedback.correct ? 'Correct location.' : `That was ${entries.find(entry => entry.id === feedback.selectedId)?.country ?? 'not the target'} — ${entries.find(entry => entry.id === feedback.expectedId)?.country ?? 'unknown'} is highlighted.`}
          />
        )}
      </div>
    </div>
  )
}
