import { useCallback, useState } from 'react'
import { Overlay } from '@/app/layout/Overlay'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import type { WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import { SetupMap } from './SetupMap'
import { WorldOrderEditor } from './world/WorldOrderEditor'
import { WorldSetupOverviewRails } from './WorldCountriesSetupRails'

export function WorldSetupOverview({
  continents,
  activeCountries,
  learningStates,
  hoveredGroupId,
  onLearningChanged,
  onSelectContinent,
  onHoverGroup,
  learningReadinessColorsById,
  learningReadinessByCountryId,
  onBackToDrill,
}: {
  continents: readonly Continent[]
  activeCountries: readonly Country[]
  learningStates: LearningStates
  hoveredGroupId: string | null
  onLearningChanged: () => void
  onSelectContinent: (continent: Continent) => void
  onHoverGroup: (groupId: string | null) => void
  learningReadinessColorsById: ReadonlyMap<string, string>
  learningReadinessByCountryId: ReadonlyMap<string, WorldCountriesLearningReadiness>
  onBackToDrill?: () => void
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
      <WorldSetupOverviewRails
        continents={railContinents}
        activeCountries={activeCountries}
        learningStates={learningStates}
        hoveredGroupId={hoveredGroupId}
        onSelectContinent={onSelectContinent}
        onHoverGroup={onHoverGroup}
        onEditOrder={openOrderEditor}
        onBackToDrill={onBackToDrill}
      />
      <div className="w-full animate-fade-in">
        <SetupMap
          level="world"
          learningReadinessColorsById={learningReadinessColorsById}
          learningReadinessByCountryId={learningReadinessByCountryId}
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
