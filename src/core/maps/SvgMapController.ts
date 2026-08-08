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

export interface SvgMapSettings {
  countryFill: string | null
  countryStroke: string | null
  labelFill: string | null
  highlightFill: string
  hoverFill: string
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

export const DEFAULT_SVG_MAP_SETTINGS: Readonly<SvgMapSettings> = Object.freeze({
  countryFill: null,
  countryStroke: null,
  labelFill: null,
  highlightFill: '#0891b2',
  hoverFill: '#22d3ee',
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

export class SvgMapController {
  private readonly mount: HTMLElement
  private settings: SvgMapSettings
  private countries = new Map<string, InternalCountry>()
  private highlighted = new Set<string>()
  private named = new Set<string>()
  private hoverGroups: SvgMapHoverGroup[] = []
  private hoveredCountryId: string | null = null
  private hoveredIds = new Set<string>()
  private listeners: HoverListeners[] = []
  private svg: SVGSVGElement | null = null
  private loadVersion = 0
  private abortController: AbortController | null = null
  private destroyed = false

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
    this.discoverCountries(imported)
    this.attachHoverListeners()
    this.render()

    return this.getCountries()
  }

  getCountries(): readonly SvgMapCountry[] {
    return [...this.countries.values()].map(({ id, name, pathId, labelId }) => ({
      id, name, pathId, labelId,
    }))
  }

  getHighlightedIds(): readonly string[] {
    return [...this.highlighted]
  }

  getNamedIds(): readonly string[] {
    return [...this.named]
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

  updateSettings(settings: Partial<SvgMapSettings>): void {
    this.assertUsable()
    this.settings = this.mergeSettings(this.settings, settings)
    this.refreshHoveredIds()
    this.render()
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

  private discoverCountries(svg: SVGSVGElement): void {
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
      if (!id || !labelId || !name || this.countries.has(id)) continue

      const labelPaintElements = [label, ...label.querySelectorAll<SVGElement>('tspan')]
      this.countries.set(id, {
        id,
        name,
        pathId: id,
        labelId,
        path,
        label,
        originalFill: captureStyle(path, 'fill'),
        originalStroke: captureStyle(path, 'stroke'),
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

  private attachHoverListeners(): void {
    for (const country of this.countries.values()) {
      const enter: EventListener = () => this.setHoveredCountry(country.id)
      const leave: EventListener = () => this.setHoveredCountry(null)
      country.path.addEventListener('pointerenter', enter)
      country.path.addEventListener('pointerleave', leave)
      this.listeners.push({ path: country.path, enter, leave })
    }
  }

  private detachHoverListeners(): void {
    for (const { path, enter, leave } of this.listeners) {
      path.removeEventListener('pointerenter', enter)
      path.removeEventListener('pointerleave', leave)
    }
    this.listeners = []
  }

  private setHoveredCountry(id: string | null): void {
    if (!this.settings.hoverHighlight && !this.settings.hoverShowName) {
      this.hoveredCountryId = null
      this.hoveredIds.clear()
      return
    }
    this.hoveredCountryId = id
    this.refreshHoveredIds()
    this.render()
  }

  private refreshHoveredIds(): void {
    this.hoveredIds.clear()
    const id = this.hoveredCountryId
    if (!id || (!this.settings.hoverHighlight && !this.settings.hoverShowName)) return

    if (this.settings.hoverScope === 'single') {
      this.hoveredIds.add(id)
      return
    }

    for (const group of this.hoverGroups) {
      if (!group.countryIds.includes(id)) continue
      for (const countryId of group.countryIds) this.hoveredIds.add(countryId)
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
      : `fill ${this.settings.transitionMs}ms ease`

    for (const country of this.countries.values()) {
      const hovered = this.hoveredIds.has(country.id)
      const fill = hovered && this.settings.hoverHighlight
        ? this.settings.hoverFill
        : this.highlighted.has(country.id)
          ? this.settings.highlightFill
          : this.settings.countryFill

      setOverride(country.path, 'fill', fill, country.originalFill)
      setOverride(country.path, 'stroke', this.settings.countryStroke, country.originalStroke)
      country.path.style.setProperty('transition', transition)

      const showLabel = this.settings.showAllNames
        || this.named.has(country.id)
        || (this.settings.showHighlightedNames && this.highlighted.has(country.id))
        || (this.settings.hoverShowName && hovered)
      country.label.style.setProperty('display', showLabel ? 'inline' : 'none', 'important')
      country.label.style.setProperty('pointer-events', 'none', 'important')
      for (const paint of country.labelPaint) {
        setOverride(paint.element, 'fill', this.settings.labelFill, paint.originalFill)
      }
    }
  }

  private resetMap(): void {
    this.detachHoverListeners()
    this.countries.clear()
    this.highlighted.clear()
    this.named.clear()
    this.hoverGroups = []
    this.hoveredCountryId = null
    this.hoveredIds.clear()
    this.svg = null
    this.mount.replaceChildren()
  }
}
