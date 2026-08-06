// Public interface of the cards feature. External code (app/ and other
// features) imports from '@/features/cards'; everything else in this folder
// is internal. Keep this surface small.
//
// Internally split into flavors: shared/ (Card→Word/Number engine),
// card/ (Major Cards), themed/ (Themed Deck), pao/ (PAO Deck).

export { CardWordsProvider, useCardWords } from '@/features/cards/themed/CardWordsContext'
export { MajorCardsDrill } from '@/features/cards/card/MajorCardsDrill'
export { ThemedCardsDrill } from '@/features/cards/themed/ThemedCardsDrill'
export { PaoCardsProvider } from '@/features/cards/pao/PaoCardsContext'
export { PaoCardsDrill } from '@/features/cards/pao/PaoCardsDrill'
