import { getSyntheticDotSourceFingerprint } from './syntheticDots'
import {
  getLocalPointFromClient,
  getRenderedSvgScale,
  getScreenPointFromSvg,
  getSvgBoundsCenter,
  isCompactUnambiguousSvgGeometry,
  isSvgPointWithinViewBox,
  readPathComponents,
  readSvgGeometryBounds,
  transformSourcePointToLayer,
  type SvgPoint,
} from './svgGeometry'
import { parseViewBox } from './viewBoxFit'
import { createTaskInteractionMarkerElements, createTaskRepresentativeMarkerElements } from './svgTaskMarkers'

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

export interface SvgTaskAssistanceCountry {
  id: string
  path: SVGPathElement
  originalFill: Readonly<{ value: string }>
}

export interface SvgTaskAssistanceSettings {
  countryFill: string | null
  hoverStroke: string | null
  hoverStrokeWidth: string | null
  transitionMs: number
}

export interface SvgTaskAssistanceRuntimeOptions {
  getCountries: () => Iterable<SvgTaskAssistanceCountry>
  isSelectable: (countryId: string) => boolean
  isHidden: (countryId: string) => boolean
  dispatchCountryClick: (countryId: string) => void
  requestRender: () => void
  getSettings: () => SvgTaskAssistanceSettings
}

export interface SvgTaskAssistanceMutationResult {
  activeIds: readonly string[]
  unknownIds: readonly string[]
}

interface AutomaticTaskAnchor {
  sourceFingerprint: string
  point: SvgPoint
}

interface TaskPointerIntent {
  countryId: string
  interactionPointId: string | null
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

const TASK_MARKER_TARGET_RADIUS_PX = 5.5
const TASK_MARKER_HOVER_SCALE = 1.25
const TASK_HIT_RADIUS_PX = 12

/** Stateful, Maps-owned runtime for task-only SVG assistance and answer selection. */
export class SvgTaskAssistanceRuntime {
  private readonly options: SvgTaskAssistanceRuntimeOptions
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
  private svg: SVGSVGElement | null = null

  constructor(options: SvgTaskAssistanceRuntimeOptions) {
    this.options = options
  }

  configure(assistance: SvgMapTaskAssistance | null = null): SvgTaskAssistanceMutationResult {
    const countries = this.getCountryMap()
    const answerSelection = assistance?.answerSelectionIds ?? []
    const { knownIds, unknownIds } = this.resolveKnown(answerSelection, countries)
    const requestedTarget = assistance?.taskTargetId?.trim() || null
    const taskTargetUnknown = requestedTarget !== null && !countries.has(requestedTarget)
      ? [requestedTarget]
      : []

    const anchors = assistance?.learningAnchors ?? []
    const normalizedAnchors = new Map<string, SvgMapLearningAnchor>()
    for (const anchor of anchors) {
      const sourceSvgId = anchor.sourceSvgId.trim()
      if (!sourceSvgId) continue
      const country = countries.get(sourceSvgId)
      if (!country) {
        unknownIds.push(sourceSvgId)
        continue
      }
      if (normalizedAnchors.has(sourceSvgId)) {
        throw new Error(`Duplicate task learning anchor for ${sourceSvgId}`)
      }
      this.validateTaskLearningAnchor({ ...anchor, sourceSvgId }, country)
      normalizedAnchors.set(sourceSvgId, { ...anchor, sourceSvgId })
    }

    const syntheticDots = assistance?.syntheticDots ?? []
    const normalizedSyntheticDots = new Map<string, SvgMapSyntheticDot>()
    for (const dot of syntheticDots) {
      const sourceSvgId = dot.sourceSvgId.trim()
      if (!sourceSvgId) continue
      const country = countries.get(sourceSvgId)
      if (!country) {
        unknownIds.push(sourceSvgId)
        continue
      }
      if (normalizedSyntheticDots.has(sourceSvgId)) {
        throw new Error(`Duplicate task synthetic dot for ${sourceSvgId}`)
      }
      this.validateTaskSyntheticDot({ ...dot, sourceSvgId }, country)
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
    this.options.requestRender()
    return { activeIds: [...this.taskAnswerSelection], unknownIds: uniqueStrings([...unknownIds, ...taskTargetUnknown]) }
  }

  clearHover(): void {
    this.setTaskPointerIntent(null)
  }

  attach(svg: SVGSVGElement): void {
    this.detach()
    this.svg = svg
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

  detach(): void {
    this.detachTaskPointerListeners()
    for (const countryId of this.taskRepresentativeTargets.keys()) this.removeTaskRepresentativeTarget(countryId)
    for (const pointId of this.taskInteractionPoints.keys()) this.removeTaskInteractionPoint(pointId)
    this.removeTaskTargetLayers()
    this.taskPointerIntent = null
    this.svg = null
  }

  sync(): void {
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

    const countries = this.getCountryMap()
    const activeTargetIds = new Set<string>()
    const activePointIds = new Set<string>()
    const requestedIds = new Set(this.taskAnswerSelection)
    if (this.taskTargetId !== null) requestedIds.add(this.taskTargetId)

    for (const sourceSvgId of requestedIds) {
      const country = countries.get(sourceSvgId)
      if (!country) continue
      const answerSelectable = this.isTaskCandidate(sourceSvgId)
      const taskTarget = this.taskTargetId === sourceSvgId && !this.options.isHidden(sourceSvgId)
      if (!answerSelectable && !taskTarget) continue

      if (answerSelectable) {
        const interactionPoints = this.resolveTaskInteractionPoints(sourceSvgId, country)
        const syntheticDot = this.taskSyntheticDotDefinitions.has(sourceSvgId)
        for (let index = 0; index < interactionPoints.length; index += 1) {
          const sourcePoint = interactionPoints[index]
          const point = transformSourcePointToLayer(country.path, sourcePoint, this.svg)
          if (!point) continue
          const scale = getRenderedSvgScale(this.svg)
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
        const point = anchor ? transformSourcePointToLayer(country.path, anchor.point, this.svg) : null
        const scale = getRenderedSvgScale(this.svg)
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

  reset(): void {
    this.detach()
    this.taskAnswerSelection.clear()
    this.taskAnswerSelectionConfigured = false
    this.taskTargetId = null
    this.taskPointerIntent = null
    this.taskAnchorDefinitions.clear()
    this.taskSyntheticDotDefinitions.clear()
    this.automaticTaskAnchors.clear()
    this.automaticTaskInteractionPoints.clear()
  }

  isAnswerSelectionConfigured(): boolean {
    return this.taskAnswerSelectionConfigured
  }

  getHoveredCountryId(): string | null {
    return this.taskPointerIntent?.countryId ?? null
  }

  renderCountryTaskState(
    country: SvgTaskAssistanceCountry,
    fill: string | null,
    hidden: boolean,
    reducedMotion: boolean,
  ): void {
    const settings = this.options.getSettings()
    const taskTarget = this.taskRepresentativeTargets.get(country.id)
    if (taskTarget) this.renderTaskRepresentativeTarget(country, taskTarget, fill, hidden, reducedMotion, settings)
    for (const interactionPoint of this.taskInteractionPoints.values()) {
      if (interactionPoint.countryId !== country.id) continue
      this.renderTaskInteractionPoint(country, interactionPoint, fill, hidden, reducedMotion, settings)
    }
  }

  private getCountryMap(): Map<string, SvgTaskAssistanceCountry> {
    return new Map([...this.options.getCountries()].map(country => [country.id, country]))
  }

  private resolveKnown(
    ids: Iterable<string>,
    countries: ReadonlyMap<string, SvgTaskAssistanceCountry> = this.getCountryMap(),
  ): { knownIds: string[]; unknownIds: string[] } {
    const knownIds: string[] = []
    const unknownIds: string[] = []
    for (const id of uniqueStrings(ids)) {
      if (countries.has(id)) knownIds.push(id)
      else unknownIds.push(id)
    }
    return { knownIds, unknownIds }
  }

  private isTaskCandidate(id: string): boolean {
    return this.taskAnswerSelectionConfigured
      && this.taskAnswerSelection.has(id)
      && this.options.isSelectable(id)
  }

  private resolveTaskInteractionPoints(sourceSvgId: string, country: SvgTaskAssistanceCountry): readonly SvgPoint[] {
    const syntheticDot = this.taskSyntheticDotDefinitions.get(sourceSvgId)
    if (syntheticDot) return [syntheticDot.point]

    const sourceFingerprint = country.path.getAttribute('d') ?? ''
    const bounds = readSvgGeometryBounds(country.path)
    if (!bounds) return []

    if (isCompactUnambiguousSvgGeometry(country.path.getAttribute('d') ?? '', bounds)) {
      const center = getSvgBoundsCenter(bounds)
      return center ? [center] : []
    }

    const cached = this.automaticTaskInteractionPoints.get(sourceSvgId)
    if (cached?.sourceFingerprint === sourceFingerprint) return cached.points

    const components = readPathComponents(sourceFingerprint)
    if (components.length < 2) return []
    const points = components.map(component => component.start)
    this.automaticTaskInteractionPoints.set(sourceSvgId, { sourceFingerprint, points })
    return points
  }

  private resolveTaskAnchor(sourceSvgId: string, country: SvgTaskAssistanceCountry): { kind: SvgMapLearningAnchor['kind']; point: SvgPoint } | null {
    const explicit = this.taskAnchorDefinitions.get(sourceSvgId)
    if (explicit) {
      const point = explicit.kind === 'multi-dot-representative'
        ? explicit.point
        : getSvgBoundsCenter(readSvgGeometryBounds(country.path))
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

    const bounds = readSvgGeometryBounds(country.path)
    const point = bounds && isCompactUnambiguousSvgGeometry(country.path.getAttribute('d') ?? '', bounds)
      ? getSvgBoundsCenter(bounds)
      : null
    this.automaticTaskAnchors.set(sourceSvgId, point ? { sourceFingerprint, point } : null)
    return point ? { kind: 'single-dot', point } : null
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

    const { group, marker, ring, hit } = createTaskInteractionMarkerElements(layerSvg.ownerDocument, countryId, pointId, origin)
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

    const { group, marker, ring } = createTaskRepresentativeMarkerElements(layerSvg.ownerDocument, countryId)
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
    const screenPoint = getScreenPointFromSvg(point.layerSvg, { x: point.centerX, y: point.centerY })
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
    country: SvgTaskAssistanceCountry,
    point: TaskInteractionPoint,
    fill: string | null,
    hidden: boolean,
    reducedMotion: boolean,
    settings: SvgTaskAssistanceSettings,
  ): void {
    const sourceFill = country.path.style.getPropertyValue('fill')
      || country.path.getAttribute('fill')
      || country.originalFill.value
      || settings.countryFill
      || '#52525b'
    const hovered = this.taskPointerIntent?.interactionPointId === point.id
    const visible = !hidden
    const markerRadius = hovered ? point.markerRadius * TASK_MARKER_HOVER_SCALE : point.markerRadius
    const markerFill = fill ?? sourceFill
    point.marker.setAttribute('r', String(markerRadius))
    point.marker.setAttribute('fill', markerFill)
    point.marker.style.setProperty('transition', reducedMotion ? 'none' : `r ${settings.transitionMs}ms ease`)
    point.ring.setAttribute('r', String(hovered ? markerRadius * 1.45 : markerRadius))
    point.ring.setAttribute('fill', 'none')
    point.ring.setAttribute('stroke', settings.hoverStroke ?? '#d4d4d8')
    point.ring.setAttribute('stroke-width', settings.hoverStrokeWidth ?? '1.5')
    point.ring.setAttribute('opacity', hovered ? '0.85' : '0')
    point.ring.style.setProperty('transition', reducedMotion ? 'none' : `r ${settings.transitionMs}ms ease, opacity ${settings.transitionMs}ms ease`)
    point.group.setAttribute('visibility', visible ? 'visible' : 'hidden')
  }

  private renderTaskRepresentativeTarget(
    country: SvgTaskAssistanceCountry,
    target: TaskRepresentativeTarget,
    fill: string | null,
    hidden: boolean,
    reducedMotion: boolean,
    settings: SvgTaskAssistanceSettings,
  ): void {
    const sourceFill = country.path.style.getPropertyValue('fill')
      || country.path.getAttribute('fill')
      || country.originalFill.value
      || settings.countryFill
      || '#52525b'
    target.marker.setAttribute('r', String(target.markerRadius))
    target.marker.setAttribute('fill', fill ?? sourceFill)
    target.marker.style.setProperty('transition', reducedMotion ? 'none' : `r ${settings.transitionMs}ms ease`)
    target.ring.setAttribute('r', String(target.markerRadius))
    target.ring.setAttribute('fill', 'none')
    target.ring.setAttribute('stroke', settings.hoverStroke ?? '#d4d4d8')
    target.ring.setAttribute('stroke-width', settings.hoverStrokeWidth ?? '1.5')
    target.ring.setAttribute('opacity', '0')
    target.group.setAttribute('visibility', !hidden && this.taskTargetId === country.id ? 'visible' : 'hidden')
  }

  private setTaskPointerIntent(intent: TaskPointerIntent | null): void {
    const nextIntent = intent && this.isTaskCandidate(intent.countryId) ? intent : null
    if (this.taskPointerIntent?.countryId === nextIntent?.countryId
      && this.taskPointerIntent?.interactionPointId === nextIntent?.interactionPointId) return
    this.taskPointerIntent = nextIntent
    this.options.requestRender()
  }

  private validateTaskLearningAnchor(anchor: SvgMapLearningAnchor, country: SvgTaskAssistanceCountry): void {
    if (!this.svg) return
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
    const viewBox = parseViewBox(
      country.path.ownerSVGElement?.getAttribute('viewBox') ?? this.svg.getAttribute('viewBox') ?? '',
    )
    const { x, y } = anchor.point
    if (!isSvgPointWithinViewBox({ x, y }, viewBox)) {
      throw new Error(`Task learning anchor ${anchor.sourceSvgId} is outside the map viewBox`)
    }
  }

  private validateTaskSyntheticDot(dot: SvgMapSyntheticDot, country: SvgTaskAssistanceCountry): void {
    if (!this.svg) return
    const sourceFingerprint = country.path.getAttribute('d') ?? ''
    if (getSyntheticDotSourceFingerprint(sourceFingerprint) !== dot.sourceFingerprint) {
      throw new Error(`Stale task synthetic dot source for ${dot.sourceSvgId}`)
    }
    const viewBox = parseViewBox(
      country.path.ownerSVGElement?.getAttribute('viewBox') ?? this.svg.getAttribute('viewBox') ?? '',
    )
    const { x, y } = dot.point
    if (!isSvgPointWithinViewBox({ x, y }, viewBox)) {
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
    if (intent && this.options.isSelectable(intent.countryId)) {
      this.setTaskPointerIntent(intent)
      this.options.dispatchCountryClick(intent.countryId)
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
    for (const country of this.options.getCountries()) {
      if (!this.isTaskCandidate(country.id)) continue
      const localPoint = getLocalPointFromClient(country.path, point)
      const bounds = readSvgGeometryBounds(country.path)
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

}

function uniqueStrings(values: Iterable<string>): string[] {
  return [...new Set(Array.from(values, value => value.trim()).filter(Boolean))]
}
