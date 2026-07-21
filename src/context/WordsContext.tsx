import { WORDS } from '../data/words'
import { createWordStore } from './createWordStore'

// Major System word list — the shared 00–99 map used across all drills.
const store = createWordStore(WORDS, 'major-word-saved', 'major-word-overrides')

export const WordsProvider = store.Provider
export const useWords = store.useStore
