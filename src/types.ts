export type Mode =
  | 'home'
  | 'encoding'
  | 'decoding'
  | 'sound-key'
  | 'reverse-sound-key'
  | 'sequence'
  | 'speed-round'
  | 'weak-spots'
  | 'repetition'
  | 'pi-digits'
  | 'cards'

export type AnswerMode = 'multiple-choice' | 'typing'

export type Direction = 'enc' | 'dec'

export interface NumberStats {
  correct: number
  wrong: number
}

export type AllStats = Record<string, NumberStats>
