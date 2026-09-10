import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { getWorldCountriesInEffectiveOrder } from '@/features/world-countries/geography/effectiveOrder'
import { getContinentsInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { getAllSubregionLearningStates, useWorldCountriesSubregionLearningRevision } from '@/features/world-countries/learning/subregionLearningStore'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { deriveWorldCountriesCountryProgress, deriveWorldCountriesRecallProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'
import { isWorldCountriesCountryLayerEstablished } from '@/features/world-countries/learning/learningReadiness'
import { flattenWorldCountriesRecallHistory, loadWorldCountriesRecallHistory, type WorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import { WORLD_COUNTRIES_CORE_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import { deriveWorldCountriesScopeProgressForCountries } from '@/features/world-countries/learning/scopeProgress'
import { getCountryProgressColor, getCountryProgressState } from '@/features/world-countries/learning/progressPresentation'
import { CountryLearningFlow } from '@/features/world-countries/learning/flows/CountryLearningFlow'
import { CapitalLearningFlow } from '@/features/world-countries/learning/flows/CapitalLearningFlow'
import type { LearningCompletionHandoff, LearningRegionCompletion } from '@/features/world-countries/learning/flows/LearningComplete'
import { buildLearningPlan, type LearningSetMaximum } from '@/features/world-countries/learning/stagedLearningPlan'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldMasterySummary } from '@/features/world-countries/ui/WorldMasterySummary'
import { TodayReviewSession, type WorldCountriesTodayReviewCheckpoint, type WorldCountriesTodayReviewCompletion } from './TodayReviewSession'
import type { WorldCountriesGuidedRecallMode } from './TodayRails'
import { GuidedHomeRails } from './GuidedHomeRails'
import { WorldCountriesProgressView } from './WorldCountriesProgressView'
import { deriveWorldCountriesJourneyPresentation, type WorldCountriesJourneyPresentation } from './journeyPresentation'
import { buildWorldCountriesTodayPlan, type WorldCountriesTodayLearningRecommendation, type WorldCountriesTodayPlan, type WorldCountriesTodayReviewOpportunity } from './todayPlan'

type TodayArea = 'drill' | 'recite'
type EvidenceState =
  | { status: 'loading' }
  | { status: 'ready'; history: WorldCountriesRecallHistory }
  | { status: 'error' }

interface LearningRun {
  recommendation: WorldCountriesTodayLearningRecommendation
  countryEntries: readonly Country[]
}

function isSameLearningRecommendation(
  current: WorldCountriesTodayLearningRecommendation,
  next: WorldCountriesTodayLearningRecommendation,
): boolean {
  return current.track === next.track
    && current.subregionId === next.subregionId
    && current.countryIds.length === next.countryIds.length
    && current.countryIds.every((countryId, index) => countryId === next.countryIds[index])
}

function formatCountedAction(prefix: string, count: number, singular: string): string {
  const plural = singular.endsWith('y') ? `${singular.slice(0, -1)}ies` : `${singular}s`
  return `${prefix} ${count} ${count === 1 ? singular : plural}`
}

function isLearningSetMaximum(value: unknown): value is LearningSetMaximum {
  return value === 'all' || value === 3 || value === 4 || value === 5
}

function firstCountryLearningSetCount(
  recommendation: WorldCountriesTodayLearningRecommendation,
  newItemsPerSet: LearningSetMaximum | undefined,
): number | null {
  if (recommendation.track !== 'learn-countries' || !isLearningSetMaximum(newItemsPerSet)) return null
  const firstStage = buildLearningPlan(recommendation.countryIds, newItemsPerSet)[0]
  return firstStage?.kind === 'set' ? firstStage.set.ids.length : null
}

function getJourneyActionLabel(
  recommendation: WorldCountriesTodayLearningRecommendation,
  newItemsPerSet?: LearningSetMaximum,
): string | null {
  if (recommendation.track === 'learn-capitals') return 'Add the capitals'
  const count = firstCountryLearningSetCount(recommendation, newItemsPerSet)
  return count === null ? 'Learn the countries' : formatCountedAction('Learn', count, 'country')
}

function createCompletionHandoff({
  currentRecommendation,
  nextRecommendation,
  newItemsPerSet,
  regionLearned,
  onContinue,
  onStop,
  originatingScopeLabel,
}: {
  currentRecommendation: WorldCountriesTodayLearningRecommendation
  nextRecommendation: WorldCountriesTodayLearningRecommendation | null
  newItemsPerSet: LearningSetMaximum | undefined
  regionLearned: boolean
  onContinue: () => void
  onStop: () => void
  originatingScopeLabel: string
}): LearningCompletionHandoff | undefined {
  if (!nextRecommendation || isSameLearningRecommendation(currentRecommendation, nextRecommendation)) return undefined
  const nextLabel = getJourneyActionLabel(nextRecommendation, newItemsPerSet)
  if (regionLearned && nextRecommendation.subregionId !== currentRecommendation.subregionId) {
    return {
      description: `Next region: ${nextRecommendation.subregionLabel}`,
      label: `Start ${nextRecommendation.subregionLabel}`,
      onContinue,
      stopLabel: `Back to ${originatingScopeLabel}`,
      onStop,
    }
  }
  const isCountryToCapital = currentRecommendation.track === 'learn-countries'
    && nextRecommendation.track === 'learn-capitals'
    && nextRecommendation.subregionId === currentRecommendation.subregionId
  return isCountryToCapital
    ? { description: 'Next: add the capitals to these countries.', label: 'Add the capitals', onContinue }
    : {
        description: `Next: ${(nextLabel ?? (nextRecommendation.track === 'learn-capitals' ? 'Add the capitals' : 'Learn the countries')).toLowerCase()} in ${nextRecommendation.subregionLabel}.`,
        label: nextLabel ?? (nextRecommendation.track === 'learn-capitals' ? 'Add the capitals' : 'Learn the countries'),
        onContinue,
      }
}

/** Map-centered Today orchestration for derived World Countries review. */
export function WorldCountriesToday({
  answerMode: _answerMode,
  onNavigate,
  continent = null,
  onSelectContinent,
  onWorld,
  onOpenProgress,
}: {
  answerMode: AnswerMode
  onNavigate: (area: TodayArea) => void
  continent?: Continent | null
  onSelectContinent?: (continent: Continent) => void
  onWorld?: () => void
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
  const [reviewMode, setReviewMode] = useState<WorldCountriesGuidedRecallMode>('review')
  const [reviewing, setReviewing] = useState(false)
  const [reviewFocusRequest, setReviewFocusRequest] = useState(0)
  const [reviewCompletion, setReviewCompletion] = useState<WorldCountriesTodayReviewCompletion | null>(null)
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
  useEffect(() => {
    setFocusedSubregionId(null)
    setReviewCompletion(null)
  }, [continent])

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

  const refreshAfterReview = async () => {
    await refreshAfterActivity()
    setReviewFocusRequest(request => request + 1)
  }

  const finishLearning = () => {
    setLearningRun(null)
    setReviewCompletion(null)
    void refreshAfterActivity()
  }

  const launchReviewOpportunity = (opportunity: Exclude<WorldCountriesTodayReviewOpportunity, null>) => {
    setLearningRun(null)
    setReviewCompletion(null)
    setReviewCandidates(opportunity.candidates)
    setReviewMode(opportunity.kind === 'consolidate' ? 'consolidation' : 'review')
    setReviewing(true)
  }

  const launchLearningRecommendation = (recommendation: WorldCountriesTodayLearningRecommendation) => {
    const countriesById = new Map(geographicOrder.countries.map(country => [country.id, country]))
    const countryEntries = recommendation.countryIds
      .map(countryId => countriesById.get(countryId))
      .filter((country): country is Country => Boolean(country))
    if (countryEntries.length !== recommendation.countryIds.length) return
    setReviewing(false)
    setReviewCandidates(null)
    setReviewCompletion(null)
    setLearningRun({ recommendation, countryEntries })
  }

  const startReview = () => {
    if (!plan?.reviewOpportunity || evidence.status !== 'ready' || scopedCountries.length === 0) return
    launchReviewOpportunity(plan.reviewOpportunity)
  }

  const startJourney = () => {
    if (!plan?.curriculumRecommendation || evidence.status !== 'ready' || scopedCountries.length === 0) return
    launchLearningRecommendation(plan.curriculumRecommendation)
  }

  const finishReview = async (checkpoint: WorldCountriesTodayReviewCheckpoint) => {
    const completionMode = reviewMode
    setReviewing(false)
    setReviewCandidates(null)
    setReviewMode('review')
    setReviewCompletion({ checkpoint, mode: completionMode })
    await refreshAfterReview()
  }

  const exitReview = async () => {
    setReviewing(false)
    setReviewCandidates(null)
    setReviewMode('review')
    setReviewCompletion(null)
    await refreshAfterReview()
  }

  const journeyLearning = plan?.curriculumRecommendation ?? null
  const guidedSubregionId = plan?.journeyFocusSubregionId
    ?? journeyLearning?.subregionId
    ?? null
  const displaySubregionId = focusedSubregionId ?? guidedSubregionId
  const journey = useMemo<WorldCountriesJourneyPresentation | null>(() => {
    if (evidence.status !== 'ready' || !displaySubregionId) return null
    return deriveWorldCountriesJourneyPresentation({
      subregionId: displaySubregionId,
      entries: scopedCountries,
      learningState: learningStates.find(state => state.subregionId === displaySubregionId),
      recallProgress: recallProgress ?? new Map(),
    })
  }, [displaySubregionId, evidence.status, learningStates, recallProgress, scopedCountries])
  const completedLearningJourney = useMemo<WorldCountriesJourneyPresentation | null>(() => {
    if (!learningRun || evidence.status !== 'ready') return null
    return deriveWorldCountriesJourneyPresentation({
      subregionId: learningRun.recommendation.subregionId,
      entries: scopedCountries,
      learningState: learningStates.find(state => state.subregionId === learningRun.recommendation.subregionId),
      recallProgress: recallProgress ?? new Map(),
    })
  }, [evidence.status, learningRun, learningStates, recallProgress, scopedCountries])
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
        status: journeyLearning && subregion.id === guidedSubregionId
          ? 'Journey focus'
          : subregion.id === focusedSubregionId ? "You're viewing this region" : undefined,
      }
    })
  }, [continent, focusedSubregionId, geographyRevision, guidedSubregionId, journeyLearning, onSelectContinent, recallProgress, scopedCountries])
  const highlightedCountryIds = focusedSubregionId
    ? scopedCountries.filter(country => country.subregionId === focusedSubregionId).map(country => country.id)
    : []
  const scopeLabel = continent ?? 'World'
  const navigateWorld = onWorld ?? (() => undefined)
  const completionHandoff = learningRun && evidence.status === 'ready' && journeyLearning
    ? createCompletionHandoff({
        currentRecommendation: learningRun.recommendation,
        nextRecommendation: journeyLearning,
        newItemsPerSet: settings.worldCountriesNewItemsPerSet as LearningSetMaximum | undefined,
        regionLearned: Boolean(completedLearningJourney?.regionLearned),
        onContinue: () => launchLearningRecommendation(journeyLearning),
        onStop: finishLearning,
        originatingScopeLabel: continent ?? 'World',
      })
    : undefined
  const regionCompletion: LearningRegionCompletion | undefined = completedLearningJourney?.regionLearned
    ? { masteryStatus: completedLearningJourney.masteryStatus }
    : undefined

  if (showProgress) {
    return <WorldCountriesProgressView
      scopeLabel={scopeLabel}
      scopeContinent={continent ?? undefined}
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
    const learningState = learningStates.find(state => state.subregionId === recommendation.subregionId)
    const countriesEstablished = isWorldCountriesCountryLayerEstablished(countryEntries, recommendation.subregionId, learningState, recallProgress ?? new Map())
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
        countriesEstablished={countriesEstablished}
        capitalsEstablished={Boolean(learningState?.capitalsLearnedAt)}
        onPhaseChange={() => undefined}
        onExit={finishLearning}
        onDone={finishLearning}
        doneLabel={`Back to ${continent ?? 'World'}`}
        completionHandoff={completionHandoff}
        regionCompletion={regionCompletion}
        recordCompletion={true}
      />
    }
    return <CapitalLearningFlow
      key={`${recommendation.track}:${recommendation.subregionId}`}
      continent={recommendation.continent}
      subregion={recommendation.subregionId}
      entries={countryEntries}
      activeCountries={activeCountries}
      newItemsPerSet={settings.worldCountriesNewItemsPerSet as LearningSetMaximum}
      schedulerSettings={schedulerSettings}
      countriesEstablished={countriesEstablished}
      capitalsEstablished={Boolean(learningState?.capitalsLearnedAt)}
      fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
      onPhaseChange={() => undefined}
      onExit={finishLearning}
      onDone={finishLearning}
      doneLabel={`Back to ${continent ?? 'World'}`}
      completionHandoff={completionHandoff}
      regionCompletion={regionCompletion}
      recordCompletion={true}
    />
  }

  if (reviewing && reviewCandidates) {
    return <TodayReviewSession
      candidates={reviewCandidates}
      activeCountries={scopedCountries}
      fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
      mode={reviewMode}
      onDone={finishReview}
      onExit={exitReview}
    />
  }

  const canContinue = Boolean(journeyLearning && evidence.status === 'ready' && scopedCountries.length > 0)
  const journeyActionLabel = journeyLearning
    ? getJourneyActionLabel(journeyLearning, settings.worldCountriesNewItemsPerSet as LearningSetMaximum | undefined)
    : null
  const inspectedSubregionLabel = focusedSubregionId ? getSubregionDefinition(focusedSubregionId).label : null
  const mapDescriptions = new Map(scopedCountries.map(country => [country.id, `Progress for ${scopeLabel} is shown in the progress summary.`] as const))

  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-today-heading">
      <GuidedHomeRails
        level={continent ? 'continent' : 'world'}
        continent={continent ?? undefined}
        activeCountryCount={scopedCountries.length}
        evidenceStatus={evidence.status}
        reviewOpportunity={plan?.reviewOpportunity ?? null}
        reviewCompletion={reviewCompletion}
        onStartReview={startReview}
        focusReviewActionRequest={reviewFocusRequest}
        refreshing={refreshing}
        scopeSummaries={scopeSummaries}
        scopeProgress={progress}
        journey={journey}
        guidedSubregionId={guidedSubregionId}
        curriculumRecommendationAvailable={Boolean(journeyLearning)}
        onFocusGuidedSubregion={() => setFocusedSubregionId(null)}
        onWorld={navigateWorld}
        onOpenProgress={() => {
          if (evidence.status !== 'ready' || !progress) return
          setShowProgress(true)
          onOpenProgress?.()
        }}
      />

      <div className="space-y-4">
        <WorldMasterySummary progress={progress} scopeLabel={scopeLabel} />
        <MapSurface
          context={(
            <div className="px-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries · {continent ? 'Continent hub' : 'Home'}</p>
              <h1 id="world-countries-today-heading" className="mt-1 text-2xl font-black text-zinc-100">{continent ? `${continent} learning hub` : 'Your world'}</h1>
              <p className="mt-1 text-sm text-zinc-500">Explore the map to see what you&apos;ve learned and what&apos;s still ahead.</p>
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
            <TaskDock variant="navigation" status={(
              <div data-task-scope-context>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Continue your journey</p>
                <p className="mt-1 font-semibold text-zinc-100">{journeyActionLabel} · {journeyLearning?.subregionLabel}</p>
                {inspectedSubregionLabel && focusedSubregionId !== guidedSubregionId && <p className="mt-1 text-xs text-zinc-400">You&apos;re inspecting {inspectedSubregionLabel}</p>}
              </div>
            )}>
              <button type="button" data-primary-action disabled={refreshing} onClick={startJourney} className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-40">
                Continue learning
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
