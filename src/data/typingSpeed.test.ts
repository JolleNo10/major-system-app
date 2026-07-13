import { describe, it, expect } from 'vitest'
import { adjustLatency, recordTypingSpeed } from './typingSpeed'

// getMsPerChar falls back to the 160ms default when localStorage is unavailable
// (Node), so these assertions use that default.
describe('adjustLatency', () => {
  it('leaves multiple-choice latency unchanged (no typing)', () => {
    expect(adjustLatency(1500, 'multiple-choice', 0)).toBe(1500)
  })

  it('subtracts estimated typing time in typing mode', () => {
    expect(adjustLatency(2000, 'typing', 5)).toBe(2000 - 160 * 5) // 1200
  })

  it('floors at 20% of raw so it never over-subtracts to ~instant', () => {
    // 1000 - 160*10 = -600 → floored to 0.2*1000 = 200
    expect(adjustLatency(1000, 'typing', 10)).toBe(200)
  })

  it('does not adjust when chars is 0', () => {
    expect(adjustLatency(900, 'typing', 0)).toBe(900)
  })

  it('trains word and digit tracks independently', () => {
    const store = new Map<string, string>()
    ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(), key: () => null, length: 0,
    } as Storage

    // Train only the digit track (chars=2). perChar 500 vs default 160, drift up
    // 5% → 177. Word track (chars>=3) stays at the 160 default.
    recordTypingSpeed(1000, 2)
    expect(adjustLatency(1000, 'typing', 2)).toBe(1000 - 177 * 2) // digit track
    expect(adjustLatency(2000, 'typing', 5)).toBe(2000 - 160 * 5) // word track untouched
  })
})
