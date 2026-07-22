import { useState, useCallback, useRef, useEffect } from 'react'
import { useWords } from '../../context/WordsContext'
import { useSettings } from '../../context/SettingsContext'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { safeSet } from '../../utils/storage'
import { shuffle, pickDistractors } from '../../utils/quiz'
import { PI_PAIRS } from '../../data/piDigits'
import type { AnswerMode } from '../../types'

// Two drill modes:
//   word-chain  — study→recall→result  (memorise words for each pair, then recall the chain)
//   number-quiz — sequential quiz      (enter the 2-digit number for each position in order)

const SEL_START_KEY = 'major-pi-sel-start'
const SEL_END_KEY = 'major-pi-sel-end'
const DRILLTYPE_KEY = 'major-pi-drilltype'
const MAX_PAIRS_KEY = 'major-pi-max-pairs'

const PAIRS_PER_ROW = 10

type DrillType = 'word-chain' | 'number-quiz'
type Phase = 'setup' | 'study' | 'recall' | 'number-quiz' | 'result'

function readLS(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function wordMcOptions(number: string, words: Record<string, string>): string[] {
  const others = pickDistractors(number, Object.keys(words))
  return shuffle([words[number], ...others.map(n => words[n])])
}

function numberMcOptions(number: string, pool: string[]): string[] {
  const others = pickDistractors(number, pool)
  return shuffle([number, ...others])
}

interface NqResult { typed: string; ok: boolean; ms?: number }

interface Props {
  answerMode: AnswerMode
}

export function PiDrill({ answerMode }: Props) {
  const { words } = useWords()
  const { settings } = useSettings()
  const settingsMaxPairs = Math.floor(settings.maxPiDigits / 2)

  const [drillType, setDrillType] = useState<DrillType>(() =>
    readLS(DRILLTYPE_KEY) === 'number-quiz' ? 'number-quiz' : 'word-chain')

  const [maxPiPairs, setMaxPiPairs] = useState<number>(() => {
    const v = parseInt(readLS(MAX_PAIRS_KEY) ?? '', 10)
    const cap = Math.floor(settings.maxPiDigits / 2)
    return v >= 10 && v <= cap ? v : cap
  })

  // Range selection: anchor = first clicked pair (1-indexed), end = second clicked pair
  const [selAnchor, setSelAnchor] = useState<number | null>(() => {
    const v = parseInt(readLS(SEL_START_KEY) ?? '', 10)
    return v >= 1 && v <= PI_PAIRS.length ? v : 1
  })
  const [selEnd, setSelEnd] = useState<number | null>(() => {
    const v = parseInt(readLS(SEL_END_KEY) ?? '', 10)
    return v >= 1 && v <= PI_PAIRS.length ? v : 10
  })

  // Frozen at session start — selAnchor/selEnd may change while in setup without affecting active session
  const [sessionAnchor, setSessionAnchor] = useState(1)

  const [phase, setPhase] = useState<Phase>('setup')
  const [sequence, setSequence] = useState<string[]>([])

  // ── word-chain state ──────────────────────────────────────────────────────
  const [studyIdx, setStudyIdx] = useState(0)
  const [wqAnswered, setWqAnswered] = useState<string | null>(null)
  const [wqCorrect, setWqCorrect] = useState<boolean | null>(null)
  const [wqOptions, setWqOptions] = useState<string[]>([])
  const [wqNumberRevealed, setWqNumberRevealed] = useState(false)

  // ── number-quiz state ─────────────────────────────────────────────────────
  const [nqIdx, setNqIdx] = useState(0)
  const [nqAnswered, setNqAnswered] = useState<string | null>(null)
  const [nqAnsweredCorrect, setNqAnsweredCorrect] = useState<boolean | null>(null)
  const [nqOptions, setNqOptions] = useState<string[]>([])
  const [nqResults, setNqResults] = useState<NqResult[]>([])
  const nqStartedAtRef = useRef<number>(0)
  const historyEndRef = useRef<HTMLDivElement>(null)

  const [wqResults, setWqResults] = useState<NqResult[]>([])
  const wqHistoryEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [nqResults.length])

  useEffect(() => {
    wqHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [wqResults.length])

  useEffect(() => {
    if (maxPiPairs > settingsMaxPairs) setMaxPiPairs(settingsMaxPairs)
  }, [settingsMaxPairs, maxPiPairs])

  // ── segment grid selection ────────────────────────────────────────────────
  const handleSegmentClick = useCallback((segIdx: number) => {
    const firstPair = segIdx * PAIRS_PER_ROW + 1
    const lastPair  = (segIdx + 1) * PAIRS_PER_ROW
    if (selEnd !== null || selAnchor === null) {
      setSelAnchor(firstPair)
      setSelEnd(null)
    } else if (firstPair >= selAnchor) {
      setSelEnd(lastPair)
    } else {
      setSelAnchor(firstPair)
    }
  }, [selAnchor, selEnd])

  // ── start ─────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (selAnchor === null || selEnd === null) return
    safeSet(SEL_START_KEY, String(selAnchor))
    safeSet(SEL_END_KEY, String(selEnd))
    safeSet(DRILLTYPE_KEY, drillType)
    safeSet(MAX_PAIRS_KEY, String(maxPiPairs))
    const seq = PI_PAIRS.slice(selAnchor - 1, selEnd)
    setSequence(seq)
    setSessionAnchor(selAnchor)

    if (drillType === 'word-chain') {
      setStudyIdx(0)
      setWqAnswered(null)
      setWqCorrect(null)
      setWqResults([])
      setPhase('study')
    } else {
      setNqIdx(0)
      setNqAnswered(null)
      setNqAnsweredCorrect(null)
      setNqOptions(numberMcOptions(seq[0], seq))
      setNqResults([])
      nqStartedAtRef.current = performance.now()
      setPhase('number-quiz')
    }
  }, [selAnchor, selEnd, drillType, maxPiPairs])

  // ── word-chain handlers ───────────────────────────────────────────────────
  const advanceRecall = useCallback(() => {
    setStudyIdx(prev => {
      const next = prev + 1
      if (next >= sequence.length) {
        setPhase('result')
        return prev
      }
      setWqAnswered(null)
      setWqCorrect(null)
      setWqNumberRevealed(false)
      setWqOptions(wordMcOptions(sequence[next], words))
      return next
    })
  }, [sequence, words])

  const handleWordQuizAnswer = useCallback((value: string) => {
    if (wqAnswered !== null) return
    const correct = value.toLowerCase().trim() === words[sequence[studyIdx]]?.toLowerCase()
    setWqAnswered(value)
    setWqCorrect(correct)
    setWqResults(prev => [...prev, { typed: value, ok: correct }])
    const delay = correct ? 100 : 1200
    setTimeout(advanceRecall, delay)
  }, [wqAnswered, words, sequence, studyIdx, advanceRecall])

  // ── number-quiz handlers ──────────────────────────────────────────────────
  const advanceNumberQuiz = useCallback((typed: string, ok: boolean, ms: number) => {
    setNqResults(prev => [...prev, { typed, ok, ms }])
    const nextIdx = nqIdx + 1
    const delay = ok ? 100 : 1200
    if (nextIdx >= sequence.length) {
      setTimeout(() => setPhase('result'), delay)
    } else {
      setTimeout(() => {
        setNqAnswered(null)
        setNqAnsweredCorrect(null)
        setNqOptions(numberMcOptions(sequence[nextIdx], sequence))
        nqStartedAtRef.current = performance.now()
        setNqIdx(nextIdx)
      }, delay)
    }
  }, [nqIdx, sequence])

  const handleNumberAnswer = useCallback((value: string) => {
    if (nqAnswered !== null) return
    const ok = value.trim() === sequence[nqIdx]
    const ms = Math.max(0, performance.now() - nqStartedAtRef.current)
    setNqAnswered(value)
    setNqAnsweredCorrect(ok)
    advanceNumberQuiz(value, ok, ms)
  }, [nqAnswered, sequence, nqIdx, advanceNumberQuiz])

  // ── result counts ─────────────────────────────────────────────────────────
  const wordCorrectCount = wqResults.filter(r => r.ok).length
  const nqCorrectCount = nqResults.filter(r => r.ok).length
  const nqTotalMs = nqResults.reduce((sum, r) => sum + (r.ms ?? 0), 0)
  const nqTotalSec = nqTotalMs / 1000
  const nqAnsweredCount = nqResults.length
  const nqPairsPerSec = nqTotalSec > 0 ? nqAnsweredCount / nqTotalSec : 0
  const nqAvgMs = nqAnsweredCount > 0 ? nqTotalMs / nqAnsweredCount : 0
  const nqSlowestMs = nqResults.reduce((max, r) => Math.max(max, r.ms ?? 0), 0)
  const nqAccuracy = nqAnsweredCount > 0 ? Math.round((nqCorrectCount / nqAnsweredCount) * 100) : 0
  const nqMistakes = nqAnsweredCount - nqCorrectCount

  const formatSec = (ms: number) => `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`
  const formatRate = (rate: number) => rate.toFixed(rate < 10 ? 2 : 1)
  const formatResultSummary = (correctPairs: number) => {
    const totalPairs = sequence.length
    const correctDigits = correctPairs * 2
    const totalDigits = totalPairs * 2
    const score = `${correctPairs}/${totalPairs} correct pairs - ${correctDigits}/${totalDigits} digits of pi`
    return correctPairs === totalPairs ? `🎉 Perfect! ${score}` : score
  }

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl'

  const progressDots = (idx: number, results?: NqResult[]) => (
    <div className="flex gap-1 items-center flex-wrap justify-center">
      {sequence.map((_, i) => {
        let color = 'bg-zinc-700'
        if (i === idx) color = 'bg-cyan-500'
        else if (i < idx) {
          color = results
            ? (results[i]?.ok ? 'bg-green-500' : 'bg-red-500')
            : 'bg-green-500'
        }
        return <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${color}`} />
      })}
    </div>
  )

  const numButtons = Math.ceil(maxPiPairs / PAIRS_PER_ROW)

  return (
    <div className="flex flex-col items-center gap-6 py-4">

      {/* ── SETUP ── */}
      {phase === 'setup' && (
        <div className={`w-full max-w-lg space-y-6 p-6 ${panelCls}`}>

          {/* Drill type */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-300">Drill type</span>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['word-chain', 'Word chain', 'Study pairs, then recall the words'],
                ['number-quiz', 'Number quiz', 'Enter the digits at each position'],
              ] as [DrillType, string, string][]).map(([t, label, sub]) => (
                <button
                  key={t}
                  onClick={() => setDrillType(t)}
                  className={`flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors ${
                    drillType === t
                      ? 'bg-cyan-600/20 border-cyan-500 text-zinc-100'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <span className="font-semibold text-sm">{label}</span>
                  <span className="text-xs text-zinc-500">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pi digit grid — one button per 20-digit segment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-300">Select segment</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Max π digits</span>
                <input
                  type="range"
                  min={10}
                  max={settingsMaxPairs}
                  step={10}
                  value={maxPiPairs}
                  onChange={e => {
                    const v = +e.target.value
                    setMaxPiPairs(v)
                    if (selEnd !== null && selEnd > v) setSelEnd(v)
                  }}
                  className="w-24 accent-cyan-500"
                />
                <span className="text-cyan-400 tabular-nums text-xs w-8 text-right">{maxPiPairs * 2}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: numButtons }, (_, segIdx) => {
                const firstPair = segIdx * PAIRS_PER_ROW + 1
                const lastPair  = (segIdx + 1) * PAIRS_PER_ROW
                const startDigit = segIdx * PAIRS_PER_ROW * 2 + 1
                const endDigit   = (segIdx + 1) * PAIRS_PER_ROW * 2
                const inRange = selAnchor !== null && selEnd !== null &&
                                firstPair <= selEnd && lastPair >= selAnchor
                const isAnchor = selEnd === null && selAnchor !== null &&
                                 firstPair <= selAnchor && lastPair >= selAnchor
                const half = PAIRS_PER_ROW / 2
                const line1 = PI_PAIRS.slice(segIdx * PAIRS_PER_ROW, segIdx * PAIRS_PER_ROW + half).join(' ')
                const line2 = PI_PAIRS.slice(segIdx * PAIRS_PER_ROW + half, (segIdx + 1) * PAIRS_PER_ROW).join(' ')
                return (
                  <button
                    key={segIdx}
                    onClick={() => handleSegmentClick(segIdx)}
                    className={`flex flex-col items-start px-2 py-1.5 rounded-lg border transition-colors ${
                      inRange
                        ? 'bg-cyan-600/25 border-cyan-500/60 text-cyan-300'
                        : isAnchor
                        ? 'bg-amber-600/20 border-amber-500/60 text-amber-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-500'
                    }`}
                  >
                    <span className="text-[8px] opacity-60 leading-none tabular-nums">π {startDigit}–{endDigit}</span>
                    <span className="font-mono text-[8px] tabular-nums leading-snug mt-0.5">{line1}</span>
                    <span className="font-mono text-[8px] tabular-nums leading-snug">{line2}</span>
                  </button>
                )
              })}
            </div>

            {/* Selection info */}
            <p className="text-xs text-center pt-1 min-h-[1.25rem]">
              {selAnchor === null ? (
                <span className="text-zinc-700">Click a segment to start selecting</span>
              ) : selEnd === null ? (
                <span className="text-amber-400/80">Pair {selAnchor} — click another to set end</span>
              ) : (
                <span className="text-cyan-400/80">
                  Pairs {selAnchor}–{selEnd} · {selEnd - selAnchor + 1} pairs · digits {2 * selAnchor - 1}–{2 * selEnd}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={start}
            disabled={selAnchor === null || selEnd === null}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >Start →</button>
        </div>
      )}

      {/* ── STUDY (word-chain — memorise the chain) ── */}
      {phase === 'study' && (
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Memorise the chain</p>
            <p className="text-sm text-zinc-500">
              π digits {(sessionAnchor - 1) * 2 + 1}–{(sessionAnchor + sequence.length - 2) * 2 + 2} · {sequence.length} pairs
            </p>
          </div>
          <div className="space-y-1.5">
            {sequence.map((num, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900">
                <span className="text-xs text-zinc-600 tabular-nums w-8 shrink-0">#{sessionAnchor + i}</span>
                <span className="font-mono text-cyan-400 tabular-nums font-bold w-6 shrink-0">{num}</span>
                <span className="font-semibold text-zinc-100">{words[num]}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setStudyIdx(0)
              setWqAnswered(null)
              setWqCorrect(null)
              setWqNumberRevealed(false)
              setWqOptions(wordMcOptions(sequence[0], words))
              setPhase('recall')
            }}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
          >Start recall →</button>
        </div>
      )}

      {/* ── RECALL (word-chain — per-item quiz) ── */}
      {phase === 'recall' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {progressDots(studyIdx, wqResults)}
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Recall the chain</p>
            <p className="text-xs text-zinc-700">
              Pair {sessionAnchor + studyIdx} of π · decimal digits {(sessionAnchor + studyIdx - 1) * 2 + 1}–{(sessionAnchor + studyIdx - 1) * 2 + 2}
            </p>
          </div>
          {wqNumberRevealed ? (
            <div className="text-[6rem] font-black text-cyan-400 tabular-nums leading-none">
              {sequence[studyIdx]}
            </div>
          ) : (
            <button
              onClick={() => setWqNumberRevealed(true)}
              className="w-full py-10 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 hover:border-cyan-500 hover:bg-zinc-800 transition-all text-zinc-400 hover:text-zinc-100 text-sm font-medium"
            >
              Show number
            </button>
          )}
          <div className="w-full space-y-3">
            {answerMode === 'multiple-choice' ? (
              <MultipleChoice
                key={studyIdx}
                options={wqOptions}
                correctAnswer={words[sequence[studyIdx]]}
                onAnswer={handleWordQuizAnswer}
                answered={wqAnswered}
              />
            ) : (
              <TypingInput
                key={studyIdx}
                onAnswer={handleWordQuizAnswer}
                answeredCorrect={wqCorrect}
                correctAnswer={words[sequence[studyIdx]]}
                placeholder="Type the word..."
              />
            )}
            {wqResults.length > 0 && (
              <div className="w-full max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
                <div className="p-2 space-y-0.5">
                  {wqResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${r.ok ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <span className="text-zinc-600 tabular-nums text-xs w-8 shrink-0">#{sessionAnchor + i}</span>
                      <span className={`font-mono tabular-nums font-bold w-6 shrink-0 ${r.ok ? 'text-green-400' : 'text-red-400'}`}>{sequence[i]}</span>
                      <span className="text-zinc-200 text-sm font-semibold shrink-0">{words[sequence[i]]}</span>
                      {!r.ok && <span className="ml-auto text-xs text-red-400 shrink-0">→ {r.typed}</span>}
                      <span className={`${r.ok ? 'ml-auto' : ''} text-xs shrink-0 ${r.ok ? 'text-green-500' : 'text-red-500'}`}>{r.ok ? '✓' : '✗'}</span>
                    </div>
                  ))}
                  <div ref={wqHistoryEndRef} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NUMBER QUIZ ── */}
      {phase === 'number-quiz' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-md">
          {progressDots(nqIdx, nqResults)}

          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">What are the digits?</p>
            <p className="text-xs text-zinc-700">decimal digits {(sessionAnchor + nqIdx - 1) * 2 + 1}–{(sessionAnchor + nqIdx - 1) * 2 + 2} of π</p>
          </div>

          <div className="text-[4rem] font-black text-zinc-400 tabular-nums leading-none">
            Pair {sessionAnchor + nqIdx}
          </div>

          <div className="w-full">
            {answerMode === 'multiple-choice' ? (
              <MultipleChoice
                key={nqIdx}
                options={nqOptions}
                correctAnswer={sequence[nqIdx]}
                onAnswer={handleNumberAnswer}
                answered={nqAnswered}
              />
            ) : (
              <TypingInput
                key={nqIdx}
                onAnswer={handleNumberAnswer}
                answeredCorrect={nqAnsweredCorrect}
                correctAnswer={sequence[nqIdx]}
                placeholder="e.g. 14"
              />
            )}
          </div>

          {nqResults.length > 0 && (
            <div className="w-full max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
              <div className="p-2 space-y-0.5">
                {nqResults.map((r, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                    r.ok ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    <span className="text-zinc-600 tabular-nums text-xs w-8 shrink-0">#{sessionAnchor + i}</span>
                    <span className={`font-mono tabular-nums font-bold w-6 shrink-0 ${r.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {sequence[i]}
                    </span>
                    <span className="text-zinc-500 text-xs truncate">{words[sequence[i]]}</span>
                    {!r.ok && (
                      <span className="ml-auto text-xs text-red-400 tabular-nums shrink-0">
                        → {r.typed}
                      </span>
                    )}
                    <span className={`${r.ok ? 'ml-auto' : ''} text-xs shrink-0 ${r.ok ? 'text-green-500' : 'text-red-500'}`}>
                      {r.ok ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
                <div ref={historyEndRef} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESULT (word-chain) ── */}
      {phase === 'result' && drillType === 'word-chain' && (
        <div className="w-full max-w-md space-y-4">
          <h3 className="text-xl font-bold text-center text-zinc-100">
            {formatResultSummary(wordCorrectCount)}
          </h3>
          <div className="space-y-1.5">
            {sequence.map((num, i) => {
              const expected = words[num]
              const r = wqResults[i]
              const ok = r?.ok ?? false
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                  ok ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className="text-xs text-zinc-600 tabular-nums w-8 shrink-0">#{sessionAnchor + i}</span>
                  <span className="font-mono text-sm text-cyan-400 tabular-nums w-6 shrink-0">{num}</span>
                  <span className="font-semibold text-zinc-100 shrink-0">{expected}</span>
                  {!ok && <span className="text-sm text-red-300 ml-auto truncate">you: {r?.typed || '—'}</span>}
                  <span className={`${ok ? 'text-green-400 ml-auto' : 'text-red-400'} shrink-0`}>{ok ? '✓' : '✗'}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={start} className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">Try again</button>
            <button onClick={() => setPhase('setup')} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors">Settings</button>
          </div>
        </div>
      )}

      {/* ── RESULT (number-quiz) ── */}
      {phase === 'result' && drillType === 'number-quiz' && (
        <div className="w-full max-w-md space-y-4">
          <h3 className="text-xl font-bold text-center text-zinc-100">
            {formatResultSummary(nqCorrectCount)}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([
              ['Total time', formatSec(nqTotalMs)],
              ['Pairs/sec', formatRate(nqPairsPerSec)],
              ['Avg / pair', formatSec(nqAvgMs)],
              ['Slowest', formatSec(nqSlowestMs)],
              ['Accuracy', `${nqAccuracy}%`],
              ['Mistakes', String(nqMistakes)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
                <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-zinc-100">{value}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {sequence.map((num, i) => {
              const r = nqResults[i]
              const ok = r?.ok ?? false
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                  ok ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className="text-xs text-zinc-600 tabular-nums w-8 shrink-0">#{sessionAnchor + i}</span>
                  <span className="font-mono text-sm text-cyan-400 tabular-nums w-6 shrink-0">{num}</span>
                  <span className="text-zinc-400 text-sm shrink-0">{words[num]}</span>
                  {r?.ms !== undefined && (
                    <span className="text-[10px] text-zinc-600 tabular-nums shrink-0">{formatSec(r.ms)}</span>
                  )}
                  {!ok && <span className="text-sm text-red-300 ml-auto tabular-nums shrink-0">you: {r?.typed || '—'}</span>}
                  <span className={`${ok ? 'text-green-400 ml-auto' : 'text-red-400'} shrink-0`}>{ok ? '✓' : '✗'}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={start} className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">Try again</button>
            <button onClick={() => setPhase('setup')} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors">Settings</button>
          </div>
        </div>
      )}
    </div>
  )
}
