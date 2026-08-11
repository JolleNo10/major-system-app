// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { SubregionPrepareOverview } from './SubregionPrepareOverview'

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: () => <div data-testid="country-learning-map" />,
}))

const entries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('World Countries Prepare subregion overview', () => {
  it('inspects preparation content without exposing learning or review actions', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    await act(async () => {
      root = createRoot(mount)
      root.render(<SubregionPrepareOverview
        continent="Europe"
        subregion="northern-europe"
        entries={entries}
      />)
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('Country–Capital mnemonics')
    const map = mount.querySelector('[data-testid="country-learning-map"]')!
    const mnemonics = mount.querySelector('[aria-labelledby="prepare-country-capital-mnemonics-heading"]')!
    expect(map.compareDocumentPosition(mnemonics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(mount.querySelector('h2')?.textContent).not.toBe('Countries')
    expect(mount.querySelector('h2')?.textContent).not.toBe('Capitals')
    expect(mount.textContent).not.toContain('Start learning countries')
    expect(mount.textContent).not.toContain('Start learning capitals')
    expect(mount.textContent).not.toContain('Review countries')
    expect(mount.textContent).not.toContain('Review capitals')
  })
})
