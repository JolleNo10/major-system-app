import { useEffect, useRef, useState } from 'react'
import {
  SvgMapController,
  type SvgMapCountryColors,
  type SvgMapCountry,
  type SvgMapHoverGroup,
  type SvgMapSettings,
} from './SvgMapController'

export type { SvgMapCountry } from './SvgMapController'

const EMPTY_COUNTRY_LABELS: Readonly<Record<string, string>> = {}

export interface SvgMapViewProps {
  svgUrl: string
  highlightedIds?: readonly string[]
  mutedIds?: readonly string[]
  hoverableIds?: readonly string[]
  hoverGroups?: readonly SvgMapHoverGroup[]
  hoveredId?: string | null
  countryColors?: SvgMapCountryColors
  namedIds?: readonly string[]
  countryLabels?: Readonly<Record<string, string>>
  zoomIds?: readonly string[]
  zoomPadding?: number
  settings?: Partial<SvgMapSettings>
  className?: string
  ariaLabel: string
  onCountryClick?: (svgId: string) => void
  onCountryHover?: (svgId: string | null) => void
  onCountriesLoaded?: (countries: readonly SvgMapCountry[]) => void
}

/** Declarative React lifecycle adapter for the imperative SVG map controller. */
export function SvgMapView({
  svgUrl,
  highlightedIds = [],
  mutedIds = [],
  hoverableIds,
  hoverGroups,
  hoveredId = null,
  countryColors = [],
  namedIds = [],
  countryLabels = EMPTY_COUNTRY_LABELS,
  zoomIds = [],
  zoomPadding = 32,
  settings = {},
  className = '',
  ariaLabel,
  onCountryClick,
  onCountryHover,
  onCountriesLoaded,
}: SvgMapViewProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<SvgMapController | null>(null)
  const clickRef = useRef(onCountryClick)
  const hoverRef = useRef(onCountryHover)
  const loadedRef = useRef(onCountriesLoaded)
  const [countries, setCountries] = useState<readonly SvgMapCountry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  clickRef.current = onCountryClick
  hoverRef.current = onCountryHover
  loadedRef.current = onCountriesLoaded

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let cancelled = false
    const controller = new SvgMapController(mount, {
      countryFill: '#52525b',
      showHighlightedNames: false,
      ...settings,
    })
    controllerRef.current = controller
    setCountries([])
    setLoading(true)
    setError(false)

    void controller.load({ url: svgUrl })
      .then(discovered => {
        if (cancelled) return
        controller.setCountryClickHandler(id => clickRef.current?.(id))
        controller.setCountryHoverHandler(id => hoverRef.current?.(id))
        setCountries(discovered)
        loadedRef.current?.(discovered)
        setLoading(false)
      })
      .catch(reason => {
        if (cancelled || (reason instanceof DOMException && reason.name === 'AbortError')) return
        setLoading(false)
        setError(true)
      })

    return () => {
      cancelled = true
      if (controllerRef.current === controller) controllerRef.current = null
      controller.destroy()
    }
  // Controller settings are declarative mutations below; changing the source
  // is the only operation that needs to reload and rediscover the SVG.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgUrl])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || countries.length === 0) return
    controller.updateSettings(settings)
    if (hoverGroups !== undefined) controller.setHoverGroups(hoverGroups)
    if (hoverableIds === undefined) controller.resetHoverableCountries()
    else controller.setHoverableCountries(hoverableIds)
    controller.setHighlighted(highlightedIds)
    controller.setMutedCountries(mutedIds)
    controller.clearColors()
    controller.setCountryColors(countryColors)
    controller.clearCountryLabels()
    if (Object.keys(countryLabels).length) controller.setCountryLabels(countryLabels)
    const previouslyNamed = controller.getNamedIds()
    if (previouslyNamed.length) controller.setNamesVisible(previouslyNamed, false)
    if (namedIds.length) controller.setNamesVisible(namedIds, true)
    if (zoomIds.length) controller.setZoomArea(zoomIds, zoomPadding)
    else controller.resetZoom()
  }, [countries, countryColors, countryLabels, highlightedIds, hoverGroups, hoverableIds, mutedIds, namedIds, settings, zoomIds, zoomPadding])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || countries.length === 0) return
    controller.hoverCountry(hoveredId)
  }, [countries, hoveredId])

  return (
    <div className="space-y-2">
      <div
        ref={mountRef}
        className={`world-map-svg overflow-hidden rounded-xl border border-zinc-800 bg-[#252525] shadow-lg ${loading || error ? 'hidden' : ''} ${className}`}
        role="img"
        aria-label={ariaLabel}
      />
      {error ? (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-12 text-center text-sm text-red-300">
          The map could not be loaded.
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-16 text-center text-sm text-zinc-500">
          Loading map…
        </div>
      ) : null}
    </div>
  )
}
