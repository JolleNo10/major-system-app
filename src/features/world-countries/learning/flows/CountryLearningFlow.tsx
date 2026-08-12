import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import {
  createCountryLearningFlow,
  moveCountryWalkthrough,
  startCountryWalkthrough,
  startLocationPractice,
  startOrderedRecall,
  submitCountryLocation,
  submitCountryOrderAnswer,
  type CountryLearningEntryPoint,
  type CountryLearningFlowState,
  type CountryLearningPhase,
} from '@/features/world-countries/learning/countryLearningFlow'
import { markSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningStore'
import { CountryLearningComplete } from './CountryLearningComplete'
import { CountryMapPreviewStep } from './CountryMapPreviewStep'
import { CountryWalkthroughStep } from './CountryWalkthroughStep'
import { LocationPracticeStep } from './LocationPracticeStep'
import { OrderedRecallStep } from './OrderedRecallStep'
import { GuidedLearningRails } from './GuidedLearningRails'

export function CountryLearningFlow({
  continent,
  subregion,
  entries,
  activeCountries,
  entryPoint = 'beginning',
  locationCleanTargetMinimum,
  fuzzyMatching,
  onPhaseChange,
  onExit,
  mnemonicVersion = 0,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  activeCountries?: readonly Country[]
  entryPoint?: CountryLearningEntryPoint
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onPhaseChange: (phase: CountryLearningPhase) => void
  onExit: () => void
  mnemonicVersion?: number
}) {
  const ids = useMemo(() => entries.map(country => country.id), [entries])
  const [flow, setFlow] = useState<CountryLearningFlowState>(() => createCountryLearningFlow({
    countryIds: ids,
    minimumCleanTarget: locationCleanTargetMinimum,
    entryPoint,
  }))
  const completionReported = useRef(false)

  const transition = (next: CountryLearningFlowState) => {
    if (next.phase !== flow.phase) onPhaseChange(next.phase)
    setFlow(next)
  }

  const updateLocation = (selectedCountryId: string) => {
    const next = submitCountryLocation(flow, selectedCountryId)
    transition(next.state)
  }

  const updateOrder = (correct: boolean) => {
    const next = submitCountryOrderAnswer(flow, correct)
    transition(next.state)
    if (next.result.completedNow && !completionReported.current) {
      completionReported.current = true
      markSubregionCountriesLearned(subregion, Date.now(), activeCountries)
    }
  }

  const rails = <GuidedLearningRails
    continent={continent}
    subregion={subregion}
    entries={entries}
    phase={flow.phase}
    track="countries"
    learned={false}
    capitalsLearned={false}
    mnemonicVersion={mnemonicVersion}
  />
  let content: ReactNode
  switch (flow.phase) {
    case 'memory-preview':
      content = (
        <CountryMapPreviewStep
          continent={continent}
          entries={entries}
          onStart={() => transition(startCountryWalkthrough(flow))}
          onExit={onExit}
        />
      )
      break
    case 'walkthrough':
      content = (
        <CountryWalkthroughStep
          continent={continent}
          entries={entries}
          flow={flow}
          onMove={offset => transition(moveCountryWalkthrough(flow, offset))}
          onStartLocation={() => transition(startLocationPractice(flow, locationCleanTargetMinimum))}
          onSkip={() => transition(startLocationPractice(flow, locationCleanTargetMinimum))}
          onExit={onExit}
        />
      )
      break
    case 'location-practice':
      content = (
        <LocationPracticeStep
          continent={continent}
          entries={entries}
          flow={flow}
          onSelect={updateLocation}
          onContinue={() => transition(startOrderedRecall(flow, 2))}
          onSkip={() => transition(startOrderedRecall(flow, 2))}
          onExit={onExit}
        />
      )
      break
    case 'ordered-recall':
      content = (
        <OrderedRecallStep
          continent={continent}
          entries={entries}
          flow={flow}
          fuzzyMatching={fuzzyMatching}
          onSubmit={updateOrder}
          onExit={onExit}
        />
      )
      break
    case 'complete':
      content = (
        <CountryLearningComplete
          subregion={subregion}
          countryCount={entries.length}
          onDone={onExit}
          onRestart={() => {
            completionReported.current = false
            transition(createCountryLearningFlow({ countryIds: ids, minimumCleanTarget: locationCleanTargetMinimum }))
          }}
        />
      )
      break
  }
  return <>{rails}{content}</>
}
