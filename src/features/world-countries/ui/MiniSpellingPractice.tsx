import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Overlay } from '@/app/layout/Overlay'

interface Props {
  answer: string
  answerKind: 'country' | 'capital'
  onClose: () => void
  onComplete: () => void
}

interface FuzzySpellingPracticeControlsProps {
  answer: string
  answerKind: 'country' | 'capital'
  onContinue: () => void
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

  return createPortal(
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
            data-mini-spelling-action="check"
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
          data-mini-spelling-action="return"
          className="text-sm font-medium text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
        >
          Return to drill
        </button>
      </div>
    </Overlay>,
    document.body,
  )
}

/** Actions and temporary popup state shared by fuzzy-accepted country and capital recall. */
export function FuzzySpellingPracticeControls({ answer, answerKind, onContinue }: FuzzySpellingPracticeControlsProps) {
  const [showMiniPractice, setShowMiniPractice] = useState(false)

  return (
    <>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => setShowMiniPractice(true)}
          data-fuzzy-spelling-action="practice"
          className="rounded-lg border border-cyan-500/60 px-4 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/10"
        >
          Mini practise spelling
        </button>
        <button
          type="button"
          onClick={onContinue}
          data-fuzzy-spelling-action="continue"
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-600"
        >
          Continue
        </button>
      </div>
      {showMiniPractice && (
        <MiniSpellingPractice
          answer={answer}
          answerKind={answerKind}
          onClose={() => setShowMiniPractice(false)}
          onComplete={() => setShowMiniPractice(false)}
        />
      )}
    </>
  )
}
