import { useState, useCallback, useMemo } from 'react'
import { useWords } from '@/features/major-system'
import { PiNumberQuiz, type PiQuizLabels } from '@/features/pi/shared/PiNumberQuiz'
import { readString, safeSet } from '@/core/storage'
import { PAIRS_PER_SEGMENT } from '@/features/pi/shared/piStats'
import { segmentAnchorPos, segmentDigitRange, segmentAnchorPairs } from '@/features/pi/shared/piSegments'
import { PiSegmentRangePicker } from '@/features/pi/shared/PiSegmentRangePicker'
import { loadAnchorPaceStore, recordAnchorPace, useAnchorPaces, type AnchorPaceInfo } from '@/features/pi/recite/anchorPace'
import { ReciteModeToggle, type ReciteMode } from '@/features/pi/recite/ReciteModeToggle'
import type { AnswerMode } from '@/core/types'

const SEL_START_KEY = 'major-pi-anchor-start'
const SEL_END_KEY = 'major-pi-anchor-end'

// Enough anchors to always fill a 3-option multiple choice, even when the
// user's π range only covers a couple of segments.
const MIN_DISTRACTOR_SEGMENTS = 12

type Phase = 'setup' | 'quiz'
interface Props {
  answerMode: AnswerMode
  maxPiPairs: number
  mode: ReciteMode
  onModeChange: (mode: ReciteMode) => void
}

// Traffic-light for the pause getting *into* a segment (recalling its opening
// pair): a bead sitting in the gap to the left of the cell, i.e. on the chain
// link from the previous segment. Requires the containing cell to be `relative`
// (PiSegmentRangePicker's button is).
function PaceDot({ info }: { info: AnchorPaceInfo }) {
  const cls = info.pace === 'fast' ? 'bg-emerald-400' : info.pace === 'ok' ? 'bg-amber-400' : 'bg-red-500'
  const label = info.pace === 'fast' ? 'quick recall' : info.pace === 'ok' ? 'some hesitation' : 'long pause'
  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`
  // Native tooltip: the light plus the timings behind it.
  const title = `${label} — ${fmt(info.medianMs)} median · last ${info.samples.length}: ${info.samples.map(fmt).join(', ')}`
  return (
    <span
      className={`absolute top-1/2 -left-1.5 z-10 h-1.5 w-1.5 -translate-y-1/2 rounded-full ring-1 ring-zinc-950 ${cls}`}
      title={title}
      aria-label={title}
    />
  )
}

// Anchors: chain the *opening pair* of each segment. You start at a segment,
// type its first π pair, then are asked for the first pair of the next segment,
// and so on — training the segment order itself rather than any one segment.
// Session-only: nothing is recorded, so it can't skew the Recite/Train stats.
export function PiReciteAnchors({ answerMode, maxPiPairs, mode, onModeChange }: Props) {
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

  // Traffic-light for the pause into each segment (the chain delay), merging
  // this drill's own transition timings with the opening-pair timings reciting
  // logs. Kept in a dedicated store so Anchors stays session-only for stats.
  const [paceStore, setPaceStore] = useState(loadAnchorPaceStore)
  const paces = useAnchorPaces(maxPiPairs, phase, paceStore)

  // Lowering "Max π digits" can strand a stored selection past the last segment.
  const rangeStart = selStart === null ? null : Math.min(selStart, lastSeg)
  const rangeEnd = selEnd === null ? null : Math.min(selEnd, lastSeg)
  const runCount = rangeStart !== null && rangeEnd !== null ? rangeEnd - rangeStart + 1 : 0

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
          resultMode="anchor"
          onPairAnswered={(pos, _ok, ms) => {
            // pos = run anchor + idx; idx 0 is the run's start (no incoming
            // transition), every later answer is a segment-to-segment chain.
            const idx = pos - segmentAnchorPos(runSeg)
            if (idx > 0) setPaceStore(prev => recordAnchorPace(prev, runSeg + idx, ms))
          }}
          onExit={() => setPhase('setup')}
          exitLabel="Segments"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className={`w-full max-w-lg space-y-6 p-6 ${panelCls}`}>

        <ReciteModeToggle mode={mode} onChange={onModeChange} />

        <p className="text-xs text-zinc-500 leading-relaxed">
          Type the <span className="text-zinc-300">first pair</span> of each segment in turn — the
          chain that tells you which segment comes next. Nothing here is recorded.
        </p>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-zinc-300">Select segments</span>
            <span className="flex items-center gap-2.5 text-[10px] text-zinc-500" title="Pause recalling the segment's opening pair">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />quick</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />slow</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />long pause</span>
            </span>
          </div>
          <PiSegmentRangePicker
            count={totalSegments}
            showStatus={false}
            value={{ start: rangeStart, end: rangeEnd }}
            onChange={next => {
              setSelStart(next.start)
              setSelEnd(next.end)
            }}
            renderCellBody={seg => (
              <>
                {seg > 0 && paces[seg] && <PaceDot info={paces[seg]!} />}
                <span className="w-full truncate leading-snug mt-0.5 text-left">
                  <span className="font-mono text-[10px] tabular-nums">{anchorPairs[seg]}</span>
                  <span className="text-[10px] opacity-60 ml-1">{words[anchorPairs[seg]]}</span>
                </span>
              </>
            )}
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
