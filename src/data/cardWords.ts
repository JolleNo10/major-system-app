// Themed Deck word list — one person/word per card, keyed by card number '01'..'52'
// (♣=01-13, ♦=14-26, ♥=27-39, ♠=40-52). Separate from the Major System list (words.csv);
// clubs 01-13 are a standalone snapshot of the major defaults, not linked afterward.
// Edit cardWords.csv to change the shipped defaults, or edit in-app (Themed Deck → Edit words).
import raw from './cardWords.csv?raw'
import { parseWordsCsv } from './wordsCsv'

const { rows, errors } = parseWordsCsv(raw)
if (errors.length) {
  // The seed is trusted data — surface problems loudly during dev/build.
  throw new Error(`cardWords.csv is invalid:\n${errors.join('\n')}`)
}

// Shipped default = the "default" column (the seed's "custom" column is unused).
export const CARD_WORDS: Record<string, string> = Object.fromEntries(
  rows.map(r => [r.number, r.def]),
)
