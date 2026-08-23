import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import {
  classifyCapitalAuthoringComponents,
  classifyCapitalDotDescriptors,
  detectCapitalDotCandidates,
} from './capitalDotDetection'

const norway = countries.find(country => country.id === 'NO')!

describe('capital authoring dot detection', () => {
  it('classifies a compact descriptor as a single-dot suggestion', () => {
    expect(classifyCapitalDotDescriptors([
      { sourceElementId: 'Monaco', bbox: { x: 10, y: 20, width: 2, height: 2 } },
    ])).toEqual({
      geometry: 'single-dot',
      candidates: [{ id: 'candidate-1', x: 11, y: 21, sourceElementId: 'Monaco' }],
    })
  })

  it('classifies disconnected circle-style subpaths as multiple candidates', () => {
    expect(classifyCapitalDotDescriptors([
      {
        sourceElementId: 'Micronesia',
        bbox: { x: 0, y: 0, width: 40, height: 30 },
        pathData: 'M 1 1 a 1 1 0 1 0 0 2 z M 20 10 a 1 1 0 1 0 0 2 z',
      },
    ])).toMatchObject({
      geometry: 'multi-dot',
      candidates: [
        { id: 'candidate-1', x: 1, y: 1, sourceElementId: 'Micronesia' },
        { id: 'candidate-2', x: 20, y: 10, sourceElementId: 'Micronesia' },
      ],
    })
  })

  it('does not classify circle edge offsets as extra candidates', () => {
    expect(classifyCapitalDotDescriptors([
      {
        sourceElementId: 'Micronesia',
        bbox: { x: 0, y: 0, width: 40, height: 30 },
        pathData: 'M 1 1 m -1 0 a 1 1 0 1 0 0 2 z M 20 10 m -1 0 a 1 1 0 1 0 0 2 z',
      },
    ])).toMatchObject({
      geometry: 'multi-dot',
      candidates: [
        { id: 'candidate-1', x: 1, y: 1 },
        { id: 'candidate-2', x: 20, y: 10 },
      ],
    })
  })

  it('falls back to normal geography when no compact geometry is found', () => {
    expect(classifyCapitalDotDescriptors([
      { sourceElementId: 'Norway', bbox: { x: 0, y: 0, width: 200, height: 100 } },
    ])).toEqual({ geometry: 'normal', candidates: [] })
  })

  it('traverses primitive descendants and applies group transforms in root SVG space', () => {
    const root = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><g id="Norway" transform="translate(100 50) scale(2)"><circle cx="2" cy="3" r="2"/><ellipse cx="12" cy="13" rx="2" ry="1"/><rect x="20" y="20" width="4" height="4"/><polygon points="30,30 34,30 32,34"/><polyline points="40,40 44,40 42,44"/></g></svg>',
      'image/svg+xml',
    ).documentElement as unknown as SVGSVGElement

    const detection = detectCapitalDotCandidates(root, norway, 'test')

    expect(detection.classification).toBe('native-multi-dot')
    expect(detection.nativeDrawableComponentCount).toBe(5)
    expect(detection.candidates).toHaveLength(5)
    expect(detection.candidates[0]).toMatchObject({ x: 104, y: 56, origin: 'native' })
  })

  it('uses the source map viewBox for thresholds while the editor viewBox is expanded', () => {
    const root = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><path id="Norway" d="M10 10h14v14H10z"/></svg>',
      'image/svg+xml',
    ).documentElement as unknown as SVGSVGElement
    root.setAttribute('viewBox', '0 0 500 500')

    const detection = detectCapitalDotCandidates(root, norway, 'test', {
      x: 0,
      y: 0,
      width: 1000,
      height: 1000,
    })

    expect(detection.classification).toBe('native-single-dot')
  })

  it('uses curated synthetic points only when native geometry is not reliable', () => {
    const large = [{ sourceElementId: 'Norway', bbox: { x: 10, y: 10, width: 400, height: 300 } }]
    const synthetic = classifyCapitalAuthoringComponents(
      large,
      { x: 0, y: 0, width: 1000, height: 1000 },
      [{ x: 321, y: 654 }],
      'asia',
      'BH',
    )
    expect(synthetic).toMatchObject({
      geometry: 'single-dot',
      classification: 'synthetic-single-dot',
      syntheticDotCandidateCount: 1,
      candidates: [{ x: 321, y: 654, origin: 'synthetic' }],
    })

    const multipleSynthetic = classifyCapitalAuthoringComponents(
      large,
      { x: 0, y: 0, width: 1000, height: 1000 },
      [{ x: 321, y: 654 }, { x: 333, y: 666 }],
      'asia',
      'BH',
    )
    expect(multipleSynthetic).toMatchObject({
      geometry: 'multi-dot',
      classification: 'synthetic-multi-dot',
      syntheticDotCandidateCount: 2,
    })

    const native = classifyCapitalAuthoringComponents(
      [{ sourceElementId: 'Norway', bbox: { x: 10, y: 10, width: 4, height: 4 } }],
      { x: 0, y: 0, width: 1000, height: 1000 },
      [{ x: 321, y: 654 }],
      'asia',
      'BH',
    )
    expect(native).toMatchObject({
      geometry: 'single-dot',
      classification: 'native-single-dot',
      syntheticDotCandidateCount: 1,
      candidates: [{ x: 12, y: 12, origin: 'native' }],
    })
  })

  it('classifies mixed and missing geometry without guessing a candidate', () => {
    const mixed = classifyCapitalAuthoringComponents([
      { sourceElementId: 'Norway', bbox: { x: 10, y: 10, width: 4, height: 4 } },
      { sourceElementId: 'Norway', bbox: { x: 100, y: 100, width: 400, height: 300 } },
    ])
    expect(mixed).toMatchObject({ classification: 'mixed-or-ambiguous', geometry: 'normal', candidates: [] })

    const missing = classifyCapitalAuthoringComponents([])
    expect(missing).toMatchObject({ classification: 'missing-or-unresolved', geometry: 'normal', candidates: [] })
  })
})
