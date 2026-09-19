// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesCountryProgress, deriveWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import { deriveWorldCountriesScopeProgressForCountries } from '@/features/world-countries/learning/scopeProgress'
import { deriveWorldCountriesScopeStatus } from '@/features/world-countries/learning/scopeStatus'
import type { WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import { WorldMasterySummary } from './WorldMasterySummary'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

function renderSummary() {
  const scopeCountries = countries.filter(country => ['NO', 'SE', 'DK', 'FI'].includes(country.id))
  const attempts = scopeCountries.flatMap((country, countryIndex) => {
    const skills = [
      ...(countryIndex < 3 ? ['location-to-country'] : []),
      ...(countryIndex < 2 ? ['country-to-capital'] : []),
    ]
    return skills.flatMap(skill => [1, 2, 3].map((day, index) => ({
      itemId: `world-countries:${skill}:${country.id}`,
      at: countryIndex * 100 + day + index,
      ok: true,
      ms: 100,
      evidenceKind: 'recall' as const,
      localDate: `2026-08-${String(day).padStart(2, '0')}`,
    })))
  })
  const recallProgress = deriveWorldCountriesRecallProgress({
    countryIds: scopeCountries.map(country => country.id),
    skills: ['location-to-country', 'country-to-capital'],
  }, attempts.map(attempt => ({ attemptType: 'review' as const, ...attempt })))
  const progress = deriveWorldCountriesScopeProgressForCountries('world', scopeCountries, recallProgress)
  const scopeStatus = deriveWorldCountriesScopeStatus(
    scopeCountries.map(country => country.id),
    new Map(scopeCountries.map(country => [country.id, 'COUNTRIES_AND_CAPITALS_LEARNED' as WorldCountriesLearningReadiness])),
    new Map(scopeCountries.map(country => [country.id, deriveWorldCountriesCountryProgress(country.id, recallProgress)])),
  )
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(createElement(WorldMasterySummary, { progress, scopeStatus }))
  })
  return { mount, progress }
}

describe('WorldMasterySummary', () => {
  it('headlines the highest reached rung while keeping strict completion separate', () => {
    const { mount, progress } = renderSummary()
    const text = mount.querySelector('[data-testid="world-mastery-summary"]')?.textContent ?? ''

    // Two of the four Countries have both core skills Mastered, so the scope
    // has reached the top rung; the atomic tracks stay further apart.
    expect(progress.locationToCountryMasteryRatio).toBe(3 / 4)
    expect(progress.countryToCapitalMasteryRatio).toBe(2 / 4)
    expect(text).toContain('Mastered 50%')
    expect(text).not.toContain('Mastery')
    expect(text).toContain('2 / 4 Countries fully mastered')
    expect(text).not.toContain('5 / 8')
  })

  it('renders both atomic recall tracks without a combined-status context', () => {
    const { mount } = renderSummary()
    expect(mount.querySelectorAll('[data-recall-track]')).toHaveLength(2)
    expect(mount.querySelector('[data-recall-track="country"]')).not.toBeNull()
    expect(mount.querySelector('[data-recall-track="capital"]')).not.toBeNull()
    expect(mount.querySelector('[aria-label="Country recall distribution"]')).toBeNull()
  })
})
