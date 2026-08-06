// Public interface of the major-system feature. External code (app/ and other
// features) imports from '@/features/major-system'; everything else in this folder
// is internal. Keep this surface small.

export { DecodingDrill } from '@/features/major-system/DecodingDrill'
export { EncodingDrill } from '@/features/major-system/EncodingDrill'
export { RepetitionDrill } from '@/features/major-system/RepetitionDrill'
export { ReverseSoundKeyDrill } from '@/features/major-system/ReverseSoundKeyDrill'
export { SequenceDrill } from '@/features/major-system/SequenceDrill'
export { SoundKeyProvider } from '@/features/major-system/SoundKeyContext'
export { SoundKeyDrill } from '@/features/major-system/SoundKeyDrill'
export { SoundKeyGrid } from '@/features/major-system/SoundKeyGrid'
export { SpeedRound } from '@/features/major-system/SpeedRound'
export { WeakSpots } from '@/features/major-system/WeakSpots'
export { useWords, WordsProvider } from '@/features/major-system/WordsContext'
export { WORDS } from '@/features/major-system/words'
