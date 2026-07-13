import { useEffect, useState, useCallback } from 'react'
import { safeSet } from '../utils/storage'
import { isOverlayOpen } from '../utils/overlayGuard'

const HIDE_KEY = 'major-hide-options'

function useHideOptions() {
  const [hide, setHide] = useState(() => {
    try { return localStorage.getItem(HIDE_KEY) === 'true' } catch { return false }
  })
  const toggle = useCallback(() => {
    setHide(h => {
      const next = !h
      safeSet(HIDE_KEY, String(next))
      return next
    })
  }, [])
  return { hide, toggle }
}

interface Props {
  options: string[]
  correctAnswer: string
  onAnswer: (answer: string) => void
  answered: string | null
}

export function MultipleChoice({ options, correctAnswer, onAnswer, answered }: Props) {
  const { hide, toggle } = useHideOptions()
  const [revealed, setRevealed] = useState(() => !hide)

  // Reset per question (when answered goes back to null) and when hide changes
  useEffect(() => {
    if (answered === null) setRevealed(!hide)
  }, [answered, hide])

  // Keyboard: 1–3 to answer, Space/Enter to reveal
  useEffect(() => {
    if (answered !== null) return
    const handler = (e: KeyboardEvent) => {
      if (isOverlayOpen()) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
        return
      }
      if (revealed) {
        const idx = parseInt(e.key) - 1
        if (idx >= 0 && idx < options.length) onAnswer(options[idx])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [answered, revealed, options, onAnswer])

  return (
    <div className="flex flex-col gap-3 w-full">
      {!revealed ? (
        <>
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-10 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 hover:border-violet-500 hover:bg-zinc-800 transition-all text-zinc-400 hover:text-zinc-100 text-sm font-medium flex flex-col items-center gap-2"
          >
            <span className="text-2xl">👁</span>
            <span>Press to show options</span>
            <span className="text-xs text-zinc-600">or press Space / Enter</span>
          </button>
          <button
            onClick={toggle}
            className="self-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
          >
            Always show options
          </button>
        </>
      ) : (
        <>
          {options.map((option, i) => {
            const isCorrect = option === correctAnswer
            const isChosen = option === answered
            const isWrongChosen = isChosen && !isCorrect
            const showCorrect = answered !== null && isCorrect

            let cls =
              'flex items-center gap-4 px-5 py-4 rounded-xl border text-lg font-medium transition-all duration-200 text-left w-full '

            if (answered === null) {
              cls += 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-violet-500 cursor-pointer text-zinc-100'
            } else if (showCorrect) {
              cls += 'bg-green-500/20 border-green-500 text-green-300'
            } else if (isWrongChosen) {
              cls += 'bg-red-500/20 border-red-500 text-red-300 animate-shake'
            } else {
              cls += 'bg-zinc-800/40 border-zinc-800 text-zinc-600 cursor-not-allowed'
            }

            return (
              <button
                key={`${option}-${i}`}
                className={cls}
                onClick={() => answered === null && onAnswer(option)}
                disabled={answered !== null}
              >
                <span className="shrink-0 w-6 h-6 rounded-md bg-zinc-700 text-zinc-400 text-xs font-mono flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1">{option}</span>
                {showCorrect && <span className="text-green-400 text-xl">✓</span>}
                {isWrongChosen && <span className="text-red-400 text-xl">✗</span>}
              </button>
            )
          })}
          {answered === null && (
            <button
              onClick={toggle}
              className="self-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
            >
              {hide ? 'Always show options' : 'Hide options to think'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
