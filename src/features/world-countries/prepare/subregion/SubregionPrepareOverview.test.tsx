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
        learned={false}
        capitalsLearned={false}
      />)
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('Capital learning and review are launched from Drill.')
    expect(mount.textContent).toContain('Country–Capital mnemonics')
    expect(mount.textContent).not.toContain('Start learning countries')
    expect(mount.textContent).not.toContain('Start learning capitals')
    expect(mount.textContent).not.toContain('Review countries')
    expect(mount.textContent).not.toContain('Review capitals')
  })
})
