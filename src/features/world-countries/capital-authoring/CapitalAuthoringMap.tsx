import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { countryToSvgIds } from '@/features/world-countries/maps/countryMapIds'
import type { MemoMapDefinition } from '@/features/world-countries/maps/mapDefinitions'
import { useMapSurfaceExpanded } from '@/features/world-countries/ui/MapSurface'
import { CAPITAL_AUTHORING_GEO_REFERENCES } from './capitalAuthoringReferenceData'
import { clientPointToSvgPoint, parseSvgViewBox, type SvgViewBox } from './capitalAuthoringCoordinates'
import { detectCapitalDotCandidates } from './capitalDotDetection'
import { loadCapitalAuthoringMapSource, type CapitalAuthoringMapSource } from './capitalAuthoringMapSource'
import {
  predictCapitalAuthoringReference,
  type CapitalAuthoringReferencePrediction,
} from './capitalAuthoringReferenceProjection'
import type {
  CapitalAuthoringDetection,
  CapitalAuthoringMapMetadata,
  CapitalAuthoringPlacement,
} from './capitalAuthoringTypes'

const SVG_NS = 'http://www.w3.org/2000/svg'
const FORBIDDEN_ELEMENTS = 'script, foreignObject, iframe, object, embed, image, style'

interface CapitalAuthoringMapProps {
  definition: MemoMapDefinition
  country: Country
  placement?: CapitalAuthoringPlacement
  onSourceReady: (metadata: CapitalAuthoringMapMetadata) => void
  onSourceError: (message: string | null) => void
  onDetection: (detection: CapitalAuthoringDetection) => void
  onMapPoint: (point: { x: number; y: number }) => void
  onCandidateSelect: (candidateId: string) => void
  referenceEnabled?: boolean
  onReferencePrediction?: (prediction: CapitalAuthoringReferencePrediction | null) => void
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  document: Document,
  tagName: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tagName)
}

function markerRadius(svg: SVGSVGElement): number {
  const values = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  const width = values[2] ?? 100
  const height = values[3] ?? 100
  return Math.max(2, Math.min(width, height) * 0.008)
}

function elementsForCountry(svg: SVGSVGElement, country: Country): SVGGraphicsElement[] {
  const ids = new Set(countryToSvgIds(country))
  return [...svg.querySelectorAll<SVGGraphicsElement>('[id]')]
    .filter(element => ids.has(element.id))
}

function getCountryGeometry(svg: SVGSVGElement, country: Country): {
  bounds: SvgViewBox
  point: { x: number; y: number }
} | null {
  const boxes = elementsForCountry(svg, country).flatMap(element => {
    try {
      const box = element.getBBox()
      return Number.isFinite(box.x) && Number.isFinite(box.y)
        && Number.isFinite(box.width) && Number.isFinite(box.height)
        && box.width > 0 && box.height > 0
        ? [box]
        : []
    } catch {
      return []
    }
  })
  if (!boxes.length) return null

  const minX = Math.min(...boxes.map(box => box.x))
  const minY = Math.min(...boxes.map(box => box.y))
  const maxX = Math.max(...boxes.map(box => box.x + box.width))
  const maxY = Math.max(...boxes.map(box => box.y + box.height))
  if (maxX <= minX || maxY <= minY) return null
  return {
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    point: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  }
}

function getCountryBounds(svg: SVGSVGElement, country: Country, padding: number): SvgViewBox | null {
  const geometry = getCountryGeometry(svg, country)
  if (!geometry) return null

  const safePadding = Number.isFinite(padding) ? Math.max(0, padding) : 0
  const minX = geometry.bounds.x - safePadding
  const minY = geometry.bounds.y - safePadding
  const maxX = geometry.bounds.x + geometry.bounds.width + safePadding
  const maxY = geometry.bounds.y + geometry.bounds.height + safePadding
  return maxX > minX && maxY > minY
    ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    : null
}

function applyViewBox(svg: SVGSVGElement, viewBox: SvgViewBox): void {
  svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`)
  svg.style.aspectRatio = `${viewBox.width} / ${viewBox.height}`
}

function applyCurrentCountryHighlight(svg: SVGSVGElement, country: Country): void {
  svg.querySelectorAll<SVGGraphicsElement>('[data-capital-authoring-highlight]').forEach(element => {
    const stroke = element.getAttribute('data-capital-authoring-original-stroke')
    const strokeWidth = element.getAttribute('data-capital-authoring-original-stroke-width')
    const strokeDasharray = element.getAttribute('data-capital-authoring-original-stroke-dasharray')
    if (stroke === null) element.style.removeProperty('stroke')
    else element.style.setProperty('stroke', stroke)
    if (strokeWidth === null) element.style.removeProperty('stroke-width')
    else element.style.setProperty('stroke-width', strokeWidth)
    if (strokeDasharray === null) element.style.removeProperty('stroke-dasharray')
    else element.style.setProperty('stroke-dasharray', strokeDasharray)
    element.removeAttribute('data-capital-authoring-highlight')
    element.removeAttribute('data-capital-authoring-original-stroke')
    element.removeAttribute('data-capital-authoring-original-stroke-width')
    element.removeAttribute('data-capital-authoring-original-stroke-dasharray')
  })
  const elements = elementsForCountry(svg, country)
  for (const element of elements) {
    element.setAttribute('data-capital-authoring-highlight', 'true')
    element.setAttribute('data-capital-authoring-original-stroke', element.style.getPropertyValue('stroke'))
    element.setAttribute('data-capital-authoring-original-stroke-width', element.style.getPropertyValue('stroke-width'))
    element.setAttribute('data-capital-authoring-original-stroke-dasharray', element.style.getPropertyValue('stroke-dasharray'))
    element.style.setProperty('stroke', '#f59e0b', 'important')
    element.style.setProperty('stroke-width', '2', 'important')
    element.style.setProperty('stroke-dasharray', '4 2', 'important')
  }
}

function addCircle(
  document: Document,
  parent: SVGGElement,
  point: { x: number; y: number },
  radius: number,
  fill: string,
  stroke: string,
): SVGCircleElement {
  const circle = createSvgElement(document, 'circle')
  circle.setAttribute('cx', String(point.x))
  circle.setAttribute('cy', String(point.y))
  circle.setAttribute('r', String(radius))
  circle.setAttribute('fill', fill)
  circle.setAttribute('stroke', stroke)
  circle.setAttribute('stroke-width', String(Math.max(1, radius * 0.25)))
  parent.append(circle)
  return circle
}

function addReferenceTarget(
  document: Document,
  parent: SVGGElement,
  prediction: CapitalAuthoringReferencePrediction,
  radius: number,
): void {
  const target = addCircle(document, parent, prediction.target, radius * 2.2, 'rgba(168, 85, 247, 0.12)', '#c084fc')
  target.setAttribute('data-capital-authoring-reference-target', 'true')
  target.setAttribute('data-reference-clue', prediction.clue)
  target.setAttribute('pointer-events', 'none')
  target.setAttribute('stroke-dasharray', String(Math.max(2, radius * 0.8)))

  const horizontal = createSvgElement(document, 'line')
  horizontal.setAttribute('x1', String(prediction.target.x - radius * 3.2))
  horizontal.setAttribute('x2', String(prediction.target.x + radius * 3.2))
  horizontal.setAttribute('y1', String(prediction.target.y))
  horizontal.setAttribute('y2', String(prediction.target.y))
  horizontal.setAttribute('stroke', '#c084fc')
  horizontal.setAttribute('stroke-width', String(Math.max(1, radius * 0.2)))
  horizontal.setAttribute('stroke-dasharray', String(Math.max(2, radius * 0.8)))
  horizontal.setAttribute('pointer-events', 'none')

  const vertical = createSvgElement(document, 'line')
  vertical.setAttribute('x1', String(prediction.target.x))
  vertical.setAttribute('x2', String(prediction.target.x))
  vertical.setAttribute('y1', String(prediction.target.y - radius * 3.2))
  vertical.setAttribute('y2', String(prediction.target.y + radius * 3.2))
  vertical.setAttribute('stroke', '#c084fc')
  vertical.setAttribute('stroke-width', String(Math.max(1, radius * 0.2)))
  vertical.setAttribute('stroke-dasharray', String(Math.max(2, radius * 0.8)))
  vertical.setAttribute('pointer-events', 'none')
  parent.append(horizontal, vertical)
}

function renderAuthoringOverlay(
  svg: SVGSVGElement,
  country: Country,
  detection: CapitalAuthoringDetection,
  placement: CapitalAuthoringPlacement | undefined,
  referencePrediction: CapitalAuthoringReferencePrediction | null,
): void {
  svg.querySelector('[data-capital-authoring-overlay]')?.remove()
  applyCurrentCountryHighlight(svg, country)

  const document = svg.ownerDocument
  const overlay = createSvgElement(document, 'g')
  overlay.setAttribute('data-capital-authoring-overlay', 'true')
  overlay.setAttribute('aria-hidden', 'true')
  const radius = markerRadius(svg)

  for (const candidate of detection.candidates) {
    const marker = addCircle(
      document,
      overlay,
      candidate,
      radius * 1.35,
      candidate.id === placement?.authoring.selectedCandidateId ? '#22c55e' : '#38bdf8',
      '#f8fafc',
    )
    marker.setAttribute('data-capital-authoring-candidate', candidate.id)
    marker.setAttribute('aria-label', `Candidate ${candidate.id}`)
    marker.style.cursor = 'pointer'
  }

  if (referencePrediction) addReferenceTarget(document, overlay, referencePrediction, radius)

  if (placement?.anchor) {
    addCircle(document, overlay, placement.anchor, radius * 1.7, '#ef4444', '#fef2f2')
    const horizontal = createSvgElement(document, 'line')
    horizontal.setAttribute('x1', String(placement.anchor.x - radius * 2.3))
    horizontal.setAttribute('x2', String(placement.anchor.x + radius * 2.3))
    horizontal.setAttribute('y1', String(placement.anchor.y))
    horizontal.setAttribute('y2', String(placement.anchor.y))
    horizontal.setAttribute('stroke', '#fef2f2')
    horizontal.setAttribute('stroke-width', String(Math.max(1, radius * 0.22)))
    const vertical = createSvgElement(document, 'line')
    vertical.setAttribute('x1', String(placement.anchor.x))
    vertical.setAttribute('x2', String(placement.anchor.x))
    vertical.setAttribute('y1', String(placement.anchor.y - radius * 2.3))
    vertical.setAttribute('y2', String(placement.anchor.y + radius * 2.3))
    vertical.setAttribute('stroke', '#fef2f2')
    vertical.setAttribute('stroke-width', String(Math.max(1, radius * 0.22)))
    overlay.append(horizontal, vertical)
  }
  svg.append(overlay)
}

function prepareSvg(markup: string, document: Document): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const root = parsed.documentElement
  if (root.localName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) {
    throw new Error('SVG map source does not contain a valid SVG root')
  }
  root.querySelectorAll(FORBIDDEN_ELEMENTS).forEach(element => element.remove())
  const imported = document.importNode(root, true) as unknown as SVGSVGElement
  imported.setAttribute('aria-hidden', 'true')
  imported.setAttribute('focusable', 'false')
  imported.style.width = '100%'
  return imported
}

export function CapitalAuthoringMap({
  definition,
  country,
  placement,
  onSourceReady,
  onSourceError,
  onDetection,
  onMapPoint,
  onCandidateSelect,
  referenceEnabled = false,
  onReferencePrediction,
}: CapitalAuthoringMapProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [source, setSource] = useState<CapitalAuthoringMapSource | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const expanded = useMapSurfaceExpanded()

  useEffect(() => {
    let cancelled = false
    setSource(null)
    setStatus('loading')
    onSourceError(null)
    void loadCapitalAuthoringMapSource(definition)
      .then(nextSource => {
        if (cancelled) return
        setSource(nextSource)
        setStatus('ready')
        onSourceReady(nextSource.metadata)
      })
      .catch(reason => {
        if (cancelled) return
        const message = reason instanceof Error ? reason.message : 'The map could not be loaded.'
        setStatus('error')
        onSourceError(message)
      })
    return () => {
      cancelled = true
      svgRef.current = null
    }
  }, [definition, onSourceError, onSourceReady])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !source) return
    const svg = prepareSvg(source.markup, mount.ownerDocument)
    mount.replaceChildren(svg)
    svgRef.current = svg
    return () => {
      if (svgRef.current === svg) svgRef.current = null
      svg.remove()
    }
  }, [source])

  useEffect(() => {
    const svg = svgRef.current
    const originalViewBox = source ? parseSvgViewBox(source.metadata.viewBox) : null
    if (!svg || !source || !originalViewBox) return

    const nextViewBox = expanded ? getCountryBounds(svg, country, definition.zoomPadding) : null
    applyViewBox(svg, nextViewBox ?? originalViewBox)
  }, [country, definition, expanded, source])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !source) {
      onReferencePrediction?.(null)
      return
    }
    const detection = detectCapitalDotCandidates(svg, country)
    let referencePrediction: CapitalAuthoringReferencePrediction | null = null
    if (referenceEnabled) {
      const currentGeometry = getCountryGeometry(svg, country)
      if (currentGeometry) {
        const mapCountries = countries.filter(candidate => definition.domainContinents.includes(candidate.continent))
        const calibrations = mapCountries.flatMap(candidate => {
          const reference = CAPITAL_AUTHORING_GEO_REFERENCES[candidate.id]
          const geometry = getCountryGeometry(svg, candidate)
          return reference && geometry
            ? [{ countryId: candidate.id, geographic: reference.countryReference, svg: geometry.point }]
            : []
        })
        referencePrediction = predictCapitalAuthoringReference({
          reference: CAPITAL_AUTHORING_GEO_REFERENCES[country.id],
          countrySvgPoint: currentGeometry.point,
          countrySvgBounds: currentGeometry.bounds,
          calibrations,
        })
      }
    }
    onDetection(detection)
    onReferencePrediction?.(referencePrediction)
    renderAuthoringOverlay(svg, country, detection, placement, referencePrediction)
  }, [country, definition, onDetection, onReferencePrediction, placement, referenceEnabled, source])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (target instanceof Element) {
      const candidateId = target.closest('[data-capital-authoring-candidate]')?.getAttribute('data-capital-authoring-candidate')
      if (candidateId) {
        event.preventDefault()
        onCandidateSelect(candidateId)
        return
      }
    }
    const svg = svgRef.current
    if (!svg) return
    const point = clientPointToSvgPoint(svg, { x: event.clientX, y: event.clientY })
    if (!point) return
    event.preventDefault()
    onMapPoint(point)
  }

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      className="world-map-svg min-h-64 overflow-hidden rounded-2xl border border-zinc-800 bg-[#252525] shadow-lg"
      role="img"
      aria-label={`${definition.label} capital authoring map`}
    >
      {status !== 'ready' && (
        <div role={status === 'error' ? 'alert' : undefined} className={`px-4 py-12 text-center text-sm ${status === 'error' ? 'text-red-300' : 'text-zinc-500'}`}>
          {status === 'error' ? 'The map could not be loaded.' : 'Loading map…'}
        </div>
      )}
    </div>
  )
}
