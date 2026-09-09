// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import type { LearningPracticeProgress } from '@/features/world-countries/learning/learningPracticeProgress'
import { GuidedLearningRails } from './GuidedLearningRails'

const useRailsMock = vi.hoisted(() => vi.fn())
vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))
vi.mock('@/features/world-countries/mnemonics/GeographyMnemonicView', () => ({
  GeographyMnemonicView: ({ headerAction }: { headerAction?: ReactNode }) => headerAction ?? null,
}))
vi.mock('@/features/world-countries/mnemonics/GeographyMnemonicEditor', () => ({
  GeographyMnemonicEditor: ({ headerAction }: { headerAction?: ReactNode }) => headerAction ?? null,
}))
vi.mock('@/features/world-countries/ui/InlineOrderEditor', () => ({
  InlineOrderEditor: ({ clickOrder }: { clickOrder?: boolean }) => createElement('span', { 'data-click-order': clickOrder ? 'enabled' : 'disabled' }, 'Inline order editor'),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const entries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  useRailsMock.mockReset()
})

function renderRails(phase: 'walkthrough' | 'location-practice', track: 'countries' | 'capitals' = 'countries', walkthroughCountryId?: string, practiceProgress?: LearningPracticeProgress, onBack?: () => void, currentSetEntries?: readonly Country[], previousSetEntries?: readonly Country[]) {
  const mount = document.createElement('div')
  document.body.append(mount)
  const onOrderDraftChanged = vi.fn()
  act(() => {
    root = createRoot(mount)
    root.render(createElement(GuidedLearningRails, {
      continent: 'Europe',
      subregion: 'northern-europe',
      entries,
      activeCountries: entries,
      currentSetEntries,
      previousSetEntries,
      phase,
      track,
      countriesEstablished: false,
      capitalsEstablished: false,
      onOrderDraftChanged,
      walkthroughCountryId,
      practiceProgress,
      onBack,
    }))
  })
  return { mount, onOrderDraftChanged, config: useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { left?: ReactNode; right?: ReactNode } }
}

describe('GuidedLearningRails contextual authoring visibility', () => {
  it('shows order and mnemonic actions in a stable Learning rail', () => {
    const { mount, config } = renderRails('walkthrough')
    act(() => root?.render(createElement('div', null, config.left)))
    expect(mount.textContent).toContain('Edit order')
    expect(mount.textContent).not.toContain('Edit mnemonics')
    expect(mount.textContent).toContain('Learning progress')
    expect(mount.textContent).toContain('Countries not established yet')
    expect(mount.textContent).not.toContain('Learning Readiness')
    expect(mount.querySelector('.rounded-xl.border.border-zinc-800.bg-zinc-900')).not.toBeNull()

    act(() => root?.render(createElement('div', null, config.right)))
    expect(mount.textContent).toContain('Edit mnemonics')
  })

  it('emphasizes the current Set while keeping the full learning order visible', () => {
    const { mount, config } = renderRails('walkthrough', 'countries', undefined, undefined, undefined, [entries[0]!])
    act(() => root?.render(createElement('div', null, config.left)))

    expect(mount.querySelectorAll('[data-learning-order-entry]').length).toBe(2)
    expect(mount.querySelectorAll('[data-learning-set="current"]').length).toBe(1)
    expect(mount.querySelectorAll('[data-learning-set="upcoming"]').length).toBe(1)
    expect(mount.textContent).toContain('Norway')
    expect(mount.textContent).toContain('Sweden')
    expect(mount.querySelector('[data-learning-current-set]')?.textContent).toBe('Current Set')
  })

  it('distinguishes previous, current, and upcoming Sets without calling previous Countries mastered', () => {
    const { mount, config } = renderRails('walkthrough', 'countries', undefined, undefined, undefined, [entries[1]!], [entries[0]!])
    act(() => root?.render(createElement('div', null, config.left)))

    expect(mount.querySelectorAll('[data-learning-set="previous"]').length).toBe(1)
    expect(mount.querySelectorAll('[data-learning-set="current"]').length).toBe(1)
    expect(mount.querySelectorAll('[data-learning-set="upcoming"]').length).toBe(0)
    expect(mount.querySelector('[data-learning-previous-set]')?.getAttribute('aria-label')).toContain('Completed earlier')
    expect(mount.textContent).not.toContain('Mastered')
  })

  it('opts only the Learning Country editor into click-sequence authoring', () => {
    const { config } = renderRails('walkthrough')
    const previewMount = document.createElement('div')
    document.body.append(previewMount)
    const previewRoot = createRoot(previewMount)
    act(() => previewRoot.render(createElement('div', null, config.left)))
    act(() => [...previewMount.querySelectorAll('button')].find(button => button.textContent === 'Edit order')?.click())

    const editingConfig = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { left?: ReactNode }
    act(() => previewRoot.render(createElement('div', null, editingConfig.left)))

    expect(previewMount.querySelector('[data-click-order="enabled"]')).not.toBeNull()
    act(() => previewRoot.unmount())
  })

  it('shows separate mnemonic actions for the Subregion and Country–Capital panels', () => {
    const { mount, config } = renderRails('walkthrough', 'capitals', 'NO')
    act(() => root?.render(createElement('div', null, config.right)))
    expect([...mount.querySelectorAll('button')].map(button => button.textContent)).toEqual([
      'Edit mnemonics',
      'Edit mnemonics',
    ])
  })

  it('hides authoring and discards any draft during active location recall', () => {
    const { config, onOrderDraftChanged } = renderRails('location-practice')
    expect(config.left).toBeUndefined()
    expect(onOrderDraftChanged).toHaveBeenCalledWith(null)
  })

  it('keeps quiet-phase workflow actions in the right rail in Back, Skip, Exit order', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onOrderDraftChanged = vi.fn()
    const onBack = vi.fn()
    const onSkip = vi.fn()
    const onExit = vi.fn()
    act(() => {
      root = createRoot(mount)
      root.render(createElement(GuidedLearningRails, {
        continent: 'Europe', subregion: 'northern-europe', entries, activeCountries: entries,
        phase: 'location-practice', track: 'countries', countriesEstablished: false, capitalsEstablished: false,
        onOrderDraftChanged, onBack, backLabel: 'Back to Meet countries', onSkip, skipLabel: 'Next: Practice', onExit,
      }))
    })

    const latestConfig = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0]
    act(() => root?.render(createElement('div', null, latestConfig?.right)))
    expect([...mount.querySelectorAll('button')].map(button => button.textContent)).toEqual([
      'Back to Meet countries', 'Next: Practice', 'Exit',
    ])
  })

  it('places Practice progress before existing Learning actions', () => {
    const onBack = vi.fn()
    const { mount, config } = renderRails('location-practice', 'countries', undefined, { pct: 2 / 3, atTarget: 4, total: 6 }, onBack)

    act(() => root?.render(createElement('div', null, config.right)))

    const progressHeading = mount.querySelector('#scheduler-practice-progress-heading')
    const actionsHeading = mount.querySelector('#guided-learning-actions-heading')

    expect(progressHeading).not.toBeNull()
    expect(actionsHeading).not.toBeNull()
    expect(progressHeading!.compareDocumentPosition(actionsHeading!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })
})
