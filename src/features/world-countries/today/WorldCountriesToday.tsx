import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { getWorldCountriesInEffectiveOrder } from '@/features/world-countries/geography/effectiveOrder'
import { getContinentsInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { getAllSubregionLearningStates, useWorldCountriesSubregionLearningRevision } from '@/features/world-countries/learning/subregionLearningStore'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { deriveWorldCountriesCountryProgress, deriveWorldCountriesRecallProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'
import { flattenWorldCountriesRecallHistory, loadWorldCountriesRecallHistory, type WorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import { WORLD_COUNTRIES_CORE_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import { deriveWorldCountriesScopeProgressForCountries } from '@/features/world-countries/learning/scopeProgress'
import { getCountryProgressColor, getCountryProgressState } from '@/features/world-countries/learning/progressPresentation'
import { CountryLearningFlow } from '@/features/world-countries/learning/flows/CountryLearningFlow'
import { CapitalLearningFlow } from '@/features/world-countries/learning/flows/CapitalLearningFlow'
import type { LearningSetMaximum } from '@/features/world-countries/learning/stagedLearningPlan'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldMasterySummary } from '@/features/world-countries/ui/WorldMasterySummary'
import { TodayReviewSession, type WorldCountriesTodayReviewCheckpoint } from './TodayReviewSession'
import { GuidedHomeRails } from './GuidedHomeRails'
import { WorldCountriesProgressView } from './WorldCountriesProgressView'
import { deriveWorldCountriesJourneyPresentation, type WorldCountriesJourneyPresentation } from './journeyPresentation'
import type { WorldCountriesTodayReviewReasonSummary } from './reviewReason'
import { buildWorldCountriesTodayPlan, type WorldCountriesTodayLearningRecommendation, type WorldCountriesTodayPlan } from './todayPlan'

type TodayArea = 'drill' | 'recite'
type EvidenceState =
  | { status: 'loading' }
  | { status: 'ready'; history: WorldCountriesRecallHistory }
  | { status: 'error' }

interface LearningRun {
  recommendation: WorldCountriesTodayLearningRecommendation
  countryEntries: readonly Country[]
}

const EMPTY_REVIEW_REASON_SUMMARY: WorldCountriesTodayReviewReasonSummary = {
  mistakes: 0,
  firstRecall: 0,
  firstReviewAfterLearning: 0,
  spaced: 0,
  repeated: 0,
}

/** Map-centered Today orchestration for derived World Countries review. */
export function WorldCountriesToday({
  answerMode: _answerMode,
  onNavigate,
  continent = null,
  onSelectContinent,
  onWorld,
  onOpenPlay,
  onOpenProgress,
}: {
  answerMode: AnswerMode
  onNavigate: (area: TodayArea) => void
  continent?: Continent | null
  onSelectContinent?: (continent: Continent) => void
  onWorld?: () => void
  onOpenPlay?: () => void
  onOpenProgress?: () => void
}) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const scopedCountries = useMemo(
    () => continent ? activeCountries.filter(country => country.continent === continent) : activeCountries,
    [activeCountries, continent],
  )
  const [evidence, setEvidence] = useState<EvidenceState>({ status: 'loading' })
  const geographyRevision = useWorldCountriesGeographyRevision()
  const learningRevision = useWorldCountriesSubregionLearningRevision()
  const [reviewCandidates, setReviewCandidates] = useState<WorldCountriesTodayPlan['reviewQueue'] | null>(null)
  const [checkpoint, setCheckpoint] = useState<WorldCountriesTodayReviewCheckpoint | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [learningRun, setLearningRun] = useState<LearningRun | null>(null)
  const [focusedSubregionId, setFocusedSubregionId] = useState<SubregionId | null>(null)
  const [showProgress, setShowProgress] = useState(false)

  const loadEvidence = useCallback(async () => {
    if (scopedCountries.length === 0) {
      setEvidence({ status: 'ready', history: new Map() })
      return
    }
    setEvidence({ status: 'loading' })
    try {
      const history = await loadWorldCountriesRecallHistory({
        countryIds: scopedCountries.map(country => country.id),
        skills: WORLD_COUNTRIES_CORE_RECALL_SKILLS,
      })
      setEvidence({ status: 'ready', history })
    } catch {
      setEvidence({ status: 'error' })
    }
  }, [scopedCountries])

  useEffect(() => { void loadEvidence() }, [loadEvidence])

  const learningStates = useMemo(() => {
    void learningRevision
    return getAllSubregionLearningStates(activeCountries)
  }, [activeCountries, learningRevision])
  const geographicOrder = useMemo(() => {
    void geographyRevision
    return getWorldCountriesInEffectiveOrder(scopedCountries)
  }, [geographyRevision, scopedCountries])
  const plan = useMemo<WorldCountriesTodayPlan | null>(() => {
    if (evidence.status !== 'ready') return null
    return buildWorldCountriesTodayPlan({
      activeCountries: scopedCountries,
      history: evidence.history,
      learningStates,
      effectiveCountries: geographicOrder.countries,
      effectiveSubregionIds: geographicOrder.subregionIds,
    })
  }, [evidence, geographicOrder, learningStates, scopedCountries])
  const recallProgress = useMemo<RecallProgress | null>(() => {
    if (evidence.status !== 'ready') return null
    return deriveWorldCountriesRecallProgress({
      countryIds: scopedCountries.map(country => country.id),
      skills: WORLD_COUNTRIES_CORE_RECALL_SKILLS,
    }, flattenWorldCountriesRecallHistory(evidence.history))
  }, [evidence, scopedCountries])
  const progress = useMemo(
    () => recallProgress ? deriveWorldCountriesScopeProgressForCountries(
      continent ? `continent:${continent}` : 'world',
      scopedCountries,
      recallProgress,
    ) : null,
    [continent, recallProgress, scopedCountries],
  )
  const countryColorsById = useMemo(() => {
    const currentProgress = recallProgress ?? new Map()
    return new Map(scopedCountries.map(country => {
      const state = getCountryProgressState(deriveWorldCountriesCountryProgress(country.id, currentProgress))
      return [country.id, getCountryProgressColor(state)] as const
    }))
  }, [recallProgress, scopedCountries])

  const refreshAfterActivity = async () => {
    setRefreshing(true)
    await loadEvidence()
    setRefreshing(false)
  }

  const startPrimary = () => {
    if (!plan || evidence.status !== 'ready' || scopedCountries.length === 0) return
    if (plan.dueCount > 0) {
      setReviewCandidates(plan.reviewQueue)
      setReviewing(true)
      setCheckpoint(null)
      return
    }
    if (plan.nextLearning) {
      const countryEntries = geographicOrder.countries.filter(country => country.subregionId === plan.nextLearning?.subregionId)
      if (!countryEntries.length) return
      setLearningRun({ recommendation: plan.nextLearning, countryEntries })
    }
  }

  const finishReview = async (nextCheckpoint: WorldCountriesTodayReviewCheckpoint) => {
    setCheckpoint(nextCheckpoint)
    setReviewing(false)
    setRefreshing(true)
    await loadEvidence()
    setRefreshing(false)
  }

  const exitReview = () => {
    setReviewing(false)
    setReviewCandidates(null)
    void refreshAfterActivity()
  }

  const finishLearning = () => {
    setLearningRun(null)
    setCheckpoint(null)
    void refreshAfterActivity()
  }

  const nextLearning = plan?.nextLearning ?? null
  const guidedSubregionId = nextLearning?.subregionId ?? geographicOrder.subregionIds.find(subregionId => {
    const state = learningStates.find(candidate => candidate.subregionId === subregionId)
    return !state?.capitalsLearnedAt
  }) ?? geographicOrder.subregionIds[0] ?? null
  const journey = useMemo<WorldCountriesJourneyPresentation | null>(() => {
    if (evidence.status !== 'ready' || !guidedSubregionId) return null
    return deriveWorldCountriesJourneyPresentation({
      subregionId: guidedSubregionId,
      entries: scopedCountries,
      learningState: learningStates.find(state => state.subregionId === guidedSubregionId),
      recallProgress: recallProgress ?? new Map(),
    })
  }, [evidence.status, guidedSubregionId, learningStates, recallProgress, scopedCountries])
  const scopeSummaries = useMemo(() => {
    void geographyRevision
    if (!recallProgress) return []
    if (!continent) {
      return getContinentsInEffectiveOrder(scopedCountries, getWorldMetadata()).map(candidate => {
        const entries = scopedCountries.filter(country => country.continent === candidate)
        return {
          id: candidate,
          label: candidate,
          progress: deriveWorldCountriesScopeProgressForCountries(`continent:${candidate}`, entries, recallProgress),
          onSelect: onSelectContinent ? () => onSelectContinent(candidate) : undefined,
        }
      })
    }
    return getSubregionsForContinentInEffectiveOrder(continent, scopedCountries, getContinentMetadata(continent)).map(subregion => {
      const entries = scopedCountries.filter(country => country.subregionId === subregion.id)
      return {
        id: subregion.id,
        label: subregion.label,
        progress: deriveWorldCountriesScopeProgressForCountries(`subregion:${subregion.id}`, entries, recallProgress),
        onSelect: () => setFocusedSubregionId(subregion.id),
        status: subregion.id === guidedSubregionId ? 'Current guided unit' : undefined,
      }
    })
  }, [continent, geographyRevision, guidedSubregionId, onSelectContinent, recallProgress, scopedCountries])
  const highlightedCountryIds = focusedSubregionId
    ? scopedCountries.filter(country => country.subregionId === focusedSubregionId).map(country => country.id)
    : []
  const scopeLabel = continent ?? 'World'
  const navigateWorld = onWorld ?? (() => undefined)

  if (showProgress) {
    return <WorldCountriesProgressView
      scopeLabel={scopeLabel}
      scopeCountries={scopedCountries}
      progress={progress}
      recallProgress={recallProgress}
      learningStates={learningStates}
      onBack={() => setShowProgress(false)}
    />
  }

  if (learningRun) {
    const { recommendation, countryEntries } = learningRun
    const schedulerSettings = {
      masteryLatencyFactor: settings.masteryLatencyFactor,
      sessionUnmasteredShare: settings.sessionUnmasteredShare,
    }
    if (recommendation.track === 'learn-countries') {
      return <CountryLearningFlow
        key={`${recommendation.track}:${recommendation.subregionId}`}
        continent={recommendation.continent}
        subregion={recommendation.subregionId}
        entries={countryEntries}
        activeCountries={activeCountries}
        newItemsPerSet={settings.worldCountriesNewItemsPerSet as LearningSetMaximum}
        schedulerSettings={schedulerSettings}
        fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
        onPhaseChange={() => undefined}
        onExit={finishLearning}
        onDone={finishLearning}
        doneLabel="Back to Today"
        recordCompletion={true}
      />
    }
    const learningState = learningStates.find(state => state.subregionId === recommendation.subregionId)
    return <CapitalLearningFlow
      key={`${recommendation.track}:${recommendation.subregionId}`}
      continent={recommendation.continent}
      subregion={recommendation.subregionId}
      entries={countryEntries}
      activeCountries={activeCountries}
      newItemsPerSet={settings.worldCountriesNewItemsPerSet as LearningSetMaximum}
      schedulerSettings={schedulerSettings}
      countriesLearned={Boolean(learningState?.countriesLearnedAt)}
      fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
      onPhaseChange={() => undefined}
      onExit={finishLearning}
      onDone={finishLearning}
      doneLabel="Back to Today"
      recordCompletion={true}
    />
  }

  if (reviewing && reviewCandidates) {
    return <TodayReviewSession
      candidates={reviewCandidates}
      activeCountries={scopedCountries}
      fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
      onDone={finishReview}
      onExit={exitReview}
    />
  }

  const canContinue = Boolean(plan && evidence.status === 'ready' && scopedCountries.length > 0 && (plan.dueCount > 0 || plan.nextLearning))
  const hasDue = Boolean(plan && plan.dueCount > 0)
  const caughtUp = evidence.status === 'ready' && scopedCountries.length > 0 && !hasDue && !nextLearning
  const mapDescriptions = new Map(scopedCountries.map(country => [country.id, `${scopeLabel} core mastery is shown in the progress summary.`] as const))

  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-today-heading">
      <GuidedHomeRails
        level={continent ? 'continent' : 'world'}
        continent={continent ?? undefined}
        activeCountryCount={scopedCountries.length}
        evidenceStatus={evidence.status}
        dueCount={plan?.dueCount ?? 0}
        dueCountryCount={plan?.dueCountryCount ?? 0}
        reviewReasonSummary={plan?.reviewReasonSummary ?? EMPTY_REVIEW_REASON_SUMMARY}
        nextLearning={nextLearning ? { track: nextLearning.track, subregionLabel: nextLearning.subregionLabel } : null}
        refreshing={refreshing}
        caughtUp={caughtUp}
        scopeSummaries={scopeSummaries}
        journey={journey}
        onWorld={navigateWorld}
        onOpenPlay={onOpenPlay ?? (() => onNavigate('recite'))}
        onOpenProgress={() => { setShowProgress(true); onOpenProgress?.() }}
      />

      <div className="space-y-4">
        <WorldMasterySummary progress={progress} scopeLabel={scopeLabel} />
        <MapSurface
          context={(
            <div className="px-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries · {continent ? 'Continent hub' : 'Home'}</p>
              <h1 id="world-countries-today-heading" className="mt-1 text-2xl font-black text-zinc-100">{continent ? `${continent} learning hub` : 'Your world'}</h1>
              <p className="mt-1 text-sm text-zinc-500">The map is both progress overview and geographic navigation.</p>
            </div>
          )}
          map={(
            <GeographyOverviewMap
              level={continent ? 'continent' : 'world'}
              continent={continent ?? undefined}
              countryPopulation={scopedCountries}
              countryColorsById={countryColorsById}
              highlightedCountryIds={highlightedCountryIds}
              countryAccessibleDescriptionsById={mapDescriptions}
              interactive
              onCountryClick={country => continent ? setFocusedSubregionId(country.subregionId) : onSelectContinent?.(country.continent)}
              ariaLabel={continent ? `${continent} learning map` : 'World Countries learning map'}
            />
          )}
          dock={canContinue ? (
            <TaskDock variant="navigation" focusPrimary={Boolean(checkpoint) && hasDue && !refreshing}>
              <button type="button" data-primary-action disabled={refreshing} onClick={startPrimary} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">
                {hasDue ? 'Continue review' : 'Continue learning'}
              </button>
            </TaskDock>
          ) : undefined}
          dockPlacement="attached"
          className="animate-fade-in"
        />
      </div>
    </section>
  )
}
