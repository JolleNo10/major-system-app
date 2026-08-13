import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import type { LearningSetMaximum } from '@/features/world-countries/learning/stagedLearningPlan'
import { buildLearningPlan } from '@/features/world-countries/learning/stagedLearningPlan'
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
import { StagedCountryWalkthroughStep } from './StagedCountryWalkthroughStep'
import { StagedFinalRecallStep } from './StagedFinalRecallStep'
import { FinalRecallGate, StagedLearningReadyStep } from './StagedLearningReadyStep'
import { LearningHeader } from './MemoryPreviewStep'
import type { SchedulerAnswerEvaluation } from './SchedulerPracticeStep'

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
  entries,
  activeCountries,
  newItemsPerSet,
  schedulerSettings,
  fuzzyMatching,
  onPhaseChange,
  onExit,
  onDone,
  doneLabel = 'Back to Learn & Practise',
  mnemonicVersion = 0,
  onGeographyChanged = () => undefined,
  onMnemonicChanged = () => undefined,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  activeCountries?: readonly Country[]
  newItemsPerSet: LearningSetMaximum
  schedulerSettings: { masteryLatencyFactor: number; sessionUnmasteredShare: number }
  fuzzyMatching: boolean
  onPhaseChange: (phase: StagedCountryLearningPhase) => void
  onExit: () => void
  onDone?: () => void
  doneLabel?: string
  mnemonicVersion?: number
  onGeographyChanged?: () => void
  onMnemonicChanged?: () => void
}) {
  const ids = useMemo(() => entries.map(country => country.id), [entries])
  const [flow, setFlow] = useState<StagedCountryLearningFlowState>(() => createStagedCountryLearningFlow({ countryIds: ids, maximum: newItemsPerSet, schedulerSettings }))
  const completionReported = useRef(false)
  const [orderDraft, setOrderDraft] = useState<readonly Country[] | null>(null)
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null)
  const allPresentationEntries = orderDraft ?? entries
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
      markSubregionCountriesLearned(subregion, Date.now(), activeCountries)
    }
  }
  const onOrderSaved = (draft: readonly Country[]) => {
    setOrderDraft(draft)
    const nextIds = draft.map(country => country.id)
    setFlow(previous => {
      const plan = buildLearningPlan(nextIds, previous.maximum)
      return { ...previous, countryIds: nextIds, plan, stageIndex: Math.min(previous.stageIndex, plan.length - 1), walkthroughIndex: 0 }
    })
  }
  const nextReadyLabel = () => {
    const next = flow.plan[flow.stageIndex + 1]
    if (!next) return 'Continue to Final recall'
    if (next.kind === 'set') return `Continue to Set ${next.set.index + 1}`
    return `Practise all ${next.ids.length}`
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

  const mapEntries = ['final-gate', 'final-recall', 'complete'].includes(flow.phase)
    ? entries
    : stageEntries.length ? stageEntries : allPresentationEntries
  const walkthroughCountry = stageEntries[flow.walkthroughIndex]
  const currentRecallId = flow.ordered?.order[flow.ordered.currentIndex] ?? null
  const currentPracticeId = flow.practice?.currentKey ?? null
  const mapPresentation = {
    showNames: flow.phase === 'complete',
    showOrderNumbers: flow.phase === 'walkthrough' || flow.phase === 'complete',
    namedCountryId: flow.phase === 'walkthrough' ? walkthroughCountry?.id ?? null : null,
    highlightedCountryId: flow.phase === 'walkthrough' ? walkthroughCountry?.id ?? null : flow.phase === 'final-recall' ? currentRecallId : currentPracticeId,
    hoveredCountryId,
    showHighlightedNames: flow.phase === 'walkthrough',
    showHoverNames: flow.phase === 'final-recall',
    ariaLabel: flow.phase === 'final-recall' ? 'Highlighted Country for final recall' : 'World Countries Learning map',
  } as const
  const presentationKey = `${flow.phase}:${[...mapEntries].map(entry => entry.id).sort().join(',')}`

  const context = (() => {
    switch (flow.phase) {
      case 'walkthrough': return <div><LearningHeader label={`Set ${currentStagedCountrySetNumber(flow)} · Review`} title={walkthroughCountry?.country ?? 'Review'} onExit={onExit} /><p className="mt-1 text-sm text-zinc-500">{flow.walkthroughIndex + 1} / {stageEntries.length}</p></div>
      case 'location-practice': return <LearningHeader label={`Set ${currentStagedCountrySetNumber(flow)} · Step 2 - Locate`} title={`Find ${flow.location ? stageEntries.find(entry => entry.id === flow.location?.currentKey)?.country ?? 'the Country' : 'the Country'}`} onExit={onExit} />
      case 'location-ready': return <LearningHeader label="Ready" title="Location Ready" onExit={onExit} />
      case 'practice': return <LearningHeader label={`Set ${currentStagedCountrySetNumber(flow)} · Step 3 - Practice`} title="Name the country" onExit={onExit} />
      case 'set-ready': return <LearningHeader label="Ready" title={`Set ${currentStagedCountrySetNumber(flow)} Ready`} onExit={onExit} />
      case 'combined-practice': return <LearningHeader label="Combined practice" title="Name the country" onExit={onExit} />
      case 'combined-ready': return <LearningHeader label="Ready" title="Combined practice ready" onExit={onExit} />
      case 'final-gate': return <LearningHeader label="Final recall" title={flow.finalScopeReady ? 'Ready for Final recall' : 'Final recall'} onExit={onExit} />
      case 'final-recall': return <LearningHeader label="Final recall" title={`${(flow.ordered?.currentIndex ?? 0) + 1} / ${flow.ordered?.order.length ?? entries.length}`} onExit={onExit} />
      case 'complete': return <LearningHeader label="Learning complete" title="Subregion complete" onExit={onExit} />
    }
  })()

  const rails = <GuidedLearningRails
    continent={continent}
    subregion={subregion}
    entries={allPresentationEntries}
    activeCountries={activeCountries ?? entries}
    phase={flow.phase}
    track="countries"
    learned={false}
    capitalsLearned={false}
    mnemonicVersion={mnemonicVersion}
    onGeographyChanged={onGeographyChanged}
    onCountryHover={setHoveredCountryId}
    onMnemonicChanged={onMnemonicChanged}
    onOrderDraftChanged={setOrderDraft}
    onOrderSaved={onOrderSaved}
    onBack={backAvailable ? () => run(backStagedCountry) : undefined}
    backLabel={backLabel}
    onExit={onExit}
    onSkip={['walkthrough', 'location-practice', 'location-ready', 'practice', 'set-ready', 'combined-practice', 'combined-ready'].includes(flow.phase) ? skip : undefined}
    skipLabel={flow.phase === 'walkthrough' ? 'Skip to Locate' : flow.phase === 'location-practice' || flow.phase === 'location-ready' ? 'Next: Practice' : 'Next'}
  />

  let content: ReactNode
  switch (flow.phase) {
    case 'walkthrough':
      content = <StagedCountryWalkthroughStep continent={continent} entries={stageEntries} index={flow.walkthroughIndex} setNumber={currentStagedCountrySetNumber(flow)} hoveredCountryId={hoveredCountryId} onMove={offset => run(state => moveStagedCountryWalkthrough(state, offset))} onContinue={() => run(startStagedCountryLocation)} onExit={onExit} surface />
      break
    case 'location-practice':
      content = flow.location ? <SchedulerLocationPracticeStep continent={continent} entries={stageEntries} session={flow.location} label={`Set ${currentStagedCountrySetNumber(flow)}`} onSelect={updateLocation} onBack={() => run(backStagedCountry)} onExit={onExit} surface /> : null
      break
    case 'location-ready':
      content = <StagedLearningReadyStep title="Location Ready" summary="This Set met the spaced location threshold." nextLabel="Continue to Practice" onNext={() => run(startStagedCountryPractice)} onKeepPractising={() => run(startStagedCountryLocation)} onBack={() => run(backStagedCountry)} onExit={onExit} surface />
      break
    case 'practice':
    case 'combined-practice':
      content = flow.practice ? <SchedulerPracticeStep continent={continent} entries={stageEntries.length ? stageEntries : allPresentationEntries} session={flow.practice} stepLabel={flow.phase === 'combined-practice' ? 'Combined practice' : `Set ${currentStagedCountrySetNumber(flow)} · Step 3 - Practice`} questionLabel="Country name" questionTitle="Name the country" answerLabel="Type the country name" placeholder="Type the country…" showCountryName={false} showMap={flow.phase !== 'combined-practice'} promptText="Name the country" evaluateAnswer={(answer, country) => evaluateCountryAnswer(answer, country, fuzzyMatching, allPresentationEntries.map(entry => entry.country))} formatFeedback={formatCountryFeedback} onSubmit={updatePractice} onBack={() => run(backStagedCountry)} onExit={onExit} surface /> : null
      break
    case 'set-ready':
      content = <StagedLearningReadyStep title={`Set ${currentStagedCountrySetNumber(flow)} Ready`} summary="Every Country in this Set met the spaced Country-name Practice threshold." nextLabel={nextReadyLabel()} onNext={() => run(advanceStagedCountryPlan)} onKeepPractising={() => run(keepStagedCountryPractising)} onBack={() => run(backStagedCountry)} onExit={onExit} surface />
      break
    case 'combined-ready':
      content = <StagedLearningReadyStep title="Combined practice ready" summary="Every introduced Country met the spaced Combined practice threshold." nextLabel={nextReadyLabel()} onNext={() => run(advanceStagedCountryPlan)} onKeepPractising={() => run(keepStagedCountryPractising)} onBack={() => run(backStagedCountry)} onExit={onExit} surface />
      break
    case 'final-gate':
      content = <FinalRecallGate ready={flow.finalScopeReady} onStart={() => run(startStagedCountryFinalRecall)} onKeepPractising={() => run(keepStagedCountryPractising)} onBack={() => run(backStagedCountry)} onExit={onExit} surface />
      break
    case 'final-recall':
      content = flow.ordered ? <StagedFinalRecallStep continent={continent} entries={entries} ordered={flow.ordered} stepLabel="Final recall" answerLabel="Country name" placeholder="Type the country…" showCountryName={false} evaluateAnswer={(answer, country) => evaluateCountryAnswer(answer, country, fuzzyMatching, entries.map(entry => entry.country))} formatFeedback={formatCountryFeedback} onSubmit={updateFinal} onBack={() => run(backStagedCountry)} onExit={onExit} surface /> : null
      break
    case 'complete':
      content = <CountryLearningComplete subregion={subregion} countryCount={entries.length} onDone={onDone ?? onExit} doneLabel={doneLabel} onRestart={() => { completionReported.current = false; transition(createStagedCountryLearningFlow({ countryIds: ids, maximum: newItemsPerSet, schedulerSettings })) }} surface />
      break
  }
  const dockPlacement = ['location-practice', 'practice', 'combined-practice', 'final-recall'].includes(flow.phase) ? 'attached' : 'overlay'
  return <>{rails}<LearningMapSurface continent={continent} scopeCountries={mapEntries} presentation={mapPresentation} presentationKey={presentationKey} context={context} dockPlacement={dockPlacement}>{content}</LearningMapSurface></>
}
