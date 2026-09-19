import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getContinentsInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { deriveWorldCountriesCountryProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'
import { deriveWorldCountriesScopeProgressForCountries, type WorldCountriesScopeProgress } from '@/features/world-countries/learning/scopeProgress'
import { deriveWorldCountriesScopeStatus, formatWorldCountriesScopeStatus, type WorldCountriesScopeStatus } from '@/features/world-countries/learning/scopeStatus'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import { createWorldCountriesEstablishedLearningReadinessByCountry, getWorldCountriesLearningStateList } from '@/features/world-countries/learning/learningReadiness'
import { getWorldCountriesProgressLegend, getWorldCountriesSkillStatusLabel, WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION, WORLD_COUNTRIES_SKILL_STATUSES, type WorldCountriesSkillStatus } from '@/features/world-countries/learning/progressPresentation'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { WorldCountriesDualRecallBar } from '@/features/world-countries/ui/WorldCountriesDualRecallBar'
import { WorldMasterySummary } from '@/features/world-countries/ui/WorldMasterySummary'
import { deriveWorldCountriesJourneyPresentation, type WorldCountriesJourneyPresentation } from './journeyPresentation'

interface ProgressRowData {
  id: string
  label: string
  progress: WorldCountriesScopeProgress
  /** Highest ladder rung this row has reached; drives the headline and count. */
  scopeStatus: WorldCountriesScopeStatus
  regionSummary?: string
  journeyPosition?: {
    journey: string
    mastery?: string
  }
}

export function WorldCountriesProgressView({
  scopeLabel,
  scopeContinent,
  scopeCountries,
  progress,
  recallProgress,
  learningStates,
  onBack,
}: {
  scopeLabel: string
  scopeContinent?: Continent
  scopeCountries: readonly Country[]
  progress: WorldCountriesScopeProgress | null
  recallProgress: RecallProgress | null
  learningStates: LearningStates
  onBack: () => void
}) {
  // The guided Home rail and this view must place a scope on the same rung,
  // so both read the same Learning Readiness and Country progress.
  const readinessByCountry = useMemo(
    () => createWorldCountriesEstablishedLearningReadinessByCountry(
      scopeCountries,
      learningStates,
      recallProgress ?? new Map(),
    ),
    [learningStates, recallProgress, scopeCountries],
  )
  const countryProgressById = useMemo(
    () => new Map(scopeCountries.map(country => [
      country.id,
      deriveWorldCountriesCountryProgress(country.id, recallProgress ?? new Map()),
    ] as const)),
    [recallProgress, scopeCountries],
  )
  const scopeStatus = useMemo(
    () => deriveWorldCountriesScopeStatus(
      scopeCountries.map(country => country.id),
      readinessByCountry,
      countryProgressById,
    ),
    [countryProgressById, readinessByCountry, scopeCountries],
  )

  const rows = useMemo<ProgressRowData[]>(() => {
    if (!recallProgress) return []
    const activeSubregionIds = [...new Set(scopeCountries.map(country => country.subregionId))]
    const statusFor = (entries: readonly Country[]) => deriveWorldCountriesScopeStatus(
      entries.map(country => country.id),
      readinessByCountry,
      countryProgressById,
    )

    if (!scopeContinent) {
      return getContinentsInEffectiveOrder(scopeCountries, getWorldMetadata()).map(continent => {
        const continentCountries = scopeCountries.filter(country => country.continent === continent)
        const continentSubregions = getSubregionsForContinentInEffectiveOrder(
          continent,
          continentCountries,
          getContinentMetadata(continent),
        )
        const completeRegions = continentSubregions.filter(subregion => {
          const subregionCountries = continentCountries.filter(country => country.subregionId === subregion.id)
          return deriveWorldCountriesScopeProgressForCountries(`subregion:${subregion.id}`, subregionCountries, recallProgress).complete
        }).length
        return {
          id: `continent:${continent}`,
          label: continent,
          progress: deriveWorldCountriesScopeProgressForCountries(`continent:${continent}`, continentCountries, recallProgress, readinessByCountry),
          scopeStatus: statusFor(continentCountries),
          regionSummary: `${completeRegions} of ${continentSubregions.length} regions with complete recall`,
        }
      })
    }

    return getSubregionsForContinentInEffectiveOrder(
      scopeContinent,
      scopeCountries,
      getContinentMetadata(scopeContinent),
    )
      .filter(subregion => activeSubregionIds.includes(subregion.id))
      .map(subregion => ({
        id: `subregion:${subregion.id}`,
        label: subregion.label,
        progress: deriveWorldCountriesScopeProgressForCountries(
          `subregion:${subregion.id}`,
          scopeCountries.filter(country => country.subregionId === subregion.id),
          recallProgress,
          readinessByCountry,
        ),
        scopeStatus: statusFor(scopeCountries.filter(country => country.subregionId === subregion.id)),
        journeyPosition: getJourneyProgressLabel(deriveWorldCountriesJourneyPresentation({
          subregionId: subregion.id,
          entries: scopeCountries,
          learningState: getWorldCountriesLearningStateList(learningStates).find(state => state.subregionId === subregion.id),
          recallProgress,
        })),
      }))
  }, [countryProgressById, learningStates, readinessByCountry, recallProgress, scopeContinent, scopeCountries])

  const rails = useMemo(() => ({
    left: <WorldCountriesPanel className="space-y-4"><GeographyBreadcrumbs items={[{ label: 'World', current: scopeLabel === 'World' }, ...(scopeLabel === 'World' ? [] : [{ label: scopeLabel, current: true }])]} /><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Progress</p><h2 className="mt-1 text-lg font-bold text-zinc-100">Your learning map</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">Progress is derived from retained recall and existing Learning milestones.</p></div><button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Back to {scopeLabel}</button></WorldCountriesPanel>,
    right: <WorldCountriesPanel className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Progress guide</p><h2 className="mt-1 text-lg font-bold text-zinc-100">Recall states</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">Journey position reflects existing Learning milestones and recall progress.</p></div><p className="text-xs text-zinc-400" aria-label="Core recall progress legend">{getWorldCountriesProgressLegend('core')}</p><p className="text-xs leading-relaxed text-zinc-500">{WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION}</p><button type="button" onClick={onBack} className="w-full rounded-lg bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500">Back to guided home</button></WorldCountriesPanel>,
    leftLabel: 'Progress',
    rightLabel: 'Progress guide',
  }), [onBack, scopeLabel])
  useRails(rails)

  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-progress-heading">
      <div className="space-y-1"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries · Progress</p><h1 id="world-countries-progress-heading" className="text-2xl font-black text-zinc-100">{scopeLabel} progress</h1><p className="text-sm text-zinc-500">A concise view of current recall and Learning state.</p></div>
      <WorldMasterySummary progress={progress} scopeStatus={progress === null ? null : scopeStatus} scopeLabel={scopeLabel} />
      {progress === null ? <p role="status" className="text-sm text-zinc-400">Loading progress…</p> : rows.length === 0 ? <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">No active Countries are available in this scope.</p> : <div className="grid gap-3 sm:grid-cols-2">{rows.map(row => <ProgressRow key={row.id} {...row} />)}</div>}
    </section>
  )
}

function ProgressRow({ label, progress, scopeStatus, regionSummary, journeyPosition }: ProgressRowData) {
  return (
    <WorldCountriesPanel as="article" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-zinc-100">{label}</h2>
        <span className="text-xs tabular-nums text-cyan-300">{formatWorldCountriesScopeStatus(scopeStatus)}</span>
      </div>
      <WorldCountriesDualRecallBar
        totalCountries={progress.totalCountries}
        countryCounts={progress.locationToCountryStateCounts}
        capitalCounts={progress.countryToCapitalStateCounts}
      />
      <p className="text-sm font-semibold text-zinc-200">{scopeStatus.countLabel}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ProgressStateDistribution label="Country" counts={progress.locationToCountryStateCounts} />
        <ProgressStateDistribution label="Capital" counts={progress.countryToCapitalStateCounts} />
      </div>
      {regionSummary && <p className="text-xs text-zinc-400">{regionSummary}</p>}
      {journeyPosition && <><p data-journey-position className="text-xs text-violet-200"><span className="font-semibold uppercase tracking-wider text-violet-300">Journey</span> · {journeyPosition.journey}</p>{journeyPosition.mastery && <p data-mastery-position className="text-xs text-violet-200"><span className="font-semibold uppercase tracking-wider text-violet-300">Mastery</span> · {journeyPosition.mastery}</p>}</>}
    </WorldCountriesPanel>
  )
}

function ProgressStateDistribution({ label, counts }: { label: 'Country' | 'Capital'; counts: Readonly<Record<WorldCountriesSkillStatus, number>> }) {
  return (
    <section aria-label={`${label} recall distribution`} className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</h3>
      <ul aria-label={`${label} recall state counts`} className="space-y-1 text-[11px] text-zinc-400">
        {WORLD_COUNTRIES_SKILL_STATUSES.map(state => (
          <li key={state} data-progress-state={state} className="tabular-nums">{getWorldCountriesSkillStatusLabel(state)} {counts[state]}</li>
        ))}
      </ul>
    </section>
  )
}

function getJourneyProgressLabel(journey: WorldCountriesJourneyPresentation): ProgressRowData['journeyPosition'] {
  if (journey.regionLearned) {
    return {
      journey: 'Region learned',
      mastery: journey.masteryStatus === 'mastered' ? 'Mastered' : 'Building',
    }
  }
  switch (journey.currentStageId) {
    case 'countries': return { journey: journey.hasCountryPractice ? 'Recall the countries' : 'Meet the countries' }
    case 'capitals': return { journey: 'Add the capitals' }
    case 'region-learned': return { journey: 'Region learned' }
    case null: return undefined
  }
}
