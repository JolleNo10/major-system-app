import {
  RECALL_FAST_MS,
  MASTERY_MAX_LEVEL, MASTERED_LEVEL,
  ROUND_NEED_BASE, ROUND_NEED_UNSEEN,
  ROUND_INTERVAL_FACTORS, ROUND_INTERVAL_MIN, ROUND_INTERVAL_MAX,
  ROUND_MIN_GAP_FACTOR, ROUND_MIN_GAP_MIN, ROUND_MIN_GAP_MAX,
  ROUND_INCORRECT_INTERVAL_FACTOR,
} from '@/core/scoring/scoring'

// Per-session question scheduler — the shared "how do we learn a batch" engine
// for every drill with a mastered-this-session bar (Major System, Cards, PAO).
// Ephemeral round state (like roundStats), never persisted.
//
// Design: constrained weighted randomness. Each question gets a selection weight
// = need × spacing × balance, then we sample from that distribution:
//   • need    — lower mastery ⇒ moderately (not overwhelmingly) more likely.
//   • spacing — the dominant term; a just-shown question is (near-)zero, ramping
//                to full once ~its target interval has passed. Plus a hard
//                anti-repeat gap that zeroes anything shown too recently.
//   • balance — a gentle sqrt boost for under-shown questions (weaker than spacing).
// Mastery is graded 0..3 and only advances on a *spaced* correct recall (and, per
// the app's convention, one that's also fast enough and un-hinted).

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export interface RoundConfig {
  batchSize: number
  needByLevel: [number, number, number, number]
  needUnseen: number
  intervalFactors: number[]
  intervalMin: number
  intervalMax: number
  minimumGap: number
  incorrectIntervalFactor: number
  masteredLevel: number
  fastMs: number // recall-adjusted latency at/under which a recall counts as "fast"
}

export interface RoundSettings {
  masteryLatencyFactor: number  // × RECALL_FAST_MS → the fast-recall bar
  sessionUnmasteredShare: number // 0..1 "unmastered focus"; 0.5 = spec baseline
}

// Derive the batch-relative config. `sessionUnmasteredShare` scales how much of an
// advantage low-mastery questions get: 0.5 reproduces the spec baseline weights,
// 0 flattens them (even exposure), 1 roughly doubles the spread.
export function makeRoundConfig(
  batchSize: number,
  settings: RoundSettings,
  overrides: Partial<RoundConfig> = {},
): RoundConfig {
  const scale = settings.sessionUnmasteredShare / 0.5 // 0..2, 1 at the 0.5 baseline
  const lift = (base: number) => Math.max(0.1, 1 + (base - 1) * scale)
  return {
    batchSize,
    needByLevel: ROUND_NEED_BASE.map(lift) as [number, number, number, number],
    needUnseen: lift(ROUND_NEED_UNSEEN),
    intervalFactors: ROUND_INTERVAL_FACTORS,
    intervalMin: ROUND_INTERVAL_MIN,
    intervalMax: ROUND_INTERVAL_MAX,
    minimumGap: clamp(Math.round(batchSize * ROUND_MIN_GAP_FACTOR), ROUND_MIN_GAP_MIN, ROUND_MIN_GAP_MAX),
    incorrectIntervalFactor: ROUND_INCORRECT_INTERVAL_FACTOR,
    masteredLevel: MASTERED_LEVEL,
    fastMs: RECALL_FAST_MS * settings.masteryLatencyFactor,
    ...overrides,
  }
}

export function calcInterval(level: number, cfg: RoundConfig): number {
  const raw = Math.round((cfg.intervalFactors[level] ?? 0) * cfg.batchSize)
  return clamp(raw, cfg.intervalMin, cfg.intervalMax)
}

export interface QuestionState {
  timesSeen: number
  correctCount: number
  incorrectCount: number
  consecutiveCorrect: number
  lastSeenSequence: number             // -Infinity until first shown
  masteryLevel: number                 // 0..MASTERY_MAX_LEVEL
  lastSuccessfulRecallSequence: number | null // null until first advancing recall
  targetInterval: number               // desired spacing before the next recall counts
}

function initQuestion(): QuestionState {
  return {
    timesSeen: 0,
    correctCount: 0,
    incorrectCount: 0,
    consecutiveCorrect: 0,
    lastSeenSequence: -Infinity,
    masteryLevel: 0,
    lastSuccessfulRecallSequence: null,
    targetInterval: 0,
  }
}

export interface RoundState {
  seq: number // total questions answered this session (the "sequence" counter)
  q: Record<string, QuestionState>
}

export function initRoundState(): RoundState {
  return { seq: 0, q: {} }
}

function getQ(state: RoundState, key: string): QuestionState {
  return state.q[key] ?? initQuestion()
}

// Spacing weight from ratio = distance / targetInterval:
//   <0.25 → 0 · 0.25–0.5 → ramp 0→0.5 · 0.5–1 → ratio · ≥1 → 1.
function spacingWeight(distance: number, targetInterval: number): number {
  if (targetInterval <= 0) return 1
  const r = distance / targetInterval
  if (r < 0.25) return 0
  if (r < 0.5) return 2 * (r - 0.25)
  if (r < 1) return r
  return 1
}

// Pick the next question key by weighted-random sampling. The hard anti-repeat gap
// is relaxed step-wise if it would leave nothing eligible; a final most-overdue
// fallback guarantees the scheduler never deadlocks.
export function selectNext(
  state: RoundState,
  keys: string[],
  cfg: RoundConfig,
  rng: () => number = Math.random,
): string {
  if (keys.length === 1) return keys[0]
  const totalSeen = keys.reduce((a, k) => a + getQ(state, k).timesSeen, 0)
  const averageSeen = totalSeen / keys.length

  const weightFor = (k: string, gap: number): number => {
    const q = getQ(state, k)
    const distance = state.seq - q.lastSeenSequence
    if (distance < gap) return 0 // hard anti-repeat window
    const need = q.timesSeen === 0 ? cfg.needUnseen : cfg.needByLevel[q.masteryLevel]
    const spacing = q.timesSeen === 0
      ? 1
      : spacingWeight(distance, q.targetInterval || cfg.intervalMin)
    const balance = Math.sqrt((averageSeen + 1) / (q.timesSeen + 1))
    return need * spacing * balance
  }

  for (let gap = cfg.minimumGap; gap >= 0; gap--) {
    const weights = keys.map(k => weightFor(k, gap))
    const sum = weights.reduce((a, b) => a + b, 0)
    if (sum > 0) {
      let r = rng() * sum
      for (let i = 0; i < keys.length; i++) {
        r -= weights[i]
        if (r <= 0) return keys[i]
      }
      return keys[keys.length - 1]
    }
  }
  // Deadlock guard: everything spacing-zero even at gap 0 → most-overdue wins.
  let best = keys[0]
  for (const k of keys) {
    if (state.seq - getQ(state, k).lastSeenSequence > state.seq - getQ(state, best).lastSeenSequence) best = k
  }
  return best
}

export interface AnswerInput {
  correct: boolean
  recallMs: number // recall-adjusted latency (typing time removed)
  hinted: boolean
}

// Fold one answer into the round state (pure): bumps the sequence counter and
// updates the question's mastery/spacing. A correct answer only advances mastery
// when it is fast enough, un-hinted, and sufficiently spaced from the previous
// advancing recall; a wrong answer regresses one level and shortens the interval.
export function recordAnswer(
  state: RoundState,
  key: string,
  ans: AnswerInput,
  cfg: RoundConfig,
): RoundState {
  const seq = state.seq
  const prev = getQ(state, key)
  const q: QuestionState = { ...prev }
  q.timesSeen += 1
  const prevSuccess = q.lastSuccessfulRecallSequence
  q.lastSeenSequence = seq

  if (ans.correct) {
    q.correctCount += 1
    q.consecutiveCorrect += 1
    const fastEnough = ans.recallMs <= cfg.fastMs
    const required = q.targetInterval || 0 // level-0 target 0 → first correct always spaced enough
    const spacedEnough = prevSuccess === null || (seq - prevSuccess) >= required
    if (fastEnough && !ans.hinted && spacedEnough && q.masteryLevel < MASTERY_MAX_LEVEL) {
      q.masteryLevel += 1
      q.targetInterval = calcInterval(q.masteryLevel, cfg)
      q.lastSuccessfulRecallSequence = seq
    }
  } else {
    q.incorrectCount += 1
    q.consecutiveCorrect = 0
    if (q.masteryLevel > 0) q.masteryLevel -= 1
    q.targetInterval = Math.max(
      cfg.intervalMin,
      Math.round((q.targetInterval || cfg.intervalMin) * cfg.incorrectIntervalFactor),
    )
  }
  return { seq: seq + 1, q: { ...state.q, [key]: q } }
}

export interface RoundProgress {
  pct: number            // continuous 0..1 (level 0→0, 1→0.5, ≥2→1)
  mastered: number       // count at/above masteredLevel
  total: number
  all: boolean           // every question mastered
  byLevel: [number, number, number, number]
  masteredSet: Set<string>
  levelOf: (key: string) => number
}

export function roundProgress(state: RoundState, keys: string[], cfg: RoundConfig): RoundProgress {
  const byLevel: [number, number, number, number] = [0, 0, 0, 0]
  const masteredSet = new Set<string>()
  let sum = 0
  let mastered = 0
  for (const k of keys) {
    const lvl = state.q[k]?.masteryLevel ?? 0
    byLevel[lvl] += 1
    sum += lvl >= 2 ? 1 : lvl === 1 ? 0.5 : 0
    if (lvl >= cfg.masteredLevel) { mastered += 1; masteredSet.add(k) }
  }
  const total = keys.length
  return {
    pct: total > 0 ? sum / total : 0,
    mastered,
    total,
    all: total > 0 && mastered === total,
    byLevel,
    masteredSet,
    levelOf: (key: string) => state.q[key]?.masteryLevel ?? 0,
  }
}
