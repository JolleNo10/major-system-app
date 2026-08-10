import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { SvgMapController, type SvgMapCountry } from './SvgMapController'

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
  const mapMountRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<SvgMapController | null>(null)
  const callbacksRef = useRef({ onHoverGroup, onCountryClick })
  const [mapCountries, setMapCountries] = useState<readonly SvgMapCountry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  callbacksRef.current = { onHoverGroup, onCountryClick }

  const handleCountryClick = useCallback((svgId: string) => {
    const entry = getCountryForSvgId(svgId, visibleCountries)
    if (!entry) return
    callbacksRef.current.onCountryClick?.(entry)
  }, [level, visibleCountries])

  useEffect(() => {
    const mount = mapMountRef.current
    if (!mount) return
    let cancelled = false
    const controller = new SvgMapController(mount, {
      countryFill: '#52525b',
      hoverHighlight: true,
      hoverShowName: level !== 'world',
      hoverScope: 'group',
      hoverFill: '#0f766e',
      showHighlightedNames: false,
    })
    controllerRef.current = controller
    setMapCountries([])
    setLoading(true)
    setLoadError(false)

    void controller.load({ url: definition.svgUrl })
      .then(discovered => {
        if (cancelled) return
        const discoveredIds = new Set(discovered.map(country => country.id))
        const groups = level === 'world'
          ? createContinentHoverGroups(visibleCountries, discoveredIds)
          : createSubregionHoverGroups(continent ?? '', visibleCountries, discoveredIds)
        controller.setHoverGroups(groups)
        controller.setCountryHoverHandler(svgId => {
          if (svgId === null) {
            callbacksRef.current.onHoverGroup?.(null)
            return
          }
          const group = controller.getHoverGroups().find(candidate => candidate.countryIds.includes(svgId))
          callbacksRef.current.onHoverGroup?.(group?.id ?? null)
        })
        controller.setCountryClickHandler(handleCountryClick)
        setMapCountries(discovered)
        setLoading(false)
      })
      .catch(error => {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return
        setLoading(false)
        setLoadError(true)
      })

    return () => {
      cancelled = true
      if (controllerRef.current === controller) controllerRef.current = null
      controller.destroy()
    }
  }, [continent, definition, handleCountryClick, level, visibleCountries])

  const mapCountryIds = useMemo(() => mapCountries.map(country => country.id), [mapCountries])
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
  const mutedSvgIds = useMemo(() => {
    const activeIds = focusedSubregionId
      ? new Set(focusSvgIds)
      : selectedSubregionIds !== undefined
        ? new Set(selectedSvgIds)
        : new Set(visibleSvgIds)
    return mapCountryIds.filter(id => !activeIds.has(id))
  }, [focusSvgIds, focusedSubregionId, mapCountryIds, selectedSubregionIds, selectedSvgIds, visibleSvgIds])
  const countryColors = useMemo(() => {
    const colors: Array<readonly [string, string]> = []
    if (selectedSubregionIds !== undefined) {
      colors.push(...createCountryColors(visibleCountries, selectedCountries.map(country => country.id), mapCountryIds, '#0e7490'))
    }
    colors.push(...createCountryColors(visibleCountries, coloredCountryIds, mapCountryIds, countryColor))
    return colors
  }, [coloredCountryIds, countryColor, mapCountryIds, selectedCountries, selectedSubregionIds, visibleCountries])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || mapCountries.length === 0) return
    controller.setHoverableCountries(focusedSubregionId ? focusSvgIds : visibleSvgIds)
    controller.setMutedCountries(mutedSvgIds)
    controller.clearColors()
    if (countryColors.length) controller.setCountryColors(countryColors)
  }, [countryColors, focusSvgIds, focusedSubregionId, mapCountries, mutedSvgIds, visibleSvgIds])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || mapCountries.length === 0) return
    if (!hoveredGroupId) {
      controller.hoverCountry(null)
      return
    }
    const group = controller.getHoverGroups().find(candidate => candidate.id === hoveredGroupId)
    controller.hoverCountry(group?.countryIds[0] ?? null)
  }, [hoveredGroupId, mapCountries])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || mapCountries.length === 0 || level !== 'continent' || !continent) return
    const zoomIds = focusedSubregionId || definition.domainContinents.length > 1
      ? (focusedSubregionId ? focusSvgIds : visibleSvgIds)
      : []
    if (zoomIds.length) controller.setZoomArea(zoomIds, definition.zoomPadding)
    else controller.resetZoom()
  }, [continent, definition, focusSvgIds, focusedSubregionId, level, mapCountries, visibleSvgIds])

  const title = level === 'world' ? 'World' : continent ?? 'Continent'

  return (
    <div className="space-y-2">
      <div
        ref={mapMountRef}
        className={`world-map-svg overflow-hidden rounded-xl border border-zinc-800 bg-[#252525] shadow-lg ${loading || loadError ? 'hidden' : ''}`}
        role="img"
        aria-label={ariaLabel ?? `Geography map of ${title}`}
      />
      {loadError ? (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-sm text-red-300">
          The {definition.label} map could not be loaded.
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-16 text-center text-sm text-zinc-500">
          Loading {definition.label} map…
        </div>
      ) : null}
    </div>
  )
}
