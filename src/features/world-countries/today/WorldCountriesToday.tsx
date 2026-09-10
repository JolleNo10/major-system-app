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
import { isWorldCountriesCountryLayerEstablished } from '@/features/world-countries/learning/learningReadiness'
import { flattenWorldCountriesRecallHistory, loadWorldCountriesRecallHistory, type WorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import { WORLD_COUNTRIES_CORE_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import { deriveWorldCountriesScopeProgressForCountries } from '@/features/world-countries/learning/scopeProgress'
import { getCountryProgressColor, getCountryProgressState } from '@/features/world-countries/learning/progressPresentation'
import { CountryLearningFlow } from '@/features/world-countries/learning/flows/CountryLearningFlow'
import { CapitalLearningFlow } from '@/features/world-countries/learning/flows/CapitalLearningFlow'
import type { LearningCompletionHandoff } from '@/features/world-countries/learning/flows/LearningComplete'
import type { LearningSetMaximum } from '@/features/world-countries/learning/stagedLearningPlan'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldMasterySummary } from '@/features/world-countries/ui/WorldMasterySummary'
import { TodayReviewSession, type WorldCountriesTodayReviewCheckpoint } from './TodayReviewSession'
import type { WorldCountriesGuidedRecallMode } from './TodayRails'
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

function isSameLearningRecommendation(
  current: WorldCountriesTodayLearningRecommendation,
  next: WorldCountriesTodayLearningRecommendation,
): boolean {
  return current.track === next.track
    && current.subregionId === next.subregionId
    && current.countryIds.length === next.countryIds.length
    && current.countryIds.every((countryId, index) => countryId === next.countryIds[index])
}

function createCompletionHandoff(
  action: WorldCountriesTodayPlan['action'],
  currentRecommendation: WorldCountriesTodayLearningRecommendation,
  returnLabel: string,
  onContinue: () => void,
): LearningCompletionHandoff | undefined {
  if (action.kind === 'learn' && isSameLearningRecommendation(currentRecommendation, action.recommendation)) return undefined

  switch (action.kind) {
    case 'review':
      return { description: 'Core review is due next for this guided scope.', label: 'Continue review', onContinue }
    case 'consolidate':
      return { description: 'Strengthen the unfinished recall in this guided scope next.', label: 'Practice unfinished area', onContinue }
    case 'learn': {
      const isCountryToCapital = currentRecommendation.track === 'learn-countries'
        && action.recommendation.track === 'learn-capitals'
        && action.recommendation.subregionId === currentRecommendation.subregionId
      return isCountryToCapital
        ? { description: 'Next: add the capitals to these countries.', label: 'Add the capitals', onContinue }
        : {
            description: `Next: learn ${action.recommendation.track === 'learn-countries' ? 'the countries' : 'the capitals'} in ${action.recommendation.subregionLabel}.`,
            label: action.recommendation.track === 'learn-countries' ? 'Learn the countries' : 'Add the capitals',
            onContinue,
          }
    }
    case 'complete':
      return { description: 'Core Country and Capital recall is complete for this guided scope.', label: returnLabel, onContinue }
    case 'unavailable':
      return { description: 'No further guided activity is available for this scope right now.', label: returnLabel, onContinue }
  }
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
  const [reviewMode, setReviewMode] = useState<WorldCountriesGuidedRecallMode>('review')
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
  useEffect(() => { setFocusedSubregionId(null) }, [continent])

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

  const finishLearning = () => {
    setLearningRun(null)
    setCheckpoint(null)
    void refreshAfterActivity()
  }

  const launchAction = (action: WorldCountriesTodayPlan['action']) => {
    switch (action.kind) {
      case 'review':
        setLearningRun(null)
        setReviewCandidates(action.candidates)
        setReviewMode('review')
        setReviewing(true)
        setCheckpoint(null)
        return
      case 'consolidate':
        setLearningRun(null)
        setReviewCandidates(action.candidates)
        setReviewMode('consolidation')
        setReviewing(true)
        setCheckpoint(null)
        return
      case 'learn': {
        const countriesById = new Map(geographicOrder.countries.map(country => [country.id, country]))
        const countryEntries = action.recommendation.countryIds
          .map(countryId => countriesById.get(countryId))
          .filter((country): country is Country => Boolean(country))
        if (countryEntries.length !== action.recommendation.countryIds.length) return
        setReviewing(false)
        setReviewCandidates(null)
        setCheckpoint(null)
        setLearningRun({ recommendation: action.recommendation, countryEntries })
        return
      }
      case 'complete':
      case 'unavailable':
        finishLearning()
        return
    }
  }

  const startPrimary = () => {
    if (!plan || evidence.status !== 'ready' || scopedCountries.length === 0) return
    launchAction(plan.action)
  }

  const finishReview = async (nextCheckpoint: WorldCountriesTodayReviewCheckpoint) => {
    setCheckpoint(nextCheckpoint)
    setReviewing(false)
    setReviewCandidates(null)
    setReviewMode('review')
    setRefreshing(true)
    await loadEvidence()
    setRefreshing(false)
  }

  const exitReview = () => {
    setReviewing(false)
    setReviewCandidates(null)
    setReviewMode('review')
    void refreshAfterActivity()
  }

  const nextLearning = plan?.nextLearning ?? null
  const guidedSubregionId = nextLearning?.subregionId
    ?? (plan?.action.kind === 'review' || plan?.action.kind === 'consolidate'
      ? plan.action.candidates[0]?.country?.subregionId ?? null
      : null)
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
        status: subregion.id === focusedSubregionId
          ? subregion.id === guidedSubregionId ? 'Your next step' : "You're viewing this region"
          : subregion.id === guidedSubregionId ? 'Next in your journey' : undefined,
      }
    })
  }, [continent, focusedSubregionId, geographyRevision, guidedSubregionId, onSelectContinent, recallProgress, scopedCountries])
  const highlightedCountryIds = focusedSubregionId
    ? scopedCountries.filter(country => country.subregionId === focusedSubregionId).map(country => country.id)
    : []
  const scopeLabel = continent ?? 'World'
  const navigateWorld = onWorld ?? (() => undefined)
  const completionHandoff = learningRun && evidence.status === 'ready' && plan
    ? createCompletionHandoff(plan.action, learningRun.recommendation, `Back to ${continent ?? 'World'}`, () => launchAction(plan.action))
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

  const canContinue = Boolean(plan && evidence.status === 'ready' && scopedCountries.length > 0 && (plan.action.kind === 'review' || plan.action.kind === 'learn' || plan.action.kind === 'consolidate'))
  const hasDue = Boolean(plan && plan.dueCount > 0)
  const caughtUp = evidence.status === 'ready' && scopedCountries.length > 0 && Boolean(plan?.caughtUpForToday)
  const mapDescriptions = new Map(scopedCountries.map(country => [country.id, `Progress for ${scopeLabel} is shown in the progress summary.`] as const))

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
        scopeComplete={plan?.scopeComplete ?? false}
        scopeProgress={progress}
        incompleteSubregionLabels={plan?.incompleteSubregionLabels ?? []}
        consolidationAvailable={plan?.action.kind === 'consolidate'}
        scopeSummaries={scopeSummaries}
        journey={journey}
        guidedSubregionId={guidedSubregionId}
        onFocusGuidedSubregion={() => setFocusedSubregionId(null)}
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
              <p className="mt-1 text-sm text-zinc-500">Explore the map to see your progress and choose where to learn.</p>
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
            <TaskDock variant="navigation" focusPrimary={Boolean(checkpoint) && !refreshing}>
              <button type="button" data-primary-action disabled={refreshing} onClick={startPrimary} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">
                {hasDue ? 'Continue review' : nextLearning ? 'Continue learning' : 'Practice unfinished area'}
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
