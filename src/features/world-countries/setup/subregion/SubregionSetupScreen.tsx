import { useCallback, useMemo, useState } from 'react'
import { Overlay } from '@/app/layout/Overlay'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForSubregionInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { SetupSubregionRails } from '../WorldCountriesSetupRails'
import { SubregionSetupOverview } from './SubregionSetupOverview'
import { SubregionOrderEditor } from './SubregionOrderEditor'

export function SubregionSetupScreen({
  continent,
  subregion,
  activeCountries,
  learningVersion,
  onLearningChanged,
  onSelectSubregion,
  onExit,
  onWorld,
  onBackToDrill,
}: {
  continent: Continent
  subregion: SubregionId
  activeCountries: readonly Country[]
  learningVersion: number
  onLearningChanged: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onExit: () => void
  onWorld: () => void
  onBackToDrill?: () => void
}) {
  const entries = useMemo(
    () => getCountriesForSubregionInEffectiveOrder(subregion, activeCountries, getSubregionMetadata(subregion)),
    [activeCountries, learningVersion, subregion],
  )
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
      <SetupSubregionRails
        continent={continent}
        subregion={subregion}
        entries={mapEntries}
        mnemonicVersion={mnemonicVersion}
        onWorld={onWorld}
        onContinent={onExit}
        onSelectSubregion={onSelectSubregion}
        onEditOrder={openOrderEditor}
        onMnemonicChanged={refreshMnemonic}
        onBackToDrill={onBackToDrill}
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

      <SubregionSetupOverview
        continent={continent}
        subregion={subregion}
        entries={entries}
        mapEntries={mapEntries}
        highlightedCountryId={hoveredCountryId}
        mnemonicVersion={mnemonicVersion}
        onMnemonicChanged={refreshMnemonic}
      />
    </div>
  )
}
