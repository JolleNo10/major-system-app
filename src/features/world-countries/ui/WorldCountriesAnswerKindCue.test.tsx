// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import { getWorldCountriesAnswerKind, WorldCountriesAnswerKindCue } from './WorldCountriesAnswerKindCue'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('World Countries answer-kind cue', () => {
  it.each([
    ['location-to-country', 'country'],
    ['shape-to-country', 'country'],
    ['capital-to-country', 'country'],
    ['country-to-capital', 'capital'],
  ] as const)('maps %s to the %s answer kind', (skill, expected) => {
    expect(getWorldCountriesAnswerKind(skill as WorldCountriesRecallSkill)).toBe(expected)
  })

  it('visibly and accessibly identifies a Country answer', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesAnswerKindCue, { answerKind: 'country' }))
    })

    const cue = mount.querySelector('[data-answer-kind="country"]')!
    expect(cue.textContent).toBe('ANSWER · COUNTRY')
    expect(cue.getAttribute('aria-label')).toBe('Answer type: Country')
    expect(cue.className).toContain('sky')
  })

  it('visibly and accessibly identifies a Capital answer with a distinct variant', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesAnswerKindCue, { answerKind: 'capital' }))
    })

    const cue = mount.querySelector('[data-answer-kind="capital"]')!
    expect(cue.textContent).toBe('ANSWER · CAPITAL')
    expect(cue.getAttribute('aria-label')).toBe('Answer type: Capital')
    expect(cue.className).toContain('violet')
    expect(cue.className).not.toContain('sky')
  })
})
