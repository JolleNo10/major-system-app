import { useState } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import {
  fromStartRecordRun,
  fullReciteSessions,
  practiceSessions,
  type PiSession,
} from '@/features/pi/shared/piStats'
import { PiSegmentRangePreview } from '@/features/pi/shared/PiSegmentGrid'
import { type PiSegmentRange } from '@/features/pi/shared/piProgress'
import type { Phase } from '@/features/pi/recite/PiReciteTab'

// The Pi Recite tab's side rails, split out from the middle-panel drill
// (`PiReciteTab`). The one public interface is `usePiReciteRail`, which maps
// the current phase to rail views + labels and publishes them via `useRails`.
// The two views below are its private implementation; both show only during
// setup (the quiz phase has no rail):
//   left  → RunHistoryTool    ("Your runs": full-recite track + collapsed practice)
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

// Two tracks: full recites (runs that started at π #1 — the progress that
// counts, with the standing record pinned) and practice (every other run,
// collapsed below). See ADR 0004.
function RunHistoryTool({ piSessions, formatRate }: {
  piSessions: PiSession[]
  formatRate: (rate: number) => string
}) {
  const [showPractice, setShowPractice] = useState(false)
  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3'

  const full = fullReciteSessions(piSessions)
  const practice = practiceSessions(piSessions)
  const record = fromStartRecordRun(piSessions)

  return (
    <div className={panelCls}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-300">Full recites</span>
        <span className="text-xs text-zinc-600 tabular-nums">from π #1</span>
      </div>

      {record ? (
        <>
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-600/10 px-3 py-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-wider text-cyan-600">🏆 Record</span>
              <span className="text-[10px] text-zinc-500 tabular-nums">
                {new Date(record.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-cyan-300 leading-tight">
              π to {record.reach * 2}d
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-2 text-center tabular-nums">
              <div>
                <div className="font-mono text-sm font-bold text-zinc-100">{record.reach}</div>
                <div className="text-[9px] uppercase tracking-wide text-zinc-600">pairs</div>
              </div>
              <div>
                <div className={`font-mono text-sm font-bold ${record.accuracy === 100 ? 'text-green-400' : 'text-zinc-100'}`}>
                  {record.accuracy}%
                </div>
                <div className="text-[9px] uppercase tracking-wide text-zinc-600">accuracy</div>
              </div>
              <div>
                <div className="font-mono text-sm font-bold text-zinc-100">{formatRate(record.pairsPerSec)}</div>
                <div className="text-[9px] uppercase tracking-wide text-zinc-600">pairs/s</div>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            {[...full].slice(-8).reverse().map(s => (
              <SessionRow key={s.at} s={s} formatRate={formatRate} isRecord={s.at === record.at} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-zinc-500 leading-relaxed">
          No full recites yet. Start a run from π #1 (the first segment) to set your record.
        </p>
      )}

      {practice.length > 0 && (
        <div className="border-t border-zinc-800 pt-2">
          <button
            onClick={() => setShowPractice(v => !v)}
            className="w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span className="uppercase tracking-wider">Practice</span>
            <span className="tabular-nums">{showPractice ? '▾' : '▸'} {practice.length}</span>
          </button>
          {showPractice && (
            <div className="space-y-1 mt-2">
              {[...practice].slice(-8).reverse().map(s => (
                <SessionRow key={s.at} s={s} formatRate={formatRate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SessionRow({ s, formatRate, isRecord }: {
  s: PiSession
  formatRate: (rate: number) => string
  isRecord?: boolean
}) {
  return (
    <div className={`px-2 py-1.5 rounded text-xs space-y-0.5 ${
      isRecord ? 'bg-cyan-600/10 border border-cyan-500/30' : 'bg-zinc-800/40'
    }`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-zinc-400 tabular-nums" title="π digit range">
          π {(s.anchor - 1) * 2 + 1}–{(s.anchor + s.pairs - 1) * 2}
        </span>
        <span className="text-zinc-600 tabular-nums flex items-center gap-1">
          {isRecord && <span title="Current record">🏆</span>}
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
