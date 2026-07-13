import { useEffect, type RefObject } from 'react'
import { pushOverlay, popOverlay } from '../utils/overlayGuard'

const FOCUSABLE = 'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'

// Modal overlay behaviour: register the overlay (so background drills ignore
// keyboard input), move focus inside, trap Tab, close on Escape, and restore
// focus to the trigger on unmount. Attach the returned handlers to a root
// element that has role="dialog" aria-modal="true".
export function useOverlay(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const root = ref.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    pushOverlay()

    const focusable = () =>
      root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => !el.hasAttribute('disabled')) : []

    ;(focusable()[0] ?? root)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const f = focusable()
        if (!f.length) { e.preventDefault(); return }
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    root?.addEventListener('keydown', onKeyDown)
    return () => {
      root?.removeEventListener('keydown', onKeyDown)
      popOverlay()
      previouslyFocused?.focus?.()
    }
  }, [ref, onClose])
}
