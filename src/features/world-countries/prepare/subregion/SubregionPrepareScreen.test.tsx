// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { SubregionPrepareScreen } from './SubregionPrepareScreen'

const railsMock = vi.hoisted(() => vi.fn())

vi.mock('../WorldCountriesPrepareRails', () => ({
  PrepareSubregionRails: (props: Record<string, unknown>) => {
    railsMock(props)
    return createElement('div', { 'data-testid': 'prepare-subregion-rails' })
  },
}))

vi.mock('./SubregionPrepareOverview', () => ({
  SubregionPrepareOverview: () => <div data-testid="prepare-subregion-overview" />,
}))

const norway: Country = {
  id: 'NO',
  country: 'Norway',
  capital: 'Oslo',
  continent: 'Europe',
  subregionId: 'northern-europe',
  subregion: 'Northern Europe',
}

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  railsMock.mockReset()
  localStorage.clear()
})

describe('SubregionPrepareScreen', () => {
  it('does not recommend the currently open subregion as Prepare next', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(<SubregionPrepareScreen
        continent="Europe"
        subregion="northern-europe"
        activeCountries={[norway]}
        learningVersion={0}
        onLearningChanged={vi.fn()}
        onSelectSubregion={vi.fn()}
        onExit={vi.fn()}
        onWorld={vi.fn()}
      />)
      await Promise.resolve()
    })

    const props = railsMock.mock.calls[0]?.[0] as { nextSubregion: unknown; nextEmptyLabel: string }
    expect(props.nextSubregion).toBeNull()
    expect(props.nextEmptyLabel).toBe('No other subregions to prepare')
  })
})
