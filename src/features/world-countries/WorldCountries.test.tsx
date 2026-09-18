// @vitest-environment jsdom

import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { WorldCountries } from './WorldCountries'

const migrateWorldCountriesAttemptTypesMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock('./learning/attemptTypeMigration', () => ({
  migrateWorldCountriesAttemptTypes: migrateWorldCountriesAttemptTypesMock,
}))

vi.mock('./drill/WorldCountriesDrill', () => ({
  WorldCountriesDrill: ({ onExit, initialActivity, initialScope }: { onExit?: () => void; initialActivity?: { kind: string; mode?: string }; initialScope?: { kind: string; subregionId?: string } }) => createElement('div', { 'data-testid': 'drill-workflow' }, createElement('button', { type: 'button', onClick: onExit }, 'Exit Drill'), ['Drill workflow', initialActivity?.kind ?? 'drill', initialActivity?.mode, initialScope?.kind, initialScope?.subregionId].filter(Boolean).join(' ')),
}))

vi.mock('./recite/WorldCountriesRecite', () => ({
  WorldCountriesRecite: ({ onExit }: { onExit?: () => void }) => createElement('div', { 'data-testid': 'recite-workflow' }, createElement('button', { type: 'button', onClick: onExit }, 'Exit Recite'), 'Recite workflow'),
}))

vi.mock('./today/WorldCountriesToday', () => ({
  WorldCountriesToday: (props: { worldJourneyContinent?: 'Europe' | null; onNavigate?: (navigation: { area: 'play' | 'drill'; scope?: { kind: 'world' } | { kind: 'subregion'; subregionId: 'eastern-europe' } }) => void; onSelectContinent?: (continent: 'Europe', worldJourneyContinent: 'Europe' | null) => void; onWorld?: () => void }) => createElement('div', { 'data-testid': 'today-workflow', 'data-world-journey-continent': props.worldJourneyContinent ?? 'none' },
    createElement('button', { type: 'button', onClick: () => props.onSelectContinent?.('Europe', 'Europe') }, 'Open Europe'),
    createElement('button', { type: 'button', onClick: props.onWorld }, 'Back to World'),
    createElement('button', { type: 'button', 'data-testid': 'open-completed-region-drill', onClick: () => props.onNavigate?.({ area: 'drill', scope: { kind: 'subregion', subregionId: 'eastern-europe' } }) }, 'Drill Eastern Europe'),
    createElement('button', { type: 'button', 'data-testid': 'open-completed-world-drill', onClick: () => props.onNavigate?.({ area: 'drill', scope: { kind: 'world' } }) }, 'Drill the world'),
    createElement('button', { type: 'button', 'data-testid': 'open-today-playground', onClick: () => props.onNavigate?.({ area: 'play' }) }, 'Playground from Today'),
    'Guided home',
  ),
}))

vi.mock('./practice/WorldCountriesQuiz', () => ({
  WorldCountriesQuiz: ({ onExit }: { onExit?: () => void }) => {
    const [label, setLabel] = useState('Quiz initial state')
    return createElement('div', { 'data-testid': 'quiz-workflow' },
      createElement('span', { 'data-testid': 'quiz-local-state' }, label),
      createElement('button', { type: 'button', onClick: () => setLabel('Quiz mutated state') }, 'Mutate Quiz'),
      createElement('button', { type: 'button', onClick: onExit }, 'Exit Quiz'),
    )
  },
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

beforeEach(() => {
  migrateWorldCountriesAttemptTypesMock.mockReset()
  migrateWorldCountriesAttemptTypesMock.mockResolvedValue(undefined)
})

async function renderShell() {
  const mount = document.createElement('div')
  document.body.append(mount)

  await act(async () => {
    root = createRoot(mount)
    root.render(createElement(SettingsProvider, null,
      createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(WorldCountries, { answerMode: 'typing' }),
        ),
      ),
    ))
    await Promise.resolve()
  })

  return mount
}

describe('World Countries guided shell', () => {
  it('keeps status-dependent workflows hidden while provenance migration is pending', async () => {
    let resolveMigration!: () => void
    migrateWorldCountriesAttemptTypesMock.mockReturnValueOnce(new Promise<void>(resolve => {
      resolveMigration = resolve
    }))

    const mount = await renderShell()

    expect(mount.querySelector('[role="status"]')?.textContent).toBe('Loading World Countries progress…')
    expect(mount.querySelector('[data-testid="today-workflow"]')).toBeNull()
    expect(mount.querySelector('[data-testid="drill-workflow"]')).toBeNull()
    expect(mount.querySelector('[data-testid="recite-workflow"]')).toBeNull()
    expect(mount.querySelector('[data-testid="quiz-workflow"]')).toBeNull()

    await act(async () => {
      resolveMigration()
      await Promise.resolve()
    })
  })

  it('mounts World Countries workflows only after migration succeeds', async () => {
    let resolveMigration!: () => void
    const migration = new Promise<void>(resolve => {
      resolveMigration = resolve
    })
    migrateWorldCountriesAttemptTypesMock.mockReturnValueOnce(migration)

    const mount = await renderShell()

    expect(mount.querySelector('[data-testid="today-workflow"]')).toBeNull()
    expect(migrateWorldCountriesAttemptTypesMock).toHaveBeenCalledWith(expect.objectContaining({
      activeCountries: expect.arrayContaining([expect.objectContaining({ id: 'NO' })]),
    }))

    await act(async () => {
      resolveMigration()
      await migration
    })

    expect(mount.querySelector('[role="status"]')).toBeNull()
    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()
  })

  it('keeps status-dependent workflows hidden when provenance migration fails', async () => {
    let rejectMigration!: (reason?: unknown) => void
    const migration = new Promise<void>((_resolve, reject) => {
      rejectMigration = reject
    })
    migrateWorldCountriesAttemptTypesMock.mockReturnValueOnce(migration)

    const mount = await renderShell()

    await act(async () => {
      rejectMigration(new Error('migration failed'))
      await Promise.resolve()
    })

    expect(mount.querySelector('[role="alert"]')?.textContent).toBe('World Countries progress could not be loaded.')
    expect(mount.querySelector('[data-testid="today-workflow"]')).toBeNull()
    expect(mount.querySelector('[data-testid="drill-workflow"]')).toBeNull()
    expect(mount.querySelector('[data-testid="recite-workflow"]')).toBeNull()
    expect(mount.querySelector('[data-testid="quiz-workflow"]')).toBeNull()
  })

  it('opens on Home without the redundant feature header or Playground shortcut', async () => {
    const mount = await renderShell()

    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()
    expect(mount.querySelector('nav[aria-label="World Countries navigation"]')).toBeNull()
    expect(mount.querySelector('[data-world-countries-playground]')).toBeNull()
  })

  it('reaches the Continent hub from geography without starting a workflow', async () => {
    const mount = await renderShell()

    const openEurope = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Open Europe')
    await act(async () => openEurope?.click())

    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()
    expect(mount.querySelector('nav[aria-label="World Countries navigation"]')).toBeNull()
    expect(mount.querySelector('[data-world-countries-playground]')).toBeNull()
    expect(mount.querySelector('[data-testid="recite-workflow"]')).toBeNull()
    expect(mount.querySelector('[data-world-journey-continent]')?.getAttribute('data-world-journey-continent')).toBe('Europe')
  })

  it('clears the transient World Journey Continent when returning Home', async () => {
    const mount = await renderShell()

    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Open Europe')?.click())
    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Back to World')?.click())

    expect(mount.querySelector('[data-testid="today-workflow"]')?.getAttribute('data-world-journey-continent')).toBe('none')
  })

  it('opens Playground from Continent Today navigation while preserving its originating scope', async () => {
    const mount = await renderShell()

    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Open Europe')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())

    expect(mount.querySelector('[data-world-countries-playground]')?.getAttribute('aria-current')).toBe('page')
    expect(mount.querySelector('#world-countries-play-heading')).not.toBeNull()
    expect(mount.querySelector('nav[aria-label="World Countries hierarchy"]')?.textContent).toMatch(/World\s*\/\s*Europe\s*\/\s*Playground/)
    expect(mount.textContent).toContain('Current guided scopeEurope')
    expect(mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.textContent).toBe('Back to Europe')

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())

    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()
    expect(mount.querySelector('nav[aria-label="World Countries navigation"]')).toBeNull()
    expect(mount.querySelector('[data-world-countries-playground]')).toBeNull()
  })

  it('toggles Playground back to World Home at World scope', async () => {
    const mount = await renderShell()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
    expect(mount.querySelector('#world-countries-play-heading')).not.toBeNull()
    expect(mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.textContent).toBe('Back to World')

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())

    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()
    expect(mount.querySelector('nav[aria-label="World Countries navigation"]')).toBeNull()
    expect(mount.querySelector('[data-world-countries-playground]')).toBeNull()
  })

  it('returns to Playground from an activity launched through Today', async () => {
    const mount = await renderShell()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="recite"]')?.click())
    expect(mount.querySelector('[data-testid="recite-workflow"]')).not.toBeNull()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())

    expect(mount.querySelector('#world-countries-play-heading')).not.toBeNull()
    expect(mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.textContent).toBe('Back to World')
    expect(mount.querySelector('[data-world-countries-playground]')?.getAttribute('aria-current')).toBe('page')
  })

  it('opens Playground from Home and routes its choices to the existing workflow owners', async () => {
    const mount = await renderShell()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())

    expect(mount.querySelector('[data-world-countries-playground]')?.getAttribute('aria-current')).toBe('page')
    expect(mount.querySelector('#world-countries-play-heading')).not.toBeNull()
    expect(mount.textContent).toContain('World Countries · Playground')
    expect(mount.textContent).toContain('Recite')
    expect(mount.textContent).toContain('Quiz')
    expect(mount.textContent).toContain('Custom Drill')
    expect(mount.textContent).toContain('Locate Countries')
    expect(mount.textContent).toContain('Locate Capitals')
    expect(mount.textContent).toContain('Capital Practice')
    const quizCards = mount.querySelectorAll('[data-play-activity="quiz"]')
    expect(quizCards).toHaveLength(1)

    const recite = mount.querySelector<HTMLButtonElement>('[data-play-activity="recite"]')
    await act(async () => recite?.click())
    expect(mount.querySelector('[data-testid="recite-workflow"]')).not.toBeNull()

    await act(async () => mount.querySelector<HTMLButtonElement>('button')?.click())
    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="locate-countries"]')?.click())
    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('practice locate-countries')
  })

  it('routes the Today Playground action through the existing scoped Playground entry', async () => {
    const mount = await renderShell()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
    expect(mount.querySelector('#world-countries-play-heading')).not.toBeNull()
    expect(mount.querySelector('nav[aria-label="World Countries hierarchy"]')?.textContent).toMatch(/World\s*\/\s*Playground/)

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())
    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Open Europe')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
    expect(mount.querySelector('nav[aria-label="World Countries hierarchy"]')?.textContent).toMatch(/World\s*\/\s*Europe\s*\/\s*Playground/)
  })

  it('keeps Quiz transient state local when Playground leaves and re-enters it', async () => {
    const mount = await renderShell()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="quiz"]')?.click())
    expect(mount.querySelector('[data-testid="quiz-local-state"]')?.textContent).toBe('Quiz initial state')

    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Mutate Quiz')?.click())
    expect(mount.querySelector('[data-testid="quiz-local-state"]')?.textContent).toBe('Quiz mutated state')
    await act(async () => mount.querySelector<HTMLButtonElement>('button')?.click())
    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="quiz"]')?.click())
    expect(mount.querySelector('[data-testid="quiz-local-state"]')?.textContent).toBe('Quiz initial state')
  })

  it('routes Locate Capitals and Capital Practice to fixed Practice setup modes', async () => {
    const mount = await renderShell()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="locate-capitals"]')?.click())
    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('practice locate-capitals')

    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Exit Drill')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="capital-practice"]')?.click())
    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('practice capitals')
  })

  it('routes Custom Drill to the recorded Drill owner', async () => {
    const mount = await renderShell()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="custom-drill"]')?.click())

    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('Drill workflow drill')
  })

  it('returns each Playground setup activity to its originating Continent scope', async () => {
    const mount = await renderShell()
    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Open Europe')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())

    for (const activity of ['custom-drill', 'locate-countries', 'locate-capitals', 'capital-practice']) {
      await act(async () => mount.querySelector<HTMLButtonElement>(`[data-play-activity="${activity}"]`)?.click())
      await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Exit Drill')?.click())
      expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()
      expect(mount.querySelector('nav[aria-label="World Countries navigation"]')).toBeNull()
      expect(mount.querySelector('[data-world-countries-playground]')).toBeNull()
      if (activity !== 'capital-practice') {
        await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-today-playground"]')?.click())
        expect(mount.querySelector('nav[aria-label="World Countries hierarchy"]')?.textContent).toMatch(/World\s*\/\s*Europe\s*\/\s*Playground/)
      }
    }
  })

  it('routes a completed-region Drill action to setup with that region selected', async () => {
    const mount = await renderShell()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-completed-region-drill"]')?.click())

    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('Drill workflow drill')
    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('eastern-europe')
  })

  it('routes a completed-World Drill action to setup with the World scope', async () => {
    const mount = await renderShell()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="open-completed-world-drill"]')?.click())

    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('Drill workflow drill world')
    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).not.toContain('eastern-europe')
  })
})
