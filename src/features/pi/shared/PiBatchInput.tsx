import { useEffect, useMemo, useRef, useState } from 'react'
import {
  isCompleteNumericAnswer,
  isNumericDraft,
  isValidNumericInsertion,
} from '@/core/ui/numericInput'

interface Props {
  expected: string[]
  answeredCorrect: boolean[] | null
  onAnswer: (values: string[]) => void
}

export function PiBatchInput({ expected, answeredCorrect, onAnswer }: Props) {
  const [values, setValues] = useState<string[]>(() => expected.map(() => ''))
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const expectedKey = expected.join('|')

  useEffect(() => {
    setValues(expected.map(() => ''))
    const focusTimer = window.setTimeout(() => inputRefs.current[0]?.focus(), 50)
    return () => window.clearTimeout(focusTimer)
  }, [expectedKey, expected.length])

  const complete = useMemo(
    () => values.length === expected.length && values.every(value => isCompleteNumericAnswer(value, 2)),
    [values, expected.length],
  )

  const submit = () => {
    if (answeredCorrect === null && complete) onAnswer(values)
  }

  return (
    <div className="w-full space-y-3">
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {expected.map((answer, index) => {
          const result = answeredCorrect?.[index]
          const borderCls = result === undefined
            ? 'border-zinc-700 focus-within:border-cyan-500'
            : result
              ? 'border-green-500 bg-green-500/10'
              : 'border-red-500 bg-red-500/10'

          return (
            <div key={index} className="min-w-0 space-y-1">
              <div className={`rounded-lg border overflow-hidden transition-colors ${borderCls}`}>
                <input
                  ref={element => { inputRefs.current[index] = element }}
                  type="text"
                  autoComplete="off"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={values[index] ?? ''}
                  disabled={answeredCorrect !== null}
                  aria-label={`Pair ${index + 1} of ${expected.length}`}
                  onChange={event => {
                    const next = event.target.value
                    if (!isNumericDraft(next, 2) || answeredCorrect !== null) return
                    setValues(current => current.map((value, i) => i === index ? next : value))
                    if (next.length === 2 && index < expected.length - 1) {
                      inputRefs.current[index + 1]?.focus()
                    }
                  }}
                  onPaste={event => {
                    const current = values[index] ?? ''
                    const input = event.currentTarget
                    const valid = isValidNumericInsertion(
                      current,
                      event.clipboardData.getData('text'),
                      input.selectionStart ?? current.length,
                      input.selectionEnd ?? current.length,
                      2,
                    )
                    if (!valid) event.preventDefault()
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Backspace' && !values[index] && index > 0) {
                      inputRefs.current[index - 1]?.focus()
                    }
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      submit()
                    }
                  }}
                  className={`w-full px-1 py-3 bg-zinc-800 outline-none text-center font-mono text-xl font-bold tabular-nums
                    ${result === true ? 'text-green-300' : ''}
                    ${result === false ? 'text-red-300 animate-shake' : ''}
                    ${result === undefined ? 'text-zinc-100' : ''}
                  `}
                />
              </div>
              {result === false && (
                <div className="text-center font-mono text-xs text-green-400 tabular-nums" aria-label={`Correct answer ${answer}`}>
                  {answer}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {answeredCorrect === null && (
        <button
          onClick={submit}
          disabled={!complete}
          className="w-full py-3 rounded-xl bg-zinc-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 hover:text-white transition-colors font-medium"
        >
          Submit {expected.length} pairs ↵
        </button>
      )}
    </div>
  )
}
