import { useLayoutEffect, useRef, useState } from 'react'

interface MiniSpellingPracticeProps {
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

/** A local, non-recording spelling repetition for a fuzzy-accepted answer. */
export function MiniSpellingPractice({ answer, answerKind, onClose, onComplete }: MiniSpellingPracticeProps) {
  const [value, setValue] = useState('')
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [complete, setComplete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (!complete) inputRef.current?.focus()
  }, [complete, correctCount, feedback])

  const submit = () => {
    if (!value.trim() || complete) return

    if (normalizeSpelling(value) !== normalizeSpelling(answer)) {
      setCorrectCount(0)
      setFeedback('Not quite. Try again from memory.')
      setValue('')
      return
    }

    if (correctCount === 1) {
      setComplete(true)
      setFeedback('Two correct spellings in a row.')
      onComplete()
      return
    }

    setCorrectCount(1)
    setFeedback('Correct. Spell it once more.')
    setValue('')
  }

  return (
    <div id="world-countries-mini-spelling-practice" data-mini-spelling-practice className="mt-3 border-t border-white/[0.09] pt-3 text-left animate-fade-in">
      {complete ? (
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-amber-100">Spelling practice complete.</p>
          <p className="text-xs text-zinc-300">Continue when you are ready.</p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-zinc-300">Type the canonical spelling from memory. Get it right twice in a row.</p>
          <form
            onSubmit={event => {
              event.preventDefault()
              submit()
            }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={event => setValue(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-label={`Spell the ${answerKind}`}
                className="min-w-0 flex-1 rounded-[10px] border border-amber-300/20 bg-black/20 px-3 py-2.5 text-center text-base font-medium text-amber-50 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/30"
              />
              <button
                type="submit"
                data-mini-spelling-action="check"
                disabled={!value.trim()}
                className="rounded-[10px] border border-amber-300/20 bg-amber-400/[0.08] px-3 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-400/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check
              </button>
            </div>
          </form>
          <p aria-live="polite" className="mt-2 min-h-5 text-xs text-amber-100/90">
            {feedback ? `${feedback} ${correctCount} / 2 correct` : `${correctCount} / 2 correct`}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            {showAnswer ? (
              <p className="rounded-lg border border-amber-300/25 bg-amber-400/[0.08] px-3 py-2 text-center text-base font-bold text-amber-100">{answer}</p>
            ) : (
              <button
                type="button"
                onClick={() => setShowAnswer(true)}
                aria-controls="world-countries-mini-spelling-practice"
                className="text-xs font-medium text-amber-200 underline-offset-4 hover:text-amber-100 hover:underline"
              >
                Reveal spelling
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              data-mini-spelling-action="return"
              className="text-xs font-medium text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
            >
              Back to choices
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Actions and temporary inline practice state shared by fuzzy-accepted recall. */
export function FuzzySpellingPracticeControls({ answer, answerKind, onContinue }: FuzzySpellingPracticeControlsProps) {
  const [showMiniPractice, setShowMiniPractice] = useState(false)
  const [practiceComplete, setPracticeComplete] = useState(false)
  const practiceButtonRef = useRef<HTMLButtonElement>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (!showMiniPractice && !practiceComplete) practiceButtonRef.current?.focus()
  }, [showMiniPractice, practiceComplete])

  useLayoutEffect(() => {
    if (practiceComplete) continueButtonRef.current?.focus()
  }, [practiceComplete])

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          ref={practiceButtonRef}
          type="button"
          data-fuzzy-spelling-action="practice"
          aria-controls="world-countries-mini-spelling-practice"
          aria-expanded={showMiniPractice}
          onClick={() => {
            setPracticeComplete(false)
            setShowMiniPractice(true)
          }}
          className="rounded-[11px] border border-amber-300/30 bg-amber-400/15 px-3 py-2.5 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-400/20 focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:ring-offset-2 focus:ring-offset-transparent"
        >
          Mini practise spelling
        </button>
        <button
          ref={continueButtonRef}
          type="button"
          data-fuzzy-spelling-action="continue"
          onClick={onContinue}
          className="rounded-[11px] border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-zinc-300/40 focus:ring-offset-2 focus:ring-offset-transparent"
        >
          Continue
        </button>
      </div>
      {showMiniPractice && (
        <MiniSpellingPractice
          answer={answer}
          answerKind={answerKind}
          onClose={() => {
            setShowMiniPractice(false)
            setPracticeComplete(false)
          }}
          onComplete={() => setPracticeComplete(true)}
        />
      )}
    </>
  )
}
