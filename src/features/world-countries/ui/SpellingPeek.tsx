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
      className="mt-2 box-border min-h-16 max-h-20 overflow-hidden rounded-lg border border-amber-300/20 bg-white/[0.025] px-3 py-2 text-left transition-colors hover:border-amber-300/35"
    >
      <button
        type="button"
        tabIndex={-1}
        data-mini-spelling-action="peek"
        aria-label={revealed ? 'Release to hide spelling' : 'Temporarily reveal spelling'}
        aria-pressed={revealed}
        onPointerDown={startPointerPeek}
        onPointerUp={endPointerPeek}
        onPointerCancel={endPointerPeek}
        onLostPointerCapture={hide}
        onClick={event => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
        className="block w-full cursor-pointer select-none touch-none rounded-md px-0.5 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40"
      >
        <span className="flex min-h-5 items-center justify-between gap-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-amber-100/90">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5 shrink-0 text-amber-200/75" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" />
              <circle cx="12" cy="12" r="2.25" />
            </svg>
            <span className="truncate">Peek at spelling</span>
          </span>
          <span data-spelling-peek-hint className="shrink-0 text-[11px] font-medium text-zinc-500">
            {revealed ? 'Release to hide' : <>Hold <kbd className="rounded border border-zinc-700/70 bg-zinc-950/45 px-1 py-0.5 font-mono text-[10px] text-zinc-400">{modifierLabel}</kbd> to reveal</>}
          </span>
        </span>
        <span className="mt-0.5 block min-h-6 whitespace-nowrap text-left text-[17px] font-semibold leading-6 text-amber-50">
          <span
            data-spelling-peek-answer
            data-spelling-answer-revealed={revealed ? true : undefined}
            aria-hidden={!revealed}
            className={`inline-block transition-[filter,opacity,color] duration-100 ${revealed ? 'text-amber-50' : 'blur-[3px] text-amber-100/70 opacity-60'}`}
          >
            {answer}
          </span>
        </span>
      </button>
    </div>
  )
}
