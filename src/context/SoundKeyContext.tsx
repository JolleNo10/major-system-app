import { useMemo } from 'react'
import { createWordStore } from './createWordStore'
import {
  SHIPPED_SOUND_KEY, buildSoundKey, buildAllSounds, buildSoundToDigit,
  type SoundKeyEntry, type SoundEntry,
} from '../data/soundKey'

// Editable sound key — same 3-layer store as the word list, keyed by composite
// "<digit>:<field>" strings (see data/soundKey.ts). The grid uses the raw store;
// drills and reference panels use the derived entries via useSoundKey().
const store = createWordStore(SHIPPED_SOUND_KEY, 'major-soundkey-saved', 'major-soundkey-overrides')

export const SoundKeyProvider = store.Provider
export const useSoundKeyStore = store.useStore

export interface SoundKeyDerived {
  entries: SoundKeyEntry[]
  allSounds: SoundEntry[]
  soundToDigit: Record<string, number>
}

export function useSoundKey(): SoundKeyDerived {
  const { words } = useSoundKeyStore()
  return useMemo(() => {
    const entries = buildSoundKey(words)
    return { entries, allSounds: buildAllSounds(entries), soundToDigit: buildSoundToDigit(entries) }
  }, [words])
}
