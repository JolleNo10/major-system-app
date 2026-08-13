import { useCallback, useId, useMemo, useState } from 'react'
import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForContinent, getCountriesForSubregion } from '@/features/world-countries/geography/queries'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import {
  createContinentHoverGroups,
  createCountryColors,
  createCountryColorsById,
  createSubregionHoverGroups,
  getCountryForSvgId,
  resolveCountriesToSvgIds,
} from './geographyMapAdapter'
import { getMemoMapDefinition, MEMO_MAP_DEFINITIONS } from './mapDefinitions'
import type { SvgMapGroupOutline } from './SvgMapController'
import { SvgMapView, type SvgMapCountry } from './SvgMapView'

const GEOGRAPHY_OVERVIEW_HOVER_FILL = '#0f766e'
const GEOGRAPHY_OVERVIEW_HOVER_STROKE = '#d4d4d8'
const GEOGRAPHY_OVERVIEW_HOVER_STROKE_WIDTH = '2px'

export interface GeographyOverviewMapProps {
  level: 'world' | 'continent'
  continent?: Continent
  /** A temporary geographic focus, such as Memo's selected Subregion. */
  focusedSubregionId?: SubregionId | null
  /** When supplied, the map presents these Subregions as the current selection. */
  selectedSubregionIds?: readonly SubregionId[]
  /** When supplied, the map presents these Countries as the current scope. */
  selectedCountryIds?: readonly CountryId[]
  /** Generic Country emphasis owned by the caller (for example learned Countries). */
  coloredCountryIds?: ReadonlySet<CountryId> | readonly CountryId[]
  countryColor?: string
  /** Caller-resolved semantic progress colors; this map does not interpret them. */
  countryColorsById?: ReadonlyMap<CountryId, string>
  /** Optional non-color descriptions for the mapped Countries. */
  countryAccessibleDescriptionsById?: ReadonlyMap<CountryId, string>
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
  selectedCountryIds,
  coloredCountryIds = [],
  countryColor = '#16a34a',
  countryColorsById,
  countryAccessibleDescriptionsById,
  hoveredGroupId = null,
  onHoverGroup,
  onCountryClick,
  ariaLabel,
}: GeographyOverviewMapProps) {
  const activeCountries = useWorldCountriesPopulation()
  const definition = useMemo(
    () => level === 'world' || !continent
      ? MEMO_MAP_DEFINITIONS.find(candidate => candidate.id === 'world') ?? MEMO_MAP_DEFINITIONS[0]
      : getMemoMapDefinition(continent),
    [continent, level],
  )
  const visibleCountries = useMemo(
    () => level === 'world' || !continent ? activeCountries : getCountriesForContinent(continent, activeCountries),
    [activeCountries, continent, level],
  )
  const focusCountries = useMemo(
    () => focusedSubregionId && continent
      ? getCountriesForSubregion(continent, focusedSubregionId, visibleCountries)
      : visibleCountries,
    [continent, focusedSubregionId, visibleCountries],
  )
  const selectedCountries = useMemo(() => {
    if (level === 'continent' && selectedCountryIds !== undefined && continent) {
      const selected = new Set(selectedCountryIds)
      return visibleCountries.filter(country => selected.has(country.id))
    }
    if (level !== 'continent' || selectedSubregionIds === undefined || !continent) return []
    const selected = new Set(selectedSubregionIds)
    return visibleCountries.filter(country => selected.has(country.subregionId))
  }, [continent, level, selectedCountryIds, selectedSubregionIds, visibleCountries])
  const [mapCountries, setMapCountries] = useState<readonly SvgMapCountry[]>([])

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
  const [mapHoveredGroupId, setMapHoveredGroupId] = useState<string | null>(null)
  const activeHoveredGroupId = hoveredGroupId ?? mapHoveredGroupId
  const hoveredGroupSvgIds = useMemo(
    () => hoverGroups.find(group => group.id === activeHoveredGroupId)?.countryIds ?? [],
    [activeHoveredGroupId, hoverGroups],
  )
  const hasContinentScope = level === 'continent'
  const hasSelectedCountries = selectedCountryIds !== undefined
  const hasSelectedSubregions = selectedSubregionIds !== undefined && selectedSubregionIds.length > 0
  const hasHoveredSubregionScope = level === 'continent' && Boolean(activeHoveredGroupId)
  const scopedSvgIds = focusedSubregionId
    ? focusSvgIds
    : hasSelectedCountries
      ? selectedSvgIds
    : hasSelectedSubregions
      ? selectedSvgIds
      : hasHoveredSubregionScope
        ? hoveredGroupSvgIds
        : hasContinentScope
          ? visibleSvgIds
          : []
  const hasScopedCountries = Boolean(
    focusedSubregionId || selectedCountryIds !== undefined || selectedSubregionIds !== undefined || hasHoveredSubregionScope || hasContinentScope,
  )
  const hoverableSvgIds = hasScopedCountries ? scopedSvgIds : visibleSvgIds
  const restrictCountryClicks = Boolean(
    focusedSubregionId || (selectedSubregionIds === undefined && hasHoveredSubregionScope),
  )
  const handleCountryClick = useCallback((svgId: string) => {
    if (restrictCountryClicks && !scopedSvgIds.includes(svgId)) return
    const entry = getCountryForSvgId(svgId, visibleCountries)
    if (!entry) return
    onCountryClick?.(entry)
  }, [onCountryClick, restrictCountryClicks, scopedSvgIds, visibleCountries])
  const mutedSvgIds = useMemo(() => {
    if (!hasScopedCountries) return []
    const activeIds = new Set(scopedSvgIds)
    return mapCountryIds.filter(id => !activeIds.has(id))
  }, [hasScopedCountries, mapCountryIds, scopedSvgIds])
  const countryColors = useMemo(() => {
    const colors: Array<readonly [string, string]> = []
    if (countryColorsById) colors.push(...createCountryColorsById(visibleCountries, countryColorsById, mapCountryIds))
    if (!countryColorsById) colors.push(...createCountryColors(visibleCountries, coloredCountryIds, mapCountryIds, countryColor))
    return colors
  }, [coloredCountryIds, countryColor, countryColorsById, mapCountryIds, selectedCountries, selectedSubregionIds, visibleCountries])

  const hoveredCountryId = useMemo(
    () => hoveredGroupSvgIds[0] ?? null,
    [hoveredGroupSvgIds],
  )
  const groupOutlines = useMemo<readonly SvgMapGroupOutline[]>(
    () => hoverGroups.map(group => ({
      id: group.id,
      countryIds: group.countryIds,
      stroke: GEOGRAPHY_OVERVIEW_HOVER_STROKE,
      strokeWidth: GEOGRAPHY_OVERVIEW_HOVER_STROKE_WIDTH,
      visible: group.id === activeHoveredGroupId,
    })),
    [activeHoveredGroupId, hoverGroups],
  )
  const zoomIds = level === 'continent' && continent && (focusedSubregionId || definition.domainContinents.length > 1)
    ? (focusedSubregionId ? focusSvgIds : visibleSvgIds)
    : []

  const title = level === 'world' ? 'World' : continent ?? 'Continent'
  const descriptionId = `geography-map-descriptions-${useId().replace(/:/g, '')}`
  const countryDescriptions = useMemo(
    () => countryAccessibleDescriptionsById
      ? visibleCountries.map(country => `${country.country}: ${countryAccessibleDescriptionsById.get(country.id) ?? 'No mapped status description.'}`)
      : [],
    [countryAccessibleDescriptionsById, visibleCountries],
  )
  const descriptions = countryDescriptions

  return (
    <div className="space-y-2">
      <SvgMapView
        svgUrl={definition.svgUrl}
        ariaLabel={ariaLabel ?? `Geography map of ${title}`}
        ariaDescribedBy={descriptions.length ? descriptionId : undefined}
        settings={{
          countryFill: '#52525b',
          hoverHighlight: true,
          hoverShowName: level !== 'world',
          hoverScope: 'group',
          hoverFill: GEOGRAPHY_OVERVIEW_HOVER_FILL,
          showHighlightedNames: false,
        }}
        hoverGroups={hoverGroups}
        groupOutlines={groupOutlines}
        hoverableIds={hoverableSvgIds}
        hoveredId={hoveredCountryId}
        mutedIds={mutedSvgIds}
        countryColors={countryColors}
        zoomIds={zoomIds}
        zoomPadding={definition.zoomPadding}
        onCountriesLoaded={setMapCountries}
        onCountryHover={svgId => {
          const group = hoverGroups.find(candidate => candidate.countryIds.includes(svgId ?? ''))
          setMapHoveredGroupId(group?.id ?? null)
          onHoverGroup?.(group?.id ?? null)
        }}
        onCountryClick={handleCountryClick}
      />
      {descriptions.length > 0 && (
        <ul id={descriptionId} className="sr-only" aria-label={`${title} Country map descriptions`}>
          {descriptions.map(description => <li key={description}>{description}</li>)}
        </ul>
      )}
    </div>
  )
}
