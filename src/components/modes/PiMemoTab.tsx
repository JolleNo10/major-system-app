import { useState, useCallback, useRef, useEffect } from 'react'
import { useWords } from '../../context/WordsContext'
import { MultipleChoice } from '../MultipleChoice'
import { TypingInput } from '../TypingInput'
import { readString, safeSet } from '../../utils/storage'
import { buildEncOptions } from '../../utils/quiz'
import { PI_PAIRS } from '../../data/piDigits'
import { PiSegmentGrid, PiSegmentDot } from './PiSegmentGrid'
import { usePiSegmentStatuses } from '../../hooks/usePiSegmentStatuses'
import { segmentDigitRange } from '../../utils/piSegments'
import { ToolLayout } from '../ToolLayout'
import type { AnswerMode } from '../../types'

const MEMO_SEG_KEY = 'major-pi-memo-seg'
const PAIRS_PER_SEG = 10

type Phase = 'setup' | 'study' | 'recall' | 'result'
interface WqResult { typed: string; ok: boolean }
interface Props { answerMode: AnswerMode; maxPiPairs: number }

export function PiMemoTab({ answerMode, maxPiPairs }: Props) {
  const { words } = useWords()

  const maxSegs = Math.floor(maxPiPairs / PAIRS_PER_SEG)

  const [selectedSeg, setSelectedSeg] = useState<number | null>(() => {
    const v = parseInt(readString(MEMO_SEG_KEY) ?? '', 10)
    const maxAvail = Math.floor(PI_PAIRS.length / PAIRS_PER_SEG)
    return v >= 0 && v < maxAvail ? v : null
  })

  const [phase, setPhase] = useState<Phase>('setup')
  const [sequence, setSequence] = useState<string[]>([])
  const [sessionAnchor, setSessionAnchor] = useState(1)

  const statuses = usePiSegmentStatuses(maxPiPairs, phase)
  // "Next to memo" = the first untested segment (ones already recited, even
  // weakly, have clearly been memorised). −1 once everything's been touched.
  const nextSeg = statuses.indexOf('new')

  const [studyIdx, setStudyIdx] = useState(0)
  const [wqAnswered, setWqAnswered] = useState<string | null>(null)
  const [wqCorrect, setWqCorrect] = useState<boolean | null>(null)
  const [wqOptions, setWqOptions] = useState<string[]>([])
  const [wqNumberRevealed, setWqNumberRevealed] = useState(false)
  const [wqResults, setWqResults] = useState<WqResult[]>([])
  const historyEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [wqResults.length])

  const studySegment = useCallback((seg: number) => {
    const anchor = seg * PAIRS_PER_SEG + 1
    setSequence(PI_PAIRS.slice(anchor - 1, anchor - 1 + PAIRS_PER_SEG))
    setSessionAnchor(anchor)
    setSelectedSeg(seg)
    safeSet(MEMO_SEG_KEY, String(seg))
    setPhase('study')
  }, [])

  const start = useCallback(() => {
    if (selectedSeg === null) return
    studySegment(selectedSeg)
  }, [selectedSeg, studySegment])

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
      setWqOptions(buildEncOptions(sequence[next], words))
      return next
    })
  }, [sequence, words])

  const handleAnswer = useCallback((value: string) => {
    if (wqAnswered !== null) return
    const correct = value.toLowerCase().trim() === words[sequence[studyIdx]]?.toLowerCase()
    setWqAnswered(value)
    setWqCorrect(correct)
    setWqResults(prev => [...prev, { typed: value, ok: correct }])
    setTimeout(advanceRecall, correct ? 100 : 1200)
  }, [wqAnswered, words, sequence, studyIdx, advanceRecall])

  const goToSetup = useCallback(() => {
    setStudyIdx(0)
    setWqAnswered(null)
    setWqCorrect(null)
    setWqNumberRevealed(false)
    setWqOptions([])
    setWqResults([])
    setPhase('setup')
  }, [])

  const goToStudy = useCallback(() => {
    setStudyIdx(0)
    setWqAnswered(null)
    setWqCorrect(null)
    setWqNumberRevealed(false)
    setWqOptions([])
    setWqResults([])
    setPhase('study')
  }, [])

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl'

  const progressDots = (idx: number, results?: WqResult[]) => (
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

  return (
    <div className="flex flex-col items-center gap-6 py-4 w-full">

      {/* SETUP */}
      {phase === 'setup' && (
        <ToolLayout
          rightLabel="Next to memo"
          right={<NextToMemoTool nextSeg={nextSeg} loading={statuses.length === 0} onStudy={studySegment} />}
        >
        <div className={`w-full max-w-lg space-y-6 p-6 ${panelCls}`}>
          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-300">Select a segment to memorise</span>
            <PiSegmentGrid
              count={maxSegs}
              renderCell={segIdx => {
                const startDigit = segIdx * PAIRS_PER_SEG * 2 + 1
                const endDigit = (segIdx + 1) * PAIRS_PER_SEG * 2
                const half = PAIRS_PER_SEG / 2
                const line1 = PI_PAIRS.slice(segIdx * PAIRS_PER_SEG, segIdx * PAIRS_PER_SEG + half).join(' ')
                const line2 = PI_PAIRS.slice(segIdx * PAIRS_PER_SEG + half, (segIdx + 1) * PAIRS_PER_SEG).join(' ')
                const isSelected = selectedSeg === segIdx
                return (
                  <button
                    onClick={() => {
                      const next = isSelected ? null : segIdx
                      setSelectedSeg(next)
                      if (next !== null) safeSet(MEMO_SEG_KEY, String(next))
                    }}
                    className={`relative flex flex-col items-start px-2 py-1.5 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-cyan-600/25 border-cyan-500/60 text-cyan-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-500'
                    } ${segIdx === nextSeg ? 'ring-2 ring-violet-500' : ''}`}
                  >
                    <PiSegmentDot status={statuses[segIdx] ?? 'new'} />
                    <span className="text-[8px] opacity-60 leading-none tabular-nums">π {startDigit}–{endDigit}</span>
                    <span className="font-mono text-[8px] tabular-nums leading-snug mt-0.5">{line1}</span>
                    <span className="font-mono text-[8px] tabular-nums leading-snug">{line2}</span>
                  </button>
                )
              }}
            />
            <p className="text-xs text-center pt-1 min-h-[1.25rem]">
              {selectedSeg === null ? (
                <span className="text-zinc-700">Tap a segment to select it</span>
              ) : (
                <span className="text-cyan-400/80">
                  Pairs {selectedSeg * PAIRS_PER_SEG + 1}–{(selectedSeg + 1) * PAIRS_PER_SEG} · digits {selectedSeg * PAIRS_PER_SEG * 2 + 1}–{(selectedSeg + 1) * PAIRS_PER_SEG * 2}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={start}
            disabled={selectedSeg === null}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >Study →</button>
        </div>
        </ToolLayout>
      )}

      {/* STUDY */}
      {phase === 'study' && (
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Memorise the sequence</p>
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
              setWqOptions(buildEncOptions(sequence[0], words))
              setWqResults([])
              setPhase('recall')
            }}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
          >Test recall →</button>
        </div>
      )}

      {/* RECALL */}
      {phase === 'recall' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {progressDots(studyIdx, wqResults)}
          <div className="text-center space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Recall the sequence</p>
            <p className="text-xs text-zinc-700">
              Pair {sessionAnchor + studyIdx} · digits {(sessionAnchor + studyIdx - 1) * 2 + 1}–{(sessionAnchor + studyIdx - 1) * 2 + 2}
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
                onAnswer={handleAnswer}
                answered={wqAnswered}
              />
            ) : (
              <TypingInput
                key={studyIdx}
                onAnswer={handleAnswer}
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
                  <div ref={historyEndRef} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'result' && (
        <div className="w-full max-w-md space-y-4">
          <h3 className="text-xl font-bold text-center text-zinc-100">Review the sequence</h3>
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
            <button onClick={goToStudy} className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">Study again</button>
            <button onClick={goToSetup} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors">Change segment</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Right-rail quick tool: jump straight into studying the next untested segment.
function NextToMemoTool({ nextSeg, loading, onStudy }: {
  nextSeg: number
  loading: boolean
  onStudy: (seg: number) => void
}) {
  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3'

  if (loading) return null

  if (nextSeg < 0) {
    return (
      <div className={panelCls}>
        <p className="text-sm font-medium text-zinc-300">Next to memo</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          You've started every segment 🎉 Pick any one on the left to study it again.
        </p>
      </div>
    )
  }

  const [from, to] = segmentDigitRange(nextSeg)
  return (
    <div className={panelCls}>
      <p className="text-sm font-medium text-zinc-300">Next to memo</p>
      <div className="rounded-lg border border-violet-500/40 bg-violet-600/10 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-violet-400">Untrained</div>
        <div className="mt-0.5 font-semibold text-zinc-100">Segment {nextSeg + 1}</div>
        <div className="font-mono text-xs tabular-nums text-zinc-500">π digits {from}–{to}</div>
      </div>
      <button
        onClick={() => onStudy(nextSeg)}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
      >Study →</button>
    </div>
  )
}
