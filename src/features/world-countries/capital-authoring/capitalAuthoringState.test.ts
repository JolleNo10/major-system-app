import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import {
  createCandidatePlacement,
  createEmptyCapitalAuthoringDocument,
  createManualPointPlacement,
  createUnresolvedPlacement,
  getCapitalAuthoringCounts,
} from './capitalAuthoringState'
import type { CapitalAuthoringDetection } from './capitalAuthoringTypes'

const norway = countries.find(country => country.id === 'NO')!
const europeMap = {
  id: 'europe',
  sourceAsset: 'MapChart_Map_Europe.svg',
  sourceAssetSha: 'sha256:test',
  viewBox: '0 0 100 80',
}

const normalDetection: CapitalAuthoringDetection = {
  geometry: 'normal',
  candidates: [],
  mappedSvgIds: ['Norway'],
}

describe('capital authoring state', () => {
  it('records a normal manual point as a placed human decision', () => {
    const placement = createManualPointPlacement(norway, { x: 43, y: 29 }, normalDetection)

    expect(placement).toMatchObject({
      countryId: 'NO',
      country: 'Norway',
      capital: 'Oslo',
      status: 'placed',
      anchor: { x: 43, y: 29 },
      authoring: { geometry: 'normal', decision: 'manual-point' },
    })
  })

  it('keeps single-dot and multi-dot provenance in the placement', () => {
    const singleDetection: CapitalAuthoringDetection = {
      geometry: 'single-dot',
      mappedSvgIds: ['Monaco'],
      candidates: [{ id: 'candidate-1', x: 51, y: 55, sourceElementId: 'Monaco', origin: 'synthetic' }],
    }
    const single = createCandidatePlacement(norway, singleDetection, singleDetection.candidates[0])
    expect(single.authoring).toMatchObject({
      geometry: 'single-dot',
      decision: 'confirmed-suggested-dot',
      selectedCandidateId: 'candidate-1',
    })
    expect(single.authoring.candidates).toEqual([
      { id: 'candidate-1', x: 51, y: 55, sourceElementId: 'Monaco' },
    ])

    const multiDetection: CapitalAuthoringDetection = {
      geometry: 'multi-dot',
      mappedSvgIds: ['Micronesia'],
      candidates: [
        { id: 'candidate-1', x: 10, y: 10 },
        { id: 'candidate-2', x: 20, y: 20 },
      ],
    }
    const multi = createCandidatePlacement(norway, multiDetection, multiDetection.candidates[1])
    expect(multi.authoring).toMatchObject({
      geometry: 'multi-dot',
      decision: 'selected-from-multiple',
      selectedCandidateId: 'candidate-2',
    })
    expect(multi.anchor).toEqual({ x: 20, y: 20 })
  })

  it('records unresolved review without creating an authoritative anchor', () => {
    const document = createEmptyCapitalAuthoringDocument(europeMap)
    const unresolved = createUnresolvedPlacement(norway, normalDetection)
    const counts = getCapitalAuthoringCounts([norway], { [norway.id]: unresolved })

    expect(unresolved.anchor).toBeUndefined()
    expect(unresolved.status).toBe('unresolved')
    expect(counts).toMatchObject({ total: 1, reviewed: 1, remaining: 0, unresolved: 1 })
    expect(document.placements).toEqual({})
  })
})
