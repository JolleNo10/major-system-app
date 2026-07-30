import { RECALL_FAST_MS, RECALL_SLOW_MS } from '../data/scoring'

// Tailwind text-color class for a recall-adjusted latency (ms): green = fast,
// red = slow, yellow in between. Presentation, kept out of the data/scoring layer.
export function recallColor(adjMs: number): string {
  if (adjMs <= RECALL_FAST_MS) return 'text-green-400'
  if (adjMs >= RECALL_SLOW_MS) return 'text-red-400'
  return 'text-yellow-400'
}
