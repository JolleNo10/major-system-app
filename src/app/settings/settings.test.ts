import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'

describe('default settings', () => {
  it('enables fuzzy World Countries answer matching by default', () => {
    expect(DEFAULT_SETTINGS.worldCountriesFuzzyAnswerMatching).toBe(true)
  })
})
