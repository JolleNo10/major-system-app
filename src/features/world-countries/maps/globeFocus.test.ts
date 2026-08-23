import { describe, expect, it } from 'vitest'
import { getGlobeFeatures } from './globeGeography'
import {
  exceedsGlobeDragThreshold,
  getGlobeFocusAnimationDuration,
  getGlobeTargetPose,
  getGlobeViewportSize,
  interpolateGlobePose,
  rotateGlobePose,
} from './globeFocus'

describe('globe focus and pointer helpers', () => {
  const viewport = getGlobeViewportSize(800, 600)

  it('derives World, Continent, and Subregion targets from one asset', () => {
    const world = getGlobeTargetPose({ level: 'world', focusFeatures: getGlobeFeatures(['NO', 'BR']), viewport })
    const europe = getGlobeTargetPose({ level: 'continent', focusFeatures: getGlobeFeatures(['NO', 'FR', 'IT']), viewport })
    const northernEurope = getGlobeTargetPose({ level: 'continent', focusFeatures: getGlobeFeatures(['NO', 'SE', 'FI']), viewport })

    expect(world.rotate).toEqual([0, 0, 0])
    expect(europe.rotate).not.toEqual(world.rotate)
    expect(northernEurope.rotate).not.toEqual(europe.rotate)
    expect(world.scale).toBeGreaterThan(0)
    expect(europe.scale).toBeGreaterThan(0)
    expect(northernEurope.scale).toBeGreaterThan(0)
  })

  it('uses a deliberate click/drag threshold and rotates locally', () => {
    expect(exceedsGlobeDragThreshold(2, 2)).toBe(false)
    expect(exceedsGlobeDragThreshold(6, 0)).toBe(true)
    const rotated = rotateGlobePose({ rotate: [0, 0, 0], scale: 200 }, 20, -10)
    expect(rotated.rotate[0]).toBeGreaterThan(0)
    expect(rotated.rotate[1]).toBeGreaterThan(0)
  })

  it('interpolates a newer focus from the current pose and reaches reduced-motion targets immediately', () => {
    const current = { rotate: [170, 10, 0] as const, scale: 200 }
    const next = { rotate: [-170, 30, 0] as const, scale: 360 }
    const halfway = interpolateGlobePose(current, next, 0.5)
    expect(Math.abs(halfway.rotate[0])).toBeGreaterThan(170)
    expect(getGlobeFocusAnimationDuration(true)).toBe(0)
    expect(getGlobeFocusAnimationDuration(false)).toBeGreaterThan(0)
    expect(interpolateGlobePose(current, next, 1)).toEqual(next)
  })
})
