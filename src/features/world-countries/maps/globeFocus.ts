import { geoCentroid, geoOrthographic, geoPath } from 'd3-geo'
import type { FeatureCollection } from 'geojson'
import type { GlobeFeature } from './globeGeography'

export type GlobeRotation = readonly [number, number, number]

export interface GlobePose {
  rotate: GlobeRotation
  scale: number
}

export interface GlobeViewport {
  width: number
  height: number
}

export const GLOBE_DRAG_THRESHOLD_PX = 6
const MIN_SCALE = 48
const MAX_FOCUS_SCALE_MULTIPLIER = 4.5
const WORLD_RADIUS_RATIO = 0.43

export function getGlobeViewportSize(width: number, height: number): GlobeViewport {
  return {
    width: Math.max(240, Number.isFinite(width) && width > 0 ? width : 720),
    height: Math.max(220, Number.isFinite(height) && height > 0 ? height : 520),
  }
}

export function getWorldGlobeScale(viewport: GlobeViewport): number {
  return Math.max(MIN_SCALE, Math.min(viewport.width, viewport.height) * WORLD_RADIUS_RATIO)
}

function asCollection(features: readonly GlobeFeature[]): FeatureCollection {
  return { type: 'FeatureCollection', features: [...features] }
}

function rotationFor(features: readonly GlobeFeature[]): GlobeRotation {
  if (!features.length) return [0, 0, 0]
  const [longitude, latitude] = geoCentroid(asCollection(features))
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return [0, 0, 0]
  return [-longitude, -latitude, 0]
}

function fitScaleFor(features: readonly GlobeFeature[], viewport: GlobeViewport, padding: number, rotation: GlobeRotation): number {
  if (!features.length) return getWorldGlobeScale(viewport)
  const projection = geoOrthographic()
    .rotate([...rotation] as [number, number, number])
    .translate([0, 0])
    .scale(1)
    .clipAngle(90)
  const [[minX, minY], [maxX, maxY]] = geoPath(projection).bounds(asCollection(features))
  const width = maxX - minX
  const height = maxY - minY
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return getWorldGlobeScale(viewport)
  }
  const availableWidth = Math.max(80, viewport.width - padding * 2)
  const availableHeight = Math.max(80, viewport.height - padding * 2)
  const fit = Math.min(availableWidth / width, availableHeight / height)
  const worldScale = getWorldGlobeScale(viewport)
  return Math.max(worldScale * 0.84, Math.min(worldScale * MAX_FOCUS_SCALE_MULTIPLIER, fit))
}

export function getGlobeTargetPose({
  level,
  focusFeatures,
  viewport,
  padding = 28,
}: {
  level: 'world' | 'continent'
  focusFeatures: readonly GlobeFeature[]
  viewport: GlobeViewport
  padding?: number
}): GlobePose {
  const rotation = level === 'world' ? [0, 0, 0] as const : rotationFor(focusFeatures)
  return {
    rotate: rotation,
    scale: level === 'world'
      ? getWorldGlobeScale(viewport)
      : fitScaleFor(focusFeatures, viewport, padding, rotation),
  }
}

function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}

export function interpolateGlobePose(from: GlobePose, to: GlobePose, progress: number): GlobePose {
  const t = Math.max(0, Math.min(1, progress))
  if (t === 0) return from
  if (t === 1) return to
  return {
    rotate: [
      from.rotate[0] + shortestAngleDelta(from.rotate[0], to.rotate[0]) * t,
      from.rotate[1] + (to.rotate[1] - from.rotate[1]) * t,
      from.rotate[2] + (to.rotate[2] - from.rotate[2]) * t,
    ],
    scale: from.scale + (to.scale - from.scale) * t,
  }
}

export function easeInOutCubic(progress: number): number {
  const t = Math.max(0, Math.min(1, progress))
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
}

export function getGlobeFocusAnimationDuration(reducedMotion: boolean): number {
  return reducedMotion ? 0 : 520
}

export function exceedsGlobeDragThreshold(deltaX: number, deltaY: number): boolean {
  return Math.hypot(deltaX, deltaY) >= GLOBE_DRAG_THRESHOLD_PX
}

export function rotateGlobePose(pose: GlobePose, deltaX: number, deltaY: number): GlobePose {
  const scale = Math.max(1, pose.scale)
  const degreesPerPixel = 180 / Math.PI / scale
  return {
    rotate: [
      pose.rotate[0] + deltaX * degreesPerPixel,
      Math.max(-90, Math.min(90, pose.rotate[1] - deltaY * degreesPerPixel)),
      pose.rotate[2],
    ],
    scale: pose.scale,
  }
}
