import { useState, useCallback, useRef, useEffect } from 'react'
import { useWords } from '../../context/WordsContext'
import { useStats, buildRepQueue, getNextDueMs } from '../../hooks/useStats'
import { FAST_MS, SLOW_MS } from '../../data/itemStore'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { ScoreBar } from '../ScoreBar'
import { HintButton } from '../HintButton'
import { isOverlayOpen } from '../../utils/overlayGuard'
import type { AnswerMode, Direction } from '../../types'

interface QueueItem { dir: Direction; num: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeEncOptions(num: string, words: Record<string, string>): string[] {
  const correct = words[num]
  const allNums = Object.keys(words)
  const sameDecade = shuffle(allNums.filter(n => n[0] === num[0] && n !== num))
  const others = shuffle(allNums.filter(n => n[0] !== num[0]))
  return shuffle([correct, ...[...sameDecade, ...others].slice(0, 2).map(n => words[n])])
}

function makeDecOptions(num: string, words: Record<string, string>): string[] {
  const allNums = Object.keys(words)
  const sameDecade = shuffle(allNums.filter(n => n[0] === num[0] && n !== num))
  const others = shuffle(allNums.filter(n => n[0] !== num[0]))
  return shuffle([num, ...[...sameDecade, ...others].slice(0, 2)])
}

function relativeTime(ms: number): string {
  const diff = ms - Date.now()
  if (diff <= 0) return 'soon'
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (d > 0) return `in ${d} day${d > 1 ? 's' : ''}`
  if (h > 0) return `in ${h} hour${h > 1 ? 's' : ''}`
  if (m > 0) return `in ${m} minute${m > 1 ? 's' : ''}`
  return 'in a moment'
}

interface Props { answerMode: AnswerMode }

export function RepetitionDrill({ answerMode }: Props) {
  const { words } = useWords()
  const { recordFull } = useStats()
  const allNums = Object.keys(words)

  const [queue, setQueue] = useState<QueueItem[]>(() => buildRepQueue(allNums))
  const [totalInitial] = useState(() => buildRepQueue(allNums).length)
  const [answered, setAnswered] = useState<string | null>(null)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)
  const [lastMs, setLastMs] = useState<number | null>(null)
  const [hintUsed, setHintUsed] = useState(false)

  const timerStartRef = useRef(Date.now())
  const current = queue[0]

  // Reset timer on new question
  useEffect(() => {
    if (current) timerStartRef.current = Date.now()
  }, [current?.dir, current?.num])

  const next = useCallback(() => {
    setAnswered(null)
    setAnsweredCorrect(null)
    setLastMs(null)
    setHintUsed(false)
  }, [])

  // Keyboard shortcut: h reveals hint for enc items (blocked when typing in an input)
  useEffect(() => {
    if (!current || current.dir !== 'enc') return
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || isOverlayOpen()) return
      if ((e.key === 'h' || e.key === 'H') && !hintUsed) setHintUsed(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, hintUsed])

  const handleAnswer = useCallback((value: string) => {
    if (!current || answered !== null) return
    const ms = Date.now() - timerStartRef.current

    const answer = current.dir === 'enc' ? words[current.num] : current.num
    const correct =
      current.dir === 'enc'
        ? value.trim().toLowerCase() === answer.toLowerCase()
        : value.trim().padStart(2, '0') === current.num // accept "7" for "07"

    setAnswered(value)
    setAnsweredCorrect(correct)
    setLastMs(ms)

    // Persist to store with typing-time compensation, and reuse the exact grade
    // it applied so the re-queue decision matches the SM-2 due date just written.
    const hintApplied = current.dir === 'enc' && hintUsed
    const chars = answerMode === 'typing' ? answer.length : 0
    const grade = recordFull(current.dir, current.num, correct, ms, answerMode, hintApplied, chars)

    if (correct) setSessionCorrect(c => c + 1)
    else setSessionWrong(w => w + 1)

    setTimeout(() => {
      setQueue(prev => {
        const [done, ...rest] = prev
        if (grade < 3) {
          // Re-queue at a random later position (3–5 ahead)
          const insertAt = Math.min(rest.length, 3 + Math.floor(Math.random() * 3))
          const newQ = [...rest]
          newQ.splice(insertAt, 0, done)
          return newQ
        }
        return rest
      })
      next()
    }, 1500)
  }, [current, answered, words, answerMode, hintUsed, recordFull, next])

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (queue.length === 0) {
    const nextMs = getNextDueMs(allNums)
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-bold text-zinc-100">Nothing to repeat right now</h2>
        {nextMs && (
          <p className="text-zinc-400">
            Next repetition: <span className="text-violet-400 font-semibold">{relativeTime(nextMs)}</span>
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>
    )
  }

  // ── Build question for current item ─────────────────────────────────────────
  const isEnc = current.dir === 'enc'
  const options = isEnc
    ? makeEncOptions(current.num, words)
    : makeDecOptions(current.num, words)
  const correctAnswer = isEnc ? words[current.num] : current.num

  const remaining = queue.length
  const done = Math.max(0, totalInitial - remaining)
  const progress = totalInitial > 0 ? done / totalInitial : 0

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Progress */}
      <div className="w-full max-w-md space-y-1.5">
        <div className="flex justify-between text-xs text-zinc-600 tabular-nums">
          <span>{done} of {totalInitial} done</span>
          <span>{remaining} remaining</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-600 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <ScoreBar correct={sessionCorrect} wrong={sessionWrong} />

      {/* Direction label */}
      <div className="text-center space-y-2">
        <p className="text-xs text-zinc-600 uppercase tracking-widest">
          {isEnc ? 'What is the word for' : 'Which number is'}
        </p>
        {isEnc ? (
          <div className="text-[7rem] sm:text-[9rem] font-black text-violet-400 tabular-nums leading-none tracking-tight">
            {current.num}
          </div>
        ) : (
          <div className="text-5xl sm:text-7xl font-black text-zinc-100 leading-tight tracking-tight break-words max-w-full px-2">
            {words[current.num]}
          </div>
        )}
      </div>

      {isEnc && (
        <HintButton
          word={words[current.num]}
          revealed={hintUsed}
          onReveal={() => setHintUsed(true)}
        />
      )}

      <div className="w-full max-w-md space-y-2">
        {answerMode === 'multiple-choice' ? (
          <MultipleChoice
            key={`${current.dir}:${current.num}`}
            options={options}
            correctAnswer={correctAnswer}
            onAnswer={handleAnswer}
            answered={answered}
          />
        ) : (
          <TypingInput
            key={`${current.dir}:${current.num}`}
            onAnswer={handleAnswer}
            answeredCorrect={answeredCorrect}
            correctAnswer={correctAnswer}
            placeholder={isEnc ? 'Type the word...' : 'Type the number (00–99)...'}
          />
        )}
        {answered !== null && lastMs !== null && (
          <p className={`text-center text-sm font-mono tabular-nums ${
            lastMs <= FAST_MS[answerMode] ? 'text-green-400'
            : lastMs >= SLOW_MS[answerMode] ? 'text-red-400'
            : 'text-yellow-400'
          }`}>
            {(lastMs / 1000).toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  )
}
