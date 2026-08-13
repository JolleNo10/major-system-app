// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { markSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningStore'
import { WorldCountriesDrill } from './WorldCountriesDrill'

const capitalFlowProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))

vi.mock('./DrillSetup', () => ({
  DrillSetup: ({ onLearnPracticeStart }: { onLearnPracticeStart: (mode: string) => void }) => createElement(
    'button',
    { type: 'button', 'data-testid': 'start-capital-learning', onClick: () => onLearnPracticeStart('learn-capitals') },
    'Start capital learning',
  ),
}))

vi.mock('@/features/world-countries/learning/flows/CapitalLearningFlow', () => ({
  CapitalLearningFlow: (props: Record<string, unknown>) => {
    capitalFlowProps.current = props
    return createElement('div', { 'data-testid': 'capital-learning' })
  },
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  capitalFlowProps.current = null
  document.body.replaceChildren()
  localStorage.clear()
})

describe('WorldCountriesDrill learning integration', () => {
  it('passes durable Country readiness into Capital Learning', () => {
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({
      continent: 'Europe', subregionIds: ['northern-europe'], mode: 'countries', order: 'ordered',
    }))
    markSubregionCountriesLearned('northern-europe', 123)

    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'typing' }),
      ))
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="start-capital-learning"]')!.click())

    expect(mount.querySelector('[data-testid="capital-learning"]')).not.toBeNull()
    expect(capitalFlowProps.current?.countriesLearned).toBe(true)
  })
})
