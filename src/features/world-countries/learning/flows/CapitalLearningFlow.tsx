import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionLearningState } from '@/features/world-countries/learning/subregionLearningStore'
import { canEnterCapitalMemo } from '@/features/world-countries/learning/memoReadiness'
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
import { GuidedLearningRails } from './GuidedLearningRails'

interface CapitalLearningFlowProps {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  activeCountries?: readonly Country[]
  fuzzyMatching: boolean
  onPhaseChange: (phase: CapitalLearningPhase) => void
  onExit: () => void
  countriesLearned?: boolean
  startInRecall?: boolean
  onWalkthroughCountryChange?: (countryId: string | null) => void
  mnemonicVersion?: number
}

export function CapitalLearningFlow({ countriesLearned, ...props }: CapitalLearningFlowProps) {
  const canEnter = countriesLearned ?? canEnterCapitalMemo(getSubregionLearningState(props.subregion, props.activeCountries ?? props.entries))
  if (!canEnter) return <CapitalMemoLocked onExit={props.onExit} />
  return <EnabledCapitalLearningFlow {...props} countriesLearned />
}

function EnabledCapitalLearningFlow({
  continent,
  subregion,
  entries,
  activeCountries,
  fuzzyMatching,
  onPhaseChange,
  onExit,
  countriesLearned,
  startInRecall = false,
  onWalkthroughCountryChange,
  mnemonicVersion = 0,
}: Omit<CapitalLearningFlowProps, 'countriesLearned'> & { countriesLearned: boolean }) {
  const countryIds = useMemo(() => entries.map(country => country.id), [entries])
  const [flow, setFlow] = useState<CapitalLearningFlowState>(() => {
    const initialFlow = createCapitalLearningFlow({ countryIds, countriesLearned })
    return startInRecall ? startCapitalRecall(initialFlow) : initialFlow
  })
  const completionReporter = useRef(createSubregionCapitalCompletionReporter(subregion, activeCountries))

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

  const rails = <GuidedLearningRails
    continent={continent}
    subregion={subregion}
    entries={entries}
    phase={flow.phase}
    track="capitals"
    learned={countriesLearned}
    capitalsLearned={false}
    mnemonicVersion={mnemonicVersion}
    walkthroughCountryId={flow.phase === 'walkthrough' ? flow.countryIds[flow.walkthroughIndex] ?? null : null}
  />
  let content: ReactNode
  switch (flow.phase) {
    case 'walkthrough':
      content = (
        <CapitalWalkthroughStep
          continent={continent}
          entries={entries}
          flow={flow}
          onMove={offset => transition(moveCapitalWalkthrough(flow, offset))}
          onStartRecall={() => transition(startCapitalRecall(flow))}
          onExit={onExit}
        />
      )
      break
    case 'recall':
      content = (
        <CapitalRecallStep
          continent={continent}
          entries={entries}
          flow={flow}
          fuzzyMatching={fuzzyMatching}
          onSubmit={updateRecall}
          onExit={onExit}
        />
      )
      break
    case 'complete':
      content = (
        <CapitalLearningComplete
          subregion={subregion}
          onDone={onExit}
          onRestart={() => {
            completionReporter.current.reset()
            transition(createCapitalLearningFlow({ countryIds, countriesLearned }))
          }}
        />
      )
      break
  }
  return <>{rails}{content}</>
}

function CapitalMemoLocked({ onExit }: { onExit: () => void }) {
  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="capital-learning-locked-heading">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Capital learning locked</p>
        <h1 id="capital-learning-locked-heading" className="mt-1 text-2xl font-bold text-zinc-100">Complete Countries first.</h1>
      </header>
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-relaxed text-amber-200">
        Capital learning, review, and practice unlock after Countries learning is complete. Any earlier Capital completion is preserved.
      </p>
      <button type="button" onClick={onExit} className="rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Back to Subregion</button>
    </section>
  )
}
