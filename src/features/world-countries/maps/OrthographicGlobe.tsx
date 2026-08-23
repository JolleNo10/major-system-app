import { geoOrthographic, geoPath, type GeoProjection } from 'd3-geo'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CountryId } from '@/features/world-countries/data/countries'
import {
  getGlobeFeatures,
  getGlobeGeography,
  type GlobeFeature,
} from './globeGeography'
import {
  easeInOutCubic,
  getGlobeFocusAnimationDuration,
  getGlobeTargetPose,
  getGlobeViewportSize,
  exceedsGlobeDragThreshold,
  interpolateGlobePose,
  rotateGlobePose,
  type GlobePose,
} from './globeFocus'

export type OrthographicGlobeState = 'loading' | 'ready' | 'error'

export interface OrthographicGlobeProps {
  level: 'world' | 'continent'
  focusCountryIds: readonly CountryId[]
  focusKey: string
  visibleCountryIds: readonly CountryId[]
  coloredCountryIds: ReadonlySet<CountryId> | readonly CountryId[]
  countryColor: string
  countryColorsById?: ReadonlyMap<CountryId, string>
  highlightedCountryIds: readonly CountryId[]
  hiddenCountryIds: readonly CountryId[]
  mutedCountryIds: readonly CountryId[]
  hoveredCountryIds: readonly CountryId[]
  selectableCountryIds: readonly CountryId[]
  interactive: boolean
  ariaLabel: string
  ariaDescribedBy?: string
  onCountryHover?: (countryId: CountryId | null) => void
  onCountryClick?: (countryId: CountryId) => void
  onStateChange?: (state: OrthographicGlobeState) => void
}

const OCEAN_HIGHLIGHT = '#6FB6E6'
const OCEAN_SHADOW = '#214A6B'
const WARM_BOUNDARY = '#E7D7B4'
const ATMOSPHERE = '#7DB2E4'
const NEUTRAL_HOVER = '#d4d4d8'
const FOCUS_PADDING = 28
const DECORATIVE_LAND_COLORS = ['#E3C78F', '#A9C9A1', '#D99E84', '#C7B6D9']

interface ActivePointer {
  id: number
  countryId: CountryId | null
  x: number
  y: number
  moved: boolean
}

function requestFrame(callback: FrameRequestCallback): number {
  return typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(callback)
    : window.setTimeout(() => callback(performance.now()), 16)
}

function cancelFrame(frame: number | null): void {
  if (frame === null) return
  if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frame)
  else window.clearTimeout(frame)
}

function readPointer(event: PointerEvent): { x: number; y: number } {
  return { x: event.clientX, y: event.clientY }
}

function readCountryId(target: EventTarget | null): CountryId | null {
  if (!(target instanceof Element)) return null
  return target.closest<SVGPathElement>('[data-globe-country]')?.dataset.globeCountry ?? null
}

function hasId(ids: ReadonlySet<CountryId> | readonly CountryId[], id: CountryId): boolean {
  return ids && typeof ids === 'object' && 'has' in ids
    ? (ids as ReadonlySet<CountryId>).has(id)
    : (ids as readonly CountryId[]).includes(id)
}

function decorativeColor(countryId: CountryId): string {
  const index = [...countryId].reduce((total, character) => total + character.charCodeAt(0), 0)
  return DECORATIVE_LAND_COLORS[index % DECORATIVE_LAND_COLORS.length]
}

function reducedMotionPreference(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function OrthographicGlobe({
  level,
  focusCountryIds,
  focusKey,
  visibleCountryIds,
  coloredCountryIds,
  countryColor,
  countryColorsById,
  highlightedCountryIds,
  hiddenCountryIds,
  mutedCountryIds,
  hoveredCountryIds,
  selectableCountryIds,
  interactive,
  ariaLabel,
  ariaDescribedBy,
  onCountryHover,
  onCountryClick,
  onStateChange,
}: OrthographicGlobeProps) {
  const [state, setState] = useState<OrthographicGlobeState>('loading')
  const [features, setFeatures] = useState<readonly GlobeFeature[]>([])
  const mountRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const oceanRef = useRef<SVGCircleElement>(null)
  const atmosphereRef = useRef<SVGCircleElement>(null)
  const shadowRef = useRef<SVGCircleElement>(null)
  const textureRef = useRef<SVGCircleElement>(null)
  const pathRefs = useRef(new Map<CountryId, SVGPathElement>())
  const projectionRef = useRef<GeoProjection | null>(null)
  const poseRef = useRef<GlobePose>({ rotate: [0, 0, 0], scale: 240 })
  const drawFrameRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const animationTokenRef = useRef(0)
  const activePointerRef = useRef<ActivePointer | null>(null)
  const stateCallbackRef = useRef(onStateChange)
  const propsRef = useRef({
    interactive,
    selectableCountryIds,
    onCountryHover,
    onCountryClick,
  })
  const focusRef = useRef({ level, focusCountryIds, focusKey })
  const gradientPrefix = `globe-${useId().replace(/:/g, '')}`

  propsRef.current = { interactive, selectableCountryIds, onCountryHover, onCountryClick }
  focusRef.current = { level, focusCountryIds, focusKey }
  stateCallbackRef.current = onStateChange

  const hiddenSet = useMemo(() => new Set(hiddenCountryIds), [hiddenCountryIds])
  const mutedSet = useMemo(() => new Set(mutedCountryIds), [mutedCountryIds])
  const highlightedSet = useMemo(() => new Set(highlightedCountryIds), [highlightedCountryIds])
  const hoveredSet = useMemo(() => new Set(hoveredCountryIds), [hoveredCountryIds])
  const visibleSet = useMemo(() => new Set(visibleCountryIds), [visibleCountryIds])
  const coloredSet = useMemo(() => new Set(coloredCountryIds), [coloredCountryIds])

  useEffect(() => {
    stateCallbackRef.current?.('loading')
    try {
      const geography = getGlobeGeography()
      setFeatures(geography.features)
      setState('ready')
      stateCallbackRef.current?.('ready')
    } catch {
      setState('error')
      stateCallbackRef.current?.('error')
    }
  }, [])

  const focusFeatures = useMemo(
    () => state === 'ready' ? getGlobeFeatures(focusCountryIds) : [],
    [features, focusCountryIds, state],
  )
  const displayedFeatures = features

  const scheduleDraw = useRef<() => void>(() => undefined)
  scheduleDraw.current = () => {
    if (drawFrameRef.current !== null) return
    drawFrameRef.current = requestFrame(() => {
      drawFrameRef.current = null
      const svg = svgRef.current
      const mount = mountRef.current
      if (!svg || !mount || !projectionRef.current) return
      const rect = mount.getBoundingClientRect()
      const viewport = getGlobeViewportSize(rect.width || mount.clientWidth, rect.height || mount.clientHeight)
      const projection = projectionRef.current
      projection.translate([viewport.width / 2, viewport.height / 2])
      projection.rotate([...poseRef.current.rotate] as [number, number, number])
      projection.scale(poseRef.current.scale)
      const path = geoPath(projection)
      svg.setAttribute('viewBox', `0 0 ${viewport.width} ${viewport.height}`)
      const radius = poseRef.current.scale
      for (const circle of [oceanRef.current, atmosphereRef.current, shadowRef.current, textureRef.current]) {
        circle?.setAttribute('cx', String(viewport.width / 2))
        circle?.setAttribute('cy', String(viewport.height / 2))
      }
      oceanRef.current?.setAttribute('r', String(radius))
      shadowRef.current?.setAttribute('r', String(radius))
      textureRef.current?.setAttribute('r', String(radius))
      atmosphereRef.current?.setAttribute('r', String(radius + 4))
      for (const feature of displayedFeatures) {
        const element = pathRefs.current.get(feature.properties.countryId)
        if (!element) continue
        element.setAttribute('d', path(feature) ?? '')
      }
    })
  }

  const cancelAnimation = () => {
    animationTokenRef.current += 1
    cancelFrame(animationFrameRef.current)
    animationFrameRef.current = null
  }

  const animateTo = (target: GlobePose, duration: number) => {
    cancelAnimation()
    if (duration <= 0) {
      poseRef.current = target
      scheduleDraw.current()
      return
    }
    const token = animationTokenRef.current
    const from = poseRef.current
    const startedAt = performance.now()
    const step = (now: number) => {
      if (token !== animationTokenRef.current) return
      const progress = Math.min(1, (now - startedAt) / duration)
      poseRef.current = interpolateGlobePose(from, target, easeInOutCubic(progress))
      scheduleDraw.current()
      if (progress < 1) animationFrameRef.current = requestFrame(step)
      else animationFrameRef.current = null
    }
    animationFrameRef.current = requestFrame(step)
  }

  useEffect(() => () => {
    cancelFrame(drawFrameRef.current)
    drawFrameRef.current = null
    cancelAnimation()
  // Renderer-local animation and draw work must not outlive the mounted map.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state !== 'ready') return
    projectionRef.current = geoOrthographic().clipAngle(90)
    const viewport = getGlobeViewportSize(
      mountRef.current?.getBoundingClientRect().width ?? 0,
      mountRef.current?.getBoundingClientRect().height ?? 0,
    )
    const target = getGlobeTargetPose({ level, focusFeatures, viewport, padding: FOCUS_PADDING })
    animateTo(target, getGlobeFocusAnimationDuration(reducedMotionPreference()))
    scheduleDraw.current()
  // Focus changes intentionally supersede the previous renderer-local animation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, state])

  useEffect(() => {
    if (state !== 'ready') return
    const mount = mountRef.current
    if (!mount) return
    const resize = () => {
      const viewport = getGlobeViewportSize(mount.getBoundingClientRect().width || mount.clientWidth, mount.getBoundingClientRect().height || mount.clientHeight)
      const target = getGlobeTargetPose({ level: focusRef.current.level, focusFeatures: getGlobeFeatures(focusRef.current.focusCountryIds), viewport, padding: FOCUS_PADDING })
      animateTo({ rotate: poseRef.current.rotate, scale: target.scale }, reducedMotionPreference() ? 0 : 180)
      scheduleDraw.current()
    }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    observer?.observe(mount)
    window.addEventListener('resize', resize)
    resize()
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [state])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const pointerDown = (event: PointerEvent) => {
      if (!propsRef.current.interactive) return
      const point = readPointer(event)
      activePointerRef.current = {
        id: event.pointerId,
        countryId: readCountryId(event.target),
        x: point.x,
        y: point.y,
        moved: false,
      }
      cancelAnimation()
      svg.setPointerCapture?.(event.pointerId)
    }
    const pointerMove = (event: PointerEvent) => {
      const active = activePointerRef.current
      if (!active || active.id !== event.pointerId || !propsRef.current.interactive) return
      const point = readPointer(event)
      const dx = point.x - active.x
      const dy = point.y - active.y
      if (!active.moved && !exceedsGlobeDragThreshold(dx, dy)) return
      active.moved = true
      active.x = point.x
      active.y = point.y
      poseRef.current = rotateGlobePose(poseRef.current, dx, dy)
      scheduleDraw.current()
    }
    const pointerUp = (event: PointerEvent) => {
      const active = activePointerRef.current
      if (!active || active.id !== event.pointerId) return
      activePointerRef.current = null
      svg.releasePointerCapture?.(event.pointerId)
      if (!active.moved && active.countryId && propsRef.current.interactive && hasId(propsRef.current.selectableCountryIds, active.countryId)) {
        propsRef.current.onCountryClick?.(active.countryId)
      }
    }
    const pointerCancel = () => { activePointerRef.current = null }
    svg.addEventListener('pointerdown', pointerDown)
    svg.addEventListener('pointermove', pointerMove)
    svg.addEventListener('pointerup', pointerUp)
    svg.addEventListener('pointercancel', pointerCancel)
    return () => {
      svg.removeEventListener('pointerdown', pointerDown)
      svg.removeEventListener('pointermove', pointerMove)
      svg.removeEventListener('pointerup', pointerUp)
      svg.removeEventListener('pointercancel', pointerCancel)
      cancelAnimation()
      activePointerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (state !== 'ready') return
    scheduleDraw.current()
  }, [state, displayedFeatures, focusFeatures])

  useEffect(() => {
    if (state !== 'ready') return
    for (const feature of displayedFeatures) {
      const id = feature.properties.countryId
      const element = pathRefs.current.get(id)
      if (!element) continue
      const semanticColor = countryColorsById?.get(id)
      const fill = semanticColor ?? (coloredSet.has(id) ? countryColor : decorativeColor(id))
      const hidden = hiddenSet.has(id)
      const selectable = interactive && !hidden && hasId(selectableCountryIds, id)
      const hovered = hoveredSet.has(id)
      const highlighted = highlightedSet.has(id)
      element.style.setProperty('fill', fill)
      element.style.setProperty('stroke', hovered ? NEUTRAL_HOVER : WARM_BOUNDARY)
      element.style.setProperty('stroke-width', highlighted ? '1.8' : hovered ? '1.35' : '0.65')
      element.style.setProperty('stroke-opacity', hidden ? '0' : hovered || highlighted ? '0.95' : '0.72')
      element.style.setProperty('opacity', hidden ? '0' : mutedSet.has(id) ? '0.28' : visibleSet.has(id) ? '1' : '0.58')
      element.style.setProperty('pointer-events', selectable ? 'auto' : 'none')
      element.style.setProperty('cursor', selectable ? 'grab' : 'default')
      element.style.setProperty('visibility', hidden ? 'hidden' : 'visible')
      element.setAttribute('visibility', hidden ? 'hidden' : 'visible')
    }
    scheduleDraw.current()
  }, [coloredSet, countryColor, countryColorsById, displayedFeatures, hiddenSet, highlightedSet, hoveredSet, interactive, mutedSet, selectableCountryIds, state, visibleSet])

  const featureIds = displayedFeatures.map(feature => feature.properties.countryId)

  if (state === 'error') return null

  return (
    <div
      ref={mountRef}
      className="world-map-globe relative min-h-[18rem] overflow-hidden rounded-2xl bg-transparent"
      data-globe-state={state}
    >
      <svg
        ref={svgRef}
        className="block h-full min-h-[18rem] w-full select-none"
        role="img"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-busy={state === 'loading'}
        style={{ touchAction: 'pan-y' }}
      >
        <defs>
          <radialGradient id={`${gradientPrefix}-ocean`} cx="28%" cy="24%" r="78%">
            <stop offset="0%" stopColor={OCEAN_HIGHLIGHT} stopOpacity="0.95" />
            <stop offset="62%" stopColor={OCEAN_SHADOW} stopOpacity="0.92" />
            <stop offset="100%" stopColor="#102b43" stopOpacity="1" />
          </radialGradient>
          <radialGradient id={`${gradientPrefix}-shadow`} cx="24%" cy="18%" r="92%">
            <stop offset="42%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#02070d" stopOpacity="0.68" />
          </radialGradient>
          <pattern id={`${gradientPrefix}-texture`} width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="7" r="0.7" fill="#ffffff" opacity="0.1" />
            <circle cx="18" cy="19" r="0.55" fill="#ffffff" opacity="0.08" />
          </pattern>
        </defs>
        <circle ref={oceanRef} data-globe-ocean fill={`url(#${gradientPrefix}-ocean)`} />
        <g data-globe-land>
          {featureIds.map(countryId => (
            <path
              key={countryId}
              ref={element => {
                if (element) pathRefs.current.set(countryId, element)
                else pathRefs.current.delete(countryId)
              }}
              data-globe-country={countryId}
              onPointerEnter={() => {
                if (interactive && !hiddenSet.has(countryId) && hasId(selectableCountryIds, countryId)) onCountryHover?.(countryId)
              }}
              onPointerLeave={() => onCountryHover?.(null)}
            />
          ))}
        </g>
        <circle ref={textureRef} data-globe-texture fill={`url(#${gradientPrefix}-texture)`} opacity="0.28" pointerEvents="none" />
        <circle ref={shadowRef} data-globe-shadow fill={`url(#${gradientPrefix}-shadow)`} pointerEvents="none" />
        <circle ref={atmosphereRef} data-globe-atmosphere fill="none" stroke={ATMOSPHERE} strokeOpacity="0.34" strokeWidth="4" pointerEvents="none" />
      </svg>
    </div>
  )
}
