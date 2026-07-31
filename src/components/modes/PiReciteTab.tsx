import { useState, useCallback, useRef, useEffect } from 'react'
import { useWords } from '../../context/WordsContext'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { PiBatchInput } from '../PiBatchInput'
import { readString, safeSet } from '../../utils/storage'
import { shuffle, pickDistractors } from '../../utils/quiz'
import { summarizeBatchTimings, type BatchTiming } from '../../utils/numericInput'
import { PI_PAIRS } from '../../data/piDigits'
import { addAttemptRaw } from '../../data/attemptStore'
import {
  loadPiSessions, addPiSession, bestFromStartReach, type PiSession,
} from '../../data/piStats'
import type { AnswerMode } from '../../types'

const SEL_START_KEY = 'major-pi-sel-start'
const SEL_END_KEY = 'major-pi-sel-end'
const ANSWER_SIZE_KEY = 'major-pi-answer-size'

const PAIRS_PER_ROW = 10

type Phase = 'setup' | 'number-quiz' | 'result'
type AnswerSize = 1 | 10

function numberMcOptions(number: string, pool: string[]): string[] {
  const others = pickDistractors(number, pool)
  return shuffle([number, ...others])
}

interface NqResult { typed: string; ok: boolean; ms?: number }
interface Props { answerMode: AnswerMode; maxPiPairs: number }

export function PiReciteTab({ answerMode, maxPiPairs }: Props) {
  const { words } = useWords()

  const [answerSize, setAnswerSize] = useState<AnswerSize>(() =>
    readString(ANSWER_SIZE_KEY) === '10' ? 10 : 1)

  const [selAnchor, setSelAnchor] = useState<number | null>(() => {
    const v = parseInt(readString(SEL_START_KEY) ?? '', 10)
    return v >= 1 && v <= PI_PAIRS.length ? v : 1
  })
  const [selEnd, setSelEnd] = useState<number | null>(() => {
    const v = parseInt(readString(SEL_END_KEY) ?? '', 10)
    return v >= 1 && v <= PI_PAIRS.length ? v : 10
  })

  const [sessionAnchor, setSessionAnchor] = useState(1)
  const [phase, setPhase] = useState<Phase>('setup')
  const [sequence, setSequence] = useState<string[]>([])

  const [nqIdx, setNqIdx] = useState(0)
  const [nqAnswered, setNqAnswered] = useState<string | null>(null)
  const [nqAnsweredCorrect, setNqAnsweredCorrect] = useState<boolean | null>(null)
  const [nqOptions, setNqOptions] = useState<string[]>([])
  const [nqResults, setNqResults] = useState<NqResult[]>([])
  const [nqBatchCorrect, setNqBatchCorrect] = useState<boolean[] | null>(null)
  const [nqBatchTimings, setNqBatchTimings] = useState<BatchTiming[]>([])
  const nqStartedAtRef = useRef<number>(0)
  const previousAnswerModeRef = useRef(answerMode)
  const historyEndRef = useRef<HTMLDivElement>(null)
  const sessionRecordedRef = useRef(false)

  const [piSessions, setPiSessions] = useState<PiSession[]>(() => loadPiSessions())

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [nqResults.length])

  useEffect(() => {
    const modeChanged = previousAnswerModeRef.current !== answerMode
    previousAnswerModeRef.current = answerMode
    if (!modeChanged || phase !== 'number-quiz' || nqAnswered !== null) return
    setNqAnsweredCorrect(null)
    setNqBatchCorrect(null)
    setNqOptions(numberMcOptions(sequence[nqIdx], sequence))
    nqStartedAtRef.current = performance.now()
  }, [answerMode, phase, nqAnswered, nqIdx, sequence])

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

  const start = useCallback(() => {
    if (selAnchor === null || selEnd === null) return
    safeSet(SEL_START_KEY, String(selAnchor))
    safeSet(SEL_END_KEY, String(selEnd))
    safeSet(ANSWER_SIZE_KEY, String(answerSize))
    const seq = PI_PAIRS.slice(selAnchor - 1, selEnd)
    setSequence(seq)
    setSessionAnchor(selAnchor)
    sessionRecordedRef.current = false
    setNqIdx(0)
    setNqAnswered(null)
    setNqAnsweredCorrect(null)
    setNqBatchCorrect(null)
    setNqOptions(numberMcOptions(seq[0], seq))
    setNqResults([])
    setNqBatchTimings([])
    nqStartedAtRef.current = performance.now()
    setPhase('number-quiz')
  }, [selAnchor, selEnd, maxPiPairs, answerSize])

  const advanceNumberQuiz = useCallback((typedValues: string[], correctness: boolean[], ms: number) => {
    const isSinglePair = typedValues.length === 1
    const at = Date.now()
    const perPairMs = isSinglePair ? ms : ms / typedValues.length
    typedValues.forEach((_, index) => {
      const pos = sessionAnchor + nqIdx + index
      void addAttemptRaw(`pi:${pos}`, { at, ok: correctness[index], ms: perPairMs })
    })
    setNqResults(prev => [
      ...prev,
      ...typedValues.map((typed, index) => ({
        typed,
        ok: correctness[index],
        ms: isSinglePair ? ms : undefined,
      })),
    ])
    setNqBatchTimings(prev => [...prev, { pairCount: typedValues.length, ms }])
    const nextIdx = nqIdx + typedValues.length
    const delay = correctness.every(Boolean) ? 100 : 1200
    if (nextIdx >= sequence.length) {
      setTimeout(() => setPhase('result'), delay)
    } else {
      setTimeout(() => {
        setNqAnswered(null)
        setNqAnsweredCorrect(null)
        setNqBatchCorrect(null)
        setNqOptions(numberMcOptions(sequence[nextIdx], sequence))
        nqStartedAtRef.current = performance.now()
        setNqIdx(nextIdx)
      }, delay)
    }
  }, [nqIdx, sequence, sessionAnchor])

  const handleNumberAnswer = useCallback((value: string) => {
    if (nqAnswered !== null) return
    const ok = value.trim() === sequence[nqIdx]
    const ms = Math.max(0, performance.now() - nqStartedAtRef.current)
    setNqAnswered(value)
    setNqAnsweredCorrect(ok)
    advanceNumberQuiz([value], [ok], ms)
  }, [nqAnswered, sequence, nqIdx, advanceNumberQuiz])

  const handleNumberBatchAnswer = useCallback((values: string[]) => {
    if (nqAnswered !== null) return
    const expected = sequence.slice(nqIdx, nqIdx + values.length)
    const correctness = values.map((value, index) => value === expected[index])
    const ms = Math.max(0, performance.now() - nqStartedAtRef.current)
    setNqAnswered(values.join(' '))
    setNqAnsweredCorrect(correctness.every(Boolean))
    setNqBatchCorrect(correctness)
    advanceNumberQuiz(values, correctness, ms)
  }, [nqAnswered, sequence, nqIdx, advanceNumberQuiz])

  const nqCorrectCount = nqResults.filter(r => r.ok).length
  const nqTimingStats = summarizeBatchTimings(nqBatchTimings)
  const nqTotalMs = nqTimingStats.totalMs
  const nqAnsweredCount = nqResults.length
  const nqPairsPerSec = nqTimingStats.pairsPerSec
  const nqAvgMs = nqTimingStats.averagePairMs
  const nqSlowestMs = nqTimingStats.slowestBatchMs
  const nqAccuracy = nqAnsweredCount > 0 ? Math.round((nqCorrectCount / nqAnsweredCount) * 100) : 0
  const nqMistakes = nqAnsweredCount - nqCorrectCount
  const nqReach = (() => {
    let n = 0
    for (const r of nqResults) { if (r.ok) n++; else break }
    return n
  })()

  useEffect(() => {
    if (phase !== 'result' || sessionRecordedRef.current) return
    sessionRecordedRef.current = true
    addPiSession({
      at: Date.now(),
      anchor: sessionAnchor,
      pairs: sequence.length,
      correctPairs: nqCorrectCount,
      reach: nqReach,
      totalMs: nqTotalMs,
      pairsPerSec: nqPairsPerSec,
      accuracy: nqAccuracy,
      answerMode,
      answerSize,
    })
    setPiSessions(loadPiSessions())
  }, [phase, sessionAnchor, sequence.length, nqCorrectCount, nqReach,
      nqTotalMs, nqPairsPerSec, nqAccuracy, answerMode, answerSize])

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
    <div className="flex flex-col items-center gap-6 py-4 w-full">

      {/* SETUP */}
      {phase === 'setup' && (
        <div className={`w-full max-w-lg space-y-6 p-6 ${panelCls}`}>

          {answerMode === 'typing' && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-zinc-300">Pairs per answer</span>
              <div className="grid grid-cols-2 gap-2">
                {([1, 10] as AnswerSize[]).map(size => (
                  <button
                    key={size}
                    onClick={() => {
                      setAnswerSize(size)
                      safeSet(ANSWER_SIZE_KEY, String(size))
                    }}
                    className={`px-4 py-3 rounded-lg border text-sm font-semibold transition-colors ${
                      answerSize === size
                        ? 'bg-cyan-600/20 border-cyan-500 text-zinc-100'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {size === 1 ? '1 pair' : '10 pairs'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-300">Select segment</span>
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

      {/* PI RUN HISTORY */}
      {phase === 'setup' && piSessions.length > 0 && (
        <div className={`w-full max-w-lg space-y-4 p-6 ${panelCls}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-zinc-300">Your runs</span>
            <span className="text-xs text-zinc-600 tabular-nums">{piSessions.length} recorded</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-600/10 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-cyan-600">Best from π #1</div>
              <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-cyan-300">
                {bestFromStartReach(piSessions) * 2} digits of π
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">Best pairs/sec</div>
              <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-zinc-100">
                {formatRate(Math.max(...piSessions.map(s => s.pairsPerSec)))}
              </div>
            </div>
          </div>
          <div className="space-y-0.5">
            {[...piSessions].slice(-8).reverse().map(s => (
              <div key={s.at} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs">
                <span className="text-zinc-600 tabular-nums shrink-0 w-16">
                  {new Date(s.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <span className="font-mono text-zinc-400 tabular-nums shrink-0 w-20">
                  π #{s.anchor}–{s.anchor + s.pairs - 1}
                </span>
                <span className="text-cyan-400 tabular-nums shrink-0" title="Reach (consecutive correct from start)">
                  ⟶ {s.reach * 2}d
                </span>
                <span className="ml-auto flex items-center gap-2.5 tabular-nums shrink-0">
                  <span className={s.accuracy === 100 ? 'text-green-400' : 'text-zinc-400'}>{s.accuracy}%</span>
                  <span className="text-zinc-500 font-mono w-10 text-right">{formatRate(s.pairsPerSec)}/s</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NUMBER QUIZ */}
      {phase === 'number-quiz' && (
        <div className={`flex flex-col items-center gap-5 w-full ${
          answerMode === 'typing' && answerSize === 10 ? 'max-w-2xl' : 'max-w-md'
        }`}>
          {progressDots(nqIdx, nqResults)}
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">
              {answerMode === 'typing' && answerSize === 10 ? 'What are the next digits?' : 'What are the digits?'}
            </p>
            <p className="text-xs text-zinc-700">
              {answerMode === 'typing' && answerSize === 10
                ? `pairs ${sessionAnchor + nqIdx}–${sessionAnchor + Math.min(nqIdx + 10, sequence.length) - 1} of π`
                : `decimal digits ${(sessionAnchor + nqIdx - 1) * 2 + 1}–${(sessionAnchor + nqIdx - 1) * 2 + 2} of π`}
            </p>
          </div>
          {!(answerMode === 'typing' && answerSize === 10) && (
            <div className="text-[4rem] font-black text-zinc-400 tabular-nums leading-none">
              Pair {sessionAnchor + nqIdx}
            </div>
          )}
          <div className="w-full">
            {answerMode === 'multiple-choice' ? (
              <MultipleChoice
                key={nqIdx}
                options={nqOptions}
                correctAnswer={sequence[nqIdx]}
                onAnswer={handleNumberAnswer}
                answered={nqAnswered}
              />
            ) : answerSize === 10 ? (
              <PiBatchInput
                key={nqIdx}
                expected={sequence.slice(nqIdx, nqIdx + 10)}
                answeredCorrect={nqBatchCorrect}
                onAnswer={handleNumberBatchAnswer}
              />
            ) : (
              <TypingInput
                key={nqIdx}
                onAnswer={handleNumberAnswer}
                answeredCorrect={nqAnsweredCorrect}
                correctAnswer={sequence[nqIdx]}
                placeholder="e.g. 14"
                numeric
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

      {/* RESULT */}
      {phase === 'result' && (
        <div className="w-full max-w-md space-y-4">
          <h3 className="text-xl font-bold text-center text-zinc-100">
            {formatResultSummary(nqCorrectCount)}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([
              ['Reach', `${nqReach * 2} digits`],
              ['Total time', formatSec(nqTotalMs)],
              ['Pairs/sec', formatRate(nqPairsPerSec)],
              ['Avg / pair', formatSec(nqAvgMs)],
              [nqTimingStats.hasMultiPairBatch ? 'Slowest batch' : 'Slowest', formatSec(nqSlowestMs)],
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
