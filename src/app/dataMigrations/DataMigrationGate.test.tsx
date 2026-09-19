// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isOverlayOpen } from '@/core/ui/overlayGuard'
import { DataMigrationGate } from './DataMigrationGate'
import type { AppDataMigration } from './migrationRunner'

let root: Root | null = null
let mount: HTMLDivElement

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

function renderGate(
  storedVersion: { value: number },
  migrate: () => Promise<void>,
  writeVersion: (version: number) => void | Promise<void> = version => { storedVersion.value = version },
): HTMLDivElement {
  mount = document.createElement('div')
  document.body.append(mount)
  const migrations: AppDataMigration[] = [{
    fromVersion: 0,
    toVersion: 1,
    title: 'Test update',
    migrate,
  }]
  act(() => {
    root = createRoot(mount)
    root.render(createElement(DataMigrationGate, {
      migrations,
      readVersion: () => storedVersion.value,
      writeVersion,
      children: createElement('div', { 'data-testid': 'application-child' }, 'Application mounted'),
    }))
  })
  return mount
}

async function flushUpdate(button: HTMLButtonElement): Promise<void> {
  await act(async () => {
    button.click()
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

describe('DataMigrationGate', () => {
  it('mounts children immediately when the stored model is current', () => {
    const stored = { value: 1 }
    const migrate = vi.fn(async () => undefined)
    const view = renderGate(stored, migrate)

    expect(view.querySelector('[data-testid="application-child"]')).not.toBeNull()
    expect(view.querySelector('[role="dialog"]')).toBeNull()
    expect(migrate).not.toHaveBeenCalled()
  })

  it('waits for explicit confirmation, prevents duplicate runs, then mounts children', async () => {
    const stored = { value: 0 }
    let resolveMigration!: () => void
    const migrate = vi.fn(() => new Promise<void>(resolve => { resolveMigration = resolve }))
    const view = renderGate(stored, migrate)

    expect(view.querySelector('[data-testid="application-child"]')).toBeNull()
    expect(view.querySelector('[role="dialog"]')?.textContent).toContain('Data update required')
    expect(migrate).not.toHaveBeenCalled()

    const update = [...view.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Update data')!
    act(() => {
      update.click()
      update.click()
    })

    expect(migrate).toHaveBeenCalledTimes(1)
    expect(view.querySelector('[role="status"]')?.textContent).toContain('Updating')
    expect(update.disabled).toBe(true)
    await act(async () => { resolveMigration(); await Promise.resolve() })

    expect(stored.value).toBe(1)
    expect(view.querySelector('[data-testid="application-child"]')).not.toBeNull()
    expect(view.querySelector('[role="dialog"]')).toBeNull()
  })

  it('keeps children gated after failure and retries from the unchanged marker', async () => {
    const stored = { value: 0 }
    const migrate = vi.fn()
      .mockRejectedValueOnce(new Error('converter failed'))
      .mockResolvedValue(undefined)
    const view = renderGate(stored, migrate)

    await flushUpdate([...view.querySelectorAll('button')][0]!)
    expect(stored.value).toBe(0)
    expect(view.querySelector('[data-testid="application-child"]')).toBeNull()
    expect(view.querySelector('[role="alert"]')?.textContent).toContain('converter failed')
    expect([...view.querySelectorAll('button')].some(button => button.textContent?.trim() === 'Retry')).toBe(true)

    await flushUpdate([...view.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Retry')!)
    expect(stored.value).toBe(1)
    expect(migrate).toHaveBeenCalledTimes(2)
    expect(view.querySelector('[data-testid="application-child"]')).not.toBeNull()
  })

  it('does not mount children or reset newer data', () => {
    const stored = { value: 4 }
    const migrate = vi.fn(async () => undefined)
    const view = renderGate(stored, migrate)

    expect(view.querySelector('[data-testid="application-child"]')).toBeNull()
    expect(view.querySelector('[role="alert"]')?.textContent).toContain('newer version')
    expect(view.querySelector('button')).toBeNull()
    expect(migrate).not.toHaveBeenCalled()
    expect(stored.value).toBe(4)
  })

  it('treats a failed version-marker write as incomplete and retries the step', async () => {
    const stored = { value: 0 }
    let failWrite = true
    const migrate = vi.fn(async () => undefined)
    const writeVersion = vi.fn((version: number) => {
      if (failWrite) throw new Error('marker quota failure')
      stored.value = version
    })
    const view = renderGate(stored, migrate, writeVersion)

    await flushUpdate([...view.querySelectorAll('button')][0]!)
    expect(migrate).toHaveBeenCalledTimes(1)
    expect(stored.value).toBe(0)
    expect(view.querySelector('[data-testid="application-child"]')).toBeNull()
    expect(view.querySelector('[role="alert"]')?.textContent).toContain('marker quota failure')

    failWrite = false
    await flushUpdate([...view.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Retry')!)
    expect(migrate).toHaveBeenCalledTimes(2)
    expect(stored.value).toBe(1)
    expect(view.querySelector('[data-testid="application-child"]')).not.toBeNull()
  })

  it('cannot be dismissed and keeps focus trapping and overlay registration', () => {
    const stored = { value: 0 }
    const view = renderGate(stored, vi.fn(async () => undefined))
    const dialog = view.querySelector<HTMLElement>('[role="dialog"]')!
    const update = view.querySelector<HTMLButtonElement>('button')!

    expect(isOverlayOpen()).toBe(true)
    expect(view.querySelector('[aria-label="Close"]')).toBeNull()
    expect(document.activeElement).toBe(update)

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(view.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.activeElement).toBe(update)

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    update.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(update)
  })
})
