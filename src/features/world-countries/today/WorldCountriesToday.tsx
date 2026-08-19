import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
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
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { WorldMasterySummary } from '@/features/world-countries/ui/WorldMasterySummary'
import { TodayReviewSession, type WorldCountriesTodayReviewCheckpoint } from './TodayReviewSession'
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

function trackLabel(track: WorldCountriesTodayLearningRecommendation['track']): string {
  return track === 'learn-countries' ? 'Countries' : 'Capitals'
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
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries</p>
          <h1 id="world-countries-today-heading" className="mt-1 text-2xl font-bold text-zinc-100">Today</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">A map-centered plan for due core review and the next guided Learning flow.</p>
        </div>
        <WorldMasterySummary progress={progress} />
        <GeographyOverviewMap
          level="world"
          countryPopulation={activeCountries}
          countryColorsById={countryColorsById}
          countryAccessibleDescriptionsById={mapDescriptions}
          interactive={false}
          ariaLabel="World Countries mastery map"
        />
      </div>

      <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-today-status-heading">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Today</p>
          <h2 id="world-countries-today-status-heading" className="mt-1 text-lg font-bold text-zinc-100">
            {activeCountries.length === 0 ? '0 Countries active' : evidence.status === 'error' ? 'Review status unavailable' : evidence.status === 'loading' ? 'Today status loading' : hasDue ? `${plan?.dueCount ?? 0} core reviews due · ${plan?.dueCountryCount ?? 0} ${plan?.dueCountryCount === 1 ? 'Country' : 'Countries'}` : caughtUp ? 'All caught up' : 'All reviews caught up'}
          </h2>
          <p role="status" aria-live="polite" className="mt-2 text-sm text-zinc-400">
            {activeCountries.length === 0
              ? 'No active Countries are available for Today.'
              : evidence.status === 'loading'
                ? 'Review status is loading…'
                : evidence.status === 'error'
                  ? 'Today could not load retained review evidence. Drill and Recite remain available.'
                  : hasDue
                    ? nextLearning ? `Next after review: Learn ${trackLabel(nextLearning.track)} · ${nextLearning.subregionLabel}` : 'Complete the due review before introducing more core material.'
                    : nextLearning
                      ? `Next: Learn ${trackLabel(nextLearning.track)} · ${nextLearning.subregionLabel}`
                      : 'No core review is due and no new guided Learning remains.'}
          </p>
        </div>

        {checkpoint && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-300" aria-live="polite">
            <p className="font-semibold text-zinc-100">{checkpoint.reviewed} reviewed</p>
            <p className="mt-1 text-xs text-zinc-400">{checkpoint.correctFirstTry} correct first try · {checkpoint.recoveredOnRetry} recovered on retry · {checkpoint.stillNeedsWork} still needs work</p>
            {!refreshing && plan && plan.dueCount > 0 && <p className="mt-2 text-xs font-semibold text-cyan-300">{plan.dueCount} core reviews still due</p>}
            {refreshing && <p className="mt-2 text-xs text-zinc-500">Refreshing Today…</p>}
          </div>
        )}

        {canContinue && (
          <button type="button" data-primary-action disabled={!canContinue || refreshing} onClick={startPrimary} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">
            {hasDue ? checkpoint ? 'Continue review' : 'Continue review' : nextLearning ? 'Continue learning' : 'Continue learning'}
          </button>
        )}

        {evidence.status === 'error' && activeCountries.length > 0 && (
          <button type="button" disabled className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white opacity-40">Continue review</button>
        )}

        {(caughtUp || evidence.status === 'error' || activeCountries.length === 0) && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate('drill')} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Drill</button>
            <button type="button" onClick={() => onNavigate('recite')} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Recite</button>
          </div>
        )}
      </WorldCountriesPanel>
    </section>
  )
}
