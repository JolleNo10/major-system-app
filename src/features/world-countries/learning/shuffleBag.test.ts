import { describe, expect, it } from 'vitest'
import { createShuffleBag, drawShuffleBag } from './shuffleBag'

describe('World Countries shuffle bag', () => {
  it('draws every item once before refilling', () => {
    const items = ['NO', 'SE', 'DK']
    let state = createShuffleBag(items, () => 0)
    const drawn: string[] = []
    for (let index = 0; index < items.length; index += 1) {
      const draw = drawShuffleBag(state, items, () => 0)!
      drawn.push(draw.value)
      state = draw.state
    }
    expect(new Set(drawn)).toEqual(new Set(items))
    const next = drawShuffleBag(state, items, () => 0)!
    expect(next.value).not.toBe(drawn[drawn.length - 1])
  })

  it('supports deterministic injected randomness', () => {
    const first = createShuffleBag(['A', 'B', 'C'], () => 0)
    const second = createShuffleBag(['A', 'B', 'C'], () => 0)
    expect(first).toEqual(second)
  })
})
