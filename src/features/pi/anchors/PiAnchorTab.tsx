import { useState, useCallback, useMemo } from 'react'
import { useWords } from '@/features/major-system'
import { PiNumberQuiz, type PiQuizLabels } from '@/features/pi/shared/PiNumberQuiz'
import { readString, safeSet } from '@/core/storage'
import { PAIRS_PER_SEGMENT } from '@/features/pi/shared/piStats'
import { segmentAnchorPos, segmentDigitRange, segmentAnchorPairs } from '@/features/pi/shared/piSegments'
import { PiSegmentGrid, PiSegmentDot } from '@/features/pi/shared/PiSegmentGrid'
import { usePiSegmentStatuses } from '@/features/pi/shared/usePiSegmentStatuses'
import { loadMemoedPiSegments } from '@/features/pi/shared/piProgress'
import type { AnswerMode } from '@/core/types'

const SEL_START_KEY = 'major-pi-anchor-start'
const SEL_END_KEY = 'major-pi-anchor-end'

// Enough anchors to always fill a 3-option multiple choice, even when the
// user's π range only covers a couple of segments.
const MIN_DISTRACTOR_SEGMENTS = 12

type Phase = 'setup' | 'quiz'
interface Props { answerMode: AnswerMode; maxPiPairs: number }

// Anchors: chain the *opening pair* of each segment. You start at a segment,
// type its first π pair, then are asked for the first pair of the next segment,
// and so on — training the segment order itself rather than any one segment.
// Session-only: nothing is recorded, so it can't skew the Recite/Train stats.
export function PiAnchorTab({ answerMode, maxPiPairs }: Props) {
  const { words } = useWords()

  const totalSegments = Math.floor(maxPiPairs / PAIRS_PER_SEGMENT)
  const lastSeg = totalSegments - 1

  const [selStart, setSelStart] = useState<number | null>(() => {
    const v = parseInt(readString(SEL_START_KEY) ?? '', 10)
    return v >= 0 ? v : 0
  })
  const [selEnd, setSelEnd] = useState<number | null>(() => {
    const v = parseInt(readString(SEL_END_KEY) ?? '', 10)
    return v >= 0 ? v : 4
  })

  const [phase, setPhase] = useState<Phase>('setup')
  const [sequence, setSequence] = useState<string[]>([])
  const [runSeg, setRunSeg] = useState(0)
  const [runNonce, setRunNonce] = useState(0)

  const statuses = usePiSegmentStatuses(maxPiPairs, phase)
  const [memoedSegs] = useState(loadMemoedPiSegments)

  // Lowering "Max π digits" can strand a stored selection past the last segment.
  const rangeStart = selStart === null ? null : Math.min(selStart, lastSeg)
  const rangeEnd = selEnd === null ? null : Math.min(selEnd, lastSeg)
  const runCount = rangeStart !== null && rangeEnd !== null ? rangeEnd - rangeStart + 1 : 0

  // Same two-click range selection as the Recite tab: first click sets the
  // start, the next one sets the end.
  const handleSegmentClick = useCallback((seg: number) => {
    if (selEnd !== null || selStart === null) {
      setSelStart(seg)
      setSelEnd(null)
    } else if (seg >= selStart) {
      setSelEnd(seg)
    } else {
      setSelStart(seg)
    }
  }, [selStart, selEnd])

  const start = useCallback(() => {
    if (rangeStart === null || runCount < 2) return
    safeSet(SEL_START_KEY, String(rangeStart))
    safeSet(SEL_END_KEY, String(rangeStart + runCount - 1))
    setSequence(segmentAnchorPairs(rangeStart, runCount))
    setRunSeg(rangeStart)
    setRunNonce(n => n + 1)
    setPhase('quiz')
  }, [rangeStart, runCount])

  // Anchor pair per segment, indexable by segment number. Padded past the
  // user's range so multiple choice always has enough distractors to fill
  // three options, even when π is capped at a couple of segments.
  const anchorPairs = useMemo(
    () => segmentAnchorPairs(0, Math.max(totalSegments, MIN_DISTRACTOR_SEGMENTS)),
    [totalSegments],
  )

  const labels = useMemo<PiQuizLabels>(() => ({
    prompt: idx => `Segment ${runSeg + idx + 1}`,
    hint: idx => {
      const [from, to] = segmentDigitRange(runSeg + idx)
      return `π digits ${from}–${to}`
    },
    row: idx => `S${runSeg + idx + 1}`,
  }), [runSeg])

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl'

  if (phase === 'quiz') {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <PiNumberQuiz
          key={runNonce}
          answerMode={answerMode}
          answerSize={1}
          sequence={sequence}
          anchor={segmentAnchorPos(runSeg)}
          words={words}
          labels={labels}
          distractorPool={anchorPairs}
          recordAttempts={false}
          onExit={() => setPhase('setup')}
          exitLabel="Segments"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className={`w-full max-w-lg space-y-6 p-6 ${panelCls}`}>

        <p className="text-xs text-zinc-500 leading-relaxed">
          Type the <span className="text-zinc-300">first pair</span> of each segment in turn — the
          chain that tells you which segment comes next. Nothing here is recorded.
        </p>

        <div className="space-y-2">
          <span className="text-sm font-medium text-zinc-300">Select segments</span>
          <PiSegmentGrid
            count={totalSegments}
            renderCell={seg => {
              const [from, to] = segmentDigitRange(seg)
              const inRange = rangeStart !== null && rangeEnd !== null &&
                              seg >= rangeStart && seg <= rangeEnd
              const isAnchor = rangeEnd === null && seg === rangeStart
              return (
                <button
                  onClick={() => handleSegmentClick(seg)}
                  className={`relative flex flex-col items-start px-2 py-1.5 rounded-lg border transition-colors ${
                    inRange
                      ? 'bg-cyan-600/25 border-cyan-500/60 text-cyan-300'
                      : isAnchor
                      ? 'bg-amber-600/20 border-amber-500/60 text-amber-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-500'
                  }`}
                >
                  <PiSegmentDot
                    status={statuses[seg] ?? 'new'}
                    memoed={memoedSegs.has(seg)}
                  />
                  <span className="text-[8px] opacity-60 leading-none tabular-nums">π {from}–{to}</span>
                  <span className="w-full truncate leading-snug mt-0.5 text-left">
                    <span className="font-mono text-[10px] tabular-nums">{anchorPairs[seg]}</span>
                    <span className="text-[10px] opacity-60 ml-1">{words[anchorPairs[seg]]}</span>
                  </span>
                </button>
              )
            }}
          />
          <p className="text-xs text-center pt-1 min-h-5">
            {rangeStart === null ? (
              <span className="text-zinc-700">Click a segment to start selecting</span>
            ) : rangeEnd === null ? (
              <span className="text-amber-400/80">Segment {rangeStart + 1} — click another to set end</span>
            ) : runCount < 2 ? (
              <span className="text-zinc-700">Pick an end segment further along — a chain needs at least 2</span>
            ) : (
              <span className="text-cyan-400/80">
                Segments {rangeStart + 1}–{rangeEnd + 1} · {runCount} anchors ·
                {' '}π digits {segmentDigitRange(rangeStart)[0]}–{segmentDigitRange(rangeEnd)[1]}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={start}
          disabled={runCount < 2}
          className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
        >Start →</button>
      </div>
    </div>
  )
}
