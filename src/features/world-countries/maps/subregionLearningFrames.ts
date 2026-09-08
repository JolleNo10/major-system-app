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
  'central-africa': { x: 300, y: 350, width: 500, height: 400 },
  'east-africa': { x: 500, y: 260, width: 500, height: 560 },
  'indian-ocean': { x: 650, y: 520, width: 400, height: 450 },
  'north-africa': { x: 100, y: 80, width: 800, height: 420 },
  'southern-africa': { x: 250, y: 620, width: 650, height: 430 },
  'west-africa': { x: 0, y: 240, width: 600, height: 500 },
  'caucasus': { x: 600, y: 120, width: 500, height: 300 },
  'central-asia': { x: 400, y: 80, width: 700, height: 420 },
  'east-asia': { x: 760, y: 80, width: 480, height: 480 },
  'south-asia': { x: 430, y: 330, width: 560, height: 500 },
  'southeast-asia': { x: 650, y: 380, width: 560, height: 500 },
  'west-asia': { x: 40, y: 170, width: 700, height: 500 },
  'balkans': { x: 500, y: 320, width: 360, height: 300 },
  'central-europe': { x: 330, y: 130, width: 430, height: 360 },
  'eastern-europe': { x: 620, y: 80, width: 520, height: 500 },
  'northern-europe': { x: 250, y: 0, width: 700, height: 340 },
  'southern-europe': { x: 250, y: 320, width: 700, height: 470 },
  'western-europe': { x: 0, y: 100, width: 550, height: 500 },
  caribbean: { x: 320, y: 300, width: 420, height: 300 },
  'central-america': { x: 220, y: 380, width: 450, height: 300 },
  'northern-america': { x: 0, y: 0, width: 800, height: 550 },
  'australia-new-zealand': { x: 100, y: 80, width: 800, height: 580 },
  melanesia: { x: 0, y: 100, width: 850, height: 600 },
  micronesia: { x: 300, y: 50, width: 400, height: 180 },
  polynesia: { x: 550, y: 150, width: 500, height: 400 },
  'andean-countries': { x: 250, y: 600, width: 450, height: 560 },
  'eastern-south-america': { x: 500, y: 520, width: 550, height: 620 },
  'northern-south-america': { x: 220, y: 450, width: 650, height: 430 },
  'southern-cone': { x: 250, y: 800, width: 600, height: 400 },
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
