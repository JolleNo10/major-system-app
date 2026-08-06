import { WordListGrid } from '@/core/ui/WordListGrid'
import { Overlay } from '@/app/layout/Overlay'
import { useCardWords } from '@/features/cards/themed/CardWordsContext'
import { CARDS, CARD_NUMBERS } from '@/core/cards'
import type { Suit } from '@/core/cards'

// number → "rankSuit" (e.g. "A♠") and number → Card, for labels.
const CARD_BY_NUMBER = new Map(CARDS.map(c => [c.number, c]))

function suitNumbers(suit: Suit): string[] {
  return CARDS.filter(c => c.suit === suit).map(c => c.number)
}

const GROUPS: { label: string; keys: string[] }[] = [
  { label: '♣ Clubs — Major words', keys: suitNumbers('♣') },
  { label: '♦ Diamonds — Musicians & public figures', keys: suitNumbers('♦') },
  { label: '♥ Hearts — Cartoon / anime / game characters', keys: suitNumbers('♥') },
  { label: '♠ Spades — Actors', keys: suitNumbers('♠') },
]

function renderLabel(number: string) {
  const card = CARD_BY_NUMBER.get(number)
  if (!card) return number
  return (
    <span className={card.red ? 'text-rose-400' : 'text-zinc-400'}>
      {card.rank}{card.suit}
    </span>
  )
}

interface Props {
  onClose: () => void
}

export function CardWordsOverlay({ onClose }: Props) {
  const words = useCardWords()

  return (
    <Overlay
      onClose={onClose}
      ariaLabel="Themed Deck words"
      header={<span className="font-bold text-zinc-100">🃏 Themed Deck — Word List</span>}
      maxWidth="max-w-4xl"
    >
      <WordListGrid
        store={words}
        keys={CARD_NUMBERS}
        groups={GROUPS}
        renderLabel={renderLabel}
        showAccuracy={false}
        exportName="card-words.csv"
      />
    </Overlay>
  )
}
