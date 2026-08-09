import { useCallback, useEffect, useRef, useState } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { SvgMapController, type SvgMapCountry, type SvgMapHoverScope } from '@/features/world-countries/maps/SvgMapController'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, subregionIdFor } from '@/features/world-countries/data/subregions'
import { mapCountryNamesToSvgIds } from '@/features/world-countries/maps/countryMapIds'
import { Switch } from '@/core/ui/Switch'
import { MAP_DEFINITIONS } from '@/features/world-countries/maps/mapDefinitions'

const SCANDINAVIA_OUTLINE_ID = 'scandinavia-demo-outline'
const DEMO_COUNTRY_COLORS: Readonly<Record<string, string>> = {
  Germany: '#ef4444',
  Italy: '#22c55e',
  England: '#a855f7',
  Andorra: '#f97316',
}

export { mapCountryNamesToSvgIds }

export type CountryHierarchy = readonly {
  continent: string
  subregions: readonly {
    name: string
    countries: readonly string[]
  }[]
}[]

function subregionLabel(country: Country): string {
  const id = country.subregionId ?? subregionIdFor(country.subregion)
  return id ? getSubregionDefinition(id).label : country.subregion
}

export function buildCountryHierarchy(source: readonly Country[]): CountryHierarchy {
  const continents = new Map<string, Map<string, string[]>>()

  for (const entry of source) {
    let subregions = continents.get(entry.continent)
    if (!subregions) {
      subregions = new Map()
      continents.set(entry.continent, subregions)
    }

    const name = subregionLabel(entry)
    const countryNames = subregions.get(name) ?? []
    countryNames.push(entry.country)
    subregions.set(name, countryNames)
  }

  return [...continents.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([continent, subregions]) => ({
      continent,
      subregions: [...subregions.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, countryNames]) => ({
          name,
          countries: [...countryNames].sort((left, right) => left.localeCompare(right)),
        })),
    }))
}

const COUNTRY_HIERARCHY = buildCountryHierarchy(countries)

function CountryControls({
  countries,
  selected,
  onToggle,
  onClear,
}: {
  countries: readonly SvgMapCountry[]
  selected: ReadonlySet<string>
  onToggle: (countryId: string) => void
  onClear: () => void
}) {
  return (
    <aside className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="font-semibold text-zinc-100">Countries</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Toggle one or more countries to highlight them on the map.
      </p>

      <div className="mt-4 space-y-2">
        {countries.map(country => {
          const active = selected.has(country.id)
          return (
            <button
              key={country.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(country.id)}
              className={`w-full min-h-[40px] rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                active
                  ? 'border-cyan-500 bg-cyan-600 text-white'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700'
              }`}
            >
              {country.name}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={selected.size === 0}
        onClick={onClear}
        className="mt-4 w-full min-h-[40px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Clear highlights
      </button>
    </aside>
  )
}

export function MapWorkarea() {
  const [regionId, setRegionId] = useState(MAP_DEFINITIONS[0].id)
  const [availableCountries, setAvailableCountries] = useState<readonly SvgMapCountry[]>([])
  const [mapCountries, setMapCountries] = useState<readonly SvgMapCountry[]>([])
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() => new Set())
  const [selectedSubregion, setSelectedSubregion] = useState<string | null>(null)
  const [zoomAreaId, setZoomAreaId] = useState('full')
  const [showNames, setShowNames] = useState(false)
  const [hoverHighlight, setHoverHighlight] = useState(false)
  const [hoverShowName, setHoverShowName] = useState(false)
  const [hoverScope, setHoverScope] = useState<SvgMapHoverScope>('single')
  const [borderHighlight, setBorderHighlight] = useState(false)
  const [groupOutline, setGroupOutline] = useState(false)
  const [colorDemo, setColorDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const mapMountRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<SvgMapController | null>(null)
  const groupOutlineRef = useRef(groupOutline)
  const colorDemoRef = useRef(colorDemo)
  groupOutlineRef.current = groupOutline
  colorDemoRef.current = colorDemo

  const definition = MAP_DEFINITIONS.find(region => region.id === regionId) ?? MAP_DEFINITIONS[0]

  useEffect(() => {
    const mount = mapMountRef.current
    if (!mount) return

    let cancelled = false
    const controller = new SvgMapController(mount, {
      showAllNames: showNames,
      hoverHighlight,
      hoverShowName,
      hoverScope,
      highlightStroke: borderHighlight ? '#22d3ee' : null,
      highlightStrokeWidth: borderHighlight ? '2.5px' : null,
    })
    controllerRef.current = controller
    setAvailableCountries([])
    setMapCountries([])
    setSelectedCountries(new Set())
    setSelectedSubregion(null)
    setZoomAreaId('full')
    setLoading(true)
    setLoadError(false)

    void controller.load({ url: definition.svgUrl })
      .then(countries => {
        if (cancelled) return
        controller.setHoverGroups(definition.hoverGroups)
        controller.setGroupOutlines(
          definition.hoverGroups.map(group => ({
            id: `${group.id}-outline`,
            countryIds: group.countryIds,
            stroke: '#facc15',
            strokeWidth: '4px',
            visible: groupOutlineRef.current,
          })),
        )
        if (colorDemoRef.current) controller.setCountryColors(DEMO_COUNTRY_COLORS)
        setMapCountries(countries)
        const byId = new Map(countries.map(country => [country.id, country]))
        setAvailableCountries(
          definition.demoCountryIds.flatMap(id => {
            const country = byId.get(id)
            return country ? [country] : []
          }),
        )
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
  // Controller settings are kept current by the handlers below; only a map
  // definition change should reload and rediscover the SVG.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition])

  const toggleCountry = useCallback((countryId: string) => {
    const result = controllerRef.current?.toggleHighlighted([countryId])
    if (result) {
      setSelectedSubregion(null)
      setSelectedCountries(new Set(result.activeIds))
    }
  }, [])

  const clearHighlights = useCallback(() => {
    const result = controllerRef.current?.clearHighlights()
    if (result) {
      setSelectedSubregion(null)
      setSelectedCountries(new Set(result.activeIds))
    }
  }, [])

  const highlightSubregion = useCallback((countryNames: readonly string[], subregionName: string) => {
    const result = controllerRef.current?.setHighlighted(mapCountryNamesToSvgIds(countryNames))
    if (!result) return
    setSelectedSubregion(subregionName)
    setSelectedCountries(new Set(result.activeIds))
  }, [])

  const changeZoomArea = useCallback((nextId: string) => {
    setZoomAreaId(nextId)
    if (nextId === 'full') {
      controllerRef.current?.resetZoom()
      return
    }
    const zoomArea = definition.zoomAreas.find(area => area.id === nextId)
    if (zoomArea) controllerRef.current?.setZoomArea(zoomArea.countryIds, zoomArea.padding)
  }, [definition])

  const changeShowNames = useCallback((next: boolean) => {
    setShowNames(next)
    controllerRef.current?.setAllNamesVisible(next)
  }, [])

  const changeHoverHighlight = useCallback((next: boolean) => {
    setHoverHighlight(next)
    controllerRef.current?.updateSettings({ hoverHighlight: next })
  }, [])

  const changeHoverShowName = useCallback((next: boolean) => {
    setHoverShowName(next)
    controllerRef.current?.updateSettings({ hoverShowName: next })
  }, [])

  const changeHoverScope = useCallback((next: SvgMapHoverScope) => {
    setHoverScope(next)
    controllerRef.current?.updateSettings({ hoverScope: next })
  }, [])

  const changeBorderHighlight = useCallback((next: boolean) => {
    setBorderHighlight(next)
    controllerRef.current?.updateSettings({
      highlightStroke: next ? '#22d3ee' : null,
      highlightStrokeWidth: next ? '2.5px' : null,
    })
  }, [])

  const changeGroupOutline = useCallback((next: boolean) => {
    setGroupOutline(next)
    controllerRef.current?.setGroupOutlinesVisible([SCANDINAVIA_OUTLINE_ID], next)
  }, [])

  const changeColorDemo = useCallback((next: boolean) => {
    setColorDemo(next)
    if (next) controllerRef.current?.setCountryColors(DEMO_COUNTRY_COLORS)
    else controllerRef.current?.clearColors()
  }, [])

  useRails({
    right: (
      <CountryControls
        countries={availableCountries}
        selected={selectedCountries}
        onToggle={toggleCountry}
        onClear={clearHighlights}
      />
    ),
    rightLabel: 'Countries',
  }, [availableCountries, selectedCountries, toggleCountry, clearHighlights])

  const selectedLabels = mapCountries
    .filter(country => selectedCountries.has(country.id))
    .map(country => country.name)
  const selectedZoomArea = definition.zoomAreas.find(area => area.id === zoomAreaId)
  const mapTitle = selectedZoomArea
    ? `${definition.label}, zoomed to ${selectedZoomArea.label}`
    : definition.label
  const mapLabel = selectedLabels.length
    ? `Map of ${mapTitle}. Highlighted: ${selectedLabels.join(', ')}.`
    : `Map of ${mapTitle}. No countries highlighted.`

  return (
    <div className="w-full space-y-4 animate-fade-in">
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <label htmlFor="workarea-region" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Work area
            </label>
            <select
              id="workarea-region"
              value={regionId}
              onChange={event => setRegionId(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500 sm:w-52"
            >
              {MAP_DEFINITIONS.map(region => (
                <option key={region.id} value={region.id}>{region.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end sm:pb-2">
            <span className="text-sm text-zinc-300">Show country names</span>
            <Switch
              id="workarea-show-names"
              checked={showNames}
              onChange={changeShowNames}
              label="Show country names"
            />
          </div>
        </div>

        <div className="grid gap-3 border-t border-zinc-800 pt-4 sm:grid-cols-7">
          <div className="flex items-center justify-between gap-3 sm:block">
            <span className="text-sm text-zinc-300 sm:mb-2 sm:block">Border highlight</span>
            <Switch
              id="workarea-border-highlight"
              checked={borderHighlight}
              onChange={changeBorderHighlight}
              label="Show highlighted country borders"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:block">
            <span className="text-sm text-zinc-300 sm:mb-2 sm:block">Group outline</span>
            <Switch
              id="workarea-group-outline"
              checked={groupOutline}
              onChange={changeGroupOutline}
              label="Show Scandinavia outer outline"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:block">
            <span className="text-sm text-zinc-300 sm:mb-2 sm:block">Color demo</span>
            <Switch
              id="workarea-color-demo"
              checked={colorDemo}
              onChange={changeColorDemo}
              label="Assign different colors to demo countries"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:block">
            <span className="text-sm text-zinc-300 sm:mb-2 sm:block">Hover highlight</span>
            <Switch
              id="workarea-hover-highlight"
              checked={hoverHighlight}
              onChange={changeHoverHighlight}
              label="Highlight countries on hover"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:block">
            <span className="text-sm text-zinc-300 sm:mb-2 sm:block">Hover name</span>
            <Switch
              id="workarea-hover-name"
              checked={hoverShowName}
              onChange={changeHoverShowName}
              label="Show country names on hover"
            />
          </div>
          <div>
            <label htmlFor="workarea-hover-scope" className="mb-1.5 block text-sm text-zinc-300">
              Hover scope
            </label>
            <select
              id="workarea-hover-scope"
              value={hoverScope}
              onChange={event => changeHoverScope(event.target.value as SvgMapHoverScope)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-cyan-500"
            >
              <option value="single">Single country</option>
              <option value="group">Configured group</option>
            </select>
          </div>
          <div>
            <label htmlFor="workarea-zoom-area" className="mb-1.5 block text-sm text-zinc-300">
              Zoom area
            </label>
            <select
              id="workarea-zoom-area"
              value={zoomAreaId}
              onChange={event => changeZoomArea(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-cyan-500"
            >
              <option value="full">Full Europe</option>
              {definition.zoomAreas.map(area => (
                <option key={area.id} value={area.id}>{area.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={mapMountRef}
          className={`world-map-svg overflow-hidden rounded-xl border border-zinc-800 bg-[#252525] shadow-lg ${
            loading || loadError ? 'hidden' : ''
          }`}
          role="img"
          aria-label={mapLabel}
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

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="country-overview-heading">
        <div className="border-b border-zinc-800 pb-3">
          <h2 id="country-overview-heading" className="text-lg font-semibold text-zinc-100">
            Country overview
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Continents, subregions, and the countries in each group.
          </p>
        </div>

        <div className="mt-4 space-y-6">
          {COUNTRY_HIERARCHY.map(({ continent, subregions }) => (
            <div key={continent}>
              <h3 className="text-base font-semibold text-cyan-300">
                {continent}
                <span className="ml-2 text-sm font-normal text-zinc-500">
                  ({subregions.reduce((total, subregion) => total + subregion.countries.length, 0)} countries, {subregions.length} subregions)
                </span>
              </h3>
              {continent === 'Europe' ? (
                <p className="mt-2 text-sm text-zinc-500">
                  Click a Europe subregion below to highlight its countries on the map.
                </p>
              ) : null}
              <div className="mt-3 space-y-4 pl-3 sm:pl-4">
                {subregions.map(({ name, countries: countryNames }) => (
                  <div key={name}>
                    {continent === 'Europe' ? (
                      <button
                        type="button"
                        aria-pressed={selectedSubregion === name}
                        disabled={loading || loadError}
                        onClick={() => highlightSubregion(countryNames, name)}
                        className={`flex min-h-[36px] w-full items-center rounded-md px-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          selectedSubregion === name
                            ? 'bg-cyan-900/60 text-cyan-200'
                            : 'text-zinc-200 hover:bg-zinc-800 hover:text-cyan-200'
                        }`}
                      >
                        {name}
                        <span className="ml-2 font-normal text-zinc-500">({countryNames.length} countries)</span>
                      </button>
                    ) : (
                      <h4 className="text-sm font-medium text-zinc-200">
                        {name}
                        <span className="ml-2 font-normal text-zinc-500">({countryNames.length} countries)</span>
                      </h4>
                    )}
                    <ul className="mt-1 grid gap-x-6 gap-y-1 text-sm text-zinc-400 sm:grid-cols-2 lg:grid-cols-3">
                      {countryNames.map(country => (
                        <li key={country}>{country}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
