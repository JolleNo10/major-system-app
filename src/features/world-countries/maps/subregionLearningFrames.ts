import type { Continent } from '@/features/world-countries/data/countries'
import { SUBREGION_DEFINITIONS, type SubregionId } from '@/features/world-countries/data/subregions'
import { getMemoMapDefinition } from './mapDefinitions'
import type { SvgViewBoxRect } from './viewBoxFit'

export interface SubregionLearningFrame {
  subregionId: SubregionId
  continent: Continent
  mapDefinitionId: string
  bounds: SvgViewBoxRect
}

/** Deliberate source-coordinate frames; this is the product source of truth. */
const AUTHORED_BOUNDS = {
  'central-africa': { x: 250, y: 140, width: 600, height: 740 },
  'east-africa': { x: 450, y: 140, width: 650, height: 740 },
  'indian-ocean': { x: 620, y: 520, width: 480, height: 450 },
  'north-africa': { x: 80, y: 0, width: 850, height: 540 },
  'southern-africa': { x: 250, y: 500, width: 650, height: 590 },
  'west-africa': { x: 80, y: 0, width: 750, height: 720 },
  'caucasus': { x: 180, y: 300, width: 450, height: 300 },
  'central-asia': { x: 240, y: 200, width: 520, height: 350 },
  'east-asia': { x: 450, y: 160, width: 750, height: 560 },
  'south-asia': { x: 400, y: 280, width: 620, height: 580 },
  'southeast-asia': { x: 450, y: 300, width: 700, height: 650 },
  'west-asia': { x: 100, y: 280, width: 550, height: 480 },
  'balkans': { x: 500, y: 260, width: 500, height: 500 },
  'central-europe': { x: 380, y: 300, width: 500, height: 400 },
  'eastern-europe': { x: 620, y: 220, width: 520, height: 500 },
  'northern-europe': { x: 250, y: 60, width: 700, height: 620 },
  'southern-europe': { x: 200, y: 250, width: 750, height: 540 },
  'western-europe': { x: 250, y: 350, width: 450, height: 400 },
  caribbean: { x: 300, y: 280, width: 480, height: 360 },
  'central-america': { x: 200, y: 360, width: 500, height: 320 },
  'northern-america': { x: 0, y: 0, width: 800, height: 550 },
  'australia-new-zealand': { x: 50, y: 50, width: 950, height: 650 },
  melanesia: { x: 0, y: 60, width: 950, height: 640 },
  micronesia: { x: 250, y: 30, width: 700, height: 260 },
  polynesia: { x: 450, y: 100, width: 650, height: 500 },
  'andean-countries': { x: 250, y: 600, width: 450, height: 560 },
  'eastern-south-america': { x: 350, y: 450, width: 700, height: 650 },
  'northern-south-america': { x: 220, y: 450, width: 650, height: 430 },
  'southern-cone': { x: 250, y: 750, width: 600, height: 450 },
} satisfies Record<SubregionId, SvgViewBoxRect>

export const SUBREGION_LEARNING_FRAMES: readonly SubregionLearningFrame[] = Object.freeze(
  SUBREGION_DEFINITIONS.map(definition => Object.freeze({
    subregionId: definition.id,
    continent: definition.continent,
    mapDefinitionId: getMemoMapDefinition(definition.continent).id,
    bounds: Object.freeze({ ...AUTHORED_BOUNDS[definition.id] }),
  })),
)

const FRAMES_BY_SUBREGION = new Map(SUBREGION_LEARNING_FRAMES.map(frame => [frame.subregionId, frame]))

export function getSubregionLearningFrame(subregionId: SubregionId): SubregionLearningFrame | null {
  return FRAMES_BY_SUBREGION.get(subregionId) ?? null
}

export function isValidSubregionLearningFrame(frame: SubregionLearningFrame, sourceBounds?: SvgViewBoxRect | null): boolean {
  const { bounds } = frame
  const finitePositive = [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
  if (!finitePositive || bounds.width <= 0 || bounds.height <= 0) return false
  if (!sourceBounds) return true
  return bounds.x >= sourceBounds.x
    && bounds.y >= sourceBounds.y
    && bounds.x + bounds.width <= sourceBounds.x + sourceBounds.width
    && bounds.y + bounds.height <= sourceBounds.y + sourceBounds.height
}
