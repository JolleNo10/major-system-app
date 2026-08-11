import type { Continent } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import { resetContinentSubregionOrder, setContinentSubregionOrder } from '@/features/world-countries/geography/continentMetadataStore'
import { getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { sortSubregionsByMemoMapPosition } from '@/features/world-countries/maps/memoMapOrdering'
import { LearningOrderEditor } from '../LearningOrderEditor'

export function ContinentOrderEditor({
  continent,
  entries,
  onHoverGroup,
  onDraftChanged,
  onChanged,
  onClose,
}: {
  continent: Continent
  entries: readonly SubregionDefinition[]
  onHoverGroup?: (groupId: string | null) => void
  onDraftChanged: (draft: readonly SubregionDefinition[]) => void
  onChanged: () => void
  onClose: () => void
}) {
  return (
    <LearningOrderEditor
      entries={entries}
      getId={subregion => subregion.id}
      getLabel={subregion => subregion.label}
      onItemHover={onHoverGroup
        ? subregion => onHoverGroup(subregion ? getSubregionHoverGroupId(subregion.label) : null)
        : undefined}
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
        run: draft => sortSubregionsByMemoMapPosition(continent, draft),
      }}
    />
  )
}
