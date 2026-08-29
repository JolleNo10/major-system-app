import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import {
  getNextLearningStageLabel,
  rebuildLearningPlanAfterCountryOrderSave,
  type LearningSetMaximum,
} from '@/features/world-countries/learning/stagedLearningPlan'
import { deriveLearningPracticeProgress } from '@/features/world-countries/learning/learningPracticeProgress'
import {
  backStagedCountry,
  createStagedCountryLearningFlow,
  currentStagedCountryIds,
  currentStagedCountrySetNumber,
  keepStagedCountryPractising,
  moveStagedCountryWalkthrough,
  skipStagedCountry,
  startStagedCountryFinalRecall,
  startStagedCountryLocation,
  startStagedCountryPractice,
  submitStagedCountryFinalAnswer,
  submitStagedCountryLocation,
  submitStagedCountryPractice,
  submitStagedCountryCombined,
  advanceStagedCountryPlan,
  type StagedCountryLearningFlowState,
  type StagedCountryLearningPhase,
} from '@/features/world-countries/learning/stagedCountryLearningFlow'
import { markSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningStore'
import { classifyCountryName } from '@/features/world-countries/learning/answerMatching'
import { CountryLearningComplete } from './CountryLearningComplete'
import { GuidedLearningRails } from './GuidedLearningRails'
import { LearningMapSurface } from './LearningMapSurface'
import { SchedulerLocationPracticeStep } from './SchedulerLocationPracticeStep'
import { SchedulerPracticeStep } from './SchedulerPracticeStep'
import { StagedWalkthroughStep } from './StagedWalkthroughStep'
import { StagedFinalRecallStep } from './StagedFinalRecallStep'
import { FinalRecallGate, StagedLearningReadyStep } from './StagedLearningReadyStep'
import { LearningHeader } from './MemoryPreviewStep'
import type { SchedulerAnswerEvaluation } from './SchedulerPracticeStep'
import type { WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import { useLearningCountryOrderAuthoring } from './useLearningCountryOrderAuthoring'
import { deriveLearningMapPresentation } from './learningMapPresentation'
import { LearningMapMetadata } from './LearningMapMetadata'

function evaluateCountryAnswer(answer: string, country: Country, fuzzyMatching: boolean, candidates: readonly string[]): SchedulerAnswerEvaluation {
  const match = classifyCountryName(answer, country, { fuzzy: fuzzyMatching, candidates })
  return { correct: match !== 'none', fuzzyMatch: match === 'fuzzy', canonicalAnswer: country.country }
}

function formatCountryFeedback(evaluation: SchedulerAnswerEvaluation): string {
  return evaluation.correct
    ? evaluation.fuzzyMatch ? `Correct. The canonical answer is ${evaluation.canonicalAnswer}.` : 'Correct.'
    : `The correct answer is ${evaluation.canonicalAnswer}.`
}

export function CountryLearningFlow({
  continent,
  subregion,
  scopeLabel,
  entries,
  activeCountries,
  newItemsPerSet,
  schedulerSettings,
  fuzzyMatching,
  onPhaseChange,
  onExit,
  onDone,
  doneLabel = 'Back to Learn & Practise',
  recordCompletion = true,
  allowIncorrectSpellingPractice = false,
}: {
  continent: Continent
  subregion?: SubregionId
  scopeLabel?: string
  entries: readonly Country[]
  activeCountries?: readonly Country[]
  newItemsPerSet: LearningSetMaximum
  schedulerSettings: { masteryLatencyFactor: number; sessionUnmasteredShare: number }
  fuzzyMatching: boolean
  onPhaseChange: (phase: StagedCountryLearningPhase) => void
  onExit: () => void
  onDone?: () => void
  doneLabel?: string
  recordCompletion?: boolean
  allowIncorrectSpellingPractice?: boolean
}) {
  const learningScopeLabel = scopeLabel ?? (subregion ? getSubregionDefinition(subregion).label : 'Learning scope')
  const ids = useMemo(() => entries.map(country => country.id), [entries])
  const [flow, setFlow] = useState<StagedCountryLearningFlowState>(() => createStagedCountryLearningFlow({ countryIds: ids, maximum: newItemsPerSet, schedulerSettings }))
  const completionReported = useRef(false)
  const [orderDraft, setOrderDraft] = useState<readonly Country[] | null>(null)
  const [editingOrder, setEditingOrder] = useState(false)
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null)
  const { allPresentationEntries, mapPresentation: orderMapPresentation, onClickOrderStateChange, onClickOrderToggle } = useLearningCountryOrderAuthoring({ entries, orderDraft, editingOrder })
  const stageIds = currentStagedCountryIds(flow)
  const stageEntries = useMemo(() => stageIds.map(id => entries.find(entry => entry.id === id)).filter((entry): entry is Country => Boolean(entry)), [entries, stageIds])

  const transition = (next: StagedCountryLearningFlowState) => {
    if (next.phase !== flow.phase) onPhaseChange(next.phase)
    setFlow(next)
  }
  const run = (action: (state: StagedCountryLearningFlowState) => StagedCountryLearningFlowState) => transition(action(flow))
  const updateLocation = (correct: boolean, latencyMs: number) => transition(submitStagedCountryLocation(flow, correct, latencyMs).state)
  const updatePractice = (correct: boolean, latencyMs: number) => {
    const result = flow.phase === 'combined-practice'
      ? submitStagedCountryCombined(flow, correct, latencyMs)
      : submitStagedCountryPractice(flow, correct, latencyMs)
    transition(result.state)
  }
  const updateFinal = (correct: boolean) => {
    const result = submitStagedCountryFinalAnswer(flow, correct)
    transition(result.state)
    if (result.result.completedNow && !completionReported.current) {
      completionReported.current = true
      if (recordCompletion && subregion) markSubregionCountriesLearned(subregion, Date.now(), activeCountries)
    }
  }
  const onOrderSaved = (draft: readonly Country[]) => {
    setOrderDraft(draft)
    const nextIds = draft.map(country => country.id)
    setFlow(previous => ({
      ...previous,
      ...rebuildLearningPlanAfterCountryOrderSave(nextIds, previous.maximum, previous.stageIndex),
    }))
  }
  const skip = () => run(state => skipStagedCountry(state))
  const backAvailable = flow.phase === 'location-practice'
    || flow.phase === 'location-ready'
    || flow.phase === 'practice'
    || flow.phase === 'set-ready'
    || flow.phase === 'final-recall'
    || flow.phase === 'final-gate'
    || ((flow.phase === 'combined-practice' || flow.phase === 'combined-ready') && flow.stageIndex > 0)
  const backLabel = flow.phase === 'location-practice' ? 'Back to Review'
    : flow.phase === 'final-recall' ? 'Back to Final recall'
      : 'Back'

  const walkthroughCountry = stageEntries[flow.walkthroughIndex]
  const { mapEntries, presentation: mapPresentation, presentationKey } = deriveLearningMapPresentation({
    phase: flow.phase,
    fullEntries: entries,
    stageEntries,
    fallbackEntries: allPresentationEntries,
    walkthroughIndex: flow.walkthroughIndex,
    ordered: flow.ordered,
    practice: flow.practice,
    hoveredCountryId,
    orderPresentation: orderMapPresentation,
  })
  const mapMeta = <LearningMapMetadata scopeLabel={learningScopeLabel} entries={mapEntries} />

  const context = (() => {
    switch (flow.phase) {
      case 'walkthrough': return <LearningHeader label={`Set ${currentStagedCountrySetNumber(flow)} · Review`} title={walkthroughCountry?.country ?? 'Review'} meta={`${flow.walkthroughIndex + 1} / ${stageEntries.length}`} onExit={onExit} />
      case 'location-practice': return <LearningHeader label={`Set ${currentStagedCountrySetNumber(flow)} · Step 2 - Locate`} title={`Find ${flow.location ? stageEntries.find(entry => entry.id === flow.location?.currentKey)?.country ?? 'the Country' : 'the Country'}`} onExit={onExit} />
      case 'location-ready': return <LearningHeader label="Ready" title="Location Ready" onExit={onExit} />
      case 'practice': return <LearningHeader label={`Set ${currentStagedCountrySetNumber(flow)} · Step 3 - Practice`} title="Name the country" onExit={onExit} />
      case 'set-ready': return <LearningHeader label="Ready" title={`Set ${currentStagedCountrySetNumber(flow)} Ready`} onExit={onExit} />
      case 'combined-practice': return <LearningHeader label="Combined practice" title="Name the country" onExit={onExit} />
      case 'combined-ready': return <LearningHeader label="Ready" title="Combined practice ready" onExit={onExit} />
      case 'final-gate': return <LearningHeader label="Final recall" title={flow.finalScopeReady ? 'Ready for Final recall' : 'Final recall'} onExit={onExit} />
      case 'final-recall': return <LearningHeader label="Final recall" title={`${(flow.ordered?.currentIndex ?? 0) + 1} / ${flow.ordered?.order.length ?? entries.length}`} onExit={onExit} />
      case 'complete': return <LearningHeader label="Learning complete" title={learningScopeLabel} onExit={onExit} />
    }
  })()

  const activeSchedulerSession = flow.phase === 'location-practice' ? flow.location
    : flow.phase === 'practice' || flow.phase === 'combined-practice' ? flow.practice
      : null
  const practiceProgress = activeSchedulerSession ? deriveLearningPracticeProgress(activeSchedulerSession, schedulerSettings) : null
  const activeTask: WorldCountriesActivityTask | undefined = (() => {
    switch (flow.phase) {
      case 'walkthrough':
        return { direction: 'Country ↔ Capital', cue: walkthroughCountry ? `${walkthroughCountry.country} ↔ ${walkthroughCountry.capital}` : 'Review', sessionContext: `Set ${currentStagedCountrySetNumber(flow)} · Review`, progress: { label: 'Country', current: flow.walkthroughIndex + 1, total: stageEntries.length } }
      case 'location-practice': {
        const current = flow.location ? stageEntries.find(entry => entry.id === flow.location?.currentKey) : undefined
        return { direction: 'Location → Country', cue: current ? `Find ${current.country}` : 'Find the Country', sessionContext: `Set ${currentStagedCountrySetNumber(flow)} · Locate`, answerKind: 'country', progress: practiceProgress ? { label: 'Practice', current: practiceProgress.atTarget, total: practiceProgress.total, percent: practiceProgress.pct * 100 } : undefined }
      }
      case 'practice':
      case 'combined-practice':
        return { direction: 'Location → Country', cue: 'Name the country', sessionContext: flow.phase === 'combined-practice' ? 'Combined practice' : `Set ${currentStagedCountrySetNumber(flow)} · Practice`, answerKind: 'country', progress: practiceProgress ? { label: 'Practice', current: practiceProgress.atTarget, total: practiceProgress.total, percent: practiceProgress.pct * 100 } : undefined }
      case 'final-recall':
        return { direction: 'Location → Country', cue: 'Name the country', sessionContext: flow.ordered?.mode === 'repair' ? 'Repair traversal' : 'Final recall', answerKind: 'country', progress: { label: 'Country', current: (flow.ordered?.currentIndex ?? 0) + 1, total: flow.ordered?.order.length ?? entries.length } }
      default:
        return undefined
    }
  })()

  const rails = <GuidedLearningRails
    continent={continent}
    subregion={subregion}
    scopeLabel={learningScopeLabel}
    entries={allPresentationEntries}
    activeCountries={activeCountries ?? entries}
    phase={flow.phase}
    track="countries"
    learned={false}
    capitalsLearned={false}
    onCountryHover={setHoveredCountryId}
    onOrderDraftChanged={setOrderDraft}
    onOrderEditingChange={setEditingOrder}
    onOrderSaved={onOrderSaved}
    onClickOrderStateChange={onClickOrderStateChange}
    onClickOrderToggle={onClickOrderToggle}
    onBack={backAvailable ? () => run(backStagedCountry) : undefined}
    backLabel={backLabel}
    onExit={onExit}
    onSkip={['walkthrough', 'location-practice', 'location-ready', 'practice', 'set-ready', 'combined-practice', 'combined-ready'].includes(flow.phase) ? skip : undefined}
    skipLabel={flow.phase === 'walkthrough' ? 'Skip to Locate' : flow.phase === 'location-practice' || flow.phase === 'location-ready' ? 'Next: Practice' : 'Next'}
    practiceProgress={practiceProgress}
  />

  let content: ReactNode
  switch (flow.phase) {
    case 'walkthrough':
      content = <StagedWalkthroughStep entries={stageEntries} index={flow.walkthroughIndex} onMove={offset => run(state => moveStagedCountryWalkthrough(state, offset))} onContinue={() => run(startStagedCountryLocation)} continueLabel="Continue to Locate" />
      break
    case 'location-practice':
      content = flow.location ? <SchedulerLocationPracticeStep continent={continent} entries={stageEntries} session={flow.location} label={`Set ${currentStagedCountrySetNumber(flow)}`} onSelect={updateLocation} onBack={() => run(backStagedCountry)} onExit={onExit} surface /> : null
      break
    case 'location-ready':
      content = <StagedLearningReadyStep title="Location Ready" summary="This Set met the spaced location threshold." nextLabel="Continue to Practice" onNext={() => run(startStagedCountryPractice)} onKeepPractising={() => run(startStagedCountryLocation)} onBack={() => run(backStagedCountry)} onExit={onExit} surface />
      break
    case 'practice':
    case 'combined-practice':
      content = flow.practice ? <SchedulerPracticeStep continent={continent} entries={stageEntries.length ? stageEntries : allPresentationEntries} session={flow.practice} stepLabel={flow.phase === 'combined-practice' ? 'Combined practice' : `Set ${currentStagedCountrySetNumber(flow)} · Step 3 - Practice`} questionLabel="Country name" questionTitle="Name the country" answerLabel="Type the country name" placeholder="Type the country…" showCountryName={false} answerKind="country" showMap={flow.phase !== 'combined-practice'} promptText="Name the country" evaluateAnswer={(answer, country) => evaluateCountryAnswer(answer, country, fuzzyMatching, allPresentationEntries.map(entry => entry.country))} formatFeedback={formatCountryFeedback} onSubmit={updatePractice} onBack={() => run(backStagedCountry)} onExit={onExit} allowIncorrectSpellingPractice={allowIncorrectSpellingPractice} surface /> : null
      break
    case 'set-ready':
      content = <StagedLearningReadyStep title={`Set ${currentStagedCountrySetNumber(flow)} Ready`} summary="Every Country in this Set met the spaced Country-name Practice threshold." nextLabel={getNextLearningStageLabel(flow.plan, flow.stageIndex)} onNext={() => run(advanceStagedCountryPlan)} onKeepPractising={() => run(keepStagedCountryPractising)} onBack={() => run(backStagedCountry)} onExit={onExit} surface />
      break
    case 'combined-ready':
      content = <StagedLearningReadyStep title="Combined practice ready" summary="Every introduced Country met the spaced Combined practice threshold." nextLabel={getNextLearningStageLabel(flow.plan, flow.stageIndex)} onNext={() => run(advanceStagedCountryPlan)} onKeepPractising={() => run(keepStagedCountryPractising)} onBack={() => run(backStagedCountry)} onExit={onExit} surface />
      break
    case 'final-gate':
      content = <FinalRecallGate ready={flow.finalScopeReady} onStart={() => run(startStagedCountryFinalRecall)} onKeepPractising={() => run(keepStagedCountryPractising)} onBack={() => run(backStagedCountry)} onExit={onExit} surface />
      break
    case 'final-recall':
      content = flow.ordered ? <StagedFinalRecallStep continent={continent} entries={entries} ordered={flow.ordered} stepLabel="Final recall" answerLabel="Country name" placeholder="Type the country…" showCountryName={false} answerKind="country" evaluateAnswer={(answer, country) => evaluateCountryAnswer(answer, country, fuzzyMatching, entries.map(entry => entry.country))} formatFeedback={formatCountryFeedback} onSubmit={updateFinal} onBack={() => run(backStagedCountry)} onExit={onExit} allowIncorrectSpellingPractice={allowIncorrectSpellingPractice} surface /> : null
      break
    case 'complete':
      content = <CountryLearningComplete subregion={subregion} scopeLabel={learningScopeLabel} countryCount={entries.length} onDone={onDone ?? onExit} doneLabel={doneLabel} onRestart={() => { completionReported.current = false; transition(createStagedCountryLearningFlow({ countryIds: ids, maximum: newItemsPerSet, schedulerSettings })) }} surface />
      break
  }
  const dockPlacement = ['practice', 'combined-practice', 'final-recall'].includes(flow.phase) ? 'stacked' : 'attached'
  return <>{rails}<LearningMapSurface continent={continent} scopeCountries={mapEntries} presentation={mapPresentation} presentationKey={presentationKey} context={context} task={activeTask} mapMeta={mapMeta} dockPlacement={dockPlacement}>{content}</LearningMapSurface></>
}
