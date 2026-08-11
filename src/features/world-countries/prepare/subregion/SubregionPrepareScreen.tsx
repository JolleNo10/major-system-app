import { useCallback, useMemo, useState } from 'react'
import { Overlay } from '@/app/layout/Overlay'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getCountriesForSubregionInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import { isSubregionCapitalsLearned, isSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningState'
import { getNextSubregionToMemo } from '@/features/world-countries/learning/memoProgress'
import { PrepareSubregionRails } from '../WorldCountriesPrepareRails'
import { SubregionPrepareOverview } from './SubregionPrepareOverview'
import { SubregionOrderEditor } from './SubregionOrderEditor'

export function SubregionPrepareScreen({
  continent,
  subregion,
  activeCountries,
  learningVersion,
  onLearningChanged,
  onSelectSubregion,
  onExit,
  onWorld,
}: {
  continent: Continent
  subregion: SubregionId
  activeCountries: readonly Country[]
  learningVersion: number
  onLearningChanged: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onExit: () => void
  onWorld: () => void
}) {
  const entries = useMemo(
    () => getCountriesForSubregionInEffectiveOrder(subregion, activeCountries, getSubregionMetadata(subregion)),
    [activeCountries, learningVersion, subregion],
  )
  const nextSubregion = useMemo(() => {
    const learnedSubregionIds = new Set(
      getAllSubregionLearningStates(activeCountries)
        .filter(state => isSubregionCountriesLearned(state))
        .map(state => state.subregionId),
    )
    return getNextSubregionToMemo(
      getSubregionsForContinentInEffectiveOrder(continent, activeCountries, getContinentMetadata(continent)),
      candidateId => learnedSubregionIds.has(candidateId),
    )
  }, [activeCountries, continent, learningVersion])
  const learningStates = getAllSubregionLearningStates(activeCountries)
  const learningState = learningStates.find(state => state.subregionId === subregion)
  const learned = isSubregionCountriesLearned(learningState)
  const capitalsLearned = isSubregionCapitalsLearned(learningState)
  const [editingOrder, setEditingOrder] = useState(false)
  const [draftEntries, setDraftEntries] = useState<readonly Country[] | null>(null)
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null)
  const [mnemonicVersion, setMnemonicVersion] = useState(0)
  const mapEntries = draftEntries ?? entries

  const openOrderEditor = useCallback(() => {
    setDraftEntries(entries)
    setEditingOrder(true)
  }, [entries])
  const closeOrderEditor = useCallback(() => {
    setDraftEntries(null)
    setEditingOrder(false)
    setHoveredCountryId(null)
  }, [])
  const handleOrderChanged = useCallback(() => {
    setDraftEntries(null)
    setHoveredCountryId(null)
    onLearningChanged()
  }, [onLearningChanged])
  const refreshMnemonic = useCallback(() => setMnemonicVersion(version => version + 1), [])

  return (
    <div className="w-full">
      <PrepareSubregionRails
        continent={continent}
        subregion={subregion}
        entries={mapEntries}
        learned={learned}
        capitalsLearned={capitalsLearned}
        nextSubregion={nextSubregion}
        mnemonicVersion={mnemonicVersion}
        onWorld={onWorld}
        onContinent={onExit}
        onSelectSubregion={onSelectSubregion}
        onEditOrder={openOrderEditor}
        onMnemonicChanged={refreshMnemonic}
      />

      {editingOrder && (
        <Overlay
          onClose={closeOrderEditor}
          ariaLabel="Edit learning order"
          header={<h2 className="text-lg font-bold text-zinc-100">Edit learning order</h2>}
          maxWidth="max-w-lg"
          presentation="side-panel"
        >
          <SubregionOrderEditor
            subregion={subregion}
            entries={entries}
            onHoverCountry={setHoveredCountryId}
            onDraftChanged={setDraftEntries}
            onChanged={handleOrderChanged}
            onClose={closeOrderEditor}
          />
        </Overlay>
      )}

      <SubregionPrepareOverview
        continent={continent}
        subregion={subregion}
        entries={entries}
        mapEntries={mapEntries}
        highlightedCountryId={hoveredCountryId}
        learned={learned}
        capitalsLearned={capitalsLearned}
        mnemonicVersion={mnemonicVersion}
        onMnemonicChanged={refreshMnemonic}
      />
    </div>
  )
}
