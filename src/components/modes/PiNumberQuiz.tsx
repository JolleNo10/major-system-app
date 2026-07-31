import { useState, useCallback, useRef, useEffect } from 'react'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { PiBatchInput } from '../PiBatchInput'
import { shuffle, pickDistractors } from '../../utils/quiz'
import { summarizeBatchTimings, type BatchTiming } from '../../utils/numericInput'
import { addAttemptRaw } from '../../data/attemptStore'
import { addPiSession } from '../../data/piStats'
import type { AnswerMode } from '../../types'

export type AnswerSize = 1 | 10

function numberMcOptions(number: string, pool: string[]): string[] {
  const others = pickDistractors(number, pool)
  return shuffle([number, ...others])
}

interface NqResult { typed: string; ok: boolean; ms?: number }

interface Props {
  answerMode: AnswerMode
  answerSize: AnswerSize
  sequence: string[]
  anchor: number                 // 1-indexed π position of sequence[0]
  words: Record<string, string>
  onExit: () => void             // leave the quiz (back to setup / weak list)
  exitLabel?: string             // label for the secondary result button
  recordSession?: boolean        // append a PiSession to run-history on finish
  onPairAnswered?: (pos: number, ok: boolean, ms: number) => void
}

// The shared Pi recite engine: given a fixed sequence + anchor, run the
// number-quiz (single-pair or 10-pair batch, MC or typing) → result screen.
// Every answered pair records a `pi:<pos>` attempt and is forwarded to
// `onPairAnswered`; a PiSession is recorded on finish only when requested.
export function PiNumberQuiz({
  answerMode, answerSize, sequence, anchor, words,
  onExit, exitLabel = 'Settings', recordSession = false, onPairAnswered,
}: Props) {
  const [phase, setPhase] = useState<'quiz' | 'result'>('quiz')
  const [nqIdx, setNqIdx] = useState(0)
  const [nqAnswered, setNqAnswered] = useState<string | null>(null)
  const [nqAnsweredCorrect, setNqAnsweredCorrect] = useState<boolean | null>(null)
  const [nqOptions, setNqOptions] = useState<string[]>(() => numberMcOptions(sequence[0], sequence))
  const [nqResults, setNqResults] = useState<NqResult[]>([])
  const [nqBatchCorrect, setNqBatchCorrect] = useState<boolean[] | null>(null)
  const [nqBatchTimings, setNqBatchTimings] = useState<BatchTiming[]>([])
  const nqStartedAtRef = useRef<number>(performance.now())
  const previousAnswerModeRef = useRef(answerMode)
  const historyEndRef = useRef<HTMLDivElement>(null)
  const sessionRecordedRef = useRef(false)

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [nqResults.length])

  // Toggling MC/typing mid-question rebuilds the options for the current pair.
  useEffect(() => {
    const modeChanged = previousAnswerModeRef.current !== answerMode
    previousAnswerModeRef.current = answerMode
    if (!modeChanged || phase !== 'quiz' || nqAnswered !== null) return
    setNqAnsweredCorrect(null)
    setNqBatchCorrect(null)
    setNqOptions(numberMcOptions(sequence[nqIdx], sequence))
    nqStartedAtRef.current = performance.now()
  }, [answerMode, phase, nqAnswered, nqIdx, sequence])

  const advanceNumberQuiz = useCallback((typedValues: string[], correctness: boolean[], ms: number) => {
    const isSinglePair = typedValues.length === 1
    const at = Date.now()
    const perPairMs = isSinglePair ? ms : ms / typedValues.length
    typedValues.forEach((_, index) => {
      const pos = anchor + nqIdx + index
      void addAttemptRaw(`pi:${pos}`, { at, ok: correctness[index], ms: perPairMs })
      onPairAnswered?.(pos, correctness[index], perPairMs)
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
  }, [nqIdx, sequence, anchor, onPairAnswered])

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

  const restart = useCallback(() => {
    sessionRecordedRef.current = false
    setNqIdx(0)
    setNqAnswered(null)
    setNqAnsweredCorrect(null)
    setNqBatchCorrect(null)
    setNqOptions(numberMcOptions(sequence[0], sequence))
    setNqResults([])
    setNqBatchTimings([])
    nqStartedAtRef.current = performance.now()
    setPhase('quiz')
  }, [sequence])

  const nqCorrectCount = nqResults.filter(r => r.ok).length
  const nqTimingStats = summarizeBatchTimings(nqBatchTimings)
  const nqTotalMs = nqTimingStats.totalMs
  const nqAnsweredCount = nqResults.length
  const nqPairsPerSec = nqTimingStats.pairsPerSec
  const nqAvgMs = nqTimingStats.averagePairMs
  const nqSlowestMs = nqTimingStats.slowestBatchMs
  // Only a flawless run reads 100%; otherwise cap at 99 so a single miss (e.g.
  // 219/220 = 99.5%) can't round up to a misleading "100%" / green "perfect" run.
  const nqAccuracy = nqAnsweredCount === 0 ? 0
    : nqCorrectCount === nqAnsweredCount ? 100
    : Math.min(99, Math.round((nqCorrectCount / nqAnsweredCount) * 100))
  const nqMistakes = nqAnsweredCount - nqCorrectCount
  const nqReach = (() => {
    let n = 0
    for (const r of nqResults) { if (r.ok) n++; else break }
    return n
  })()

  useEffect(() => {
    if (phase !== 'result' || sessionRecordedRef.current) return
    sessionRecordedRef.current = true
    if (!recordSession) return
    addPiSession({
      at: Date.now(),
      anchor,
      pairs: sequence.length,
      correctPairs: nqCorrectCount,
      reach: nqReach,
      totalMs: nqTotalMs,
      pairsPerSec: nqPairsPerSec,
      accuracy: nqAccuracy,
      answerMode,
      answerSize,
    })
  }, [phase, recordSession, anchor, sequence.length, nqCorrectCount, nqReach,
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

  const progressDots = (idx: number, results: NqResult[]) => (
    <div className="flex gap-1 items-center flex-wrap justify-center">
      {sequence.map((_, i) => {
        let color = 'bg-zinc-700'
        if (i === idx) color = 'bg-cyan-500'
        else if (i < idx) color = results[i]?.ok ? 'bg-green-500' : 'bg-red-500'
        return <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${color}`} />
      })}
    </div>
  )

  if (phase === 'result') {
    return (
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
                <span className="text-xs text-zinc-600 tabular-nums w-8 shrink-0">#{anchor + i}</span>
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
          <button onClick={restart} className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">Try again</button>
          <button onClick={onExit} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors">{exitLabel}</button>
        </div>
      </div>
    )
  }

  return (
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
            ? `pairs ${anchor + nqIdx}–${anchor + Math.min(nqIdx + 10, sequence.length) - 1} of π`
            : `decimal digits ${(anchor + nqIdx - 1) * 2 + 1}–${(anchor + nqIdx - 1) * 2 + 2} of π`}
        </p>
      </div>
      {!(answerMode === 'typing' && answerSize === 10) && (
        <div className="text-[4rem] font-black text-zinc-400 tabular-nums leading-none">
          Pair {anchor + nqIdx}
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
                <span className="text-zinc-600 tabular-nums text-xs w-8 shrink-0">#{anchor + i}</span>
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
  )
}
