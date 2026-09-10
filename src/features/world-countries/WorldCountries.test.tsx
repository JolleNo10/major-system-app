// @vitest-environment jsdom

import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { WorldCountries } from './WorldCountries'

vi.mock('./drill/WorldCountriesDrill', () => ({
  WorldCountriesDrill: ({ onExit, initialPurpose, initialLearnPracticeMode }: { onExit?: () => void; initialPurpose?: string; initialLearnPracticeMode?: string }) => createElement('div', { 'data-testid': 'drill-workflow' }, createElement('button', { type: 'button', onClick: onExit }, 'Exit Drill'), `Drill workflow ${initialPurpose ?? 'drill'} ${initialLearnPracticeMode ?? ''}`),
}))

vi.mock('./recite/WorldCountriesRecite', () => ({
  WorldCountriesRecite: ({ onExit }: { onExit?: () => void }) => createElement('div', { 'data-testid': 'recite-workflow' }, createElement('button', { type: 'button', onClick: onExit }, 'Exit Recite'), 'Recite workflow'),
}))

vi.mock('./today/WorldCountriesToday', () => ({
  WorldCountriesToday: (props: { onSelectContinent?: (continent: 'Europe') => void; onWorld?: () => void }) => createElement('div', { 'data-testid': 'today-workflow' },
    createElement('button', { type: 'button', onClick: () => props.onSelectContinent?.('Europe') }, 'Open Europe'),
    createElement('button', { type: 'button', onClick: props.onWorld }, 'Back to World'),
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
  it('opens on Home without an equal activity-tab selector', async () => {
    const mount = await renderShell()
    const header = mount.querySelector('nav[aria-label="World Countries navigation"]')

    expect(header?.textContent).toContain('World Countries')
    expect(header?.textContent).toContain('Playground')
    expect(header?.textContent).not.toContain('Home')
    expect(header?.querySelector('[role="tablist"]')).toBeNull()
    expect(header?.querySelector('[data-world-countries-playground]')?.getAttribute('aria-current')).toBeNull()
    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()
  })

  it('reaches the Continent hub from geography without starting a workflow', async () => {
    const mount = await renderShell()

    const openEurope = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Open Europe')
    await act(async () => openEurope?.click())

    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()
    expect(mount.querySelector('nav[aria-label="World Countries navigation"]')?.textContent).toContain('World / Europe')
    expect(mount.querySelector('[data-testid="recite-workflow"]')).toBeNull()
  })

  it('opens Playground from a Continent while preserving its originating scope', async () => {
    const mount = await renderShell()

    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Open Europe')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())

    expect(mount.querySelector('[data-world-countries-playground]')?.getAttribute('aria-current')).toBe('page')
    expect(mount.querySelector('#world-countries-play-heading')).not.toBeNull()
    expect(mount.querySelector('nav[aria-label="World Countries hierarchy"]')?.textContent).toMatch(/World\s*\/\s*Europe\s*\/\s*Playground/)
    expect(mount.textContent).toContain('Current guided scopeEurope')
  })

  it('opens Playground from Home and routes its choices to the existing workflow owners', async () => {
    const mount = await renderShell()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())

    expect(mount.querySelector('[data-world-countries-playground]')?.getAttribute('aria-current')).toBe('page')
    expect(mount.querySelector('#world-countries-play-heading')).not.toBeNull()
    expect(mount.textContent).toContain('World Countries · Playground')
    expect(mount.textContent).toContain('Recite')
    expect(mount.textContent).toContain('Quiz')
    expect(mount.textContent).toContain('Custom Drill')
    expect(mount.textContent).toContain('Locate Countries')
    expect(mount.textContent).toContain('Locate Capitals')
    expect(mount.textContent).toContain('Capital Practice')

    const recite = mount.querySelector<HTMLButtonElement>('[data-play-activity="recite"]')
    await act(async () => recite?.click())
    expect(mount.querySelector('[data-testid="recite-workflow"]')).not.toBeNull()

    await act(async () => mount.querySelector<HTMLButtonElement>('button')?.click())
    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="locate-countries"]')?.click())
    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('learn-practise locate-countries')
  })

  it('keeps Quiz transient state local when Playground leaves and re-enters it', async () => {
    const mount = await renderShell()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="quiz"]')?.click())
    expect(mount.querySelector('[data-testid="quiz-local-state"]')?.textContent).toBe('Quiz initial state')

    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Mutate Quiz')?.click())
    expect(mount.querySelector('[data-testid="quiz-local-state"]')?.textContent).toBe('Quiz mutated state')
    await act(async () => mount.querySelector<HTMLButtonElement>('button')?.click())
    expect(mount.querySelector('[data-testid="today-workflow"]')).not.toBeNull()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="quiz"]')?.click())
    expect(mount.querySelector('[data-testid="quiz-local-state"]')?.textContent).toBe('Quiz initial state')
  })

  it('routes Locate Capitals and Capital Practice to their existing setup modes', async () => {
    const mount = await renderShell()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="locate-capitals"]')?.click())
    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('learn-practise locate-capitals')

    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Exit Drill')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="capital-practice"]')?.click())
    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('learn-practise capitals')
  })

  it('routes Custom Drill to the recorded Drill owner', async () => {
    const mount = await renderShell()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-world-countries-playground]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="custom-drill"]')?.click())

    expect(mount.querySelector('[data-testid="drill-workflow"]')?.textContent).toContain('Drill workflow drill')
  })
})
