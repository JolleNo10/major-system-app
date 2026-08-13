// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InlineOrderEditor } from './InlineOrderEditor'

vi.mock('@dnd-kit/dom', () => ({
  PointerActivationConstraints: {
    Delay: class { constructor(public value: unknown) {} },
    Distance: class { constructor(public value: unknown) {} },
  },
}))
vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children }: { children: unknown }) => children,
  PointerSensor: { configure: () => ({}) },
}))
vi.mock('@dnd-kit/react/sortable', () => ({
  isSortable: () => false,
  useSortable: () => ({ ref: undefined, handleRef: undefined, isDragging: false, isDropTarget: false }),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
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

  it('preserves the draft when persistence fails and exposes recovery', () => {
    const onSave = vi.fn(() => { throw new Error('quota') })
    const { mount } = renderEditor({ onSave })
    act(() => [...mount.querySelectorAll('button')].find(button => button.textContent === 'Save')?.click())
    expect(mount.querySelector('[role="alert"]')?.textContent).toContain('still available')
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
