import { getSyntheticDotSourceFingerprint } from './syntheticDots'
import { fitViewBoxToAspect, type SvgViewBoxRect } from './viewBoxFit'

export type SvgMapSource = { url: string } | { markup: string }
export type SvgMapHighlightScope = 'listed' | 'all-except'
export type SvgMapHoverScope = 'single' | 'group'
export type SvgMapPresentation = 'standard' | 'expanded'

export interface SvgMapCountry {
  id: string
  name: string
  pathId: string
  labelId: string
}

export interface SvgMapHoverGroup {
  id: string
  countryIds: readonly string[]
}

export interface SvgMapGroupOutline {
  id: string
  countryIds: readonly string[]
  stroke?: string
  strokeWidth?: string
  visible?: boolean
}

export interface SvgMapZoomArea {
  id: string
  label: string
  countryIds: readonly string[]
  padding?: number
}

export interface SvgMapLearningAnchor {
  sourceSvgId: string
  kind: 'single-dot' | 'multi-dot-representative'
  sourceFingerprint: string
  point?: Readonly<{ x: number; y: number }>
}

export interface SvgMapSyntheticDot {
  sourceSvgId: string
  sourceFingerprint: string
  point: Readonly<{ x: number; y: number }>
}

export interface SvgMapTaskAssistance {
  /** SVG IDs that may be selected by this map-answer task. */
  answerSelectionIds?: readonly string[]
  /** SVG ID whose location is intentionally shown as the task target. */
  taskTargetId?: string | null
  /** Map-owned anchor decisions for the active source asset. */
  learningAnchors?: readonly SvgMapLearningAnchor[]
  /** Map-owned authored points used as task-scoped synthetic dots. */
  syntheticDots?: readonly SvgMapSyntheticDot[]
}

export interface SvgMapSettings {
  countryFill: string | null
  mutedFill: string
  countryStroke: string | null
  labelFill: string | null
  highlightFill: string
  hoverFill: string
  highlightStroke: string | null
  highlightStrokeWidth: string | null
  hoverStroke: string | null
  hoverStrokeWidth: string | null
  showAllNames: boolean
  showHighlightedNames: boolean
  hoverHighlight: boolean
  hoverShowName: boolean
  hoverScope: SvgMapHoverScope
  transitionMs: number
}

export interface SvgMapMutationResult {
  activeIds: readonly string[]
  unknownIds: readonly string[]
}

export interface SvgMapHoverGroupResult {
  groups: readonly SvgMapHoverGroup[]
  unknownIds: readonly string[]
}

export interface SvgMapGroupOutlineResult {
  outlines: readonly SvgMapGroupOutline[]
  unknownIds: readonly string[]
}

export type SvgMapCountryColors =
  | Readonly<Record<string, string | null>>
  | Iterable<readonly [string, string | null]>

export const DEFAULT_SVG_MAP_SETTINGS: Readonly<SvgMapSettings> = Object.freeze({
  countryFill: null,
  mutedFill: '#303036',
  countryStroke: null,
  labelFill: null,
  highlightFill: '#0891b2',
  hoverFill: '#22d3ee',
  highlightStroke: null,
  highlightStrokeWidth: null,
  hoverStroke: null,
  hoverStrokeWidth: null,
  showAllNames: false,
  showHighlightedNames: true,
  hoverHighlight: false,
  hoverShowName: false,
  hoverScope: 'single',
  transitionMs: 120,
})

interface OriginalStyle {
  value: string
  priority: string
}

interface InternalCountry extends SvgMapCountry {
  path: SVGPathElement
  label: SVGTextElement
  originalFill: OriginalStyle
  originalStroke: OriginalStyle
  originalStrokeWidth: OriginalStyle
  originalFilter: OriginalStyle
  originalTransition: OriginalStyle
  originalVisibility: OriginalStyle
  originalPointerEvents: OriginalStyle
  originalLabelDisplay: OriginalStyle
  originalLabelPointerEvents: OriginalStyle
  originalLabelTextNodes: Array<{ node: Text; value: string }>
  labelTextNodeIndex: number
  labelPaint: Array<{
    element: SVGElement
    originalFill: OriginalStyle
  }>
}

interface HoverListeners {
  path: SVGPathElement
  enter: EventListener
  leave: EventListener
  click: EventListener
}

interface SvgPoint {
  x: number
  y: number
}

interface SvgAffineTransform {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

interface AutomaticTaskAnchor {
  sourceFingerprint: string
  point: SvgPoint
}

interface TaskPointerIntent {
  countryId: string
  interactionPointId: string | null
}

interface TaskPathComponent {
  start: SvgPoint
  commands: string[]
}

interface TaskInteractionPoint {
  id: string
  countryId: string
  layerSvg: SVGSVGElement
  centerX: number
  centerY: number
  screenCenterX: number
  screenCenterY: number
  hitRadius: number
  hitRadiusPx: number
  markerRadius: number
  group: SVGGElement
  marker: SVGCircleElement
  ring: SVGCircleElement
  hit: SVGCircleElement
  origin: 'derived' | 'synthetic'
}

interface TaskRepresentativeTarget {
  countryId: string
  layerSvg: SVGSVGElement
  centerX: number
  centerY: number
  markerRadius: number
  group: SVGGElement
  marker: SVGCircleElement
  ring: SVGCircleElement
}

const FORBIDDEN_ELEMENTS = 'script, foreignObject, iframe, object, embed, image, style'
const XLINK_NS = 'http://www.w3.org/1999/xlink'
const TASK_MARKER_TARGET_RADIUS_PX = 5.5
const TASK_MARKER_HOVER_SCALE = 1.25
const TASK_HIT_RADIUS_PX = 12
const COMPACT_GEOMETRY_MAX_DIMENSION = 12
const COMPACT_GEOMETRY_MAX_AREA = COMPACT_GEOMETRY_MAX_DIMENSION ** 2

function transformPoint(matrix: SvgAffineTransform, point: SvgPoint): SvgPoint {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  }
}

const IDENTITY_TRANSFORM: SvgAffineTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

function multiplyTransforms(left: SvgAffineTransform, right: SvgAffineTransform): SvgAffineTransform {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  }
}

function parseSvgTransform(value: string | null): SvgAffineTransform | null {
  if (!value?.trim()) return null
  const matches = value.matchAll(/(matrix|translate|scale)\(([^)]+)\)/g)
  let result = IDENTITY_TRANSFORM
  let found = false
  for (const match of matches) {
    const numbers = match[2].split(/[\s,]+/).map(Number)
    if (numbers.some(number => !Number.isFinite(number))) continue
    const transform = match[1] === 'matrix' && numbers.length >= 6
      ? { a: numbers[0], b: numbers[1], c: numbers[2], d: numbers[3], e: numbers[4], f: numbers[5] }
      : match[1] === 'translate' && numbers.length >= 1
        ? { a: 1, b: 0, c: 0, d: 1, e: numbers[0], f: numbers[1] ?? 0 }
        : match[1] === 'scale' && numbers.length >= 1
          ? { a: numbers[0], b: 0, c: 0, d: numbers.length > 1 ? numbers[1] : numbers[0], e: 0, f: 0 }
          : null
    if (!transform) continue
    result = multiplyTransforms(result, transform)
    found = true
  }
  return found ? result : null
}

function invertTransform(matrix: SvgAffineTransform): SvgAffineTransform | null {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  if (!Number.isFinite(determinant) || Math.abs(determinant) < Number.EPSILON) return null
  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  }
}

/** Count drawn subpaths while treating circle-style `M … m … a …` data as one component. */
function countDrawnPathComponents(pathData: string): number {
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []
  let current: { command: string; numericCount: number; draws: boolean } | null = null
  let components = 0

  const finish = () => {
    if (!current) return
    if (current.draws || current.numericCount > 2) components += 1
  }

  for (const token of tokens) {
    if (/^[a-zA-Z]$/.test(token)) {
      if (token === 'M' || token === 'm') {
        finish()
        current = { command: token, numericCount: 0, draws: false }
      } else if (current) {
        current.draws = true
        current.command = token
      }
      continue
    }
    if (current?.command === 'M' || current?.command === 'm') current.numericCount += 1
  }

  finish()
  return components
}

/**
 * Read circle-style compact subpaths used by distributed tiny geography.
 * The map layer deliberately accepts only compact arc components here; a
 * mainland or ordinary polygon remains authoritative source geometry.
 */
function readPathComponents(pathData: string): TaskPathComponent[] {
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []
  const components: TaskPathComponent[] = []
  let current: { start: SvgPoint | null; commands: string[]; command: string | null; numbers: number[]; hasDrawing: boolean } | null = null
  let lastPoint: SvgPoint = { x: 0, y: 0 }

  const finish = () => {
    if (current?.start) components.push({ start: current.start, commands: current.commands })
    current = null
  }

  for (const token of tokens) {
    if (/^[a-zA-Z]$/.test(token)) {
      if (token === 'M') {
        finish()
        current = { start: null, commands: [], command: 'M', numbers: [], hasDrawing: false }
      } else if (token === 'm') {
        if (current?.hasDrawing) finish()
        if (!current) current = { start: null, commands: [], command: 'm', numbers: [], hasDrawing: false }
        current.command = 'm'
        current.numbers = []
        current.commands.push('m')
      } else if (token.toLowerCase() === 'z') {
        current?.commands.push('z')
        if (current) current.hasDrawing = true
      } else {
        if (!current) continue
        current.command = token
        current.numbers = []
        current.commands.push(token.toLowerCase())
        current.hasDrawing = true
      }
      continue
    }

    if (!current || !current.command) continue
    const number = Number(token)
    if (!Number.isFinite(number)) continue
    current.numbers.push(number)
    if ((current.command === 'M' || current.command === 'm') && current.numbers.length === 2 && !current.start) {
      const [x, y] = current.numbers
      current.start = current.command === 'M'
        ? { x, y }
        : { x: lastPoint.x + x, y: lastPoint.y + y }
      lastPoint = current.start
    } else if ((current.command === 'M' || current.command === 'm') && current.numbers.length > 2) {
      current.hasDrawing = true
    }
  }

  finish()
  return components.filter(component =>
    component.commands.includes('a')
    && component.commands.every(command => command === 'm' || command === 'a' || command === 'z'))
}

function captureStyle(element: SVGElement, property: string): OriginalStyle {
  return {
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }
}

function restoreStyle(element: SVGElement, property: string, original: OriginalStyle): void {
  if (original.value) element.style.setProperty(property, original.value, original.priority)
  else element.style.removeProperty(property)
}

function setOverride(element: SVGElement, property: string, value: string | null, original: OriginalStyle): void {
  if (value === null) restoreStyle(element, property, original)
  else element.style.setProperty(property, value, 'important')
}

function collectTextNodes(element: Element): Text[] {
  const nodes: Text[] = []
  const visit = (node: Node): void => {
    if (node.nodeType === 3) {
      nodes.push(node as Text)
      return
    }
    node.childNodes.forEach(visit)
  }
  visit(element)
  return nodes
}

function uniqueStrings(values: Iterable<string>): string[] {
  return [...new Set(Array.from(values, value => value.trim()).filter(Boolean))]
}

function copyGroup(group: SvgMapHoverGroup): SvgMapHoverGroup {
  return { id: group.id, countryIds: [...group.countryIds] }
}

function copyOutline(outline: SvgMapGroupOutline): SvgMapGroupOutline {
  return {
    id: outline.id,
    countryIds: [...outline.countryIds],
    ...(outline.stroke === undefined ? {} : { stroke: outline.stroke }),
    ...(outline.strokeWidth === undefined ? {} : { strokeWidth: outline.strokeWidth }),
    ...(outline.visible === undefined ? {} : { visible: outline.visible }),
  }
}

export class SvgMapController {
  private readonly mount: HTMLElement
  private readonly viewportElement: HTMLElement
  private settings: SvgMapSettings
  private countries = new Map<string, InternalCountry>()
  private highlighted = new Set<string>()
  private countryColors = new Map<string, string>()
  private mutedCountries = new Set<string>()
  private hiddenCountries = new Set<string>()
  private hoverableCountries: Set<string> | null = null
  private selectableCountries: Set<string> | null = null
  private named = new Set<string>()
  private countryLabelOverrides = new Map<string, string>()
  private hoverGroups: SvgMapHoverGroup[] = []
  private groupOutlines: SvgMapGroupOutline[] = []
  private visibleGroupOutlines = new Set<string>()
  private outlineLayer: SVGGElement | null = null
  private outlineSequence = 0
  private hoveredCountryId: string | null = null
  private hoveredNameOverride: boolean | null = null
  private hoveredIds = new Set<string>()
  private listeners: HoverListeners[] = []
  private taskRepresentativeTargets = new Map<string, TaskRepresentativeTarget>()
  private taskInteractionPoints = new Map<string, TaskInteractionPoint>()
  private taskTargetLayers = new Map<SVGSVGElement, SVGGElement>()
  private taskAnswerSelection = new Set<string>()
  private taskAnswerSelectionConfigured = false
  private taskTargetId: string | null = null
  private taskPointerIntent: TaskPointerIntent | null = null
  private taskAnchorDefinitions = new Map<string, SvgMapLearningAnchor>()
  private taskSyntheticDotDefinitions = new Map<string, SvgMapSyntheticDot>()
  private automaticTaskAnchors = new Map<string, AutomaticTaskAnchor | null>()
  private automaticTaskInteractionPoints = new Map<string, { sourceFingerprint: string; points: readonly SvgPoint[] }>()
  private taskPointerListeners: {
    svg: SVGSVGElement
    move: EventListener
    over: EventListener
    leave: EventListener
    cancel: EventListener
    click: EventListener
  } | null = null
  private resizeObserver: ResizeObserver | null = null
  private countryClickHandler: ((countryId: string) => void) | null = null
  private countryHoverHandler: ((countryId: string | null) => void) | null = null
  private svg: SVGSVGElement | null = null
  private originalViewBox: string | null = null
  private presentation: SvgMapPresentation = 'standard'
  private zoomIntent: { countryIds: readonly string[]; padding: number } | null = null
  private loadVersion = 0
  private abortController: AbortController | null = null
  private destroyed = false
  private discoveryCache: { markup: string; countries: readonly SvgMapCountry[] } | null = null

  constructor(mount: HTMLElement, settings: Partial<SvgMapSettings> = {}, viewportElement: HTMLElement = mount) {
    this.mount = mount
    this.viewportElement = viewportElement
    this.settings = this.mergeSettings(DEFAULT_SVG_MAP_SETTINGS, settings)
  }

  async load(source: SvgMapSource): Promise<readonly SvgMapCountry[]> {
    this.assertUsable()
    const version = ++this.loadVersion
    this.abortController?.abort()
    this.abortController = null

    let markup: string
    if ('markup' in source) {
      markup = source.markup
    } else {
      const abortController = new AbortController()
      this.abortController = abortController
      const response = await fetch(source.url, { signal: abortController.signal })
      if (!response.ok) throw new Error(`SVG map request failed with ${response.status}`)
      markup = await response.text()
    }

    if (version !== this.loadVersion || this.destroyed) return []

    const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml')
    const root = parsed.documentElement
    if (root.localName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) {
      throw new Error('SVG map source does not contain a valid SVG root')
    }
    this.validateSvg(root)

    this.resetMap()
    const imported = this.mount.ownerDocument.importNode(root, true) as unknown as SVGSVGElement
    imported.setAttribute('aria-hidden', 'true')
    imported.setAttribute('focusable', 'false')
    this.mount.replaceChildren(imported)
    this.svg = imported
    this.originalViewBox = imported.getAttribute('viewBox')
    this.syncAspectRatio(this.originalViewBox)
    this.observeResize()
    this.bindDiscoveredCountries(imported, markup)
    this.attachHoverListeners()
    this.attachTaskPointerListeners(imported)
    this.render()

    return this.getCountries()
  }

  getCountries(): readonly SvgMapCountry[] {
    return [...this.countries.values()].map(({ id, name, pathId, labelId }) => ({
      id, name, pathId, labelId,
    }))
  }

  /** Returns the cached country metadata for the currently loaded SVG. */
  discoverCountries(): readonly SvgMapCountry[] {
    this.assertUsable()
    return this.getCountries()
  }

  getHighlightedIds(): readonly string[] {
    return [...this.highlighted]
  }

  getCountryColors(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.countryColors)
  }

  getNamedIds(): readonly string[] {
    return [...this.named]
  }

  /** Keep a retained camera intent fitted to the current map presentation. */
  setPresentation(presentation: SvgMapPresentation): void {
    this.assertUsable()
    this.presentation = presentation
    this.recomputeViewBox()
  }

  setZoomArea(countryIds: Iterable<string>, padding = 40): SvgMapMutationResult {
    this.assertUsable()
    const { knownIds, unknownIds } = this.resolveKnown(countryIds)
    if (knownIds.length === 0 || !this.svg || !this.originalViewBox) {
      return { activeIds: [], unknownIds }
    }

    const safePadding = Number.isFinite(padding) ? Math.max(0, padding) : 0
    const target = this.getPaddedCountryBounds(knownIds, safePadding)
    if (!target) return { activeIds: knownIds, unknownIds }
    this.zoomIntent = { countryIds: knownIds, padding: safePadding }
    this.recomputeViewBox(target)
    return { activeIds: knownIds, unknownIds }
  }

  resetZoom(): void {
    this.assertUsable()
    this.zoomIntent = null
    this.recomputeViewBox()
  }

  setHighlighted(
    ids: Iterable<string>,
    scope: SvgMapHighlightScope = 'listed',
  ): SvgMapMutationResult {
    this.assertUsable()
    const { targetIds, unknownIds } = this.resolveTarget(ids, scope)
    this.highlighted = new Set(targetIds)
    this.render()
    return { activeIds: this.getHighlightedIds(), unknownIds }
  }

  toggleHighlighted(
    ids: Iterable<string>,
    scope: SvgMapHighlightScope = 'listed',
  ): SvgMapMutationResult {
    this.assertUsable()
    const { targetIds, unknownIds } = this.resolveTarget(ids, scope)
    for (const id of targetIds) {
      if (this.highlighted.has(id)) this.highlighted.delete(id)
      else this.highlighted.add(id)
    }
    this.render()
    return { activeIds: this.getHighlightedIds(), unknownIds }
  }

  clearHighlights(): SvgMapMutationResult {
    this.assertUsable()
    this.highlighted.clear()
    this.render()
    return { activeIds: [], unknownIds: [] }
  }

  setCountryColors(colors: SvgMapCountryColors): SvgMapMutationResult {
    this.assertUsable()
    const unknownIds: string[] = []
    for (const [rawId, color] of this.toColorEntries(colors)) {
      const id = rawId.trim()
      if (!id) continue
      if (!this.countries.has(id)) {
        unknownIds.push(id)
        continue
      }
      if (color === null) this.countryColors.delete(id)
      else this.countryColors.set(id, color)
    }
    this.render()
    return { activeIds: [...this.countryColors.keys()], unknownIds: uniqueStrings(unknownIds) }
  }

  /** Restrict generic muted/de-emphasized rendering to known country IDs. */
  setMutedCountries(ids: Iterable<string>): SvgMapMutationResult {
    this.assertUsable()
    const { knownIds, unknownIds } = this.resolveKnown(ids)
    this.mutedCountries = new Set(knownIds)
    this.render()
    return { activeIds: [...this.mutedCountries], unknownIds }
  }

  clearMutedCountries(): SvgMapMutationResult {
    this.assertUsable()
    this.mutedCountries.clear()
    this.render()
    return { activeIds: [], unknownIds: [] }
  }

  /** Hide caller-selected Country geometry and suppress its interaction. */
  setHiddenCountries(ids: Iterable<string>): SvgMapMutationResult {
    this.assertUsable()
    const { knownIds, unknownIds } = this.resolveKnown(ids)
    this.hiddenCountries = new Set(knownIds)
    if (this.hoveredCountryId !== null && !this.isHoverable(this.hoveredCountryId)) {
      this.hoveredCountryId = null
      this.hoveredNameOverride = null
    }
    this.refreshHoveredIds()
    this.render()
    return { activeIds: this.getHiddenCountryIds(), unknownIds }
  }

  getHiddenCountryIds(): readonly string[] {
    return [...this.hiddenCountries]
  }

  clearHiddenCountries(): SvgMapMutationResult {
    this.assertUsable()
    this.hiddenCountries.clear()
    this.refreshHoveredIds()
    this.render()
    return { activeIds: [], unknownIds: [] }
  }

  clearColors(): SvgMapMutationResult {
    this.assertUsable()
    this.countryColors.clear()
    this.render()
    return { activeIds: [], unknownIds: [] }
  }

  clearHighlightsAndColors(): SvgMapMutationResult {
    this.assertUsable()
    this.highlighted.clear()
    this.countryColors.clear()
    this.render()
    return { activeIds: [], unknownIds: [] }
  }

  setNamesVisible(ids: Iterable<string>, visible = true): SvgMapMutationResult {
    this.assertUsable()
    const { knownIds, unknownIds } = this.resolveKnown(ids)
    for (const id of knownIds) {
      if (visible) this.named.add(id)
      else this.named.delete(id)
    }
    this.render()
    return { activeIds: this.getNamedIds(), unknownIds }
  }

  /** Set temporary display labels without changing discovered country metadata. */
  setCountryLabels(labels: Readonly<Record<string, string>>): SvgMapMutationResult {
    this.assertUsable()
    const unknownIds: string[] = []
    for (const [rawId, label] of Object.entries(labels)) {
      const id = rawId.trim()
      if (!id) continue
      if (!this.countries.has(id)) {
        unknownIds.push(id)
        continue
      }
      this.countryLabelOverrides.set(id, label)
    }
    this.render()
    return { activeIds: [...this.countryLabelOverrides.keys()], unknownIds: uniqueStrings(unknownIds) }
  }

  clearCountryLabels(): SvgMapMutationResult {
    this.assertUsable()
    this.countryLabelOverrides.clear()
    this.render()
    return { activeIds: [], unknownIds: [] }
  }

  /** Restrict pointer-driven hover effects to a generic allowlist of country IDs. */
  setHoverableCountries(ids: Iterable<string>): SvgMapMutationResult {
    this.assertUsable()
    const { knownIds, unknownIds } = this.resolveKnown(ids)
    this.hoverableCountries = new Set(knownIds)
    if (this.hoveredCountryId !== null && !this.isHoverable(this.hoveredCountryId)) {
      this.hoveredCountryId = null
      this.hoveredNameOverride = null
    }
    this.refreshHoveredIds()
    this.render()
    return { activeIds: [...this.hoverableCountries], unknownIds }
  }

  /** Restore pointer-driven hover effects for every discovered country. */
  resetHoverableCountries(): void {
    this.assertUsable()
    this.hoverableCountries = null
    this.refreshHoveredIds()
    this.render()
  }

  /** Restrict generic Country selection to a caller-owned set of SVG IDs. */
  setSelectableCountries(ids: Iterable<string>): SvgMapMutationResult {
    this.assertUsable()
    const { knownIds, unknownIds } = this.resolveKnown(ids)
    this.selectableCountries = new Set(knownIds)
    this.render()
    return { activeIds: [...this.selectableCountries], unknownIds }
  }

  /** Restore handler-driven selection for every discovered Country. */
  resetSelectableCountries(): void {
    this.assertUsable()
    this.selectableCountries = null
    this.render()
  }

  /** Configure explicit answer/target semantics for learning-task assistance. */
  setTaskAssistance(assistance: SvgMapTaskAssistance | null = null): SvgMapMutationResult {
    this.assertUsable()
    const answerSelection = assistance?.answerSelectionIds ?? []
    const { knownIds, unknownIds } = this.resolveKnown(answerSelection)
    const requestedTarget = assistance?.taskTargetId?.trim() || null
    const taskTargetUnknown = requestedTarget !== null && !this.countries.has(requestedTarget)
      ? [requestedTarget]
      : []

    const anchors = assistance?.learningAnchors ?? []
    const normalizedAnchors = new Map<string, SvgMapLearningAnchor>()
    for (const anchor of anchors) {
      const sourceSvgId = anchor.sourceSvgId.trim()
      if (!sourceSvgId) continue
      if (!this.countries.has(sourceSvgId)) {
        unknownIds.push(sourceSvgId)
        continue
      }
      if (normalizedAnchors.has(sourceSvgId)) {
        throw new Error(`Duplicate task learning anchor for ${sourceSvgId}`)
      }
      this.validateTaskLearningAnchor({ ...anchor, sourceSvgId })
      normalizedAnchors.set(sourceSvgId, { ...anchor, sourceSvgId })
    }

    const syntheticDots = assistance?.syntheticDots ?? []
    const normalizedSyntheticDots = new Map<string, SvgMapSyntheticDot>()
    for (const dot of syntheticDots) {
      const sourceSvgId = dot.sourceSvgId.trim()
      if (!sourceSvgId) continue
      if (!this.countries.has(sourceSvgId)) {
        unknownIds.push(sourceSvgId)
        continue
      }
      if (normalizedSyntheticDots.has(sourceSvgId)) {
        throw new Error(`Duplicate task synthetic dot for ${sourceSvgId}`)
      }
      this.validateTaskSyntheticDot({ ...dot, sourceSvgId })
      normalizedSyntheticDots.set(sourceSvgId, { ...dot, sourceSvgId })
    }

    this.taskAnswerSelection = new Set(knownIds)
    this.taskAnswerSelectionConfigured = assistance?.answerSelectionIds !== undefined
    this.taskTargetId = taskTargetUnknown.length ? null : requestedTarget
    for (const countryId of this.taskRepresentativeTargets.keys()) this.removeTaskRepresentativeTarget(countryId)
    for (const pointId of this.taskInteractionPoints.keys()) this.removeTaskInteractionPoint(pointId)
    this.removeTaskTargetLayers()
    this.taskPointerIntent = null
    this.taskAnchorDefinitions = normalizedAnchors
    this.taskSyntheticDotDefinitions = normalizedSyntheticDots
    this.render()
    return { activeIds: [...this.taskAnswerSelection], unknownIds: uniqueStrings([...unknownIds, ...taskTargetUnknown]) }
  }

  /** Clear task-only hover state when the pointer leaves the map surface. */
  clearTaskHover(): void {
    this.assertUsable()
    this.setTaskPointerIntent(null)
  }

  toggleNames(ids: Iterable<string>): SvgMapMutationResult {
    this.assertUsable()
    const { knownIds, unknownIds } = this.resolveKnown(ids)
    for (const id of knownIds) {
      if (this.named.has(id)) this.named.delete(id)
      else this.named.add(id)
    }
    this.render()
    return { activeIds: this.getNamedIds(), unknownIds }
  }

  setAllNamesVisible(visible: boolean): void {
    this.assertUsable()
    this.settings = { ...this.settings, showAllNames: visible }
    this.render()
  }

  /** Register a framework-neutral callback for clicks on discovered countries. */
  setCountryClickHandler(handler: ((countryId: string) => void) | null): void {
    this.assertUsable()
    this.countryClickHandler = handler
    this.render()
  }

  /** Register a framework-neutral callback for pointer hover on discovered countries. */
  setCountryHoverHandler(handler: ((countryId: string | null) => void) | null): void {
    this.assertUsable()
    this.countryHoverHandler = handler
  }

  setHoverGroups(groups: readonly SvgMapHoverGroup[]): SvgMapHoverGroupResult {
    this.assertUsable()
    const unknownIds = new Set<string>()
    const normalized = new Map<string, SvgMapHoverGroup>()

    for (const group of groups) {
      const groupId = group.id.trim()
      if (!groupId) continue
      const countryIds = uniqueStrings(group.countryIds).filter(id => {
        const known = this.countries.has(id)
        if (!known) unknownIds.add(id)
        return known
      })
      normalized.set(groupId, { id: groupId, countryIds })
    }

    this.hoverGroups = [...normalized.values()]
    this.refreshHoveredIds()
    this.render()
    return { groups: this.getHoverGroups(), unknownIds: [...unknownIds] }
  }

  getHoverGroups(): readonly SvgMapHoverGroup[] {
    return this.hoverGroups.map(copyGroup)
  }

  setGroupOutlines(groups: readonly SvgMapGroupOutline[]): SvgMapGroupOutlineResult {
    this.assertUsable()
    const unknownIds = new Set<string>()
    const normalized = new Map<string, SvgMapGroupOutline>()

    for (const outline of groups) {
      const groupId = outline.id.trim()
      if (!groupId) continue
      const countryIds = uniqueStrings(outline.countryIds).filter(id => {
        const known = this.countries.has(id)
        if (!known) unknownIds.add(id)
        return known
      })
      normalized.set(groupId, {
        id: groupId,
        countryIds,
        ...(outline.stroke === undefined ? {} : { stroke: outline.stroke }),
        ...(outline.strokeWidth === undefined ? {} : { strokeWidth: outline.strokeWidth }),
        ...(outline.visible === undefined ? {} : { visible: outline.visible }),
      })
      if (outline.visible) this.visibleGroupOutlines.add(groupId)
      else this.visibleGroupOutlines.delete(groupId)
    }

    this.groupOutlines = [...normalized.values()]
    this.visibleGroupOutlines.forEach(id => {
      if (!normalized.has(id)) this.visibleGroupOutlines.delete(id)
    })
    this.render()
    return { outlines: this.getGroupOutlines(), unknownIds: [...unknownIds] }
  }

  getGroupOutlines(): readonly SvgMapGroupOutline[] {
    return this.groupOutlines.map(copyOutline)
  }

  getVisibleGroupOutlineIds(): readonly string[] {
    return [...this.visibleGroupOutlines]
  }

  setGroupOutlinesVisible(ids: Iterable<string>, visible = true): SvgMapMutationResult {
    this.assertUsable()
    const { knownIds, unknownIds } = this.resolveOutlineIds(ids)
    for (const id of knownIds) {
      if (visible) this.visibleGroupOutlines.add(id)
      else this.visibleGroupOutlines.delete(id)
    }
    this.render()
    return { activeIds: this.getVisibleGroupOutlineIds(), unknownIds }
  }

  clearGroupOutlines(): SvgMapGroupOutlineResult {
    this.assertUsable()
    this.groupOutlines = []
    this.visibleGroupOutlines.clear()
    this.render()
    return { outlines: [], unknownIds: [] }
  }

  updateSettings(settings: Partial<SvgMapSettings>): void {
    this.assertUsable()
    this.settings = this.mergeSettings(this.settings, settings)
    this.refreshHoveredIds()
    this.render()
  }

  hoverCountry(id: string | null, showName?: boolean): SvgMapMutationResult {
    this.assertUsable()
    if (id !== null && !this.countries.has(id)) {
      return { activeIds: [], unknownIds: [id] }
    }
    this.setHoveredCountry(id, showName)
    return { activeIds: [...this.hoveredIds], unknownIds: [] }
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.loadVersion++
    this.abortController?.abort()
    this.abortController = null
    this.resetMap()
  }

  private assertUsable(): void {
    if (this.destroyed) throw new Error('SvgMapController has been destroyed')
  }

  private mergeSettings(
    current: Readonly<SvgMapSettings>,
    patch: Partial<SvgMapSettings>,
  ): SvgMapSettings {
    const merged = { ...current, ...patch }
    return {
      ...merged,
      transitionMs: Number.isFinite(merged.transitionMs)
        ? Math.max(0, merged.transitionMs)
        : current.transitionMs,
    }
  }

  private validateSvg(root: Element): void {
    if (root.querySelector(FORBIDDEN_ELEMENTS)) {
      throw new Error('SVG map contains unsupported executable or embedded content')
    }

    for (const element of [root, ...root.querySelectorAll('*')]) {
      const references = [
        element.getAttribute('href'),
        element.getAttribute('src'),
        element.getAttributeNS(XLINK_NS, 'href'),
      ].filter((value): value is string => value !== null && value.trim() !== '')
      if (references.some(value => !value.trim().startsWith('#'))) {
        throw new Error('SVG map contains an external reference')
      }
    }
  }

  private bindDiscoveredCountries(svg: SVGSVGElement, markup: string): void {
    const discovered = this.discoveryCache?.markup === markup
      ? this.discoveryCache.countries
      : this.extractCountryDefinitions(svg)
    if (!this.discoveryCache || this.discoveryCache.markup !== markup) {
      this.discoveryCache = { markup, countries: discovered }
    }

    for (const definition of discovered) {
      const path = this.findElementById(svg, definition.pathId) as SVGPathElement | null
      const label = this.findElementById(svg, definition.labelId) as SVGTextElement | null
      if (!path || !label) continue
      const parent = label.parentElement
      if (!parent) continue
      const paths = [...parent.children].filter(
        (child): child is SVGPathElement => child.localName.toLowerCase() === 'path',
      )
      if (paths.length !== 1 || paths[0] !== path || this.countries.has(definition.id)) continue

      const labelPaintElements = [label, ...label.querySelectorAll<SVGElement>('tspan')]
      const originalLabelTextNodes = collectTextNodes(label).map(node => ({ node, value: node.data }))
      this.countries.set(definition.id, {
        ...definition,
        path,
        label,
        originalFill: captureStyle(path, 'fill'),
        originalStroke: captureStyle(path, 'stroke'),
        originalStrokeWidth: captureStyle(path, 'stroke-width'),
        originalFilter: captureStyle(path, 'filter'),
        originalTransition: captureStyle(path, 'transition'),
        originalVisibility: captureStyle(path, 'visibility'),
        originalPointerEvents: captureStyle(path, 'pointer-events'),
        originalLabelDisplay: captureStyle(label, 'display'),
        originalLabelPointerEvents: captureStyle(label, 'pointer-events'),
        originalLabelTextNodes,
        labelTextNodeIndex: Math.max(0, originalLabelTextNodes.findIndex(entry => entry.value.trim() !== '')),
        labelPaint: labelPaintElements.map(element => ({
          element,
          originalFill: captureStyle(element, 'fill'),
        })),
      })
    }
  }

  private findElementById(root: SVGSVGElement, id: string): Element | null {
    // SVGSVGElement#getElementById is not implemented consistently across
    // browsers and DOM test environments. The attribute comparison fallback
    // is also safe for IDs containing punctuation that needs CSS escaping.
    const native = root.getElementById?.(id)
    if (native) return native
    return [...root.querySelectorAll<SVGElement>('[id]')].find(element => element.id === id) ?? null
  }

  private extractCountryDefinitions(svg: SVGSVGElement): readonly SvgMapCountry[] {
    const countries: SvgMapCountry[] = []
    const labels = svg.querySelectorAll<SVGTextElement>('text[id$="_label"]')
    for (const label of labels) {
      const parent = label.parentElement
      if (!parent) continue
      const paths = [...parent.children].filter(
        (child): child is SVGPathElement => child.localName.toLowerCase() === 'path',
      )
      if (paths.length !== 1) continue
      const path = paths[0]
      const id = path.id.trim()
      const labelId = label.id.trim()
      const name = (label.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (!id || !labelId || !name || countries.some(country => country.id === id)) continue
      countries.push({ id, name, pathId: id, labelId })
    }
    return countries
  }

  private attachHoverListeners(): void {
    for (const country of this.countries.values()) {
      const enter: EventListener = () => {
        if (!this.isHoverable(country.id)) {
          const hadHover = this.hoveredCountryId !== null || this.hoveredIds.size > 0
          this.setHoveredCountry(null)
          if (hadHover) this.countryHoverHandler?.(null)
          return
        }
        this.setHoveredCountryAndNotify(country.id)
      }
      const leave: EventListener = () => {
        if (this.hoveredCountryId !== country.id) return
        this.setHoveredCountryAndNotify(null)
      }
      const click: EventListener = () => {
        // Answer-selection clicks are resolved once by the map-level task
        // pointer resolver. Source paths remain the generic-map seam only.
        if (this.taskAnswerSelectionConfigured) return
        if (this.isSelectableForTask(country.id)) this.countryClickHandler?.(country.id)
      }
      country.path.addEventListener('pointerenter', enter)
      country.path.addEventListener('pointerleave', leave)
      country.path.addEventListener('click', click)
      this.listeners.push({ path: country.path, enter, leave, click })
    }
  }

  private detachHoverListeners(): void {
    for (const { path, enter, leave, click } of this.listeners) {
      path.removeEventListener('pointerenter', enter)
      path.removeEventListener('pointerleave', leave)
      path.removeEventListener('click', click)
    }
    this.listeners = []
  }

  private setHoveredCountry(id: string | null, showName?: boolean): void {
    this.hoveredNameOverride = id === null || showName === undefined ? null : showName
    if (id !== null && !this.isHoverable(id)) {
      this.hoveredCountryId = null
      this.hoveredNameOverride = null
      this.hoveredIds.clear()
      this.render()
      return
    }
    if (!this.settings.hoverHighlight && !this.settings.hoverShowName && this.hoveredNameOverride !== true) {
      this.hoveredCountryId = null
      this.hoveredIds.clear()
      this.render()
      return
    }
    this.hoveredCountryId = id
    this.refreshHoveredIds()
    this.render()
  }

  private refreshHoveredIds(): void {
    this.hoveredIds.clear()
    const id = this.hoveredCountryId
    if (!id || !this.isHoverable(id)
      || (!this.settings.hoverHighlight && !this.settings.hoverShowName && this.hoveredNameOverride !== true)) return

    if (this.settings.hoverScope === 'single') {
      this.hoveredIds.add(id)
      return
    }

    for (const group of this.hoverGroups) {
      if (!group.countryIds.includes(id)) continue
      for (const countryId of group.countryIds) {
        if (this.isHoverable(countryId)) this.hoveredIds.add(countryId)
      }
    }
    if (this.hoveredIds.size === 0) this.hoveredIds.add(id)
  }

  private resolveKnown(ids: Iterable<string>): { knownIds: string[]; unknownIds: string[] } {
    const knownIds: string[] = []
    const unknownIds: string[] = []
    for (const id of uniqueStrings(ids)) {
      if (this.countries.has(id)) knownIds.push(id)
      else unknownIds.push(id)
    }
    return { knownIds, unknownIds }
  }

  private isHoverable(id: string): boolean {
    return !this.hiddenCountries.has(id)
      && (this.hoverableCountries === null || this.hoverableCountries.has(id))
  }

  private isSelectable(id: string): boolean {
    return !this.hiddenCountries.has(id)
      && (this.selectableCountries === null
        ? this.countryClickHandler !== null
        : this.selectableCountries.has(id))
  }

  private isSelectableForTask(id: string): boolean {
    if (!this.isSelectable(id)) return false
    return !this.taskAnswerSelectionConfigured || this.taskAnswerSelection.has(id)
  }

  private isTaskCandidate(id: string): boolean {
    return this.taskAnswerSelectionConfigured && this.taskAnswerSelection.has(id) && this.isSelectable(id)
  }

  private resolveOutlineIds(ids: Iterable<string>): { knownIds: string[]; unknownIds: string[] } {
    const knownIds: string[] = []
    const unknownIds: string[] = []
    const outlineIds = new Set(this.groupOutlines.map(outline => outline.id))
    for (const id of uniqueStrings(ids)) {
      if (outlineIds.has(id)) knownIds.push(id)
      else unknownIds.push(id)
    }
    return { knownIds, unknownIds }
  }

  private resolveTarget(
    ids: Iterable<string>,
    scope: SvgMapHighlightScope,
  ): { targetIds: string[]; unknownIds: string[] } {
    const { knownIds, unknownIds } = this.resolveKnown(ids)
    if (scope === 'listed') return { targetIds: knownIds, unknownIds }
    const excluded = new Set(knownIds)
    return {
      targetIds: [...this.countries.keys()].filter(id => !excluded.has(id)),
      unknownIds,
    }
  }

  private render(): void {
    if (!this.svg) return
    const view = this.mount.ownerDocument.defaultView
    const reducedMotion = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const transition = reducedMotion || this.settings.transitionMs === 0
      ? 'none'
      : `fill ${this.settings.transitionMs}ms ease, stroke ${this.settings.transitionMs}ms ease, stroke-width ${this.settings.transitionMs}ms ease`

    this.syncTaskAssistance()

    for (const country of this.countries.values()) {
      const hovered = this.hoveredIds.has(country.id)
      const taskHovered = this.taskPointerIntent?.countryId === country.id
      const hasSemanticColor = this.countryColors.has(country.id)
      const baseFill = taskHovered
        ? this.settings.hoverFill
        : hovered && this.settings.hoverHighlight && !hasSemanticColor
        ? this.settings.hoverFill
        : this.countryColors.get(country.id)
          ?? (this.highlighted.has(country.id)
            ? this.settings.highlightFill
            : this.settings.countryFill)
      const fill = taskHovered
        ? this.settings.hoverFill
        : this.mutedCountries.has(country.id)
        ? this.settings.mutedFill
        : baseFill

      const styled = this.highlighted.has(country.id) || hasSemanticColor
      const stroke = (taskHovered || (hovered && this.settings.hoverHighlight)) && this.settings.hoverStroke !== null
        ? this.settings.hoverStroke
        : styled && this.settings.highlightStroke !== null
          ? this.settings.highlightStroke
          : this.settings.countryStroke
      const strokeWidth = hovered && this.settings.hoverStrokeWidth !== null
        ? this.settings.hoverStrokeWidth
        : styled && this.settings.highlightStrokeWidth !== null
          ? this.settings.highlightStrokeWidth
          : null

      setOverride(country.path, 'fill', fill, country.originalFill)
      setOverride(country.path, 'stroke', stroke, country.originalStroke)
      setOverride(country.path, 'stroke-width', strokeWidth, country.originalStrokeWidth)
      country.path.style.setProperty('transition', transition)
      restoreStyle(country.path, 'filter', country.originalFilter)
      const hidden = this.hiddenCountries.has(country.id)
      setOverride(country.path, 'visibility', hidden ? 'hidden' : null, country.originalVisibility)
      setOverride(country.path, 'pointer-events', hidden ? 'none' : null, country.originalPointerEvents)

      this.renderCountryLabel(country, this.countryLabelOverrides.get(country.id) ?? null)
      const showHoverName = this.hoveredNameOverride ?? this.settings.hoverShowName
      const showLabel = !hidden && (this.settings.showAllNames
        || this.named.has(country.id)
        || (this.settings.showHighlightedNames && this.highlighted.has(country.id))
        || (showHoverName && hovered))
      country.label.style.setProperty('display', showLabel ? 'inline' : 'none', 'important')
      country.label.style.setProperty('pointer-events', 'none', 'important')
      for (const paint of country.labelPaint) {
        setOverride(paint.element, 'fill', this.settings.labelFill, paint.originalFill)
      }
      const taskTarget = this.taskRepresentativeTargets.get(country.id)
      if (taskTarget) this.renderTaskRepresentativeTarget(country, taskTarget, fill, hidden, reducedMotion)
      for (const interactionPoint of this.taskInteractionPoints.values()) {
        if (interactionPoint.countryId !== country.id) continue
        this.renderTaskInteractionPoint(country, interactionPoint, fill, hidden, reducedMotion)
      }
    }
    this.renderGroupOutlines()
  }

  private syncTaskAssistance(): void {
    if (this.taskPointerIntent
      && (!this.isTaskCandidate(this.taskPointerIntent.countryId)
        || (this.taskPointerIntent.interactionPointId !== null
          && !this.taskInteractionPoints.has(this.taskPointerIntent.interactionPointId)))) {
      this.taskPointerIntent = null
    }
    if (!this.svg || (!this.taskAnswerSelectionConfigured && this.taskTargetId === null)) {
      for (const countryId of this.taskRepresentativeTargets.keys()) this.removeTaskRepresentativeTarget(countryId)
      for (const pointId of this.taskInteractionPoints.keys()) this.removeTaskInteractionPoint(pointId)
      this.removeTaskTargetLayers()
      return
    }

    const activeTargetIds = new Set<string>()
    const activePointIds = new Set<string>()
    const requestedIds = new Set(this.taskAnswerSelection)
    if (this.taskTargetId !== null) requestedIds.add(this.taskTargetId)

    for (const sourceSvgId of requestedIds) {
      const country = this.countries.get(sourceSvgId)
      if (!country) continue
      const answerSelectable = this.isTaskCandidate(sourceSvgId)
      const taskTarget = this.taskTargetId === sourceSvgId && !this.hiddenCountries.has(sourceSvgId)
      if (!answerSelectable && !taskTarget) continue

      if (answerSelectable) {
        const interactionPoints = this.resolveTaskInteractionPoints(sourceSvgId, country)
        const syntheticDot = this.taskSyntheticDotDefinitions.has(sourceSvgId)
        for (let index = 0; index < interactionPoints.length; index += 1) {
          const sourcePoint = interactionPoints[index]
          const point = this.transformSourcePointToLayer(country.path, sourcePoint, this.svg)
          if (!point) continue
          const scale = this.getRenderedScale(this.svg)
          const smallestScale = Math.min(scale.x, scale.y)
          if (!Number.isFinite(smallestScale) || smallestScale <= 0) continue
          const pointId = `${sourceSvgId}:${index}`
          activePointIds.add(pointId)
          this.upsertTaskInteractionPoint(
            pointId,
            sourceSvgId,
            this.svg,
            point,
            TASK_MARKER_TARGET_RADIUS_PX / smallestScale,
            TASK_HIT_RADIUS_PX / smallestScale,
            syntheticDot ? 'synthetic' : 'derived',
          )
        }
      }

      if (taskTarget) {
        const anchor = this.resolveTaskAnchor(sourceSvgId, country)
        const point = anchor ? this.transformSourcePointToLayer(country.path, anchor.point, this.svg) : null
        const scale = this.getRenderedScale(this.svg)
        const smallestScale = Math.min(scale.x, scale.y)
        if (point && Number.isFinite(smallestScale) && smallestScale > 0) {
          activeTargetIds.add(sourceSvgId)
          this.upsertTaskRepresentativeTarget(
            sourceSvgId,
            this.svg,
            point,
            TASK_MARKER_TARGET_RADIUS_PX / smallestScale,
          )
        }
      }
    }

    for (const countryId of this.taskRepresentativeTargets.keys()) {
      if (!activeTargetIds.has(countryId)) this.removeTaskRepresentativeTarget(countryId)
    }
    for (const pointId of this.taskInteractionPoints.keys()) {
      if (!activePointIds.has(pointId)) this.removeTaskInteractionPoint(pointId)
    }
    if (this.taskRepresentativeTargets.size === 0 && this.taskInteractionPoints.size === 0) {
      this.removeTaskTargetLayers()
    }
  }

  private resolveTaskInteractionPoints(sourceSvgId: string, country: InternalCountry): readonly SvgPoint[] {
    const syntheticDot = this.taskSyntheticDotDefinitions.get(sourceSvgId)
    if (syntheticDot) return [syntheticDot.point]

    const sourceFingerprint = country.path.getAttribute('d') ?? ''
    const bounds = this.readGeometryBounds(country.path)
    if (!bounds) return []

    if (this.isCompactUnambiguousGeometry(country.path, bounds)) {
      return [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }]
    }

    const cached = this.automaticTaskInteractionPoints.get(sourceSvgId)
    if (cached?.sourceFingerprint === sourceFingerprint) return cached.points

    const components = readPathComponents(sourceFingerprint)
    if (components.length < 2) return []
    const points = components.map(component => component.start)
    this.automaticTaskInteractionPoints.set(sourceSvgId, { sourceFingerprint, points })
    return points
  }

  private attachTaskPointerListeners(svg: SVGSVGElement): void {
    this.detachTaskPointerListeners()
    const update = (event: Event) => this.updateTaskPointerIntent(event)
    const leave = () => this.setTaskPointerIntent(null)
    const click = (event: Event) => this.handleTaskPointerClick(event)
    svg.addEventListener('pointermove', update)
    svg.addEventListener('pointerover', update)
    svg.addEventListener('pointerleave', leave)
    svg.addEventListener('pointercancel', leave)
    svg.addEventListener('click', click)
    this.taskPointerListeners = { svg, move: update, over: update, leave, cancel: leave, click }
  }

  private detachTaskPointerListeners(): void {
    const listeners = this.taskPointerListeners
    if (!listeners) return
    listeners.svg.removeEventListener('pointermove', listeners.move)
    listeners.svg.removeEventListener('pointerover', listeners.over)
    listeners.svg.removeEventListener('pointerleave', listeners.leave)
    listeners.svg.removeEventListener('pointercancel', listeners.cancel)
    listeners.svg.removeEventListener('click', listeners.click)
    this.taskPointerListeners = null
  }

  private resolveTaskAnchor(sourceSvgId: string, country: InternalCountry): { kind: SvgMapLearningAnchor['kind']; point: SvgPoint } | null {
    const explicit = this.taskAnchorDefinitions.get(sourceSvgId)
    if (explicit) {
      const point = explicit.kind === 'multi-dot-representative'
        ? explicit.point
        : this.readGeometryCenter(country.path)
      return point ? { kind: explicit.kind, point } : null
    }

    const syntheticDot = this.taskSyntheticDotDefinitions.get(sourceSvgId)
    if (syntheticDot) return { kind: 'single-dot', point: syntheticDot.point }

    const sourceFingerprint = country.path.getAttribute('d') ?? ''
    if (this.automaticTaskAnchors.has(sourceSvgId)) {
      const cached = this.automaticTaskAnchors.get(sourceSvgId)
      if (cached === null || cached?.sourceFingerprint === sourceFingerprint) {
        return cached ? { kind: 'single-dot', point: cached.point } : null
      }
    }

    const bounds = this.readGeometryBounds(country.path)
    const point = bounds && this.isCompactUnambiguousGeometry(country.path, bounds)
      ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      : null
    this.automaticTaskAnchors.set(sourceSvgId, point ? { sourceFingerprint, point } : null)
    return point ? { kind: 'single-dot', point } : null
  }

  private readGeometryCenter(path: SVGPathElement): SvgPoint | null {
    const bounds = this.readGeometryBounds(path)
    return bounds
      ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      : null
  }

  private isCompactUnambiguousGeometry(
    path: SVGPathElement,
    bounds: { width: number; height: number },
  ): boolean {
    if (bounds.width <= 0 || bounds.height <= 0) return false
    if (Math.max(bounds.width, bounds.height) > COMPACT_GEOMETRY_MAX_DIMENSION
      || bounds.width * bounds.height > COMPACT_GEOMETRY_MAX_AREA) return false
    return countDrawnPathComponents(path.getAttribute('d') ?? '') <= 1
  }

  private getRenderedScale(svg: SVGSVGElement): { x: number; y: number } {

    try {
      const transform = svg.getScreenCTM?.()
      if (transform) {
        const x = Math.hypot(transform.a, transform.b)
        const y = Math.hypot(transform.c, transform.d)
        if (Number.isFinite(x) && Number.isFinite(y) && x > 0 && y > 0) return { x, y }
      }
    } catch {
      // Fall back to the rendered SVG box for test DOMs and partial SVG APIs.
    }

    const viewBox = this.parseViewBox(svg.getAttribute('viewBox') ?? '')
    const rect = svg.getBoundingClientRect()
    if (!viewBox || rect.width <= 0 || rect.height <= 0) return { x: 1, y: 1 }

    const preserveAspectRatio = svg.getAttribute('preserveAspectRatio')?.trim().toLowerCase() ?? ''
    if (preserveAspectRatio.startsWith('none')) {
      return {
        x: rect.width / viewBox.width,
        y: rect.height / viewBox.height,
      }
    }

    const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
    return { x: scale, y: scale }
  }

  private readGeometryBounds(path: SVGPathElement): { x: number; y: number; width: number; height: number } | null {
    if (typeof path.getBBox !== 'function') return null
    try {
      const bounds = path.getBBox()
      const values = [bounds.x, bounds.y, bounds.width, bounds.height]
      if (values.some(value => !Number.isFinite(value)) || bounds.width < 0 || bounds.height < 0) return null
      return bounds
    } catch {
      return null
    }
  }

  private readElementTransform(element: SVGGraphicsElement, screen = false): SvgAffineTransform | null {
    try {
      const matrix = screen ? element.getScreenCTM?.() : element.getCTM?.()
      if (matrix) {
        const values = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
        if (values.every(value => Number.isFinite(value))) {
          return { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f }
        }
      }
      if (screen) return null

      const ownerSvg = element.ownerSVGElement
      let current: Element | null = element
      let result = IDENTITY_TRANSFORM
      let found = false
      while (current && current !== ownerSvg) {
        const transform = parseSvgTransform(current.getAttribute('transform'))
        if (transform) {
          result = multiplyTransforms(transform, result)
          found = true
        }
        current = current.parentElement
      }
      return found ? result : null
    } catch {
      return null
    }
  }

  private transformSourcePointToLayer(
    path: SVGPathElement,
    point: SvgPoint,
    layerSvg: SVGSVGElement,
  ): SvgPoint | null {
    const localTransform = this.readElementTransform(path)
    if (path.ownerSVGElement === layerSvg) {
      return transformPoint(localTransform ?? IDENTITY_TRANSFORM, point)
    }

    const sourceScreen = this.getScreenPointFromPath(path, point)
    const layerScreen = this.readElementTransform(layerSvg, true)
    if (sourceScreen && layerScreen) {
      const inverse = invertTransform(layerScreen)
      if (inverse) return transformPoint(inverse, sourceScreen)
    }

    // In DOM/test environments without screen CTMs, bundled nested map SVGs
    // share the root map coordinate system; ancestor group transforms are
    // already included in the local transform above.
    return transformPoint(localTransform ?? IDENTITY_TRANSFORM, point)
  }

  private getScreenPointFromPath(path: SVGPathElement, point: SvgPoint): SvgPoint | null {
    const screenTransform = this.readElementTransform(path, true)
    if (screenTransform) return transformPoint(screenTransform, point)

    const layerSvg = path.ownerSVGElement
    if (!layerSvg) return null
    const localTransform = this.readElementTransform(path)
    return this.getScreenPointFromSvg(layerSvg, localTransform ? transformPoint(localTransform, point) : point)
  }

  private getScreenPointFromSvg(svg: SVGSVGElement, point: SvgPoint): SvgPoint | null {
    const screenTransform = this.readElementTransform(svg, true)
    if (screenTransform) return transformPoint(screenTransform, point)

    const viewBox = this.parseViewBox(svg.getAttribute('viewBox') ?? '')
    const rect = svg.getBoundingClientRect()
    if (!viewBox || rect.width <= 0 || rect.height <= 0) return null
    const preserveAspectRatio = svg.getAttribute('preserveAspectRatio')?.trim().toLowerCase() ?? ''
    if (preserveAspectRatio.startsWith('none')) {
      return {
        x: rect.left + (point.x - viewBox.x) * rect.width / viewBox.width,
        y: rect.top + (point.y - viewBox.y) * rect.height / viewBox.height,
      }
    }

    const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
    const offsetX = (rect.width - viewBox.width * scale) / 2
    const offsetY = (rect.height - viewBox.height * scale) / 2
    return {
      x: rect.left + offsetX + (point.x - viewBox.x) * scale,
      y: rect.top + offsetY + (point.y - viewBox.y) * scale,
    }
  }

  private getSvgPointFromClient(svg: SVGSVGElement, client: SvgPoint): SvgPoint | null {
    const screenTransform = this.readElementTransform(svg, true)
    if (screenTransform) {
      const inverse = invertTransform(screenTransform)
      return inverse ? transformPoint(inverse, client) : null
    }

    const rect = svg.getBoundingClientRect()
    const viewBox = this.parseViewBox(svg.getAttribute('viewBox') ?? '')
    if (!viewBox || rect.width <= 0 || rect.height <= 0) return null
    let x = client.x - rect.left
    let y = client.y - rect.top
    const preserveAspectRatio = svg.getAttribute('preserveAspectRatio')?.trim().toLowerCase() ?? ''
    if (!preserveAspectRatio.startsWith('none')) {
      const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
      const contentWidth = viewBox.width * scale
      const contentHeight = viewBox.height * scale
      const offsetX = (rect.width - contentWidth) / 2
      const offsetY = (rect.height - contentHeight) / 2
      if (x < offsetX || x > offsetX + contentWidth || y < offsetY || y > offsetY + contentHeight) return null
      x = (x - offsetX) / scale
      y = (y - offsetY) / scale
    } else {
      x /= rect.width / viewBox.width
      y /= rect.height / viewBox.height
    }
    return { x: viewBox.x + x, y: viewBox.y + y }
  }

  private getLocalPointFromClient(path: SVGPathElement, client: SvgPoint): SvgPoint | null {
    const screenTransform = this.readElementTransform(path, true)
    if (screenTransform) {
      const inverse = invertTransform(screenTransform)
      return inverse ? transformPoint(inverse, client) : null
    }

    const layerSvg = path.ownerSVGElement
    if (!layerSvg) return null
    const layerPoint = this.getSvgPointFromClient(layerSvg, client)
    if (!layerPoint) return null
    const localTransform = this.readElementTransform(path)
    if (!localTransform) return layerPoint
    const inverse = invertTransform(localTransform)
    return inverse ? transformPoint(inverse, layerPoint) : null
  }

  private getTaskTargetLayer(layerSvg: SVGSVGElement): SVGGElement {
    const existing = this.taskTargetLayers.get(layerSvg)
    if (existing) return existing
    const layer = layerSvg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g')
    layer.setAttribute('data-svg-map-task-targets', '')
    layerSvg.append(layer)
    this.taskTargetLayers.set(layerSvg, layer)
    return layer
  }

  private removeTaskTargetLayers(): void {
    for (const layer of this.taskTargetLayers.values()) layer.remove()
    this.taskTargetLayers.clear()
  }

  private upsertTaskInteractionPoint(
    pointId: string,
    countryId: string,
    layerSvg: SVGSVGElement,
    point: SvgPoint,
    markerRadius: number,
    hitRadius: number,
    origin: TaskInteractionPoint['origin'],
  ): void {
    let interactionPoint = this.taskInteractionPoints.get(pointId)
    if (interactionPoint && interactionPoint.layerSvg !== layerSvg) {
      this.removeTaskInteractionPoint(pointId)
      interactionPoint = undefined
    }
    if (interactionPoint) {
      interactionPoint.centerX = point.x
      interactionPoint.centerY = point.y
      interactionPoint.markerRadius = markerRadius
      interactionPoint.hitRadius = hitRadius
      interactionPoint.hitRadiusPx = TASK_HIT_RADIUS_PX
      interactionPoint.origin = origin
      interactionPoint.group.setAttribute('data-svg-map-task-interaction-source', origin)
      this.positionTaskInteractionPoint(interactionPoint)
      return
    }

    const document = layerSvg.ownerDocument
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    group.setAttribute('data-svg-map-task-interaction-point', pointId)
    group.setAttribute('data-svg-map-tiny-country', countryId)
    group.setAttribute('data-svg-map-task-interaction-source', origin)
    marker.setAttribute('data-svg-map-task-marker', countryId)
    marker.setAttribute('data-svg-map-task-interaction-marker', pointId)
    marker.setAttribute('data-svg-map-tiny-marker', countryId)
    ring.setAttribute('data-svg-map-task-ring', countryId)
    ring.setAttribute('data-svg-map-task-interaction-ring', pointId)
    ring.setAttribute('data-svg-map-tiny-ring', countryId)
    hit.setAttribute('data-svg-map-task-hit-target', countryId)
    hit.setAttribute('data-svg-map-task-interaction-hit-target', pointId)
    hit.setAttribute('data-svg-map-tiny-hit-target', countryId)
    marker.setAttribute('pointer-events', 'none')
    ring.setAttribute('pointer-events', 'none')
    hit.setAttribute('fill', 'transparent')
    hit.setAttribute('fill-opacity', '0')
    hit.setAttribute('stroke', 'none')
    hit.setAttribute('pointer-events', 'none')
    group.append(marker, ring, hit)
    this.getTaskTargetLayer(layerSvg).append(group)
    const created: TaskInteractionPoint = {
      id: pointId,
      countryId,
      layerSvg,
      centerX: point.x,
      centerY: point.y,
      screenCenterX: point.x,
      screenCenterY: point.y,
      hitRadius,
      hitRadiusPx: TASK_HIT_RADIUS_PX,
      markerRadius,
      group,
      marker,
      ring,
      hit,
      origin,
    }
    this.taskInteractionPoints.set(pointId, created)
    this.positionTaskInteractionPoint(created)
  }

  private upsertTaskRepresentativeTarget(
    countryId: string,
    layerSvg: SVGSVGElement,
    point: SvgPoint,
    markerRadius: number,
  ): void {
    let target = this.taskRepresentativeTargets.get(countryId)
    if (target && target.layerSvg !== layerSvg) {
      this.removeTaskRepresentativeTarget(countryId)
      target = undefined
    }
    if (target) {
      target.centerX = point.x
      target.centerY = point.y
      target.markerRadius = markerRadius
      this.positionTaskRepresentativeTarget(target)
      return
    }

    const document = layerSvg.ownerDocument
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    group.setAttribute('data-svg-map-task-target', countryId)
    group.setAttribute('data-svg-map-task-representative-target', countryId)
    marker.setAttribute('data-svg-map-task-marker', countryId)
    marker.setAttribute('data-svg-map-tiny-marker', countryId)
    ring.setAttribute('data-svg-map-task-ring', countryId)
    ring.setAttribute('data-svg-map-tiny-ring', countryId)
    marker.setAttribute('pointer-events', 'none')
    ring.setAttribute('pointer-events', 'none')
    group.setAttribute('pointer-events', 'none')
    group.append(marker, ring)
    this.getTaskTargetLayer(layerSvg).append(group)
    target = { countryId, layerSvg, centerX: point.x, centerY: point.y, markerRadius, group, marker, ring }
    this.taskRepresentativeTargets.set(countryId, target)
    this.positionTaskRepresentativeTarget(target)
  }

  private positionTaskInteractionPoint(point: TaskInteractionPoint): void {
    for (const element of [point.marker, point.ring, point.hit]) {
      element.setAttribute('cx', String(point.centerX))
      element.setAttribute('cy', String(point.centerY))
    }
    point.hit.setAttribute('r', String(point.hitRadius))
    const screenPoint = this.getScreenPointFromSvg(point.layerSvg, { x: point.centerX, y: point.centerY })
    if (screenPoint) {
      point.screenCenterX = screenPoint.x
      point.screenCenterY = screenPoint.y
    }
  }

  private positionTaskRepresentativeTarget(target: TaskRepresentativeTarget): void {
    for (const element of [target.marker, target.ring]) {
      element.setAttribute('cx', String(target.centerX))
      element.setAttribute('cy', String(target.centerY))
    }
  }

  private removeTaskInteractionPoint(pointId: string): void {
    const point = this.taskInteractionPoints.get(pointId)
    if (!point) return
    point.group.remove()
    this.taskInteractionPoints.delete(pointId)
    const layer = this.taskTargetLayers.get(point.layerSvg)
    if (layer && layer.children.length === 0) {
      layer.remove()
      this.taskTargetLayers.delete(point.layerSvg)
    }
  }

  private removeTaskRepresentativeTarget(countryId: string): void {
    const target = this.taskRepresentativeTargets.get(countryId)
    if (!target) return
    target.group.remove()
    this.taskRepresentativeTargets.delete(countryId)
    const layer = this.taskTargetLayers.get(target.layerSvg)
    if (layer && layer.children.length === 0) {
      layer.remove()
      this.taskTargetLayers.delete(target.layerSvg)
    }
  }

  private renderTaskInteractionPoint(
    country: InternalCountry,
    point: TaskInteractionPoint,
    fill: string | null,
    hidden: boolean,
    reducedMotion: boolean,
  ): void {
    const sourceFill = country.path.style.getPropertyValue('fill')
      || country.path.getAttribute('fill')
      || country.originalFill.value
      || this.settings.countryFill
      || '#52525b'
    const hovered = this.taskPointerIntent?.interactionPointId === point.id
    const visible = !hidden
    const markerRadius = hovered ? point.markerRadius * TASK_MARKER_HOVER_SCALE : point.markerRadius
    const markerFill = fill ?? sourceFill
    point.marker.setAttribute('r', String(markerRadius))
    point.marker.setAttribute('fill', markerFill)
    point.marker.style.setProperty('transition', reducedMotion ? 'none' : `r ${this.settings.transitionMs}ms ease`)
    point.ring.setAttribute('r', String(hovered ? markerRadius * 1.45 : markerRadius))
    point.ring.setAttribute('fill', 'none')
    point.ring.setAttribute('stroke', this.settings.hoverStroke ?? '#d4d4d8')
    point.ring.setAttribute('stroke-width', this.settings.hoverStrokeWidth ?? '1.5')
    point.ring.setAttribute('opacity', hovered ? '0.85' : '0')
    point.ring.style.setProperty('transition', reducedMotion ? 'none' : `r ${this.settings.transitionMs}ms ease, opacity ${this.settings.transitionMs}ms ease`)
    point.group.setAttribute('visibility', visible ? 'visible' : 'hidden')
  }

  private renderTaskRepresentativeTarget(
    country: InternalCountry,
    target: TaskRepresentativeTarget,
    fill: string | null,
    hidden: boolean,
    reducedMotion: boolean,
  ): void {
    const sourceFill = country.path.style.getPropertyValue('fill')
      || country.path.getAttribute('fill')
      || country.originalFill.value
      || this.settings.countryFill
      || '#52525b'
    target.marker.setAttribute('r', String(target.markerRadius))
    target.marker.setAttribute('fill', fill ?? sourceFill)
    target.marker.style.setProperty('transition', reducedMotion ? 'none' : `r ${this.settings.transitionMs}ms ease`)
    target.ring.setAttribute('r', String(target.markerRadius))
    target.ring.setAttribute('fill', 'none')
    target.ring.setAttribute('stroke', this.settings.hoverStroke ?? '#d4d4d8')
    target.ring.setAttribute('stroke-width', this.settings.hoverStrokeWidth ?? '1.5')
    target.ring.setAttribute('opacity', '0')
    target.group.setAttribute('visibility', !hidden && this.taskTargetId === country.id ? 'visible' : 'hidden')
  }

  private setHoveredCountryAndNotify(id: string | null): void {
    this.setHoveredCountry(id)
    this.countryHoverHandler?.(this.hoveredCountryId === id ? id : null)
  }

  private setTaskPointerIntent(intent: TaskPointerIntent | null): void {
    const nextIntent = intent && this.isTaskCandidate(intent.countryId) ? intent : null
    if (this.taskPointerIntent?.countryId === nextIntent?.countryId
      && this.taskPointerIntent?.interactionPointId === nextIntent?.interactionPointId) return
    this.taskPointerIntent = nextIntent
    this.render()
  }

  private validateTaskLearningAnchor(anchor: SvgMapLearningAnchor): void {
    const country = this.countries.get(anchor.sourceSvgId)
    if (!country || !this.svg) return
    const sourceFingerprint = country.path.getAttribute('d') ?? ''
    if (sourceFingerprint !== anchor.sourceFingerprint) {
      throw new Error(`Stale task learning anchor source for ${anchor.sourceSvgId}`)
    }
    if (anchor.kind === 'multi-dot-representative' && anchor.point === undefined) {
      throw new Error(`Representative task learning anchor ${anchor.sourceSvgId} has no point`)
    }
    if (anchor.kind === 'single-dot' && anchor.point !== undefined) {
      throw new Error(`Single-dot task learning anchor ${anchor.sourceSvgId} must resolve from source geometry`)
    }
    if (!anchor.point) return
    const viewBox = this.parseViewBox(
      country.path.ownerSVGElement?.getAttribute('viewBox') ?? this.svg.getAttribute('viewBox') ?? '',
    )
    const { x, y } = anchor.point
    if (!viewBox || !Number.isFinite(x) || !Number.isFinite(y)
      || x < viewBox.x || y < viewBox.y
      || x > viewBox.x + viewBox.width || y > viewBox.y + viewBox.height) {
      throw new Error(`Task learning anchor ${anchor.sourceSvgId} is outside the map viewBox`)
    }
  }

  private validateTaskSyntheticDot(dot: SvgMapSyntheticDot): void {
    const country = this.countries.get(dot.sourceSvgId)
    if (!country || !this.svg) return
    const sourceFingerprint = country.path.getAttribute('d') ?? ''
    if (getSyntheticDotSourceFingerprint(sourceFingerprint) !== dot.sourceFingerprint) {
      throw new Error(`Stale task synthetic dot source for ${dot.sourceSvgId}`)
    }
    const viewBox = this.parseViewBox(
      country.path.ownerSVGElement?.getAttribute('viewBox') ?? this.svg.getAttribute('viewBox') ?? '',
    )
    const { x, y } = dot.point
    if (!viewBox || !Number.isFinite(x) || !Number.isFinite(y)
      || x < viewBox.x || y < viewBox.y
      || x > viewBox.x + viewBox.width || y > viewBox.y + viewBox.height) {
      throw new Error(`Task synthetic dot ${dot.sourceSvgId} is outside the map viewBox`)
    }
  }

  private updateTaskPointerIntent(event: Event): void {
    if (!this.taskAnswerSelectionConfigured) return
    const point = this.getClientPoint(event)
    this.setTaskPointerIntent(point ? this.resolveTaskPointerIntent(point) : null)
  }

  private handleTaskPointerClick(event: Event): void {
    if (!this.taskAnswerSelectionConfigured) return
    const point = this.getClientPoint(event)
    const intent = point ? this.resolveTaskPointerIntent(point) : this.taskPointerIntent
    if (intent && this.isSelectableForTask(intent.countryId)) {
      this.setTaskPointerIntent(intent)
      this.countryClickHandler?.(intent.countryId)
    }
  }

  /** Resolve both task hover and task click from the same client coordinate. */
  private resolveTaskPointerIntent(point: SvgPoint): TaskPointerIntent | null {
    const sourceCountryId = this.resolveSourceCountryAtPoint(point)
    if (sourceCountryId) {
      const localPoint = this.findNearestInteractionPoint(point, sourceCountryId, false)
      if (localPoint) return { countryId: sourceCountryId, interactionPointId: localPoint.id }
    }

    // Forgiving interaction regions are bounded task intent, so they are
    // evaluated before an enclosing ordinary source Country once exact
    // assisted geometry has had its chance to identify its local point.
    const localPoint = this.findNearestInteractionPoint(point, null, true)
    if (localPoint) return { countryId: localPoint.countryId, interactionPointId: localPoint.id }
    if (sourceCountryId) return { countryId: sourceCountryId, interactionPointId: null }
    return null
  }

  private findNearestInteractionPoint(
    point: SvgPoint,
    countryId: string | null,
    bounded: boolean,
  ): TaskInteractionPoint | null {
    let nearest: { point: TaskInteractionPoint; distance: number } | null = null
    for (const interactionPoint of this.taskInteractionPoints.values()) {
      if (!this.isTaskCandidate(interactionPoint.countryId)) continue
      if (countryId !== null && interactionPoint.countryId !== countryId) continue
      const distance = Math.hypot(
        point.x - interactionPoint.screenCenterX,
        point.y - interactionPoint.screenCenterY,
      )
      if (bounded && distance > interactionPoint.hitRadiusPx) continue
      if (!nearest || distance < nearest.distance
        || (distance === nearest.distance && interactionPoint.id.localeCompare(nearest.point.id) < 0)) {
        nearest = { point: interactionPoint, distance }
      }
    }
    return nearest?.point ?? null
  }

  private resolveSourceCountryAtPoint(point: SvgPoint): string | null {
    const matches: Array<{ id: string; area: number }> = []
    for (const country of this.countries.values()) {
      if (!this.isTaskCandidate(country.id)) continue
      const localPoint = this.getLocalPointFromClient(country.path, point)
      const bounds = this.readGeometryBounds(country.path)
      if (!localPoint) continue
      if (!bounds) continue
      const geometry = country.path as SVGGeometryElement & {
        isPointInFill?: (candidate: { x: number; y: number }) => boolean
      }
      let contains = localPoint.x >= bounds.x
        && localPoint.x <= bounds.x + bounds.width
        && localPoint.y >= bounds.y
        && localPoint.y <= bounds.y + bounds.height
      if (typeof geometry.isPointInFill === 'function') {
        try {
          contains = geometry.isPointInFill(localPoint)
        } catch {
          // Keep the conservative bounding-box fallback for test DOMs and
          // browsers that cannot evaluate the path at this moment.
        }
      }
      if (contains) matches.push({ id: country.id, area: bounds.width * bounds.height })
    }
    return matches.sort((left, right) => left.area - right.area || left.id.localeCompare(right.id))[0]?.id ?? null
  }

  private getClientPoint(event: Event): SvgPoint | null {
    const pointer = event as MouseEvent
    return Number.isFinite(pointer.clientX) && Number.isFinite(pointer.clientY)
      ? { x: pointer.clientX, y: pointer.clientY }
      : null
  }

  private renderCountryLabel(country: InternalCountry, override: string | null): void {
    const textNodes = country.originalLabelTextNodes
    if (textNodes.length === 0) return

    textNodes[country.labelTextNodeIndex].node.data = override ?? textNodes[country.labelTextNodeIndex].value
    for (let index = 0; index < textNodes.length; index += 1) {
      if (index === country.labelTextNodeIndex) continue
      textNodes[index].node.data = override === null
        ? textNodes[index].value
        : textNodes[index].value.trim() === '' ? textNodes[index].value : ''
    }
  }

  private renderGroupOutlines(): void {
    this.outlineLayer?.remove()
    this.outlineLayer = null

    const firstPath = this.countries.values().next().value?.path
    const mapSvg = firstPath?.ownerSVGElement
    if (!mapSvg) return

    mapSvg.querySelectorAll('filter[data-svg-map-group-outline-filter]').forEach(filter => filter.remove())
    const activeOutlines = this.groupOutlines.filter(outline => this.visibleGroupOutlines.has(outline.id))
    if (activeOutlines.length === 0) return

    const document = mapSvg.ownerDocument
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    layer.setAttribute('data-svg-map-group-outlines', '')
    layer.setAttribute('pointer-events', 'none')

    for (const outline of activeOutlines) {
      const filterId = `svg-map-group-outline-${this.outlineSequence++}`
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
      filter.setAttribute('id', filterId)
      filter.setAttribute('data-svg-map-group-outline-filter', '')
      filter.setAttribute('x', '-20%')
      filter.setAttribute('y', '-20%')
      filter.setAttribute('width', '140%')
      filter.setAttribute('height', '140%')

      const radius = Math.max(0.5, (Number.parseFloat(outline.strokeWidth ?? '2.5') || 2.5) / 2)
      const dilated = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology')
      dilated.setAttribute('in', 'SourceAlpha')
      dilated.setAttribute('operator', 'dilate')
      dilated.setAttribute('radius', String(radius))
      dilated.setAttribute('result', 'dilated')

      const flood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood')
      flood.setAttribute('flood-color', outline.stroke ?? '#22d3ee')
      flood.setAttribute('result', 'outline-color')

      const color = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite')
      color.setAttribute('in', 'outline-color')
      color.setAttribute('in2', 'dilated')
      color.setAttribute('operator', 'in')
      color.setAttribute('result', 'outline')

      const outside = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite')
      outside.setAttribute('in', 'outline')
      outside.setAttribute('in2', 'SourceAlpha')
      outside.setAttribute('operator', 'out')

      filter.append(dilated, flood, color, outside)
      const defs = mapSvg.querySelector('defs') ?? (() => {
        const created = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        mapSvg.insertBefore(created, mapSvg.firstChild)
        return created
      })()
      defs.append(filter)

      const outlineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      outlineGroup.setAttribute('data-svg-map-group-outline', outline.id)
      outlineGroup.setAttribute('filter', `url(#${filterId})`)
      for (const countryId of outline.countryIds) {
        const country = this.countries.get(countryId)
        if (!country) continue
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use')
        use.setAttribute('href', `#${country.pathId}`)
        use.setAttributeNS(XLINK_NS, 'href', `#${country.pathId}`)
        outlineGroup.append(use)
      }
      layer.append(outlineGroup)
    }

    mapSvg.append(layer)
    this.outlineLayer = layer
  }

  private toColorEntries(colors: SvgMapCountryColors): Iterable<readonly [string, string | null]> {
    if (Symbol.iterator in Object(colors)) return colors as Iterable<readonly [string, string | null]>
    return Object.entries(colors)
  }

  private parseViewBox(value: string): { x: number; y: number; width: number; height: number } | null {
    const values = value.trim().split(/[\s,]+/).map(Number)
    if (values.length !== 4 || values.some(number => !Number.isFinite(number))) return null
    const [x, y, width, height] = values
    if (width <= 0 || height <= 0) return null
    return { x, y, width, height }
  }

  private getPaddedCountryBounds(countryIds: readonly string[], padding: number): SvgViewBoxRect | null {
    const boxes = countryIds.flatMap(id => {
      const country = this.countries.get(id)
      if (!country) return []
      try {
        const box = country.path.getBBox()
        return Number.isFinite(box.x) && Number.isFinite(box.y)
          && Number.isFinite(box.width) && Number.isFinite(box.height)
          && box.width > 0 && box.height > 0
          ? [box]
          : []
      } catch {
        return []
      }
    })
    if (boxes.length === 0) return null

    // Keep the requested breathing room even when the target is near an edge
    // of the source map. The SVG background remains visible in this overscan
    // area, while resetZoom() still restores the source viewBox exactly.
    const minX = Math.min(...boxes.map(box => box.x)) - padding
    const minY = Math.min(...boxes.map(box => box.y)) - padding
    const maxX = Math.max(...boxes.map(box => box.x + box.width)) + padding
    const maxY = Math.max(...boxes.map(box => box.y + box.height)) + padding
    if (maxX <= minX || maxY <= minY) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  private getMapSlotAspect(): number | null {
    const viewportRect = this.viewportElement.getBoundingClientRect()
    if (viewportRect.width > 0 && viewportRect.height > 0) return viewportRect.width / viewportRect.height
    const mountRect = this.mount.getBoundingClientRect()
    if (mountRect.width > 0 && mountRect.height > 0) return mountRect.width / mountRect.height
    const svgRect = this.svg?.getBoundingClientRect()
    if (svgRect && svgRect.width > 0 && svgRect.height > 0) return svgRect.width / svgRect.height
    return null
  }

  private recomputeViewBox(explicitTarget?: SvgViewBoxRect): void {
    if (!this.svg) return
    const target = explicitTarget ?? (this.zoomIntent
      ? this.getPaddedCountryBounds(this.zoomIntent.countryIds, this.zoomIntent.padding)
      : this.originalViewBox ? this.parseViewBox(this.originalViewBox) : null)
    if (!target) return
    const fitted = this.presentation === 'expanded' ? fitViewBoxToAspect(target, this.getMapSlotAspect()) : target
    const value = `${fitted.x} ${fitted.y} ${fitted.width} ${fitted.height}`
    if (this.svg.getAttribute('viewBox') === value) {
      this.syncAspectRatio(value)
      this.render()
      return
    }
    this.setViewBox(value)
  }

  private setViewBox(value: string): void {
    if (!this.svg) return
    this.svg.setAttribute('viewBox', value)
    this.syncAspectRatio(value)
    this.render()
  }

  private observeResize(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    if (typeof ResizeObserver === 'undefined') return

    const observedSvg = this.svg
    this.resizeObserver = new ResizeObserver(() => {
      if (this.destroyed || this.svg !== observedSvg) return
      if (this.presentation === 'expanded') this.recomputeViewBox()
      else this.render()
    })
    this.resizeObserver.observe(this.mount)
    if (this.viewportElement !== this.mount) this.resizeObserver.observe(this.viewportElement)
  }

  /** Keep auto-height SVG surfaces in step with a focused viewBox. */
  private syncAspectRatio(viewBox: string | null): void {
    if (!this.svg || !viewBox) return
    const bounds = this.parseViewBox(viewBox)
    if (bounds) this.svg.style.aspectRatio = `${bounds.width} / ${bounds.height}`
  }

  private resetMap(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.detachTaskPointerListeners()
    this.detachHoverListeners()
    for (const countryId of this.taskRepresentativeTargets.keys()) this.removeTaskRepresentativeTarget(countryId)
    for (const pointId of this.taskInteractionPoints.keys()) this.removeTaskInteractionPoint(pointId)
    this.removeTaskTargetLayers()
    this.countries.clear()
    this.highlighted.clear()
    this.countryColors.clear()
    this.mutedCountries.clear()
    this.hiddenCountries.clear()
    this.hoverableCountries = null
    this.selectableCountries = null
    this.taskAnswerSelection.clear()
    this.taskAnswerSelectionConfigured = false
    this.taskTargetId = null
    this.taskPointerIntent = null
    this.taskAnchorDefinitions.clear()
    this.taskSyntheticDotDefinitions.clear()
    this.automaticTaskAnchors.clear()
    this.automaticTaskInteractionPoints.clear()
    this.named.clear()
    this.countryLabelOverrides.clear()
    this.hoverGroups = []
    this.groupOutlines = []
    this.visibleGroupOutlines.clear()
    this.outlineLayer = null
    this.hoveredCountryId = null
    this.hoveredNameOverride = null
    this.hoveredIds.clear()
    this.svg = null
    this.originalViewBox = null
    this.zoomIntent = null
    this.mount.replaceChildren()
  }
}
