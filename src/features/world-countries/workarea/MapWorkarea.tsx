import { useCallback, useEffect, useRef, useState } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { SvgMapController, type SvgMapCountry, type SvgMapHoverScope } from '@/core/maps/SvgMapController'
import { Switch } from '@/core/ui/Switch'
import { MAP_DEFINITIONS } from '@/features/world-countries/common/worldMap'

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
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() => new Set())
  const [showNames, setShowNames] = useState(false)
  const [hoverHighlight, setHoverHighlight] = useState(false)
  const [hoverShowName, setHoverShowName] = useState(false)
  const [hoverScope, setHoverScope] = useState<SvgMapHoverScope>('single')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const mapMountRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<SvgMapController | null>(null)

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
    })
    controllerRef.current = controller
    setAvailableCountries([])
    setSelectedCountries(new Set())
    setLoading(true)
    setLoadError(false)

    void controller.load({ url: definition.svgUrl })
      .then(countries => {
        if (cancelled) return
        controller.setHoverGroups(definition.hoverGroups)
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
    if (result) setSelectedCountries(new Set(result.activeIds))
  }, [])

  const clearHighlights = useCallback(() => {
    const result = controllerRef.current?.clearHighlights()
    if (result) setSelectedCountries(new Set(result.activeIds))
  }, [])

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

  const selectedLabels = availableCountries
    .filter(country => selectedCountries.has(country.id))
    .map(country => country.name)
  const mapLabel = selectedLabels.length
    ? `Map of ${definition.label}. Highlighted: ${selectedLabels.join(', ')}.`
    : `Map of ${definition.label}. No countries highlighted.`

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

        <div className="grid gap-3 border-t border-zinc-800 pt-4 sm:grid-cols-3">
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
    </div>
  )
}
