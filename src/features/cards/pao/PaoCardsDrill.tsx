import { useCallback, useRef, useState } from 'react'
import { useSettings } from '@/app/settings/SettingsContext'
import { usePaoCards } from '@/features/cards/pao/PaoCardsContext'
import { MultipleChoice } from '@/core/ui/MultipleChoice'
import { TypingInput } from '@/core/ui/TypingInput'
import { ScoreBar } from '@/core/ui/ScoreBar'
import { PaoWordsOverlay } from '@/features/cards/pao/PaoWordsOverlay'
import { PaoDeckMemoDrill } from '@/features/cards/pao/PaoDeckMemoDrill'
import { adjustLatency } from '@/core/scoring/typingSpeed'
import { masteryProgress, masteryFastMs } from '@/core/scoring/roundMastery'
import { shuffle, pickDistractors, pickWeighted } from '@/core/scoring/quiz'
import { applyRoundAttempt, type RoundStat } from '@/core/scoring/roundStats'
import { readString, readJSON, safeSet } from '@/core/storage'
import { matchesAnswerLoose } from '@/core/answerMatch'
import { CARDS, RANKS, rankIndex } from '@/core/cards'
import type { Card, Suit } from '@/core/cards'
import { PAO_FIELDS, type PaoField } from '@/features/cards/pao/paoCards'
import type { AnswerMode } from '@/core/types'
import { RankRangeSelector } from '@/core/ui/RankRangeSelector'

const ALL_SUITS: Suit[] = ['♣', '♦', '♥', '♠']
const SUIT_LETTERS: Record<string, Suit> = { C: '♣', D: '♦', H: '♥', S: '♠' }
const CARD_BY_NUMBER = new Map(CARDS.map(c => [c.number, c]))

type PaoDrillType = 'encode' | 'decode' | 'deck-memo'

const DRILL_LABELS: Record<PaoDrillType, string> = {
  encode: 'Encode',
  decode: 'Decode',
  'deck-memo': 'Deck Memo',
}

const FIELD_LABELS: Record<PaoField, string> = { person: 'Person', action: 'Action', object: 'Object' }

const cardLabel = (card: Card) => `${card.rank}${card.suit}`

function parseCardCode(raw: string): Card | null {
  const s = raw.trim().toUpperCase()
  if (s.length < 2) return null
  const suit = SUIT_LETTERS[s.slice(-1)]
  if (!suit) return null
  return CARDS.find(c => c.rank === s.slice(0, -1) && c.suit === suit) ?? null
}

function numbersForSuits(suits: Set<Suit>): string[] {
  return CARDS.filter(c => suits.has(c.suit)).map(c => c.number)
}

function loadSuits(key: string): Set<Suit> {
  const parsed = readJSON<string[]>(key, [])
  const valid = parsed.filter((s): s is Suit => (ALL_SUITS as string[]).includes(s))
  return valid.length > 0 ? new Set(valid) : new Set(ALL_SUITS)
}

const LAST_RANK = RANKS.length - 1

function loadRankRange(key: string): [number, number] {
  const p = readJSON<number[]>(key, [])
  if (p.length === 2 && p[0] >= 0 && p[1] <= LAST_RANK && p[0] <= p[1]) return [p[0], p[1]]
  return [0, LAST_RANK]
}

function limitByRank(numbers: string[], range: [number, number]): string[] {
  return numbers.filter(n => rankIndex(n) >= range[0] && rankIndex(n) <= range[1])
}

const emptyInput = { person: '', action: '', object: '' }

interface Props {
  answerMode: AnswerMode
}

export function PaoCardsDrill({ answerMode }: Props) {
  const { settings } = useSettings()
  const { byNumber } = usePaoCards()

  const drilltypeKey = 'major-pao-drilltype'
  const suitsKey = 'major-pao-suits'
  const deckCountKey = 'major-pao-deck-count'
  const decodeFieldKey = 'major-pao-decode-field'
  const rankRangeKey = 'major-pao-rank-range'

  const [showWords, setShowWords] = useState(false)

  const [drillType, setDrillType] = useState<PaoDrillType>(() => {
    const v = readString(drilltypeKey)
    return v === 'decode' || v === 'deck-memo' ? v : 'encode'
  })
  const [decodeField, setDecodeField] = useState<PaoField>(() => {
    const v = readString(decodeFieldKey)
    return (PAO_FIELDS as readonly string[]).includes(v ?? '') ? (v as PaoField) : 'person'
  })

  const [activeSuits, setActiveSuits] = useState<Set<Suit>>(() => loadSuits(suitsKey))
  const activeNumbers = numbersForSuits(activeSuits)

  // Rank range narrows the Encode pool when exactly one suit is selected.
  const [rankRange, setRankRange] = useState<[number, number]>(() => loadRankRange(rankRangeKey))
  const singleSuit = activeSuits.size === 1
  // Card pool for Encode/Decode: Encode with a single suit is limited to the rank
  // window; Decode uses the full suit. (Deck Memo builds its own deck from all cards.)
  const poolFor = (t: PaoDrillType) =>
    t === 'encode' && singleSuit ? limitByRank(activeNumbers, rankRange) : activeNumbers
  const drillNumbers = poolFor(drillType)

  const [deckCount, setDeckCount] = useState<number>(() => {
    const nums = numbersForSuits(loadSuits(suitsKey))
    const n = parseInt(readString(deckCountKey) ?? '', 10)
    if (!isNaN(n) && n >= 2) return Math.min(n, nums.length)
    return nums.length
  })

  // ── Per-question state ──────────────────────────────────────────────────────
  const [roundStats, setRoundStats] = useState<Record<string, RoundStat>>({})
  const masteredSetRef = useRef<Set<string>>(new Set())
  const startRef = useRef<number>(Date.now())

  const pickCard = useCallback((last: string | undefined, nums: string[]): Card => {
    const available = last ? nums.filter(n => n !== last) : nums
    const pool = available.length > 0 ? available : nums
    const number = pickWeighted('enc', pool, masteredSetRef.current)
    return CARD_BY_NUMBER.get(number)!
  }, [])

  const makeDecode = useCallback((card: Card, field: PaoField, nums: string[]) => {
    const value = byNumber[card.number]?.[field] ?? ''
    const distractors = pickDistractors(card.number, nums).map(n => cardLabel(CARD_BY_NUMBER.get(n)!))
    return { value, options: shuffle([cardLabel(card), ...distractors]) }
  }, [byNumber])

  const [card, setCard] = useState<Card>(() => pickCard(undefined, drillNumbers))
  const [decode, setDecode] = useState(() => makeDecode(card, decodeField, drillNumbers))

  const [encodeInput, setEncodeInput] = useState(emptyInput)
  const [encodeResult, setEncodeResult] = useState<Record<PaoField, boolean> | null>(null)
  const [answered, setAnswered] = useState<string | null>(null)   // decode: chosen value
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)

  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

  const encodeRef = useRef<HTMLInputElement>(null)

  const resetQuestionState = () => {
    setEncodeInput(emptyInput)
    setEncodeResult(null)
    setAnswered(null)
    setAnsweredCorrect(null)
    startRef.current = Date.now()
  }

  const nextCard = useCallback((last: string, field: PaoField, nums: string[]) => {
    const c = pickCard(last, nums)
    setCard(c)
    setDecode(makeDecode(c, field, nums))
    resetQuestionState()
    setTimeout(() => encodeRef.current?.focus(), 40)
  }, [pickCard, makeDecode])

  const registerResult = (number: string, correct: boolean, rawMs: number, chars: number) => {
    if (correct) {
      setSessionCorrect(c => c + 1)
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n })
    } else {
      setSessionWrong(w => w + 1)
      setStreak(0)
    }
    const adjusted = adjustLatency(rawMs, 'typing', chars)
    setRoundStats(prev => applyRoundAttempt(prev, number, { ok: correct, rawMs, adjustedMs: adjusted, hinted: false }))
  }

  // ── Encode: submit all three fields ─────────────────────────────────────────
  const submitEncode = useCallback(() => {
    if (encodeResult !== null) return
    const answers = byNumber[card.number]
    const perField = {
      person: matchesAnswerLoose(encodeInput.person, answers.person),
      action: matchesAnswerLoose(encodeInput.action, answers.action),
      object: matchesAnswerLoose(encodeInput.object, answers.object),
    }
    const correct = perField.person && perField.action && perField.object
    setEncodeResult(perField)
    const chars = answers.person.length + answers.action.length + answers.object.length
    registerResult(card.number, correct, Date.now() - startRef.current, chars)
    setTimeout(() => nextCard(card.number, decodeField, drillNumbers), correct ? 1500 : 2400)
  }, [encodeResult, byNumber, card, encodeInput, decodeField, drillNumbers, nextCard])

  // ── Decode: pick / type the card ────────────────────────────────────────────
  const answerDecode = useCallback((value: string) => {
    if (answered !== null) return
    const correct = answerMode === 'multiple-choice'
      ? value === cardLabel(card)
      : parseCardCode(value)?.number === card.number
    setAnswered(value)
    setAnsweredCorrect(correct)
    const chars = answerMode === 'typing' ? cardLabel(card).length : 0
    registerResult(card.number, correct, Date.now() - startRef.current, chars)
    setTimeout(() => nextCard(card.number, decodeField, drillNumbers), correct ? 1400 : 2000)
  }, [answered, answerMode, card, decodeField, drillNumbers, nextCard])

  // ── Toggles (reset session) ─────────────────────────────────────────────────
  const resetSession = (nums: string[], field: PaoField) => {
    setRoundStats({})
    masteredSetRef.current = new Set()
    setSessionCorrect(0); setSessionWrong(0); setStreak(0); setBestStreak(0)
    const c = pickCard(undefined, nums)
    setCard(c)
    setDecode(makeDecode(c, field, nums))
    resetQuestionState()
  }

  const switchDrillType = (t: PaoDrillType) => {
    if (t === drillType) return
    safeSet(drilltypeKey, t)
    setDrillType(t)
    resetSession(poolFor(t), decodeField)
  }

  const switchDecodeField = (f: PaoField) => {
    if (f === decodeField) return
    safeSet(decodeFieldKey, f)
    setDecodeField(f)
    resetSession(activeNumbers, f)
  }

  const toggleSuit = (suit: Suit) => {
    setActiveSuits(prev => {
      if (prev.has(suit) && prev.size === 1) return prev
      const next = new Set(prev)
      if (next.has(suit)) next.delete(suit); else next.add(suit)
      safeSet(suitsKey, JSON.stringify([...next]))
      const nums = numbersForSuits(next)
      setDeckCount(dc => Math.min(dc, nums.length))
      const singleNext = next.size === 1
      const pool = drillType === 'encode' && singleNext ? limitByRank(nums, rankRange) : nums
      resetSession(pool, decodeField)
      return next
    })
  }

  // Encode asks for all three fields at once, so its recall latency is roughly the
  // sum of three recalls — judge mastery against a proportionally larger speed bar
  // so a card can still count as mastered. Decode is a single recall (bar ×1).
  const masteryFields = drillType === 'encode' ? PAO_FIELDS.length : 1
  const { mastered, total, masteredSet } = masteryProgress(
    drillNumbers, roundStats, masteryFastMs(settings.masteryLatencyFactor) * masteryFields)
  masteredSetRef.current = masteredSet

  const colorCls = card.red ? 'text-rose-500' : 'text-zinc-900'
  const answers = byNumber[card.number]

  return (
    <div className="flex flex-col items-center gap-8 py-4">

      {/* Drill type toggle + edit words */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-800">
          {(['encode', 'decode', 'deck-memo'] as PaoDrillType[]).map(t => (
            <button
              key={t}
              onClick={() => switchDrillType(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                drillType === t ? 'bg-fuchsia-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >{DRILL_LABELS[t]}</button>
          ))}
        </div>
        <button
          onClick={() => setShowWords(true)}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-violet-500 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
          title="Edit the PAO word list"
        >📇 Edit words</button>
      </div>

      {/* Suit filter */}
      <div className="flex items-center gap-2 -mt-4">
        <span className="text-xs text-zinc-500 mr-1">Suits:</span>
        {ALL_SUITS.map(suit => {
          const active = activeSuits.has(suit)
          const isRed = suit === '♥' || suit === '♦'
          return (
            <button
              key={suit}
              onClick={() => toggleSuit(suit)}
              title={active ? `Remove ${suit}` : `Add ${suit}`}
              className={`w-9 h-9 rounded-lg text-lg font-bold transition-colors ${
                active
                  ? isRed ? 'bg-rose-600/20 text-rose-400 border border-rose-600'
                          : 'bg-zinc-700 text-zinc-100 border border-zinc-500'
                  : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
              }`}
            >{suit}</button>
          )
        })}
        <span className="text-xs text-zinc-600 ml-1 tabular-nums">{activeNumbers.length} cards</span>
      </div>

      {/* Rank range — narrows the Encode pool to a window of one suit */}
      {drillType === 'encode' && singleSuit && (
        <div className="-mt-4">
          <RankRangeSelector
            low={rankRange[0]}
            high={rankRange[1]}
            red={[...activeSuits][0] === '♥' || [...activeSuits][0] === '♦'}
            onChange={(lo, hi) => {
              setRankRange([lo, hi])
              safeSet(rankRangeKey, JSON.stringify([lo, hi]))
              resetSession(limitByRank(activeNumbers, [lo, hi]), decodeField)
            }}
          />
        </div>
      )}

      {drillType === 'deck-memo' ? (
        (() => {
          const memoMax = activeNumbers.length
          const memoMin = Math.min(2, memoMax)
          const memoCount = Math.max(memoMin, Math.min(deckCount, memoMax))
          return (
        <>
          <div className="flex items-center gap-3 -mt-2">
            <span className="text-xs text-zinc-500">Cards:</span>
            <input
              type="range"
              min={memoMin}
              max={memoMax}
              value={memoCount}
              onChange={e => { const n = Number(e.target.value); setDeckCount(n); safeSet(deckCountKey, String(n)) }}
              className="w-36 accent-violet-500"
            />
            <span className="text-xs text-zinc-400 tabular-nums w-6 text-right">{memoCount}</span>
          </div>
          <PaoDeckMemoDrill
            key={[...activeSuits].sort().join('') + '-' + memoCount}
            activeNumbers={activeNumbers}
            byNumber={byNumber}
            cardCount={memoCount}
            historyKey="major-pao-deck-memo-history"
            activeSuits={[...activeSuits]}
          />
        </>
          )
        })()
      ) : (
        <>
          <ScoreBar correct={sessionCorrect} wrong={sessionWrong} streak={streak} bestStreak={bestStreak} />

          {total > 0 && (
            <div className="w-full max-w-md -mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-500">Cards mastered this session</span>
                <span className="text-zinc-400 tabular-nums">{mastered}/{total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-fuchsia-600 transition-all" style={{ width: `${(mastered / total) * 100}%` }} />
              </div>
            </div>
          )}

          {drillType === 'decode' && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-800 -mt-4">
              {PAO_FIELDS.map(f => (
                <button
                  key={f}
                  onClick={() => switchDecodeField(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    decodeField === f ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >{FIELD_LABELS[f]}</button>
              ))}
            </div>
          )}

          {drillType === 'encode' ? (
            /* ── Encode: card → type all three ── */
            <div className="flex flex-col items-center gap-5 w-full max-w-md">
              <p className="text-xs text-zinc-600 uppercase tracking-widest">Recall the Person · Action · Object</p>
              <div className={`relative flex flex-col items-center justify-center w-36 h-52 rounded-2xl bg-zinc-100 shadow-2xl border-2 border-zinc-300 select-none`}>
                <div className={`absolute top-2.5 left-3 flex flex-col items-center leading-none ${colorCls}`}>
                  <span className="text-base font-black">{card.rank}</span>
                  <span className="text-sm">{card.suit}</span>
                </div>
                <span className={`text-6xl ${colorCls}`}>{card.suit}</span>
                <span className={`text-3xl font-black mt-0.5 ${colorCls}`}>{card.rank}</span>
                <div className={`absolute bottom-2.5 right-3 flex flex-col items-center leading-none rotate-180 ${colorCls}`}>
                  <span className="text-base font-black">{card.rank}</span>
                  <span className="text-sm">{card.suit}</span>
                </div>
              </div>

              <div className="w-full space-y-2.5">
                {PAO_FIELDS.map((f, i) => {
                  const res = encodeResult?.[f]
                  const border = encodeResult === null
                    ? 'border-zinc-700 focus-within:border-violet-500'
                    : res ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'
                  return (
                    <div key={f} className={`flex items-center rounded-xl border transition-colors overflow-hidden ${border}`}>
                      <span className="pl-3 pr-1 text-lg" title={FIELD_LABELS[f]}>{['👤', '🎬', '📦'][i]}</span>
                      <input
                        ref={i === 0 ? encodeRef : undefined}
                        type="text"
                        value={encodeInput[f]}
                        disabled={encodeResult !== null}
                        onChange={e => setEncodeInput(prev => ({ ...prev, [f]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitEncode() } }}
                        placeholder={FIELD_LABELS[f]}
                        aria-label={FIELD_LABELS[f]}
                        autoComplete="off"
                        spellCheck={false}
                        className="flex-1 px-2 py-3 bg-zinc-800 outline-none text-lg font-medium text-zinc-100 placeholder-zinc-600 disabled:opacity-80"
                      />
                      {encodeResult !== null && (
                        <span className={`px-3 text-lg ${res ? 'text-green-400' : 'text-red-400'}`}>{res ? '✓' : '✗'}</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {encodeResult === null ? (
                <button
                  onClick={submitEncode}
                  className="px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
                >Check ↵</button>
              ) : (
                <div className="w-full px-4 py-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-sm space-y-1">
                  {PAO_FIELDS.map((f, i) => (
                    <div key={f} className="flex items-center gap-2">
                      <span>{['👤', '🎬', '📦'][i]}</span>
                      <span className={encodeResult[f] ? 'text-green-300' : 'text-red-300'}>{answers[f]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Decode: field value → which card ── */
            <div className="flex flex-col items-center gap-5 w-full max-w-md">
              <p className="text-xs text-zinc-600 uppercase tracking-widest">Which card has this {FIELD_LABELS[decodeField].toLowerCase()}?</p>
              <div className="px-6 py-5 rounded-2xl bg-zinc-800 border border-zinc-700 text-center">
                <span className="text-2xl font-bold text-zinc-100">{decode.value}</span>
              </div>

              <div className="w-full space-y-2">
                {answerMode === 'multiple-choice' ? (
                  <MultipleChoice
                    options={decode.options}
                    correctAnswer={cardLabel(card)}
                    onAnswer={answerDecode}
                    answered={answered}
                  />
                ) : (
                  <TypingInput
                    onAnswer={answerDecode}
                    answeredCorrect={answeredCorrect}
                    correctAnswer={cardLabel(card)}
                    placeholder="Type the card (e.g. 10H, KS)"
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showWords && <PaoWordsOverlay onClose={() => setShowWords(false)} />}
    </div>
  )
}
