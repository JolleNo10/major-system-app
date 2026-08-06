import { useEffect, useMemo, useState } from 'react'
import { getAllAttempts } from '@/core/scoring/attemptStore'
import { medianMs } from '@/core/scoring/itemStore'
import { readJSON, safeSet } from '@/core/storage'
import { PAIRS_PER_SEGMENT } from '@/features/pi/shared/piStats'

// The Anchors traffic-light: how long the *pause into a segment* takes — the
// delay before you can recall its opening pair (the chain link). Two sources
// feed it, merged by recency:
//   - reciting — the `pi:<pos>` log already times every segment's opening pair;
//   - this drill — its own transition timings, kept here (NOT in the pi log) so
//     Anchors stays session-only for the Recite/Stats status dots.
// So a segment you've recited shows a light even though Anchors records nothing
// to the shared stats, and there's no "recited but untimed" gap.

const STORE_KEY = 'major-pi-anchor-pace'
const PI_KEY_PREFIX = 'pi:'
const RECENT = 3                 // last N timings that decide the light
const KEEP = 5                   // rolling history retained per segment
export const PACE_FAST_MS = 3000
export const PACE_SLOW_MS = 6000

export type AnchorPace = 'fast' | 'ok' | 'slow'

// The light plus the data behind it, for the hover tooltip.
export interface AnchorPaceInfo {
  pace: AnchorPace
  medianMs: number
  samples: number[]   // the recent timings that decided the light (oldest → newest)
}

interface Timing { at: number; ms: number }
export type AnchorPaceStore = Record<number, Timing[]>   // keyed by 0-indexed segment

export function loadAnchorPaceStore(): AnchorPaceStore {
  const raw = readJSON<AnchorPaceStore>(STORE_KEY, {})
  return raw && typeof raw === 'object' ? raw : {}
}

// Append one transition timing for a segment, capped to KEEP, and persist.
export function recordAnchorPace(store: AnchorPaceStore, seg: number, ms: number): AnchorPaceStore {
  const prev = store[seg] ?? []
  const next = { ...store, [seg]: [...prev, { at: Date.now(), ms }].slice(-KEEP) }
  safeSet(STORE_KEY, JSON.stringify(next))
  return next
}

// Median of the most recent RECENT timings → fast (≤ FAST) / ok (≤ SLOW) / slow,
// carrying the samples + median so the tooltip can show the data behind it.
export function paceInfoFromTimings(timings: Timing[]): AnchorPaceInfo | null {
  if (timings.length === 0) return null
  const samples = [...timings].sort((a, b) => a.at - b.at).slice(-RECENT).map(t => t.ms)
  const m = medianMs(samples)
  if (m === null) return null
  const pace: AnchorPace = m <= PACE_FAST_MS ? 'fast' : m <= PACE_SLOW_MS ? 'ok' : 'slow'
  return { pace, medianMs: m, samples }
}

export function paceFromTimings(timings: Timing[]): AnchorPace | null {
  return paceInfoFromTimings(timings)?.pace ?? null
}

// Per-segment pace, merging reciting timings (fetched from the pi log on
// `refreshKey`) with the live Anchors-drill store. Recomputes instantly when
// the drill records a new timing, without re-hitting IndexedDB.
export function useAnchorPaces(
  maxPairs: number,
  refreshKey: unknown,
  local: AnchorPaceStore,
): (AnchorPaceInfo | null)[] {
  const [recite, setRecite] = useState<Record<number, Timing[]>>({})

  useEffect(() => {
    let alive = true
    void getAllAttempts().then(all => {
      if (!alive) return
      const bySeg: Record<number, Timing[]> = {}
      for (const a of all) {
        if (!a.key.startsWith(PI_KEY_PREFIX)) continue
        const pos = parseInt(a.key.slice(PI_KEY_PREFIX.length), 10)
        // Only the opening pair of a segment is a chain anchor.
        if (!Number.isInteger(pos) || (pos - 1) % PAIRS_PER_SEGMENT !== 0) continue
        const seg = (pos - 1) / PAIRS_PER_SEGMENT
        ;(bySeg[seg] ??= []).push({ at: a.at, ms: a.ms })
      }
      setRecite(bySeg)
    })
    return () => { alive = false }
  }, [maxPairs, refreshKey])

  return useMemo(() => {
    const maxSegs = Math.floor(maxPairs / PAIRS_PER_SEGMENT)
    return Array.from({ length: maxSegs }, (_, seg) =>
      paceInfoFromTimings([...(recite[seg] ?? []), ...(local[seg] ?? [])]),
    )
  }, [recite, local, maxPairs])
}
