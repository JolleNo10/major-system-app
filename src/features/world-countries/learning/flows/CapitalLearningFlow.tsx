import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import type { LearningSetMaximum } from '@/features/world-countries/learning/stagedLearningPlan'
import { buildLearningPlan } from '@/features/world-countries/learning/stagedLearningPlan'
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

function evaluateCapitalAnswer(answer: string, country: Country, fuzzyMatching: boolean, candidates: readonly string[]): SchedulerAnswerEvaluation {
  const match = classifyRecallAnswer('country-to-capital', answer, country, {
    fuzzy: fuzzyMatching,
    capitalCandidates: candidates,
  })
  return { correct: match !== 'none', fuzzyMatch: match === 'fuzzy', canonicalAnswer: country.capital }
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
  countriesLearned = false,
  onWalkthroughCountryChange,
  mnemonicVersion = 0,
  onGeographyChanged = () => undefined,
  onMnemonicChanged = () => undefined,
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
  countriesLearned?: boolean
  onWalkthroughCountryChange?: (countryId: string | null) => void
  mnemonicVersion?: number
  onGeographyChanged?: () => void
  onMnemonicChanged?: () => void
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
  const stageSetNumber = currentPlanStage?.kind === 'set' ? currentPlanStage.set.index + 1 : 0

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
    setFlow(previous => {
      const nextIds = draft.map(country => country.id)
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
    ...orderMapPresentation,
    mapClassName: ['practice', 'combined-practice'].includes(flow.phase) ? '[&>svg]:max-h-[510px]' : undefined,
    ariaLabel: flow.phase === 'final-recall' ? 'Highlighted Country for final recall' : 'World Countries Learning map',
  } as const
  const presentationKey = `${flow.phase}:${[...mapEntries].map(entry => entry.id).sort().join(',')}`
  const mapMeta = (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{learningScopeLabel}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-100">{mapEntries.length} {mapEntries.length === 1 ? 'country' : 'countries'} in scope</div>
    </div>
  )

  const context = (() => {
    switch (flow.phase) {
      case 'walkthrough': return <LearningHeader label={`Set ${stageSetNumber} · Review`} title={walkthroughCountry ? `${walkthroughCountry.country} ↔ ${walkthroughCountry.capital}` : 'Review'} meta={`${flow.walkthroughIndex + 1} / ${stageEntries.length}`} onExit={onExit} />
      case 'practice': return <LearningHeader label={`Set ${stageSetNumber} · Step 2 - Practice`} title="Name the capital" onExit={onExit} />
      case 'set-ready': return <LearningHeader label="Ready" title={`Set ${stageSetNumber} Ready`} onExit={onExit} />
      case 'combined-practice': return <LearningHeader label="Combined practice" title="Name the capital" onExit={onExit} />
      case 'combined-ready': return <LearningHeader label="Ready" title="Combined practice ready" onExit={onExit} />
      case 'final-gate': return <LearningHeader label="Final recall" title={flow.finalScopeReady ? 'Ready for Final recall' : 'Final recall'} onExit={onExit} />
      case 'final-recall': return <LearningHeader label="Final recall" title={`${(flow.ordered?.currentIndex ?? 0) + 1} / ${flow.ordered?.order.length ?? entries.length}`} onExit={onExit} />
      case 'complete': return <LearningHeader label="Learning complete" title={learningScopeLabel} onExit={onExit} />
    }
  })()

  const practiceProgress = flow.phase === 'practice' || flow.phase === 'combined-practice'
    ? flow.practice ? deriveLearningPracticeProgress(flow.practice, schedulerSettings) : null
    : null
  const activeTask: WorldCountriesActivityTask | undefined = (() => {
    switch (flow.phase) {
      case 'walkthrough':
        return { direction: 'Country ↔ Capital', cue: walkthroughCountry ? `${walkthroughCountry.country} ↔ ${walkthroughCountry.capital}` : 'Review', sessionContext: `Set ${stageSetNumber} · Review`, progress: { label: 'Country', current: flow.walkthroughIndex + 1, total: stageEntries.length } }
      case 'practice':
      case 'combined-practice':
        return { direction: 'Country → Capital', cue: 'Name the capital', sessionContext: flow.phase === 'combined-practice' ? 'Combined practice' : `Set ${stageSetNumber} · Practice`, answerKind: 'capital', progress: practiceProgress ? { label: 'Practice', current: practiceProgress.atTarget, total: practiceProgress.total, percent: practiceProgress.pct * 100 } : undefined }
      case 'final-recall':
        return { direction: 'Country → Capital', cue: 'Name the capital', sessionContext: flow.ordered?.mode === 'repair' ? 'Repair traversal' : 'Final recall', answerKind: 'capital', progress: { label: 'Country', current: (flow.ordered?.currentIndex ?? 0) + 1, total: flow.ordered?.order.length ?? entries.length } }
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
    learned={countriesLearned}
    capitalsLearned={false}
    mnemonicVersion={mnemonicVersion}
    onGeographyChanged={onGeographyChanged}
    onCountryHover={setHoveredCountryId}
    onMnemonicChanged={onMnemonicChanged}
    onOrderDraftChanged={setOrderDraft}
    onOrderEditingChange={setEditingOrder}
    onOrderSaved={onOrderSaved}
    onClickOrderStateChange={onClickOrderStateChange}
    onClickOrderToggle={onClickOrderToggle}
    onBack={backAvailable ? () => run(backStagedCapital) : undefined}
    backLabel={backLabel}
    onExit={onExit}
    onSkip={['walkthrough', 'practice', 'set-ready', 'combined-practice', 'combined-ready'].includes(flow.phase) ? skip : undefined}
    skipLabel={flow.phase === 'walkthrough' ? 'Skip to Practice' : 'Next'}
    walkthroughCountryId={flow.phase === 'walkthrough' ? currentStagedCapitalIds(flow)[flow.walkthroughIndex] ?? null : null}
    practiceProgress={practiceProgress}
  />

  let content: ReactNode
  switch (flow.phase) {
    case 'walkthrough':
      content = <StagedWalkthroughStep entries={stageEntries} index={flow.walkthroughIndex} onMove={offset => run(state => moveStagedCapitalWalkthrough(state, offset))} onContinue={() => run(startStagedCapitalPractice)} continueLabel="Continue to Practice" />
      break
    case 'practice':
    case 'combined-practice':
      content = flow.practice ? <SchedulerPracticeStep continent={continent} entries={stageEntries.length ? stageEntries : allPresentationEntries} session={flow.practice} stepLabel={flow.phase === 'combined-practice' ? 'Combined practice' : `Set ${stageSetNumber} · Step 2 - Practice`} questionLabel="Country → Capital" questionTitle="Name the capital" answerLabel="Type the capital" placeholder="Type the capital…" showCountryName answerKind="capital" surface promptText="Name the capital" evaluateAnswer={(answer, country) => evaluateCapitalAnswer(answer, country, fuzzyMatching, allPresentationEntries.map(entry => entry.capital))} formatFeedback={formatCapitalFeedback} onSubmit={updatePractice} onBack={() => run(backStagedCapital)} onExit={onExit} allowIncorrectSpellingPractice={allowIncorrectSpellingPractice} /> : null
      break
    case 'set-ready':
      content = <StagedLearningReadyStep title={`Set ${stageSetNumber} Ready`} summary="Every Country in this Set met the spaced Capital Practice threshold." nextLabel={nextReadyLabel()} onNext={() => run(advanceStagedCapitalPlan)} onKeepPractising={() => run(keepStagedCapitalPractising)} onBack={() => run(backStagedCapital)} onExit={onExit} surface />
      break
    case 'combined-ready':
      content = <StagedLearningReadyStep title="Combined practice ready" summary="Every introduced Country-to-Capital relationship met the spaced Combined practice threshold." nextLabel={nextReadyLabel()} onNext={() => run(advanceStagedCapitalPlan)} onKeepPractising={() => run(keepStagedCapitalPractising)} onBack={() => run(backStagedCapital)} onExit={onExit} surface />
      break
    case 'final-gate':
      content = <FinalRecallGate ready={flow.finalScopeReady} onStart={() => run(startStagedCapitalFinalRecall)} onKeepPractising={() => run(keepStagedCapitalPractising)} onBack={() => run(backStagedCapital)} onExit={onExit} surface />
      break
    case 'final-recall':
      content = flow.ordered ? <StagedFinalRecallStep continent={continent} entries={entries} ordered={flow.ordered} stepLabel="Final recall" answerLabel="Country → Capital" placeholder="Type the capital…" showCountryName answerKind="capital" evaluateAnswer={(answer, country) => evaluateCapitalAnswer(answer, country, fuzzyMatching, entries.map(entry => entry.capital))} formatFeedback={formatCapitalFeedback} onSubmit={updateFinal} onBack={() => run(backStagedCapital)} onExit={onExit} allowIncorrectSpellingPractice={allowIncorrectSpellingPractice} surface /> : null
      break
    case 'complete':
      content = <CapitalLearningComplete subregion={subregion} scopeLabel={learningScopeLabel} onDone={onDone ?? onExit} doneLabel={doneLabel} onRestart={() => { completionReporter.current?.reset(); transition(createStagedCapitalLearningFlow({ countryIds: ids, maximum: newItemsPerSet, schedulerSettings })) }} surface />
      break
  }
  const dockPlacement = ['practice', 'combined-practice', 'final-recall'].includes(flow.phase) ? 'stacked' : 'attached'
  return <>{rails}<LearningMapSurface continent={continent} scopeCountries={mapEntries} presentation={mapPresentation} presentationKey={presentationKey} context={context} task={activeTask} mapMeta={mapMeta} dockPlacement={dockPlacement}>{content}</LearningMapSurface></>
}
