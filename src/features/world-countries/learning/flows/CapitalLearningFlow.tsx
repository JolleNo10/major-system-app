import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import {
  getNextLearningStageLabel,
  getNextLearningStageDescription,
  deriveLearningStagePresentation,
  getLearningSetCompletionLabel,
  getLearningSetContextLabel,
  rebuildLearningPlanAfterCountryOrderSave,
  type LearningStagePresentation,
  type LearningSetMaximum,
} from '@/features/world-countries/learning/stagedLearningPlan'
import { deriveLearningPracticeProgress } from '@/features/world-countries/learning/learningPracticeProgress'
import {
  advanceStagedCapitalPlan,
  backStagedCapital,
  createStagedCapitalLearningFlow,
  currentStagedCapitalIds,
  keepStagedCapitalPractising,
  moveStagedCapitalWalkthrough,
  skipStagedCapital,
  startStagedCapitalFinalRecall,
  startStagedCapitalPractice,
  submitStagedCapitalCombined,
  submitStagedCapitalFinalAnswer,
  submitStagedCapitalPractice,
  type StagedCapitalLearningFlowState,
  type StagedCapitalLearningPhase,
} from '@/features/world-countries/learning/stagedCapitalLearningFlow'
import { createSubregionCapitalCompletionReporter } from '@/features/world-countries/learning/capitalLearningCompletion'
import { classifyRecallAnswer } from '@/features/world-countries/learning/recallAnswerMatching'
import { CapitalLearningComplete } from './CapitalLearningComplete'
import type { LearningCompletedRegionAction, LearningCompletionHandoff, LearningRegionCompletion } from './LearningComplete'
import { GuidedLearningRails } from './GuidedLearningRails'
import { LearningMapSurface } from './LearningMapSurface'
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

function evaluateCapitalAnswer(answer: string, country: Country, fuzzyMatching: boolean, candidates: readonly Country[]): SchedulerAnswerEvaluation {
  const match = classifyRecallAnswer('country-to-capital', answer, country, {
    fuzzy: fuzzyMatching,
    capitalCandidates: candidates.map(candidate => candidate.capital),
  })
  return {
    correct: match === 'exact' || match === 'fuzzy',
    fuzzyMatch: match === 'fuzzy',
    wrongAnswerKind: match === 'wrong-kind',
    canonicalAnswer: country.capital,
  }
}

function formatCapitalFeedback(evaluation: SchedulerAnswerEvaluation): string {
  return evaluation.correct
    ? evaluation.fuzzyMatch ? `Correct. The canonical answer is ${evaluation.canonicalAnswer}.` : 'Correct.'
    : `The correct capital is ${evaluation.canonicalAnswer}.`
}

export function CapitalLearningFlow({
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
  completionHandoff,
  regionCompletion,
  completedRegionAction,
  countriesEstablished = false,
  capitalsEstablished = false,
  onWalkthroughCountryChange,
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
  onPhaseChange: (phase: StagedCapitalLearningPhase) => void
  onExit: () => void
  onDone?: () => void
  doneLabel?: string
  completionHandoff?: LearningCompletionHandoff
  regionCompletion?: LearningRegionCompletion
  completedRegionAction?: LearningCompletedRegionAction
  countriesEstablished?: boolean
  capitalsEstablished?: boolean
  onWalkthroughCountryChange?: (countryId: string | null) => void
  recordCompletion?: boolean
  allowIncorrectSpellingPractice?: boolean
}) {
  const learningScopeLabel = scopeLabel ?? (subregion ? getSubregionDefinition(subregion).label : 'Learning scope')
  const ids = useMemo(() => entries.map(country => country.id), [entries])
  const [flow, setFlow] = useState<StagedCapitalLearningFlowState>(() => createStagedCapitalLearningFlow({ countryIds: ids, maximum: newItemsPerSet, schedulerSettings }))
  const completionReporter = useRef(subregion && recordCompletion ? createSubregionCapitalCompletionReporter(subregion, activeCountries) : null)
  const [orderDraft, setOrderDraft] = useState<readonly Country[] | null>(null)
  const [editingOrder, setEditingOrder] = useState(false)
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null)
  const { allPresentationEntries, mapPresentation: orderMapPresentation, onClickOrderStateChange, onClickOrderToggle } = useLearningCountryOrderAuthoring({ entries, orderDraft, editingOrder })
  const stageIds = currentStagedCapitalIds(flow)
  const stageEntries = useMemo(() => stageIds.map(id => entries.find(entry => entry.id === id)).filter((entry): entry is Country => Boolean(entry)), [entries, stageIds])
  const currentPlanStage = flow.plan[flow.stageIndex]
  const stagePresentation = deriveLearningStagePresentation(flow.plan, flow.stageIndex)

  const transition = (next: StagedCapitalLearningFlowState) => {
    if (next.phase !== flow.phase) onPhaseChange(next.phase)
    setFlow(next)
  }
  const run = (action: (state: StagedCapitalLearningFlowState) => StagedCapitalLearningFlowState) => transition(action(flow))
  const updatePractice = (correct: boolean, latencyMs: number) => {
    const result = flow.phase === 'combined-practice'
      ? submitStagedCapitalCombined(flow, correct, latencyMs)
      : submitStagedCapitalPractice(flow, correct, latencyMs)
    transition(result.state)
  }
  const updateFinal = (correct: boolean) => {
    const result = submitStagedCapitalFinalAnswer(flow, correct)
    transition(result.state)
    completionReporter.current?.report(result.result.completedNow)
  }
  const onOrderSaved = (draft: readonly Country[]) => {
    setOrderDraft(draft)
    const nextIds = draft.map(country => country.id)
    setFlow(previous => ({
      ...previous,
      ...rebuildLearningPlanAfterCountryOrderSave(nextIds, previous.maximum, previous.stageIndex),
    }))
  }
  const skip = () => run(state => skipStagedCapital(state))
  const backAvailable = flow.phase === 'practice'
    || flow.phase === 'set-ready'
    || flow.phase === 'final-recall'
    || flow.phase === 'final-gate'
    || ((flow.phase === 'combined-practice' || flow.phase === 'combined-ready') && flow.stageIndex > 0)
  const backLabel = flow.phase === 'final-recall' ? 'Back to Final recall' : 'Back'

  useEffect(() => {
    onWalkthroughCountryChange?.(flow.phase === 'walkthrough' ? currentStagedCapitalIds(flow)[flow.walkthroughIndex] ?? null : null)
  }, [flow, onWalkthroughCountryChange])

  const walkthroughCountry = stageEntries[flow.walkthroughIndex]
  const { mapEntries, presentation: mapPresentation, presentationKey } = deriveLearningMapPresentation({
    phase: flow.phase,
    fullEntries: allPresentationEntries,
    stageEntries,
    fallbackEntries: allPresentationEntries,
    walkthroughIndex: flow.walkthroughIndex,
    ordered: flow.ordered,
    practice: flow.practice,
    hoveredCountryId,
    orderPresentation: orderMapPresentation,
    completionPatternKind: 'crosshatch',
  })
  const mapMeta = <LearningMapMetadata scopeLabel={learningScopeLabel} fullEntries={allPresentationEntries} activeEntries={mapEntries} activeScopeLabel={currentPlanStage?.kind === 'set' ? 'Current Set' : currentPlanStage?.kind === 'combined' ? 'Introduced scope' : 'Full Subregion'} />

  const context = (() => {
    switch (flow.phase) {
      case 'walkthrough': return <LearningHeader label="Meet the capitals" title={walkthroughCountry ? `${walkthroughCountry.country} ↔ ${walkthroughCountry.capital}` : 'Country ↔ Capital'} meta={`${flow.walkthroughIndex + 1} / ${stageEntries.length}`} onExit={onExit} />
      case 'practice': return <LearningHeader label="Recall the capitals" title="Name the capital" meta={capitalSetContext(stagePresentation, stageEntries.length)} onExit={onExit} />
      case 'set-ready': return <LearningHeader label="Learning context" title={learningScopeLabel} meta={capitalSetContext(stagePresentation, stageEntries.length)} onExit={onExit} />
      case 'combined-practice': return <LearningHeader label="Mix what you've learned" title="Name the capital" meta={`${stageEntries.length} ${stageEntries.length === 1 ? 'pair' : 'pairs'}`} onExit={onExit} />
      case 'combined-ready': return <LearningHeader label="Learning context" title={learningScopeLabel} meta={`${stageEntries.length} ${stageEntries.length === 1 ? 'pair' : 'pairs'} introduced`} onExit={onExit} />
      case 'final-gate': return <LearningHeader label="Learning context" title={learningScopeLabel} meta={`All ${entries.length} ${entries.length === 1 ? 'country' : 'countries'}`} onExit={onExit} />
      case 'final-recall': return <LearningHeader label="Final recall" title={`${(flow.ordered?.currentIndex ?? 0) + 1} / ${flow.ordered?.order.length ?? entries.length}`} onExit={onExit} />
      case 'complete': return <LearningHeader label="Learning context" title={learningScopeLabel} onExit={onExit} />
    }
  })()

  const practiceProgress = flow.phase === 'practice' || flow.phase === 'combined-practice'
    ? flow.practice ? deriveLearningPracticeProgress(flow.practice, schedulerSettings) : null
    : null
  const activeTask: WorldCountriesActivityTask | undefined = (() => {
    switch (flow.phase) {
      case 'walkthrough':
        return { direction: 'Meet the capitals', cue: walkthroughCountry ? `${walkthroughCountry.country} ↔ ${walkthroughCountry.capital}` : 'Country ↔ Capital', sessionContext: `Meet the capitals · ${capitalSetContext(stagePresentation, stageEntries.length)}`, progress: { label: 'Country', current: flow.walkthroughIndex + 1, total: stageEntries.length } }
      case 'practice':
      case 'combined-practice':
        return { direction: flow.phase === 'combined-practice' ? 'Mix what you\'ve learned' : 'Recall the capitals', cue: 'Name the capital', sessionContext: flow.phase === 'combined-practice' ? `${stageEntries.length} ${stageEntries.length === 1 ? 'pair' : 'pairs'}` : capitalSetContext(stagePresentation, stageEntries.length), answerKind: 'capital', progress: practiceProgress ? { label: 'Recall', current: practiceProgress.atTarget, total: practiceProgress.total, percent: practiceProgress.pct * 100 } : undefined }
      case 'final-recall':
        return { direction: 'Final recall', cue: 'Name the capital', sessionContext: flow.ordered?.mode === 'repair' ? 'Repair traversal' : 'Final recall', answerKind: 'capital', progress: { label: 'Country', current: (flow.ordered?.currentIndex ?? 0) + 1, total: flow.ordered?.order.length ?? entries.length } }
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
    track="capitals"
    stagePresentation={stagePresentation}
    onCountryHover={setHoveredCountryId}
    onOrderDraftChanged={setOrderDraft}
    onOrderEditingChange={setEditingOrder}
    onOrderSaved={onOrderSaved}
    onClickOrderStateChange={onClickOrderStateChange}
    onClickOrderToggle={onClickOrderToggle}
    onBack={backAvailable ? () => run(backStagedCapital) : undefined}
    backLabel={backLabel}
    onExit={onExit}
    onSkip={['walkthrough', 'practice', 'set-ready', 'combined-practice', 'combined-ready'].includes(flow.phase) ? skip : undefined}
    skipLabel={flow.phase === 'walkthrough' ? 'Skip to Recall' : 'Next'}
    walkthroughCountryId={flow.phase === 'walkthrough' ? currentStagedCapitalIds(flow)[flow.walkthroughIndex] ?? null : null}
    practiceProgress={practiceProgress}
  />

  let content: ReactNode
  switch (flow.phase) {
    case 'walkthrough':
       content = <StagedWalkthroughStep entries={stageEntries} index={flow.walkthroughIndex} onMove={offset => run(state => moveStagedCapitalWalkthrough(state, offset))} onContinue={() => run(startStagedCapitalPractice)} continueLabel="Continue to Recall" />
      break
    case 'practice':
    case 'combined-practice':
      content = flow.practice ? <SchedulerPracticeStep continent={continent} entries={stageEntries.length ? stageEntries : allPresentationEntries} session={flow.practice} stepLabel={flow.phase === 'combined-practice' ? `${stageEntries.length} ${stageEntries.length === 1 ? 'pair' : 'pairs'}` : capitalSetContext(stagePresentation, stageEntries.length)} questionLabel={flow.phase === 'combined-practice' ? 'Mix what you\'ve learned' : 'Recall the capitals'} questionTitle="Name the capital" answerLabel="Type the capital" placeholder="Type the capital…" showCountryName answerKind="capital" surface promptText="Name the capital" evaluateAnswer={(answer, country) => evaluateCapitalAnswer(answer, country, fuzzyMatching, allPresentationEntries)} formatFeedback={formatCapitalFeedback} onSubmit={updatePractice} onBack={() => run(backStagedCapital)} onExit={onExit} allowIncorrectSpellingPractice={allowIncorrectSpellingPractice} /> : null
      break
    case 'set-ready':
      content = <StagedLearningReadyStep title={getLearningSetCompletionLabel(stagePresentation)} summary={`You recalled all ${stageEntries.length} ${stageEntries.length === 1 ? 'country–capital pair' : 'country–capital pairs'} in this practice.`} nextDescription={getNextLearningStageDescription(flow.plan, flow.stageIndex, 'capitals')} nextLabel={getNextLearningStageLabel(flow.plan, flow.stageIndex)} onNext={() => run(advanceStagedCapitalPlan)} onKeepPractising={() => run(keepStagedCapitalPractising)} onBack={() => run(backStagedCapital)} onExit={onExit} surface />
      break
    case 'combined-ready':
      content = <StagedLearningReadyStep title="Mixed practice complete" summary={`You recalled all ${stageEntries.length} introduced country–capital pairs together.`} nextDescription={getNextLearningStageDescription(flow.plan, flow.stageIndex, 'capitals')} nextLabel={getNextLearningStageLabel(flow.plan, flow.stageIndex)} onNext={() => run(advanceStagedCapitalPlan)} onKeepPractising={() => run(keepStagedCapitalPractising)} onBack={() => run(backStagedCapital)} onExit={onExit} surface />
      break
    case 'final-gate':
      content = <FinalRecallGate ready={flow.finalScopeReady} onStart={() => run(startStagedCapitalFinalRecall)} onKeepPractising={() => run(keepStagedCapitalPractising)} onBack={() => run(backStagedCapital)} onExit={onExit} surface />
      break
    case 'final-recall':
      content = flow.ordered ? <StagedFinalRecallStep continent={continent} entries={entries} ordered={flow.ordered} stepLabel="Final recall" answerLabel="Country → Capital" placeholder="Type the capital…" showCountryName answerKind="capital" evaluateAnswer={(answer, country) => evaluateCapitalAnswer(answer, country, fuzzyMatching, entries)} formatFeedback={formatCapitalFeedback} onSubmit={updateFinal} onBack={() => run(backStagedCapital)} onExit={onExit} allowIncorrectSpellingPractice={allowIncorrectSpellingPractice} surface /> : null
      break
    case 'complete':
      content = <CapitalLearningComplete subregion={subregion} scopeLabel={learningScopeLabel} onDone={onDone ?? onExit} doneLabel={doneLabel} completionHandoff={completionHandoff} regionCompletion={regionCompletion} completedRegionAction={completedRegionAction} recordCompletion={recordCompletion} onRestart={() => { completionReporter.current?.reset(); transition(createStagedCapitalLearningFlow({ countryIds: ids, maximum: newItemsPerSet, schedulerSettings })) }} surface />
      break
  }
  const dockPlacement = ['practice', 'combined-practice', 'final-recall'].includes(flow.phase) ? 'stacked' : 'attached'
  return <>{rails}<LearningMapSurface continent={continent} scopeCountries={mapEntries} cameraIntent={subregion && !editingOrder ? { kind: 'subregion-learning', subregionId: subregion } : { kind: 'default' }} presentation={mapPresentation} presentationKey={presentationKey} context={context} task={activeTask} mapMeta={mapMeta} dockPlacement={dockPlacement}>{content}</LearningMapSurface></>
}

function capitalSetContext(stagePresentation: LearningStagePresentation<Country['id']> | null, count: number): string {
  return getLearningSetContextLabel(stagePresentation, count, 'capitals')
}
