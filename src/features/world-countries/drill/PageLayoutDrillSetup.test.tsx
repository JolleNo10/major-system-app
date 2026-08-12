// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { WorldCountries } from '../WorldCountries'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
afterEach(() => { act(() => root?.unmount()); root = null; document.body.replaceChildren(); localStorage.clear(); vi.unstubAllGlobals() })

async function renderShell() {
  const mount = document.createElement('div'); document.body.append(mount)
  await act(async () => {
    root = createRoot(mount)
    root.render(createElement(
      SettingsProvider,
      null,
      createElement(
        PageLayoutProvider,
        null,
        createElement(PageLayout, null, createElement(WorldCountries, { answerMode: 'typing' })),
      ),
    ))
    await Promise.resolve()
    await Promise.resolve()
  })
  return mount
}

describe('World Countries activity boundary', () => {
  it('defaults to Drill and keeps Recite separate from Due review', async () => {
    const mount = await renderShell()
    expect([...mount.querySelectorAll('[role="tab"]')].map(tab => tab.textContent)).toEqual(['Drill', 'Recite'])
    expect(mount.textContent).toContain('World Countries')
    expect(mount.textContent).toContain('Geography')
    expect(mount.textContent).toContain('Purpose')
    expect((mount.querySelector('input[value="drill"]') as HTMLInputElement | null)?.checked).toBe(false)
    expect((mount.querySelector('input[value="learn-practise"]') as HTMLInputElement | null)?.checked).toBe(false)
    expect(mount.textContent).not.toContain('Start Drill')
  })

  it('allows the Drill setup to switch between four Learn & Practise modes', async () => {
    const mount = await renderShell()
    const europe = [...mount.querySelectorAll('button')].find(button => button.textContent?.includes('Europe'))
    await act(async () => europe?.click())
    const learnPractice = [...mount.querySelectorAll('input[type="radio"]')].find(input => (input as HTMLInputElement).value === 'learn-practise') as HTMLInputElement | undefined
    await act(async () => learnPractice?.click())
    expect(mount.textContent).toContain('Learn Countries')
    expect(mount.textContent).toContain('Learn Capitals')
    expect(mount.textContent).toContain('Locate Countries')
    expect(mount.textContent).toContain('Capitals')
  })
})
