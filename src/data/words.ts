// The canonical word list lives in words.csv (format: number,default,custom).
// Edit that file to change the shipped defaults, or edit words in-app
// (Referanse → Ordliste) and Persist/Export from there.
import raw from './words.csv?raw'
import { parseWordsCsv } from './wordsCsv'

const { rows, errors } = parseWordsCsv(raw)
if (errors.length) {
  // The seed is trusted data — surface problems loudly during dev/build.
  throw new Error(`words.csv is invalid:\n${errors.join('\n')}`)
}

// Shipped default = the "default" column (the seed's "custom" column is unused).
export const WORDS: Record<string, string> = Object.fromEntries(
  rows.map(r => [r.number, r.def]),
)

export const ALL_NUMBERS = Object.keys(WORDS)
