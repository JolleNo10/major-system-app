import { useRef } from 'react'
import { WordListGrid } from './WordListGrid'
import { useCardWords } from '../context/CardWordsContext'
import { useOverlay } from '../hooks/useOverlay'
import { CARDS, CARD_NUMBERS } from '../data/cards'
import type { Suit } from '../data/cards'

// number → "rankSuit" (e.g. "A♠") and number → Card, for labels.
const CARD_BY_NUMBER = new Map(CARDS.map(c => [c.number, c]))

function suitNumbers(suit: Suit): string[] {
  return CARDS.filter(c => c.suit === suit).map(c => c.number)
}

const GROUPS: { label: string; keys: string[] }[] = [
  { label: '♠ Spades — Actors', keys: suitNumbers('♠') },
  { label: '♥ Hearts — Cartoon / anime / game characters', keys: suitNumbers('♥') },
  { label: '♦ Diamonds — Musicians & public figures', keys: suitNumbers('♦') },
  { label: '♣ Clubs — Major words', keys: suitNumbers('♣') },
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
  const ref = useRef<HTMLDivElement>(null)
  const words = useCardWords()
  useOverlay(ref, onClose)

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Themed Deck words" tabIndex={-1} className="fixed inset-0 z-50 flex flex-col bg-zinc-950 animate-fade-in outline-none">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 shrink-0">
        <span className="font-bold text-zinc-100">🃏 Themed Deck — Word List</span>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-xl"
          title="Close (Esc)"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <WordListGrid
            store={words}
            keys={CARD_NUMBERS}
            groups={GROUPS}
            renderLabel={renderLabel}
            showAccuracy={false}
            exportName="card-words.csv"
          />
        </div>
      </div>
    </div>
  )
}
