import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { createEmptyCapitalAuthoringDocument, createManualPointPlacement, updateCapitalAuthoringPlacement } from './capitalAuthoringState'
import {
  parseCapitalAuthoringImport,
  serializeCapitalAuthoringCombinedExport,
  serializeCapitalAuthoringDocument,
  validateCapitalAuthoringDocument,
} from './capitalAuthoringImportExport'

const norway = countries.find(country => country.id === 'NO')!
const map = {
  id: 'europe',
  sourceAsset: 'MapChart_Map_Europe.svg',
  sourceAssetSha: 'sha256:test',
  viewBox: '0 0 100 80',
}
const context = { map, countries: [norway] }

function documentWithPoint() {
  const empty = createEmptyCapitalAuthoringDocument(map)
  return updateCapitalAuthoringPlacement(empty, createManualPointPlacement(norway, { x: 43, y: 29 }, {
    geometry: 'normal',
    candidates: [],
    mappedSvgIds: ['Norway'],
  }))
}

describe('capital authoring interchange format', () => {
  it('round-trips the current map and preserves inspectable placement identity', () => {
    const document = documentWithPoint()
    const serialized = serializeCapitalAuthoringDocument(document)
    const parsed = parseCapitalAuthoringImport(serialized, context)
    const exported = JSON.parse(serialized) as Record<string, unknown>

    expect(parsed.errors).toEqual([])
    expect(parsed.warnings).toEqual([])
    expect(parsed.document).toEqual(document)
    expect(exported.schemaVersion).toBe(1)
    expect(exported).not.toHaveProperty('references')
  })

  it('allows import against changed SVG metadata but reports conspicuous warnings', () => {
    const document = documentWithPoint()
    const result = validateCapitalAuthoringDocument(document, {
      ...context,
      map: { ...map, sourceAssetSha: 'sha256:changed', viewBox: '0 0 120 80' },
    })

    expect(result.errors).toEqual([])
    expect(result.document).toEqual(document)
    expect(result.warnings).toHaveLength(2)
    expect(result.warnings.join(' ')).toContain('fingerprint differs')
  })

  it('rejects anchors outside the exported SVG viewBox', () => {
    const document = documentWithPoint()
    const invalid = {
      ...document,
      placements: {
        ...document.placements,
        NO: { ...document.placements.NO, anchor: { x: 101, y: 29 } },
      },
    }
    const result = validateCapitalAuthoringDocument(invalid, context)

    expect(result.document).toBeNull()
    expect(result.errors.join(' ')).toContain('outside the SVG viewBox')
  })

  it('rejects dot provenance whose candidate set no longer matches detection', () => {
    const empty = createEmptyCapitalAuthoringDocument(map)
    const placement = createManualPointPlacement(norway, { x: 43, y: 29 }, {
      geometry: 'single-dot',
      candidates: [{ id: 'candidate-1', x: 43, y: 29 }],
      mappedSvgIds: ['Norway'],
    })
    const invalid = updateCapitalAuthoringPlacement(empty, {
      ...placement,
      authoring: { ...placement.authoring, candidates: [] },
    })

    const result = validateCapitalAuthoringDocument(invalid, context)

    expect(result.document).toBeNull()
    expect(result.errors.join(' ')).toContain('Detected single-dot')
  })

  it('selects the current map from a combined export', () => {
    const document = documentWithPoint()
    const parsed = parseCapitalAuthoringImport(serializeCapitalAuthoringCombinedExport([document]), context)

    expect(parsed.errors).toEqual([])
    expect(parsed.document).toEqual(document)
  })
})
