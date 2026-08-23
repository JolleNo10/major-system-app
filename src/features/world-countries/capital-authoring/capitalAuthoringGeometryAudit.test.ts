// @vitest-environment jsdom
// Developer audit: npx vitest run src/features/world-countries/capital-authoring/capitalAuthoringGeometryAudit.test.ts

import africaSvg from '@/features/world-countries/maps/assets/MapChart_Map_Africa.svg?raw'
import americaSvg from '@/features/world-countries/maps/assets/MapChart_Map_America.svg?raw'
import asiaSvg from '@/features/world-countries/maps/assets/MapChart_Map_Asia.svg?raw'
import europeSvg from '@/features/world-countries/maps/assets/MapChart_Map_Europe.svg?raw'
import oceaniaSvg from '@/features/world-countries/maps/assets/MapChart_Map_Oceania.svg?raw'
import worldSvg from '@/features/world-countries/maps/assets/MapChart_Map_World.svg?raw'
import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { MEMO_MAP_DEFINITIONS } from '@/features/world-countries/maps/mapDefinitions'
import { auditCapitalAuthoringMaps, formatCapitalAuthoringGeometryAudit } from './capitalAuthoringGeometryAudit'

const markupByMapId = {
  world: worldSvg,
  africa: africaSvg,
  asia: asiaSvg,
  europe: europeSvg,
  america: americaSvg,
  oceania: oceaniaSvg,
} as const

const inputs = MEMO_MAP_DEFINITIONS.map(definition => ({
  mapId: definition.id,
  markup: markupByMapId[definition.id as keyof typeof markupByMapId],
  countries: countries.filter(country => definition.domainContinents.includes(country.continent)),
}))

describe('capital authoring real-asset geometry audit', () => {
  it('classifies every expected Country on every authoring map', () => {
    const report = auditCapitalAuthoringMaps(inputs)

    expect(report.errors, report.errors.join('\n')).toEqual([])
    for (const mapReport of report.maps) {
      const definition = MEMO_MAP_DEFINITIONS.find(candidate => candidate.id === mapReport.mapId)
      expect(mapReport.entries).toHaveLength(countries.filter(country => definition?.domainContinents.includes(country.continent)).length)
      expect(mapReport.entries.every(entry => entry.classification && entry.classification !== 'unclassified')).toBe(true)
    }
  })

  it('keeps real dot cases and known missing map geometry explicit', () => {
    const report = auditCapitalAuthoringMaps(inputs)
    const asia = report.maps.find(map => map.mapId === 'asia')
    const world = report.maps.find(map => map.mapId === 'world')
    const oceania = report.maps.find(map => map.mapId === 'oceania')
    expect(asia?.entries.find(entry => entry.countryId === 'BH')?.classification).toBe('native-single-dot')
    expect(asia?.entries.find(entry => entry.countryId === 'QA')?.classification).toBe('native-single-dot')
    expect(oceania?.entries.find(entry => entry.countryId === 'FM')?.classification).toBe('native-multi-dot')
    expect(oceania?.entries.find(entry => entry.countryId === 'CK')?.classification).toBe('missing-or-unresolved')
    expect(oceania?.entries.find(entry => entry.countryId === 'NU')?.classification).toBe('missing-or-unresolved')
    expect(world?.entries.filter(entry => entry.classification === 'missing-or-unresolved').map(entry => entry.countryId)).toEqual([
      'SM', 'VA', 'LK', 'PW', 'FM', 'NR', 'MH', 'KI', 'CK', 'NU', 'TV', 'TO', 'ST', 'SC', 'KN',
    ])
    expect(oceania?.entries.find(entry => entry.countryId === 'WS')?.syntheticDotCandidateCount).toBe(1)
    expect(report.warnings.filter(warning => warning.includes('Synthetic metadata')).length).toBe(0)
  })

  it('can format a map report for developers after SVG updates', () => {
    const report = auditCapitalAuthoringMaps(inputs).maps.find(map => map.mapId === 'asia')
    expect(report).toBeDefined()
    expect(formatCapitalAuthoringGeometryAudit(report!)).toContain('Bahrain')
    expect(formatCapitalAuthoringGeometryAudit(report!)).toContain('native-single-dot')
  })
})
