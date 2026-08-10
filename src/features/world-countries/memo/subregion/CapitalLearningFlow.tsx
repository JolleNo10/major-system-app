import { useEffect, useMemo, useRef, useState } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import {
  createCapitalLearningFlow,
  applyCapitalLearningTransition,
  moveCapitalWalkthrough,
  startCapitalRecall,
  submitCapitalRecall,
  type CapitalLearningFlowState,
  type CapitalLearningPhase,
} from '@/features/world-countries/learning/capitalLearningFlow'
import { createSubregionCapitalCompletionReporter } from '@/features/world-countries/learning/capitalLearningCompletion'
import { CapitalLearningComplete } from './CapitalLearningComplete'
import { CapitalRecallStep } from './CapitalRecallStep'
import { CapitalWalkthroughStep } from './CapitalWalkthroughStep'

export function CapitalLearningFlow({
  continent,
  subregion,
  entries,
  fuzzyMatching,
  onPhaseChange,
  onExit,
  startInRecall = false,
  onWalkthroughCountryChange,
  onRecallCorrectionCountryChange,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  fuzzyMatching: boolean
  onPhaseChange: (phase: CapitalLearningPhase) => void
  onExit: () => void
  startInRecall?: boolean
  onWalkthroughCountryChange?: (countryId: string | null) => void
  onRecallCorrectionCountryChange?: (countryId: string | null) => void
}) {
  const countryIds = useMemo(() => entries.map(country => country.id), [entries])
  const [flow, setFlow] = useState<CapitalLearningFlowState>(() => {
    const initialFlow = createCapitalLearningFlow({ countryIds })
    return startInRecall ? startCapitalRecall(initialFlow) : initialFlow
  })
  const completionReporter = useRef(createSubregionCapitalCompletionReporter(subregion))

  useEffect(() => {
    onWalkthroughCountryChange?.(
      flow.phase === 'walkthrough'
        ? flow.countryIds[flow.walkthroughIndex] ?? null
        : null,
    )
  }, [flow.phase, flow.countryIds, flow.walkthroughIndex, onWalkthroughCountryChange])

  const transition = (next: CapitalLearningFlowState) => {
    setFlow(applyCapitalLearningTransition(flow, next, onPhaseChange))
  }

  const updateRecall = (correct: boolean) => {
    const next = submitCapitalRecall(flow, correct)
    transition(next.state)
    completionReporter.current.report(next.result.completedNow)
  }

  switch (flow.phase) {
    case 'walkthrough':
      return (
        <CapitalWalkthroughStep
          continent={continent}
          entries={entries}
          flow={flow}
          onMove={offset => transition(moveCapitalWalkthrough(flow, offset))}
          onStartRecall={() => transition(startCapitalRecall(flow))}
          onExit={onExit}
        />
      )
    case 'recall':
      return (
        <CapitalRecallStep
          continent={continent}
          entries={entries}
          flow={flow}
          fuzzyMatching={fuzzyMatching}
          onSubmit={updateRecall}
          onExit={onExit}
          onCorrectionCountryChange={onRecallCorrectionCountryChange}
        />
      )
    case 'complete':
      return (
        <CapitalLearningComplete
          subregion={subregion}
          onDone={onExit}
          onRestart={() => {
            completionReporter.current.reset()
            transition(createCapitalLearningFlow({ countryIds }))
          }}
        />
      )
  }
}
