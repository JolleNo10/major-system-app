/** A randomized bag whose items are exhausted before any item is repeated. */
export interface ShuffleBagState<T> {
  remaining: readonly T[]
  lastDrawn: T | null
}
export interface ShuffleBagDraw<T> {
  value: T
  state: ShuffleBagState<T>
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)]
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.max(0, Math.min(0.999999999, random())) * (index + 1))
    ;[result[index], result[swapWith]] = [result[swapWith], result[index]]
  }
  return result
}

export function createShuffleBag<T>(
  items: readonly T[],
  random: () => number = Math.random,
): ShuffleBagState<T> {
  return { remaining: shuffle(unique(items), random), lastDrawn: null }
}

/** Draw one item and refill with a fresh shuffled bag when necessary. */
export function drawShuffleBag<T>(
  state: ShuffleBagState<T>,
  items: readonly T[],
  random: () => number = Math.random,
): ShuffleBagDraw<T> | null {
  const source = unique(items)
  if (source.length === 0) return null

  let remaining = [...state.remaining]
  if (remaining.length === 0) {
    remaining = shuffle(source, random)
    // Avoid the only unhelpful boundary case when the bag has alternatives.
    if (remaining.length > 1 && Object.is(remaining[0], state.lastDrawn)) {
      ;[remaining[0], remaining[1]] = [remaining[1], remaining[0]]
    }
  }

  const [value, ...nextRemaining] = remaining
  return {
    value,
    state: { remaining: nextRemaining, lastDrawn: value },
  }
}
