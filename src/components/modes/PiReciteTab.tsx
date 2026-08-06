import { useState, useCallback, useEffect, useMemo } from 'react'
import { useWords } from '../../context/WordsContext'
import { useSettings } from '../../context/SettingsContext'
import { PiNumberQuiz, type PiQuizCompletion } from './PiNumberQuiz'
import { readString, safeSet } from '../../utils/storage'
import { PI_PAIRS } from '../../data/piDigits'
import { loadPiSessions, bestFromStartReach, type PiSession } from '../../data/piStats'
import { PiSegmentGrid, PiSegmentDot } from './PiSegmentGrid'
import { usePiSegmentStatuses } from '../../hooks/usePiSegmentStatuses'
import { ToolLayout } from '../ToolLayout'
import { segmentDigitRange } from '../../utils/piSegments'
import {
  flawlessSegmentsFromRun,
  flawlessSegmentsFromSessions,
  loadFlawlesslyRecitedPiSegments,
  loadMemoedPiSegments,
  pendingMemoedSegmentRanges,
  saveFlawlesslyRecitedPiSegments,
  type PiSegmentRange,
} from '../../data/piProgress'
import type { AnswerMode } from '../../types'

const SEL_START_KEY = 'major-pi-sel-start'
const SEL_END_KEY = 'major-pi-sel-end'

const PAIRS_PER_ROW = 10

type Phase = 'setup' | 'quiz'
interface Props { answerMode: AnswerMode; maxPiPairs: number }

export function PiReciteTab({ answerMode, maxPiPairs }: Props) {
  const { words } = useWords()
  const { settings } = useSettings()
  const answerSize = settings.piPairsPerAnswer

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
  const [runNonce, setRunNonce] = useState(0)

  const [piSessions, setPiSessions] = useState<PiSession[]>(() => loadPiSessions())
  const statuses = usePiSegmentStatuses(maxPiPairs, phase)
  const maxSegments = Math.floor(maxPiPairs / PAIRS_PER_ROW)
  const [memoedSegs] = useState(loadMemoedPiSegments)
  const [recitedSegs, setRecitedSegs] = useState(loadFlawlesslyRecitedPiSegments)

  // Migrate progress that predates explicit flawless-segment tracking. Perfect
  // historical sessions and the existing strict "learned" status both prove a
  // segment has already been recited correctly.
  useEffect(() => {
    const historical = flawlessSegmentsFromSessions(piSessions, maxSegments)
    setRecitedSegs(previous => {
      const next = new Set(previous)
      historical.forEach(seg => next.add(seg))
      statuses.forEach((status, seg) => { if (status === 'learned') next.add(seg) })
      return next.size === previous.size ? previous : next
    })
  }, [piSessions, statuses, maxSegments])

  useEffect(() => {
    saveFlawlesslyRecitedPiSegments(recitedSegs)
  }, [recitedSegs])

  const pendingRanges = useMemo(
    () => pendingMemoedSegmentRanges(memoedSegs, recitedSegs, statuses, maxSegments),
    [memoedSegs, recitedSegs, statuses, maxSegments],
  )
  const availableMemoedCount = useMemo(
    () => [...memoedSegs].filter(seg => seg >= 0 && seg < maxSegments).length,
    [memoedSegs, maxSegments],
  )

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

  const startRange = useCallback((anchor: number, end: number) => {
    if (anchor < 1 || end < anchor || end > maxPiPairs || end > PI_PAIRS.length) return
    setSelAnchor(anchor)
    setSelEnd(end)
    safeSet(SEL_START_KEY, String(anchor))
    safeSet(SEL_END_KEY, String(end))
    setSequence(PI_PAIRS.slice(anchor - 1, end))
    setSessionAnchor(anchor)
    setRunNonce(n => n + 1)
    setPhase('quiz')
  }, [maxPiPairs])

  const start = useCallback(() => {
    if (selAnchor === null || selEnd === null) return
    startRange(selAnchor, selEnd)
  }, [selAnchor, selEnd, startRange])

  const startQuickRange = useCallback((range: PiSegmentRange) => {
    startRange(range.startSeg * PAIRS_PER_ROW + 1, (range.endSeg + 1) * PAIRS_PER_ROW)
  }, [startRange])

  const handleQuizComplete = useCallback((completion: PiQuizCompletion) => {
    const flawless = flawlessSegmentsFromRun(completion.anchor, completion.correctness)
    if (flawless.length === 0) return
    setRecitedSegs(previous => {
      const next = new Set(previous)
      flawless.forEach(seg => next.add(seg))
      return next.size === previous.size ? previous : next
    })
  }, [])

  const exitToSetup = useCallback(() => {
    setPiSessions(loadPiSessions())
    setPhase('setup')
  }, [])

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl'

  const formatRate = (rate: number) => rate.toFixed(rate < 10 ? 2 : 1)

  const numButtons = Math.ceil(maxPiPairs / PAIRS_PER_ROW)

  return (
    <div className="flex flex-col items-center gap-6 py-4 w-full">

      {/* SETUP */}
      {phase === 'setup' && (
        <ToolLayout
          rightLabel="Ready to recite"
          right={(
            <ReadyToReciteTool
              ranges={pendingRanges}
              loading={statuses.length !== maxSegments}
              availableMemoedCount={availableMemoedCount}
              onRecite={startQuickRange}
            />
          )}
        >
        <div className={`w-full max-w-lg space-y-6 p-6 ${panelCls}`}>

          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-300">Select segment</span>
            <PiSegmentGrid
              count={numButtons}
              renderCell={segIdx => {
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
                    onClick={() => handleSegmentClick(segIdx)}
                    className={`relative flex flex-col items-start px-2 py-1.5 rounded-lg border transition-colors ${
                      inRange
                        ? 'bg-cyan-600/25 border-cyan-500/60 text-cyan-300'
                        : isAnchor
                        ? 'bg-amber-600/20 border-amber-500/60 text-amber-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-500'
                    }`}
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
        </ToolLayout>
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
                  π {(s.anchor - 1) * 2 + 1}–{(s.anchor + s.pairs - 1) * 2}
                </span>
                <span className="text-cyan-400 tabular-nums shrink-0" title="Reach (consecutive correct from start)">
                  ⟶ {s.reach * 2}d
                </span>
                <span className="text-zinc-500 tabular-nums shrink-0" title="Correct pairs out of total">
                  {s.correctPairs}/{s.pairs}
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

      {/* NUMBER QUIZ + RESULT */}
      {phase === 'quiz' && (
        <PiNumberQuiz
          key={runNonce}
          answerMode={answerMode}
          answerSize={answerSize}
          sequence={sequence}
          anchor={sessionAnchor}
          words={words}
          onExit={exitToSetup}
          onComplete={handleQuizComplete}
          recordSession
        />
      )}
    </div>
  )
}

function ReadyToReciteTool({ ranges, loading, availableMemoedCount, onRecite }: {
  ranges: PiSegmentRange[]
  loading: boolean
  availableMemoedCount: number
  onRecite: (range: PiSegmentRange) => void
}) {
  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3'

  if (loading) return null

  if (ranges.length === 0) {
    return (
      <div className={panelCls}>
        <p className="text-sm font-medium text-zinc-300">Ready to recite</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          {availableMemoedCount === 0
            ? 'No memoed segments are ready within your current π limit.'
            : "You've flawlessly recited every memoed segment 🎉"}
        </p>
      </div>
    )
  }

  return (
    <div className={panelCls}>
      <p className="text-sm font-medium text-zinc-300">Ready to recite</p>
      <div className="space-y-2">
        {ranges.map(range => {
          const [from] = segmentDigitRange(range.startSeg)
          const [, to] = segmentDigitRange(range.endSeg)
          const single = range.startSeg === range.endSeg
          return (
            <div
              key={`${range.startSeg}-${range.endSeg}`}
              className="rounded-lg border border-violet-500/40 bg-violet-600/10 px-3 py-2.5 space-y-2"
            >
              <div>
                <div className="text-[10px] uppercase tracking-wider text-violet-400">Memoed</div>
                <div className="mt-0.5 font-semibold text-zinc-100">
                  {single
                    ? `Segment ${range.startSeg + 1}`
                    : `Segments ${range.startSeg + 1}–${range.endSeg + 1}`}
                </div>
                <div className="font-mono text-xs tabular-nums text-zinc-500">π digits {from}–{to}</div>
              </div>
              <button
                onClick={() => onRecite(range)}
                className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
              >Recite →</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
