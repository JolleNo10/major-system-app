// Answer matching for word/name typing. Accepts either the full answer or just
// its first word — e.g. "Tom" is accepted for "Tom Cruise". Case- and
// whitespace-insensitive. For single-word answers the first-word branch is a
// no-op, so this is safe to use for every word drill.

export function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0] ?? ''
}

export function matchesAnswer(input: string, answer: string): boolean {
  const v = input.trim().toLowerCase()
  if (!v) return false
  const a = answer.trim().toLowerCase()
  return v === a || v === firstWord(a)
}

// Number matching for the decode direction. Zero-pads so a single digit is
// accepted for 0–9 (e.g. "7" for "07").
export function matchesNumber(input: string, number: string): boolean {
  return input.trim().padStart(number.length, '0') === number
}
