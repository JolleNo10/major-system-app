import { CARD_WORDS } from '../data/cardWords'
import { createWordStore } from './createWordStore'

// Themed Deck word list — a separate 01–52 map (one person/word per card),
// with its own storage keys so it never touches the Major System list.
const store = createWordStore(CARD_WORDS, 'major-cardword-saved', 'major-cardword-overrides')

export const CardWordsProvider = store.Provider
export const useCardWords = store.useStore
