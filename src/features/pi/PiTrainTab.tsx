import { useState, useCallback, useEffect } from 'react'
import { useWords } from '@/features/major-system'
import { useSettings } from '@/app/settings/SettingsContext'
import { PiNumberQuiz } from '@/features/pi/PiNumberQuiz'
import { PI_PAIRS } from '@/features/pi/piDigits'
import {
  rankPiSegments, rankPiBoundaries, recordPiChain, PAIRS_PER_SEGMENT,
  type PiSegmentStat, type PiBoundaryStat,
} from '@/features/pi/piStats'
import type { AnswerMode } from '@/core/types'

interface Props { answerMode: AnswerMode; maxPiPairs: number }

type Phase = 'select' | 'quiz'
type DrillKind = 'segment' | 'chain'

interface ActiveDrill {
  kind: DrillKind
  sequence: string[]
  anchor: number          // 1-indexed π position of sequence[0]
  boundary: number        // segment finished (chain only; -1 for segment drills)
  anchorNote?: { pos: number; pair: string }  // given start-of-segment pair (chain only)
}

// A small badge describing why an item surfaced: wrong-rate %, or "new".
function WeaknessBadge({ tested, wrongRate }: { tested: boolean; wrongRate: number }) {
  if (!tested) {
    return <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">new</span>
  }
  const pct = Math.round(wrongRate * 100)
  const cls = pct === 0
    ? 'text-green-400 bg-green-500/10'
    : pct >= 40 ? 'text-red-300 bg-red-500/15' : 'text-amber-300 bg-amber-500/15'
  return <span className={`text-[10px] font-semibold tabular-nums rounded px-1.5 py-0.5 ${cls}`}>{pct}% miss</span>
}

export function PiTrainTab({ answerMode, maxPiPairs }: Props) {
  const { words } = useWords()
  const { settings } = useSettings()
  const answerSize = settings.piPairsPerAnswer

  const [phase, setPhase] = useState<Phase>('select')
  const [drill, setDrill] = useState<ActiveDrill | null>(null)
  const [runNonce, setRunNonce] = useState(0)

  const [segments, setSegments] = useState<PiSegmentStat[]>([])
  const [boundaries, setBoundaries] = useState<PiBoundaryStat[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    void Promise.all([rankPiSegments(maxPiPairs), rankPiBoundaries(maxPiPairs)])
      .then(([segs, bnds]) => {
        setSegments(segs.slice(0, 3))
        setBoundaries(bnds.slice(0, 3))
        setLoading(false)
      })
  }, [maxPiPairs])

  useEffect(() => { reload() }, [reload])

  const startSegment = useCallback((s: PiSegmentStat) => {
    const seq = PI_PAIRS.slice(s.anchor - 1, s.anchor - 1 + PAIRS_PER_SEGMENT)
    setDrill({ kind: 'segment', sequence: seq, anchor: s.anchor, boundary: -1 })
    setRunNonce(n => n + 1)
    setPhase('quiz')
  }, [])

  const startChain = useCallback((b: PiBoundaryStat) => {
    // Recite the full segment then bridge into the next (usual flow — every pair
    // is answered). The anchor note just shows where the run-up starts, so the
    // user knows which segment they're reciting; it doesn't change the quiz.
    const seq = PI_PAIRS.slice(b.fromAnchor - 1, b.fromAnchor - 1 + 2 * PAIRS_PER_SEGMENT)
    setDrill({
      kind: 'chain',
      sequence: seq,
      anchor: b.fromAnchor,
      boundary: b.boundary,
      anchorNote: { pos: b.fromAnchor, pair: PI_PAIRS[b.fromAnchor - 1] },
    })
    setRunNonce(n => n + 1)
    setPhase('quiz')
  }, [])

  const exitToSelect = useCallback(() => {
    setPhase('select')
    reload()
  }, [reload])

  // Chain drills log the crossing: the target is the first pair of the next
  // segment (π position boundary*10 + 11).
  const onPairAnswered = useCallback((pos: number, ok: boolean, ms: number) => {
    if (!drill || drill.kind !== 'chain') return
    if (pos === drill.boundary * PAIRS_PER_SEGMENT + PAIRS_PER_SEGMENT + 1) {
      void recordPiChain(drill.boundary, ok, ms)
    }
  }, [drill])

  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl'
  const digits = (anchor: number, pairs: number) => `π ${(anchor - 1) * 2 + 1}–${(anchor + pairs - 1) * 2}`

  if (phase === 'quiz' && drill) {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        {drill.anchorNote && (
          <div className="w-full max-w-md rounded-xl border border-cyan-500/30 bg-cyan-600/10 px-4 py-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-cyan-600">Sequence starts here</div>
            <div className="mt-0.5 flex items-baseline justify-center gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-cyan-300">{drill.anchorNote.pair}</span>
              <span className="text-sm text-zinc-400">{words[drill.anchorNote.pair]}</span>
            </div>
            <div className="text-[10px] text-zinc-600 mt-0.5">
              pair {drill.anchorNote.pos} (π {(drill.anchorNote.pos - 1) * 2 + 1}–{drill.anchorNote.pos * 2}) · recite onward across the boundary →
            </div>
          </div>
        )}
        <PiNumberQuiz
          key={runNonce}
          answerMode={answerMode}
          answerSize={answerSize}
          sequence={drill.sequence}
          anchor={drill.anchor}
          words={words}
          onExit={exitToSelect}
          exitLabel="Back"
          recordSession={drill.kind === 'segment'}
          onPairAnswered={drill.kind === 'chain' ? onPairAnswered : undefined}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">

      {/* WEAK SEGMENTS */}
      <div className={`w-full max-w-lg space-y-3 p-6 ${panelCls}`}>
        <div className="space-y-1">
          <span className="text-sm font-medium text-zinc-300">Weakest segments</span>
          <p className="text-xs text-zinc-600">Drill the 10-pair blocks your recall misses or stalls on.</p>
        </div>
        {loading ? (
          <p className="text-xs text-zinc-600 py-4 text-center">Loading…</p>
        ) : segments.length === 0 ? (
          <p className="text-xs text-zinc-600 py-4 text-center">No segments available.</p>
        ) : (
          <div className="space-y-1.5">
            {segments.map(s => (
              <button
                key={s.seg}
                onClick={() => startSegment(s)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors text-left"
              >
                <span className="font-mono text-sm text-cyan-400 tabular-nums shrink-0 w-24">{digits(s.anchor, PAIRS_PER_SEGMENT)}</span>
                <span className="font-mono text-[10px] text-zinc-600 tabular-nums truncate">
                  {PI_PAIRS.slice(s.anchor - 1, s.anchor - 1 + PAIRS_PER_SEGMENT).join(' ')}
                </span>
                <span className="ml-auto shrink-0"><WeaknessBadge tested={s.tested} wrongRate={s.wrongRate} /></span>
                <span className="text-zinc-500 shrink-0">→</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* WEAK BOUNDARIES (CHAINING) */}
      <div className={`w-full max-w-lg space-y-3 p-6 ${panelCls}`}>
        <div className="space-y-1">
          <span className="text-sm font-medium text-zinc-300">Weakest chains</span>
          <p className="text-xs text-zinc-600">Recite a segment, then bridge into the next — where you lose the thread.</p>
        </div>
        {loading ? (
          <p className="text-xs text-zinc-600 py-4 text-center">Loading…</p>
        ) : boundaries.length === 0 ? (
          <p className="text-xs text-zinc-600 py-4 text-center">Need at least two segments to chain.</p>
        ) : (
          <div className="space-y-1.5">
            {boundaries.map(b => (
              <button
                key={b.boundary}
                onClick={() => startChain(b)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors text-left"
              >
                <span className="font-mono text-sm text-cyan-400 tabular-nums shrink-0">
                  {digits(b.fromAnchor, PAIRS_PER_SEGMENT)}
                </span>
                <span className="text-zinc-600 shrink-0">⟶</span>
                <span className="font-mono text-sm text-zinc-300 tabular-nums shrink-0" title={`next pair: ${b.nextPair} (${words[b.nextPair] ?? ''})`}>
                  {b.nextPair}…
                </span>
                <span className="ml-auto shrink-0"><WeaknessBadge tested={b.tested} wrongRate={b.wrongRate} /></span>
                <span className="text-zinc-500 shrink-0">→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
