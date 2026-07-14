import { useState, useCallback, useRef, useEffect } from 'react'
import { useWords } from '../../context/WordsContext'
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

interface NqResult { typed: string; ok: boolean }

interface Props {
  answerMode: AnswerMode
}

export function PiDrill({ answerMode }: Props) {
  const { words } = useWords()

  const [drillType, setDrillType] = useState<DrillType>(() =>
    readLS(DRILLTYPE_KEY) === 'number-quiz' ? 'number-quiz' : 'word-chain')

  const [maxPiPairs, setMaxPiPairs] = useState<number>(() => {
    const v = parseInt(readLS(MAX_PAIRS_KEY) ?? '', 10)
    return v >= 10 && v <= PI_PAIRS.length ? v : 50
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
  const [recallText, setRecallText] = useState('')
  const [submitted, setSubmitted] = useState<string[]>([])

  // ── number-quiz state ─────────────────────────────────────────────────────
  const [nqIdx, setNqIdx] = useState(0)
  const [nqAnswered, setNqAnswered] = useState<string | null>(null)
  const [nqAnsweredCorrect, setNqAnsweredCorrect] = useState<boolean | null>(null)
  const [nqOptions, setNqOptions] = useState<string[]>([])
  const [nqResults, setNqResults] = useState<NqResult[]>([])
  const historyEndRef = useRef<HTMLDivElement>(null)

  const [wqResults, setWqResults] = useState<NqResult[]>([])
  const wqHistoryEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [nqResults.length])

  useEffect(() => {
    wqHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [wqResults.length])

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
      setWqOptions(wordMcOptions(seq[0], words))
      setWqResults([])
      setRecallText('')
      setSubmitted([])
      setPhase('study')
    } else {
      setNqIdx(0)
      setNqAnswered(null)
      setNqAnsweredCorrect(null)
      setNqOptions(numberMcOptions(seq[0], seq))
      setNqResults([])
      setPhase('number-quiz')
    }
  }, [selAnchor, selEnd, drillType, maxPiPairs, words])

  // ── word-chain handlers ───────────────────────────────────────────────────
  const advanceStudy = useCallback(() => {
    setStudyIdx(prev => {
      const next = prev + 1
      if (next >= sequence.length) {
        setPhase('recall')
        return prev
      }
      setWqAnswered(null)
      setWqCorrect(null)
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
    setTimeout(advanceStudy, 1200)
  }, [wqAnswered, words, sequence, studyIdx, advanceStudy])

  const submitRecall = useCallback(() => {
    const tokens = recallText.trim().split(/\s+/).filter(Boolean)
    setSubmitted(tokens)
    setPhase('result')
  }, [recallText])

  // ── number-quiz handlers ──────────────────────────────────────────────────
  const advanceNumberQuiz = useCallback((typed: string, ok: boolean) => {
    setNqResults(prev => [...prev, { typed, ok }])
    const nextIdx = nqIdx + 1
    const delay = ok ? 100 : 1200
    if (nextIdx >= sequence.length) {
      setTimeout(() => setPhase('result'), delay)
    } else {
      setTimeout(() => {
        setNqAnswered(null)
        setNqAnsweredCorrect(null)
        setNqOptions(numberMcOptions(sequence[nextIdx], sequence))
        setNqIdx(nextIdx)
      }, delay)
    }
  }, [nqIdx, sequence])

  const handleNumberAnswer = useCallback((value: string) => {
    if (nqAnswered !== null) return
    const ok = value.trim() === sequence[nqIdx]
    setNqAnswered(value)
    setNqAnsweredCorrect(ok)
    advanceNumberQuiz(value, ok)
  }, [nqAnswered, sequence, nqIdx, advanceNumberQuiz])

  // ── result counts ─────────────────────────────────────────────────────────
  const wordCorrectCount = sequence.reduce((acc, num, i) => {
    const typed = submitted[i] ?? ''
    return acc + (typed.toLowerCase() === words[num]?.toLowerCase() ? 1 : 0)
  }, 0)
  const nqCorrectCount = nqResults.filter(r => r.ok).length

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
                  max={PI_PAIRS.length}
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

      {/* ── STUDY (word-chain, word-quiz only) ── */}
      {phase === 'study' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {progressDots(studyIdx)}
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Pair {sessionAnchor + studyIdx} of π</p>
            <p className="text-xs text-zinc-700">decimal digits {(sessionAnchor + studyIdx - 1) * 2 + 1}–{(sessionAnchor + studyIdx - 1) * 2 + 2}</p>
          </div>
          <div className="text-[6rem] font-black text-cyan-400 tabular-nums leading-none">
            {sequence[studyIdx]}
          </div>
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

      {/* ── RECALL (word-chain) ── */}
      {phase === 'recall' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Recall the chain</p>
            <p className="text-sm text-zinc-400">Type all {sequence.length} words in order</p>
          </div>
          <textarea
            autoFocus
            value={recallText}
            onChange={e => setRecallText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitRecall() }}
            rows={Math.min(6, Math.ceil(sequence.length / 3))}
            placeholder="tyre, towel, pin …  (space-separated)"
            className="w-full px-5 py-4 rounded-xl border border-zinc-700 focus:border-cyan-500 bg-zinc-800 outline-none text-lg text-zinc-100 placeholder-zinc-600 resize-none"
          />
          <button
            onClick={submitRecall}
            disabled={!recallText.trim()}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >Check →</button>
          <p className="text-xs text-zinc-500">Tip: ⌘/Ctrl + Enter to submit</p>
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
            {wordCorrectCount === sequence.length ? '🎉 Perfect!' : `${wordCorrectCount}/${sequence.length} correct`}
          </h3>
          <div className="space-y-1.5">
            {sequence.map((num, i) => {
              const expected = words[num]
              const typed = submitted[i] ?? ''
              const ok = typed.toLowerCase() === expected?.toLowerCase()
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                  ok ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className="text-xs text-zinc-600 tabular-nums w-8 shrink-0">#{sessionAnchor + i}</span>
                  <span className="font-mono text-sm text-cyan-400 tabular-nums w-6 shrink-0">{num}</span>
                  <span className="font-semibold text-zinc-100 shrink-0">{expected}</span>
                  {!ok && <span className="text-sm text-red-300 ml-auto truncate">you: {typed || '—'}</span>}
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
            {nqCorrectCount === sequence.length ? '🎉 Perfect!' : `${nqCorrectCount}/${sequence.length} correct`}
          </h3>
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
