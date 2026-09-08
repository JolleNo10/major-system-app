import { describe, expect, it } from 'vitest'
import { SUBREGION_DEFINITIONS } from '@/features/world-countries/data/subregions'
import { getMemoMapDefinition } from './mapDefinitions'
import africaSvg from './assets/MapChart_Map_Africa.svg?raw'
import americaSvg from './assets/MapChart_Map_America.svg?raw'
import asiaSvg from './assets/MapChart_Map_Asia.svg?raw'
import europeSvg from './assets/MapChart_Map_Europe.svg?raw'
import oceaniaSvg from './assets/MapChart_Map_Oceania.svg?raw'
import { getSubregionLearningFrame, isValidSubregionLearningFrame, SUBREGION_LEARNING_FRAMES } from './subregionLearningFrames'
import { parseViewBox } from './viewBoxFit'

const sourceSvgs = new Map([
  ['africa', africaSvg],
  ['america', americaSvg],
  ['asia', asiaSvg],
  ['europe', europeSvg],
  ['oceania', oceaniaSvg],
])

function sourceBounds(mapId: string) {
  const svg = sourceSvgs.get(mapId)
  const value = svg?.match(/\bviewBox="([^"]+)"/)?.[1]
  return value ? parseViewBox(value) : null
}

describe('Subregion learning frames', () => {
  it('covers each current Subregion exactly once', () => {
    expect(SUBREGION_LEARNING_FRAMES).toHaveLength(SUBREGION_DEFINITIONS.length)
    expect(new Set(SUBREGION_LEARNING_FRAMES.map(frame => frame.subregionId)).size)
      .toBe(SUBREGION_DEFINITIONS.length)
    expect(SUBREGION_LEARNING_FRAMES.map(frame => frame.subregionId))
      .toEqual(SUBREGION_DEFINITIONS.map(definition => definition.id))
  })

  it('uses each Subregion definition and its authoritative regional map', () => {
    for (const definition of SUBREGION_DEFINITIONS) {
      const frame = getSubregionLearningFrame(definition.id)
      expect(frame).toMatchObject({
        subregionId: definition.id,
        continent: definition.continent,
        mapDefinitionId: getMemoMapDefinition(definition.continent).id,
      })
    }
  })

  it('keeps every authored frame finite, positive, and inside its source coordinate system', () => {
    for (const frame of SUBREGION_LEARNING_FRAMES) {
      expect(isValidSubregionLearningFrame(frame, sourceBounds(frame.mapDefinitionId))).toBe(true)
    }
  })

  it('returns one stable frame for different Countries in one Subregion', () => {
    const norway = getSubregionLearningFrame('northern-europe')
    const sweden = getSubregionLearningFrame('northern-europe')
    expect(norway).toEqual(sweden)
    expect(norway?.mapDefinitionId).toBe('europe')
  })
})
