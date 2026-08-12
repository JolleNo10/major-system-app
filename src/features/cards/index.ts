// Required architecture before modification:
// docs/architecture/features/CARDS.md
//
// Public interface of the cards feature. External code (app/ and other
// features) imports from '@/features/cards'; everything else in this folder
// is internal. Keep this surface small.
//
// Internally split into shared/ (single-value Card→Word engine), themed/
// (Themed Deck), and pao/ (PAO Deck).

export { CardWordsProvider, useCardWords } from '@/features/cards/themed/CardWordsContext'
export { ThemedCardsDrill } from '@/features/cards/themed/ThemedCardsDrill'
export { PaoCardsProvider } from '@/features/cards/pao/PaoCardsContext'
export { PaoCardsDrill } from '@/features/cards/pao/PaoCardsDrill'
