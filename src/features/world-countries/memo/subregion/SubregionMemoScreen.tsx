import { useCallback, useMemo, useState } from 'react'
import { Overlay } from '@/app/layout/Overlay'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForSubregionInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getSubregionLearningState } from '@/features/world-countries/learning/subregionLearningStore'
import { isSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningState'
import type { CountryLearningEntryPoint, CountryLearningPhase } from '@/features/world-countries/learning/countryLearningFlow'
import { SubregionOverviewRails } from '../WorldCountriesMemoRails'
import { CountryLearningFlow } from './CountryLearningFlow'
import { SubregionOverview } from './SubregionOverview'
import { SubregionOrderEditor } from './SubregionOrderEditor'

export function SubregionMemoScreen({
  continent,
  subregion,
  learningVersion,
  locationCleanTargetMinimum,
  fuzzyMatching,
  onLearningChanged,
  onExit,
  onWorld,
}: {
  continent: Continent
  subregion: SubregionId
  learningVersion: number
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onLearningChanged: () => void
  onExit: () => void
  onWorld: () => void
}) {
  const entries = useMemo(() => getCountriesForSubregionInEffectiveOrder(subregion, undefined, getSubregionMetadata(subregion)), [learningVersion, subregion])
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
          onWorld={onWorld}
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
  onWorld,
}: {
  continent: Continent
  subregion: SubregionId
  entries: ReturnType<typeof getCountriesForSubregionInEffectiveOrder>
  learned: boolean
  locationCleanTargetMinimum: number
  fuzzyMatching: boolean
  onLearningChanged: () => void
  onExit: () => void
  onWorld: () => void
}) {
  const [mode, setMode] = useState<'overview' | 'learning'>('overview')
  const [entryPoint, setEntryPoint] = useState<CountryLearningEntryPoint>('beginning')
  const [learningPhase, setLearningPhase] = useState<CountryLearningPhase>('memory-preview')
  const [editingOrder, setEditingOrder] = useState(false)
  const [draftEntries, setDraftEntries] = useState<readonly Country[] | null>(null)
  const [mnemonicVersion, setMnemonicVersion] = useState(0)
  const definition = getSubregionDefinition(subregion)
  const mapEntries = draftEntries ?? entries

  const openOrderEditor = useCallback(() => {
    setDraftEntries(entries)
    setEditingOrder(true)
  }, [entries])
  const closeOrderEditor = useCallback(() => {
    setDraftEntries(null)
    setEditingOrder(false)
  }, [])
  const handleOrderChanged = useCallback(() => {
    setDraftEntries(null)
    onLearningChanged()
  }, [onLearningChanged])
  const refreshMnemonic = useCallback(() => setMnemonicVersion(version => version + 1), [])
  const reportLearningPhase = useCallback((phase: CountryLearningPhase) => setLearningPhase(phase), [])
  const exitLearning = useCallback(() => {
    setMode('overview')
    setLearningPhase('memory-preview')
    onLearningChanged()
  }, [onLearningChanged])

  const content = mode === 'learning' ? (
    <CountryLearningFlow
      key={`${definition.id}-${entries.map(country => country.id).join(',')}`}
      continent={continent}
      subregion={subregion}
      entries={entries}
      entryPoint={entryPoint}
      locationCleanTargetMinimum={locationCleanTargetMinimum}
      fuzzyMatching={fuzzyMatching}
      onPhaseChange={reportLearningPhase}
      onExit={exitLearning}
    />
  ) : (
    <SubregionOverview
      continent={continent}
      subregion={subregion}
      entries={entries}
      mapEntries={mapEntries}
      learned={learned}
      onStart={() => {
        setEntryPoint('beginning')
        setLearningPhase('memory-preview')
        setMode('learning')
      }}
      onPracticeStageB={() => {
        setEntryPoint('ordered-recall')
        setLearningPhase('ordered-recall')
        setMode('learning')
      }}
    />
  )

  return (
    <>
      <SubregionOverviewRails
        phase={mode === 'overview' ? 'overview' : learningPhase}
        navigation={{
          continent,
          subregion,
          onWorld,
          onContinent: onExit,
        }}
        content={{
          entries: mapEntries,
          learned,
          mnemonicVersion,
          onMnemonicChanged: refreshMnemonic,
        }}
        onEditOrder={openOrderEditor}
      />

      {editingOrder && mode === 'overview' && (
        <Overlay
          onClose={closeOrderEditor}
          ariaLabel="Edit learning order"
          header={<h2 className="text-lg font-bold text-zinc-100">Edit learning order</h2>}
          maxWidth="max-w-2xl"
        >
          <SubregionOrderEditor
            subregion={subregion}
            entries={entries}
            onDraftChanged={setDraftEntries}
            onChanged={handleOrderChanged}
            onClose={closeOrderEditor}
          />
        </Overlay>
      )}
      {content}
    </>
  )
}
