import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SvgMapController, type SvgMapCountry } from '@/features/world-countries/maps/SvgMapController'
import { countriesToSvgIds } from '@/features/world-countries/maps/countryMapIds'
import { countries, type Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForContinent, getCountriesForSubregion } from '@/features/world-countries/geography/queries'
import {
  createContinentHoverGroups,
  createCountryColors,
  createSubregionHoverGroups,
  getCountryForSvgId,
  resolveCountriesToSvgIds,
} from '@/features/world-countries/maps/geographyMapAdapter'
import { getMemoMapDefinition, MEMO_MAP_DEFINITIONS } from '@/features/world-countries/maps/mapDefinitions'

export interface MemoMapProps {
  level: 'world' | 'continent'
  continent?: Continent
  selectedSubregion?: SubregionId | null
  memoedCountryIds: ReadonlySet<string>
  hoveredGroupId?: string | null
  onHoverGroup?: (groupId: string | null) => void
  onSelectContinent?: (continent: Continent) => void
  onSelectSubregion?: (subregion: SubregionId) => void
}

export function MemoMap({
  level,
  continent,
  selectedSubregion = null,
  memoedCountryIds,
  hoveredGroupId = null,
  onHoverGroup,
  onSelectContinent,
  onSelectSubregion,
}: MemoMapProps) {
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
  const scopeCountries = useMemo(
    () => level === 'world' || !continent
      ? countries
      : selectedSubregion
        ? getCountriesForSubregion(continent, selectedSubregion, visibleCountries)
        : visibleCountries,
    [continent, level, selectedSubregion, visibleCountries],
  )
  const scopeSvgIds = useMemo(() => countriesToSvgIds(scopeCountries), [scopeCountries])
  const mapMountRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<SvgMapController | null>(null)
  const hoverRef = useRef(onHoverGroup)
  const [mapCountries, setMapCountries] = useState<readonly SvgMapCountry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  hoverRef.current = onHoverGroup

  const handleCountryClick = useCallback((svgId: string) => {
    const entry = getCountryForSvgId(svgId, visibleCountries)
    if (!entry) return
    if (level === 'world') onSelectContinent?.(entry.continent)
    else onSelectSubregion?.(entry.subregionId)
  }, [level, onSelectContinent, onSelectSubregion, visibleCountries])

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
            hoverRef.current?.(null)
            return
          }
          const group = controller.getHoverGroups().find(candidate => candidate.countryIds.includes(svgId))
          hoverRef.current?.(group?.id ?? null)
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

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || mapCountries.length === 0) return
    if (level === 'world') {
      controller.resetHoverableCountries()
      controller.clearMutedCountries()
    } else {
      controller.setHoverableCountries(scopeSvgIds)
      controller.setMutedCountries(
        mapCountries
          .map(country => country.id)
          .filter(id => !scopeSvgIds.includes(id)),
      )
    }
    controller.clearColors()
    controller.setCountryColors(
      createCountryColors(visibleCountries, memoedCountryIds, mapCountries.map(country => country.id), '#16a34a'),
    )
  }, [level, mapCountries, memoedCountryIds, scopeSvgIds, visibleCountries])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || mapCountries.length === 0) return

    if (!hoveredGroupId) {
      controller.hoverCountry(null)
      return
    }

    const group = controller.getHoverGroups().find(candidate => candidate.id === hoveredGroupId)
    // Use the same configured hover behavior as pointer-driven map hover.
    controller.hoverCountry(group?.countryIds[0] ?? null)
  }, [hoveredGroupId, mapCountries])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || mapCountries.length === 0 || level !== 'continent' || !continent) {
      if (controller && level === 'continent') controller.resetZoom()
      return
    }
    const selectedCountries = selectedSubregion
      ? getCountriesForSubregion(continent, selectedSubregion, visibleCountries)
      : getCountriesForContinent(continent, visibleCountries)
    const ids = resolveCountriesToSvgIds(selectedCountries, mapCountries.map(country => country.id))
    if (selectedSubregion || definition.domainContinents.length > 1) {
      controller.setZoomArea(ids, definition.zoomPadding)
    } else {
      controller.resetZoom()
    }
  }, [continent, definition.zoomPadding, level, mapCountries, selectedSubregion, visibleCountries])

  const title = level === 'world' ? 'World' : continent ?? 'Continent'
  const selectedLabel = selectedSubregion
    ? `, focused on ${getSubregionDefinition(selectedSubregion).label}`
    : ''

  return (
    <div className="space-y-2">
      <div
        ref={mapMountRef}
        className={`world-map-svg overflow-hidden rounded-xl border border-zinc-800 bg-[#252525] shadow-lg ${
          loading || loadError ? 'hidden' : ''
        }`}
        role="img"
        aria-label={`Memo map of ${title}${selectedLabel}`}
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
      <div className="flex items-center justify-between gap-3 px-1 text-xs text-zinc-500">
        <span>Hover a country to see its {level === 'world' ? 'Continent' : 'Subregion'}.</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-green-600" /> Countries learned</span>
      </div>
    </div>
  )
}
