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

function buttonWithText(mount: HTMLElement, text: string) {
  return [...mount.querySelectorAll('button')].find(button => button.textContent === text) as HTMLButtonElement | undefined
}

function clickOrderTarget(mount: HTMLElement, label: string) {
  return mount.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null
}

describe('InlineOrderEditor', () => {
  it('keeps Save, Cancel, handles, and current sequence in the existing list', () => {
    const { mount, props } = renderEditor()
    expect(mount.querySelectorAll('.world-order-row')).toHaveLength(3)
    expect(mount.querySelector('[aria-label="Sequence 1"]')?.textContent).toBe('1.')
    const handle = mount.querySelector('button[aria-label="Reorder Denmark"]')
    expect(handle).not.toBeNull()
    expect(buttonWithText(mount, 'Click order')).toBeUndefined()
    act(() => buttonWithText(mount, 'Save')?.click())
    expect(props.onSave).toHaveBeenCalledWith(['Denmark', 'Norway', 'Sweden'])
  })

  it('builds a full sequence from click order without duplicate IDs', () => {
    const onDraftChanged = vi.fn()
    const onSave = vi.fn()
    const { mount } = renderEditor({ clickOrder: true, onDraftChanged, onSave })

    act(() => buttonWithText(mount, 'Click order')?.click())
    expect(mount.querySelector('[role="status"]')?.textContent).toBe('0 / 3 selected')
    expect(buttonWithText(mount, 'Save')?.disabled).toBe(true)

    act(() => clickOrderTarget(mount, 'Add Norway to click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Denmark to click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Sweden to click order')?.click())

    expect(mount.querySelector('[role="status"]')?.textContent).toBe('3 / 3 selected')
    expect(buttonWithText(mount, 'Save')?.disabled).toBe(false)
    expect(clickOrderTarget(mount, 'Remove Norway from click order, position 1')?.getAttribute('aria-pressed')).toBe('true')
    expect(onDraftChanged).toHaveBeenLastCalledWith(['Norway', 'Denmark', 'Sweden'])

    act(() => clickOrderTarget(mount, 'Remove Norway from click order, position 1')?.click())
    expect(mount.querySelector('[role="status"]')?.textContent).toBe('2 / 3 selected')
    expect(buttonWithText(mount, 'Save')?.disabled).toBe(true)
    expect(clickOrderTarget(mount, 'Remove Denmark from click order, position 1')?.getAttribute('aria-pressed')).toBe('true')
    expect(clickOrderTarget(mount, 'Remove Sweden from click order, position 2')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('toggles the same Country without adding a duplicate position', () => {
    const { mount } = renderEditor({ clickOrder: true })

    act(() => buttonWithText(mount, 'Click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Norway to click order')?.click())
    act(() => clickOrderTarget(mount, 'Remove Norway from click order, position 1')?.click())

    expect(mount.querySelector('[role="status"]')?.textContent).toBe('0 / 3 selected')
    expect(clickOrderTarget(mount, 'Add Norway to click order')).not.toBeNull()
  })

  it('saves a completed click sequence through the existing callback', () => {
    const onSave = vi.fn()
    const { mount } = renderEditor({ clickOrder: true, onSave })

    act(() => buttonWithText(mount, 'Click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Sweden to click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Denmark to click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Norway to click order')?.click())
    act(() => buttonWithText(mount, 'Save')?.click())

    expect(onSave).toHaveBeenCalledWith(['Sweden', 'Denmark', 'Norway'])
  })

  it('keeps a completed click draft after save failure and does not cancel it', () => {
    const onSave = vi.fn(() => { throw new Error('quota') })
    const onCancel = vi.fn()
    const { mount } = renderEditor({ clickOrder: true, onSave, onCancel })

    act(() => buttonWithText(mount, 'Click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Norway to click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Sweden to click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Denmark to click order')?.click())
    act(() => buttonWithText(mount, 'Save')?.click())

    expect(mount.querySelector('[role="alert"]')?.textContent).toContain('still available')
    expect(clickOrderTarget(mount, 'Remove Norway from click order, position 1')).not.toBeNull()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('cancels a completed click sequence without saving it', () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const { mount } = renderEditor({ clickOrder: true, onSave, onCancel })

    act(() => buttonWithText(mount, 'Click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Norway to click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Sweden to click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Denmark to click order')?.click())
    act(() => buttonWithText(mount, 'Cancel')?.click())

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('restores the pre-click full draft when returning to drag and drop early', () => {
    const onDraftChanged = vi.fn()
    const onSave = vi.fn()
    const { mount } = renderEditor({ clickOrder: true, onDraftChanged, onSave })

    act(() => dragEndMock({ canceled: false, operation: { source: { initialIndex: 0, index: 2 } } }))
    act(() => buttonWithText(mount, 'Click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Sweden to click order')?.click())
    act(() => buttonWithText(mount, 'Use drag & drop')?.click())

    expect(onDraftChanged).toHaveBeenLastCalledWith(['Norway', 'Sweden', 'Denmark'])
    act(() => buttonWithText(mount, 'Save')?.click())
    expect(onSave).toHaveBeenCalledWith(['Norway', 'Sweden', 'Denmark'])
  })

  it('continues from a completed click order after returning to drag and drop', () => {
    const onSave = vi.fn()
    const { mount } = renderEditor({ clickOrder: true, onSave })

    act(() => buttonWithText(mount, 'Click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Sweden to click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Denmark to click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Norway to click order')?.click())
    act(() => buttonWithText(mount, 'Use drag & drop')?.click())
    act(() => buttonWithText(mount, 'Save')?.click())

    expect(onSave).toHaveBeenCalledWith(['Sweden', 'Denmark', 'Norway'])
  })

  it('leaves click mode before applying a canonical reset', () => {
    const onDraftChanged = vi.fn()
    const { mount } = renderEditor({ clickOrder: true, onDraftChanged, onResetCanonical: () => ['Sweden', 'Norway', 'Denmark'] })

    act(() => buttonWithText(mount, 'Click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Norway to click order')?.click())
    act(() => buttonWithText(mount, 'Reset canonical order')?.click())

    expect(buttonWithText(mount, 'Click order')).toBeDefined()
    expect(mount.querySelector('[aria-label="Reorder Sweden"]')).not.toBeNull()
    expect(onDraftChanged).toHaveBeenLastCalledWith(['Sweden', 'Norway', 'Denmark'])
  })

  it('leaves click mode before applying map auto-order', async () => {
    let resolveAutoOrder: ((draft: readonly string[]) => void) | undefined
    const run = vi.fn((draft: readonly string[]) => new Promise<readonly string[]>(resolve => {
      resolveAutoOrder = resolve
      expect(draft).toEqual(['Denmark', 'Norway', 'Sweden'])
    }))
    const onDraftChanged = vi.fn()
    const { mount } = renderEditor({
      clickOrder: true,
      onDraftChanged,
      autoOrder: {
        label: 'Auto-order',
        pendingLabel: 'Ordering...',
        hint: 'Use the map.',
        errorMessage: 'Could not order this list.',
        run,
      },
    })

    act(() => buttonWithText(mount, 'Click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Norway to click order')?.click())
    act(() => buttonWithText(mount, 'Auto-order')?.click())
    expect(run).toHaveBeenCalledOnce()
    expect(buttonWithText(mount, 'Use drag & drop')).toBeUndefined()

    await act(async () => {
      resolveAutoOrder?.(['Sweden', 'Norway', 'Denmark'])
      await Promise.resolve()
    })

    expect(onDraftChanged).toHaveBeenLastCalledWith(['Sweden', 'Norway', 'Denmark'])
  })

  it('does not persist a click sequence when the editor unmounts', () => {
    const onSave = vi.fn()
    const { mount } = renderEditor({ clickOrder: true, onSave })

    act(() => buttonWithText(mount, 'Click order')?.click())
    act(() => clickOrderTarget(mount, 'Add Norway to click order')?.click())
    act(() => root?.unmount())
    root = null

    expect(onSave).not.toHaveBeenCalled()
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
