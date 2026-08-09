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
  type CountryLearningFlowState,
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
  locationCleanTargetMinimum,
  fuzzyMatching,
  onExit,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onExit: () => void
}) {
  const ids = useMemo(() => entries.map(country => country.id), [entries])
  const [flow, setFlow] = useState<CountryLearningFlowState>(() => createCountryLearningFlow({
    countryIds: ids,
    minimumCleanTarget: locationCleanTargetMinimum,
  }))
  const completionReported = useRef(false)

  const updateLocation = (selectedCountryId: string) => {
    const next = submitCountryLocation(flow, selectedCountryId)
    setFlow(next.state)
  }

  const updateOrder = (correct: boolean) => {
    const next = submitCountryOrderAnswer(flow, correct)
    setFlow(next.state)
    if (next.result.completedNow && !completionReported.current) {
      completionReported.current = true
      markSubregionCountriesLearned(subregion)
    }
  }

  switch (flow.phase) {
    case 'memory-preview':
      return (
        <MemoryPreviewStep
          subregion={subregion}
          entries={entries}
          onStart={() => setFlow(startCountryWalkthrough(flow))}
          onExit={onExit}
        />
      )
    case 'walkthrough':
      return (
        <CountryWalkthroughStep
          continent={continent}
          entries={entries}
          flow={flow}
          onMove={offset => setFlow(current => moveCountryWalkthrough(current, offset))}
          onStartLocation={() => setFlow(current => startLocationPractice(current, locationCleanTargetMinimum))}
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
          onContinue={() => setFlow(current => startOrderedRecall(current, 2))}
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
          onDone={onExit}
          onRestart={() => {
            completionReported.current = false
            setFlow(createCountryLearningFlow({ countryIds: ids, minimumCleanTarget: locationCleanTargetMinimum }))
          }}
        />
      )
  }
}
