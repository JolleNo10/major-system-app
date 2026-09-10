// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import type { LearningPracticeProgress } from '@/features/world-countries/learning/learningPracticeProgress'
import type { LearningStagePresentation } from '@/features/world-countries/learning/stagedLearningPlan'
import type { StagedCountryLearningPhase } from '@/features/world-countries/learning/stagedCountryLearningFlow'
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

const defaultStagePresentation: LearningStagePresentation = {
  kind: 'set',
  scopeIds: entries.map(entry => entry.id),
  setNumber: 1,
  setCount: 1,
  previousSetIds: [],
  currentSetIds: entries.map(entry => entry.id),
  upcomingSetIds: [],
}
const secondSetPresentation: LearningStagePresentation = {
  kind: 'set',
  scopeIds: [entries[1]!.id],
  setNumber: 2,
  setCount: 2,
  previousSetIds: [entries[0]!.id],
  currentSetIds: [entries[1]!.id],
  upcomingSetIds: [],
}
const combinedStagePresentation: LearningStagePresentation = {
  kind: 'combined',
  scopeIds: [entries[0]!.id],
  setNumber: null,
  setCount: 2,
  previousSetIds: [],
  currentSetIds: [],
  upcomingSetIds: [],
}
const finalStagePresentation: LearningStagePresentation = {
  kind: 'final',
  scopeIds: entries.map(entry => entry.id),
  setNumber: null,
  setCount: 2,
  previousSetIds: [],
  currentSetIds: [],
  upcomingSetIds: [],
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  useRailsMock.mockReset()
})

function renderRails(phase: StagedCountryLearningPhase = 'walkthrough', track: 'countries' | 'capitals' = 'countries', walkthroughCountryId?: string, practiceProgress?: LearningPracticeProgress, onBack?: () => void, stagePresentation: LearningStagePresentation = defaultStagePresentation, scopeLabel = 'Northern Europe', temporaryScope = false) {
  const mount = document.createElement('div')
  document.body.append(mount)
  const onOrderDraftChanged = vi.fn()
  act(() => {
    root = createRoot(mount)
    root.render(createElement(GuidedLearningRails, {
      continent: 'Europe',
      subregion: temporaryScope ? undefined : 'northern-europe',
      scopeLabel,
      entries,
      activeCountries: entries,
      stagePresentation,
      phase,
      track,
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
    expect(mount.textContent).not.toContain('Learning progress')
    expect(mount.textContent).toContain('Meet the countries')
    expect(mount.textContent).toContain('Learning order')
    expect(mount.querySelector('[data-learning-stage-label]')?.textContent).toBe('2 countries')
    expect(mount.textContent).not.toContain('Learning set')
    expect(mount.textContent).not.toContain('Learning Readiness')
    expect(mount.querySelector('.rounded-xl.border.border-zinc-800.bg-zinc-900')).not.toBeNull()

    act(() => root?.render(createElement('div', null, config.right)))
    expect(mount.textContent).toContain('Edit mnemonics')
  })

  it('emphasizes the current Set while keeping the full learning order visible', () => {
    const { mount, config } = renderRails('walkthrough', 'countries', undefined, undefined, undefined, {
      ...defaultStagePresentation,
      scopeIds: [entries[0]!.id],
      setNumber: 1,
      setCount: 2,
      currentSetIds: [entries[0]!.id],
      upcomingSetIds: [entries[1]!.id],
    })
    act(() => root?.render(createElement('div', null, config.left)))

    expect(mount.querySelectorAll('[data-learning-order-entry]').length).toBe(2)
    expect(mount.querySelectorAll('[data-learning-set="current"]').length).toBe(1)
    expect(mount.querySelectorAll('[data-learning-set="upcoming"]').length).toBe(1)
    expect(mount.textContent).toContain('Norway')
    expect(mount.textContent).toContain('Sweden')
    expect(mount.querySelector('[data-learning-current-set]')?.textContent).toBe('Current Set')
  })

  it('distinguishes previous, current, and upcoming Sets without calling previous Countries mastered', () => {
    const { mount, config } = renderRails('walkthrough', 'countries', undefined, undefined, undefined, secondSetPresentation)
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
    const { mount, config, onOrderDraftChanged } = renderRails('location-practice')
    expect(config.left).not.toBeUndefined()
    act(() => root?.render(createElement('div', null, config.left)))
    expect(mount.textContent).not.toContain('Edit order')
    expect(mount.textContent).not.toContain('Edit mnemonics')
    expect(mount.textContent).not.toContain('Learning progress')
    expect(mount.textContent).not.toContain('Learning context')
    expect(onOrderDraftChanged).toHaveBeenCalledWith(null)
  })

  it('keeps Set-ready context compact while retaining truthful Set-local order states', () => {
    const { mount, config } = renderRails('set-ready', 'countries', undefined, undefined, undefined, secondSetPresentation)
    act(() => root?.render(createElement('div', null, config.left)))

    expect(mount.textContent).not.toContain('Learning progress')
    expect(mount.textContent).not.toContain('Countries are next')
    expect(mount.textContent).not.toContain('Learning context')
    expect(mount.querySelector('[data-learning-stage-label]')?.textContent).toBe('Set 2 of 2')
    expect(mount.querySelector('[data-learning-stage-scope]')?.textContent).toBe('1 of 2 Countries in this Set')
    expect(mount.querySelectorAll('[data-learning-set="previous"]')).toHaveLength(1)
    expect(mount.querySelectorAll('[data-learning-set="current"]')).toHaveLength(1)
    expect(mount.querySelector('[data-learning-current-set]')?.textContent).toBe('Current Set')
  })

  it('clears every transient authoring channel when walkthrough ends', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onOrderDraftChanged = vi.fn()
    const onCountryHover = vi.fn()
    const onOrderEditingChange = vi.fn()
    const onClickOrderStateChange = vi.fn()
    const onClickOrderToggle = vi.fn()
    const baseProps = {
      continent: 'Europe' as const,
      subregion: 'northern-europe' as const,
      entries,
      activeCountries: entries,
      stagePresentation: defaultStagePresentation,
      track: 'countries' as const,
      onOrderDraftChanged,
      onCountryHover,
      onOrderEditingChange,
      onClickOrderStateChange,
      onClickOrderToggle,
    }
    act(() => {
      root = createRoot(mount)
      root.render(createElement(GuidedLearningRails, { ...baseProps, phase: 'walkthrough' }))
    })

    act(() => root?.render(createElement(GuidedLearningRails, { ...baseProps, phase: 'location-practice' })))

    expect(onOrderDraftChanged).toHaveBeenLastCalledWith(null)
    expect(onCountryHover).toHaveBeenLastCalledWith(null)
    expect(onOrderEditingChange).toHaveBeenLastCalledWith(false)
    expect(onClickOrderStateChange).toHaveBeenLastCalledWith({ active: false, positions: expect.any(Map) })
    expect(onClickOrderToggle).toHaveBeenLastCalledWith(null)
    expect(useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0].left).not.toBeUndefined()
  })

  it('shows cumulative introduced scope without a current Set during Combined practice', () => {
    const { mount, config } = renderRails('combined-practice', 'countries', undefined, undefined, undefined, combinedStagePresentation)
    act(() => root?.render(createElement('div', null, config.left)))

    expect(mount.textContent).not.toContain('Learning progress')
    expect(mount.textContent).not.toContain('Countries are next')
    expect(mount.textContent).not.toContain('Learning context')
    expect(mount.querySelector('[data-learning-stage]')?.getAttribute('data-learning-stage')).toBe('combined')
    expect(mount.querySelector('[data-learning-stage-label]')?.textContent).toBe("Mix what you've learned")
    expect(mount.querySelector('[data-learning-stage-scope]')?.textContent).toBe('1 of 2 Countries introduced')
    expect(mount.querySelectorAll('[data-learning-set="introduced"]')).toHaveLength(1)
    expect(mount.querySelectorAll('[data-learning-set="upcoming"]')).toHaveLength(1)
    expect(mount.querySelector('[data-learning-current-set]')).toBeNull()
    expect(mount.textContent).not.toContain('Current Set')
  })

  it('shows the full scope without Set distinctions during Final recall', () => {
    const { mount, config } = renderRails('final-recall', 'capitals', undefined, undefined, undefined, finalStagePresentation)
    act(() => root?.render(createElement('div', null, config.left)))

    expect(mount.textContent).not.toContain('Learning progress')
    expect(mount.textContent).not.toContain('Countries are next')
    expect(mount.textContent).not.toContain('Learning context')
    expect(mount.querySelector('[data-learning-stage]')?.getAttribute('data-learning-stage')).toBe('final')
    expect(mount.querySelector('[data-learning-stage-label]')?.textContent).toBe('Final recall')
    expect(mount.querySelector('[data-learning-stage-scope]')?.textContent).toBe('All 2 Countries')
    expect(mount.querySelectorAll('[data-learning-set="active-scope"]')).toHaveLength(2)
    expect(mount.querySelector('[data-learning-current-set]')).toBeNull()
    expect(mount.querySelector('[data-learning-previous-set]')).toBeNull()
    expect(mount.textContent).not.toContain('Upcoming')
  })

  it('shows the same full compact scope at the Final recall gate', () => {
    const { mount, config } = renderRails('final-gate', 'countries', undefined, undefined, undefined, finalStagePresentation)
    act(() => root?.render(createElement('div', null, config.left)))

    expect(mount.textContent).not.toContain('Learning progress')
    expect(mount.textContent).not.toContain('Countries learned')
    expect(mount.querySelector('[data-learning-stage-label]')?.textContent).toBe('Final recall')
    expect(mount.querySelector('[data-learning-stage-scope]')?.textContent).toBe('All 2 Countries')
    expect(mount.querySelectorAll('[data-learning-set="active-scope"]')).toHaveLength(2)
  })

  it('keeps every non-walkthrough rail read-only', () => {
    const phases: StagedCountryLearningPhase[] = [
      'location-practice',
      'location-ready',
      'practice',
      'set-ready',
      'combined-practice',
      'combined-ready',
      'final-gate',
      'final-recall',
    ]

    for (const phase of phases) {
      const { mount, config } = renderRails(phase)
      act(() => root?.render(createElement('div', null, config.left, config.right)))
      expect(mount.textContent).not.toContain('Edit order')
      expect(mount.textContent).not.toContain('Edit mnemonics')
      act(() => root?.unmount())
      root = null
      mount.remove()
      useRailsMock.mockReset()
    }
  })

  it('keeps temporary proficiency context compact and non-milestone', () => {
    const { mount, config } = renderRails('practice', 'countries', undefined, undefined, undefined, defaultStagePresentation, 'Weak Countries', true)
    act(() => root?.render(createElement('div', null, config.left)))

    expect(mount.textContent).toContain('Weak Countries')
    expect(mount.textContent).toContain('Temporary proficiency scope. Completing this run does not change your guided journey.')
    expect(mount.textContent).not.toContain('Learning progress')
    expect(mount.textContent).not.toContain('Countries are next')
    expect(mount.textContent).not.toContain('Learning context')
    expect(mount.textContent).not.toContain('Northern Europe')
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
        phase: 'location-practice', track: 'countries', stagePresentation: defaultStagePresentation,
        onOrderDraftChanged, onBack, backLabel: 'Back to Meet countries', onSkip, skipLabel: 'Next: Practice', onExit,
      }))
    })

    const latestConfig = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0]
    act(() => root?.render(createElement('div', null, latestConfig?.right)))
    expect([...mount.querySelectorAll('button')].map(button => button.textContent)).toEqual([
      'Back to Meet countries', 'Next: Practice', 'Exit',
    ])
  })

  it('keeps scheduler progress in the center task surface rather than the Learning rail', () => {
    const onBack = vi.fn()
    const { mount, config } = renderRails('location-practice', 'countries', undefined, { pct: 2 / 3, atTarget: 4, total: 6 }, onBack)

    act(() => root?.render(createElement('div', null, config.right)))

    const actionsHeading = mount.querySelector('#guided-learning-actions-heading')

    expect(mount.querySelector('#scheduler-practice-progress-heading')).toBeNull()
    expect(actionsHeading).not.toBeNull()
  })
})
