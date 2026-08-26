import { describe, expect, it } from 'vitest'
import { getWorldCountriesAnswerKind, getWorldCountriesTaskHighlightFill } from './WorldCountriesAnswerSemantics'

describe('World Countries answer semantics', () => {
  it.each([
    ['location-to-country', 'country'],
    ['shape-to-country', 'country'],
    ['capital-to-country', 'country'],
    ['country-to-capital', 'capital'],
  ] as const)('maps %s to the required %s answer', (skill, expected) => {
    expect(getWorldCountriesAnswerKind(skill)).toBe(expected)
  })

  it.each([
    ['country', '#0891b2'],
    ['capital', '#8b5cf6'],
  ] as const)('maps %s answers to the established active-task fill', (answerKind, expected) => {
    expect(getWorldCountriesTaskHighlightFill(answerKind)).toBe(expected)
  })
})
