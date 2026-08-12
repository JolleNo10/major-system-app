// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { DrillResultStats } from './DrillResultStats'
import { summarizeDrillAnswers } from './drillResultSummary'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('DrillResultStats', () => {
  it('publishes the same calculated session stats for result surfaces', () => {
    const summary = summarizeDrillAnswers([
      { countryId: 'NO', skill: 'location-to-country', answer: 'Norway', correct: true, at: 1, ms: 100, evidenceKind: 'recall' },
      { countryId: 'SE', skill: 'location-to-country', answer: 'Norway', correct: false, at: 2, ms: 100, evidenceKind: 'recall' },
    ])
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(DrillResultStats, { summary, answerCount: 2, showCountryCount: true }))
    })

    expect(mount.querySelector('[aria-label="Drill summary"]')?.textContent).toContain('1/2')
    expect(mount.textContent).toContain('50%')
    expect(mount.textContent).toContain('2')
  })
})
