// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MiniSpellingPractice } from './MiniSpellingPractice'

let root: Root | null = null
const originalPlatform = navigator.platform

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  Object.defineProperty(navigator, 'platform', { configurable: true, value: originalPlatform })
})

function renderPractice(answer = 'Stockholm') {
  const mount = document.createElement('div')
  document.body.append(mount)
  root = createRoot(mount)
  act(() => {
    root?.render(createElement(MiniSpellingPractice, {
      answer,
      answerKind: 'capital',
      onComplete: vi.fn(),
    }))
  })
  return mount
}

function dispatchKey(input: HTMLInputElement, type: 'keydown' | 'keyup', key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...init })
  act(() => input.dispatchEvent(event))
  return event
}

function dispatchPointer(target: HTMLElement, type: 'pointerdown' | 'pointerup' | 'pointercancel' | 'lostpointercapture') {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'pointerId', { configurable: true, value: 1 })
  act(() => target.dispatchEvent(event))
  return event
}

function peekAnswer(mount: HTMLElement): HTMLElement | null {
  return mount.querySelector<HTMLElement>('[data-spelling-peek-answer]')
}

describe('MiniSpellingPractice spelling peek', () => {
  it('shows the canonical spelling obscured with a keyboard hint', () => {
    const mount = renderPractice()
    const peek = mount.querySelector<HTMLElement>('[data-spelling-peek]')!

    expect(mount.querySelector('[data-spelling-peek]')).not.toBeNull()
    expect(peek.className).toContain('h-[56px]')
    expect(peek.className).toContain('overflow-hidden')
    expect(peek.className).not.toContain('shadow-')
    expect(mount.querySelector('[data-spelling-peek-answer]')).toBeNull()
    expect(mount.querySelector('[data-spelling-answer-row]')?.className).toContain('mt-[14px]')
    expect(mount.querySelector('[data-spelling-answer-row]')?.className).toContain('gap-[14px]')
    expect(mount.querySelector('[data-spelling-peek-hint]')?.textContent).toBe('Hold Ctrl')
    expect(mount.textContent).toContain('Type the canonical spelling from memory.')
    expect(mount.textContent).not.toContain('Get it right twice in a row.')
  })

  it('reveals only while Ctrl is held and keeps focus in the spelling input', () => {
    const mount = renderPractice()
    const input = mount.querySelector<HTMLInputElement>('input')!

    expect(document.activeElement).toBe(input)
    dispatchKey(input, 'keydown', 'Control', { ctrlKey: true })
    expect(peekAnswer(mount)?.hasAttribute('data-spelling-answer-revealed')).toBe(true)
    expect(peekAnswer(mount)?.textContent).toBe('Stockholm')
    expect(mount.querySelector('[data-spelling-peek-hint]')?.textContent).toBe('Release Ctrl')
    expect(mount.querySelector('[data-spelling-peek-label]')).toBeNull()
    expect(document.activeElement).toBe(input)

    dispatchKey(input, 'keyup', 'Control')
    expect(peekAnswer(mount)).toBeNull()
    expect(document.activeElement).toBe(input)
  })

  it('uses Cmd on macOS', () => {
    Object.defineProperty(navigator, 'platform', { configurable: true, value: 'MacIntel' })
    const mount = renderPractice()
    const input = mount.querySelector<HTMLInputElement>('input')!

    expect(mount.querySelector('[data-spelling-peek-hint]')?.textContent).toBe('Hold ⌘')
    dispatchKey(input, 'keydown', 'Meta', { metaKey: true })
    expect(peekAnswer(mount)?.textContent).toBe('Stockholm')
    dispatchKey(input, 'keyup', 'Meta')
    expect(peekAnswer(mount)).toBeNull()
  })

  it('does not prevent normal Ctrl shortcuts and hides for their key combination', () => {
    const mount = renderPractice()
    const input = mount.querySelector<HTMLInputElement>('input')!

    dispatchKey(input, 'keydown', 'Control', { ctrlKey: true })
    expect(peekAnswer(mount)?.textContent).toBe('Stockholm')
    const pasteShortcut = dispatchKey(input, 'keydown', 'v', { ctrlKey: true })
    const copyShortcut = dispatchKey(input, 'keydown', 'c', { ctrlKey: true })

    expect(pasteShortcut.defaultPrevented).toBe(false)
    expect(copyShortcut.defaultPrevented).toBe(false)
    expect(peekAnswer(mount)).toBeNull()
  })

  it('reveals on pointer press and hides on release, cancel, and lost capture', () => {
    const mount = renderPractice()
    const input = mount.querySelector<HTMLInputElement>('input')!
    const peek = mount.querySelector<HTMLElement>('[data-mini-spelling-action="peek"]')!

    expect(dispatchPointer(peek, 'pointerdown').defaultPrevented).toBe(true)
    expect(peekAnswer(mount)?.textContent).toBe('Stockholm')
    expect(document.activeElement).toBe(input)
    dispatchPointer(peek, 'pointerup')
    expect(peekAnswer(mount)).toBeNull()

    dispatchPointer(peek, 'pointerdown')
    dispatchPointer(peek, 'pointercancel')
    expect(peekAnswer(mount)).toBeNull()

    dispatchPointer(peek, 'pointerdown')
    dispatchPointer(peek, 'lostpointercapture')
    expect(peekAnswer(mount)).toBeNull()
  })

  it('hides on focus loss, document hiding, answer changes, and unmount cleanup', () => {
    const mount = renderPractice()
    const input = mount.querySelector<HTMLInputElement>('input')!

    dispatchKey(input, 'keydown', 'Control', { ctrlKey: true })
    act(() => window.dispatchEvent(new Event('blur')))
    expect(peekAnswer(mount)).toBeNull()

    dispatchKey(input, 'keydown', 'Control', { ctrlKey: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(peekAnswer(mount)).toBeNull()

    dispatchKey(input, 'keydown', 'Control', { ctrlKey: true })
    act(() => {
      root?.render(createElement(MiniSpellingPractice, {
        answer: 'Sweden',
        answerKind: 'capital',
        onComplete: vi.fn(),
      }))
    })
    expect(peekAnswer(mount)).toBeNull()

    const removeWindowListener = vi.spyOn(window, 'removeEventListener')
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener')
    act(() => {
      root?.unmount()
      root = null
    })
    expect(removeWindowListener).toHaveBeenCalledWith('blur', expect.any(Function))
    expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })
})
