import { useState, useCallback, useRef } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { useAnswerTimer } from '../../hooks/useAnswerTimer'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { ScoreBar } from '../ScoreBar'
import { OUTLIER_MS, STALE_MS } from '../../data/itemStore'
import { adjustLatency, recallColor } from '../../data/typingSpeed'
import { masteryProgress, masteryFastMs } from '../../utils/roundMastery'
import { shuffle, pickDistractors, pickWeighted } from '../../utils/quiz'
import { CARDS } from '../../data/cards'
import type { Card, Suit } from '../../data/cards'
import type { RoundStat } from '../RoundStatsPanel'
import type { AnswerMode, Direction } from '../../types'
import { DeckMemoDrill } from './DeckMemoDrill'

const ALL_SUITS: Suit[] = ['♣', '♦', '♥', '♠']

type CardsDrillType = 'card-to-word' | 'card-to-number' | 'deck-memo'

const DRILL_LABELS: Record<CardsDrillType, string> = {
  'card-to-word': 'Card → Word',
  'card-to-number': 'Card → Number',
  'deck-memo': 'Deck Memo',
}

type RecordFn = (
  dir: Direction,
  num: string,
  correct: boolean,
  ms: number,
  answerMode: AnswerMode,
  hintUsed?: boolean,
  chars?: number,
) => void

interface Question {
  card: Card
  correctAnswer: string
  options: string[]
}

function numbersForSuits(suits: Set<Suit>): string[] {
  return CARDS.filter(c => suits.has(c.suit)).map(c => c.number)
}

function loadSuits(key: string): Set<Suit> {
  try {
    const v = localStorage.getItem(key)
    if (v) {
      const parsed = JSON.parse(v) as string[]
      const valid = parsed.filter((s): s is Suit => (ALL_SUITS as string[]).includes(s))
      if (valid.length > 0) return new Set(valid)
    }
  } catch {}
  return new Set(ALL_SUITS)
}

function makeQuestion(
  lastNumber: string | undefined,
  cardNumbers: string[],
  words: Record<string, string>,
  masteredSet: Set<string>,
  drillType: CardsDrillType,
): Question {
  const available = lastNumber
    ? cardNumbers.filter(n => n !== lastNumber)
    : cardNumbers
  const pool = available.length > 0 ? available : cardNumbers
  const number = pickWeighted('enc', pool, masteredSet)
  const card = CARDS.find(c => c.number === number)!
  const distNums = pickDistractors(number, cardNumbers)

  if (drillType === 'card-to-number') {
    return { card, correctAnswer: number, options: shuffle([number, ...distNums]) }
  }

  const correctAnswer = words[number]
  return { card, correctAnswer, options: shuffle([correctAnswer, ...distNums.map(n => words[n])]) }
}

function resetSession() {
  return {
    roundStats: {} as Record<string, RoundStat>,
    answered: null as string | null,
    answeredCorrect: null as boolean | null,
    sessionCorrect: 0,
    sessionWrong: 0,
    streak: 0,
    bestStreak: 0,
    lastMs: null as number | null,
    discarded: false,
  }
}

interface Props {
  answerMode: AnswerMode
  words: Record<string, string>
  drillTypes?: CardsDrillType[]
  onRecord?: RecordFn
  storagePrefix?: string
  onEditWords?: () => void
}

export function CardsDrill({
  answerMode,
  words,
  drillTypes = ['card-to-word', 'card-to-number', 'deck-memo'],
  onRecord,
  storagePrefix = 'major-cards',
  onEditWords,
}: Props) {
  const { settings } = useSettings()

  const drilltypeKey = `${storagePrefix}-drilltype`
  const suitsKey = `${storagePrefix}-suits`

  const [drillType, setDrillType] = useState<CardsDrillType>(() => {
    try {
      const v = localStorage.getItem(drilltypeKey)
      if (v && (drillTypes as string[]).includes(v)) return v as CardsDrillType
    } catch {}
    return drillTypes[0]
  })

  const [activeSuits, setActiveSuits] = useState<Set<Suit>>(() => loadSuits(suitsKey))

  const activeNumbers = numbersForSuits(activeSuits)

  const [roundStats, setRoundStats] = useState<Record<string, RoundStat>>({})
  const [question, setQuestion] = useState<Question>(() =>
    makeQuestion(undefined, activeNumbers, words, new Set<string>(), drillType))
  const [answered, setAnswered] = useState<string | null>(null)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lastMs, setLastMs] = useState<number | null>(null)
  const [discarded, setDiscarded] = useState(false)

  const { paused, togglePause, elapsedMs, wasPaused } = useAnswerTimer(question, answered)
  const masteredSetRef = useRef<Set<string>>(new Set())

  const next = useCallback((lastNumber: string) => {
    setQuestion(makeQuestion(lastNumber, activeNumbers, words, masteredSetRef.current, drillType))
    setAnswered(null)
    setAnsweredCorrect(null)
    setLastMs(null)
    setDiscarded(false)
  }, [activeNumbers, words, drillType])

  const handleAnswer = useCallback((value: string) => {
    if (answered !== null || paused) return
    const ms = elapsedMs()
    const correct = value.trim().toLowerCase() === question.correctAnswer.toLowerCase()
    setAnswered(value)
    setAnsweredCorrect(correct)
    setLastMs(ms)

    if (!wasPaused() && ms > STALE_MS) {
      setDiscarded(true)
      setTimeout(() => next(question.card.number), 1500)
      return
    }

    const chars = answerMode === 'typing' ? question.correctAnswer.length : 0
    const adjusted = adjustLatency(ms, answerMode, chars)

    if (drillType === 'card-to-word') {
      onRecord?.('enc', question.card.number, correct, ms, answerMode, false, chars)
    }

    if (correct) {
      setSessionCorrect(c => c + 1)
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n })
    } else {
      setSessionWrong(w => w + 1)
      setStreak(0)
    }

    setRoundStats(prev => {
      const num = question.card.number
      const entry = prev[num] ?? { correct: 0, wrong: 0, latencies: [], hintCount: 0, attempts: [] }
      const validMs = ms > 0 && ms < OUTLIER_MS
      const attempt = { ok: correct, recallMs: adjusted, hinted: false }
      return {
        ...prev,
        [num]: {
          ...entry,
          correct: entry.correct + (correct ? 1 : 0),
          wrong: entry.wrong + (correct ? 0 : 1),
          lastMs: adjusted,
          latencies: validMs ? [...entry.latencies, adjusted] : entry.latencies,
          hintCount: entry.hintCount,
          attempts: [...entry.attempts, attempt].slice(-5),
        },
      }
    })
    setTimeout(() => next(question.card.number), 1500)
  }, [answered, paused, question, answerMode, drillType, onRecord, next])

  const switchDrillType = useCallback((newType: CardsDrillType) => {
    try { localStorage.setItem(drilltypeKey, newType) } catch {}
    setDrillType(newType)
    const s = resetSession()
    setRoundStats(s.roundStats)
    setAnswered(s.answered)
    setAnsweredCorrect(s.answeredCorrect)
    setSessionCorrect(s.sessionCorrect)
    setSessionWrong(s.sessionWrong)
    setStreak(s.streak)
    setBestStreak(s.bestStreak)
    setLastMs(s.lastMs)
    setDiscarded(s.discarded)
    masteredSetRef.current = new Set()
    setQuestion(makeQuestion(undefined, activeNumbers, words, new Set(), newType))
  }, [activeNumbers, words, drilltypeKey])

  const toggleSuit = useCallback((suit: Suit) => {
    setActiveSuits(prev => {
      if (prev.has(suit) && prev.size === 1) return prev  // keep at least one
      const next = new Set(prev)
      if (next.has(suit)) next.delete(suit)
      else next.add(suit)
      try { localStorage.setItem(suitsKey, JSON.stringify([...next])) } catch {}
      const nums = numbersForSuits(next)
      const s = resetSession()
      setRoundStats(s.roundStats)
      setAnswered(s.answered)
      setAnsweredCorrect(s.answeredCorrect)
      setSessionCorrect(s.sessionCorrect)
      setSessionWrong(s.sessionWrong)
      setStreak(s.streak)
      setBestStreak(s.bestStreak)
      setLastMs(s.lastMs)
      setDiscarded(s.discarded)
      masteredSetRef.current = new Set()
      setQuestion(makeQuestion(undefined, nums, words, new Set(), drillType))
      return next
    })
  }, [words, drillType, suitsKey])

  const { mastered, total, masteredSet } = masteryProgress(
    activeNumbers, roundStats, masteryFastMs(settings.masteryLatencyFactor))
  masteredSetRef.current = masteredSet

  const { card } = question
  const colorCls = card.red ? 'text-rose-500' : 'text-zinc-900'

  return (
    <div className="flex flex-col items-center gap-8 py-4">

      {/* Drill type toggle */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-800">
          {drillTypes.map(t => (
            <button
              key={t}
              onClick={() => drillType !== t && switchDrillType(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                drillType === t
                  ? 'bg-rose-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >{DRILL_LABELS[t]}</button>
          ))}
        </div>
        {onEditWords && (
          <button
            onClick={onEditWords}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-violet-500 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
            title="Edit the deck's word list"
          >📇 Edit words</button>
        )}
      </div>

      {/* Suit filter */}
      <div className="flex items-center gap-2 -mt-4">
        <span className="text-xs text-zinc-500 mr-1">Suits:</span>
        {ALL_SUITS.map(suit => {
          const active = activeSuits.has(suit)
          const isRed = suit === '♥' || suit === '♦'
          return (
            <button
              key={suit}
              onClick={() => toggleSuit(suit)}
              title={active ? `Remove ${suit}` : `Add ${suit}`}
              className={`w-9 h-9 rounded-lg text-lg font-bold transition-colors ${
                active
                  ? isRed
                    ? 'bg-rose-600/20 text-rose-400 border border-rose-600'
                    : 'bg-zinc-700 text-zinc-100 border border-zinc-500'
                  : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
              }`}
            >{suit}</button>
          )
        })}
        <span className="text-xs text-zinc-600 ml-1 tabular-nums">{activeNumbers.length} cards</span>
      </div>

      {drillType === 'deck-memo' ? (
        <DeckMemoDrill
          key={[...activeSuits].sort().join('')}
          activeNumbers={activeNumbers}
          words={words}
        />
      ) : (
        <>
          <ScoreBar
            correct={sessionCorrect}
            wrong={sessionWrong}
            streak={streak}
            bestStreak={bestStreak}
          />

          {total > 0 && (
            <div className="w-full max-w-md -mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-500">Cards mastered this session</span>
                <span className="text-zinc-400 tabular-nums">{mastered}/{total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-rose-600 transition-all"
                  style={{ width: `${(mastered / total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Card face */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">
              {drillType === 'card-to-word' ? 'What is the word for' : 'What is the number for'}
            </p>
            <div className={`relative flex flex-col items-center justify-center w-36 h-52 rounded-2xl bg-zinc-100 shadow-2xl border-2 border-zinc-300 select-none ${paused ? 'opacity-0' : ''}`}>
              <div className={`absolute top-2.5 left-3 flex flex-col items-center leading-none ${colorCls}`}>
                <span className="text-base font-black">{card.rank}</span>
                <span className="text-sm">{card.suit}</span>
              </div>
              <span className={`text-6xl ${colorCls}`}>{card.suit}</span>
              <span className={`text-3xl font-black mt-0.5 ${colorCls}`}>{card.rank}</span>
              <div className={`absolute bottom-2.5 right-3 flex flex-col items-center leading-none rotate-180 ${colorCls}`}>
                <span className="text-base font-black">{card.rank}</span>
                <span className="text-sm">{card.suit}</span>
              </div>
            </div>
            {drillType === 'card-to-word' && (
              <p className="text-xs text-zinc-600 font-mono tabular-nums">= {card.number}</p>
            )}
          </div>

          {paused ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-zinc-400 text-sm">Paused — timer stopped</p>
              <button
                onClick={togglePause}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
              >▶ Resume</button>
            </div>
          ) : (
            <div className="w-full max-w-md space-y-2">
              {answerMode === 'multiple-choice' ? (
                <MultipleChoice
                  options={question.options}
                  correctAnswer={question.correctAnswer}
                  onAnswer={handleAnswer}
                  answered={answered}
                />
              ) : (
                <TypingInput
                  onAnswer={handleAnswer}
                  answeredCorrect={answeredCorrect}
                  correctAnswer={question.correctAnswer}
                  placeholder={drillType === 'card-to-number' ? 'Type the number (e.g. 14)' : 'Type the word...'}
                />
              )}
              {answered !== null && lastMs !== null && (
                discarded ? (
                  <p className="text-center text-sm text-zinc-500">
                    ⏱ Not counted — timer ran too long (use ⏸ Pause)
                  </p>
                ) : (
                  <p className={`text-center text-sm font-mono tabular-nums ${
                    recallColor(adjustLatency(lastMs, answerMode, answerMode === 'typing' ? question.correctAnswer.length : 0))
                  }`}>
                    {(lastMs / 1000).toFixed(1)}s
                  </p>
                )
              )}
            </div>
          )}

          <button
            onClick={togglePause}
            disabled={answered !== null}
            className={`flex items-center min-h-[40px] px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              paused ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
            }`}
            title="Pause / resume (p)"
          >{paused ? '▶ Resume' : '⏸ Pause'}</button>
        </>
      )}
    </div>
  )
}
