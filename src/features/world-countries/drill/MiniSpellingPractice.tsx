import { useEffect, useRef, useState } from 'react'
import { Overlay } from '@/app/layout/Overlay'

interface Props {
  answer: string
  answerKind: 'country' | 'capital'
  onClose: () => void
  onComplete: () => void
}

function normalizeSpelling(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .toLocaleLowerCase()
}

/** A local, non-recording spelling repetition for a fuzzy-accepted Drill answer. */
export function MiniSpellingPractice({ answer, answerKind, onClose, onComplete }: Props) {
  const [value, setValue] = useState('')
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [correctCount, feedback])

  const submit = () => {
    if (!value.trim()) return

    if (normalizeSpelling(value) !== normalizeSpelling(answer)) {
      setCorrectCount(0)
      setFeedback('Not quite. Try again from memory.')
      setValue('')
      return
    }

    if (correctCount === 1) {
      onComplete()
      return
    }

    setCorrectCount(1)
    setFeedback('Correct. Spell it once more.')
    setValue('')
  }

  return (
    <Overlay
      onClose={onClose}
      ariaLabel="Mini spelling practice"
      header={<span className="font-bold text-zinc-100">Mini practise</span>}
      maxWidth="max-w-md"
    >
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Spell the {answerKind}</p>
          <h2 className="text-2xl font-black text-zinc-100">From memory</h2>
          <p className="text-sm text-zinc-400">Get it right twice in a row.</p>
          <div id="mini-spelling-answer">
            {showAnswer ? (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-lg font-bold text-amber-200">
                {answer}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowAnswer(true)}
                aria-controls="mini-spelling-answer"
                className="text-sm font-medium text-amber-300 underline-offset-4 hover:text-amber-200 hover:underline"
              >
                Reveal spelling
              </button>
            )}
          </div>
        </div>

        <form
          className="space-y-3"
          onSubmit={event => {
            event.preventDefault()
            submit()
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={event => setValue(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-label={`Spell the ${answerKind}`}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-center text-lg font-medium text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Check spelling
          </button>
        </form>

        <p aria-live="polite" className="min-h-6 text-sm text-zinc-300">
          {feedback ? `${feedback} ${correctCount} / 2 correct` : `${correctCount} / 2 correct`}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
        >
          Return to drill
        </button>
      </div>
    </Overlay>
  )
}
