import { useMemo } from 'react'
import { createWordStore } from './createWordStore'
import { PAO_SHIPPED, buildPaoCards, type PaoCard } from '../data/paoCards'

// Editable PAO deck — same 3-layer store as the word/sound-key lists, keyed by
// composite "<number>:<field>" strings (see data/paoCards.ts). The editor grid
// uses the raw store; the drills use the derived triples via usePaoCards().
const store = createWordStore(PAO_SHIPPED, 'major-pao-saved', 'major-pao-overrides')

export const PaoCardsProvider = store.Provider
export const usePaoStore = store.useStore

export interface PaoDerived {
  cards: PaoCard[]
  byNumber: Record<string, PaoCard>
}

export function usePaoCards(): PaoDerived {
  const { words } = usePaoStore()
  return useMemo(() => {
    const cards = buildPaoCards(words)
    const byNumber = Object.fromEntries(cards.map(c => [c.number, c]))
    return { cards, byNumber }
  }, [words])
}
