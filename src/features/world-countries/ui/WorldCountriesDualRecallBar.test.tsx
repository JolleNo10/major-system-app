// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { WorldCountriesDualRecallBar } from './WorldCountriesDualRecallBar'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

function renderBar() {
  const mount = document.createElement('div')
  document.body.append(mount)
  root = createRoot(mount)
  act(() => root?.render(createElement(WorldCountriesDualRecallBar, {
    totalCountries: 4,
    countryCounts: { unpractised: 0, weak: 1, developing: 0, strong: 1, mastered: 2 },
    capitalCounts: { unpractised: 1, weak: 0, developing: 1, strong: 0, mastered: 2 },
  })))
  return mount
}

describe('WorldCountriesDualRecallBar', () => {
  it('renders Country above Capital with proportional status segments', () => {
    const mount = renderBar()
    const tracks = [...mount.querySelectorAll<HTMLElement>('[data-recall-track]')]
    expect(tracks.map(track => track.dataset.recallTrack)).toEqual(['country', 'capital'])
    expect(tracks[0]?.querySelectorAll('[data-progress-state]')).toHaveLength(3)
    expect(tracks[1]?.querySelectorAll('[data-progress-state]')).toHaveLength(3)
    expect(tracks[0]?.querySelector('[data-progress-state="mastered"]')?.getAttribute('style')).toContain('width: 50%')
    expect(tracks[0]?.querySelector('[data-progress-state="strong"]')?.getAttribute('style')).toContain('width: 25%')
    expect(tracks[1]?.querySelector('[data-progress-state="unpractised"]')?.getAttribute('style')).toContain('width: 25%')
  })

  it('provides one accessible summary for both dimensions without visible track percentages', () => {
    const mount = renderBar()
    expect(mount.textContent).toContain('Country recall:')
    expect(mount.textContent).toContain('Capital recall:')
    expect(mount.querySelectorAll('[data-recall-track]')).toHaveLength(2)
    expect(mount.querySelectorAll('[data-track-label]')).toHaveLength(0)
    expect(mount.textContent).not.toMatch(/Country\s+\d+%|Capital\s+\d+%/)
  })

  it('omits zero-count segments', () => {
    const mount = renderBar()
    expect(mount.querySelector('[data-recall-track="country"] [data-progress-state="unpractised"]')).toBeNull()
    expect(mount.querySelector('[data-recall-track="capital"] [data-progress-state="weak"]')).toBeNull()
  })
})
