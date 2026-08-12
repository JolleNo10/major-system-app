// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeographyHierarchyRow } from './GeographyHierarchyRow'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('GeographyHierarchyRow', () => {
  it('synchronizes pointer and keyboard focus with the map', () => {
    const onHoverGroup = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(GeographyHierarchyRow, {
        label: 'Northern Europe',
        groupId: 'subregion-northern-europe',
        hoveredGroupId: null,
        onHoverGroup,
        onClick: vi.fn(),
      }))
    })

    const row = mount.querySelector('button')!
    act(() => row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    expect(onHoverGroup).toHaveBeenLastCalledWith('subregion-northern-europe')
    act(() => row.focus())
    expect(onHoverGroup).toHaveBeenLastCalledWith('subregion-northern-europe')
    act(() => row.blur())
    expect(onHoverGroup).toHaveBeenLastCalledWith(null)
  })

  it('keeps selected semantics visible while hovered', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(GeographyHierarchyRow, {
        label: 'Northern Europe',
        groupId: 'subregion-northern-europe',
        hoveredGroupId: 'subregion-northern-europe',
        selected: true,
        onHoverGroup: vi.fn(),
        onClick: vi.fn(),
      }))
    })

    const row = mount.querySelector('button')!
    expect(row.getAttribute('aria-pressed')).toBe('true')
    expect(row.textContent).toContain('✓')
  })
})
