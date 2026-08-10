import { useCallback, useMemo, useState } from 'react'
import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import { countries } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForContinent, getCountriesForSubregion } from '@/features/world-countries/geography/queries'
import {
  createContinentHoverGroups,
  createCountryColors,
  createSubregionHoverGroups,
  getCountryForSvgId,
  resolveCountriesToSvgIds,
} from './geographyMapAdapter'
import { getMemoMapDefinition, MEMO_MAP_DEFINITIONS } from './mapDefinitions'
import { SvgMapView, type SvgMapCountry } from './SvgMapView'

export interface GeographyOverviewMapProps {
  level: 'world' | 'continent'
  continent?: Continent
  /** A temporary geographic focus, such as Memo's selected Subregion. */
  focusedSubregionId?: SubregionId | null
  /** When supplied, the map presents these Subregions as the current selection. */
  selectedSubregionIds?: readonly SubregionId[]
  /** Generic Country emphasis owned by the caller (for example learned Countries). */
  coloredCountryIds?: ReadonlySet<CountryId> | readonly CountryId[]
  countryColor?: string
  hoveredGroupId?: string | null
  onHoverGroup?: (groupId: string | null) => void
  onCountryClick?: (country: Country) => void
  ariaLabel?: string
}

/**
 * Reusable World/Continent exploration map.
 *
 * This component owns only Geography-to-SVG presentation and interaction.
 * Callers interpret a Country click as navigation, selection, or another
 * workflow action through the callbacks.
 */
export function GeographyOverviewMap({
  level,
  continent,
  focusedSubregionId = null,
  selectedSubregionIds,
  coloredCountryIds = [],
  countryColor = '#16a34a',
  hoveredGroupId = null,
  onHoverGroup,
  onCountryClick,
  ariaLabel,
}: GeographyOverviewMapProps) {
  const definition = useMemo(
    () => level === 'world' || !continent
      ? MEMO_MAP_DEFINITIONS.find(candidate => candidate.id === 'world') ?? MEMO_MAP_DEFINITIONS[0]
      : getMemoMapDefinition(continent),
    [continent, level],
  )
  const visibleCountries = useMemo(
    () => level === 'world' || !continent ? countries : getCountriesForContinent(continent),
    [continent, level],
  )
  const focusCountries = useMemo(
    () => focusedSubregionId && continent
      ? getCountriesForSubregion(continent, focusedSubregionId, visibleCountries)
      : visibleCountries,
    [continent, focusedSubregionId, visibleCountries],
  )
  const selectedCountries = useMemo(() => {
    if (level !== 'continent' || selectedSubregionIds === undefined || !continent) return []
    const selected = new Set(selectedSubregionIds)
    return visibleCountries.filter(country => selected.has(country.subregionId))
  }, [continent, level, selectedSubregionIds, visibleCountries])
  const [mapCountries, setMapCountries] = useState<readonly SvgMapCountry[]>([])

  const handleCountryClick = useCallback((svgId: string) => {
    const entry = getCountryForSvgId(svgId, visibleCountries)
    if (!entry) return
    onCountryClick?.(entry)
  }, [onCountryClick, visibleCountries])

  const mapCountryIds = useMemo(() => mapCountries.map(country => country.id), [mapCountries])
  const hoverGroups = useMemo(() => {
    const discoveredIds = new Set(mapCountryIds)
    return level === 'world'
      ? createContinentHoverGroups(visibleCountries, discoveredIds)
      : createSubregionHoverGroups(continent ?? '', visibleCountries, discoveredIds)
  }, [continent, level, mapCountryIds, visibleCountries])

  const visibleSvgIds = useMemo(
    () => resolveCountriesToSvgIds(visibleCountries, mapCountryIds),
    [mapCountryIds, visibleCountries],
  )
  const focusSvgIds = useMemo(
    () => resolveCountriesToSvgIds(focusCountries, mapCountryIds),
    [focusCountries, mapCountryIds],
  )
  const selectedSvgIds = useMemo(
    () => resolveCountriesToSvgIds(selectedCountries, mapCountryIds),
    [mapCountryIds, selectedCountries],
  )
  const hoverableSvgIds = focusedSubregionId
    ? focusSvgIds
    : selectedSubregionIds
      ? selectedSvgIds
      : undefined
  const mutedSvgIds = useMemo(() => {
    if (!focusedSubregionId && selectedSubregionIds === undefined) return []
    const activeIds = new Set(focusedSubregionId ? focusSvgIds : selectedSvgIds)
    return mapCountryIds.filter(id => !activeIds.has(id))
  }, [focusSvgIds, focusedSubregionId, mapCountryIds, selectedSubregionIds, selectedSvgIds])
  const countryColors = useMemo(() => {
    const colors: Array<readonly [string, string]> = []
    if (selectedSubregionIds !== undefined) {
      colors.push(...createCountryColors(visibleCountries, selectedCountries.map(country => country.id), mapCountryIds, '#0e7490'))
    }
    colors.push(...createCountryColors(visibleCountries, coloredCountryIds, mapCountryIds, countryColor))
    return colors
  }, [coloredCountryIds, countryColor, mapCountryIds, selectedCountries, selectedSubregionIds, visibleCountries])

  const hoveredCountryId = useMemo(
    () => hoverGroups.find(group => group.id === hoveredGroupId)?.countryIds[0] ?? null,
    [hoverGroups, hoveredGroupId],
  )
  const zoomIds = level === 'continent' && continent && (focusedSubregionId || definition.domainContinents.length > 1)
    ? (focusedSubregionId ? focusSvgIds : visibleSvgIds)
    : []

  const title = level === 'world' ? 'World' : continent ?? 'Continent'

  return (
    <div className="space-y-2">
      <SvgMapView
        svgUrl={definition.svgUrl}
        ariaLabel={ariaLabel ?? `Geography map of ${title}`}
        settings={{
          countryFill: '#52525b',
          hoverHighlight: true,
          hoverShowName: level !== 'world',
          hoverScope: 'group',
          hoverFill: '#0f766e',
          showHighlightedNames: false,
        }}
        hoverGroups={hoverGroups}
        hoverableIds={hoverableSvgIds}
        hoveredId={hoveredCountryId}
        mutedIds={mutedSvgIds}
        countryColors={countryColors}
        zoomIds={zoomIds}
        zoomPadding={definition.zoomPadding}
        onCountriesLoaded={setMapCountries}
        onCountryHover={svgId => {
          const group = hoverGroups.find(candidate => candidate.countryIds.includes(svgId ?? ''))
          onHoverGroup?.(group?.id ?? null)
        }}
        onCountryClick={handleCountryClick}
      />
    </div>
  )
}
