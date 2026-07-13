import { describe, it, expect } from 'vitest'
import { medianMs } from './itemStore'

describe('medianMs', () => {
  it('returns null for an empty array', () => {
    expect(medianMs([])).toBeNull()
  })
  it('returns the middle element for odd length', () => {
    expect(medianMs([3, 1, 2])).toBe(2)
  })
  it('averages the two middle elements for even length', () => {
    expect(medianMs([1, 2, 3, 4])).toBe(2.5)
  })
})
