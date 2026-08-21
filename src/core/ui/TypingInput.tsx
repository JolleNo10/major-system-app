import { useRef, useEffect, useState, type FormEvent } from 'react'
import {
  isCompleteNumericAnswer,
  isNumericDraft,
  isValidNumericInsertion,
} from '@/core/ui/numericInput'

interface Props {
  onAnswer: (value: string) => void
  answeredCorrect: boolean | null
  correctAnswer: string
  placeholder?: string
  ariaLabel?: string
  resetKey?: string | number
  numeric?: boolean
  showCorrectAnswer?: boolean
  compact?: boolean
}

export function TypingInput({ onAnswer, answeredCorrect, correctAnswer, placeholder = 'Type the answer...', ariaLabel = placeholder, resetKey, numeric = false, showCorrectAnswer = true, compact = false }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (answeredCorrect !== null) return
    submittedRef.current = false
    setValue('')
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [answeredCorrect, resetKey])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (submittedRef.current) return
    const answer = numeric ? value : value.trim()
    const valid = numeric
      ? isCompleteNumericAnswer(answer, correctAnswer.length)
      : Boolean(answer)
    if (valid && answeredCorrect === null) {
      submittedRef.current = true
      onAnswer(answer)
    }
  }

  const canSubmit = numeric
    ? isCompleteNumericAnswer(value, correctAnswer.length)
    : Boolean(value.trim())

  const borderCls =
    answeredCorrect === null
      ? 'border-zinc-700 focus-within:border-violet-500'
      : answeredCorrect
      ? 'border-green-500 bg-green-500/10'
      : 'border-red-500 bg-red-500/10'

  return (
    <form className="flex w-full flex-col gap-3" onSubmit={submit}>
      <div className={`${compact ? 'flex rounded-[9px] border' : 'flex rounded-xl border'} overflow-hidden transition-all duration-200 ${borderCls}`}>
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          inputMode={numeric ? 'numeric' : 'text'}
          pattern={numeric ? '[0-9]*' : undefined}
          maxLength={numeric ? correctAnswer.length : undefined}
          value={value}
          onChange={e => {
            if (answeredCorrect !== null) return
            if (!numeric || isNumericDraft(e.target.value, correctAnswer.length)) setValue(e.target.value)
          }}
          onPaste={e => {
            if (!numeric) return
            const input = e.currentTarget
            const valid = isValidNumericInsertion(value, e.clipboardData.getData('text'), input.selectionStart ?? value.length, input.selectionEnd ?? value.length, correctAnswer.length)
            if (!valid) e.preventDefault()
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={answeredCorrect !== null}
          className={`${compact ? 'flex-1 bg-zinc-800/95 px-4 py-3 text-base' : 'flex-1 bg-zinc-800 px-5 py-4 text-xl'} outline-none font-medium placeholder-zinc-600
            ${answeredCorrect === true ? 'text-green-300' : ''}
            ${answeredCorrect === false ? 'animate-shake text-red-300' : ''}
            ${answeredCorrect === null ? 'text-zinc-100' : ''}
          `}
        />
        {answeredCorrect === null && (
          <button
            type="submit"
            disabled={!canSubmit}
            className={`${compact ? 'bg-cyan-600 px-3.5 hover:bg-cyan-500' : 'bg-zinc-700 px-5 hover:bg-violet-600'} text-sm font-medium text-zinc-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {compact ? <>Check <span aria-label="Enter" className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-[5px] border border-white/25 border-b-2 px-1.5 py-px text-[11px]">↵</span></> : '↵'}
          </button>
        )}
        {answeredCorrect === true && <div className="flex items-center bg-zinc-800 px-5 text-xl text-green-400">✓</div>}
        {answeredCorrect === false && <div className="flex items-center bg-zinc-800 px-5 text-xl text-red-400">×</div>}
      </div>

      {answeredCorrect === false && showCorrectAnswer && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
          <span className="text-zinc-400">Correct answer: </span>
          <span className="font-bold text-green-300">{correctAnswer}</span>
        </div>
      )}
    </form>
  )
}
