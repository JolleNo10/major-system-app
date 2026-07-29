export function isNumericDraft(value: string, maxLength: number): boolean {
  return value.length <= maxLength && /^[0-9]*$/.test(value)
}

export function isCompleteNumericAnswer(value: string, length: number): boolean {
  return value.length === length && /^[0-9]+$/.test(value)
}

export function isValidNumericInsertion(
  current: string,
  inserted: string,
  selectionStart: number,
  selectionEnd: number,
  maxLength: number,
): boolean {
  const next = current.slice(0, selectionStart) + inserted + current.slice(selectionEnd)
  return isNumericDraft(next, maxLength)
}

export interface BatchTiming {
  pairCount: number
  ms: number
}

export function summarizeBatchTimings(timings: BatchTiming[]) {
  const totalMs = timings.reduce((sum, timing) => sum + timing.ms, 0)
  const pairCount = timings.reduce((sum, timing) => sum + timing.pairCount, 0)

  return {
    totalMs,
    pairCount,
    pairsPerSec: totalMs > 0 ? pairCount / (totalMs / 1000) : 0,
    averagePairMs: pairCount > 0 ? totalMs / pairCount : 0,
    slowestBatchMs: timings.reduce((max, timing) => Math.max(max, timing.ms), 0),
    hasMultiPairBatch: timings.some(timing => timing.pairCount > 1),
  }
}
