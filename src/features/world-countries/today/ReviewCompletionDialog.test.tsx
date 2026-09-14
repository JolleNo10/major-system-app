import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReviewCompletionDialog } from './ReviewCompletionDialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

function renderDialog(continueCount?: number) {
  const mount = document.createElement('div')
  document.body.append(mount)
  const onBack = vi.fn()
  const onContinue = continueCount === undefined ? undefined : vi.fn()
  act(() => {
    root = createRoot(mount)
    root.render(createElement(ReviewCompletionDialog, {
      completion: {
        mode: 'review',
        checkpoint: { reviewed: 8, correctFirstTry: 6, recoveredOnRetry: 1, stillNeedsWork: 1 },
      },
      scopeLabel: 'World',
      continueCount,
      onContinue,
      onBack,
    }))
  })
  return { mount, onBack, onContinue }
}

describe('ReviewCompletionDialog', () => {
  it('focuses Continue first when another set is available', () => {
    const { mount } = renderDialog(3)

    expect(document.activeElement).toBe(mount.querySelector('[data-testid="review-completion-continue"]'))
    expect(mount.querySelector('[data-testid="review-completion-continue"]')?.textContent).toContain('3 items')
  })

  it('focuses Back first when there is no continuation', () => {
    const { mount } = renderDialog()

    expect(mount.querySelector('[data-testid="review-completion-continue"]')).toBeNull()
    expect(document.activeElement).toBe(mount.querySelector('[data-testid="review-completion-back"]'))
  })

  it('uses Back for Escape dismissal', async () => {
    const { mount, onBack } = renderDialog(3)
    const dialog = mount.querySelector('[role="dialog"]')!

    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
