import { useCallback, useMemo, useState } from 'react'
import { Overlay } from '@/app/layout/Overlay'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import type { WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import { SetupMap } from './SetupMap'
import { ContinentOrderEditor } from './continent/ContinentOrderEditor'
import { ContinentSetupOverviewRails } from './WorldCountriesSetupRails'

export function ContinentSetupOverview({
  continent,
  activeCountries,
  learningStates,
  hoveredGroupId,
  learningVersion,
  onWorld,
  onSelectSubregion,
  onHoverGroup,
  onLearningChanged,
  learningReadinessColorsById,
  learningReadinessByCountryId,
  onBackToDrill,
}: {
  continent: Continent
  activeCountries: readonly Country[]
  learningStates: LearningStates
  hoveredGroupId: string | null
  learningVersion: number
  onWorld: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onHoverGroup: (groupId: string | null) => void
  onLearningChanged: () => void
  learningReadinessColorsById: ReadonlyMap<string, string>
  learningReadinessByCountryId: ReadonlyMap<string, WorldCountriesLearningReadiness>
  onBackToDrill?: () => void
}) {
  const [editingOrder, setEditingOrder] = useState(false)
  const [draftSubregions, setDraftSubregions] = useState<readonly SubregionDefinition[] | null>(null)
  const subregions = useMemo(
    () => getSubregionsForContinentInEffectiveOrder(continent, activeCountries, getContinentMetadata(continent)),
    [activeCountries, continent, learningVersion],
  )
  const railSubregions = draftSubregions ?? subregions

  const openOrderEditor = useCallback(() => {
    setDraftSubregions(subregions)
    setEditingOrder(true)
  }, [subregions])
  const closeOrderEditor = useCallback(() => {
    setDraftSubregions(null)
    setEditingOrder(false)
    onHoverGroup(null)
  }, [onHoverGroup])
  const handleOrderChanged = useCallback(() => {
    setDraftSubregions(null)
    onHoverGroup(null)
    onLearningChanged()
  }, [onHoverGroup, onLearningChanged])

  return (
    <>
      <ContinentSetupOverviewRails
        continent={continent}
        subregions={railSubregions}
        activeCountries={activeCountries}
        learningStates={learningStates}
        hoveredGroupId={hoveredGroupId}
        onWorld={onWorld}
        onSelectSubregion={onSelectSubregion}
        onHoverGroup={onHoverGroup}
        onEditOrder={openOrderEditor}
        onBackToDrill={onBackToDrill}
      />
      <div className="w-full animate-fade-in">
        <SetupMap
          level="continent"
          continent={continent}
          learningReadinessColorsById={learningReadinessColorsById}
          learningReadinessByCountryId={learningReadinessByCountryId}
          hoveredGroupId={hoveredGroupId}
          onHoverGroup={onHoverGroup}
          onSelectSubregion={onSelectSubregion}
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
          <ContinentOrderEditor
            continent={continent}
            entries={subregions}
            onHoverGroup={onHoverGroup}
            onDraftChanged={setDraftSubregions}
            onChanged={handleOrderChanged}
            onClose={closeOrderEditor}
          />
        </Overlay>
      )}
    </>
  )
}
