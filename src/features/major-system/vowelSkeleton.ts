const VOWELS = new Set([..."aeiouyæøå"])

export function vowelSkeleton(word: string): string {
  return [...word].map(ch => {
    if (ch === ' ' || ch === '-') return ch
    return VOWELS.has(ch.toLowerCase()) ? ch : '_'
  }).join('')
}
