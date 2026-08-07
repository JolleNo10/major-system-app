import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSettings } from '@/app/settings/SettingsContext'
import { usePaoCards } from '@/features/cards/pao/PaoCardsContext'
import { MultipleChoice } from '@/core/ui/MultipleChoice'
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
import { PAO_ROLE, RoleTag, RoleValue } from '@/features/cards/pao/paoRoles'
import type { AnswerMode } from '@/core/types'
import { RankRangeSelector } from '@/core/ui/RankRangeSelector'

const ALL_SUITS: Suit[] = ['♣', '♦', '♥', '♠']
const SUIT_LETTERS: Record<string, Suit> = { C: '♣', D: '♦', H: '♥', S: '♠' }
const CARD_BY_NUMBER = new Map(CARDS.map(c => [c.number, c]))

type PaoDrillType = 'encode' | 'decode' | 'deck-memo'

// One Decode sub-question: a hint field, the (distinct) card it's drawn from, and
// that card's MC options. With N fields selected there are N items, each a
// different card, so the user identifies several cards from mixed cues at once.
interface DecodeItem { field: PaoField; card: Card; options: string[] }
type DecodeAnswer = { chosen: string; correct: boolean }

const DRILL_LABELS: Record<PaoDrillType, string> = {
  encode: 'Encode',
  decode: 'Decode',
  'deck-memo': 'Deck Memo',
}

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

const isPaoField = (v: string): v is PaoField => (PAO_FIELDS as readonly string[]).includes(v)

// Which field values Decode shows as hints. Stored as a JSON array; falls back to
// migrating the legacy single-field key, then defaults to Person.
function loadDecodeFields(key: string, legacyKey: string): Set<PaoField> {
  const raw = readString(key)
  if (raw) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        const valid = arr.filter((v): v is PaoField => typeof v === 'string' && isPaoField(v))
        if (valid.length > 0) return new Set(valid)
      }
    } catch { /* fall through to the legacy single-field key */ }
  }
  const legacy = readString(legacyKey)
  if (legacy && isPaoField(legacy)) return new Set([legacy])
  return new Set<PaoField>(['person'])
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
  const decodeFieldsKey = 'major-pao-decode-fields'
  const legacyDecodeFieldKey = 'major-pao-decode-field'
  const rankRangeKey = 'major-pao-rank-range'

  const [showWords, setShowWords] = useState(false)

  const [drillType, setDrillType] = useState<PaoDrillType>(() => {
    const v = readString(drilltypeKey)
    return v === 'decode' || v === 'deck-memo' ? v : 'encode'
  })
  // Decode: which field value(s) are shown as hints (multi-select, min one).
  const [decodeFields, setDecodeFields] = useState<Set<PaoField>>(
    () => loadDecodeFields(decodeFieldsKey, legacyDecodeFieldKey))

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

  // Selected Decode hint fields in canonical P/A/O order (stable while unchanged).
  const orderedDecodeFields = useMemo(() => PAO_FIELDS.filter(f => decodeFields.has(f)), [decodeFields])

  // ── Per-question state ──────────────────────────────────────────────────────
  const [roundStats, setRoundStats] = useState<Record<string, RoundStat>>({})
  const masteredSetRef = useRef<Set<string>>(new Set())
  const shareRef = useRef(settings.sessionUnmasteredShare)
  const prevDecodeNumsRef = useRef<Set<string>>(new Set()) // last Decode question's cards
  const startRef = useRef<number>(Date.now())
  const prevAnswerAtRef = useRef<number>(Date.now())  // per Decode item timing

  const pickCard = useCallback((last: string | undefined, nums: string[]): Card => {
    const available = last ? nums.filter(n => n !== last) : nums
    const pool = available.length > 0 ? available : nums
    const number = pickWeighted('enc', pool, masteredSetRef.current, shareRef.current)
    return CARD_BY_NUMBER.get(number)!
  }, [])

  // Build one Decode item per hint field, each from a *distinct* card (so Person,
  // Action, Object cues point at different cards). Also excludes the previous
  // question's cards so none repeats back-to-back (relaxed if the pool is too
  // small). Each item carries its own MC card options.
  const buildDecodeItems = useCallback((fields: PaoField[], nums: string[]): DecodeItem[] => {
    const prev = prevDecodeNumsRef.current
    const used = new Set<string>()
    const items = fields.map(field => {
      let avail = nums.filter(n => !used.has(n) && !prev.has(n))
      if (avail.length === 0) avail = nums.filter(n => !used.has(n))
      if (avail.length === 0) avail = nums
      const number = pickWeighted('enc', avail, masteredSetRef.current, shareRef.current)
      used.add(number)
      const c = CARD_BY_NUMBER.get(number)!
      const distractors = pickDistractors(number, nums).map(n => cardLabel(CARD_BY_NUMBER.get(n)!))
      return { field, card: c, options: shuffle([cardLabel(c), ...distractors]) }
    })
    prevDecodeNumsRef.current = new Set(items.map(i => i.card.number))
    return items
  }, [])

  const [card, setCard] = useState<Card>(() => pickCard(undefined, drillNumbers))
  const [decodeItems, setDecodeItems] = useState<DecodeItem[]>(() => buildDecodeItems(orderedDecodeFields, drillNumbers))

  const [encodeInput, setEncodeInput] = useState(emptyInput)
  const [encodeResult, setEncodeResult] = useState<Record<PaoField, boolean> | null>(null)
  const [decodeAnswers, setDecodeAnswers] = useState<Partial<Record<PaoField, DecodeAnswer>>>({})
  // Typed card code per Decode cue (typing mode; inline like Encode's inputs).
  const [decodeInput, setDecodeInput] = useState<Partial<Record<PaoField, string>>>({})

  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionWrong, setSessionWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

  const encodeRef = useRef<HTMLInputElement>(null)
  const decodeRefs = useRef<Partial<Record<PaoField, HTMLInputElement | null>>>({})

  const resetQuestionState = () => {
    setEncodeInput(emptyInput)
    setEncodeResult(null)
    setDecodeAnswers({})
    setDecodeInput({})
    startRef.current = Date.now()
    prevAnswerAtRef.current = Date.now()
  }

  // Advance to a fresh question: a new Encode card and a fresh Decode item set.
  const nextQuestion = useCallback((lastEnc: string, nums: string[], fields: PaoField[]) => {
    setCard(pickCard(lastEnc, nums))
    setDecodeItems(buildDecodeItems(fields, nums))
    resetQuestionState()
    setTimeout(() => encodeRef.current?.focus(), 40)
  }, [pickCard, buildDecodeItems])

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
    setTimeout(() => nextQuestion(card.number, drillNumbers, orderedDecodeFields), correct ? 1500 : 2400)
  }, [encodeResult, byNumber, card, encodeInput, drillNumbers, orderedDecodeFields, nextQuestion])

  // ── Decode: answer one item (identify its card) ──────────────────────────────
  const answerDecodeItem = (field: PaoField, value: string) => {
    if (decodeAnswers[field]) return
    const item = decodeItems.find(i => i.field === field)
    if (!item) return
    const correct = answerMode === 'multiple-choice'
      ? value === cardLabel(item.card)
      : parseCardCode(value)?.number === item.card.number
    const now = Date.now()
    const rawMs = now - prevAnswerAtRef.current
    prevAnswerAtRef.current = now
    const chars = answerMode === 'typing' ? cardLabel(item.card).length : 0
    registerResult(item.card.number, correct, rawMs, chars)
    setDecodeAnswers(prev => ({ ...prev, [field]: { chosen: value, correct } }))
    // Typing: jump focus to the next still-unanswered cue.
    if (answerMode === 'typing') {
      const answered = new Set([...Object.keys(decodeAnswers), field])
      const next = orderedDecodeFields.find(f => !answered.has(f))
      if (next) setTimeout(() => decodeRefs.current[next]?.focus(), 30)
    }
  }

  // Advance once every Decode item is answered.
  useEffect(() => {
    if (drillType !== 'decode' || decodeItems.length === 0) return
    if (Object.keys(decodeAnswers).length < decodeItems.length) return
    const allCorrect = decodeItems.every(i => decodeAnswers[i.field]?.correct)
    const t = setTimeout(
      () => nextQuestion(card.number, drillNumbers, orderedDecodeFields),
      allCorrect ? 1400 : 2000,
    )
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodeAnswers, decodeItems, drillType])

  // Focus the first cue's card input on each new Decode question (typing mode).
  useEffect(() => {
    if (drillType !== 'decode' || answerMode !== 'typing') return
    const first = orderedDecodeFields[0]
    const t = setTimeout(() => first && decodeRefs.current[first]?.focus(), 40)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillType, answerMode, decodeItems])

  // ── Toggles (reset session) ─────────────────────────────────────────────────
  const resetSession = (nums: string[]) => {
    setRoundStats({})
    masteredSetRef.current = new Set()
    prevDecodeNumsRef.current = new Set()
    setSessionCorrect(0); setSessionWrong(0); setStreak(0); setBestStreak(0)
    setCard(pickCard(undefined, nums))
    setDecodeItems(buildDecodeItems(orderedDecodeFields, nums))
    resetQuestionState()
  }

  const switchDrillType = (t: PaoDrillType) => {
    if (t === drillType) return
    safeSet(drilltypeKey, t)
    setDrillType(t)
    resetSession(poolFor(t))
  }

  // Toggle a Decode hint field (min one). Each field is its own sub-question from a
  // different card, so adding/removing one rebuilds the current item set (keeps the
  // running score).
  const toggleDecodeField = (f: PaoField) => {
    setDecodeFields(prev => {
      if (prev.has(f) && prev.size === 1) return prev
      const next = new Set(prev)
      if (next.has(f)) next.delete(f); else next.add(f)
      safeSet(decodeFieldsKey, JSON.stringify([...next]))
      const fields = PAO_FIELDS.filter(x => next.has(x))
      setDecodeItems(buildDecodeItems(fields, drillNumbers))
      setDecodeAnswers({})
      setDecodeInput({})
      prevAnswerAtRef.current = Date.now()
      return next
    })
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
      resetSession(pool)
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
  shareRef.current = settings.sessionUnmasteredShare
  const setComplete = total > 0 && mastered === total

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
              resetSession(limitByRank(activeNumbers, [lo, hi]))
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
                <span className={setComplete ? 'text-green-400 font-semibold' : 'text-zinc-400 tabular-nums'}>{mastered}/{total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full transition-all ${setComplete ? 'bg-green-500' : 'bg-fuchsia-600'}`} style={{ width: `${(mastered / total) * 100}%` }} />
              </div>
            </div>
          )}

          {setComplete && (
            <div className="w-full max-w-md -mt-4 rounded-xl border border-green-600/40 bg-green-500/10 p-4 text-center space-y-3">
              <p className="text-green-300 font-semibold">🎉 You’ve mastered all {total} — keep going or reset.</p>
              <button
                onClick={() => resetSession(drillNumbers)}
                className="flex items-center min-h-[40px] px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors mx-auto"
              >Keep practising</button>
            </div>
          )}

          {drillType === 'decode' && (
            <div className="flex flex-col items-center gap-1 -mt-4">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-800">
                {PAO_FIELDS.map(f => (
                  <button
                    key={f}
                    onClick={() => toggleDecodeField(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      decodeFields.has(f) ? `${PAO_ROLE[f].pill} text-white` : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >{PAO_ROLE[f].emoji} {PAO_ROLE[f].label}</button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-600">Pick which hint(s) to show</span>
            </div>
          )}

          {drillType === 'encode' ? (
            /* ── Encode: card → type all three ── */
            <div className="flex flex-col items-center gap-5 w-full max-w-md">
              <p className="text-xs uppercase tracking-widest text-zinc-600">
                Recall the{' '}
                <span className={PAO_ROLE.person.text}>Person</span> ·{' '}
                <span className={PAO_ROLE.action.text}>Action</span> ·{' '}
                <span className={PAO_ROLE.object.text}>Object</span>
              </p>
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
                  const role = PAO_ROLE[f]
                  const border = encodeResult === null
                    ? 'border-zinc-700 focus-within:border-violet-500'
                    : res ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'
                  return (
                    <div key={f} className={`flex items-stretch rounded-xl border transition-colors overflow-hidden ${border}`}>
                      <span className={`flex items-center justify-center w-11 text-lg ${role.bg}`} title={role.label} aria-hidden>{role.emoji}</span>
                      <input
                        ref={i === 0 ? encodeRef : undefined}
                        type="text"
                        value={encodeInput[f]}
                        disabled={encodeResult !== null}
                        onChange={e => setEncodeInput(prev => ({ ...prev, [f]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitEncode() } }}
                        placeholder={role.label}
                        aria-label={role.label}
                        autoComplete="off"
                        spellCheck={false}
                        className="flex-1 px-3 py-3 bg-zinc-800 outline-none text-lg font-medium text-zinc-100 placeholder-zinc-600 disabled:opacity-80"
                      />
                      {encodeResult !== null && (
                        <span className={`flex items-center px-3 text-lg ${res ? 'text-green-400' : 'text-red-400'}`}>{res ? '✓' : '✗'}</span>
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
                <div className="w-full px-4 py-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-base space-y-1.5">
                  {PAO_FIELDS.map(f => (
                    <div key={f} className="flex items-center justify-between gap-2">
                      <RoleValue field={f} value={answers[f]} />
                      <span className={encodeResult[f] ? 'text-green-400' : 'text-red-400'}>{encodeResult[f] ? '✓' : '✗'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Decode: each hint field → identify its (distinct) card ── */
            (() => {
              const multi = decodeItems.length > 1
              return (
            <div className="flex flex-col items-center gap-5 w-full max-w-md">
              <p className="text-xs text-zinc-600 uppercase tracking-widest">
                {multi
                  ? 'Name the card behind each cue'
                  : `Which card has this ${PAO_ROLE[decodeItems[0].field].label.toLowerCase()}?`}
              </p>

              {/* PAO prompt — the same horizontal story line as Deck Memo */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                {decodeItems.map(item => (
                  <RoleValue key={item.field} field={item.field} value={byNumber[item.card.number][item.field]} className="text-lg" />
                ))}
              </div>

              {answerMode === 'typing' ? (
                /* ── Card inputs — Encode's exact row style ([emoji] [type the card]) ── */
                <div className="w-full space-y-2.5">
                  {decodeItems.map(item => {
                    const role = PAO_ROLE[item.field]
                    const ans = decodeAnswers[item.field]
                    const border = !ans
                      ? 'border-zinc-700 focus-within:border-violet-500'
                      : ans.correct ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'
                    return (
                      <div key={item.field} className={`flex items-stretch rounded-xl border transition-colors overflow-hidden ${border}`}>
                        <span className={`flex items-center justify-center w-11 text-lg ${role.bg}`} title={role.label} aria-hidden>{role.emoji}</span>
                        <input
                          ref={el => { decodeRefs.current[item.field] = el }}
                          type="text"
                          value={decodeInput[item.field] ?? ''}
                          disabled={!!ans}
                          onChange={e => setDecodeInput(prev => ({ ...prev, [item.field]: e.target.value.toUpperCase() }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const v = (decodeInput[item.field] ?? '').trim()
                              if (v && !ans) answerDecodeItem(item.field, v)
                            }
                          }}
                          placeholder="Type the card (e.g. 5♣, KS)"
                          aria-label={`Card for ${role.label}`}
                          autoComplete="off"
                          spellCheck={false}
                          className="flex-1 min-w-0 px-3 py-3 bg-zinc-800 outline-none text-lg font-medium text-zinc-100 placeholder-zinc-600 disabled:opacity-80"
                        />
                        {ans && (
                          <span className={`flex items-center px-3 text-lg whitespace-nowrap ${ans.correct ? 'text-green-400' : 'text-red-400'}`}>
                            {ans.correct ? '✓' : `✗ ${cardLabel(item.card)}`}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* ── Multiple choice: card options per cue (role-tagged when multi) ── */
                <div className="w-full space-y-6">
                  {decodeItems.map(item => {
                    const ans = decodeAnswers[item.field]
                    return (
                      <div key={item.field} className="w-full space-y-2">
                        {multi && <RoleTag field={item.field} />}
                        <MultipleChoice
                          options={item.options}
                          correctAnswer={cardLabel(item.card)}
                          onAnswer={v => answerDecodeItem(item.field, v)}
                          answered={ans?.chosen ?? null}
                          keyboard={!multi}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
              )
            })()
          )}
        </>
      )}

      {showWords && <PaoWordsOverlay onClose={() => setShowWords(false)} />}
    </div>
  )
}
