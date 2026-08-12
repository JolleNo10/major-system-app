// @vitest-environment jsdom

import { act, createElement, useState, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModeSelector, type HomeSection } from './ModeSelector'
import type { Mode } from '@/core/types'
import App from './App'
import { SettingsProvider } from './settings/SettingsContext'
import { PageLayoutProvider } from './layout/PageLayoutContext'
import { CardWordsProvider } from '@/features/cards'

vi.mock('@/app/settings/usePwaUpdate', () => ({
  usePwaUpdate: () => ({
    needUpdate: false,
    checking: false,
    update: vi.fn(),
    dismiss: vi.fn(),
  }),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

function mount(element: ReactElement) {
  const container = document.createElement('div')
  document.body.append(container)
  act(() => {
    root = createRoot(container)
    root.render(element)
  })
  return container
}

function findButton(label: string) {
  const button = [...document.querySelectorAll('button')]
    .find(candidate => candidate.textContent?.includes(label))
  expect(button).toBeDefined()
  return button as HTMLButtonElement
}

function SelectorHarness({ onSelectMode }: { onSelectMode: (mode: Mode) => void }) {
  const [section, setSection] = useState<HomeSection>(null)
  return createElement(ModeSelector, {
    onSelectMode,
    section,
    onSectionChange: setSection,
  })
}

function AppHarness() {
  return createElement(SettingsProvider, null,
    createElement(CardWordsProvider, null,
      createElement(PageLayoutProvider, null,
        createElement(App),
      ),
    ),
  )
}

describe('ModeSelector card application grouping', () => {
  it('shows a Deck of Cards hub instead of its child decks on the front page', () => {
    mount(createElement(SelectorHarness, { onSelectMode: vi.fn() }))

    expect(document.body.textContent).toContain('Deck of Cards')
    expect(document.body.textContent).not.toContain('Themed Deck')
    expect(document.body.textContent).not.toContain('PAO Deck')

    act(() => findButton('Deck of Cards').click())

    expect(document.body.textContent).toContain('Themed Deck')
    expect(document.body.textContent).toContain('PAO Deck')
    expect(document.body.textContent).not.toContain('Choose a card mnemonic system')
  })

  it('returns from the card submenu to Applications', () => {
    mount(createElement(SelectorHarness, { onSelectMode: vi.fn() }))

    act(() => findButton('Deck of Cards').click())
    act(() => findButton('Applications').click())

    expect(document.body.textContent).toContain('Deck of Cards')
    expect(document.body.textContent).not.toContain('Themed Deck')
    expect(document.body.textContent).not.toContain('PAO Deck')
  })

  it('keeps the Deck of Cards submenu when leaving a drill with Back or Escape', async () => {
    mount(createElement(AppHarness))

    act(() => findButton('Deck of Cards').click())
    act(() => findButton('Themed Deck').click())
    expect(document.querySelector('[aria-label="Back"]')).not.toBeNull()

    act(() => document.querySelector<HTMLButtonElement>('[aria-label="Back"]')?.click())
    expect(document.body.textContent).toContain('← Applications')
    expect(document.body.textContent).toContain('PAO Deck')

    act(() => findButton('Themed Deck').click())
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await Promise.resolve()
    })
    expect(document.body.textContent).toContain('← Applications')
    expect(document.body.textContent).toContain('PAO Deck')
  })

  it('selects the existing Themed and PAO mode IDs from the submenu', () => {
    const onSelectMode = vi.fn()
    mount(createElement(ModeSelector, {
      onSelectMode,
      section: 'cards',
      onSectionChange: vi.fn(),
    }))

    act(() => findButton('Themed Deck').click())
    expect(onSelectMode).toHaveBeenLastCalledWith('themed-cards')

    act(() => findButton('PAO Deck').click())
    expect(onSelectMode).toHaveBeenLastCalledWith('pao-cards')
  })
})
