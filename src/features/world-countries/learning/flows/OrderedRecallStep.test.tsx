// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { createCountryLearningFlow } from '@/features/world-countries/learning/countryLearningFlow'
import { OrderedRecallStep } from './OrderedRecallStep'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const country: Country = {
  id: 'IS',
  country: 'Iceland',
  capital: 'Reykjavík',
  continent: 'Europe',
  subregionId: 'northern-europe',
  subregion: 'Northern Europe',
}

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('OrderedRecallStep', () => {
  it('keeps the highlighted Country name hidden until answer or map hover', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <g><path id="Iceland"/><text id="Iceland_label">Iceland</text></g>
        </svg>`,
    })))
    const mount = document.createElement('div')
    document.body.appendChild(mount)
    const flow = createCountryLearningFlow({
      countryIds: [country.id],
      minimumCleanTarget: 1,
      entryPoint: 'ordered-recall',
    })

    await act(async () => {
      root = createRoot(mount)
      root.render(
        <OrderedRecallStep
          continent="Europe"
          entries={[country]}
          flow={flow}
          fuzzyMatching={false}
          onSubmit={() => undefined}
          onExit={() => undefined}
        />,
      )
      await Promise.resolve()
      await Promise.resolve()
    })

    const label = mount.querySelector<SVGTextElement>('text#Iceland_label')
    expect(label).not.toBeNull()
    expect(label?.style.getPropertyValue('display')).toBe('none')

    await act(async () => {
      mount.querySelector<SVGPathElement>('path#Iceland')?.dispatchEvent(new Event('pointerenter', { bubbles: true }))
    })
    expect(label?.style.getPropertyValue('display')).toBe('inline')
  })
})
