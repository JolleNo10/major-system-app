// The sound key ships in soundKey.csv (digit ↔ sounds/display/hint). It is
// editable in-app (Reference → Sound Key) with the same 3-layer store + CSV
// import/export as the word list. Effective entries are derived from that store
// via useSoundKey(); nothing here is a live singleton beyond the shipped seed.
import raw from './soundKey.csv?raw'
import { parseSoundKeyCsv } from './soundKeyCsv'

export interface SoundKeyEntry {
  digit: number
  sounds: string[]
  display: string
  hint: string
}

export interface SoundEntry {
  sound: string
  digit: number
  display: string
}

export const SOUND_KEY_FIELDS = ['sounds', 'hint'] as const
export type SoundKeyField = typeof SOUND_KEY_FIELDS[number]

// Store keys are composite so the flat createWordStore can hold one editable
// string per (digit, field): e.g. "7:sounds", "7:hint". `display` is derived
// from `sounds` (comma-joined), not stored, so it can't drift out of sync.
export const skKey = (digit: number | string, field: SoundKeyField): string => `${digit}:${field}`

export const parseSounds = (cell: string): string[] =>
  cell.split(',').map(t => t.trim()).filter(Boolean)

const { rows, errors } = parseSoundKeyCsv(raw)
if (errors.length) {
  // The seed is trusted data — surface problems loudly during dev/build.
  throw new Error(`soundKey.csv is invalid:\n${errors.join('\n')}`)
}

// Shipped composite map: "<digit>:<field>" → effective shipped string.
export const SHIPPED_SOUND_KEY: Record<string, string> = {}
for (const r of rows) {
  SHIPPED_SOUND_KEY[skKey(r.digit, 'sounds')] = r.sounds.custom || r.sounds.def
  SHIPPED_SOUND_KEY[skKey(r.digit, 'hint')] = r.hint.custom || r.hint.def
}

// Rebuild the 0–9 entry list from a store's effective composite map.
export function buildSoundKey(words: Record<string, string>): SoundKeyEntry[] {
  return Array.from({ length: 10 }, (_, digit) => {
    const sounds = parseSounds(words[skKey(digit, 'sounds')] ?? '')
    return {
      digit,
      sounds,
      display: sounds.join(', '),
      hint: words[skKey(digit, 'hint')] ?? '',
    }
  })
}

export function buildAllSounds(entries: SoundKeyEntry[]): SoundEntry[] {
  return entries.flatMap(e => e.sounds.map(s => ({ sound: s, digit: e.digit, display: e.display })))
}

export function buildSoundToDigit(entries: SoundKeyEntry[]): Record<string, number> {
  return Object.fromEntries(entries.flatMap(e => e.sounds.map(s => [s, e.digit])))
}
