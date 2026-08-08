// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import {
  MEMO_STORAGE_KEY,
  isCountryMemoed,
  loadMemoedCountryIds,
  markCountryMemoed,
  saveMemoedCountryIds,
} from './memoStore'

afterEach(() => localStorage.clear())

describe('World Countries Memo store', () => {
  it('persists stable Country IDs after a successful recall', () => {
    const norway = countries.find(country => country.id === 'NO')!
    expect(isCountryMemoed(norway)).toBe(false)
    const ids = markCountryMemoed(norway)
    expect(ids).toEqual(new Set(['NO']))
    expect(loadMemoedCountryIds()).toEqual(new Set(['NO']))
    expect(isCountryMemoed(norway)).toBe(true)
  })

  it('deduplicates IDs and ignores malformed stored values', () => {
    expect(saveMemoedCountryIds(['NO', 'NO', ''])).toEqual(new Set(['NO']))
    expect(JSON.parse(localStorage.getItem(MEMO_STORAGE_KEY)!)).toEqual(['NO'])
    localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify({ NO: 123, '': 0 }))
    expect(loadMemoedCountryIds()).toEqual(new Set(['NO']))
    localStorage.setItem(MEMO_STORAGE_KEY, '{not-json')
    expect(loadMemoedCountryIds()).toEqual(new Set())
  })
})
