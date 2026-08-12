import type { Continent } from '@/features/world-countries/data/countries'
import { continentIdFor, type ContinentId } from '@/features/world-countries/data/subregions'
import { resetWorldContinentOrder, setWorldContinentOrder } from '@/features/world-countries/geography/worldMetadataStore'
import { getContinentHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { LearningOrderEditor } from '../LearningOrderEditor'

function getContinentId(continent: Continent): ContinentId {
  const id = continentIdFor(continent)
  if (!id) throw new Error(`Unknown Continent: ${continent}`)
  return id
}

export function WorldOrderEditor({
  entries,
  onHoverGroup,
  onDraftChanged,
  onChanged,
  onClose,
}: {
  entries: readonly Continent[]
  onHoverGroup?: (groupId: string | null) => void
  onDraftChanged: (draft: readonly Continent[]) => void
  onChanged: () => void
  onClose: () => void
}) {
  return (
    <LearningOrderEditor
      entries={entries}
      getId={getContinentId}
      getLabel={continent => continent}
      onItemHover={onHoverGroup
        ? continent => onHoverGroup(continent ? getContinentHoverGroupId(continent) : null)
        : undefined}
      onDraftChanged={onDraftChanged}
      persistOrder={orderedIds => setWorldContinentOrder(orderedIds as ContinentId[])}
      resetOrder={resetWorldContinentOrder}
      onChanged={onChanged}
      onClose={onClose}
    />
  )
}
