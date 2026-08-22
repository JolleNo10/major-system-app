export type SvgMapSource = { url: string } | { markup: string }
export type SvgMapHighlightScope = 'listed' | 'all-except'
export type SvgMapHoverScope = 'single' | 'group'

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

interface TinyCountryTarget {
  countryId: string
  centerX: number
  centerY: number
  hitRadius: number
  markerRadius: number
  group: SVGGElement
  marker: SVGCircleElement
  ring: SVGCircleElement
  hit: SVGCircleElement
  enter: EventListener
  leave: EventListener
  click: EventListener
}

const FORBIDDEN_ELEMENTS = 'script, foreignObject, iframe, object, embed, image, style'
const XLINK_NS = 'http://www.w3.org/1999/xlink'
const TINY_GEOMETRY_MAX_DIMENSION = 12
const TINY_MARKER_MIN_RADIUS = 3
const TINY_MARKER_MAX_RADIUS = 6
const TINY_HIT_MIN_RADIUS = 10
const TINY_HIT_MAX_RADIUS = 18

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
  private settings: SvgMapSettings
  private countries = new Map<string, InternalCountry>()
  private highlighted = new Set<string>()
  private countryColors = new Map<string, string>()
  private mutedCountries = new Set<string>()
  private hiddenCountries = new Set<string>()
  private hoverableCountries: Set<string> | null = null
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
  private tinyTargets = new Map<string, TinyCountryTarget>()
  private tinyTargetLayer: SVGGElement | null = null
  private countryClickHandler: ((countryId: string) => void) | null = null
  private countryHoverHandler: ((countryId: string | null) => void) | null = null
  private svg: SVGSVGElement | null = null
  private originalViewBox: string | null = null
  private loadVersion = 0
  private abortController: AbortController | null = null
  private destroyed = false
  private discoveryCache: { markup: string; countries: readonly SvgMapCountry[] } | null = null

  constructor(mount: HTMLElement, settings: Partial<SvgMapSettings> = {}) {
    this.mount = mount
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
    this.bindDiscoveredCountries(imported, markup)
    this.attachHoverListeners()
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

  setZoomArea(countryIds: Iterable<string>, padding = 40): SvgMapMutationResult {
    this.assertUsable()
    const { knownIds, unknownIds } = this.resolveKnown(countryIds)
    if (knownIds.length === 0 || !this.svg || !this.originalViewBox) {
      return { activeIds: [], unknownIds }
    }

    const originalBounds = this.parseViewBox(this.originalViewBox)
    if (!originalBounds) return { activeIds: knownIds, unknownIds }

    const boxes = knownIds.flatMap(id => {
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
    if (boxes.length === 0) return { activeIds: knownIds, unknownIds }

    const safePadding = Number.isFinite(padding) ? Math.max(0, padding) : 0
    // Keep the requested breathing room even when the target is near an edge
    // of the source map. The SVG background remains visible in this overscan
    // area, while resetZoom() still restores the source viewBox exactly.
    const minX = Math.min(...boxes.map(box => box.x)) - safePadding
    const minY = Math.min(...boxes.map(box => box.y)) - safePadding
    const maxX = Math.max(...boxes.map(box => box.x + box.width)) + safePadding
    const maxY = Math.max(...boxes.map(box => box.y + box.height)) + safePadding
    if (maxX <= minX || maxY <= minY) return { activeIds: knownIds, unknownIds }

    this.setViewBox(`${minX} ${minY} ${maxX - minX} ${maxY - minY}`)
    return { activeIds: knownIds, unknownIds }
  }

  resetZoom(): void {
    this.assertUsable()
    if (this.svg && this.originalViewBox) this.setViewBox(this.originalViewBox)
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
    if (this.hoveredCountryId !== null && !this.isInteractive(this.hoveredCountryId)) {
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
        if (!this.isInteractive(country.id)) {
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
        if (this.isInteractive(country.id)) this.countryClickHandler?.(country.id)
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
    if (id !== null && !this.isInteractive(id)) {
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
    if (!id || !this.isInteractive(id)
      || (!this.settings.hoverHighlight && !this.settings.hoverShowName && this.hoveredNameOverride !== true)) return

    if (this.settings.hoverScope === 'single') {
      this.hoveredIds.add(id)
      return
    }

    for (const group of this.hoverGroups) {
      if (!group.countryIds.includes(id)) continue
      for (const countryId of group.countryIds) {
        if (this.isInteractive(countryId)) this.hoveredIds.add(countryId)
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
    return this.hoverableCountries === null || this.hoverableCountries.has(id)
  }

  private isInteractive(id: string): boolean {
    return !this.hiddenCountries.has(id) && this.isHoverable(id)
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

    this.syncTinyTargets()

    for (const country of this.countries.values()) {
      const hovered = this.hoveredIds.has(country.id)
      const hasSemanticColor = this.countryColors.has(country.id)
      const baseFill = hovered && this.settings.hoverHighlight && !hasSemanticColor
        ? this.settings.hoverFill
        : this.countryColors.get(country.id)
          ?? (this.highlighted.has(country.id)
            ? this.settings.highlightFill
            : this.settings.countryFill)
      const fill = this.mutedCountries.has(country.id)
        ? this.settings.mutedFill
        : baseFill

      const styled = this.highlighted.has(country.id) || hasSemanticColor
      const stroke = hovered && this.settings.hoverStroke !== null
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
      const tinyTarget = this.tinyTargets.get(country.id)
      if (tinyTarget) this.renderTinyTarget(country, tinyTarget, fill, hidden, hovered, reducedMotion)
    }
    this.renderGroupOutlines()
  }

  private syncTinyTargets(): void {
    if (!this.svg) return
    const tinyIds = new Set<string>()

    for (const country of this.countries.values()) {
      const bounds = this.readGeometryBounds(country.path)
      if (!bounds || Math.max(bounds.width, bounds.height) > TINY_GEOMETRY_MAX_DIMENSION) {
        this.removeTinyTarget(country.id)
        continue
      }

      tinyIds.add(country.id)
      const maxDimension = Math.max(bounds.width, bounds.height)
      const markerRadius = Math.max(
        TINY_MARKER_MIN_RADIUS,
        Math.min(TINY_MARKER_MAX_RADIUS, maxDimension * 0.75),
      )
      const hitRadius = Math.max(
        TINY_HIT_MIN_RADIUS,
        Math.min(TINY_HIT_MAX_RADIUS, markerRadius * 2.5),
      )
      const existing = this.tinyTargets.get(country.id)
      if (existing) {
        existing.centerX = bounds.x + bounds.width / 2
        existing.centerY = bounds.y + bounds.height / 2
        existing.markerRadius = markerRadius
        existing.hitRadius = hitRadius
        this.positionTinyTarget(existing)
      } else {
        this.createTinyTarget(country.id, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, markerRadius, hitRadius)
      }
    }

    for (const countryId of this.tinyTargets.keys()) {
      if (!tinyIds.has(countryId)) this.removeTinyTarget(countryId)
    }
    if (this.tinyTargets.size === 0) {
      this.tinyTargetLayer?.remove()
      this.tinyTargetLayer = null
    }
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

  private createTinyTarget(
    countryId: string,
    centerX: number,
    centerY: number,
    markerRadius: number,
    hitRadius: number,
  ): void {
    if (!this.svg) return
    const document = this.svg.ownerDocument
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    group.setAttribute('data-svg-map-tiny-country', countryId)
    marker.setAttribute('data-svg-map-tiny-marker', countryId)
    ring.setAttribute('data-svg-map-tiny-ring', countryId)
    hit.setAttribute('data-svg-map-tiny-hit-target', countryId)
    marker.setAttribute('pointer-events', 'none')
    ring.setAttribute('pointer-events', 'none')
    hit.setAttribute('fill', 'transparent')
    hit.setAttribute('fill-opacity', '0')
    hit.setAttribute('stroke', 'none')
    hit.setAttribute('pointer-events', 'all')
    group.append(marker, ring, hit)
    this.tinyTargetLayer ??= document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.tinyTargetLayer.setAttribute('data-svg-map-tiny-targets', '')
    this.tinyTargetLayer.append(group)
    this.svg.append(this.tinyTargetLayer)

    const enter: EventListener = event => {
      const resolvedId = this.resolveTinyTargetId(event, countryId)
      if (!resolvedId || !this.isInteractive(resolvedId)) {
        this.setHoveredCountryAndNotify(null)
        return
      }
      this.setHoveredCountryAndNotify(resolvedId)
    }
    const leave: EventListener = event => {
      const nextId = this.resolveTinyTargetId(event)
      if (nextId && nextId !== countryId) {
        this.setHoveredCountryAndNotify(nextId)
        return
      }
      if (this.hoveredCountryId === countryId) this.setHoveredCountryAndNotify(null)
    }
    const click: EventListener = event => {
      const resolvedId = this.resolveTinyTargetId(event, countryId)
      if (resolvedId && this.isInteractive(resolvedId)) this.countryClickHandler?.(resolvedId)
    }
    hit.addEventListener('pointerenter', enter)
    hit.addEventListener('pointerleave', leave)
    hit.addEventListener('click', click)
    this.tinyTargets.set(countryId, {
      countryId,
      centerX,
      centerY,
      hitRadius,
      markerRadius,
      group,
      marker,
      ring,
      hit,
      enter,
      leave,
      click,
    })
    this.positionTinyTarget(this.tinyTargets.get(countryId) as TinyCountryTarget)
  }

  private positionTinyTarget(target: TinyCountryTarget): void {
    for (const element of [target.marker, target.ring, target.hit]) {
      element.setAttribute('cx', String(target.centerX))
      element.setAttribute('cy', String(target.centerY))
    }
    target.hit.setAttribute('r', String(target.hitRadius))
  }

  private removeTinyTarget(countryId: string): void {
    const target = this.tinyTargets.get(countryId)
    if (!target) return
    target.hit.removeEventListener('pointerenter', target.enter)
    target.hit.removeEventListener('pointerleave', target.leave)
    target.hit.removeEventListener('click', target.click)
    target.group.remove()
    this.tinyTargets.delete(countryId)
  }

  private renderTinyTarget(
    country: InternalCountry,
    target: TinyCountryTarget,
    fill: string | null,
    hidden: boolean,
    hovered: boolean,
    reducedMotion: boolean,
  ): void {
    const sourceFill = country.path.style.getPropertyValue('fill')
      || country.path.getAttribute('fill')
      || country.originalFill.value
      || this.settings.countryFill
      || '#52525b'
    const markerRadius = hovered && !reducedMotion ? target.markerRadius * 1.25 : target.markerRadius
    const markerFill = fill ?? sourceFill
    target.marker.setAttribute('r', String(markerRadius))
    target.marker.setAttribute('fill', markerFill)
    target.marker.style.setProperty('transition', reducedMotion ? 'none' : `r ${this.settings.transitionMs}ms ease`)
    target.ring.setAttribute('r', String(hovered ? markerRadius * 1.45 : markerRadius))
    target.ring.setAttribute('fill', 'none')
    target.ring.setAttribute('stroke', this.settings.hoverStroke ?? '#d4d4d8')
    target.ring.setAttribute('stroke-width', this.settings.hoverStrokeWidth ?? '1.5')
    target.ring.setAttribute('opacity', hovered ? '0.85' : '0')
    target.ring.style.setProperty('transition', reducedMotion ? 'none' : `r ${this.settings.transitionMs}ms ease, opacity ${this.settings.transitionMs}ms ease`)

    const interactive = this.isInteractive(country.id)
    target.group.setAttribute('visibility', hidden ? 'hidden' : 'visible')
    target.hit.style.setProperty('pointer-events', !hidden && interactive ? 'all' : 'none', 'important')
  }

  private setHoveredCountryAndNotify(id: string | null): void {
    this.setHoveredCountry(id)
    this.countryHoverHandler?.(this.hoveredCountryId === id ? id : null)
  }

  private resolveTinyTargetId(event: Event, fallbackId?: string): string | null {
    const point = this.getSvgPoint(event)
    if (!point) return fallbackId ?? null
    const sourceCountryId = this.resolveSourceCountryAtPoint(point)
    if (sourceCountryId) return sourceCountryId
    let nearest: { id: string; distance: number } | null = null
    for (const target of this.tinyTargets.values()) {
      if (!this.isInteractive(target.countryId)) continue
      const distance = Math.hypot(point.x - target.centerX, point.y - target.centerY)
      if (distance > target.hitRadius) continue
      if (!nearest || distance < nearest.distance) nearest = { id: target.countryId, distance }
    }
    return nearest?.id ?? null
  }

  private resolveSourceCountryAtPoint(point: { x: number; y: number }): string | null {
    const matches: Array<{ id: string; area: number }> = []
    for (const country of this.countries.values()) {
      if (!this.isInteractive(country.id)) continue
      const bounds = this.readGeometryBounds(country.path)
      if (!bounds) continue
      const geometry = country.path as SVGGeometryElement & {
        isPointInFill?: (candidate: { x: number; y: number }) => boolean
      }
      let contains = point.x >= bounds.x
        && point.x <= bounds.x + bounds.width
        && point.y >= bounds.y
        && point.y <= bounds.y + bounds.height
      if (typeof geometry.isPointInFill === 'function') {
        try {
          contains = geometry.isPointInFill(point)
        } catch {
          // Keep the conservative bounding-box fallback for test DOMs and
          // browsers that cannot evaluate the path at this moment.
        }
      }
      if (contains) matches.push({ id: country.id, area: bounds.width * bounds.height })
    }
    return matches.sort((left, right) => left.area - right.area)[0]?.id ?? null
  }

  private getSvgPoint(event: Event): { x: number; y: number } | null {
    if (!this.svg) return null
    const pointer = event as MouseEvent
    if (!Number.isFinite(pointer.clientX) || !Number.isFinite(pointer.clientY)) return null

    try {
      const transform = this.svg.getScreenCTM?.()
      if (transform) {
        const point = this.svg.createSVGPoint()
        point.x = pointer.clientX
        point.y = pointer.clientY
        const mapped = point.matrixTransform(transform.inverse())
        if (Number.isFinite(mapped.x) && Number.isFinite(mapped.y)) return { x: mapped.x, y: mapped.y }
      }
    } catch {
      // Fall back to the viewBox calculation for test DOMs and partial SVG APIs.
    }

    const rect = this.svg.getBoundingClientRect()
    const viewBox = this.parseViewBox(this.svg.getAttribute('viewBox') ?? '')
    if (!viewBox || rect.width <= 0 || rect.height <= 0) return null
    let x = pointer.clientX - rect.left
    let y = pointer.clientY - rect.top
    const preserveAspectRatio = this.svg.getAttribute('preserveAspectRatio')?.trim().toLowerCase() ?? ''
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
    return {
      x: viewBox.x + x,
      y: viewBox.y + y,
    }
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

  private setViewBox(value: string): void {
    if (!this.svg) return
    this.svg.setAttribute('viewBox', value)
    this.syncAspectRatio(value)
  }

  /** Keep auto-height SVG surfaces in step with a focused viewBox. */
  private syncAspectRatio(viewBox: string | null): void {
    if (!this.svg || !viewBox) return
    const bounds = this.parseViewBox(viewBox)
    if (bounds) this.svg.style.aspectRatio = `${bounds.width} / ${bounds.height}`
  }

  private resetMap(): void {
    this.detachHoverListeners()
    for (const countryId of this.tinyTargets.keys()) this.removeTinyTarget(countryId)
    this.tinyTargetLayer?.remove()
    this.tinyTargetLayer = null
    this.countries.clear()
    this.highlighted.clear()
    this.countryColors.clear()
    this.mutedCountries.clear()
    this.hiddenCountries.clear()
    this.hoverableCountries = null
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
    this.mount.replaceChildren()
  }
}
