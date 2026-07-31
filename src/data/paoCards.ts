// The PAO deck ships in paoCards.csv (one Person/Action/Object per card, keyed by
// card number '01'..'52'). It is editable in-app (PAO Deck → Edit words) with the
// same 3-layer store as the word/sound-key lists. Effective triples are derived
// from that store via usePaoCards(); nothing here is a live singleton beyond the
// shipped seed. Independent of the Themed Deck list (cardWords.csv).
import raw from './paoCards.csv?raw'
import { parsePaoCsv } from './paoCsv'
import { CARD_NUMBERS } from './cards'

export interface PaoCard {
  number: string   // '01'..'52'
  person: string
  action: string
  object: string
}

export const PAO_FIELDS = ['person', 'action', 'object'] as const
export type PaoField = typeof PAO_FIELDS[number]

// Store keys are composite so the flat createWordStore can hold one editable
// string per (card, field): e.g. "01:person", "01:action", "01:object".
export const paoKey = (number: string, field: PaoField): string => `${number}:${field}`

const { rows, errors } = parsePaoCsv(raw)
if (errors.length) {
  // The seed is trusted data — surface problems loudly during dev/build.
  throw new Error(`paoCards.csv is invalid:\n${errors.join('\n')}`)
}

// Shipped composite map: "<number>:<field>" → effective shipped string.
export const PAO_SHIPPED: Record<string, string> = {}
for (const r of rows) {
  PAO_SHIPPED[paoKey(r.number, 'person')] = r.person
  PAO_SHIPPED[paoKey(r.number, 'action')] = r.action
  PAO_SHIPPED[paoKey(r.number, 'object')] = r.object
}

// Rebuild the 52-card triple list from a store's effective composite map.
export function buildPaoCards(words: Record<string, string>): PaoCard[] {
  return CARD_NUMBERS.map(number => ({
    number,
    person: words[paoKey(number, 'person')] ?? '',
    action: words[paoKey(number, 'action')] ?? '',
    object: words[paoKey(number, 'object')] ?? '',
  }))
}
