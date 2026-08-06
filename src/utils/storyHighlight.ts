// Highlight the segment's Major-System words inside a freeform story, tolerating
// inflected/suffixed forms by a simple prefix match: a story token counts as the
// word when it starts with it ("biten" matches "bit", "bitar" matches "bit").
// Also reports which expected words never appear.

export interface StorySegment { text: string; matched: boolean }
export interface StoryHighlight {
  segments: StorySegment[]  // the story split into runs, each flagged matched/not
  missing: string[]         // expected words (original case) not found in the story
}

const norm = (s: string) => s.toLowerCase().trim()

export function highlightStory(text: string, expectedWords: string[]): StoryHighlight {
  // base (lowercased) → original-cased word, deduped, first occurrence wins.
  const baseToOrig = new Map<string, string>()
  for (const w of expectedWords) {
    const b = norm(w)
    if (b && !baseToOrig.has(b)) baseToOrig.set(b, w.trim())
  }
  const bases = [...baseToOrig.keys()]
  const found = new Set<string>()

  // Split on non-alphanumeric runs, keeping the separators so we can reassemble.
  // \p{L} covers accented letters (å/ä/ö); \p{N} keeps digit runs intact.
  const parts = text.split(/([^\p{L}\p{N}]+)/u)
  const segments: StorySegment[] = []
  for (const part of parts) {
    if (!part) continue
    const isWord = /[\p{L}\p{N}]/u.test(part)
    let matched = false
    if (isWord) {
      const t = norm(part)
      for (const b of bases) {
        if (t.startsWith(b)) { matched = true; found.add(b) }
      }
    }
    segments.push({ text: part, matched })
  }

  const missing = bases.filter(b => !found.has(b)).map(b => baseToOrig.get(b)!)
  return { segments, missing }
}
