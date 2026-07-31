import { describe, it, expect } from 'vitest'
import { PAO_SHIPPED, buildPaoCards, paoKey } from './paoCards'
import { CARD_NUMBERS } from './cards'

describe('PAO_SHIPPED', () => {
  it('has a person, action and object for all 52 cards', () => {
    expect(Object.keys(PAO_SHIPPED)).toHaveLength(52 * 3)
    for (const n of CARD_NUMBERS) {
      expect(PAO_SHIPPED[paoKey(n, 'person')]).toBeTruthy()
      expect(PAO_SHIPPED[paoKey(n, 'action')]).toBeTruthy()
      expect(PAO_SHIPPED[paoKey(n, 'object')]).toBeTruthy()
    }
  })
})

describe('buildPaoCards', () => {
  it('derives all 52 triples from the shipped map', () => {
    const cards = buildPaoCards(PAO_SHIPPED)
    expect(cards).toHaveLength(52)
    expect(cards[0]).toEqual({ number: '01', person: 'Adele', action: 'baking', object: 'anchor' })
  })

  it('applies effective overrides over the shipped values', () => {
    const words = { ...PAO_SHIPPED, [paoKey('01', 'person')]: 'Alan Turing' }
    const cards = buildPaoCards(words)
    expect(cards[0].person).toBe('Alan Turing')
    expect(cards[0].action).toBe('baking')
  })

  it('falls back to empty strings for missing fields', () => {
    const cards = buildPaoCards({})
    expect(cards[0]).toEqual({ number: '01', person: '', action: '', object: '' })
  })
})
