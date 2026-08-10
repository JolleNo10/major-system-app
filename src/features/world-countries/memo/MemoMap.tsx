import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import {
  getWorldCountriesMemoReadinessDescription,
  getWorldCountriesMemoReadinessLabel,
  WORLD_COUNTRIES_MEMO_READINESS_LEGEND_ENTRIES,
  type WorldCountriesMemoReadiness,
} from '@/features/world-countries/learning/memoReadiness'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { ProgressMapLegend } from '@/features/world-countries/learning/ProgressMapLegend'

export interface MemoMapProps {
  level: 'world' | 'continent'
  continent?: Continent
  selectedSubregion?: SubregionId | null
  memoReadinessColorsById?: ReadonlyMap<string, string>
  memoReadinessByCountryId?: ReadonlyMap<string, WorldCountriesMemoReadiness>
  hoveredGroupId?: string | null
  onHoverGroup?: (groupId: string | null) => void
  onSelectContinent?: (continent: Continent) => void
  onSelectSubregion?: (subregion: SubregionId) => void
}

/** Memo-specific wrapper: readiness coloring and Memo navigation remain here. */
export function MemoMap({
  level,
  continent,
  selectedSubregion = null,
  memoReadinessColorsById,
  memoReadinessByCountryId,
  hoveredGroupId = null,
  onHoverGroup,
  onSelectContinent,
  onSelectSubregion,
}: MemoMapProps) {
  const title = level === 'world' ? 'World' : continent ?? 'Continent'
  const selectedLabel = selectedSubregion
    ? `, focused on ${getSubregionDefinition(selectedSubregion).label}`
    : ''
  const countryAccessibleDescriptionsById = memoReadinessByCountryId
    ? new Map([...memoReadinessByCountryId.entries()].map(([countryId, readiness]) => [
      countryId,
      `${getWorldCountriesMemoReadinessLabel(readiness)}. ${getWorldCountriesMemoReadinessDescription(readiness)}`,
    ] as const))
    : undefined
  return (
    <div className="space-y-2">
      <GeographyOverviewMap
        level={level}
        continent={continent}
        focusedSubregionId={selectedSubregion}
        countryColorsById={memoReadinessColorsById}
        countryAccessibleDescriptionsById={countryAccessibleDescriptionsById}
        hoveredGroupId={hoveredGroupId}
        onHoverGroup={onHoverGroup}
        onCountryClick={country => {
          if (level === 'world') onSelectContinent?.(country.continent)
          else onSelectSubregion?.(country.subregionId)
        }}
        ariaLabel={`Memo map of ${title}${selectedLabel}`}
      />
      <ProgressMapLegend
        title="Memo readiness"
        entries={WORLD_COUNTRIES_MEMO_READINESS_LEGEND_ENTRIES}
        explanation="Memo readiness is shared by every current Country in a Subregion and never represents Drill proficiency."
        mapCues={`Map cues: a neutral outline marks temporary hover or navigation focus, not readiness. Hover a Country to see its ${level === 'world' ? 'Continent' : 'Subregion'}; the accessible map description names each Country’s readiness.`}
        ariaLabel="Memo readiness legend"
      />
    </div>
  )
}
