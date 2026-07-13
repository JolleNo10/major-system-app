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
import { OUTLIER_MS, STALE_MS } from '../../data/itemStore'
import { adjustLatency, recallColor } from '../../data/typingSpeed'
import { masteryProgress, masteryFastMs } from '../../utils/roundMastery'
import { isOverlayOpen } from '../../utils/overlayGuard'
import { shuffle, pickDistractors, pickWeighted } from '../../utils/quiz'
import { useAnswerTimer } from '../../hooks/useAnswerTimer'
import { useSettings } from '../../context/SettingsContext'
import type { AnswerMode } from '../../types'

function makeQuestion(pool: string[], words: Record<string, string>, masteredSet: Set<string>, exclude?: string) {
  const available = pool.length > 1 ? pool.filter(n => n !== exclude) : pool
  const number = pickWeighted('dec', available, masteredSet)
  const word = words[number]
  const distNums = pickDistractors(number, Object.keys(words))
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
  const { settings } = useSettings()

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

  const [question, setQuestion] = useState(() => makeQuestion(pool, words, new Set<string>()))
  const [answered, setAnswered] = useState<string | null>(null)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lastMs, setLastMs] = useState<number | null>(null)
  const [discarded, setDiscarded] = useState(false)

  const { paused, togglePause, elapsedMs, wasPaused } = useAnswerTimer(question, answered)
  const masteredSetRef = useRef<Set<string>>(new Set()) // latest mastered set, for selection

  const next = useCallback((exclude: string) => {
    setQuestion(makeQuestion(pool, words, masteredSetRef.current, exclude))
    setAnswered(null)
    setAnsweredCorrect(null)
    setLastMs(null)
    setDiscarded(false)
  }, [pool, words])

  const resetRound = useCallback(() => {
    setRoundStats({})
    setSessionCorrect(0)
    setSessionWrong(0)
    setStreak(0)
    setBestStreak(0)
    setAnswered(null)
    setAnsweredCorrect(null)
    setLastMs(null)
    setDiscarded(false)
    masteredSetRef.current = new Set()
    setQuestion(makeQuestion(pool, words, new Set<string>()))
  }, [pool, words])

  // Range change (new segment) → fresh round
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    resetRound()
  }, [pool]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: p toggles pause (blocked when typing in an input or behind an overlay)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || isOverlayOpen()) return
      if (e.key === 'p' || e.key === 'P') togglePause()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePause])

  const handleAnswer = useCallback((value: string) => {
    if (answered !== null || paused) return
    const ms = elapsedMs()
    // Accept a single digit for 0–9 (e.g. "7" for "07")
    const correct = value.trim().padStart(2, '0') === question.number
    setAnswered(value)
    setAnsweredCorrect(correct)
    setLastMs(ms)

    // Idle / walked-away answer (and pause wasn't used) → discard, don't record
    if (!wasPaused() && ms > STALE_MS) {
      setDiscarded(true)
      setTimeout(() => next(question.number), 1500)
      return
    }

    const chars = answerMode === 'typing' ? question.number.length : 0
    const adjusted = adjustLatency(ms, answerMode, chars)
    recordFull('dec', question.number, correct, ms, answerMode, false, chars)
    if (correct) {
      setSessionCorrect(c => c + 1)
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n })
    } else {
      setSessionWrong(w => w + 1)
      setStreak(0)
    }
    setRoundStats(prev => {
      const entry = prev[question.number] ?? { correct: 0, wrong: 0, latencies: [], hintCount: 0, attempts: [] }
      const validMs = ms > 0 && ms < OUTLIER_MS
      const attempt = { ok: correct, recallMs: adjusted, hinted: false }
      return {
        ...prev,
        [question.number]: {
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
    setTimeout(() => next(question.number), 1500)
  }, [answered, paused, question, answerMode, recordFull, next])

  // Round mastery — how well the full selected set is known
  const { mastered, total, masteredSet } = masteryProgress(pool, roundStats, masteryFastMs(settings.masteryLatencyFactor))
  masteredSetRef.current = masteredSet
  const setComplete = total > 0 && mastered === total
  const width = high - low + 1
  const nextLow = high < 99 ? high + 1 : 0
  const nextHigh = high < 99 ? Math.min(99, high + width) : Math.min(99, width - 1)
  const fmt2 = (v: number) => String(v).padStart(2, '0')
  const startNextSet = () => { setLow(nextLow); setHigh(nextHigh) }

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4'

  return (
    <>
      {showStats && (
        <div className="hidden xl:block fixed left-0 top-14 bottom-0 w-56 bg-zinc-900 border-r border-zinc-800 overflow-y-auto z-30 p-4">
          <RoundStatsPanel stats={roundStats} pool={pool} dir="dec" low={low} high={high} onRestart={resetRound} />
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
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowStats(s => !s)}
                  className={`flex items-center justify-center min-h-[40px] min-w-[40px] px-3 rounded-lg text-sm font-medium transition-colors ${
                    showStats ? 'bg-zinc-700 text-zinc-100 border border-zinc-500' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                  }`}
                  title="Show/hide round stats"
                  aria-label="Round stats"
                >📊</button>
                <button
                  onClick={() => setShowKey(k => !k)}
                  className={`flex items-center justify-center min-h-[40px] min-w-[40px] px-3 rounded-lg text-sm font-medium transition-colors ${
                    showKey ? 'bg-zinc-700 text-zinc-100 border border-zinc-500' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                  }`}
                  title="Show/hide sound key"
                  aria-label="Sound key"
                >🔑</button>
              </div>
              <button
                onClick={togglePause}
                disabled={answered !== null}
                className={`flex items-center justify-center min-h-[40px] min-w-[40px] px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  paused ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                }`}
                title="Pause / resume (p)"
                aria-label={paused ? 'Resume' : 'Pause'}
              >{paused ? '▶ Resume' : '⏸'}</button>
            </div>
            <RangeSlider low={low} high={high} onChange={(l, h) => { setLow(l); setHigh(h) }} />
          </div>
        )}

        {showStats && (
          <div className={`xl:hidden w-full max-w-md ${panelCls}`}>
            <RoundStatsPanel stats={roundStats} pool={pool} dir="dec" low={low} high={high} onRestart={resetRound} />
          </div>
        )}
        {showKey && (
          <div className={`xl:hidden w-full max-w-md ${panelCls}`}>
            <SoundKeyPanel />
          </div>
        )}

        <ScoreBar correct={sessionCorrect} wrong={sessionWrong} streak={streak} bestStreak={bestStreak} />

        {!customPool && total > 0 && (
          <div className="w-full max-w-md -mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-500">Set mastery</span>
              <span className={setComplete ? 'text-green-400 font-semibold' : 'text-zinc-400 tabular-nums'}>{mastered}/{total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all ${setComplete ? 'bg-green-500' : 'bg-violet-600'}`}
                style={{ width: `${(mastered / total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {!customPool && setComplete && (
          <div className="w-full max-w-md rounded-xl border border-green-600/40 bg-green-500/10 p-4 text-center space-y-3">
            <p className="text-green-300 font-semibold">🎉 You know this whole set — ready to move on.</p>
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={startNextSet}
                className="flex items-center min-h-[40px] px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
              >Next set {fmt2(nextLow)}–{fmt2(nextHigh)} →</button>
              <button
                onClick={resetRound}
                className="flex items-center min-h-[40px] px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
              >Keep practising</button>
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Which number is</p>
          <div className={`text-5xl sm:text-7xl font-black text-zinc-100 leading-tight tracking-tight break-words max-w-full px-2 ${paused ? 'blur-md select-none' : ''}`}>
            {question.word}
          </div>
        </div>

        <div className="w-full max-w-md space-y-2">
          {paused ? (
            <div className="text-center space-y-3 py-6">
              <p className="text-zinc-400 text-sm">Paused — timer stopped</p>
              <button
                onClick={togglePause}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
              >▶ Resume</button>
            </div>
          ) : answerMode === 'multiple-choice' ? (
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
              placeholder="Type the number (00–99)..."
              numeric
            />
          )}
          {answered !== null && lastMs !== null && (
            discarded ? (
              <p className="text-center text-sm text-zinc-500">
                ⏱ Not counted — timer ran too long (use ⏸ Pause)
              </p>
            ) : (
              <p className={`text-center text-sm font-mono tabular-nums ${
                recallColor(adjustLatency(lastMs, answerMode, answerMode === 'typing' ? question.number.length : 0))
              }`}>
                {(lastMs / 1000).toFixed(1)}s
              </p>
            )
          )}
        </div>
      </div>
    </>
  )
}
