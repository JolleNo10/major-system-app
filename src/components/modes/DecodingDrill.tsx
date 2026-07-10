import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useWords } from '../../context/WordsContext'
import { useStats } from '../../hooks/useStats'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { ScoreBar } from '../ScoreBar'
import { SoundKeyPanel } from '../SoundKeyPanel'
import { RangeSlider } from '../RangeSlider'
import { RoundStatsPanel } from '../RoundStatsPanel'
import type { RoundStat } from '../RoundStatsPanel'
import { loadStore, itemKey, medianMs, FAST_MS, SLOW_MS } from '../../data/itemStore'
import type { AnswerMode } from '../../types'

function pickWeighted(available: string[], answerMode: AnswerMode): string {
  if (available.length === 1) return available[0]
  const store = loadStore()
  const DEFAULT_EASE = 2.5, MIN_EASE = 1.3
  const weights = available.map(num => {
    const item = store[itemKey('dec', num)]
    if (!item || item.lastSeenAt === 0) return 1.5
    const total = item.correct + item.wrong
    const wrongRate = total > 0 ? item.wrong / total : 0
    const easePenalty = Math.max(0, (DEFAULT_EASE - (item.ease ?? DEFAULT_EASE)) / (DEFAULT_EASE - MIN_EASE))
    const median = medianMs(item.latencies)
    const slow = median !== null && median >= SLOW_MS[answerMode] ? 0.5 : 0
    return 1 + wrongRate * 3 + easePenalty * 1 + slow
  })
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * sum
  for (let i = 0; i < available.length; i++) {
    r -= weights[i]
    if (r <= 0) return available[i]
  }
  return available[available.length - 1]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeQuestion(pool: string[], words: Record<string, string>, answerMode: AnswerMode, exclude?: string) {
  const available = pool.length > 1 ? pool.filter(n => n !== exclude) : pool
  const number = pickWeighted(available, answerMode)
  const word = words[number]

  const allNums = Object.keys(words)
  const sameDecade = shuffle(allNums.filter(n => n[0] === number[0] && n !== number))
  const others = shuffle(allNums.filter(n => n[0] !== number[0]))
  const distNums = [...sameDecade, ...others].slice(0, 2)
  const options = shuffle([number, ...distNums])

  return { number, word, options }
}

interface Props {
  answerMode: AnswerMode
  pool?: string[]
}

export function DecodingDrill({ answerMode, pool: customPool }: Props) {
  const { words } = useWords()
  const { recordFull } = useStats()

  const [low, setLow] = useState(0)
  const [high, setHigh] = useState(99)
  const [showStats, setShowStats] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [roundStats, setRoundStats] = useState<Record<string, RoundStat>>({})

  const allNums = useMemo(() => customPool ?? Object.keys(words), [customPool, words])
  const pool = useMemo(() => {
    if (!customPool) {
      return allNums.filter(n => { const v = parseInt(n, 10); return v >= low && v <= high })
    }
    return allNums
  }, [allNums, customPool, low, high])

  const [question, setQuestion] = useState(() => makeQuestion(pool, words, answerMode))
  const [answered, setAnswered] = useState<string | null>(null)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lastMs, setLastMs] = useState<number | null>(null)

  const timerStartRef = useRef(Date.now())
  useEffect(() => {
    timerStartRef.current = Date.now()
  }, [question.number])

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setQuestion(makeQuestion(pool, words, answerMode))
    setAnswered(null)
    setAnsweredCorrect(null)
  }, [pool]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback((exclude: string) => {
    setQuestion(makeQuestion(pool, words, answerMode, exclude))
    setAnswered(null)
    setAnsweredCorrect(null)
    setLastMs(null)
  }, [pool, words, answerMode])

  const handleAnswer = useCallback((value: string) => {
    if (answered !== null) return
    const ms = Date.now() - timerStartRef.current
    const correct = value.trim() === question.number
    setAnswered(value)
    setAnsweredCorrect(correct)
    setLastMs(ms)
    recordFull('dec', question.number, correct, ms, answerMode)
    if (correct) {
      setSessionCorrect(c => c + 1)
      setStreak(s => { const next = s + 1; setBestStreak(b => Math.max(b, next)); return next })
    } else {
      setSessionWrong(w => w + 1)
      setStreak(0)
    }
    setRoundStats(prev => {
      const entry = prev[question.number] ?? { correct: 0, wrong: 0 }
      return {
        ...prev,
        [question.number]: correct
          ? { ...entry, correct: entry.correct + 1, lastMs: ms }
          : { ...entry, wrong: entry.wrong + 1, lastMs: ms },
      }
    })
    setTimeout(() => next(question.number), 1500)
  }, [answered, question, answerMode, recordFull, next])

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4'

  return (
    <>
      {showStats && (
        <div className="hidden xl:block fixed left-0 top-14 bottom-0 w-56 bg-zinc-900 border-r border-zinc-800 overflow-y-auto z-30 p-4">
          <RoundStatsPanel stats={roundStats} pool={pool} dir="dec" answerMode={answerMode} />
        </div>
      )}
      {showKey && (
        <div className="hidden xl:block fixed right-0 top-14 bottom-0 w-64 bg-zinc-900 border-l border-zinc-800 overflow-y-auto z-30 p-5">
          <SoundKeyPanel />
        </div>
      )}

      <div className="flex flex-col items-center gap-8 py-4">
        {!customPool && (
          <div className="w-full max-w-md space-y-3">
            <div className="flex justify-between">
              <button
                onClick={() => setShowStats(s => !s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showStats ? 'bg-zinc-700 text-zinc-100 border border-zinc-500' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                }`}
                title="Vis/skjul runde-statistikk"
              >📊</button>
              <button
                onClick={() => setShowKey(k => !k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showKey ? 'bg-zinc-700 text-zinc-100 border border-zinc-500' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                }`}
                title="Vis/skjul lydnøkkel"
              >🔑</button>
            </div>
            <RangeSlider low={low} high={high} onChange={(l, h) => { setLow(l); setHigh(h) }} />
          </div>
        )}

        {showStats && (
          <div className={`xl:hidden w-full max-w-md ${panelCls}`}>
            <RoundStatsPanel stats={roundStats} pool={pool} dir="dec" answerMode={answerMode} />
          </div>
        )}
        {showKey && (
          <div className={`xl:hidden w-full max-w-md ${panelCls}`}>
            <SoundKeyPanel />
          </div>
        )}

        <ScoreBar correct={sessionCorrect} wrong={sessionWrong} streak={streak} bestStreak={bestStreak} />

        <div className="text-center space-y-2">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Hvilket tall er</p>
          <div className="text-6xl sm:text-7xl font-black text-zinc-100 leading-tight tracking-tight">
            {question.word}
          </div>
        </div>

        <div className="w-full max-w-md space-y-2">
          {answerMode === 'multiple-choice' ? (
            <MultipleChoice
              options={question.options}
              correctAnswer={question.number}
              onAnswer={handleAnswer}
              answered={answered}
            />
          ) : (
            <TypingInput
              onAnswer={handleAnswer}
              answeredCorrect={answeredCorrect}
              correctAnswer={question.number}
              placeholder="Skriv tallet (00–99)..."
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
    </>
  )
}
