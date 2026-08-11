import type { Continent } from '@/features/world-countries/data/countries'
import { continentIdFor, type ContinentId } from '@/features/world-countries/data/subregions'
import { resetWorldContinentOrder, setWorldContinentOrder } from '@/features/world-countries/geography/worldMetadataStore'
import { LearningOrderEditor } from '../LearningOrderEditor'

function getContinentId(continent: Continent): ContinentId {
  const id = continentIdFor(continent)
  if (!id) throw new Error(`Unknown Continent: ${continent}`)
  return id
}

export function WorldOrderEditor({
  entries,
  onDraftChanged,
  onChanged,
  onClose,
}: {
  entries: readonly Continent[]
  onDraftChanged: (draft: readonly Continent[]) => void
  onChanged: () => void
  onClose: () => void
}) {
  return (
    <LearningOrderEditor
      entries={entries}
      getId={getContinentId}
      getLabel={continent => continent}
      onDraftChanged={onDraftChanged}
      persistOrder={orderedIds => setWorldContinentOrder(orderedIds as ContinentId[])}
      resetOrder={resetWorldContinentOrder}
      onChanged={onChanged}
      onClose={onClose}
    />
  )
}
