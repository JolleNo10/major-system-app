import { describe, expect, it } from 'vitest'
import { classifyCapitalDotDescriptors } from './capitalDotDetection'

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
})
