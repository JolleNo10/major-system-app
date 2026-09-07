import { describe, expect, it } from 'vitest'
import { getWorldCountriesAnswerKind, getWorldCountriesAnswerAccent, getWorldCountriesTaskHighlightFill } from './WorldCountriesAnswerSemantics'

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

  it.each([
    ['country', 'border-cyan-500/45', 'border-cyan-500/60', 'bg-cyan-600'],
    ['capital', 'border-violet-500/45', 'border-violet-500/60', 'bg-violet-600'],
  ] as const)('keeps %s map and answer accents in one shared semantic definition', (answerKind, dockBorder, inputBorder, checkButton) => {
    const accent = getWorldCountriesAnswerAccent(answerKind)
    expect(accent.highlightFill).toBe(getWorldCountriesTaskHighlightFill(answerKind))
    expect(accent.dockBorderClassName).toBe(dockBorder)
    expect(accent.typingInput.borderClassName).toBe(inputBorder)
    expect(accent.typingInput.submitButtonClassName).toContain(checkButton)
  })
})
