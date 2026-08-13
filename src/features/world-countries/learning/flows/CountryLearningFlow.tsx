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
  entryPoint?: CountryLearningEntryPoint
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onPhaseChange: (phase: CountryLearningPhase) => void
  onExit: () => void
  onDone?: () => void
  doneLabel?: string
  mnemonicVersion?: number
  onGeographyChanged?: () => void
  onMnemonicChanged?: () => void
}) {
  const ids = useMemo(() => entries.map(country => country.id), [entries])
  const [flow, setFlow] = useState<CountryLearningFlowState>(() => createCountryLearningFlow({
    countryIds: ids,
    minimumCleanTarget: locationCleanTargetMinimum,
    entryPoint,
  }))
  const completionReported = useRef(false)
  const [orderDraft, setOrderDraft] = useState<readonly Country[] | null>(null)
  const presentationEntries = orderDraft ?? entries
  const onOrderSaved = (draft: readonly Country[]) => {
    const ids = draft.map(country => country.id)
    setFlow(previous => {
      const currentId = previous.countryIds[previous.walkthroughIndex]
      const nextIndex = currentId ? Math.max(0, ids.indexOf(currentId)) : 0
      return { ...previous, countryIds: ids, walkthroughIndex: previous.phase === 'walkthrough' ? nextIndex : previous.walkthroughIndex }
    })
  }

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
    entries={presentationEntries}
    activeCountries={activeCountries ?? entries}
    phase={flow.phase}
    track="countries"
    learned={false}
    capitalsLearned={false}
    mnemonicVersion={mnemonicVersion}
    onGeographyChanged={onGeographyChanged}
    onMnemonicChanged={onMnemonicChanged}
    onOrderDraftChanged={setOrderDraft}
    onOrderSaved={onOrderSaved}
    onExit={onExit}
    onSkip={flow.phase === 'walkthrough'
      ? () => transition(startLocationPractice(flow, locationCleanTargetMinimum))
      : flow.phase === 'location-practice'
        ? () => transition(startOrderedRecall(flow, 2))
        : undefined}
    skipLabel={flow.phase === 'walkthrough' ? 'Skip to locate countries' : flow.phase === 'location-practice' ? 'Skip location recall' : undefined}
  />
  let content: ReactNode
  switch (flow.phase) {
    case 'memory-preview':
      content = (
        <CountryMapPreviewStep
          continent={continent}
          entries={presentationEntries}
          onStart={() => transition(startCountryWalkthrough(flow))}
          onExit={onExit}
        />
      )
      break
    case 'walkthrough':
      content = (
        <CountryWalkthroughStep
          continent={continent}
          entries={presentationEntries}
          flow={flow}
          onMove={offset => transition(moveCountryWalkthrough(flow, offset))}
          onStartLocation={() => transition(startLocationPractice(flow, locationCleanTargetMinimum))}
          onExit={onExit}
        />
      )
      break
    case 'location-practice':
      content = (
        <LocationPracticeStep
          continent={continent}
          entries={presentationEntries}
          flow={flow}
          onSelect={updateLocation}
          onContinue={() => transition(startOrderedRecall(flow, 2))}
          onExit={onExit}
        />
      )
      break
    case 'ordered-recall':
      content = (
        <OrderedRecallStep
          continent={continent}
          entries={presentationEntries}
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
          countryCount={presentationEntries.length}
          onDone={onDone ?? onExit}
          doneLabel={doneLabel}
          onRestart={() => {
            completionReported.current = false
            transition(createCountryLearningFlow({ countryIds: ids, minimumCleanTarget: locationCleanTargetMinimum, entryPoint }))
          }}
        />
      )
      break
  }
  return <>{rails}{content}</>
}
