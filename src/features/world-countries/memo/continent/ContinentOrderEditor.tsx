import type { Continent } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import { resetContinentSubregionOrder, setContinentSubregionOrder } from '@/features/world-countries/geography/continentMetadataStore'
import { sortSubregionsByMapPosition } from '@/features/world-countries/maps/geographyMapAdapter'
import { getMemoMapDefinition } from '@/features/world-countries/maps/mapDefinitions'
import { LearningOrderEditor } from '../LearningOrderEditor'

export function ContinentOrderEditor({
  continent,
  entries,
  onDraftChanged,
  onChanged,
  onClose,
}: {
  continent: Continent
  entries: readonly SubregionDefinition[]
  onDraftChanged: (draft: readonly SubregionDefinition[]) => void
  onChanged: () => void
  onClose: () => void
}) {
  return (
    <LearningOrderEditor
      entries={entries}
      getId={subregion => subregion.id}
      getLabel={subregion => subregion.label}
      onDraftChanged={onDraftChanged}
      persistOrder={orderedIds => setContinentSubregionOrder(continent, orderedIds as SubregionId[])}
      resetOrder={() => resetContinentSubregionOrder(continent)}
      onChanged={onChanged}
      onClose={onClose}
      autoOrder={{
        label: 'Order left to right',
        pendingLabel: 'Reading map…',
        hint: 'Best effort from map positions.',
        errorMessage: 'Could not read the map positions. Your current draft is unchanged.',
        run: async draft => {
          const definition = getMemoMapDefinition(continent)
          const response = await fetch(definition.svgUrl)
          if (!response.ok) throw new Error(`Map request failed with ${response.status}`)
          return sortSubregionsByMapPosition(draft, await response.text())
        },
      }}
    />
  )
}
