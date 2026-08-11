import { describe, expect, it } from 'vitest'
import { reorderDraft } from './reorderDraft'

describe('reorderDraft', () => {
  it('moves an item directly to its requested position', () => {
    const items = ['a', 'b', 'c', 'd']
    const next = reorderDraft(items, 3, 1)

    expect(next).toEqual(['a', 'd', 'b', 'c'])
    expect(items).toEqual(['a', 'b', 'c', 'd'])
  })

  it('leaves the draft unchanged for an invalid or no-op move', () => {
    const items = ['a', 'b', 'c', 'd']

    expect(reorderDraft(items, 1, 1)).toEqual(items)
    expect(reorderDraft(items, -1, 1)).toEqual(items)
    expect(reorderDraft(items, 1, items.length)).toEqual(items)
  })
})
