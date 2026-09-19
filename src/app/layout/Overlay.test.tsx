// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isOverlayOpen } from '@/core/ui/overlayGuard'
import { Overlay } from './Overlay'

let root: Root | null = null
let mount: HTMLDivElement

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

function renderOverlay(onClose: () => void): HTMLDivElement {
  mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(createElement(Overlay, {
      onClose,
      ariaLabel: 'Test overlay',
      header: createElement('h1', null, 'Test overlay'),
      children: createElement('button', null, 'Action'),
    }))
  })
  return mount
}

describe('Overlay dismissibility', () => {
  it('keeps existing overlays dismissible by close control and Escape by default', () => {
    const onClose = vi.fn()
    const view = renderOverlay(onClose)
    const dialog = view.querySelector<HTMLElement>('[role="dialog"]')!

    expect(isOverlayOpen()).toBe(true)
    expect(view.querySelector('[aria-label="Close"]')).not.toBeNull()
    act(() => view.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click())
    expect(onClose).toHaveBeenCalledTimes(1)

    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
