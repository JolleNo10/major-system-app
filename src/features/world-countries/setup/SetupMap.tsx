import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import {
  WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES,
  type WorldCountriesLearningReadiness,
  getWorldCountriesLearningReadinessDescription,
  getWorldCountriesLearningReadinessLabel,
} from '@/features/world-countries/learning/learningReadiness'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { ProgressMapLegend } from '@/features/world-countries/learning/ProgressMapLegend'

const LEARNING_READINESS_LEGEND_ENTRIES = WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES.map(entry => ({
  ...entry,
  label: getWorldCountriesLearningReadinessLabel(entry.state as WorldCountriesLearningReadiness),
}))

export interface SetupMapProps {
  level: 'world' | 'continent'
  continent?: Continent
  selectedSubregion?: SubregionId | null
  learningReadinessColorsById?: ReadonlyMap<string, string>
  learningReadinessByCountryId?: ReadonlyMap<string, WorldCountriesLearningReadiness>
  hoveredGroupId?: string | null
  onHoverGroup?: (groupId: string | null) => void
  onSelectContinent?: (continent: Continent) => void
  onSelectSubregion?: (subregion: SubregionId) => void
}

/** Setup-specific wrapper: readiness coloring and geography navigation remain here. */
export function SetupMap({
  level,
  continent,
  selectedSubregion = null,
  learningReadinessColorsById,
  learningReadinessByCountryId,
  hoveredGroupId = null,
  onHoverGroup,
  onSelectContinent,
  onSelectSubregion,
}: SetupMapProps) {
  const title = level === 'world' ? 'World' : continent ?? 'Continent'
  const selectedLabel = selectedSubregion
    ? `, focused on ${getSubregionDefinition(selectedSubregion).label}`
    : ''
  const countryAccessibleDescriptionsById = learningReadinessByCountryId
    ? new Map([...learningReadinessByCountryId.entries()].map(([countryId, readiness]) => [
      countryId,
      `${getWorldCountriesLearningReadinessLabel(readiness)}. ${getWorldCountriesLearningReadinessDescription(readiness)}`,
    ] as const))
    : undefined
  return (
    <div className="space-y-2">
      <GeographyOverviewMap
        level={level}
        continent={continent}
        focusedSubregionId={selectedSubregion}
        countryColorsById={learningReadinessColorsById}
        countryAccessibleDescriptionsById={countryAccessibleDescriptionsById}
        hoveredGroupId={hoveredGroupId}
        onHoverGroup={onHoverGroup}
        onCountryClick={country => {
          if (level === 'world') onSelectContinent?.(country.continent)
          else onSelectSubregion?.(country.subregionId)
        }}
        ariaLabel={`Setup map of ${title}${selectedLabel}`}
      />
      <ProgressMapLegend
        title="Learning Readiness"
        entries={LEARNING_READINESS_LEGEND_ENTRIES}
        explanation="Learning Readiness is shared by every current Country in a Subregion and never represents Drill proficiency."
        mapCues={`Map cues: a neutral outline marks temporary hover or navigation focus, not Learning Readiness. Hover a Country to see its ${level === 'world' ? 'Continent' : 'Subregion'}; the accessible map description names each Country's Learning Readiness.`}
        ariaLabel="Learning Readiness legend"
      />
    </div>
  )
}
