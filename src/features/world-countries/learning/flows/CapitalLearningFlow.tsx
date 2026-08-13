import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import type { LearningSetMaximum } from '@/features/world-countries/learning/stagedLearningPlan'
import { buildLearningPlan } from '@/features/world-countries/learning/stagedLearningPlan'
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
import { classifyPlaceName } from '@/features/world-countries/learning/answerMatching'
import { CapitalLearningComplete } from './CapitalLearningComplete'
import { GuidedLearningRails } from './GuidedLearningRails'
import { SchedulerPracticeStep } from './SchedulerPracticeStep'
import { StagedCapitalWalkthroughStep } from './StagedCapitalWalkthroughStep'
import { StagedFinalRecallStep } from './StagedFinalRecallStep'
import { FinalRecallGate, StagedLearningReadyStep } from './StagedLearningReadyStep'
import type { SchedulerAnswerEvaluation } from './SchedulerPracticeStep'

function evaluateCapitalAnswer(answer: string, country: Country, fuzzyMatching: boolean, candidates: readonly string[]): SchedulerAnswerEvaluation {
  const match = classifyPlaceName(answer, country.capital, { fuzzy: fuzzyMatching, candidates })
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
}: {
  continent: Continent
  subregion: SubregionId
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
}) {
  const ids = useMemo(() => entries.map(country => country.id), [entries])
  const [flow, setFlow] = useState<StagedCapitalLearningFlowState>(() => createStagedCapitalLearningFlow({ countryIds: ids, maximum: newItemsPerSet, schedulerSettings }))
  const completionReporter = useRef(createSubregionCapitalCompletionReporter(subregion, activeCountries))
  const [orderDraft, setOrderDraft] = useState<readonly Country[] | null>(null)
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null)
  const allPresentationEntries = orderDraft ?? entries
  const stageIds = currentStagedCapitalIds(flow)
  const stageEntries = useMemo(() => stageIds.map(id => entries.find(entry => entry.id === id)).filter((entry): entry is Country => Boolean(entry)), [entries, stageIds])
  const currentPlanStage = flow.plan[flow.stageIndex]
  const stageSetNumber = currentPlanStage?.kind === 'set' ? currentPlanStage.set.index + 1 : 0

  const transition = (next: StagedCapitalLearningFlowState) => {
    if (next.phase !== flow.phase) onPhaseChange(next.phase)
    setFlow(next)
  }
  const updatePractice = (correct: boolean, latencyMs: number) => {
    const result = flow.phase === 'combined-practice'
      ? submitStagedCapitalCombined(flow, correct, latencyMs)
      : submitStagedCapitalPractice(flow, correct, latencyMs)
    transition(result.state)
  }
  const updateFinal = (correct: boolean) => {
    const result = submitStagedCapitalFinalAnswer(flow, correct)
    transition(result.state)
    completionReporter.current.report(result.result.completedNow)
  }
  const run = (action: (state: StagedCapitalLearningFlowState) => StagedCapitalLearningFlowState) => transition(action(flow))
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

  useEffect(() => {
    onWalkthroughCountryChange?.(flow.phase === 'walkthrough' ? currentStagedCapitalIds(flow)[flow.walkthroughIndex] ?? null : null)
  }, [flow, onWalkthroughCountryChange])

  const rails = <GuidedLearningRails
    continent={continent}
    subregion={subregion}
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
    onOrderSaved={onOrderSaved}
    onExit={onExit}
    onSkip={['walkthrough', 'practice', 'set-ready', 'combined-practice', 'combined-ready'].includes(flow.phase) ? skip : undefined}
    skipLabel={flow.phase === 'walkthrough' ? 'Skip to Practice' : 'Next'}
    walkthroughCountryId={flow.phase === 'walkthrough' ? currentStagedCapitalIds(flow)[flow.walkthroughIndex] ?? null : null}
  />

  let content: ReactNode
  switch (flow.phase) {
    case 'walkthrough':
      content = <StagedCapitalWalkthroughStep continent={continent} entries={stageEntries} index={flow.walkthroughIndex} setNumber={stageSetNumber} hoveredCountryId={hoveredCountryId} onMove={offset => run(state => moveStagedCapitalWalkthrough(state, offset))} onContinue={() => run(startStagedCapitalPractice)} onExit={onExit} />
      break
    case 'practice':
    case 'combined-practice':
      content = flow.practice ? <SchedulerPracticeStep continent={continent} entries={stageEntries.length ? stageEntries : allPresentationEntries} session={flow.practice} stepLabel={flow.phase === 'combined-practice' ? 'Combined practice' : `Set ${stageSetNumber} · Step 2 - Practice`} questionLabel="Country → Capital" questionTitle="Name the capital" answerLabel="Type the capital" placeholder="Type the capital…" showCountryName evaluateAnswer={(answer, country) => evaluateCapitalAnswer(answer, country, fuzzyMatching, allPresentationEntries.map(entry => entry.capital))} formatFeedback={formatCapitalFeedback} onSubmit={updatePractice} onBack={() => run(backStagedCapital)} onExit={onExit} /> : null
      break
    case 'set-ready':
      content = <StagedLearningReadyStep title={`Set ${stageSetNumber} Ready`} summary="Every Country in this Set met the spaced Capital Practice threshold." nextLabel={nextReadyLabel()} onNext={() => run(advanceStagedCapitalPlan)} onKeepPractising={() => run(keepStagedCapitalPractising)} onBack={() => run(backStagedCapital)} onExit={onExit} />
      break
    case 'combined-ready':
      content = <StagedLearningReadyStep title="Combined practice ready" summary="Every introduced Country-to-Capital relationship met the spaced Combined practice threshold." nextLabel={nextReadyLabel()} onNext={() => run(advanceStagedCapitalPlan)} onKeepPractising={() => run(keepStagedCapitalPractising)} onBack={() => run(backStagedCapital)} onExit={onExit} />
      break
    case 'final-gate':
      content = <FinalRecallGate ready={flow.finalScopeReady} onStart={() => run(startStagedCapitalFinalRecall)} onKeepPractising={() => run(keepStagedCapitalPractising)} onBack={() => run(backStagedCapital)} onExit={onExit} />
      break
    case 'final-recall':
      content = flow.ordered ? <StagedFinalRecallStep continent={continent} entries={entries} ordered={flow.ordered} stepLabel="Final recall" answerLabel="Country → Capital" placeholder="Type the capital…" showCountryName evaluateAnswer={(answer, country) => evaluateCapitalAnswer(answer, country, fuzzyMatching, entries.map(entry => entry.capital))} formatFeedback={formatCapitalFeedback} onSubmit={updateFinal} onBack={() => run(backStagedCapital)} onExit={onExit} /> : null
      break
    case 'complete':
      content = <CapitalLearningComplete subregion={subregion} onDone={onDone ?? onExit} doneLabel={doneLabel} onRestart={() => { completionReporter.current.reset(); transition(createStagedCapitalLearningFlow({ countryIds: ids, maximum: newItemsPerSet, schedulerSettings })) }} />
      break
  }
  return <>{rails}{content}</>
}
