// Answer matching for word/name typing. Accepts either the full answer or any
// single word in it that is 2+ letters long — e.g. "Tom" or "Cruise" for
// "Tom Cruise", and "sikte" for "i sikte bla bla" (but not the single letter
// "i"). Case- and whitespace-insensitive. For single-word answers the per-word
// branch is a no-op, so this is safe to use for every word drill.

export function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0] ?? ''
}

export function matchesAnswer(input: string, answer: string): boolean {
  const v = input.trim().toLowerCase()
  if (!v) return false
  const a = answer.trim().toLowerCase()
  if (v === a) return true
  return a.split(/\s+/).some(word => word.length >= 2 && v === word)
}

// Lenient variant for drills where word *forms* should pass — the typed word and
// the stored word may differ by an inflection or a compound part, e.g. "hanske"
// for "hansken", or "mål" for "fotballmål". On top of the strict rules above it
// accepts a token-edge (prefix/suffix) stem match: one string starts or ends with
// the other, where the shared stem is at least EDGE_MIN letters (so 1–2 char noise
// doesn't match, while real short words like "mål" still do). Checked whole-string
// and per answer-word.
const EDGE_MIN = 3

function edgeMatch(full: string, stem: string): boolean {
  return stem.length >= EDGE_MIN && (full.startsWith(stem) || full.endsWith(stem))
}

export function matchesAnswerLoose(input: string, answer: string): boolean {
  if (matchesAnswer(input, answer)) return true
  const v = input.trim().toLowerCase()
  const a = answer.trim().toLowerCase()
  if (!v || !a) return false
  if (edgeMatch(a, v) || edgeMatch(v, a)) return true
  return a.split(/\s+/).some(word => edgeMatch(word, v) || edgeMatch(v, word))
}

// Number matching for the decode direction. Zero-pads so a single digit is
// accepted for 0–9 (e.g. "7" for "07").
export function matchesNumber(input: string, number: string): boolean {
  return input.trim().padStart(number.length, '0') === number
}
