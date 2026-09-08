import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SvgMapController,
  type SvgMapCountryColors,
  type SvgMapCountry,
  type SvgMapGroupOutline,
  type SvgMapHoverGroup,
  type SvgMapTaskAssistance,
  type SvgMapSettings,
  type SvgMapCameraIntent,
} from './SvgMapController'
import { useMapSurfacePresentation } from '@/features/world-countries/ui/MapSurface'

export type { SvgMapCountry } from './SvgMapController'

export type SvgMapLoadState = 'loading' | 'ready' | 'error'

const EMPTY_COUNTRY_LABELS: Readonly<Record<string, string>> = {}
const EMPTY_IDS: readonly string[] = []
const EMPTY_GROUP_OUTLINES: readonly SvgMapGroupOutline[] = []
const EMPTY_COUNTRY_COLORS: readonly (readonly [string, string | null])[] = []
const EMPTY_SETTINGS: Partial<SvgMapSettings> = {}
const EMBEDDED_MAPCHART_CREDIT_ID = 'credit-text-svg'
const DEFAULT_CAMERA: SvgMapCameraIntent = { kind: 'default' }

export interface SvgMapViewProps {
  svgUrl: string
  highlightedIds?: readonly string[]
  hiddenIds?: readonly string[]
  mutedIds?: readonly string[]
  hoverableIds?: readonly string[]
  selectableIds?: readonly string[]
  hoverGroups?: readonly SvgMapHoverGroup[]
  groupOutlines?: readonly SvgMapGroupOutline[]
  hoveredId?: string | null
  countryColors?: SvgMapCountryColors
  namedIds?: readonly string[]
  countryLabels?: Readonly<Record<string, string>>
  camera?: SvgMapCameraIntent
  settings?: Partial<SvgMapSettings>
  taskAssistance?: SvgMapTaskAssistance | null
  className?: string
  ariaLabel: string
  ariaDescribedBy?: string
  onCountryClick?: (svgId: string) => void
  onCountryHover?: (svgId: string | null) => void
  onCountriesLoaded?: (countries: readonly SvgMapCountry[]) => void
  onLoadStateChange?: (state: SvgMapLoadState) => void
}

/** Declarative React lifecycle adapter for the imperative SVG map controller. */
export function SvgMapView({
  svgUrl,
  highlightedIds = EMPTY_IDS,
  hiddenIds = EMPTY_IDS,
  mutedIds = EMPTY_IDS,
  hoverableIds,
  selectableIds,
  hoverGroups,
  groupOutlines = EMPTY_GROUP_OUTLINES,
  hoveredId = null,
  countryColors = EMPTY_COUNTRY_COLORS,
  namedIds = EMPTY_IDS,
  countryLabels = EMPTY_COUNTRY_LABELS,
  camera = DEFAULT_CAMERA,
  settings = EMPTY_SETTINGS,
  taskAssistance = null,
  className = '',
  ariaLabel,
  ariaDescribedBy,
  onCountryClick,
  onCountryHover,
  onCountriesLoaded,
  onLoadStateChange,
}: SvgMapViewProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<SvgMapController | null>(null)
  const clickRef = useRef(onCountryClick)
  const hoverRef = useRef(onCountryHover)
  const loadedRef = useRef(onCountriesLoaded)
  const loadStateRef = useRef(onLoadStateChange)
  const [countries, setCountries] = useState<readonly SvgMapCountry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const presentation = useMapSurfacePresentation()
  const countryColorsSignature = getCountryColorsSignature(countryColors)
  // Country color presentation is keyed by semantic entries, not the caller's container identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableCountryColors = useMemo(() => countryColors, [countryColorsSignature])

  clickRef.current = onCountryClick
  hoverRef.current = onCountryHover
  loadedRef.current = onCountriesLoaded
  loadStateRef.current = onLoadStateChange

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let cancelled = false
    const viewportElement = mount.closest<HTMLElement>('[data-map-surface-map]') ?? undefined
    const controller = new SvgMapController(mount, {
      countryFill: '#52525b',
      showHighlightedNames: false,
      ...settings,
    }, viewportElement)
    controllerRef.current = controller
    setCountries([])
    setLoading(true)
    setError(false)
    loadStateRef.current?.('loading')

    void controller.load({ url: svgUrl })
      .then(discovered => {
        if (cancelled) return
        controller.setCountryClickHandler(id => clickRef.current?.(id))
        controller.setCountryHoverHandler(id => hoverRef.current?.(id))
        const embeddedCredit = mount.querySelector<SVGElement>(`#${EMBEDDED_MAPCHART_CREDIT_ID}`)
        if (embeddedCredit) {
          embeddedCredit.style.display = 'none'
          embeddedCredit.setAttribute('aria-hidden', 'true')
        }
        setCountries(discovered)
        loadedRef.current?.(discovered)
        setLoading(false)
        loadStateRef.current?.('ready')
      })
      .catch(reason => {
        if (cancelled || (reason instanceof DOMException && reason.name === 'AbortError')) return
        setLoading(false)
        setError(true)
        loadStateRef.current?.('error')
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
    controller.updatePresentation({
      presentation,
      settings,
      hoverGroups,
      groupOutlines,
      hiddenIds,
      hoverableIds,
      selectableIds,
      taskAssistance,
      highlightedIds,
      mutedIds,
      countryColors: stableCountryColors,
      countryLabels,
      namedIds,
      hoveredId,
    })
  }, [countries, countryLabels, groupOutlines, hiddenIds, highlightedIds, hoverGroups, hoveredId, hoverableIds, mutedIds, namedIds, presentation, selectableIds, settings, stableCountryColors, taskAssistance])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || countries.length === 0) return
    controller.setCamera(camera)
  }, [camera, countries])

  const clearMapHover = () => {
    const controller = controllerRef.current
    if (!controller) return
    controller.hoverCountry(null)
    controller.clearTaskHover()
    hoverRef.current?.(null)
  }

  return (
    <div className="space-y-2">
      <div
        ref={mountRef}
        onPointerLeave={clearMapHover}
        onPointerCancel={clearMapHover}
        className={`world-map-svg overflow-hidden rounded-2xl border border-[#25252a] bg-[#252525] shadow-lg ${loading || error ? 'hidden' : ''} ${className}`}
        role="img"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
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

function getCountryColorsSignature(colors: SvgMapCountryColors): string {
  const entries = Symbol.iterator in Object(colors)
    ? [...colors as Iterable<readonly [string, string | null]>]
    : Object.entries(colors)
  return entries
    .map(([id, color]) => `${id}\u0000${color ?? 'null'}`)
    .sort()
    .join('\u0001')
}
