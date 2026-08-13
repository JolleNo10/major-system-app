// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InlineOrderEditor } from './InlineOrderEditor'

const dragEndMock = vi.hoisted(() => vi.fn())

vi.mock('@dnd-kit/dom', () => ({
  PointerActivationConstraints: {
    Delay: class { constructor(public value: unknown) {} },
    Distance: class { constructor(public value: unknown) {} },
  },
}))
vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children, onDragEnd }: { children: unknown; onDragEnd: (event: unknown) => void }) => {
    dragEndMock.mockImplementation(onDragEnd)
    return children
  },
  PointerSensor: { configure: () => ({}) },
}))
vi.mock('@dnd-kit/react/sortable', () => ({
  isSortable: () => true,
  useSortable: () => ({ ref: undefined, handleRef: undefined, isDragging: false, isDropTarget: false }),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  dragEndMock.mockReset()
  document.body.replaceChildren()
})

function renderEditor(overrides: Partial<ComponentProps<typeof InlineOrderEditor<string>>> = {}) {
  const mount = document.createElement('div')
  document.body.append(mount)
  const props = {
    entries: ['Denmark', 'Norway', 'Sweden'],
    getId: (entry: string) => entry,
    getLabel: (entry: string) => entry,
    onDraftChanged: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onResetCanonical: () => ['Denmark', 'Norway', 'Sweden'],
    ...overrides,
  }
  act(() => { root = createRoot(mount); root.render(createElement(InlineOrderEditor, props as never)) })
  return { mount, props }
}

describe('InlineOrderEditor', () => {
  it('keeps Save, Cancel, handles, and current sequence in the existing list', () => {
    const { mount, props } = renderEditor()
    expect(mount.querySelectorAll('.world-order-row')).toHaveLength(3)
    expect(mount.querySelector('[aria-label="Sequence 1"]')?.textContent).toBe('1.')
    const handle = mount.querySelector('button[aria-label="Reorder Denmark"]')
    expect(handle).not.toBeNull()
    act(() => [...mount.querySelectorAll('button')].find(button => button.textContent === 'Save')?.click())
    expect(props.onSave).toHaveBeenCalledWith(['Denmark', 'Norway', 'Sweden'])
  })

  it('reports hover for the whole reorder row', () => {
    const onItemHover = vi.fn()
    const onItemLeave = vi.fn()
    const { mount } = renderEditor({ onItemHover, onItemLeave })
    const row = mount.querySelector('.world-order-row')!

    act(() => row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    expect(onItemHover).toHaveBeenCalledOnce()
    act(() => row.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })))
    expect(onItemLeave).toHaveBeenCalledOnce()
  })

  it('preserves the draft when persistence fails and exposes recovery', () => {
    const onSave = vi.fn(() => { throw new Error('quota') })
    const { mount } = renderEditor({ onSave })
    act(() => [...mount.querySelectorAll('button')].find(button => button.textContent === 'Save')?.click())
    expect(mount.querySelector('[role="alert"]')?.textContent).toContain('still available')
  })

  it('applies a completed drag to the draft without saving it', () => {
    const onDraftChanged = vi.fn()
    const onSave = vi.fn()
    renderEditor({ onDraftChanged, onSave })

    act(() => dragEndMock({
      canceled: false,
      operation: { source: { initialIndex: 0, index: 2 } },
    }))

    expect(onDraftChanged).toHaveBeenLastCalledWith(['Norway', 'Sweden', 'Denmark'])
    expect(onSave).not.toHaveBeenCalled()
  })

  it('ignores an auto-order result after cancellation', async () => {
    let resolveAutoOrder: ((draft: readonly string[]) => void) | undefined
    const run = vi.fn(() => new Promise<readonly string[]>(resolve => {
      resolveAutoOrder = resolve
    }))
    const onDraftChanged = vi.fn()
    const onCancel = vi.fn()
    const { mount } = renderEditor({
      onDraftChanged,
      onCancel,
      autoOrder: {
        label: 'Auto-order',
        pendingLabel: 'Ordering...',
        hint: 'Use the canonical order.',
        errorMessage: 'Could not order this list.',
        run,
      },
    })

    act(() => mount.querySelector('button')?.click())
    expect(run).toHaveBeenCalledWith(['Denmark', 'Norway', 'Sweden'])
    expect(mount.querySelector('button')?.textContent).toBe('Ordering...')
    expect([...mount.querySelectorAll('button')].find(button => button.textContent === 'Save')?.disabled).toBe(true)

    act(() => [...mount.querySelectorAll('button')].find(button => button.textContent === 'Cancel')?.click())
    expect(onCancel).toHaveBeenCalledOnce()

    await act(async () => {
      resolveAutoOrder?.(['Sweden', 'Norway', 'Denmark'])
      await Promise.resolve()
    })

    expect(onDraftChanged).not.toHaveBeenCalledWith(['Sweden', 'Norway', 'Denmark'])
  })

  it('ignores an auto-order result after unmounting', async () => {
    let resolveAutoOrder: ((draft: readonly string[]) => void) | undefined
    const run = vi.fn(() => new Promise<readonly string[]>(resolve => {
      resolveAutoOrder = resolve
    }))
    const onDraftChanged = vi.fn()
    const { mount } = renderEditor({
      onDraftChanged,
      autoOrder: {
        label: 'Auto-order',
        pendingLabel: 'Ordering...',
        hint: 'Use the canonical order.',
        errorMessage: 'Could not order this list.',
        run,
      },
    })

    act(() => mount.querySelector('button')?.click())
    act(() => root?.unmount())
    root = null

    await act(async () => {
      resolveAutoOrder?.(['Sweden', 'Norway', 'Denmark'])
      await Promise.resolve()
    })

    expect(onDraftChanged).not.toHaveBeenCalledWith(['Sweden', 'Norway', 'Denmark'])
  })

  it('returns the canonical order to the draft without saving it', () => {
    const onDraftChanged = vi.fn()
    const onSave = vi.fn()
    const { mount } = renderEditor({ onDraftChanged, onSave, onResetCanonical: () => ['Sweden', 'Norway', 'Denmark'] })
    act(() => [...mount.querySelectorAll('button')].find(button => button.textContent === 'Reset canonical order')?.click())
    expect(onDraftChanged).toHaveBeenLastCalledWith(['Sweden', 'Norway', 'Denmark'])
    expect(onSave).not.toHaveBeenCalled()
  })
})
