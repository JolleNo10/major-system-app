import { useState, useEffect, useCallback, useRef } from 'react'
import { useWords } from '../../context/WordsContext'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import type { AnswerMode } from '../../types'

const DURATION = 60
const BEST_KEY = 'major-speed-best'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeQuestion(words: Record<string, string>, exclude?: string) {
  const all = Object.keys(words)
  const available = all.length > 1 ? all.filter(n => n !== exclude) : all
  const number = available[Math.floor(Math.random() * available.length)]
  const correct = words[number]
  const others = shuffle(all.filter(n => n !== number)).slice(0, 2)
  const options = shuffle([correct, ...others.map(n => words[n])])
  return { number, correct, options }
}

type GameState = 'idle' | 'running' | 'done'

interface Props {
  answerMode: AnswerMode
}

export function SpeedRound({ answerMode }: Props) {
  const { words } = useWords()
  const [gameState, setGameState] = useState<GameState>('idle')
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [question, setQuestion] = useState(() => makeQuestion(words))
  const [answered, setAnswered] = useState<string | null>(null)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)
  const [personalBest, setPersonalBest] = useState(() => {
    return parseInt(localStorage.getItem(BEST_KEY) ?? '0')
  })

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (gameState !== 'running') return
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameState('done')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState])

  const nextQuestion = useCallback((exclude?: string) => {
    setQuestion(makeQuestion(words, exclude))
    setAnswered(null)
    setAnsweredCorrect(null)
  }, [words])

  const handleAnswer = useCallback((value: string) => {
    if (answered !== null || gameState !== 'running') return
    const isCorrect = value.toLowerCase().trim() === question.correct.toLowerCase()
    setAnswered(value)
    setAnsweredCorrect(isCorrect)
    if (isCorrect) setCorrect(c => c + 1)
    else setWrong(w => w + 1)

    const delay = isCorrect ? 400 : 1000
    advanceTimer.current = setTimeout(() => nextQuestion(question.number), delay)
  }, [answered, gameState, question, nextQuestion])

  useEffect(() => {
    if (gameState === 'done') {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      setCorrect(c => {
        if (c > personalBest) {
          setPersonalBest(c)
          localStorage.setItem(BEST_KEY, String(c))
        }
        return c
      })
    }
  }, [gameState])

  const start = () => {
    setCorrect(0)
    setWrong(0)
    setTimeLeft(DURATION)
    setQuestion(makeQuestion(words))
    setAnswered(null)
    setAnsweredCorrect(null)
    setGameState('running')
  }

  const timerPct = (timeLeft / DURATION) * 100
  const timerColor = timeLeft > 20 ? 'bg-violet-500' : timeLeft > 10 ? 'bg-yellow-500' : 'bg-red-500'

  if (gameState === 'idle') {
    return (
      <div className="flex flex-col items-center gap-8 py-8">
        <div className="text-center space-y-3">
          <div className="text-6xl">⚡</div>
          <h2 className="text-2xl font-bold text-zinc-100">Hurtigrunde</h2>
          <p className="text-zinc-400 max-w-xs">
            Enkod så mange tall som mulig på {DURATION} sekunder. Tall → Ord.
          </p>
          {personalBest > 0 && (
            <p className="text-violet-400 font-semibold">Personlig rekord: {personalBest} ✓</p>
          )}
        </div>
        <button
          onClick={start}
          className="px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-lg font-bold transition-colors shadow-lg shadow-violet-900/30"
        >
          Start!
        </button>
      </div>
    )
  }

  if (gameState === 'done') {
    const isNewBest = correct >= personalBest && correct > 0
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-6xl">{isNewBest ? '🏆' : '⏱'}</div>
        <h2 className="text-2xl font-bold text-zinc-100">
          {isNewBest ? 'Ny personlig rekord!' : 'Tid er ute!'}
        </h2>
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-4xl font-black text-green-400">{correct}</div>
            <div className="text-sm text-zinc-500">riktige</div>
          </div>
          <div>
            <div className="text-4xl font-black text-red-400">{wrong}</div>
            <div className="text-sm text-zinc-500">feil</div>
          </div>
          <div>
            <div className="text-4xl font-black text-violet-400">{personalBest}</div>
            <div className="text-sm text-zinc-500">rekord</div>
          </div>
        </div>
        <button
          onClick={start}
          className="px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-lg font-bold transition-colors"
        >
          Prøv igjen
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      {/* Timer bar */}
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <span className={`text-lg font-bold tabular-nums w-8 text-right ${timeLeft <= 10 ? 'text-red-400' : 'text-zinc-300'}`}>
          {timeLeft}
        </span>
        <div className="flex gap-3 text-sm font-medium">
          <span className="text-green-400">✓ {correct}</span>
          <span className="text-red-400">✗ {wrong}</span>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs text-zinc-600 uppercase tracking-widest">Hva er ordet for</p>
        <div className="text-[7rem] font-black text-violet-400 tabular-nums leading-none">
          {question.number}
        </div>
      </div>

      <div className="w-full max-w-md">
        {answerMode === 'multiple-choice' ? (
          <MultipleChoice
            options={question.options}
            correctAnswer={question.correct}
            onAnswer={handleAnswer}
            answered={answered}
          />
        ) : (
          <TypingInput
            onAnswer={handleAnswer}
            answeredCorrect={answeredCorrect}
            correctAnswer={question.correct}
            placeholder="Skriv ordet..."
          />
        )}
      </div>
    </div>
  )
}
