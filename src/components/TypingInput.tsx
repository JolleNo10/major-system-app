import { useRef, useEffect, useState } from 'react'

interface Props {
  onAnswer: (value: string) => void
  answeredCorrect: boolean | null
  correctAnswer: string
  placeholder?: string
}

export function TypingInput({ onAnswer, answeredCorrect, correctAnswer, placeholder = 'Type the answer...' }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (answeredCorrect === null) {
      setValue('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [answeredCorrect])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed && answeredCorrect === null) onAnswer(trimmed)
  }

  const borderCls =
    answeredCorrect === null
      ? 'border-zinc-700 focus-within:border-violet-500'
      : answeredCorrect
      ? 'border-green-500 bg-green-500/10'
      : 'border-red-500 bg-red-500/10'

  return (
    <div className="w-full flex flex-col gap-3">
      <div className={`flex rounded-xl border transition-all duration-200 overflow-hidden ${borderCls}`}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => answeredCorrect === null && setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={placeholder}
          disabled={answeredCorrect !== null}
          className={`flex-1 px-5 py-4 bg-zinc-800 outline-none text-xl font-medium placeholder-zinc-600
            ${answeredCorrect === true ? 'text-green-300' : ''}
            ${answeredCorrect === false ? 'text-red-300 animate-shake' : ''}
            ${answeredCorrect === null ? 'text-zinc-100' : ''}
          `}
        />
        {answeredCorrect === null && (
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="px-5 bg-zinc-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 hover:text-white transition-colors font-medium text-sm"
          >
            ↵
          </button>
        )}
        {answeredCorrect === true && (
          <div className="px-5 flex items-center text-green-400 text-xl bg-zinc-800">✓</div>
        )}
        {answeredCorrect === false && (
          <div className="px-5 flex items-center text-red-400 text-xl bg-zinc-800">✗</div>
        )}
      </div>

      {answeredCorrect === false && (
        <div className="px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
          <span className="text-zinc-400">Correct answer: </span>
          <span className="text-green-300 font-bold">{correctAnswer}</span>
        </div>
      )}
    </div>
  )
}
