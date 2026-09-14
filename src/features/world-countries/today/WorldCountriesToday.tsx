import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { continentIdFor, getSubregionDefinition, type ContinentId, type SubregionId } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { getWorldCountriesInEffectiveOrder } from '@/features/world-countries/geography/effectiveOrder'
import { getContinentsInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { getAllSubregionLearningStates, useWorldCountriesSubregionLearningRevision } from '@/features/world-countries/learning/subregionLearningStore'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { deriveWorldCountriesCountryProgress, deriveWorldCountriesRecallProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'
import {
  createWorldCountriesEstablishedLearningReadinessByCountry,
  createWorldCountriesLearningPattern,
  getWorldCountriesLearningReadinessLabel,
  getWorldCountriesLearningStateList,
  isWorldCountriesCountryLayerEstablished,
} from '@/features/world-countries/learning/learningReadiness'
import { flattenWorldCountriesRecallHistory, loadWorldCountriesRecallHistory, type WorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import { WORLD_COUNTRIES_CORE_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import { deriveWorldCountriesScopeProgressForCountries } from '@/features/world-countries/learning/scopeProgress'
import { deriveWorldCountriesPrimaryStatus, deriveWorldCountriesPrimaryStatusCounts, getCountryProgressColor, WORLD_COUNTRIES_PROGRESS_LABELS } from '@/features/world-countries/learning/progressPresentation'
import { CountryLearningFlow } from '@/features/world-countries/learning/flows/CountryLearningFlow'
import { CapitalLearningFlow } from '@/features/world-countries/learning/flows/CapitalLearningFlow'
import type { LearningCompletedRegionAction, LearningCompletionCelebration, LearningCompletionHandoff, LearningRegionCompletion } from '@/features/world-countries/learning/flows/LearningComplete'
import { WorldMasteryCelebration } from '@/features/world-countries/learning/flows/LearningCelebration'
import type { LearningSetMaximum } from '@/features/world-countries/learning/stagedLearningPlan'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { MapSurface } from '@/features/world-countries/ui/MapSurface'
import { WorldCountriesMapLegend } from '@/features/world-countries/ui/WorldCountriesMapLegend'
import { TodayReviewSession, type WorldCountriesTodayReviewCheckpoint, type WorldCountriesTodayReviewCompletion } from './TodayReviewSession'
import type { WorldCountriesGuidedRecallMode } from './TodayRails'
import { GuidedHomeRails } from './GuidedHomeRails'
import { TodayActionHub, type TodayHubAction } from './TodayActionHub'
import { WorldCountriesProgressView } from './WorldCountriesProgressView'
import { JourneyContinentSwitchDialog } from './JourneyContinentSwitchDialog'
import { ContinentCompletionDialog } from './ContinentCompletionDialog'
import { ReviewCompletionDialog } from './ReviewCompletionDialog'
import { clearPreferredJourneyContinent, getPreferredJourneyContinent, setPreferredJourneyContinent } from './journeyPreferenceStore'
import { deriveWorldCountriesJourneyPresentation, type WorldCountriesJourneyPresentation } from './journeyPresentation'
import { buildWorldCountriesTodayPlan, type WorldCountriesTodayLearningRecommendation, type WorldCountriesTodayPlan, type WorldCountriesTodayReviewOpportunity } from './todayPlan'

export type WorldCountriesTodayNavigation =
  | {
      area: 'drill'
      scope:
        | { kind: 'world' }
        | { kind: 'subregion'; subregionId: SubregionId }
    }
  | { area: 'recite' }
  | { area: 'play' }
type EvidenceState =
  | { status: 'loading' }
  | { status: 'ready'; history: WorldCountriesRecallHistory }
  | { status: 'error' }

interface LearningRun {
  kind: 'curriculum' | 'relearn'
  recommendation: WorldCountriesTodayLearningRecommendation
  countryEntries: readonly Country[]
}

interface ContinentCompletionCelebration {
  continent: Continent
  /** Absent once the World Journey has no remaining Continent to hand off to. */
  nextContinent?: Continent
}

interface ContinentCompletionLookup {
  continent: Continent
  activeCountries: readonly Country[]
  learningStates: ReturnType<typeof getAllSubregionLearningStates>
  preferredJourneyContinent: ContinentId | null
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

function getJourneyActionLabel(
  recommendation: WorldCountriesTodayLearningRecommendation,
): string | null {
  if (recommendation.track === 'learn-capitals') return 'Add the capitals'
  return formatCountedAction('Learn', recommendation.countryIds.length, 'country')
}

function getCurriculumRecommendationForSubregion(
  plan: WorldCountriesTodayPlan | null,
  subregionId: SubregionId | null,
): WorldCountriesTodayLearningRecommendation | null {
  if (!plan || !subregionId) return null
  return plan.curriculumRecommendationsBySubregion?.get(subregionId)
    ?? (plan.curriculumRecommendation?.subregionId === subregionId ? plan.curriculumRecommendation : null)
}

function createCompletionHandoff({
  currentRecommendation,
  nextRecommendation,
  regionLearned,
  onContinue,
  onStop,
  originatingScopeLabel,
}: {
  currentRecommendation: WorldCountriesTodayLearningRecommendation
  nextRecommendation: WorldCountriesTodayLearningRecommendation | null
  regionLearned: boolean
  onContinue: () => void
  onStop: () => void
  originatingScopeLabel: string
}): LearningCompletionHandoff | undefined {
  if (!nextRecommendation || isSameLearningRecommendation(currentRecommendation, nextRecommendation)) return undefined
  const nextLabel = getJourneyActionLabel(nextRecommendation)
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
  worldJourneyContinent = null,
  onSelectContinent,
  onWorld,
  onOpenProgress,
}: {
  answerMode: AnswerMode
  onNavigate: (navigation: WorldCountriesTodayNavigation) => void
  continent?: Continent | null
  worldJourneyContinent?: Continent | null
  onSelectContinent?: (continent: Continent, worldJourneyContinent: Continent | null) => void
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
  const [hubFocusRequest, setHubFocusRequest] = useState(0)
  const [reviewCompletion, setReviewCompletion] = useState<WorldCountriesTodayReviewCompletion | null>(null)
  const [reviewCompletionDialogOpen, setReviewCompletionDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [learningRun, setLearningRun] = useState<LearningRun | null>(null)
  const [selectedSubregionId, setSelectedSubregionId] = useState<SubregionId | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [preferredJourneyContinent, setPreferredJourneyContinentState] = useState<ContinentId | null>(getPreferredJourneyContinent)
  const [journeySwitchPrompt, setJourneySwitchPrompt] = useState<{
    recommendation: WorldCountriesTodayLearningRecommendation
    currentContinent: Continent
  } | null>(null)
  const completionObservedRef = useRef<boolean | null>(null)
  const [continentCompletionCelebration, setContinentCompletionCelebration] = useState<ContinentCompletionCelebration | null>(null)
  const [continentCompletionLookup, setContinentCompletionLookup] = useState<ContinentCompletionLookup | null>(null)

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
    setSelectedSubregionId(current => current && scopedCountries.some(country => country.subregionId === current) ? current : null)
    setReviewCompletion(null)
    setReviewCompletionDialogOpen(false)
  }, [continent, scopedCountries])
  useEffect(() => {
    completionObservedRef.current = null
    setContinentCompletionCelebration(null)
    setContinentCompletionLookup(null)
  }, [continent])

  const learningStates = useMemo(() => {
    void learningRevision
    return getAllSubregionLearningStates(activeCountries)
  }, [activeCountries, learningRevision])
  const requestContinentCompletionHandoff = useCallback((completedContinent: Continent) => {
    setContinentCompletionLookup({
      continent: completedContinent,
      activeCountries,
      learningStates,
      preferredJourneyContinent,
    })
  }, [activeCountries, learningStates, preferredJourneyContinent])
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
      ...(continent ? {} : { preferredJourneyContinent }),
    })
  }, [continent, evidence, geographicOrder, learningStates, preferredJourneyContinent, scopedCountries])

  useEffect(() => {
    if (!plan || !preferredJourneyContinent) return
    if (continent && continentIdFor(continent) !== preferredJourneyContinent) return
    const hasRemainingJourney = [...plan.curriculumRecommendationsBySubregion.values()].some(recommendation => (
      recommendation && continentIdFor(recommendation.continent) === preferredJourneyContinent
    ))
    if (hasRemainingJourney) return
    clearPreferredJourneyContinent()
    setPreferredJourneyContinentState(null)
  }, [continent, plan, preferredJourneyContinent])
  const recallProgress = useMemo<RecallProgress | null>(() => {
    if (evidence.status !== 'ready') return null
    return deriveWorldCountriesRecallProgress({
      countryIds: scopedCountries.map(country => country.id),
      skills: WORLD_COUNTRIES_CORE_RECALL_SKILLS,
    }, flattenWorldCountriesRecallHistory(evidence.history))
  }, [evidence, scopedCountries])
  const learningReadinessByCountry = useMemo(
    () => createWorldCountriesEstablishedLearningReadinessByCountry(
      scopedCountries,
      learningStates,
      recallProgress ?? new Map(),
    ),
    [learningStates, recallProgress, scopedCountries],
  )
  const scopeLearningComplete = Boolean(
    evidence.status === 'ready'
    && scopedCountries.length > 0
    && learningReadinessByCountry.size === scopedCountries.length
    && [...learningReadinessByCountry.values()].every(
      readiness => readiness === 'COUNTRIES_AND_CAPITALS_LEARNED',
    )
  )
  const continentLearningComplete = Boolean(continent && scopeLearningComplete)
  const worldLearningComplete = Boolean(!continent && scopeLearningComplete)
  useEffect(() => {
    if (!continent || evidence.status !== 'ready') return
    if (completionObservedRef.current === null) {
      completionObservedRef.current = continentLearningComplete
      return
    }
    const wasComplete = completionObservedRef.current
    completionObservedRef.current = continentLearningComplete
    if (wasComplete || !continentLearningComplete) return
    requestContinentCompletionHandoff(continent)
  }, [continent, continentLearningComplete, evidence.status, requestContinentCompletionHandoff])
  useEffect(() => {
    if (!continentCompletionLookup || continentCompletionLookup.continent !== continent) return
    let cancelled = false
    const resolveNextContinent = async () => {
      try {
        const history = await loadWorldCountriesRecallHistory({
          countryIds: continentCompletionLookup.activeCountries.map(country => country.id),
          skills: WORLD_COUNTRIES_CORE_RECALL_SKILLS,
        })
        if (cancelled || continentCompletionLookup.continent !== continent) return
        const worldOrder = getWorldCountriesInEffectiveOrder(continentCompletionLookup.activeCountries)
        const worldPlan = buildWorldCountriesTodayPlan({
          activeCountries: continentCompletionLookup.activeCountries,
          history,
          learningStates: continentCompletionLookup.learningStates,
          effectiveCountries: worldOrder.countries,
          effectiveSubregionIds: worldOrder.subregionIds,
          preferredJourneyContinent: continentCompletionLookup.preferredJourneyContinent,
        })
        const nextRecommendation = worldPlan.curriculumRecommendation
        if (cancelled || continentCompletionLookup.continent !== continent) return
        // Remaining Journey work inside this Continent means it is not complete after all.
        if (nextRecommendation && nextRecommendation.continent === continentCompletionLookup.continent) return
        setContinentCompletionCelebration({
          continent: continentCompletionLookup.continent,
          ...(nextRecommendation ? { nextContinent: nextRecommendation.continent } : {}),
        })
      } catch {
        // This optional handoff must not block the completed Continent hub.
      }
    }
    void resolveNextContinent()
    return () => { cancelled = true }
  }, [continent, continentCompletionLookup])
  const primaryStatusByCountry = useMemo(() => new Map(scopedCountries.map(country => [
    country.id,
    deriveWorldCountriesPrimaryStatus(
      learningReadinessByCountry.get(country.id) ?? 'NOT_LEARNED',
      deriveWorldCountriesCountryProgress(country.id, recallProgress ?? new Map()),
    ),
  ] as const)), [learningReadinessByCountry, recallProgress, scopedCountries])
  const progress = useMemo(
    () => recallProgress ? deriveWorldCountriesScopeProgressForCountries(
      continent ? `continent:${continent}` : 'world',
      scopedCountries,
      recallProgress,
    ) : null,
    [continent, recallProgress, scopedCountries],
  )
  const countryColorsById = useMemo(() => {
    return new Map([...primaryStatusByCountry].flatMap(([countryId, status]) => (
      status.kind === 'recall'
        ? [[countryId, getCountryProgressColor(status.state)] as const]
        : []
    )))
  }, [primaryStatusByCountry])
  const countryPatternsById = useMemo(() => new Map(scopedCountries.flatMap(country => (
    worldLearningComplete
      ? []
      : learningReadinessByCountry.get(country.id) === 'COUNTRIES_LEARNED'
        ? [[country.id, createWorldCountriesLearningPattern('diagonal')] as const]
        : []
  ))), [learningReadinessByCountry, scopedCountries, worldLearningComplete])

  const refreshAfterActivity = async () => {
    setRefreshing(true)
    await loadEvidence()
    setRefreshing(false)
  }

  const refreshAfterReview = async () => {
    await refreshAfterActivity()
    setHubFocusRequest(request => request + 1)
  }

  const launchReviewOpportunity = (opportunity: Exclude<WorldCountriesTodayReviewOpportunity, null>) => {
    setLearningRun(null)
    setReviewCompletion(null)
    setReviewCompletionDialogOpen(false)
    setReviewCandidates(opportunity.candidates)
    setReviewMode(opportunity.kind === 'consolidate' ? 'consolidation' : 'review')
    setReviewing(true)
  }

  const launchLearningRecommendation = (
    recommendation: WorldCountriesTodayLearningRecommendation,
    options: { focusSubregion?: boolean; kind?: LearningRun['kind'] } = {},
  ) => {
    const countriesById = new Map(geographicOrder.countries.map(country => [country.id, country]))
    const countryEntries = recommendation.countryIds
      .map(countryId => countriesById.get(countryId))
      .filter((country): country is Country => Boolean(country))
    if (countryEntries.length !== recommendation.countryIds.length) return
    setReviewing(false)
    setReviewCandidates(null)
    setReviewCompletion(null)
    setReviewCompletionDialogOpen(false)
    if (options.focusSubregion && continent) setSelectedSubregionId(recommendation.subregionId)
    setLearningRun({ kind: options.kind ?? 'curriculum', recommendation, countryEntries })
  }

  const startReview = () => {
    if (!plan?.reviewOpportunity || evidence.status !== 'ready' || scopedCountries.length === 0) return
    launchReviewOpportunity(plan.reviewOpportunity)
  }

  const startJourney = () => {
    if (!hubJourneyRecommendation || evidence.status !== 'ready' || scopedCountries.length === 0) return
    const recommendationContinentId = continentIdFor(hubJourneyRecommendation.continent)
    const currentWorldJourneyContinentId = worldJourneyContinent ? continentIdFor(worldJourneyContinent) : null
    if (
      continent
      && worldJourneyContinent
      && recommendationContinentId
      && currentWorldJourneyContinentId
      && recommendationContinentId !== currentWorldJourneyContinentId
      && recommendationContinentId !== preferredJourneyContinent
    ) {
      setJourneySwitchPrompt({ recommendation: hubJourneyRecommendation, currentContinent: worldJourneyContinent })
      return
    }
    launchLearningRecommendation(hubJourneyRecommendation)
  }

  const finishReview = async (checkpoint: WorldCountriesTodayReviewCheckpoint) => {
    const completionMode = reviewMode
    setReviewing(false)
    setReviewCandidates(null)
    setReviewMode('review')
    setReviewCompletionDialogOpen(false)
    await refreshAfterActivity()
    setReviewCompletion({ checkpoint, mode: completionMode })
    setReviewCompletionDialogOpen(true)
  }

  const exitReview = async () => {
    setReviewing(false)
    setReviewCandidates(null)
    setReviewMode('review')
    setReviewCompletion(null)
    setReviewCompletionDialogOpen(false)
    await refreshAfterReview()
  }

  const plannerFocusSubregionId = plan?.plannerFocusSubregionId
    ?? plan?.curriculumRecommendation?.subregionId
    ?? null
  const validSelectedSubregionId = selectedSubregionId && scopedCountries.some(country => country.subregionId === selectedSubregionId)
    ? selectedSubregionId
    : null
  const activeSubregionId = validSelectedSubregionId ?? plannerFocusSubregionId
  const selectedLearningRecommendation = getCurriculumRecommendationForSubregion(plan, activeSubregionId)
  const activeLearningRecommendation = validSelectedSubregionId
    ? selectedLearningRecommendation
    : plan?.curriculumRecommendation ?? null
  const hubJourneyRecommendation = activeLearningRecommendation ?? plan?.curriculumRecommendation ?? null
  const journey = useMemo<WorldCountriesJourneyPresentation | null>(() => {
    if (evidence.status !== 'ready' || !activeSubregionId) return null
    return deriveWorldCountriesJourneyPresentation({
      subregionId: activeSubregionId,
      entries: scopedCountries,
      learningState: learningStates.find(state => state.subregionId === activeSubregionId),
      recallProgress: recallProgress ?? new Map(),
    })
  }, [activeSubregionId, evidence.status, learningStates, recallProgress, scopedCountries])
  const selectedCompletedSubregionId = continent && validSelectedSubregionId && journey?.regionLearned
    ? validSelectedSubregionId
    : null
  const buildRelearnRecommendation = (track: WorldCountriesTodayLearningRecommendation['track']): WorldCountriesTodayLearningRecommendation | null => {
    if (!selectedCompletedSubregionId) return null
    const countryEntries = geographicOrder.countries.filter(country => country.subregionId === selectedCompletedSubregionId)
    if (countryEntries.length === 0) return null
    return {
      track,
      subregionId: selectedCompletedSubregionId,
      continent: countryEntries[0]!.continent,
      subregionLabel: getSubregionDefinition(selectedCompletedSubregionId).label,
      countryIds: countryEntries.map(country => country.id),
    }
  }
  const launchRelearn = (track: WorldCountriesTodayLearningRecommendation['track']) => {
    const recommendation = buildRelearnRecommendation(track)
    if (!recommendation) return
    launchLearningRecommendation(recommendation, { kind: 'relearn' })
  }
  const onRelearnCountries = selectedCompletedSubregionId ? () => launchRelearn('learn-countries') : undefined
  const onRelearnCapitals = selectedCompletedSubregionId ? () => launchRelearn('learn-capitals') : undefined
  const completedLearningJourney = useMemo<WorldCountriesJourneyPresentation | null>(() => {
    if (!learningRun || evidence.status !== 'ready') return null
    return deriveWorldCountriesJourneyPresentation({
      subregionId: learningRun.recommendation.subregionId,
      entries: scopedCountries,
      learningState: learningStates.find(state => state.subregionId === learningRun.recommendation.subregionId),
      recallProgress: recallProgress ?? new Map(),
    })
  }, [evidence.status, learningRun, learningStates, recallProgress, scopedCountries])
  /**
   * Whether the completed run's Continent is fully learned. Continent celebration semantics derive
   * from learning completeness, never from the run's Subregion position in the Continent order.
   */
  const completedRunContinentFullyLearned = useMemo(() => {
    if (!learningRun) return false
    const continentCountries = activeCountries.filter(country => country.continent === learningRun.recommendation.continent)
    if (continentCountries.length === 0) return false
    return continentCountries.every(country => (
      learningReadinessByCountry.get(country.id) === 'COUNTRIES_AND_CAPITALS_LEARNED'
    ))
  }, [activeCountries, learningReadinessByCountry, learningRun])
  const finishLearning = () => {
    const nextRecommendation = plan?.curriculumRecommendation
    if (
      learningRun
      && selectedSubregionId === learningRun.recommendation.subregionId
      && learningRun.kind === 'curriculum'
      && completedLearningJourney?.regionLearned
      && nextRecommendation
      && nextRecommendation.subregionId !== learningRun.recommendation.subregionId
    ) {
      setSelectedSubregionId(null)
    }
    setLearningRun(null)
    setReviewCompletion(null)
    void refreshAfterActivity()
  }
  const completeLearning = () => {
    const completedRelearnContinent = learningRun?.kind === 'relearn'
      && continent
      && learningRun.recommendation.continent === continent
      && completedRunContinentFullyLearned
      ? learningRun.recommendation.continent
      : null
    finishLearning()
    if (completedRelearnContinent) requestContinentCompletionHandoff(completedRelearnContinent)
  }

  const scopeSummaries = useMemo(() => {
    void geographyRevision
    if (!recallProgress) return []
    const learningStateList = getWorldCountriesLearningStateList(learningStates)
    if (!continent) {
      return getContinentsInEffectiveOrder(scopedCountries, getWorldMetadata()).map(candidate => {
        const entries = scopedCountries.filter(country => country.continent === candidate)
        const isSelected = Boolean(activeSubregionId && entries.some(country => country.subregionId === activeSubregionId))
        return {
          id: candidate,
          label: candidate,
          progress: deriveWorldCountriesScopeProgressForCountries(`continent:${candidate}`, entries, recallProgress),
          distribution: deriveWorldCountriesPrimaryStatusCounts(entries, learningStateList, recallProgress),
          onSelect: onSelectContinent ? () => onSelectContinent(candidate, plan?.curriculumRecommendation?.continent ?? null) : undefined,
          selected: isSelected,
          status: isSelected && activeSubregionId
            ? `Focus · ${getSubregionDefinition(activeSubregionId).label}`
            : undefined,
        }
      })
    }
    return getSubregionsForContinentInEffectiveOrder(continent, scopedCountries, getContinentMetadata(continent)).map(subregion => {
      const entries = scopedCountries.filter(country => country.subregionId === subregion.id)
      const isSelected = subregion.id === activeSubregionId
      return {
        id: subregion.id,
        label: subregion.label,
        progress: deriveWorldCountriesScopeProgressForCountries(`subregion:${subregion.id}`, entries, recallProgress),
        distribution: deriveWorldCountriesPrimaryStatusCounts(entries, learningStateList, recallProgress),
        onSelect: () => setSelectedSubregionId(subregion.id),
        selected: isSelected,
        status: isSelected ? 'Selected focus' : undefined,
      }
    })
  }, [activeSubregionId, continent, geographyRevision, learningStates, onSelectContinent, plan, recallProgress, scopedCountries])
  const scopeLabel = continent ?? 'World'
  const navigateWorld = onWorld ?? (() => undefined)
  const reviewCompletionContinuation = reviewCompletion?.mode === 'review'
    && plan?.reviewOpportunity?.kind === 'review'
    ? plan.reviewOpportunity
    : reviewCompletion?.mode === 'consolidation'
      && plan?.reviewOpportunity?.kind === 'consolidate'
      ? plan.reviewOpportunity
      : null
  const planRef = useRef(plan)
  planRef.current = plan
  const backFromReviewCompletion = () => {
    setReviewCompletionDialogOpen(false)
    setHubFocusRequest(request => request + 1)
  }
  const continueReviewCompletion = () => {
    const continuation = reviewCompletionContinuation
    const currentPlan = planRef.current
    const currentOpportunity = currentPlan?.reviewOpportunity
    const sameCandidates = continuation && currentOpportunity
      && continuation.kind === currentOpportunity.kind
      && continuation.candidates.length === currentOpportunity.candidates.length
      && continuation.candidates.every((candidate, index) => {
        const current = currentOpportunity.candidates[index]
        return current?.target?.countryId === candidate.target?.countryId
          && current?.target?.skill === candidate.target?.skill
      })
    if (!continuation || !sameCandidates) {
      backFromReviewCompletion()
      return
    }
    setReviewCompletionDialogOpen(false)
    launchReviewOpportunity(continuation)
  }
  const plannerNextRecommendation = plan?.curriculumRecommendation ?? null
  const continuationRecommendation = learningRun
    && validSelectedSubregionId
    && learningRun.recommendation.subregionId === validSelectedSubregionId
    ? selectedLearningRecommendation ?? plannerNextRecommendation
    : plannerNextRecommendation
  const completionHandoff = learningRun?.kind === 'curriculum' && evidence.status === 'ready' && continuationRecommendation
    ? createCompletionHandoff({
        currentRecommendation: learningRun.recommendation,
        nextRecommendation: continuationRecommendation,
        regionLearned: Boolean(completedLearningJourney?.regionLearned),
        onContinue: () => launchLearningRecommendation(continuationRecommendation, {
          focusSubregion: Boolean(
            continent
            && validSelectedSubregionId
            && continuationRecommendation.subregionId !== validSelectedSubregionId,
          ),
        }),
        onStop: finishLearning,
        originatingScopeLabel: continent ?? 'World',
      })
    : undefined
  const regionCompletion: LearningRegionCompletion | undefined = completedLearningJourney?.regionLearned
    ? { masteryStatus: completedLearningJourney.masteryStatus }
    : undefined
  const completionCelebration: LearningCompletionCelebration | undefined = useMemo(() => {
    if (!learningRun || !regionCompletion) return undefined
    return completedRunContinentFullyLearned ? 'continent' : 'subregion'
  }, [completedRunContinentFullyLearned, learningRun, regionCompletion])
  const completedRegionAction: LearningCompletedRegionAction | undefined = learningRun?.kind === 'curriculum' && regionCompletion
    ? {
        label: `Drill ${learningRun.recommendation.subregionLabel}`,
        onAction: () => onNavigate({ area: 'drill', scope: { kind: 'subregion', subregionId: learningRun.recommendation.subregionId } }),
      }
    : undefined
  const dismissJourneySwitchPrompt = () => setJourneySwitchPrompt(null)
  const launchPromptedJourney = () => {
    const pending = journeySwitchPrompt
    if (!pending) return
    setJourneySwitchPrompt(null)
    launchLearningRecommendation(pending.recommendation)
  }
  const makePromptedJourneyCurrent = () => {
    const pending = journeySwitchPrompt
    if (!pending) return
    const nextContinentId = continentIdFor(pending.recommendation.continent)
    if (!nextContinentId) return
    setPreferredJourneyContinent(nextContinentId)
    setPreferredJourneyContinentState(nextContinentId)
    setJourneySwitchPrompt(null)
    launchLearningRecommendation(pending.recommendation)
  }
  const dismissContinentCompletion = useCallback(() => {
    setContinentCompletionCelebration(null)
    setContinentCompletionLookup(null)
  }, [])

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
        recallProgress={recallProgress ?? new Map()}
        onPhaseChange={() => undefined}
        onExit={finishLearning}
        onDone={completeLearning}
        doneLabel={`Back to ${continent ?? 'World'}`}
        completionHandoff={learningRun.kind === 'curriculum' ? completionHandoff : undefined}
        regionCompletion={regionCompletion}
        completedRegionAction={learningRun.kind === 'curriculum' ? completedRegionAction : undefined}
        recordCompletion={learningRun.kind === 'curriculum'}
        completionCelebration={completionCelebration}
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
      recallProgress={recallProgress ?? new Map()}
      fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
      onPhaseChange={() => undefined}
      onExit={finishLearning}
      onDone={completeLearning}
      doneLabel={`Back to ${continent ?? 'World'}`}
      completionHandoff={learningRun.kind === 'curriculum' ? completionHandoff : undefined}
      regionCompletion={regionCompletion}
      completedRegionAction={learningRun.kind === 'curriculum' ? completedRegionAction : undefined}
      recordCompletion={learningRun.kind === 'curriculum'}
      completionCelebration={completionCelebration}
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

  const reviewAvailableCount = plan?.reviewOpportunity?.kind === 'review'
    ? plan.dueCount
    : plan?.reviewOpportunity?.kind === 'consolidate'
      ? plan.consolidationCandidates.length
      : 0
  const reviewSessionCount = plan?.reviewOpportunity?.candidates.length ?? 0
  const activeSubregionLabel = activeSubregionId ? getSubregionDefinition(activeSubregionId).label : null
  const journeyActionLabel = hubJourneyRecommendation
    ? getJourneyActionLabel(hubJourneyRecommendation)
    : null
  const todayHubActions = (() => {
    if (evidence.status !== 'ready' || scopedCountries.length === 0 || !plan) return null

    const playground: TodayHubAction = {
      id: 'playground',
      title: 'Playground',
      detail: 'Choose Drill, Quiz, Recite or Practice',
      tone: 'playground',
      onAction: () => onNavigate({ area: 'play' }),
    }
    const journeyAction: TodayHubAction | null = hubJourneyRecommendation && journeyActionLabel
      ? {
          id: 'journey',
          title: 'Continue your journey',
          detail: `${journeyActionLabel} · ${hubJourneyRecommendation.subregionLabel}`,
          tone: 'journey',
          onAction: startJourney,
        }
      : null
    const reviewAction: TodayHubAction | null = plan.reviewOpportunity?.kind === 'review'
      ? {
          id: 'review',
          title: `Review ${reviewSessionCount} now`,
          detail: plan.dueCount === reviewSessionCount
            ? `${reviewSessionCount} ${reviewSessionCount === 1 ? 'item is' : 'items are'} due for recall`
            : `${plan.dueCount} items due · next review ${reviewSessionCount}`,
          tone: 'review',
          onAction: startReview,
        }
      : null
    const strengthenAction: TodayHubAction | null = plan.reviewOpportunity?.kind === 'consolidate'
      ? {
          id: 'strengthen',
          title: `Strengthen ${reviewSessionCount}`,
          detail: plan.consolidationCandidates.length === reviewSessionCount
            ? `${reviewSessionCount} weak ${reviewSessionCount === 1 ? 'spot' : 'spots'} ready now`
            : `${plan.consolidationCandidates.length} weak spots available · next practice ${reviewSessionCount}`,
          tone: 'strengthen',
          onAction: startReview,
        }
      : null

    if (reviewAction) return { recommended: reviewAction, otherActions: [journeyAction, playground].filter((action): action is TodayHubAction => Boolean(action)) }
    if (journeyAction) return { recommended: journeyAction, otherActions: [strengthenAction, playground].filter((action): action is TodayHubAction => Boolean(action)) }
    if (strengthenAction) return { recommended: strengthenAction, otherActions: [playground] }
    return {
      recommended: {
        ...playground,
        detail: 'Learning complete · You\'re caught up for now',
      },
      otherActions: [],
    }
  })()
  const mapDescriptions = new Map([...primaryStatusByCountry].map(([countryId, status]) => [
    countryId,
    status.kind === 'learning'
      ? `Learning: ${getWorldCountriesLearningReadinessLabel(status.readiness)}.`
      : `Recall health: ${WORLD_COUNTRIES_PROGRESS_LABELS[status.state]}.`,
  ] as const))

  return (
    <>
      {journeySwitchPrompt && (
        <JourneyContinentSwitchDialog
          currentContinent={journeySwitchPrompt.currentContinent}
          nextContinent={journeySwitchPrompt.recommendation.continent}
          subregionLabel={journeySwitchPrompt.recommendation.subregionLabel}
          onDismiss={dismissJourneySwitchPrompt}
          onLearnOnly={launchPromptedJourney}
          onMakeCurrent={makePromptedJourneyCurrent}
        />
      )}
      {continentCompletionCelebration && (
        <ContinentCompletionDialog
          continent={continentCompletionCelebration.continent}
          nextContinent={continentCompletionCelebration.nextContinent}
          onContinue={continentCompletionCelebration.nextContinent ? () => {
            const nextContinent = continentCompletionCelebration.nextContinent
            dismissContinentCompletion()
            if (nextContinent) onSelectContinent?.(nextContinent, nextContinent)
          } : undefined}
          onWorld={() => {
            dismissContinentCompletion()
            navigateWorld()
          }}
          onDismiss={dismissContinentCompletion}
          onStrengthen={plan?.reviewOpportunity ? () => {
            dismissContinentCompletion()
            startReview()
          } : undefined}
        />
      )}
      {reviewCompletion && reviewCompletionDialogOpen && (evidence.status === 'ready' || evidence.status === 'error') && !refreshing && (
        <ReviewCompletionDialog
          completion={reviewCompletion}
          scopeLabel={scopeLabel}
          continueCount={reviewCompletionContinuation?.candidates.length}
          onContinue={reviewCompletionContinuation ? continueReviewCompletion : undefined}
          onBack={backFromReviewCompletion}
        />
      )}
      <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-today-heading">
        <GuidedHomeRails
          level={continent ? 'continent' : 'world'}
          continent={continent ?? undefined}
          activeCountryCount={scopedCountries.length}
          evidenceStatus={evidence.status}
          reviewOpportunity={plan?.reviewOpportunity ?? null}
          reviewAvailableCount={reviewAvailableCount}
          reviewCompletion={reviewCompletion}
          refreshing={refreshing}
          scopeSummaries={scopeSummaries}
          scopeProgress={progress}
          journey={journey}
          activeLearningAvailable={Boolean(activeLearningRecommendation)}
          onRelearnCountries={onRelearnCountries}
          onRelearnCapitals={onRelearnCapitals}
          onWorld={navigateWorld}
          onOpenProgress={() => {
            if (evidence.status !== 'ready' || !progress) return
            setShowProgress(true)
            onOpenProgress?.()
          }}
        />

        <div className="space-y-4">
          <MapSurface
            context={(
              <div className="px-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h1 id="world-countries-today-heading" className="text-2xl font-black text-zinc-100">{continent ?? 'Your world'}</h1>
                  {activeSubregionLabel && <p data-active-subregion className="text-sm font-semibold text-cyan-200">Focus: {activeSubregionLabel}</p>}
                </div>
                <div className="mt-1">
                  <WorldCountriesMapLegend learningComplete={worldLearningComplete} />
                </div>
              </div>
            )}
            map={(
              <GeographyOverviewMap
                level={continent ? 'continent' : 'world'}
                continent={continent ?? undefined}
                countryPopulation={scopedCountries}
                countryColorsById={countryColorsById}
                countryPatternsById={countryPatternsById}
                selectedSubregionIds={activeSubregionId ? [activeSubregionId] : undefined}
                selectionPresentation="outline-only"
                countryAccessibleDescriptionsById={mapDescriptions}
                interactive
                onCountryClick={country => continent
                  ? setSelectedSubregionId(country.subregionId)
                  : onSelectContinent?.(country.continent, hubJourneyRecommendation?.continent ?? null)}
                ariaLabel={continent ? `${continent} learning map` : 'World Countries learning map'}
              />
            )}
            feedbackOverlay={worldLearningComplete ? <WorldMasteryCelebration /> : undefined}
            dock={todayHubActions ? <TodayActionHub {...todayHubActions} disabled={refreshing} focusRequest={hubFocusRequest} /> : undefined}
            dockPlacement="attached"
            className="animate-fade-in"
          />
        </div>
      </section>
    </>
  )
}
