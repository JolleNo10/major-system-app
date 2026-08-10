import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'

export interface MemoMapProps {
  level: 'world' | 'continent'
  continent?: Continent
  selectedSubregion?: SubregionId | null
  memoedCountryIds: ReadonlySet<string>
  countryColorsById?: ReadonlyMap<string, string>
  progressLegend?: string
  hoveredGroupId?: string | null
  onHoverGroup?: (groupId: string | null) => void
  onSelectContinent?: (continent: Continent) => void
  onSelectSubregion?: (subregion: SubregionId) => void
}

/** Memo-specific wrapper: learned-Country coloring and Memo navigation remain here. */
export function MemoMap({
  level,
  continent,
  selectedSubregion = null,
  memoedCountryIds,
  countryColorsById,
  progressLegend,
  hoveredGroupId = null,
  onHoverGroup,
  onSelectContinent,
  onSelectSubregion,
}: MemoMapProps) {
  const title = level === 'world' ? 'World' : continent ?? 'Continent'
  const selectedLabel = selectedSubregion
    ? `, focused on ${getSubregionDefinition(selectedSubregion).label}`
    : ''

  return (
    <div className="space-y-2">
      <GeographyOverviewMap
        level={level}
        continent={continent}
        focusedSubregionId={selectedSubregion}
        coloredCountryIds={memoedCountryIds}
        countryColor="#16a34a"
        countryColorsById={countryColorsById}
        hoveredGroupId={hoveredGroupId}
        onHoverGroup={onHoverGroup}
        onCountryClick={country => {
          if (level === 'world') onSelectContinent?.(country.continent)
          else onSelectSubregion?.(country.subregionId)
        }}
        ariaLabel={`Memo map of ${title}${selectedLabel}`}
      />
      <div className="flex items-center justify-between gap-3 px-1 text-xs text-zinc-500">
        <span>Hover a country to see its {level === 'world' ? 'Continent' : 'Subregion'}.</span>
        <span>{progressLegend
          ? `${progressLegend}: Unpractised · Weak · Developing · Strong · Complete`
          : <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-green-600" /> Countries learned</span>}
        </span>
      </div>
    </div>
  )
}
