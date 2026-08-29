// @vitest-environment jsdom

import { act, createElement, Fragment, StrictMode, useMemo, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider, useLayoutHeader } from '@/app/layout/PageLayoutContext'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { WordsProvider } from '@/features/major-system'
import { PiDrill } from './PiDrill'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

beforeEach(() => {
  localStorage.removeItem('major-pi-tab')
  localStorage.removeItem('major-pi-max-pairs')
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('Pi PageLayout integration', () => {
  it('keeps the default Recite rails stable while the layout publishes them', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(StrictMode, null,
        createElement(WordsProvider, null,
          createElement(SettingsProvider, null,
            createElement(PageLayoutProvider, null,
              createElement(PageLayout, null,
                createElement(Fragment, null,
                  createElement(PiDrill, { answerMode: 'typing' }),
                  createElement(LayoutPulse),
                ),
              ),
            ),
          ),
        ),
      ))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('Select segment')

    const pulse = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.startsWith('layout pulse'))
    expect(pulse).not.toBeUndefined()

    await act(async () => {
      pulse?.click()
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('layout pulse 1')
  })

})

function LayoutPulse() {
  const [pulse, setPulse] = useState(0)
  const header = useMemo(() => (
    <button type="button" onClick={() => setPulse(value => value + 1)}>
      layout pulse {pulse}
    </button>
  ), [pulse])
  useLayoutHeader(header)
  return null
}
