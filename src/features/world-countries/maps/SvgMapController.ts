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
  mutedFill: '#3f3f46',
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
  originalLabelDisplay: OriginalStyle
  originalLabelPointerEvents: OriginalStyle
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

const FORBIDDEN_ELEMENTS = 'script, foreignObject, iframe, object, embed, image, style'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

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
  private hoverableCountries: Set<string> | null = null
  private named = new Set<string>()
  private hoverGroups: SvgMapHoverGroup[] = []
  private groupOutlines: SvgMapGroupOutline[] = []
  private visibleGroupOutlines = new Set<string>()
  private outlineLayer: SVGGElement | null = null
  private outlineSequence = 0
  private hoveredCountryId: string | null = null
  private hoveredNameOverride: boolean | null = null
  private hoveredIds = new Set<string>()
  private listeners: HoverListeners[] = []
  private countryClickHandler: ((countryId: string) => void) | null = null
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
      this.countries.set(definition.id, {
        ...definition,
        path,
        label,
        originalFill: captureStyle(path, 'fill'),
        originalStroke: captureStyle(path, 'stroke'),
        originalStrokeWidth: captureStyle(path, 'stroke-width'),
        originalFilter: captureStyle(path, 'filter'),
        originalTransition: captureStyle(path, 'transition'),
        originalLabelDisplay: captureStyle(label, 'display'),
        originalLabelPointerEvents: captureStyle(label, 'pointer-events'),
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
      const enter: EventListener = () => this.setHoveredCountry(country.id)
      const leave: EventListener = () => this.setHoveredCountry(null)
      const click: EventListener = () => this.countryClickHandler?.(country.id)
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
    return this.hoverableCountries === null || this.hoverableCountries.has(id)
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

    for (const country of this.countries.values()) {
      const hovered = this.hoveredIds.has(country.id)
      const baseFill = hovered && this.settings.hoverHighlight
        ? this.settings.hoverFill
        : this.countryColors.get(country.id)
          ?? (this.highlighted.has(country.id)
            ? this.settings.highlightFill
            : this.settings.countryFill)
      const fill = this.mutedCountries.has(country.id) && !this.countryColors.has(country.id)
        && !this.highlighted.has(country.id) && !hovered
        ? this.settings.mutedFill
        : baseFill

      const styled = this.highlighted.has(country.id) || this.countryColors.has(country.id)
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
      if (this.mutedCountries.has(country.id) && this.countryColors.has(country.id)) {
        country.path.style.setProperty('filter', 'saturate(0.2) brightness(0.65)', 'important')
      } else {
        restoreStyle(country.path, 'filter', country.originalFilter)
      }

      const showHoverName = this.hoveredNameOverride ?? this.settings.hoverShowName
      const showLabel = this.settings.showAllNames
        || this.named.has(country.id)
        || (this.settings.showHighlightedNames && this.highlighted.has(country.id))
        || (showHoverName && hovered)
      country.label.style.setProperty('display', showLabel ? 'inline' : 'none', 'important')
      country.label.style.setProperty('pointer-events', 'none', 'important')
      for (const paint of country.labelPaint) {
        setOverride(paint.element, 'fill', this.settings.labelFill, paint.originalFill)
      }
    }
    this.renderGroupOutlines()
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
    this.countries.clear()
    this.highlighted.clear()
    this.countryColors.clear()
    this.mutedCountries.clear()
    this.hoverableCountries = null
    this.named.clear()
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
