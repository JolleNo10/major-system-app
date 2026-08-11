// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'

const learningOrderEditorMock = vi.hoisted(() => vi.fn())

vi.mock('../LearningOrderEditor', () => ({
  LearningOrderEditor: (props: {
    onItemHover?: (item: (typeof countries)[number] | null) => void
  }) => {
    learningOrderEditorMock(props)
    return null
  },
}))

import { SubregionOrderEditor } from './SubregionOrderEditor'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  learningOrderEditorMock.mockReset()
})

describe('World Countries Subregion order editor', () => {
  it('maps drag-handle hover to the matching Country on the map', async () => {
    const onHoverCountry = vi.fn()
    const norway = countries.find(country => country.id === 'NO')
    if (!norway) throw new Error('Expected Norway in the Country data')
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(SubregionOrderEditor, {
        subregion: 'northern-europe',
        entries: [norway],
        onHoverCountry,
        onDraftChanged: vi.fn(),
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }))
    })

    const props = learningOrderEditorMock.mock.calls[0]?.[0]
    props?.onItemHover?.(norway)
    props?.onItemHover?.(null)

    expect(onHoverCountry.mock.calls).toEqual([
      ['NO'],
      [null],
    ])
  })
})
