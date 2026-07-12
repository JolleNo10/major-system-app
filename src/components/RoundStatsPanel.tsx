import { loadStore, medianMs } from '../data/itemStore'
import { recallColor, RECALL_SLOW_MS } from '../data/typingSpeed'
import { isMastered, masteryProgress, masteryFastMs } from '../utils/roundMastery'
import { useSettings } from '../context/SettingsContext'
import type { Direction } from '../types'

export interface RoundAttempt {
  ok: boolean       // correct
  recallMs: number  // recall-adjusted latency (typing time removed)
  hinted: boolean   // a hint was used
}

export interface RoundStat {
  correct: number
  wrong: number
  lastMs?: number         // recall-adjusted (typing time removed)
  latencies: number[]     // this round only, recall-adjusted
  hintCount: number       // this round only
  attempts: RoundAttempt[] // last ~5 attempts this round (for mastery)
}

interface Props {
  stats: Record<string, RoundStat>
  pool: string[]
  dir: Direction
  low?: number
  high?: number
  onRestart?: () => void
}

// Latencies are recall-adjusted (typing time removed), so we judge them all on
// one recall scale regardless of the current answer mode.
function LatencyTag({ latencies }: { latencies: number[] }) {
  const median = medianMs(latencies)
  if (median === null) return <span className="text-xs text-zinc-700 tabular-nums w-9 text-right">—</span>
  return (
    <span
      className={`text-xs font-mono tabular-nums w-9 text-right ${recallColor(median)}`}
      title="Recall time (typing time removed)"
    >
      {(median / 1000).toFixed(1)}s
    </span>
  )
}

// Sort worst-first: 0 = has wrongs this round, 1 = slow-but-correct
// (round recall median >= slow), 2 = fine, 3 = untested this round.
function sortedPool(pool: string[], stats: Record<string, RoundStat>): string[] {
  const roundMedian = (n: string) => medianMs(stats[n]?.latencies ?? [])
  const rank = (n: string, s: RoundStat | undefined): number => {
    if (!s) return 3
    if (s.wrong > 0) return 0
    const m = roundMedian(n)
    if (m !== null && m >= RECALL_SLOW_MS) return 1
    return 2
  }
  return [...pool].sort((a, b) => {
    const sa = stats[a], sb = stats[b]
    const ra = rank(a, sa), rb = rank(b, sb)
    if (ra !== rb) return ra - rb
    if (ra === 0 && sa && sb) {
      const rateA = sa.wrong / (sa.correct + sa.wrong)
      const rateB = sb.wrong / (sb.correct + sb.wrong)
      if (rateB !== rateA) return rateB - rateA
      return sb.wrong - sa.wrong
    }
    if (ra === 1) return (roundMedian(b) ?? 0) - (roundMedian(a) ?? 0)
    return 0
  })
}

export function RoundStatsPanel({ stats, pool, dir, low, high, onRestart }: Props) {
  const store = loadStore()
  const tested = pool.filter(n => stats[n])

  // Median recall latency across all numbers tested this round
  const allLatencies = tested.flatMap(n => stats[n]?.latencies ?? [])
  const roundMedian = medianMs(allLatencies)

  const ordered = sortedPool(pool, stats)
  const heading = low !== undefined && high !== undefined
    ? `Round ${String(low).padStart(2, '0')}–${String(high).padStart(2, '0')}`
    : 'Round'

  const { settings } = useSettings()
  const fastMs = masteryFastMs(settings.masteryLatencyFactor)
  const { mastered, total } = masteryProgress(pool, stats, fastMs)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{heading}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600 tabular-nums">{tested.length}/{pool.length}</span>
          {onRestart && (
            <button
              onClick={onRestart}
              className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Restart round"
            >↺</button>
          )}
        </div>
      </div>

      {roundMedian !== null && (
        <p className={`text-xs font-mono mb-1 ${recallColor(roundMedian)}`}>
          ⏱ {(roundMedian / 1000).toFixed(1)}s median
        </p>
      )}
      <p className={`text-xs font-medium mb-3 ${mastered === total && total > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
        ✅ Mastered {mastered}/{total}
      </p>

      <div className="space-y-0.5">
        {ordered.map(n => {
          const s = stats[n]
          const latencies = s?.latencies ?? []
          const allTime = store[`${dir}:${n}`]
          const allTimeTotal = allTime ? allTime.correct + allTime.wrong : 0
          const isSlowCorrect = s && s.wrong === 0 && s.correct > 0
            && s.lastMs !== undefined && s.lastMs >= RECALL_SLOW_MS
          const mastered_n = isMastered(s, fastMs)

          return (
            <div
              key={n}
              className={`flex items-center gap-2 px-2 py-1 rounded text-sm ${
                !s ? 'opacity-30'
                : s.wrong > 0 ? 'bg-red-500/5'
                : s.correct > 0 ? 'bg-green-500/5'
                : ''
              }`}
            >
              <span className={`font-bold tabular-nums w-5 shrink-0 ${!s ? 'text-zinc-500' : 'text-violet-400'}`}>
                {n}
              </span>

              {s ? (
                <span className="flex items-center gap-1.5 text-xs tabular-nums">
                  <span className="text-green-400">✓{s.correct}</span>
                  {s.wrong > 0 && <span className="text-red-400">✗{s.wrong}</span>}
                  {s.hintCount > 0 && <span title={`${s.hintCount} hint(s) used this round`}>💡</span>}
                  {isSlowCorrect && <span title="Slow but correct">🐢</span>}
                  {mastered_n && <span title="Mastered this round (spaced fast recall)">✅</span>}
                </span>
              ) : (
                <span className="text-xs text-zinc-700">—</span>
              )}

              <span className="ml-auto flex items-center gap-2">
                {allTimeTotal > 0 && (
                  <span className="text-[10px] text-zinc-600 tabular-nums" title="All-time correct / total">
                    ∞ {allTime.correct}/{allTimeTotal}
                  </span>
                )}
                <LatencyTag latencies={latencies} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
