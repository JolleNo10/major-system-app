export type Suit = '♣' | '♦' | '♥' | '♠'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  suit: Suit
  rank: Rank
  number: string  // zero-padded 2-digit string '01'..'52'
  red: boolean
}

// Alphabetical suit order: Clubs=01-13, Diamonds=14-26, Hearts=27-39, Spades=40-52
const SUITS: Suit[] = ['♣', '♦', '♥', '♠']
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

// Rank index (0=A .. 12=K) for a 2-digit card number, independent of suit.
export const rankIndex = (number: string): number => (parseInt(number, 10) - 1) % 13

export const CARDS: Card[] = SUITS.flatMap((suit, si) =>
  RANKS.map((rank, ri) => ({
    suit,
    rank,
    number: String(si * 13 + ri + 1).padStart(2, '0'),
    red: suit === '♥' || suit === '♦',
  }))
)

export const CARD_NUMBERS: string[] = CARDS.map(c => c.number)
