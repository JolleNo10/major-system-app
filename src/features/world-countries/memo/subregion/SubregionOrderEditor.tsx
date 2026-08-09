import type { Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { resetSubregionCountryOrder, setSubregionCountryOrder } from '@/features/world-countries/geography/subregionMetadataStore'
import { sortCountriesByMemoMapPosition } from '@/features/world-countries/maps/memoMapOrdering'
import { LearningOrderEditor } from '../LearningOrderEditor'

export function SubregionOrderEditor({
  subregion,
  entries,
  onDraftChanged,
  onChanged,
  onClose,
}: {
  subregion: SubregionId
  entries: readonly Country[]
  onDraftChanged: (draft: readonly Country[]) => void
  onChanged: () => void
  onClose: () => void
}) {
  return (
    <LearningOrderEditor
      entries={entries}
      getId={country => country.id}
      getLabel={country => country.country}
      onDraftChanged={onDraftChanged}
      persistOrder={orderedIds => setSubregionCountryOrder(subregion, orderedIds)}
      resetOrder={() => resetSubregionCountryOrder(subregion)}
      onChanged={onChanged}
      onClose={onClose}
      autoOrder={{
        label: 'Order left to right',
        pendingLabel: 'Reading map…',
        hint: 'Best effort from map positions.',
        errorMessage: 'Could not read the map positions. Your current draft is unchanged.',
        run: draft => sortCountriesByMemoMapPosition(
          getSubregionDefinition(subregion).continent,
          draft,
        ),
      }}
    />
  )
}
