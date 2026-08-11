// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { getContinentsInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'

const learningOrderEditorMock = vi.hoisted(() => vi.fn())

vi.mock('../LearningOrderEditor', () => ({
  LearningOrderEditor: (props: {
    persistOrder: (orderedIds: string[]) => void
    onItemHover?: (item: string | null) => void
    onChanged: () => void
    onClose: () => void
  }) => {
    learningOrderEditorMock(props)
    return createElement('button', {
      type: 'button',
      onClick: () => {
        props.persistOrder(['north-america', 'europe'])
        props.onChanged()
        props.onClose()
      },
    }, 'Save reordered order')
  },
}))

import { WorldOrderEditor } from './WorldOrderEditor'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  localStorage.clear()
  learningOrderEditorMock.mockReset()
})

describe('World Countries World order editor', () => {
  it('persists reordered IDs used by the effective World order after reload', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldOrderEditor, {
        entries: ['Europe', 'North America'],
        onDraftChanged: vi.fn(),
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }))
    })

    await act(async () => {
      mount.querySelector('button')?.click()
    })

    expect(getWorldMetadata()?.continentOrder).toEqual(['north-america', 'europe'])
    expect(getContinentsInEffectiveOrder(countries, getWorldMetadata()).slice(0, 2)).toEqual([
      'North America',
      'Europe',
    ])
  })

  it('maps drag-handle hover to the matching World map group', async () => {
    const onHoverGroup = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldOrderEditor, {
        entries: ['Europe', 'North America'],
        onHoverGroup,
        onDraftChanged: vi.fn(),
        onChanged: vi.fn(),
        onClose: vi.fn(),
      }))
    })

    const props = learningOrderEditorMock.mock.calls[0]?.[0]
    props?.onItemHover?.('Europe')
    props?.onItemHover?.(null)

    expect(onHoverGroup.mock.calls).toEqual([
      ['continent-europe'],
      [null],
    ])
  })
})
