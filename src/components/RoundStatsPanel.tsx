import { loadStore, medianMs, FAST_MS, SLOW_MS, type ItemRecord } from '../data/itemStore'
import type { Direction } from '../types'
import type { AnswerMode } from '../types'

export interface RoundStat {
  correct: number
  wrong: number
  lastMs?: number
}

interface Props {
  stats: Record<string, RoundStat>
  pool: string[]
  dir: Direction
  answerMode: AnswerMode
}

function latencyColor(ms: number, answerMode: AnswerMode): string {
  if (ms <= FAST_MS[answerMode]) return 'text-green-400'
  if (ms >= SLOW_MS[answerMode]) return 'text-red-400'
  return 'text-yellow-400'
}

function LatencyTag({ latencies, answerMode }: { latencies: number[]; answerMode: AnswerMode }) {
  const median = medianMs(latencies)
  if (median === null) return <span className="text-xs text-zinc-700 tabular-nums w-9 text-right">—</span>
  return (
    <span className={`text-xs font-mono tabular-nums w-9 text-right ${latencyColor(median, answerMode)}`}>
      {(median / 1000).toFixed(1)}s
    </span>
  )
}

// Sort uses store median (stable history) so rank is consistent with the latency tag display.
// Turtle icon (isSlowCorrect) separately uses lastMs for immediate per-answer feedback.
function sortedPool(
  pool: string[],
  stats: Record<string, RoundStat>,
  store: Record<string, ItemRecord>,
  dir: Direction,
  answerMode: AnswerMode,
): string[] {
  const storeMedian = (n: string) => medianMs(store[`${dir}:${n}`]?.latencies ?? [])
  const rank = (n: string, s: RoundStat | undefined): number => {
    if (!s) return 3
    if (s.wrong > 0) return 0
    const m = storeMedian(n)
    if (m !== null && m >= SLOW_MS[answerMode]) return 1
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
    if (ra === 1) return (storeMedian(b) ?? 0) - (storeMedian(a) ?? 0)
    return 0
  })
}

export function RoundStatsPanel({ stats, pool, dir, answerMode }: Props) {
  const store = loadStore()
  const tested = pool.filter(n => stats[n])

  // Median latency across all tested numbers (rolling window from store)
  const allLatencies = tested.flatMap(n => store[`${dir}:${n}`]?.latencies ?? [])
  const sessionMedian = medianMs(allLatencies)

  const ordered = sortedPool(pool, stats, store, dir, answerMode)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Runde</p>
        <span className="text-xs text-zinc-600 tabular-nums">{tested.length}/{pool.length}</span>
      </div>

      {sessionMedian !== null && (
        <p className={`text-xs font-mono mb-3 ${latencyColor(sessionMedian, answerMode)}`}>
          ⏱ {(sessionMedian / 1000).toFixed(1)}s median
        </p>
      )}
      {sessionMedian === null && <div className="mb-3" />}

      <div className="space-y-0.5">
        {ordered.map(n => {
          const s = stats[n]
          const item = store[`${dir}:${n}`]
          const latencies = item?.latencies ?? []
          const isSlowCorrect = s && s.wrong === 0 && s.correct > 0
            && s.lastMs !== undefined && s.lastMs >= SLOW_MS[answerMode]

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
                  {(item?.hintCount ?? 0) > 0 && <span title={`${item!.hintCount} hint brukt`}>💡</span>}
                  {isSlowCorrect && <span title="Treg men riktig">🐢</span>}
                </span>
              ) : (
                <span className="text-xs text-zinc-700">—</span>
              )}

              <span className="ml-auto">
                <LatencyTag latencies={latencies} answerMode={answerMode} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
