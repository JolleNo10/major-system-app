import { useRails } from '@/app/layout/PageLayoutContext'
import { bestFromStartReach, type PiSession } from '@/features/pi/shared/piStats'
import { PiSegmentRangePreview } from '@/features/pi/shared/PiSegmentGrid'
import { type PiSegmentRange } from '@/features/pi/shared/piProgress'
import type { Phase } from '@/features/pi/recite/PiReciteTab'

// The Pi Recite tab's side rails, split out from the middle-panel drill
// (`PiReciteTab`). The one public interface is `usePiReciteRail`, which maps
// the current phase to rail views + labels and publishes them via `useRails`.
// The two views below are its private implementation; both show only during
// setup (the quiz phase has no rail):
//   left  → RunHistoryTool    ("Your runs")
//   right → ReadyToReciteTool ("Ready to recite")

interface PiReciteRailArgs {
  phase: Phase
  piSessions: PiSession[]
  formatRate: (rate: number) => string
  pendingRanges: PiSegmentRange[]
  statusesLoading: boolean
  availableMemoedCount: number
  onRecite: (range: PiSegmentRange) => void
}

// Publish the Recite tab's rails for its current phase. Owns the phase→view
// mapping, the rail labels, and the `useRails` wiring so the caller keeps no
// side-panel knowledge.
export function usePiReciteRail({
  phase, piSessions, formatRate, pendingRanges,
  statusesLoading, availableMemoedCount, onRecite,
}: PiReciteRailArgs): void {
  useRails(
    {
      left: phase === 'setup' && piSessions.length > 0
        ? <RunHistoryTool piSessions={piSessions} formatRate={formatRate} />
        : undefined,
      leftLabel: 'Your runs',
      right: phase === 'setup'
        ? (
            <ReadyToReciteTool
              ranges={pendingRanges}
              loading={statusesLoading}
              availableMemoedCount={availableMemoedCount}
              onRecite={onRecite}
            />
          )
        : undefined,
      rightLabel: 'Ready to recite',
    },
    [phase, piSessions, pendingRanges, statusesLoading, availableMemoedCount, onRecite],
  )
}

function RunHistoryTool({ piSessions, formatRate }: {
  piSessions: PiSession[]
  formatRate: (rate: number) => string
}) {
  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3'
  return (
    <div className={panelCls}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-300">Your runs</span>
        <span className="text-xs text-zinc-600 tabular-nums">{piSessions.length} recorded</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-600/10 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-cyan-600">Best from π #1</div>
          <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-cyan-300">
            {bestFromStartReach(piSessions) * 2}d
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Best pairs/sec</div>
          <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-zinc-100">
            {formatRate(Math.max(...piSessions.map(s => s.pairsPerSec)))}
          </div>
        </div>
      </div>
      <div className="space-y-1">
        {[...piSessions].slice(-8).reverse().map(s => (
          <div key={s.at} className="px-2 py-1.5 rounded bg-zinc-800/40 text-xs space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-zinc-400 tabular-nums" title="π digit range">
                π {(s.anchor - 1) * 2 + 1}–{(s.anchor + s.pairs - 1) * 2}
              </span>
              <span className="text-zinc-600 tabular-nums">
                {new Date(s.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-cyan-400" title="Reach (consecutive correct from start)">⟶ {s.reach * 2}d</span>
              <span className="text-zinc-500" title="Correct pairs out of total">{s.correctPairs}/{s.pairs}</span>
              <span className="ml-auto flex items-center gap-2">
                <span className={s.accuracy === 100 ? 'text-green-400' : 'text-zinc-400'}>{s.accuracy}%</span>
                <span className="text-zinc-500 font-mono">{formatRate(s.pairsPerSec)}/s</span>
              </span>
            </div>
          </div>
        ))}
      </div>
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
          return (
            <div
              key={`${range.startSeg}-${range.endSeg}`}
              className="rounded-lg border border-violet-500/40 bg-violet-600/10 px-3 py-2.5 space-y-2"
            >
              <div>
                <div className="text-[10px] uppercase tracking-wider text-violet-400">Memoed</div>
                <PiSegmentRangePreview startSeg={range.startSeg} endSeg={range.endSeg} />
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
