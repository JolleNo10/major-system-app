import {
  SvgTaskAssistanceRuntime,
  type SvgMapTaskAssistance,
} from './svgTaskAssistance'
import {
  countDrawnPathComponents,
  readSvgGeometryBounds,
  readSvgElementTransformToLayer,
  readSvgPathGeometryComponents,
  transformSourcePointToLayer,
  type SvgPoint,
  type SvgAffineTransform,
} from './svgGeometry'
import { fitViewBoxToAspect, parseViewBox, type SvgViewBoxRect } from './viewBoxFit'

export type {
  SvgMapLearningAnchor,
  SvgMapSyntheticDot,
  SvgMapTaskAssistance,
} from './svgTaskAssistance'

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
  effect?: 'outline' | 'halo'
  /** Underlays are for persistent decoration; the default preserves transient overlays. */
  placement?: 'underlay' | 'overlay'
  stroke?: string
  strokeWidth?: string
  visible?: boolean
}

/** Generic declarative fill pattern; workflows provide the semantic colors. */
export interface SvgMapCountryPattern {
  kind: 'diagonal' | 'crosshatch'
  baseColor: string
  lineColor: string
  lineWidth?: number
  pitch?: number
}

export interface SvgMapZoomArea {
  id: string
  label: string
  countryIds: readonly string[]
  padding?: number
}

/** Resolved, workflow-agnostic camera intent used by the SVG adapter. */
export type SvgMapCameraIntent =
  | { kind: 'default' }
  | { kind: 'view-box'; bounds: SvgViewBoxRect }
  | { kind: 'country-bounds'; countryIds: readonly string[]; padding: number }
  | { kind: 'target-centric-neighbourhood'; targetIds: readonly string[]; contextIds?: readonly string[] }

/** Complete declarative map presentation applied as one DOM render. */
export interface SvgMapPresentationState {
  presentation: SvgMapPresentation
  settings: Partial<SvgMapSettings>
  hoverGroups?: readonly SvgMapHoverGroup[]
  groupOutlines: readonly SvgMapGroupOutline[]
  hiddenIds: readonly string[]
  hoverableIds?: readonly string[]
  selectableIds?: readonly string[]
  taskAssistance: SvgMapTaskAssistance | null
  highlightedIds: readonly string[]
  mutedIds: readonly string[]
  countryColors: SvgMapCountryColors
  countryPatterns?: SvgMapCountryPatterns
  countryLabels: Readonly<Record<string, string>>
  namedIds: readonly string[]
  hoveredId: string | null
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

export type SvgMapCountryPatterns =
  | Readonly<Record<string, SvgMapCountryPattern | null>>
  | Iterable<readonly [string, SvgMapCountryPattern | null]>

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
  /** Authored paths in the labelled Country group; these drive camera geometry. */
  geometryPaths: readonly SVGPathElement[]
  /** All authored paths that represent the Country, including wrapped copies. */
  paths: readonly SVGPathElement[]
  pathStates: readonly CountryPathState[]
  group: SVGGElement
  label: SVGTextElement
  originalFill: OriginalStyle
  originalStroke: OriginalStyle
  originalStrokeWidth: OriginalStyle
  originalFilter: OriginalStyle
  originalTransition: OriginalStyle
  originalVisibility: OriginalStyle
  originalPointerEvents: OriginalStyle
  originalGroupTabIndex: string | null
  originalGroupRole: string | null
  originalGroupAriaLabel: string | null
  originalLabelDisplay: OriginalStyle
  originalLabelPointerEvents: OriginalStyle
  originalLabelTextNodes: Array<{ node: Text; value: string }>
  labelTextNodeIndex: number
  labelPaint: Array<{
    element: SVGElement
    originalFill: OriginalStyle
  }>
}

function isMultipartCountry(country: Pick<InternalCountry, 'geometryPaths'>): boolean {
  return country.geometryPaths.length > 1
}

interface CountryPathState {
  path: SVGPathElement
  originalFill: OriginalStyle
  originalStroke: OriginalStyle
  originalStrokeWidth: OriginalStyle
  originalFilter: OriginalStyle
  originalTransition: OriginalStyle
  originalVisibility: OriginalStyle
  originalPointerEvents: OriginalStyle
}

interface HoverListeners {
  path: SVGPathElement
  enter: EventListener
  leave: EventListener
  click: EventListener
}

interface TargetGeometryComponent {
  key: string
  bounds: SvgViewBoxRect
}

interface TargetContextAssociation {
  path: SVGPathElement
  component: TargetGeometryComponent
}

interface TargetComponentSelection {
  targetBounds: SvgViewBoxRect
  contextAssociations: readonly TargetContextAssociation[]
}

const FORBIDDEN_ELEMENTS = 'script, foreignObject, iframe, object, embed, image, style'
const XLINK_NS = 'http://www.w3.org/1999/xlink'
const TARGET_CENTRIC_CONTEXT_SAMPLE_COUNT = 32
const TARGET_CENTRIC_PADDING_RATIO = 0.3
const TARGET_CENTRIC_MIN_WINDOW_RATIO = 0.16
const TARGET_CENTRIC_MAX_WINDOW_RATIO = 0.85
const TASK_TARGET_ANCHOR_PADDING_RATIO = 0.01

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

function restoreAttribute(element: Element, name: string, original: string | null): void {
  if (original === null) element.removeAttribute(name)
  else element.setAttribute(name, original)
}

function setOverride(element: SVGElement, property: string, value: string | null, original: OriginalStyle): void {
  if (value === null) restoreStyle(element, property, original)
  else element.style.setProperty(property, value, 'important')
}

function captureCountryPathState(path: SVGPathElement): CountryPathState {
  return {
    path,
    originalFill: captureStyle(path, 'fill'),
    originalStroke: captureStyle(path, 'stroke'),
    originalStrokeWidth: captureStyle(path, 'stroke-width'),
    originalFilter: captureStyle(path, 'filter'),
    originalTransition: captureStyle(path, 'transition'),
    originalVisibility: captureStyle(path, 'visibility'),
    originalPointerEvents: captureStyle(path, 'pointer-events'),
  }
}

function formatSvgMatrix(transform: SvgAffineTransform): string {
  const values = [transform.a, transform.b, transform.c, transform.d, transform.e, transform.f]
    .map(value => Number(value.toFixed(6)))
  return `matrix(${values.join(' ')})`
}

function createOutlineGeometry(
  path: SVGPathElement,
  mapSvg: SVGSVGElement,
  document: Document,
): SVGPathElement {
  const clone = path.cloneNode(true) as SVGPathElement
  clone.removeAttribute('id')
  clone.setAttribute('data-svg-map-group-outline-source', path.id.trim())
  clone.setAttribute('pointer-events', 'none')
  clone.style.setProperty('pointer-events', 'none', 'important')

  const transform = readSvgElementTransformToLayer(path, mapSvg)
  if (transform) {
    clone.setAttribute('transform', formatSvgMatrix(transform))
    clone.style.removeProperty('transform')
  }
  return clone
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

interface KeyboardListener {
  group: SVGGElement
  keydown: EventListener
}

function isFinitePositiveViewBox(bounds: SvgViewBoxRect): boolean {
  return [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
    && bounds.width > 0
    && bounds.height > 0
}

function copyGroup(group: SvgMapHoverGroup): SvgMapHoverGroup {
  return { id: group.id, countryIds: [...group.countryIds] }
}

function copyOutline(outline: SvgMapGroupOutline): SvgMapGroupOutline {
  return {
    id: outline.id,
    countryIds: [...outline.countryIds],
    ...(outline.effect === undefined ? {} : { effect: outline.effect }),
    ...(outline.placement === undefined ? {} : { placement: outline.placement }),
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
  private countryPatterns = new Map<string, SvgMapCountryPattern>()
  private mutedCountries = new Set<string>()
  private hiddenCountries = new Set<string>()
  private hoverableCountries: Set<string> | null = null
  private selectableCountries: Set<string> | null = null
  private named = new Set<string>()
  private countryLabelOverrides = new Map<string, string>()
  private hoverGroups: SvgMapHoverGroup[] = []
  private groupOutlines: SvgMapGroupOutline[] = []
  private visibleGroupOutlines = new Set<string>()
  private outlineLayers: SVGGElement[] = []
  private outlineSequence = 0
  private hoveredCountryId: string | null = null
  private hoveredNameOverride: boolean | null = null
  private hoveredIds = new Set<string>()
  private listeners: HoverListeners[] = []
  private keyboardListeners: KeyboardListener[] = []
  private readonly taskAssistance: SvgTaskAssistanceRuntime
  private renderBatchDepth = 0
  private renderPending = false
  private resizeObserver: ResizeObserver | null = null
  private countryClickHandler: ((countryId: string) => void) | null = null
  private countryHoverHandler: ((countryId: string | null) => void) | null = null
  private svg: SVGSVGElement | null = null
  private originalViewBox: string | null = null
  private presentation: SvgMapPresentation = 'standard'
  private zoomIntent: {
    kind: 'view-box'
    bounds: SvgViewBoxRect
  } | {
    kind: 'country-bounds'
    countryIds: readonly string[]
    padding: number
  } | {
    kind: 'target-centric-neighbourhood'
    targetIds: readonly string[]
    contextIds: readonly string[]
  } | null = null
  private loadVersion = 0
  private abortController: AbortController | null = null
  private destroyed = false
  private discoveryCache: { markup: string; countries: readonly SvgMapCountry[] } | null = null

  constructor(mount: HTMLElement, settings: Partial<SvgMapSettings> = {}, viewportElement: HTMLElement = mount) {
    this.mount = mount
    this.viewportElement = viewportElement
    this.settings = this.mergeSettings(DEFAULT_SVG_MAP_SETTINGS, settings)
    this.taskAssistance = new SvgTaskAssistanceRuntime({
      getCountries: () => this.countries.values(),
      isSelectable: countryId => this.isSelectable(countryId),
      isHidden: countryId => this.hiddenCountries.has(countryId),
      dispatchCountryClick: countryId => this.countryClickHandler?.(countryId),
      requestRender: () => this.render(),
      getSettings: () => this.settings,
    })
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
    this.syncLayoutAspectRatio()
    this.observeResize()
    this.bindDiscoveredCountries(imported, markup)
    this.attachHoverListeners()
    this.taskAssistance.attach(imported)
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

  /** Apply all React-owned map presentation state with one final DOM render. */
  updatePresentation(state: SvgMapPresentationState): void {
    this.assertUsable()
    this.renderBatchDepth += 1
    this.renderPending = true
    const presentationChanged = this.presentation !== state.presentation
    this.presentation = state.presentation
    try {
      this.updateSettings(state.settings)
      if (state.hoverGroups !== undefined) this.setHoverGroups(state.hoverGroups)
      this.setGroupOutlines(state.groupOutlines)
      this.setHiddenCountries(state.hiddenIds)
      if (state.hoverableIds === undefined) this.resetHoverableCountries()
      else this.setHoverableCountries(state.hoverableIds)
      if (state.selectableIds === undefined) this.resetSelectableCountries()
      else this.setSelectableCountries(state.selectableIds)
      this.setTaskAssistance(state.taskAssistance)
      this.setHighlighted(state.highlightedIds)
      this.setMutedCountries(state.mutedIds)
      this.clearColors()
      this.setCountryColors(state.countryColors)
      this.clearPatterns()
      if (state.countryPatterns !== undefined) this.setCountryPatterns(state.countryPatterns)
      const previouslyNamed = this.getNamedIds()
      this.clearCountryLabels()
      if (Object.keys(state.countryLabels).length > 0) this.setCountryLabels(state.countryLabels)
      if (previouslyNamed.length > 0) this.setNamesVisible(previouslyNamed, false)
      if (state.namedIds.length > 0) this.setNamesVisible(state.namedIds, true)
      this.hoverCountry(state.hoveredId)
      if (presentationChanged) this.recomputeViewBox()
    } finally {
      this.renderBatchDepth -= 1
      if (this.renderBatchDepth === 0 && this.renderPending) {
        this.renderPending = false
        this.renderNow()
      }
    }
  }

  setCamera(camera: SvgMapCameraIntent): SvgMapMutationResult {
    switch (camera.kind) {
      case 'default':
        this.resetZoom()
        return { activeIds: [], unknownIds: [] }
      case 'view-box':
        return this.setViewBoxRect(camera.bounds)
      case 'country-bounds':
        if (camera.countryIds.length === 0) {
          this.resetZoom()
          return { activeIds: [], unknownIds: [] }
        }
        return this.setZoomArea(camera.countryIds, camera.padding)
      case 'target-centric-neighbourhood':
        return this.setTargetCentricZoom(camera.targetIds, camera.contextIds)
    }
  }

  setViewBoxRect(bounds: SvgViewBoxRect): SvgMapMutationResult {
    this.assertUsable()
    if (!isFinitePositiveViewBox(bounds)) {
      this.resetZoom()
      return { activeIds: [], unknownIds: [] }
    }
    this.zoomIntent = { kind: 'view-box', bounds: { ...bounds } }
    this.recomputeViewBox(bounds)
    return { activeIds: [], unknownIds: [] }
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
    this.zoomIntent = { kind: 'country-bounds', countryIds: knownIds, padding: safePadding }
    this.recomputeViewBox(target)
    return { activeIds: knownIds, unknownIds }
  }

  /**
   * Fit a stable local neighbourhood around the target geometry.
   *
   * Context paths are used only to identify nearby local portions. Their full
   * bounding boxes never become the camera bounds, so a large Country such as
   * Russia or China cannot pull a small target out to a world-scale view.
   */
  setTargetCentricZoom(
    targetIds: Iterable<string>,
    contextIds: Iterable<string> = [],
  ): SvgMapMutationResult {
    this.assertUsable()
    const target = this.resolveKnown(targetIds)
    const context = this.resolveKnown(contextIds)
    const activeIds = uniqueStrings([...target.knownIds, ...context.knownIds])
    const unknownIds = uniqueStrings([...target.unknownIds, ...context.unknownIds])
    if (target.knownIds.length === 0 || !this.svg || !this.originalViewBox) {
      this.resetZoom()
      return { activeIds: [], unknownIds }
    }

    const targetBounds = this.getTargetCentricCountryBounds(target.knownIds, context.knownIds)
    if (!targetBounds) {
      this.resetZoom()
      return { activeIds, unknownIds }
    }
    this.zoomIntent = {
      kind: 'target-centric-neighbourhood',
      targetIds: target.knownIds,
      contextIds: context.knownIds,
    }
    this.recomputeViewBox(targetBounds)
    return { activeIds, unknownIds }
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
      else {
        this.countryPatterns.delete(id)
        this.countryColors.set(id, color)
      }
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

  setCountryPatterns(patterns: SvgMapCountryPatterns): SvgMapMutationResult {
    this.assertUsable()
    const unknownIds: string[] = []
    for (const [rawId, pattern] of this.toPatternEntries(patterns)) {
      const id = rawId.trim()
      if (!id) continue
      if (!this.countries.has(id)) {
        unknownIds.push(id)
        continue
      }
      if (pattern === null) this.countryPatterns.delete(id)
      else {
        this.countryColors.delete(id)
        this.countryPatterns.set(id, { ...pattern })
      }
    }
    this.render()
    return { activeIds: [...this.countryPatterns.keys()], unknownIds: uniqueStrings(unknownIds) }
  }

  clearPatterns(): SvgMapMutationResult {
    this.assertUsable()
    this.countryPatterns.clear()
    this.render()
    return { activeIds: [], unknownIds: [] }
  }

  clearHighlightsAndColors(): SvgMapMutationResult {
    this.assertUsable()
    this.highlighted.clear()
    this.countryColors.clear()
    this.countryPatterns.clear()
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
    return this.taskAssistance.configure(assistance)
  }

  /** Clear task-only hover state when the pointer leaves the map surface. */
  clearTaskHover(): void {
    this.assertUsable()
    this.taskAssistance.clearHover()
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
        ...(outline.effect === undefined ? {} : { effect: outline.effect }),
        ...(outline.placement === undefined ? {} : { placement: outline.placement }),
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

  /** Return canonical labelled-group geometry bounds; wrapped copies stay out of camera geometry. */
  getCountryGeometry(countryId: string): SvgViewBoxRect | null {
    this.assertUsable()
    const country = this.countries.get(countryId)
    return country ? this.getBoundsUnion(this.getCountryBoxes([countryId])) : null
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
      if (paths.length === 0 || !paths.includes(path) || this.countries.has(definition.id)) continue

      const labelPaintElements = [label, ...label.querySelectorAll<SVGElement>('tspan')]
      const originalLabelTextNodes = collectTextNodes(label).map(node => ({ node, value: node.data }))
      const pathStates = paths.map(captureCountryPathState)
      const primaryPathState = pathStates[0]
      if (!primaryPathState) continue
      const group = parent as unknown as SVGGElement
      const originalGroupTabIndex = group.getAttribute('tabindex')
      const originalGroupRole = group.getAttribute('role')
      const originalGroupAriaLabel = group.getAttribute('aria-label')
      if (paths.length > 1) {
        group.setAttribute('tabindex', '0')
        group.setAttribute('role', 'button')
        group.setAttribute('aria-label', definition.name)
      }
      this.countries.set(definition.id, {
        ...definition,
        path,
        geometryPaths: paths,
        paths,
        pathStates,
        group,
        label,
        originalFill: primaryPathState.originalFill,
        originalStroke: primaryPathState.originalStroke,
        originalStrokeWidth: primaryPathState.originalStrokeWidth,
        originalFilter: primaryPathState.originalFilter,
        originalTransition: primaryPathState.originalTransition,
        originalVisibility: primaryPathState.originalVisibility,
        originalPointerEvents: primaryPathState.originalPointerEvents,
        originalGroupTabIndex,
        originalGroupRole,
        originalGroupAriaLabel,
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

    this.bindWrappedCountryPaths(svg)
  }

  /** Associate MapChart's translated duplicate paths without promoting them to new Countries. */
  private bindWrappedCountryPaths(svg: SVGSVGElement): void {
    for (const wrappedPath of svg.querySelectorAll<SVGPathElement>('path[id$="_wrap"]')) {
      const wrappedId = wrappedPath.id.trim()
      const baseId = wrappedId.slice(0, -'_wrap'.length)
      const country = this.countries.get(baseId)
      if (!country || !baseId || country.paths.includes(wrappedPath)) continue
      const wrappedData = wrappedPath.getAttribute('d')?.trim() ?? ''
      const sourceData = country.path.getAttribute('d')?.trim() ?? ''
      if (!sourceData || wrappedData !== sourceData) continue

      country.paths = [...country.paths, wrappedPath]
      country.pathStates = [...country.pathStates, captureCountryPathState(wrappedPath)]
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
      if (paths.length === 0) continue
      const path = paths.find(candidate => candidate.id.trim())
      if (!path) continue
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
        if (this.taskAssistance.isAnswerSelectionConfigured()) return
        if (this.isSelectable(country.id)) this.countryClickHandler?.(country.id)
      }
      for (const countryPath of country.paths) {
        countryPath.addEventListener('pointerenter', enter)
        countryPath.addEventListener('pointerleave', leave)
        countryPath.addEventListener('click', click)
        this.listeners.push({ path: countryPath, enter, leave, click })
      }
      if (isMultipartCountry(country)) {
        const keydown: EventListener = event => {
          const keyboardEvent = event as KeyboardEvent
          if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return
          keyboardEvent.preventDefault()
          if (this.isSelectable(country.id)) this.countryClickHandler?.(country.id)
        }
        country.group.addEventListener('keydown', keydown)
        this.keyboardListeners.push({ group: country.group, keydown })
      }
    }
  }

  private detachHoverListeners(): void {
    for (const { path, enter, leave, click } of this.listeners) {
      path.removeEventListener('pointerenter', enter)
      path.removeEventListener('pointerleave', leave)
      path.removeEventListener('click', click)
    }
    this.listeners = []
    for (const { group, keydown } of this.keyboardListeners) group.removeEventListener('keydown', keydown)
    this.keyboardListeners = []
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
    if (this.renderBatchDepth > 0) {
      this.renderPending = true
      return
    }
    this.renderNow()
  }

  private renderNow(): void {
    if (!this.svg) return
    const view = this.mount.ownerDocument.defaultView
    const reducedMotion = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const transition = reducedMotion || this.settings.transitionMs === 0
      ? 'none'
      : `fill ${this.settings.transitionMs}ms ease, stroke ${this.settings.transitionMs}ms ease, stroke-width ${this.settings.transitionMs}ms ease`

    this.taskAssistance.sync()
    this.svg.querySelectorAll('defs[data-svg-map-country-pattern-defs]').forEach(defs => defs.remove())

    for (const country of this.countries.values()) {
      const hovered = this.hoveredIds.has(country.id)
      const taskHovered = this.taskAssistance.getHoveredCountryId() === country.id
      const pattern = this.countryPatterns.get(country.id)
      const hasSemanticColor = this.countryColors.has(country.id)
      const hasSemanticAppearance = hasSemanticColor || pattern !== undefined
      const baseFill = taskHovered
        ? this.settings.hoverFill
        : hovered && this.settings.hoverHighlight && !hasSemanticAppearance
        ? this.settings.hoverFill
        : pattern
          ? this.getPatternUrl(pattern)
          : this.countryColors.get(country.id)
          ?? (this.highlighted.has(country.id)
            ? this.settings.highlightFill
            : this.settings.countryFill)
      const fill = taskHovered
        ? this.settings.hoverFill
        : this.mutedCountries.has(country.id)
        ? this.settings.mutedFill
        : baseFill

      const styled = this.highlighted.has(country.id) || hasSemanticAppearance
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

      const hidden = this.hiddenCountries.has(country.id)
      for (const pathState of country.pathStates) {
        setOverride(pathState.path, 'fill', fill, pathState.originalFill)
        setOverride(pathState.path, 'stroke', stroke, pathState.originalStroke)
        setOverride(pathState.path, 'stroke-width', strokeWidth, pathState.originalStrokeWidth)
        pathState.path.style.setProperty('transition', transition)
        restoreStyle(pathState.path, 'filter', pathState.originalFilter)
        setOverride(pathState.path, 'visibility', hidden ? 'hidden' : null, pathState.originalVisibility)
        setOverride(pathState.path, 'pointer-events', hidden ? 'none' : null, pathState.originalPointerEvents)
      }
      if (isMultipartCountry(country)) country.group.setAttribute('tabindex', hidden ? '-1' : '0')

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
      this.taskAssistance.renderCountryTaskState(country, fill, hidden, reducedMotion)
    }
    this.renderGroupOutlines()
  }

  private setHoveredCountryAndNotify(id: string | null): void {
    this.setHoveredCountry(id)
    this.countryHoverHandler?.(this.hoveredCountryId === id ? id : null)
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
    this.outlineLayers.forEach(layer => layer.remove())
    this.outlineLayers = []

    const firstPath = this.countries.values().next().value?.path
    const mapSvg = firstPath?.ownerSVGElement
    if (!mapSvg) return

    mapSvg.querySelectorAll('filter[data-svg-map-group-outline-filter]').forEach(filter => filter.remove())
    const activeOutlines = this.groupOutlines.filter(outline => this.visibleGroupOutlines.has(outline.id))
    if (activeOutlines.length === 0) return

    const document = mapSvg.ownerDocument
    const createLayer = (placement: 'underlay' | 'overlay'): SVGGElement => {
      const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      layer.setAttribute('data-svg-map-group-outlines', '')
      layer.setAttribute('data-svg-map-group-outline-placement', placement)
      layer.setAttribute('pointer-events', 'none')
      return layer
    }
    const underlayLayer = createLayer('underlay')
    const overlayLayer = createLayer('overlay')

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
      outside.setAttribute('result', 'outside')

      const effect = outline.effect ?? 'outline'
      if (effect === 'halo') {
        const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur')
        blur.setAttribute('in', 'outside')
        blur.setAttribute('stdDeviation', String(Math.max(1, radius * 1.5)))
        blur.setAttribute('result', 'halo')
        const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge')
        const haloNode = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
        haloNode.setAttribute('in', 'halo')
        const outlineNode = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
        outlineNode.setAttribute('in', 'outside')
        merge.append(haloNode, outlineNode)
        filter.append(dilated, flood, color, outside, blur, merge)
      } else {
        filter.append(dilated, flood, color, outside)
      }
      const defs = mapSvg.querySelector('defs') ?? (() => {
        const created = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        mapSvg.insertBefore(created, mapSvg.firstChild)
        return created
      })()
      defs.append(filter)

      const outlineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      outlineGroup.setAttribute('data-svg-map-group-outline', outline.id)
      outlineGroup.setAttribute('data-svg-map-group-outline-effect', effect)
      outlineGroup.setAttribute('data-svg-map-group-outline-placement', outline.placement ?? 'overlay')
      outlineGroup.setAttribute('filter', `url(#${filterId})`)
      for (const countryId of outline.countryIds) {
        const country = this.countries.get(countryId)
        if (!country || this.hiddenCountries.has(countryId) || this.mutedCountries.has(countryId)) continue
        for (const pathState of country.pathStates) {
          outlineGroup.append(createOutlineGeometry(pathState.path, mapSvg, document))
        }
      }
      if (outlineGroup.childElementCount > 0) {
        const layer = outline.placement === 'underlay' ? underlayLayer : overlayLayer
        layer.append(outlineGroup)
      }
    }

    let firstCountryElement: Element = firstPath
    while (firstCountryElement.parentNode && firstCountryElement.parentNode !== mapSvg) {
      firstCountryElement = firstCountryElement.parentNode as Element
    }
    if (underlayLayer.childElementCount > 0) {
      mapSvg.insertBefore(underlayLayer, firstCountryElement)
      this.outlineLayers.push(underlayLayer)
    }
    if (overlayLayer.childElementCount > 0) {
      mapSvg.append(overlayLayer)
      this.outlineLayers.push(overlayLayer)
    }
  }

  private getPatternUrl(pattern: SvgMapCountryPattern): string {
    const mapSvg = this.svg
    if (!mapSvg) return pattern.baseColor
    const key = `${pattern.kind}|${pattern.baseColor}|${pattern.lineColor}|${pattern.lineWidth ?? 2}|${pattern.pitch ?? 16}`
    const encoded = [...key].map(char => char.codePointAt(0)?.toString(16) ?? '').join('')
    const id = `svg-map-country-pattern-${encoded}`
    let defs = mapSvg.querySelector<SVGDefsElement>('defs[data-svg-map-country-pattern-defs]')
    if (!defs) {
      defs = mapSvg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'defs')
      defs.setAttribute('data-svg-map-country-pattern-defs', 'true')
      mapSvg.insertBefore(defs, mapSvg.firstChild)
    }
    if (!defs.querySelector(`#${id}`)) {
      const pitch = pattern.pitch ?? 16
      const width = pattern.lineWidth ?? 2
      const svgPattern = mapSvg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'pattern')
      svgPattern.setAttribute('id', id)
      svgPattern.setAttribute('data-svg-map-country-pattern', pattern.kind)
      svgPattern.setAttribute('patternUnits', 'userSpaceOnUse')
      svgPattern.setAttribute('width', String(pitch))
      svgPattern.setAttribute('height', String(pitch))
      const background = mapSvg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'rect')
      background.setAttribute('width', String(pitch))
      background.setAttribute('height', String(pitch))
      background.setAttribute('fill', pattern.baseColor)
      svgPattern.appendChild(background)
      const directions = pattern.kind === 'crosshatch' ? ['forward', 'backward'] : ['forward']
      for (const direction of directions) {
        const line = mapSvg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path')
        line.setAttribute('d', direction === 'forward'
          ? `M-${pitch / 4},${pitch / 4} L${pitch / 4},-${pitch / 4} M0,${pitch} L${pitch},0 M${pitch * 3 / 4},${pitch * 5 / 4} L${pitch * 5 / 4},${pitch * 3 / 4}`
          : `M-${pitch / 4},${pitch * 3 / 4} L${pitch / 4},${pitch * 5 / 4} M0,0 L${pitch},${pitch} M${pitch * 3 / 4},-${pitch / 4} L${pitch * 5 / 4},${pitch / 4}`)
        line.setAttribute('fill', 'none')
        line.setAttribute('stroke', pattern.lineColor)
        line.setAttribute('stroke-width', String(width))
        svgPattern.appendChild(line)
      }
      defs.appendChild(svgPattern)
    }
    return `url(#${id})`
  }

  private toColorEntries(colors: SvgMapCountryColors): Iterable<readonly [string, string | null]> {
    if (Symbol.iterator in Object(colors)) return colors as Iterable<readonly [string, string | null]>
    return Object.entries(colors)
  }

  private toPatternEntries(patterns: SvgMapCountryPatterns): Iterable<readonly [string, SvgMapCountryPattern | null]> {
    if (Symbol.iterator in Object(patterns)) return patterns as Iterable<readonly [string, SvgMapCountryPattern | null]>
    return Object.entries(patterns)
  }

  private getPaddedCountryBounds(countryIds: readonly string[], padding: number): SvgViewBoxRect | null {
    return this.getPaddedBounds(this.getCountryBoxes(countryIds), padding)
  }

  private getPaddedBounds(boxes: readonly SvgViewBoxRect[], padding: number): SvgViewBoxRect | null {
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

  /** Derive one stable, padded frame around the target and local context points. */
  private getTargetCentricCountryBounds(
    targetIds: readonly string[],
    contextIds: readonly string[],
  ): SvgViewBoxRect | null {
    const selection = this.selectTargetGeometryComponents(targetIds, contextIds)
    return selection
      ? this.getTargetCentricCountryBoundsFromSelection(selection)
      : null
  }

  private restoreCountryState(country: InternalCountry): void {
    for (const pathState of country.pathStates) {
      restoreStyle(pathState.path, 'fill', pathState.originalFill)
      restoreStyle(pathState.path, 'stroke', pathState.originalStroke)
      restoreStyle(pathState.path, 'stroke-width', pathState.originalStrokeWidth)
      restoreStyle(pathState.path, 'filter', pathState.originalFilter)
      restoreStyle(pathState.path, 'transition', pathState.originalTransition)
      restoreStyle(pathState.path, 'visibility', pathState.originalVisibility)
      restoreStyle(pathState.path, 'pointer-events', pathState.originalPointerEvents)
    }
    restoreStyle(country.label, 'display', country.originalLabelDisplay)
    restoreStyle(country.label, 'pointer-events', country.originalLabelPointerEvents)
    restoreAttribute(country.group, 'tabindex', country.originalGroupTabIndex)
    restoreAttribute(country.group, 'role', country.originalGroupRole)
    restoreAttribute(country.group, 'aria-label', country.originalGroupAriaLabel)
    for (const paint of country.labelPaint) restoreStyle(paint.element, 'fill', paint.originalFill)
    for (const textNode of country.originalLabelTextNodes) textNode.node.data = textNode.value
  }

  private getTargetCentricCountryBoundsFromSelection(
    selection: TargetComponentSelection,
  ): SvgViewBoxRect | null {

    const sourceBounds = this.originalViewBox ? parseViewBox(this.originalViewBox) : null
    const fallbackSourceSize = Math.max(selection.targetBounds.width, selection.targetBounds.height)
    const sourceWidth = sourceBounds?.width ?? fallbackSourceSize
    const sourceHeight = sourceBounds?.height ?? fallbackSourceSize
    const contextBounds = selection.contextAssociations.flatMap(({ path, component }) => {
      const bounds = this.getLocalContextBounds(path, component.bounds, sourceWidth, sourceHeight)
      return bounds ? [bounds] : []
    })
    const targetBounds = selection.targetBounds
    const cluster = this.getBoundsAroundRects(targetBounds, contextBounds)
    const minimumPadding = Math.min(sourceWidth, sourceHeight) * 0.02
    const paddingX = Math.max(targetBounds.width * TARGET_CENTRIC_PADDING_RATIO, minimumPadding)
    const paddingY = Math.max(targetBounds.height * TARGET_CENTRIC_PADDING_RATIO, minimumPadding)
    const horizontal = this.fitTargetClusterAxis(
      cluster.x,
      cluster.x + cluster.width,
      targetBounds.x,
      targetBounds.x + targetBounds.width,
      paddingX,
      sourceWidth * TARGET_CENTRIC_MIN_WINDOW_RATIO,
      sourceWidth * TARGET_CENTRIC_MAX_WINDOW_RATIO,
    )
    const vertical = this.fitTargetClusterAxis(
      cluster.y,
      cluster.y + cluster.height,
      targetBounds.y,
      targetBounds.y + targetBounds.height,
      paddingY,
      sourceHeight * TARGET_CENTRIC_MIN_WINDOW_RATIO,
      sourceHeight * TARGET_CENTRIC_MAX_WINDOW_RATIO,
    )
    return {
      x: horizontal.center - horizontal.size / 2,
      y: vertical.center - vertical.size / 2,
      width: horizontal.size,
      height: vertical.size,
    }
  }

  private selectTargetGeometryComponents(
    targetIds: readonly string[],
    contextIds: readonly string[],
  ): TargetComponentSelection | null {
    const targetComponents = this.getTargetGeometryComponents(targetIds)
    if (targetComponents.length === 0) return null

    const contextAssociations = contextIds.flatMap(id => {
      const country = this.countries.get(id)
      if (!country) return []
      const closest = country.geometryPaths.reduce((current, geometryPath) => {
        const candidate = this.findClosestTargetComponent(targetComponents, geometryPath)
        if (!candidate || (current && candidate.distance >= current.distance)) return current
        return { path: geometryPath, component: candidate.component, distance: candidate.distance }
      }, null as (TargetContextAssociation & { distance: number }) | null)
      return closest ? [{ path: closest.path, component: closest.component }] : []
    })
    // One closest component is the deterministic representative for each
    // required neighbour ID, including multipart neighbour Countries.
    const selectedKeys = new Set(contextAssociations.map(association => association.component.key))
    for (const point of this.getTaskTargetPoints(targetIds)) {
      const closest = targetComponents.reduce((current, candidate) => {
        const distance = this.distanceToBounds(point, candidate.bounds)
        if (!current || distance < current.distance) return { component: candidate, distance }
        return current
      }, null as { component: TargetGeometryComponent; distance: number } | null)
      if (closest) selectedKeys.add(closest.component.key)
    }
    if (selectedKeys.size === 0) {
      if (contextIds.length > 0) return null
      const largest = targetComponents.reduce((current, candidate) => {
        const currentArea = current.bounds.width * current.bounds.height
        const candidateArea = candidate.bounds.width * candidate.bounds.height
        return candidateArea > currentArea ? candidate : current
      })
      selectedKeys.add(largest.key)
    }
    const selectedComponents = targetComponents.filter(component => selectedKeys.has(component.key))
    const targetBounds = this.includeTaskTargetPoints(
      this.getBoundsUnion(selectedComponents.map(component => component.bounds)),
      targetIds,
    )
    return targetBounds ? { targetBounds, contextAssociations } : null
  }

  private getTaskTargetPoints(targetIds: readonly string[]): SvgPoint[] {
    return targetIds.flatMap(id => {
      const point = this.taskAssistance.getTaskTargetPoint(id)
      return point ? [point] : []
    })
  }

  private includeTaskTargetPoints(
    bounds: SvgViewBoxRect | null,
    targetIds: readonly string[],
  ): SvgViewBoxRect | null {
    const points = this.getTaskTargetPoints(targetIds)
    if (points.length === 0) return bounds

    const sourceBounds = this.originalViewBox ? parseViewBox(this.originalViewBox) : null
    const fallbackSize = Math.max(bounds?.width ?? 0, bounds?.height ?? 0)
    const sourceSize = sourceBounds ? Math.min(sourceBounds.width, sourceBounds.height) : fallbackSize
    const padding = Math.max(sourceSize * TASK_TARGET_ANCHOR_PADDING_RATIO, Number.EPSILON)
    const pointBounds = points.map(point => ({
      x: point.x - padding,
      y: point.y - padding,
      width: padding * 2,
      height: padding * 2,
    }))
    return this.getBoundsUnion(bounds ? [bounds, ...pointBounds] : pointBounds)
  }

  private getTargetGeometryComponents(targetIds: readonly string[]): TargetGeometryComponent[] {
    return targetIds.flatMap(countryId => {
      const country = this.countries.get(countryId)
      if (!country) return []
      return country.geometryPaths.flatMap((geometryPath, pathIndex) => {
        const pathData = geometryPath.getAttribute('d') ?? ''
        const sourceComponents = readSvgPathGeometryComponents(pathData)
        const expectedComponents = countDrawnPathComponents(pathData)
        if (expectedComponents > sourceComponents.length) return []
        const components = sourceComponents.flatMap((component, componentIndex) => {
          const bounds = this.transformBoundsToMap(geometryPath, component.bounds)
          if (!bounds) return []
          return [{
            key: `${countryId}:${pathIndex}:${componentIndex}`,
            bounds,
          }]
        })
        if (components.length > 0) return components

        const bounds = this.getCountryBoxInLayer(geometryPath)
        return bounds
          ? [{ key: `${countryId}:${pathIndex}:fallback`, bounds }]
          : []
      })
    })
  }

  private findClosestTargetComponent(
    components: readonly TargetGeometryComponent[],
    contextPath: SVGPathElement,
  ): { component: TargetGeometryComponent; distance: number } | null {
    const samples = this.samplePathPoints(contextPath)
    const contextBounds = this.getCountryBoxInLayer(contextPath)
    if (samples.length === 0 && !contextBounds) return null

    return components.reduce((closest, candidate) => {
      const candidateDistance = samples.length > 0
        ? Math.min(...samples.map(point => this.distanceToBounds(point, candidate.bounds)))
        : this.distanceBetweenBounds(contextBounds!, candidate.bounds)
      if (!closest) return { component: candidate, distance: candidateDistance }
      return candidateDistance < closest.distance
        ? { component: candidate, distance: candidateDistance }
        : closest
    }, null as { component: TargetGeometryComponent; distance: number } | null)
  }

  private getLocalContextBounds(
    path: SVGPathElement,
    targetBounds: SvgViewBoxRect,
    sourceWidth: number,
    sourceHeight: number,
  ): SvgViewBoxRect | null {
    const samples = this.samplePathPoints(path)
    if (samples.length > 0) {
      const point = samples.reduce((nearest, candidate) => this.distanceToBounds(candidate, targetBounds) < this.distanceToBounds(nearest, targetBounds) ? candidate : nearest)
      return { x: point.x, y: point.y, width: 0, height: 0 }
    }
    const box = this.getCountryBoxInLayer(path)
    if (!box) return null
    const maximumFallbackContextSize = Math.min(sourceWidth, sourceHeight) * 0.2
    if (box.width <= maximumFallbackContextSize && box.height <= maximumFallbackContextSize) return box
    const targetCenterX = targetBounds.x + targetBounds.width / 2
    const targetCenterY = targetBounds.y + targetBounds.height / 2
    return {
      x: Math.min(Math.max(targetCenterX, box.x), box.x + box.width),
      y: Math.min(Math.max(targetCenterY, box.y), box.y + box.height),
      width: 0,
      height: 0,
    }
  }

  private samplePathPoints(path: SVGPathElement): SvgPoint[] {
    const geometry = path as SVGPathElement & {
      getTotalLength?: () => number
      getPointAtLength?: (distance: number) => { x: number; y: number }
    }
    if (typeof geometry.getTotalLength !== 'function' || typeof geometry.getPointAtLength !== 'function') return []
    let totalLength: number
    try {
      totalLength = geometry.getTotalLength()
    } catch {
      return []
    }
    if (!Number.isFinite(totalLength) || totalLength <= 0) return []

    const points: SvgPoint[] = []
    for (let index = 0; index < TARGET_CENTRIC_CONTEXT_SAMPLE_COUNT; index += 1) {
      try {
        const point = geometry.getPointAtLength(totalLength * index / (TARGET_CENTRIC_CONTEXT_SAMPLE_COUNT - 1))
        if (Number.isFinite(point.x) && Number.isFinite(point.y)) points.push(this.transformPointToMap(path, { x: point.x, y: point.y }))
      } catch {
        return []
      }
    }
    return points
  }

  private distanceToBounds(point: SvgPoint, bounds: SvgViewBoxRect): number {
    const dx = Math.max(bounds.x - point.x, 0, point.x - (bounds.x + bounds.width))
    const dy = Math.max(bounds.y - point.y, 0, point.y - (bounds.y + bounds.height))
    return dx * dx + dy * dy
  }

  private distanceBetweenBounds(left: SvgViewBoxRect, right: SvgViewBoxRect): number {
    const dx = Math.max(left.x - (right.x + right.width), 0, right.x - (left.x + left.width))
    const dy = Math.max(left.y - (right.y + right.height), 0, right.y - (left.y + left.height))
    return dx * dx + dy * dy
  }

  private transformPointToMap(path: SVGPathElement, point: SvgPoint): SvgPoint {
    return this.svg ? transformSourcePointToLayer(path, point, this.svg) ?? point : point
  }

  private transformBoundsToMap(path: SVGPathElement, bounds: SvgViewBoxRect): SvgViewBoxRect | null {
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    ].map(point => this.transformPointToMap(path, point))
    return this.getBoundsAroundPoints(corners)
  }

  private getBoundsAroundPoints(points: readonly SvgPoint[]): SvgViewBoxRect | null {
    if (points.length === 0) return null
    const minX = Math.min(...points.map(point => point.x))
    const minY = Math.min(...points.map(point => point.y))
    const maxX = Math.max(...points.map(point => point.x))
    const maxY = Math.max(...points.map(point => point.y))
    if (![minX, minY, maxX, maxY].every(Number.isFinite) || maxX <= minX || maxY <= minY) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  private getCountryBoxInLayer(path: SVGPathElement): SvgViewBoxRect | null {
    const box = this.getCountryBox(path)[0]
    return box ? this.transformBoundsToMap(path, box) ?? box : null
  }

  private getBoundsAroundRects(targetBounds: SvgViewBoxRect, rects: readonly SvgViewBoxRect[]): SvgViewBoxRect {
    let minX = targetBounds.x
    let minY = targetBounds.y
    let maxX = targetBounds.x + targetBounds.width
    let maxY = targetBounds.y + targetBounds.height
    for (const rect of rects) {
      minX = Math.min(minX, rect.x)
      minY = Math.min(minY, rect.y)
      maxX = Math.max(maxX, rect.x + rect.width)
      maxY = Math.max(maxY, rect.y + rect.height)
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  private fitTargetClusterAxis(
    clusterMin: number,
    clusterMax: number,
    targetMin: number,
    targetMax: number,
    padding: number,
    minimumSize: number,
    maximumSize: number,
  ): { center: number; size: number } {
    const targetSize = targetMax - targetMin
    const size = Math.max(clusterMax - clusterMin + padding * 2, targetSize, minimumSize)
    const cappedSize = Math.max(targetSize, Math.min(size, maximumSize))
    const clusterCenter = (clusterMin + clusterMax) / 2
    const targetCenterMin = targetMax - cappedSize / 2
    const targetCenterMax = targetMin + cappedSize / 2
    return {
      center: Math.min(targetCenterMax, Math.max(targetCenterMin, clusterCenter)),
      size: cappedSize,
    }
  }

  private getCountryBoxes(countryIds: readonly string[]): SvgViewBoxRect[] {
    return countryIds.flatMap(id => {
      const country = this.countries.get(id)
      if (!country) return []
      return country.geometryPaths.flatMap(path => this.getCountryBox(path))
    })
  }

  private getCountryBox(path: SVGPathElement): SvgViewBoxRect[] {
    const box = readSvgGeometryBounds(path)
    return box && box.width > 0 && box.height > 0 ? [box] : []
  }

  private getBoundsUnion(boxes: readonly SvgViewBoxRect[]): SvgViewBoxRect | null {
    if (boxes.length === 0) return null
    const minX = Math.min(...boxes.map(box => box.x))
    const minY = Math.min(...boxes.map(box => box.y))
    const maxX = Math.max(...boxes.map(box => box.x + box.width))
    const maxY = Math.max(...boxes.map(box => box.y + box.height))
    if (maxX <= minX || maxY <= minY) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  private getMapSlotAspect(): number | null {
    const sourceBounds = this.originalViewBox ? parseViewBox(this.originalViewBox) : null
    if (this.presentation !== 'expanded') {
      return sourceBounds ? sourceBounds.width / sourceBounds.height : null
    }
    const viewportRect = this.viewportElement.getBoundingClientRect()
    if (viewportRect.width > 0 && viewportRect.height > 0) return viewportRect.width / viewportRect.height
    const mountRect = this.mount.getBoundingClientRect()
    if (mountRect.width > 0 && mountRect.height > 0) return mountRect.width / mountRect.height
    return sourceBounds ? sourceBounds.width / sourceBounds.height : null
  }

  private recomputeViewBox(explicitTarget?: SvgViewBoxRect): void {
    if (!this.svg) return
    const target = explicitTarget ?? this.getRetainedZoomBounds()
    if (!target) return
    const fitted = fitViewBoxToAspect(target, this.getMapSlotAspect())
    const value = `${fitted.x} ${fitted.y} ${fitted.width} ${fitted.height}`
    if (this.svg.getAttribute('viewBox') === value) {
      this.render()
      return
    }
    this.applyViewBox(value)
  }

  private getRetainedZoomBounds(): SvgViewBoxRect | null {
    if (!this.zoomIntent) return this.originalViewBox ? parseViewBox(this.originalViewBox) : null
    return this.zoomIntent.kind === 'view-box'
      ? this.zoomIntent.bounds
      : this.zoomIntent.kind === 'country-bounds'
        ? this.getPaddedCountryBounds(this.zoomIntent.countryIds, this.zoomIntent.padding)
        : this.getTargetCentricCountryBounds(this.zoomIntent.targetIds, this.zoomIntent.contextIds)
  }

  private applyViewBox(value: string): void {
    if (!this.svg) return
    this.svg.setAttribute('viewBox', value)
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

  /** Keep the physical SVG surface tied to its source map, not camera framing. */
  private syncLayoutAspectRatio(): void {
    if (!this.svg || !this.originalViewBox) return
    const bounds = parseViewBox(this.originalViewBox)
    if (bounds) this.svg.style.aspectRatio = `${bounds.width} / ${bounds.height}`
  }

  private resetMap(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.taskAssistance.reset()
    this.detachHoverListeners()
    for (const country of this.countries.values()) this.restoreCountryState(country)
    this.countries.clear()
    this.highlighted.clear()
    this.countryColors.clear()
    this.countryPatterns.clear()
    this.mutedCountries.clear()
    this.hiddenCountries.clear()
    this.hoverableCountries = null
    this.selectableCountries = null
    this.named.clear()
    this.countryLabelOverrides.clear()
    this.hoverGroups = []
    this.groupOutlines = []
    this.visibleGroupOutlines.clear()
    this.outlineLayers = []
    this.hoveredCountryId = null
    this.hoveredNameOverride = null
    this.hoveredIds.clear()
    this.svg = null
    this.originalViewBox = null
    this.zoomIntent = null
    this.mount.replaceChildren()
  }
}
