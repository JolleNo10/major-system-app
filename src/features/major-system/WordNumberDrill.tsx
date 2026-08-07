import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useWords } from '@/features/major-system/WordsContext'
import { useStats } from '@/core/scoring/useStats'
import { MultipleChoice } from '@/core/ui/MultipleChoice'
import { TypingInput } from '@/core/ui/TypingInput'
import { ScoreBar } from '@/core/ui/ScoreBar'
import { SoundKeyPanel } from '@/features/major-system/SoundKeyPanel'
import { RangeSlider } from '@/core/ui/RangeSlider'
import { RoundStatsPanel } from '@/features/major-system/RoundStatsPanel'
import { HintButton } from '@/features/major-system/HintButton'
import { STALE_MS } from '@/core/scoring/scoring'
import { adjustLatency } from '@/core/scoring/typingSpeed'
import { recallColor } from '@/core/scoring/recallColor'
import { masteryProgress, masteryFastMs, isMastered } from '@/core/scoring/roundMastery'
import { isOverlayOpen } from '@/app/layout/overlayGuard'
import { pickWeighted } from '@/core/scoring/quiz'
import { eligible, noteServed, type RefreshState } from '@/core/scoring/sessionRefresh'
import { applyRoundAttempt, type RoundStat } from '@/core/scoring/roundStats'
import { useAnswerTimer } from '@/core/scoring/useAnswerTimer'
import { useSettings } from '@/app/settings/SettingsContext'
import type { AnswerMode, Direction } from '@/core/types'

export interface DrillQuestion {
  number: string          // underlying 00–99 key (for recording + exclude)
  prompt: string          // shown to the user (the number for enc, the word for dec)
  answer: string          // correct answer (the word for enc, the number for dec)
  options: string[]       // multiple-choice options
}

export interface DrillConfig {
  dir: Direction
  // Build the prompt/answer/options for a chosen number.
  build: (number: string, words: Record<string, string>) => Omit<DrillQuestion, 'number'>
  promptLabel: string        // e.g. "What is the word for"
  promptClass: string        // styling for the big prompt element
  isCorrect: (value: string, answer: string) => boolean
  showHint: boolean
  inputPlaceholder: string
  inputNumeric?: boolean
}

function makeQuestion(
  config: DrillConfig,
  pool: string[],
  words: Record<string, string>,
  masteredSet: Set<string>,
  share: number,
  refreshState: RefreshState,
  index: number,
  exclude?: string,
): DrillQuestion {
  const excluded = pool.length > 1 ? pool.filter(n => n !== exclude) : pool
  // Drop mastered items that aren't refresh-due (or have retired); if that leaves
  // nothing (whole set mastered + all refreshers retired) fall back to the full set.
  const filtered = eligible(excluded, masteredSet, refreshState, index)
  const available = filtered.length > 0 ? filtered : excluded
  const number = pickWeighted(config.dir, available, masteredSet, share)
  return { number, ...config.build(number, words) }
}

interface Props {
  config: DrillConfig
  answerMode: AnswerMode
  pool?: string[]
}

export function WordNumberDrill({ config, answerMode, pool: customPool }: Props) {
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

  const refreshStateRef = useRef<RefreshState>({}) // per-session refresh schedule
  const indexRef = useRef(0)                       // recorded-answer counter (drives refresh due-dates)

  const [question, setQuestion] = useState(() => makeQuestion(config, pool, words, new Set<string>(), settings.sessionUnmasteredShare, {}, 0))
  const [answered, setAnswered] = useState<string | null>(null)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lastMs, setLastMs] = useState<number | null>(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [discarded, setDiscarded] = useState(false)

  const { paused, togglePause, elapsedMs, wasPaused } = useAnswerTimer(question, answered)
  const masteredSetRef = useRef<Set<string>>(new Set()) // latest mastered set, for selection
  const shareRef = useRef(settings.sessionUnmasteredShare) // latest unmastered-focus setting

  const next = useCallback((exclude: string) => {
    setQuestion(makeQuestion(config, pool, words, masteredSetRef.current, shareRef.current, refreshStateRef.current, indexRef.current, exclude))
    setAnswered(null)
    setAnsweredCorrect(null)
    setLastMs(null)
    setHintUsed(false)
    setDiscarded(false)
  }, [config, pool, words])

  const resetRound = useCallback(() => {
    setRoundStats({})
    setSessionCorrect(0)
    setSessionWrong(0)
    setStreak(0)
    setBestStreak(0)
    setAnswered(null)
    setAnsweredCorrect(null)
    setLastMs(null)
    setHintUsed(false)
    setDiscarded(false)
    masteredSetRef.current = new Set()
    refreshStateRef.current = {}
    indexRef.current = 0
    setQuestion(makeQuestion(config, pool, words, new Set<string>(), shareRef.current, {}, 0))
  }, [config, pool, words])

  // Range change (new segment) → fresh round
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    resetRound()
  }, [pool]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: h reveals hint (encoding only), p toggles pause (blocked when
  // typing in an input or when an overlay is covering the drill)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || isOverlayOpen()) return
      if (config.showHint && (e.key === 'h' || e.key === 'H') && !hintUsed) setHintUsed(true)
      if (e.key === 'p' || e.key === 'P') togglePause()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [config.showHint, hintUsed, togglePause])

  const handleAnswer = useCallback((value: string) => {
    if (answered !== null || paused) return
    const ms = elapsedMs()
    const correct = config.isCorrect(value, question.answer)
    setAnswered(value)
    setAnsweredCorrect(correct)
    setLastMs(ms)

    // Idle / walked-away answer (and pause wasn't used) → discard, don't record
    if (!wasPaused() && ms > STALE_MS) {
      setDiscarded(true)
      setTimeout(() => next(question.number), 1500)
      return
    }

    const chars = answerMode === 'typing' ? question.answer.length : 0
    const adjusted = adjustLatency(ms, answerMode, chars)
    const hinted = config.showHint && hintUsed
    recordFull(config.dir, question.number, correct, ms, answerMode, hinted, chars)
    if (correct) {
      setSessionCorrect(c => c + 1)
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n })
    } else {
      setSessionWrong(w => w + 1)
      setStreak(0)
    }
    // Derive mastery before/after this answer to drive the per-session refresh
    // scheduler (roundStats itself updates async, so compute the next map here).
    const fastMs = masteryFastMs(settings.masteryLatencyFactor)
    const wasMastered = masteredSetRef.current.has(question.number)
    const newStats = applyRoundAttempt(roundStats, question.number, {
      ok: correct, rawMs: ms, adjustedMs: adjusted, hinted,
    })
    const isNowMastered = isMastered(newStats[question.number], fastMs)
    setRoundStats(newStats)
    refreshStateRef.current = noteServed(
      refreshStateRef.current, question.number, indexRef.current, wasMastered, isNowMastered,
    )
    indexRef.current += 1
    setTimeout(() => next(question.number), 1500)
  }, [answered, paused, question, answerMode, config, recordFull, next, hintUsed, elapsedMs, wasPaused, roundStats, settings.masteryLatencyFactor])

  // Round mastery — how well the full selected set is known
  const { mastered, total, masteredSet } = masteryProgress(pool, roundStats, masteryFastMs(settings.masteryLatencyFactor))
  masteredSetRef.current = masteredSet
  shareRef.current = settings.sessionUnmasteredShare
  const setComplete = total > 0 && mastered === total
  const width = high - low + 1
  const nextLow = high < 99 ? high + 1 : 0
  const nextHigh = high < 99 ? Math.min(99, high + width) : Math.min(99, width - 1)
  const fmt2 = (v: number) => String(v).padStart(2, '0')
  const startNextSet = () => { setLow(nextLow); setHigh(nextHigh) }

  const [sessionPhase, setSessionPhase] = useState<'drilling' | 'summary'>('drilling')

  // Intercept Escape before App.tsx's handler: show session summary when ≥5 answers recorded.
  // Uses capture phase so it fires before the bubble-phase goHome handler in App.tsx.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isOverlayOpen()) return
      if (sessionPhase === 'drilling' && sessionCorrect + sessionWrong >= 5 && answered === null) {
        e.stopImmediatePropagation()
        setSessionPhase('summary')
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [sessionPhase, sessionCorrect, sessionWrong, answered])

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4'

  if (sessionPhase === 'summary') {
    const totalAnswered = sessionCorrect + sessionWrong
    const accuracy = totalAnswered > 0 ? Math.round((sessionCorrect / totalAnswered) * 100) : 0
    return (
      <div className="flex flex-col gap-6 py-8 max-w-md mx-auto">
        <div className="text-center space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Session</p>
          <p className="text-3xl font-bold text-zinc-100 tabular-nums">{totalAnswered} answers</p>
        </div>
        <div className="space-y-3 text-base">
          <div className="flex justify-between items-baseline border-b border-zinc-800 pb-3">
            <span className="text-zinc-400">Accuracy</span>
            <span className="font-bold text-zinc-100 tabular-nums">{accuracy}%</span>
          </div>
          <div className="flex justify-between items-baseline border-b border-zinc-800 pb-3">
            <span className="text-zinc-400">Best streak</span>
            <span className="font-bold text-zinc-100 tabular-nums">{bestStreak}</span>
          </div>
          {total > 0 && (
            <div className="flex justify-between items-baseline border-b border-zinc-800 pb-3">
              <span className="text-zinc-400">Mastered this session</span>
              <span className={`font-bold tabular-nums ${mastered > 0 ? 'text-green-400' : 'text-zinc-500'}`}>{mastered}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setSessionPhase('drilling')}
            className="w-full min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            Keep drilling
          </button>
          <p className="text-center text-sm text-zinc-500">Press Esc or tap ← to go home</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {showStats && (
        <div className="hidden xl:block fixed left-0 top-14 bottom-0 w-56 bg-zinc-900 border-r border-zinc-800 overflow-y-auto z-30 p-4">
          <RoundStatsPanel stats={roundStats} pool={pool} dir={config.dir} low={low} high={high} onRestart={resetRound} />
        </div>
      )}
      {showKey && (
        <div className="hidden xl:block fixed right-0 top-14 bottom-0 w-64 bg-zinc-900 border-l border-zinc-800 overflow-y-auto z-30 p-5">
          <SoundKeyPanel />
        </div>
      )}

      <div className="flex flex-col items-center gap-6 py-4">

        {/* Question — dominant, first */}
        <div className="text-center space-y-2">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">{config.promptLabel}</p>
          <div className={`${config.promptClass} ${paused ? 'blur-md select-none' : ''}`}>
            {question.prompt}
          </div>
        </div>

        {config.showHint && !paused && (
          <HintButton
            word={question.answer}
            revealed={hintUsed}
            onReveal={() => setHintUsed(true)}
          />
        )}

        {/* Answer area — immediately after the question */}
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
              correctAnswer={question.answer}
              onAnswer={handleAnswer}
              answered={answered}
            />
          ) : (
            <TypingInput
              onAnswer={handleAnswer}
              answeredCorrect={answeredCorrect}
              correctAnswer={question.answer}
              placeholder={config.inputPlaceholder}
              numeric={config.inputNumeric}
            />
          )}
          {answered !== null && lastMs !== null && (
            discarded ? (
              <p className="text-center text-sm text-zinc-500">
                Not counted — timer ran too long (use ⏸ Pause)
              </p>
            ) : (
              <p className={`text-center text-sm font-mono tabular-nums ${
                recallColor(adjustLatency(lastMs, answerMode, answerMode === 'typing' ? question.answer.length : 0))
              }`}>
                {(lastMs / 1000).toFixed(1)}s
              </p>
            )
          )}
        </div>

        {/* Score and progress — natural eye rest after answering */}
        <ScoreBar correct={sessionCorrect} wrong={sessionWrong} streak={streak} bestStreak={bestStreak} />

        {!customPool && total > 0 && (
          <div className="w-full max-w-md -mt-2">
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

        {/* Config — moved to bottom so it doesn't precede the question */}
        {!customPool && (
          <div className="w-full max-w-md space-y-3 pt-4 border-t border-zinc-800/60">
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
            <RoundStatsPanel stats={roundStats} pool={pool} dir={config.dir} low={low} high={high} onRestart={resetRound} />
          </div>
        )}
        {showKey && (
          <div className={`xl:hidden w-full max-w-md ${panelCls}`}>
            <SoundKeyPanel />
          </div>
        )}
      </div>
    </>
  )
}
