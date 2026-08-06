// Highlight the segment's Major-System words inside a freeform story. The words
// are an ordered sequence (repeats allowed), so we walk the story left-to-right
// and consume one expected word at a time: each expected word highlights the
// *next* story token that starts or ends with it (edge match, so "biten" hits
// "bit" and "fotballmål" hits "mål"), never an earlier or a later one.
// Expected words with no remaining match are reported as missing.
//
// e.g. words [ball, hale, ball] over "… ball, ball …, hale, … ball, hale"
//      → 1st ball, 1st hale, 3rd ball highlighted; 2nd ball + last hale are not.

export interface StorySegment { text: string; matched: boolean }
export interface StoryHighlight {
  segments: StorySegment[]  // the story split into runs, each flagged matched/not
  missing: string[]         // expected words (original case, deduped) with no match left
}

const norm = (s: string) => s.toLowerCase().trim()

export function highlightStory(text: string, expectedWords: string[]): StoryHighlight {
  // Split on non-alphanumeric runs, keeping the separators so we can reassemble.
  // \p{L} covers accented letters (å/ä/ö); \p{N} keeps digit runs intact.
  const parts = text.split(/([^\p{L}\p{N}]+)/u).filter(p => p !== '')
  const matched = new Array<boolean>(parts.length).fill(false)

  // Indices (into `parts`) of the word tokens, in order.
  const wordIdx: number[] = []
  for (let i = 0; i < parts.length; i++) {
    if (/[\p{L}\p{N}]/u.test(parts[i])) wordIdx.push(i)
  }

  const missing: string[] = []
  let cursor = 0  // next unconsumed position within wordIdx
  for (const w of expectedWords) {
    const base = norm(w)
    if (!base) continue
    let hit = -1
    for (let j = cursor; j < wordIdx.length; j++) {
      const token = norm(parts[wordIdx[j]])
      if (token.startsWith(base) || token.endsWith(base)) { hit = j; break }
    }
    if (hit >= 0) {
      matched[wordIdx[hit]] = true
      cursor = hit + 1
    } else {
      // No occurrence left; don't advance the cursor so later words can still
      // match from here.
      missing.push(w.trim())
    }
  }

  const segments = parts.map((text, i) => ({ text, matched: matched[i] }))
  const missingDeduped = [...new Set(missing)]
  return { segments, missing: missingDeduped }
}
