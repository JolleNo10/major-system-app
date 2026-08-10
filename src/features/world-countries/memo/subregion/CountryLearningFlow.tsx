import { useMemo, useRef, useState } from 'react'
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
import { CountryWalkthroughStep } from './CountryWalkthroughStep'
import { LocationPracticeStep } from './LocationPracticeStep'
import { MemoryPreviewStep } from './MemoryPreviewStep'
import { OrderedRecallStep } from './OrderedRecallStep'

export function CountryLearningFlow({
  continent,
  subregion,
  entries,
  entryPoint = 'beginning',
  locationCleanTargetMinimum,
  fuzzyMatching,
  onPhaseChange,
  onExit,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  entryPoint?: CountryLearningEntryPoint
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onPhaseChange: (phase: CountryLearningPhase) => void
  onExit: () => void
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
      markSubregionCountriesLearned(subregion)
    }
  }

  switch (flow.phase) {
    case 'memory-preview':
      return (
        <MemoryPreviewStep
          onStart={() => transition(startCountryWalkthrough(flow))}
          onExit={onExit}
        />
      )
    case 'walkthrough':
      return (
        <CountryWalkthroughStep
          continent={continent}
          entries={entries}
          flow={flow}
          onMove={offset => transition(moveCountryWalkthrough(flow, offset))}
          onStartLocation={() => transition(startLocationPractice(flow, locationCleanTargetMinimum))}
          onExit={onExit}
        />
      )
    case 'location-practice':
      return (
        <LocationPracticeStep
          continent={continent}
          entries={entries}
          flow={flow}
          onSelect={updateLocation}
          onContinue={() => transition(startOrderedRecall(flow, 2))}
          onExit={onExit}
        />
      )
    case 'ordered-recall':
      return (
        <OrderedRecallStep
          continent={continent}
          entries={entries}
          flow={flow}
          fuzzyMatching={fuzzyMatching}
          onSubmit={updateOrder}
          onExit={onExit}
        />
      )
    case 'complete':
      return (
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
  }
}
