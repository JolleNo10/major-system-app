export interface SoundKeyEntry {
  digit: number
  sounds: string[]
  display: string
  hint: string
}

export const SOUND_KEY: SoundKeyEntry[] = [
  { digit: 0, sounds: ['s', 'z'],              display: 's, z',           hint: '"0" ligner en S som ligger ned' },
  { digit: 1, sounds: ['t', 'd'],              display: 't, d',           hint: 'T og D har 1 loddrett strek' },
  { digit: 2, sounds: ['n'],                   display: 'n',              hint: 'N har 2 loddrette streker' },
  { digit: 3, sounds: ['m'],                   display: 'm',              hint: 'M har 3 loddrette streker' },
  { digit: 4, sounds: ['r'],                   display: 'r',              hint: 'R – siste bokstav i "fouR"' },
  { digit: 5, sounds: ['l'],                   display: 'l',              hint: 'L = 50 på romertall' },
  { digit: 6, sounds: ['sj', 'kj', 'skj', 'tj'], display: 'sj, kj, skj, tj', hint: 'Sj-lyden, som i "sjef"' },
  { digit: 7, sounds: ['k', 'g'],              display: 'k, g (hard)',    hint: 'K ser ut som 2 × 7' },
  { digit: 8, sounds: ['f', 'v'],              display: 'f, v',           hint: 'F/V ser ut som en 8 på siden' },
  { digit: 9, sounds: ['p', 'b'],              display: 'p, b',           hint: 'P er 9 speilvendt; B er 9 invertert' },
]

export interface SoundEntry {
  sound: string
  digit: number
  display: string
}

export const ALL_SOUNDS: SoundEntry[] = SOUND_KEY.flatMap(e =>
  e.sounds.map(s => ({ sound: s, digit: e.digit, display: e.display }))
)

export const SOUND_TO_DIGIT: Record<string, number> = Object.fromEntries(
  SOUND_KEY.flatMap(e => e.sounds.map(s => [s, e.digit]))
)
