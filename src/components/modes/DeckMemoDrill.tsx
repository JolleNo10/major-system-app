import { useState, useEffect, useCallback, useRef } from 'react'
import { CARDS } from '../../data/cards'
import type { Card, Suit } from '../../data/cards'
import { shuffle } from '../../utils/quiz'

const SUIT_LETTERS: Record<string, Suit> = {
  C: '♣', D: '♦', H: '♥', S: '♠',
}

function parseCard(raw: string, deck: Card[]): Card | null {
  const s = raw.trim().toUpperCase()
  if (s.length < 2) return null
  const suitChar = s.slice(-1)
  const rank = s.slice(0, -1)
  const suit = SUIT_LETTERS[suitChar]
  if (!suit) return null
  return deck.find(c => c.rank === rank && c.suit === suit) ?? null
}

function buildDeck(activeNumbers: string[]): Card[] {
  return shuffle(activeNumbers.map(n => CARDS.find(c => c.number === n)!))
}

function CardFace({ card, className = '' }: { card: Card; className?: string }) {
  const col = card.red ? 'text-rose-500' : 'text-zinc-900'
  return (
    <div className={`relative flex flex-col items-center justify-center w-36 h-52 rounded-2xl bg-zinc-100 shadow-2xl border-2 border-zinc-300 select-none ${className}`}>
      <div className={`absolute top-2.5 left-3 flex flex-col items-center leading-none ${col}`}>
        <span className="text-base font-black">{card.rank}</span>
        <span className="text-sm">{card.suit}</span>
      </div>
      <span className={`text-6xl ${col}`}>{card.suit}</span>
      <span className={`text-3xl font-black mt-0.5 ${col}`}>{card.rank}</span>
      <div className={`absolute bottom-2.5 right-3 flex flex-col items-center leading-none rotate-180 ${col}`}>
        <span className="text-base font-black">{card.rank}</span>
        <span className="text-sm">{card.suit}</span>
      </div>
    </div>
  )
}

type Phase = 'memo' | 'recall' | 'done'
type AnswerState = 'pending' | 'correct' | 'wrong'

interface Props {
  activeNumbers: string[]
  words: Record<string, string>
}

export function DeckMemoDrill({ activeNumbers, words }: Props) {
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(activeNumbers))
  const [phase, setPhase] = useState<Phase>('memo')
  const [memoPos, setMemoPos] = useState(0)
  const [recallPos, setRecallPos] = useState(0)
  const [input, setInput] = useState('')
  const [answerState, setAnswerState] = useState<AnswerState>('pending')
  const [results, setResults] = useState<boolean[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (phase === 'recall' && answerState === 'pending') {
      inputRef.current?.focus()
    }
  }, [phase, recallPos, answerState])

  const handleSubmit = useCallback(() => {
    if (answerState !== 'pending' || phase !== 'recall') return
    const matched = parseCard(input, deck)
    const correct = matched?.number === deck[recallPos].number
    setAnswerState(correct ? 'correct' : 'wrong')
    setResults(prev => [...prev, correct])
    setInput('')
    setTimeout(() => {
      const next = recallPos + 1
      if (next >= deck.length) {
        setPhase('done')
      } else {
        setRecallPos(next)
        setAnswerState('pending')
      }
    }, correct ? 1400 : 2000)
  }, [answerState, phase, input, deck, recallPos])

  const restart = useCallback((reshuffle: boolean) => {
    if (reshuffle) setDeck(buildDeck(activeNumbers))
    setPhase('memo')
    setMemoPos(0)
    setRecallPos(0)
    setInput('')
    setAnswerState('pending')
    setResults([])
  }, [activeNumbers])

  // Memo phase keyboard: Space / → / Enter advances
  useEffect(() => {
    if (phase !== 'memo') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        if (memoPos < deck.length - 1) {
          setMemoPos(p => p + 1)
        } else {
          setPhase('recall')
          setRecallPos(0)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, memoPos, deck.length])

  // ── Memo phase ──────────────────────────────────────────────────────────────
  if (phase === 'memo') {
    const card = deck[memoPos]
    const isLast = memoPos === deck.length - 1

    return (
      <div className="flex flex-col items-center gap-5 py-2">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="uppercase tracking-widest">Memorize</span>
          <span className="text-zinc-400 tabular-nums">{memoPos + 1} / {deck.length}</span>
        </div>

        {/* Progress strip */}
        <div className="flex gap-0.5 flex-wrap justify-center max-w-sm">
          {deck.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-3.5 rounded-full transition-colors ${
                i < memoPos ? 'bg-violet-600' : i === memoPos ? 'bg-violet-400' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <CardFace card={card} />

        <div className="text-center">
          <p className="text-zinc-500 text-xs font-mono tabular-nums">{card.number}</p>
          <p className="text-zinc-200 text-lg font-semibold mt-0.5">{words[card.number]}</p>
        </div>

        {isLast ? (
          <button
            onClick={() => { setPhase('recall'); setRecallPos(0) }}
            className="px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
          >Start Recall →</button>
        ) : (
          <button
            onClick={() => setMemoPos(p => p + 1)}
            className="px-6 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors"
          >Next →</button>
        )}

        <p className="text-xs text-zinc-700">Space / → to advance</p>
      </div>
    )
  }

  // ── Recall phase ─────────────────────────────────────────────────────────────
  if (phase === 'recall') {
    const correctCard = deck[recallPos]
    const correctCount = results.filter(Boolean).length

    return (
      <div className="flex flex-col items-center gap-5 w-full py-2">
        <div className="flex justify-between w-full max-w-sm text-xs">
          <span className="text-zinc-500 uppercase tracking-widest">Recall</span>
          <span className="text-zinc-400 tabular-nums">
            {recallPos + 1} / {deck.length} &middot; {correctCount} ✓
          </span>
        </div>

        {/* Card slot */}
        {answerState === 'pending' && (
          <div className="w-36 h-52 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 flex items-center justify-center">
            <span className="text-zinc-600 text-5xl font-black">?</span>
          </div>
        )}
        {answerState === 'correct' && (
          <div className="animate-deal">
            <CardFace card={correctCard} className="border-green-500" />
          </div>
        )}
        {answerState === 'wrong' && (
          <div className="relative animate-fade-in">
            <CardFace card={correctCard} className="border-red-500 opacity-75" />
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-red-950/70">
              <span className="text-red-400 text-5xl font-black">✗</span>
            </div>
          </div>
        )}

        {answerState === 'correct' && (
          <p className="text-green-400 text-sm font-medium">Correct!</p>
        )}
        {answerState === 'wrong' && (
          <p className="text-red-400 text-sm">
            Wrong — was{' '}
            <span className="font-mono font-bold">
              {correctCard.rank}{correctCard.suit}
            </span>
            {' '}({words[correctCard.number]})
          </p>
        )}

        {answerState === 'pending' && (
          <div className="flex gap-2 w-full max-w-xs">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
              placeholder="e.g. AC, 10H, KS"
              className="flex-1 px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 font-mono text-base tracking-wider"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
            >✓</button>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex gap-1.5 flex-wrap justify-center max-w-sm">
          {results.map((ok, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
              title={`${deck[i].rank}${deck[i].suit}`}
            />
          ))}
          {answerState === 'pending' && (
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
          )}
          {Array.from({
            length: deck.length - results.length - (answerState === 'pending' ? 1 : 0),
          }).map((_, i) => (
            <div key={`r-${i}`} className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          ))}
        </div>
      </div>
    )
  }

  // ── Done phase ───────────────────────────────────────────────────────────────
  const correct = results.filter(Boolean).length
  const pct = Math.round((correct / deck.length) * 100)

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <p className="text-4xl font-bold tabular-nums">
          {correct}
          <span className="text-zinc-500 text-2xl font-normal"> / {deck.length}</span>
        </p>
        <p className="text-zinc-400 text-sm mt-1">{pct}% correct</p>
      </div>

      {/* Result dots — click to see the card that slot was */}
      <div className="flex gap-1.5 flex-wrap justify-center max-w-sm">
        {results.map((ok, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
            title={`Card ${i + 1}: ${deck[i].rank}${deck[i].suit} (${words[deck[i].number]})`}
          />
        ))}
      </div>

      <div className="flex gap-3 mt-2">
        <button
          onClick={() => restart(false)}
          className="px-5 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors"
        >Same order</button>
        <button
          onClick={() => restart(true)}
          className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
        >Reshuffle</button>
      </div>
    </div>
  )
}
