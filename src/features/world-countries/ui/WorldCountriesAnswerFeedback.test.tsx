// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { WorldCountriesTypedAnswerResult } from './WorldCountriesTypedAnswer'
import { WorldCountriesAnswerFeedback } from './WorldCountriesAnswerFeedback'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('WorldCountriesAnswerFeedback layout', () => {
  it('uses the full padded overlay height while retaining emergency scrolling', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const result: WorldCountriesTypedAnswerResult = {
      outcome: 'fuzzy',
      canonicalAnswer: 'Norway',
      answerKind: 'country',
      message: 'Correct. The canonical answer is Norway.',
      submittedAnswer: 'Norawy',
      promptKey: 'NO-country',
      latencyMs: 100,
    }

    act(() => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesAnswerFeedback, { result, onContinue: () => undefined }))
    })

    const shell = mount.querySelector<HTMLElement>('[data-world-answer-feedback]')
    expect(shell?.className).toContain('max-h-full')
    expect(shell?.className).toContain('overflow-y-auto')
    expect(shell?.className).not.toContain('max-h-[calc(100%_-_2.5rem)]')
    expect(mount.querySelector('[data-fuzzy-answer-comparison]')).not.toBeNull()
  })
})
