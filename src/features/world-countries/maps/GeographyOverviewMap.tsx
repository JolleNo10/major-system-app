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
  resolveCountryIdsToSvgIds,
  resolveCountriesToSvgIds,
  resolveSvgIdsOutsideCountryPopulation,
} from './geographyMapAdapter'
import { getMemoMapDefinition, MEMO_MAP_DEFINITIONS } from './mapDefinitions'
import type { SvgMapGroupOutline } from './SvgMapController'
import { SvgMapView, type SvgMapCountry, type SvgMapLoadState } from './SvgMapView'

const GEOGRAPHY_OVERVIEW_HOVER_FILL = '#0f766e'
const GEOGRAPHY_OVERVIEW_HOVER_STROKE = '#d4d4d8'
const GEOGRAPHY_OVERVIEW_SELECTION_STROKE = '#22d3ee'
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
  /** Caller-controlled fill for highlighted Country geometry. */
  highlightFill?: string
  /** Caller-owned Country IDs whose labels should be visible. */
  namedCountryIds?: readonly CountryId[]
  /** Caller-controlled Country IDs used for explicit map fitting. */
  zoomCountryIds?: readonly CountryId[]
  /** Fit a target-centred local neighbourhood without fitting full context bboxes. */
  neighbourhoodZoom?: {
    targetCountryId: CountryId
    contextCountryIds?: readonly CountryId[]
  }
  /** Optional non-color descriptions for the mapped Countries. */
  countryAccessibleDescriptionsById?: ReadonlyMap<CountryId, string>
  /** Optional caller-owned population snapshot; defaults to the active context population. */
  countryPopulation?: readonly Country[]
  /** Caller-controlled Country IDs whose geometry and interaction are hidden. */
  hiddenCountryIds?: readonly CountryId[]
  /** When enabled, hide discovered SVG geometry not represented by the active Country population. */
  hideCountriesOutsidePopulation?: boolean
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
  highlightedCountryIds = [],
  highlightFill,
  namedCountryIds = [],
  zoomCountryIds,
  neighbourhoodZoom,
  countryAccessibleDescriptionsById,
  countryPopulation,
  hiddenCountryIds = [],
  hideCountriesOutsidePopulation = false,
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
  const highlightedCountryIdSet = useMemo(() => new Set(highlightedCountryIds), [highlightedCountryIds])
  const highlightedSvgIds = useMemo(
    () => resolveCountriesToSvgIds(
      visibleCountries.filter(country => highlightedCountryIdSet.has(country.id)),
      mapCountryIds,
    ),
    [highlightedCountryIdSet, mapCountryIds, visibleCountries],
  )
  const namedCountryIdSet = useMemo(() => new Set(namedCountryIds), [namedCountryIds])
  const namedSvgIds = useMemo(
    () => resolveCountriesToSvgIds(
      visibleCountries.filter(country => namedCountryIdSet.has(country.id)),
      mapCountryIds,
    ),
    [mapCountryIds, namedCountryIdSet, visibleCountries],
  )
  const hiddenCountryIdSet = useMemo(() => new Set(hiddenCountryIds), [hiddenCountryIds])
  const explicitlyHiddenSvgIds = useMemo(
    () => resolveCountriesToSvgIds(
      visibleCountries.filter(country => hiddenCountryIdSet.has(country.id)),
      mapCountryIds,
    ),
    [hiddenCountryIdSet, mapCountryIds, visibleCountries],
  )
  const hiddenOutsidePopulationSvgIds = useMemo(
    () => hideCountriesOutsidePopulation
      ? resolveSvgIdsOutsideCountryPopulation(visibleCountries, mapCountryIds)
      : [],
    [hideCountriesOutsidePopulation, mapCountryIds, visibleCountries],
  )
  const hiddenSvgIds = useMemo(
    () => [...new Set([...explicitlyHiddenSvgIds, ...hiddenOutsidePopulationSvgIds])],
    [explicitlyHiddenSvgIds, hiddenOutsidePopulationSvgIds],
  )
  const [mapHoveredGroupId, setMapHoveredGroupId] = useState<string | null>(null)
  const activeHoveredGroupId = interactive ? hoveredGroupId ?? mapHoveredGroupId : null
  const hoveredGroupSvgIds = useMemo(
    () => hoverGroups.find(group => group.id === activeHoveredGroupId)?.countryIds ?? [],
    [activeHoveredGroupId, hoverGroups],
  )
  const hasContinentScope = level === 'continent'
  const hasSelectedCountries = selectedCountryIds !== undefined
  const hasSelectedSubregions = selectedSubregionIds !== undefined && selectedSubregionIds.length > 0
  const hasGeographicSelection = hasContinentScope && selectedCountryIds === undefined && selectedSubregionIds !== undefined
  const hasHoveredSubregionScope = level === 'continent' && Boolean(activeHoveredGroupId)
  const scopedSvgIds = useMemo(() => focusedSubregionId
    ? focusSvgIds
    : hasSelectedCountries
      ? selectedSvgIds
    : hasSelectedSubregions
      ? selectedSvgIds
      : hasHoveredSubregionScope
        ? hoveredGroupSvgIds
        : hasContinentScope
          ? visibleSvgIds
          : [], [focusSvgIds, focusedSubregionId, hasContinentScope, hasHoveredSubregionScope, hasSelectedCountries, hasSelectedSubregions, hoveredGroupSvgIds, selectedSvgIds, visibleSvgIds])
  const hasScopedCountries = Boolean(
    focusedSubregionId || selectedCountryIds !== undefined || selectedSubregionIds !== undefined || hasHoveredSubregionScope || hasContinentScope,
  )
  // Selection controls presentation, not which Countries can be chosen next.
  // A focused Subregion is the sole intentional interaction restriction.
  const hoverableSvgIds = interactive
    ? focusedSubregionId ? focusSvgIds : visibleSvgIds
    : []
  const selectableSvgIds = interactive
    ? focusedSubregionId ? focusSvgIds : visibleSvgIds
    : []
  const restrictCountryClicks = Boolean(
    focusedSubregionId || (selectedSubregionIds === undefined && hasHoveredSubregionScope),
  )
  const handleCountryClick = useCallback((svgId: string) => {
    if (!interactive) return
    if (restrictCountryClicks && !scopedSvgIds.includes(svgId)) return
    const entry = getCountryForSvgId(svgId, visibleCountries)
    if (!entry) return
    onCountryClick?.(entry)
  }, [interactive, onCountryClick, restrictCountryClicks, scopedSvgIds, visibleCountries])
  const mutedSvgIds = useMemo(() => {
    if (!hasScopedCountries) return []
    const activeIds = new Set(
      hasGeographicSelection
        ? [...scopedSvgIds, ...hoveredGroupSvgIds]
        : scopedSvgIds,
    )
    return mapCountryIds.filter(id => !activeIds.has(id))
  }, [hasGeographicSelection, hasScopedCountries, hoveredGroupSvgIds, mapCountryIds, scopedSvgIds])
  const countryColors = useMemo(() => {
    const colors: Array<readonly [string, string]> = []
    const colorableCountries = highlightedCountryIdSet.size
      ? visibleCountries.filter(country => !highlightedCountryIdSet.has(country.id))
      : visibleCountries
    if (countryColorsById) colors.push(...createCountryColorsById(colorableCountries, countryColorsById, mapCountryIds))
    if (!countryColorsById) colors.push(...createCountryColors(colorableCountries, coloredCountryIds, mapCountryIds, countryColor))
    return colors
  }, [coloredCountryIds, countryColor, countryColorsById, highlightedCountryIdSet, mapCountryIds, visibleCountries])

  const hoveredCountryId = useMemo(
    () => hoveredGroupSvgIds[0] ?? null,
    [hoveredGroupSvgIds],
  )
  const selectedGroupIds = useMemo(() => {
    if (!hasGeographicSelection) return new Set<string>()
    const selectedIds = new Set(selectedSvgIds)
    return new Set(
      hoverGroups
        .filter(group => group.countryIds.some(countryId => selectedIds.has(countryId)))
        .map(group => group.id),
    )
  }, [hasGeographicSelection, hoverGroups, selectedSvgIds])
  const groupOutlines = useMemo<readonly SvgMapGroupOutline[]>(
    () => hoverGroups.map(group => {
      const selected = selectedGroupIds.has(group.id)
      return {
        id: group.id,
        countryIds: group.countryIds,
        stroke: selected ? GEOGRAPHY_OVERVIEW_SELECTION_STROKE : GEOGRAPHY_OVERVIEW_HOVER_STROKE,
        strokeWidth: GEOGRAPHY_OVERVIEW_HOVER_STROKE_WIDTH,
        visible: selected || group.id === activeHoveredGroupId,
      }
    }),
    [activeHoveredGroupId, hoverGroups, selectedGroupIds],
  )
  const explicitZoomSvgIds = useMemo(
    () => zoomCountryIds === undefined
      ? []
      : resolveCountryIdsToSvgIds(zoomCountryIds, visibleCountries, mapCountryIds),
    [mapCountryIds, visibleCountries, zoomCountryIds],
  )
  const neighbourhoodTargetCountryId = neighbourhoodZoom?.targetCountryId
  const neighbourhoodContextCountryIds = neighbourhoodZoom?.contextCountryIds
  const targetCentricZoom = useMemo(() => neighbourhoodTargetCountryId
    ? {
      targetIds: resolveCountryIdsToSvgIds([neighbourhoodTargetCountryId], visibleCountries, mapCountryIds),
      contextIds: resolveCountryIdsToSvgIds(neighbourhoodContextCountryIds ?? [], visibleCountries, mapCountryIds),
    }
    : undefined,
  [mapCountryIds, neighbourhoodContextCountryIds, neighbourhoodTargetCountryId, visibleCountries])
  const zoomIds = zoomCountryIds !== undefined
    ? explicitZoomSvgIds
    : level === 'continent' && continent && (focusedSubregionId || definition.domainContinents.length > 1)
      ? (focusedSubregionId ? focusSvgIds : visibleSvgIds)
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
          ...(highlightFill ? { highlightFill } : {}),
        }}
        hoverGroups={hoverGroups}
        groupOutlines={groupOutlines}
        highlightedIds={highlightedSvgIds}
        hiddenIds={hiddenSvgIds}
        hoverableIds={hoverableSvgIds}
        selectableIds={selectableSvgIds}
        hoveredId={hoveredCountryId}
        mutedIds={mutedSvgIds}
        countryColors={countryColors}
        namedIds={namedSvgIds}
        zoomIds={targetCentricZoom ? [] : zoomIds}
        targetCentricZoom={targetCentricZoom}
        zoomPadding={definition.zoomPadding}
        onCountriesLoaded={setMapCountries}
        onLoadStateChange={onMapStateChange}
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
