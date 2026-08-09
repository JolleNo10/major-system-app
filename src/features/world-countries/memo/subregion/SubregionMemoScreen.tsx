import { useMemo, useState } from 'react'
import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForSubregionInEffectiveOrder } from '../geographyMemo'
import { getSubregionLearningState, isSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningStore'
import { countryId } from '@/features/world-countries/learning'
import { CountryLearningFlow } from './CountryLearningFlow'
import { SubregionOverview } from './SubregionOverview'

export function SubregionMemoScreen({
  continent,
  subregion,
  learningVersion,
  locationCleanTargetMinimum,
  fuzzyMatching,
  onLearningChanged,
  onExit,
}: {
  continent: Continent
  subregion: SubregionId
  learningVersion: number
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onLearningChanged: () => void
  onExit: () => void
}) {
  const entries = useMemo(() => getCountriesForSubregionInEffectiveOrder(subregion), [learningVersion, subregion])
  const learned = isSubregionCountriesLearned(getSubregionLearningState(subregion))
  return (
    <div className="w-full">
      {/** This key discards all temporary session state when the effective order changes. */}
      <div key={`${subregion}-${learningVersion}`}>
        <SubregionScreenBody
          continent={continent}
          subregion={subregion}
          entries={entries}
          learned={learned}
          locationCleanTargetMinimum={locationCleanTargetMinimum}
          fuzzyMatching={fuzzyMatching}
          onLearningChanged={onLearningChanged}
          onExit={onExit}
        />
      </div>
    </div>
  )
}

function SubregionScreenBody({
  continent,
  subregion,
  entries,
  learned,
  locationCleanTargetMinimum,
  fuzzyMatching,
  onLearningChanged,
  onExit,
}: {
  continent: Continent
  subregion: SubregionId
  entries: ReturnType<typeof getCountriesForSubregionInEffectiveOrder>
  learned: boolean
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onLearningChanged: () => void
  onExit: () => void
}) {
  const [mode, setMode] = useState<'overview' | 'learning'>('overview')
  const definition = getSubregionDefinition(subregion)

  if (mode === 'learning') {
    return (
      <CountryLearningFlow
        key={`${definition.id}-${entries.map(countryId).join(',')}`}
        continent={continent}
        subregion={subregion}
        entries={entries}
        locationCleanTargetMinimum={locationCleanTargetMinimum}
        fuzzyMatching={fuzzyMatching}
        onExit={() => {
          setMode('overview')
          onLearningChanged()
        }}
      />
    )
  }

  return (
    <SubregionOverview
      continent={continent}
      subregion={subregion}
      entries={entries}
      learned={learned}
      onStart={() => setMode('learning')}
      onOrderChanged={onLearningChanged}
    />
  )
}
