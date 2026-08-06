import { useEffect, useState } from 'react'
import { piSegmentStatuses, type PiSegmentStatus } from '@/features/pi/shared/piStats'

// Async-load per-segment learning status from the IndexedDB attempt log.
// `refreshKey` re-fetches when it changes — pass the tab's phase so the grid
// picks up fresh stats each time the user returns to the segment picker.
export function usePiSegmentStatuses(maxPiPairs: number, refreshKey: unknown): PiSegmentStatus[] {
  const [statuses, setStatuses] = useState<PiSegmentStatus[]>([])
  useEffect(() => {
    let alive = true
    piSegmentStatuses(maxPiPairs).then(s => { if (alive) setStatuses(s) })
    return () => { alive = false }
  }, [maxPiPairs, refreshKey])
  return statuses
}
