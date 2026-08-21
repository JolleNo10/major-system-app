import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Country } from '@/features/world-countries/data/countries'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { getWorldCountriesInEffectiveOrder } from '@/features/world-countries/geography/effectiveOrder'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import { deriveWorldCountriesCountryProgress, deriveWorldCountriesRecallProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'
import { flattenWorldCountriesRecallHistory, loadWorldCountriesRecallHistory, type WorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import { WORLD_COUNTRIES_CORE_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import { deriveWorldCountriesWorldProgress } from '@/features/world-countries/learning/scopeProgress'
import { getCountryProgressColor, getCountryProgressState } from '@/features/world-countries/learning/progressPresentation'
import { CountryLearningFlow } from '@/features/world-countries/learning/flows/CountryLearningFlow'
import { CapitalLearningFlow } from '@/features/world-countries/learning/flows/CapitalLearningFlow'
import type { LearningSetMaximum } from '@/features/world-countries/learning/stagedLearningPlan'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldMasterySummary } from '@/features/world-countries/ui/WorldMasterySummary'
import { TodayReviewSession, type WorldCountriesTodayReviewCheckpoint } from './TodayReviewSession'
import { TodayHomeRails } from './TodayRails'
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

/** Map-centered Today orchestration for derived World Countries review. */
export function WorldCountriesToday({
  answerMode: _answerMode,
  onNavigate,
}: {
  answerMode: AnswerMode
  onNavigate: (area: TodayArea) => void
}) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const [evidence, setEvidence] = useState<EvidenceState>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  const [reviewCandidates, setReviewCandidates] = useState<WorldCountriesTodayPlan['reviewQueue'] | null>(null)
  const [checkpoint, setCheckpoint] = useState<WorldCountriesTodayReviewCheckpoint | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [learningRun, setLearningRun] = useState<LearningRun | null>(null)

  const loadEvidence = useCallback(async () => {
    if (activeCountries.length === 0) {
      setEvidence({ status: 'ready', history: new Map() })
      return
    }
    setEvidence({ status: 'loading' })
    try {
      const history = await loadWorldCountriesRecallHistory({
        countryIds: activeCountries.map(country => country.id),
        skills: WORLD_COUNTRIES_CORE_RECALL_SKILLS,
      })
      setEvidence({ status: 'ready', history })
    } catch {
      setEvidence({ status: 'error' })
    }
  }, [activeCountries])

  useEffect(() => { void loadEvidence() }, [loadEvidence])

  const learningStates = useMemo(
    () => getAllSubregionLearningStates(activeCountries),
    [activeCountries, revision],
  )
  const geographicOrder = useMemo(() => getWorldCountriesInEffectiveOrder(activeCountries), [activeCountries, revision])
  const plan = useMemo<WorldCountriesTodayPlan | null>(() => {
    if (evidence.status !== 'ready') return null
    return buildWorldCountriesTodayPlan({
      activeCountries,
      history: evidence.history,
      learningStates,
      effectiveCountries: geographicOrder.countries,
      effectiveSubregionIds: geographicOrder.subregionIds,
    })
  }, [activeCountries, evidence, geographicOrder, learningStates])
  const recallProgress = useMemo<RecallProgress | null>(() => {
    if (evidence.status !== 'ready') return null
    return deriveWorldCountriesRecallProgress({
      countryIds: activeCountries.map(country => country.id),
      skills: WORLD_COUNTRIES_CORE_RECALL_SKILLS,
    }, flattenWorldCountriesRecallHistory(evidence.history))
  }, [activeCountries, evidence])
  const progress = useMemo(
    () => recallProgress ? deriveWorldCountriesWorldProgress(recallProgress, activeCountries) : null,
    [activeCountries, recallProgress],
  )
  const countryColorsById = useMemo(() => {
    const currentProgress = recallProgress ?? new Map()
    return new Map(activeCountries.map(country => {
      const state = getCountryProgressState(deriveWorldCountriesCountryProgress(country.id, currentProgress))
      return [country.id, getCountryProgressColor(state)] as const
    }))
  }, [activeCountries, recallProgress])

  const refreshAfterActivity = async () => {
    setRevision(value => value + 1)
    setRefreshing(true)
    await loadEvidence()
    setRefreshing(false)
  }

  const startPrimary = () => {
    if (!plan || evidence.status !== 'ready' || activeCountries.length === 0) return
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
        onGeographyChanged={() => setRevision(value => value + 1)}
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
      onGeographyChanged={() => setRevision(value => value + 1)}
      recordCompletion={true}
    />
  }

  if (reviewing && reviewCandidates) {
    return <TodayReviewSession
      candidates={reviewCandidates}
      activeCountries={activeCountries}
      fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
      onDone={finishReview}
      onExit={exitReview}
    />
  }

  const canContinue = Boolean(plan && evidence.status === 'ready' && activeCountries.length > 0 && (plan.dueCount > 0 || plan.nextLearning))
  const hasDue = Boolean(plan && plan.dueCount > 0)
  const nextLearning = plan?.nextLearning ?? null
  const caughtUp = evidence.status === 'ready' && activeCountries.length > 0 && !hasDue && !nextLearning
  const mapDescriptions = new Map(activeCountries.map(country => [country.id, 'World Countries core mastery is shown in the World mastery summary.'] as const))

  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-today-heading">
      <TodayHomeRails
        activeCountryCount={activeCountries.length}
        evidenceStatus={evidence.status}
        dueCount={plan?.dueCount ?? 0}
        dueCountryCount={plan?.dueCountryCount ?? 0}
        nextLearning={nextLearning ? { track: nextLearning.track, subregionLabel: nextLearning.subregionLabel } : null}
        checkpoint={checkpoint}
        refreshing={refreshing}
        caughtUp={caughtUp}
        onNavigate={onNavigate}
      />

      <div className="space-y-4">
        <WorldMasterySummary progress={progress} />
        <MapSurface
          context={(
            <div className="px-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries · Today</p>
              <h1 id="world-countries-today-heading" className="mt-1 text-2xl font-black text-zinc-100">Today</h1>
            </div>
          )}
          map={(
            <GeographyOverviewMap
              level="world"
              countryPopulation={activeCountries}
              countryColorsById={countryColorsById}
              countryAccessibleDescriptionsById={mapDescriptions}
              interactive={false}
              ariaLabel="World Countries mastery map"
            />
          )}
          dock={canContinue ? (
            <TaskDock variant="navigation">
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
