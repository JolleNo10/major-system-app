// Shared quiz helpers used across the drills. (Question *selection* lives in
// roundScheduler.ts; this module owns option/distractor construction + shuffle.)

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Distractor numbers for a multiple-choice question. Prefers same-decade
// numbers (same tens digit) first so wrong options are plausibly close.
export function pickDistractors(target: string, allNums: string[], count = 2): string[] {
  const sameDecade = shuffle(allNums.filter(n => n[0] === target[0] && n !== target))
  const others = shuffle(allNums.filter(n => n[0] !== target[0] && n !== target))
  return [...sameDecade, ...others].slice(0, count)
}

// Multiple-choice option sets for the two number↔word directions. Both put the
// correct answer in with same-decade-biased distractors, then shuffle.
export function buildEncOptions(number: string, words: Record<string, string>): string[] {
  const dist = pickDistractors(number, Object.keys(words))
  return shuffle([words[number], ...dist.map(n => words[n])])
}

export function buildDecOptions(number: string, words: Record<string, string>): string[] {
  const dist = pickDistractors(number, Object.keys(words))
  return shuffle([number, ...dist])
}
