import { useCallback, useEffect, useLayoutEffect, useState, type PointerEvent, type RefObject } from 'react'

type PeekModifier = 'Control' | 'Meta'

function isMacOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(`${navigator.platform} ${navigator.userAgent}`)
}

function isModifierHeld(event: KeyboardEvent, modifier: PeekModifier): boolean {
  return modifier === 'Meta' ? event.metaKey : event.ctrlKey
}

function isBareModifier(event: KeyboardEvent, modifier: PeekModifier): boolean {
  if (event.key !== modifier || event.shiftKey || event.altKey) return false
  return modifier === 'Meta' ? !event.ctrlKey : !event.metaKey
}

export function SpellingPeek({ answer, inputRef }: {
  answer: string
  inputRef: RefObject<HTMLInputElement | null>
}) {
  const [revealed, setRevealed] = useState(false)
  const modifier: PeekModifier = isMacOS() ? 'Meta' : 'Control'
  const modifierLabel = modifier === 'Meta' ? '⌘' : 'Ctrl'

  const hide = useCallback(() => setRevealed(false), [])

  useLayoutEffect(() => {
    hide()
  }, [answer, hide])

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement !== input) return

      if (event.key === modifier) {
        if (isBareModifier(event, modifier)) setRevealed(true)
        else hide()
        return
      }

      // A normal shortcut such as Ctrl/Cmd+C or Ctrl/Cmd+V remains native,
      // but no longer counts as a bare modifier peek.
      if (isModifierHeld(event, modifier)) hide()
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === modifier) hide()
    }

    input.addEventListener('keydown', handleKeyDown)
    input.addEventListener('keyup', handleKeyUp)
    input.addEventListener('blur', hide)
    const handleWindowBlur = hide
    const handleVisibilityChange = hide
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      input.removeEventListener('keydown', handleKeyDown)
      input.removeEventListener('keyup', handleKeyUp)
      input.removeEventListener('blur', hide)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [hide, inputRef, modifier])

  const endPointerPeek = (event: PointerEvent<HTMLButtonElement>) => {
    hide()
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {
      // The browser may already have released the capture on cancellation.
    }
  }

  const startPointerPeek = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Pointer capture is not available in some test and embedded contexts.
    }
    setRevealed(true)
  }

  return (
    <div
      data-spelling-peek
      data-spelling-peek-state={revealed ? 'revealed' : 'hidden'}
      className="mt-3 rounded-xl border border-amber-300/25 bg-amber-400/[0.06] p-2.5 text-center shadow-[inset_0_1px_0_rgba(251,191,36,0.06)]"
    >
      <button
        type="button"
        tabIndex={-1}
        data-mini-spelling-action="peek"
        aria-label={revealed ? 'Release to hide spelling' : 'Hold to reveal spelling'}
        aria-pressed={revealed}
        onPointerDown={startPointerPeek}
        onPointerUp={endPointerPeek}
        onPointerCancel={endPointerPeek}
        onLostPointerCapture={hide}
        onClick={event => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
        className="block w-full cursor-pointer select-none touch-none rounded-lg px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
      >
        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-amber-200">Peek at spelling</span>
        <span className="mt-1 block min-h-8 text-base font-semibold leading-8 text-amber-50">
          <span
            data-spelling-peek-answer
            data-spelling-answer-revealed={revealed ? true : undefined}
            aria-hidden={!revealed}
            className={`inline-block transition-[filter,color] duration-100 ${revealed ? 'text-amber-50' : 'blur-sm text-amber-100/80'}`}
          >
            {answer}
          </span>
        </span>
        <span data-spelling-peek-hint className="mt-0.5 block min-h-4 text-[11px] font-medium text-zinc-400">
          {revealed ? 'Release to hide' : `Hold ${modifierLabel} to reveal`}
        </span>
      </button>
    </div>
  )
}
