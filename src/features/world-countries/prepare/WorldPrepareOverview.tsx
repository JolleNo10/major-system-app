import { useCallback, useState } from 'react'
import { Overlay } from '@/app/layout/Overlay'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { MemoLearningStates } from '@/features/world-countries/learning/memoProgress'
import type { WorldCountriesMemoReadiness } from '@/features/world-countries/learning/memoReadiness'
import { PrepareMap } from './PrepareMap'
import { WorldOrderEditor } from './world/WorldOrderEditor'
import { WorldOverviewRails } from './WorldCountriesPrepareRails'

export function WorldPrepareOverview({
  continents,
  activeCountries,
  learningStates,
  hoveredGroupId,
  onLearningChanged,
  onSelectContinent,
  onHoverGroup,
  memoReadinessColorsById,
  memoReadinessByCountryId,
}: {
  continents: readonly Continent[]
  activeCountries: readonly Country[]
  learningStates: MemoLearningStates
  hoveredGroupId: string | null
  onLearningChanged: () => void
  onSelectContinent: (continent: Continent) => void
  onHoverGroup: (groupId: string | null) => void
  memoReadinessColorsById: ReadonlyMap<string, string>
  memoReadinessByCountryId: ReadonlyMap<string, WorldCountriesMemoReadiness>
}) {
  const [editingOrder, setEditingOrder] = useState(false)
  const [draftContinents, setDraftContinents] = useState<readonly Continent[] | null>(null)
  const railContinents = draftContinents ?? continents

  const openOrderEditor = useCallback(() => {
    setDraftContinents(continents)
    setEditingOrder(true)
  }, [continents])
  const closeOrderEditor = useCallback(() => {
    setDraftContinents(null)
    setEditingOrder(false)
    onHoverGroup(null)
  }, [onHoverGroup])
  const handleOrderChanged = useCallback(() => {
    setDraftContinents(null)
    onHoverGroup(null)
    onLearningChanged()
  }, [onHoverGroup, onLearningChanged])

  return (
    <>
      <WorldOverviewRails
        continents={railContinents}
        activeCountries={activeCountries}
        learningStates={learningStates}
        hoveredGroupId={hoveredGroupId}
        onSelectContinent={onSelectContinent}
        onHoverGroup={onHoverGroup}
        onEditOrder={openOrderEditor}
      />
      <div className="w-full animate-fade-in">
        <PrepareMap
          level="world"
          memoReadinessColorsById={memoReadinessColorsById}
          memoReadinessByCountryId={memoReadinessByCountryId}
          hoveredGroupId={hoveredGroupId}
          onHoverGroup={onHoverGroup}
          onSelectContinent={onSelectContinent}
        />
      </div>

      {editingOrder && (
        <Overlay
          onClose={closeOrderEditor}
          ariaLabel="Edit learning order"
          header={<h2 className="text-lg font-bold text-zinc-100">Edit learning order</h2>}
          maxWidth="max-w-lg"
          presentation="side-panel"
        >
          <WorldOrderEditor
            entries={continents}
            onHoverGroup={onHoverGroup}
            onDraftChanged={setDraftContinents}
            onChanged={handleOrderChanged}
            onClose={closeOrderEditor}
          />
        </Overlay>
      )}
    </>
  )
}
