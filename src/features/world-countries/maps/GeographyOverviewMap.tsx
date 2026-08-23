import { useCallback, useId, useMemo, useState } from 'react'
import { countries, type Continent, type Country, type CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForContinent, getCountriesForSubregion } from '@/features/world-countries/geography/queries'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import {
  createContinentCountryHoverGroups,
  createContinentHoverGroups,
  createCountryColors,
  createCountryColorsById,
  createSubregionCountryHoverGroups,
  createSubregionHoverGroups,
  getCountryForSvgId,
  resolveCountriesToSvgIds,
} from './geographyMapAdapter'
import { getMemoMapDefinition, MEMO_MAP_DEFINITIONS } from './mapDefinitions'
import { OrthographicGlobe } from './OrthographicGlobe'
import type { SvgMapGroupOutline } from './SvgMapController'
import { SvgMapView, type SvgMapCountry, type SvgMapLoadState } from './SvgMapView'

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
  /** Caller-owned Country IDs to emphasize with the map's highlight treatment. */
  highlightedCountryIds?: readonly CountryId[]
  /** Optional non-color descriptions for the mapped Countries. */
  countryAccessibleDescriptionsById?: ReadonlyMap<CountryId, string>
  /** Optional caller-owned population snapshot; defaults to the active context population. */
  countryPopulation?: readonly Country[]
  /** Caller-controlled Country IDs whose geometry and interaction are hidden. */
  hiddenCountryIds?: readonly CountryId[]
  /** Disable caller-facing Country hover/click interaction while keeping the map mounted. */
  interactive?: boolean
  hoveredGroupId?: string | null
  onHoverGroup?: (groupId: string | null) => void
  onCountryClick?: (country: Country) => void
  onMapStateChange?: (state: SvgMapLoadState) => void
  ariaLabel?: string
}

/**
 * Reusable World/Continent exploration map.
 *
 * This component owns canonical geography overview presentation and interaction.
 * The orthographic globe is the primary renderer; the existing SVG map remains
 * a one-way fallback owned by this boundary. Callers interpret Country clicks
 * as navigation, selection, or another workflow action through the callbacks.
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
  highlightedCountryIds = [],
  countryAccessibleDescriptionsById,
  countryPopulation,
  hiddenCountryIds = [],
  interactive = true,
  hoveredGroupId = null,
  onHoverGroup,
  onCountryClick,
  onMapStateChange,
  ariaLabel,
}: GeographyOverviewMapProps) {
  const contextCountries = useWorldCountriesPopulation()
  const activeCountries = countryPopulation ?? contextCountries
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
  const [useSvgFallback, setUseSvgFallback] = useState(false)

  const mapCountryIds = useMemo(() => mapCountries.map(country => country.id), [mapCountries])
  const globeCountryIds = useMemo(() => countries.map(country => country.id), [])
  const focusCountryIds = useMemo(() => focusCountries.map(country => country.id), [focusCountries])
  const overviewMapIds = useMemo(
    () => useSvgFallback
      ? resolveCountriesToSvgIds(visibleCountries, mapCountryIds)
      : visibleCountries.map(country => country.id),
    [mapCountryIds, useSvgFallback, visibleCountries],
  )
  const focusMapIds = useMemo(
    () => useSvgFallback
      ? resolveCountriesToSvgIds(focusCountries, mapCountryIds)
      : focusCountryIds,
    [focusCountryIds, focusCountries, mapCountryIds, useSvgFallback],
  )
  const selectedSvgIds = useMemo(
    () => resolveCountriesToSvgIds(selectedCountries, mapCountryIds),
    [mapCountryIds, selectedCountries],
  )
  const selectedMapIds = useMemo(
    () => useSvgFallback ? selectedSvgIds : selectedCountries.map(country => country.id),
    [selectedCountries, selectedSvgIds, useSvgFallback],
  )
  const highlightedCountryIdSet = useMemo(() => new Set(highlightedCountryIds), [highlightedCountryIds])
  const highlightedSvgIds = useMemo(
    () => resolveCountriesToSvgIds(
      visibleCountries.filter(country => highlightedCountryIdSet.has(country.id)),
      mapCountryIds,
    ),
    [highlightedCountryIdSet, mapCountryIds, visibleCountries],
  )
  const hiddenCountryIdSet = useMemo(() => new Set(hiddenCountryIds), [hiddenCountryIds])
  const hiddenSvgIds = useMemo(
    () => resolveCountriesToSvgIds(
      visibleCountries.filter(country => hiddenCountryIdSet.has(country.id)),
      mapCountryIds,
    ),
    [hiddenCountryIdSet, mapCountryIds, visibleCountries],
  )

  const hoverGroups = useMemo(() => {
    if (!useSvgFallback) {
      return level === 'world'
        ? createContinentCountryHoverGroups(visibleCountries)
        : createSubregionCountryHoverGroups(continent ?? '', visibleCountries)
    }
    const discoveredIds = new Set(mapCountryIds)
    return level === 'world'
      ? createContinentHoverGroups(visibleCountries, discoveredIds)
      : createSubregionHoverGroups(continent ?? '', visibleCountries, discoveredIds)
  }, [continent, level, mapCountryIds, useSvgFallback, visibleCountries])
  const [mapHoveredGroupId, setMapHoveredGroupId] = useState<string | null>(null)
  const activeHoveredGroupId = interactive ? hoveredGroupId ?? mapHoveredGroupId : null
  const hoveredGroupMapIds = useMemo(
    () => hoverGroups.find(group => group.id === activeHoveredGroupId)?.countryIds ?? [],
    [activeHoveredGroupId, hoverGroups],
  )
  const hasContinentScope = level === 'continent'
  const hasSelectedCountries = selectedCountryIds !== undefined
  const hasSelectedSubregions = selectedSubregionIds !== undefined && selectedSubregionIds.length > 0
  const hasHoveredSubregionScope = level === 'continent' && Boolean(activeHoveredGroupId)
  const hasScopedCountries = Boolean(
    focusedSubregionId || selectedCountryIds !== undefined || selectedSubregionIds !== undefined || hasHoveredSubregionScope || hasContinentScope,
  )
  const scopedMapIds = useMemo(
    () => focusedSubregionId
      ? focusMapIds
      : hasSelectedCountries || hasSelectedSubregions
        ? selectedMapIds
        : hasHoveredSubregionScope
          ? hoveredGroupMapIds
          : hasContinentScope
            ? overviewMapIds
            : [],
    [focusMapIds, focusedSubregionId, hasContinentScope, hasHoveredSubregionScope, hasSelectedCountries, hasSelectedSubregions, hoveredGroupMapIds, overviewMapIds, selectedMapIds],
  )
  // Selection controls presentation, not which Countries can be chosen next.
  // A focused Subregion is the sole intentional interaction restriction.
  const hoverableMapIds = interactive
    ? focusedSubregionId ? focusMapIds : overviewMapIds
    : []
  const selectableMapIds = interactive
    ? focusedSubregionId ? focusMapIds : overviewMapIds
    : []
  const restrictCountryClicks = Boolean(
    focusedSubregionId || (selectedSubregionIds === undefined && hasHoveredSubregionScope),
  )
  const handleCountryClick = useCallback((mapId: string) => {
    if (!interactive) return
    if (restrictCountryClicks && !scopedMapIds.includes(mapId)) return
    const entry = useSvgFallback
      ? getCountryForSvgId(mapId, visibleCountries)
      : visibleCountries.find(country => country.id === mapId)
    if (!entry) return
    onCountryClick?.(entry)
  }, [interactive, onCountryClick, restrictCountryClicks, scopedMapIds, useSvgFallback, visibleCountries])
  const mutedMapIds = useMemo(() => {
    if (!hasScopedCountries) return []
    const activeIds = new Set(scopedMapIds)
    const allIds = useSvgFallback ? mapCountryIds : globeCountryIds
    return allIds.filter(id => !activeIds.has(id))
  }, [globeCountryIds, hasScopedCountries, mapCountryIds, scopedMapIds, useSvgFallback])
  const countryColors = useMemo(() => {
    const colors: Array<readonly [string, string]> = []
    const colorableCountries = highlightedCountryIdSet.size
      ? visibleCountries.filter(country => !highlightedCountryIdSet.has(country.id))
      : visibleCountries
    if (countryColorsById) colors.push(...createCountryColorsById(colorableCountries, countryColorsById, mapCountryIds))
    if (!countryColorsById) colors.push(...createCountryColors(colorableCountries, coloredCountryIds, mapCountryIds, countryColor))
    return colors
  }, [coloredCountryIds, countryColor, countryColorsById, highlightedCountryIdSet, mapCountryIds, visibleCountries])

  const hoveredCountryId = useMemo(() => hoveredGroupMapIds[0] ?? null, [hoveredGroupMapIds])
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
  const zoomIds = useSvgFallback && level === 'continent' && continent && (focusedSubregionId || definition.domainContinents.length > 1)
    ? (focusedSubregionId ? focusMapIds : overviewMapIds)
    : []
  const title = level === 'world' ? 'World' : continent ?? 'Continent'
  const descriptionId = `geography-map-descriptions-${useId().replace(/:/g, '')}`
  const countryDescriptions = useMemo(
    () => countryAccessibleDescriptionsById
      ? visibleCountries
        .filter(country => !hiddenCountryIdSet.has(country.id))
        .map(country => `${country.country}: ${countryAccessibleDescriptionsById.get(country.id) ?? 'No mapped status description.'}`)
      : [],
    [countryAccessibleDescriptionsById, hiddenCountryIdSet, visibleCountries],
  )
  const globeStateChange = useCallback((state: SvgMapLoadState) => {
    if (state === 'error') setUseSvgFallback(true)
    onMapStateChange?.(state)
  }, [onMapStateChange])

  return (
    <div className="space-y-2">
      {useSvgFallback ? (
        <SvgMapView
          svgUrl={definition.svgUrl}
          ariaLabel={ariaLabel ?? `Geography map of ${title}`}
          ariaDescribedBy={countryDescriptions.length ? descriptionId : undefined}
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
          highlightedIds={highlightedSvgIds}
          hiddenIds={hiddenSvgIds}
          hoverableIds={hoverableMapIds}
          selectableIds={selectableMapIds}
          hoveredId={hoveredCountryId}
          mutedIds={mutedMapIds}
          countryColors={countryColors}
          zoomIds={zoomIds}
          zoomPadding={definition.zoomPadding}
          onCountriesLoaded={setMapCountries}
          onLoadStateChange={onMapStateChange}
          onCountryHover={mapId => {
            const group = hoverGroups.find(candidate => candidate.countryIds.includes(mapId ?? ''))
            setMapHoveredGroupId(group?.id ?? null)
            onHoverGroup?.(group?.id ?? null)
          }}
          onCountryClick={handleCountryClick}
        />
      ) : (
        <OrthographicGlobe
          level={level}
          focusCountryIds={focusCountryIds}
          focusKey={`${level}:${continent ?? ''}:${focusedSubregionId ?? ''}:${focusCountryIds.join('.')}`}
          visibleCountryIds={visibleCountries.map(country => country.id)}
          coloredCountryIds={coloredCountryIds}
          countryColor={countryColor}
          countryColorsById={countryColorsById}
          highlightedCountryIds={highlightedCountryIds}
          hiddenCountryIds={hiddenCountryIds}
          mutedCountryIds={mutedMapIds}
          hoveredCountryIds={hoveredGroupMapIds}
          selectableCountryIds={selectableMapIds}
          interactive={interactive}
          ariaLabel={ariaLabel ?? `Geography map of ${title}`}
          ariaDescribedBy={countryDescriptions.length ? descriptionId : undefined}
          onCountryHover={countryId => {
            const group = hoverGroups.find(candidate => candidate.countryIds.includes(countryId ?? ''))
            setMapHoveredGroupId(group?.id ?? null)
            onHoverGroup?.(group?.id ?? null)
          }}
          onCountryClick={handleCountryClick}
          onStateChange={globeStateChange}
        />
      )}
      {countryDescriptions.length > 0 && (
        <ul id={descriptionId} className="sr-only" aria-label={`${title} Country map descriptions`}>
          {countryDescriptions.map(description => <li key={description}>{description}</li>)}
        </ul>
      )}
    </div>
  )
}
