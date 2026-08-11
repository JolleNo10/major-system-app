// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'

const learningOrderEditorMock = vi.hoisted(() => vi.fn())

vi.mock('../LearningOrderEditor', () => ({
  LearningOrderEditor: (props: {
    onItemHover?: (item: ReturnType<typeof getSubregionDefinition> | null) => void
  }) => {
    learningOrderEditorMock(props)
    return null
  },
}))

import { ContinentOrderEditor } from './ContinentOrderEditor'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  learningOrderEditorMock.mockReset()
})

describe('World Countries Continent order editor', () => {
  it('maps drag-handle hover to the matching Subregion map group', async () => {
    const onHoverGroup = vi.fn()
    const subregion = getSubregionDefinition('northern-europe')
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(ContinentOrderEditor, {
        continent: 'Europe',
        entries: [subregion],
        onHoverGroup,
        onDraftChanged: vi.fn(),
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }))
    })

    const props = learningOrderEditorMock.mock.calls[0]?.[0]
    props?.onItemHover?.(subregion)
    props?.onItemHover?.(null)

    expect(onHoverGroup.mock.calls).toEqual([
      ['subregion-northern-europe'],
      [null],
    ])
  })
})
