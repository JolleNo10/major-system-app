import {
  getCountryProgressColor,
  WORLD_COUNTRIES_ATOMIC_PROFICIENCY_STATES,
  WORLD_COUNTRIES_PROGRESS_LABELS,
} from '@/features/world-countries/learning/progressPresentation'
import type { WorldCountriesProficiency } from '@/features/world-countries/learning/recallMastery'

export interface WorldCountriesDualRecallBarProps {
  totalCountries: number
  countryCounts: Readonly<Record<WorldCountriesProficiency, number>>
  capitalCounts: Readonly<Record<WorldCountriesProficiency, number>>
  className?: string
}

function trackSummary(
  label: string,
  counts: Readonly<Record<WorldCountriesProficiency, number>>,
): string {
  return `${label} recall: ${[...WORLD_COUNTRIES_ATOMIC_PROFICIENCY_STATES]
    .reverse()
    .map(state => `${WORLD_COUNTRIES_PROGRESS_LABELS[state]} ${counts[state]}`)
    .join(', ')}`
}

function renderSegments(
  counts: Readonly<Record<WorldCountriesProficiency, number>>,
  totalCountries: number,
) {
  return [...WORLD_COUNTRIES_ATOMIC_PROFICIENCY_STATES].reverse().map(state => {
    const count = counts[state]
    if (count <= 0) return null
    return (
      <span
        key={state}
        data-progress-state={state}
        aria-hidden="true"
        className="block h-full shrink-0"
        style={{ width: `${(count / Math.max(1, totalCountries)) * 100}%`, backgroundColor: getCountryProgressColor(state) }}
      />
    )
  })
}

function RecallTrack({ track, counts, totalCountries }: {
  track: 'country' | 'capital'
  counts: Readonly<Record<WorldCountriesProficiency, number>>
  totalCountries: number
}) {
  return (
    <div
      data-recall-track={track}
      aria-hidden="true"
      className="flex h-1/2 min-w-0"
    >
      {renderSegments(counts, totalCountries)}
    </div>
  )
}

export function WorldCountriesDualRecallBar({ totalCountries, countryCounts, capitalCounts, className }: WorldCountriesDualRecallBarProps) {
  const classNames = ['h-4 overflow-hidden rounded-full bg-zinc-800', className].filter(Boolean).join(' ')
  return (
    <div
      role="group"
      aria-label="Country and Capital recall distribution"
      className={classNames}
      data-testid="world-countries-dual-recall-bar"
    >
      <p className="sr-only">
        {trackSummary('Country', countryCounts)}. {trackSummary('Capital', capitalCounts)}.
      </p>
      <RecallTrack track="country" counts={countryCounts} totalCountries={totalCountries} />
      <RecallTrack track="capital" counts={capitalCounts} totalCountries={totalCountries} />
    </div>
  )
}
