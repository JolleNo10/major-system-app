import type { CountryId } from '@/features/world-countries/data/countries'

export const RECITE_MODES = [
  'countries',
  'countries-capitals',
  'countries-from-capitals',
] as const

export type ReciteMode = typeof RECITE_MODES[number]
export type RecitePromptKind = 'country' | 'capital'
export type ReciteCountryOutcome = 'recalled' | 'recovered' | 'revealed'
export type RecitePromptFeedback = 'none' | 'incorrect' | 'correct' | 'revealed'

export interface ReciteSessionCountry {
  id: CountryId
  country: string
  capital: string
}

interface RecitePromptState {
  countryIndex: number
  kind: RecitePromptKind
  incorrectAttempts: number
  outcome: ReciteCountryOutcome | null
}

interface RecitePromptSeed {
  countryIndex: number
  kind: RecitePromptKind
}

export interface ReciteSessionState {
  mode: ReciteMode
  countries: readonly ReciteSessionCountry[]
  prompts: readonly RecitePromptState[]
  promptIndex: number
  phase: 'answering' | 'complete'
  feedback: RecitePromptFeedback
}

export interface CreateReciteSessionOptions {
  randomize?: boolean
  random?: () => number
}

export interface RecitePromptView {
  countryId: CountryId
  countryIndex: number
  kind: RecitePromptKind
  incorrectAttempts: number
  outcome: ReciteCountryOutcome | null
  feedback: RecitePromptFeedback
}

function createPrompt(countryIndex: number, kind: RecitePromptKind): RecitePromptState {
  return { countryIndex, kind, incorrectAttempts: 0, outcome: null }
}

function replaceCurrentPrompt(
  state: ReciteSessionState,
  update: (prompt: RecitePromptState) => RecitePromptState,
): ReciteSessionState {
  const current = state.prompts[state.promptIndex]
  if (!current) return state
  const prompts = [...state.prompts]
  prompts[state.promptIndex] = update(current)
  return { ...state, prompts }
}

export function createReciteSession(
  mode: ReciteMode,
  countries: readonly ReciteSessionCountry[],
  options: CreateReciteSessionOptions = {},
): ReciteSessionState {
  const random = options.random ?? Math.random
  const snapshot = options.randomize
    ? shuffleReciteCountries(countries, random)
    : countries.map(country => ({ ...country }))
  const promptSeeds = options.randomize && mode === 'countries-capitals'
    ? shuffleRecitePromptSeeds(snapshot.length, random)
    : snapshot.flatMap((_, countryIndex) => [
      { countryIndex, kind: 'country' as const },
      ...(mode === 'countries-capitals' ? [{ countryIndex, kind: 'capital' as const }] : []),
    ])
  const prompts = promptSeeds.map(prompt => createPrompt(prompt.countryIndex, prompt.kind))
  return {
    mode,
    countries: snapshot,
    prompts,
    promptIndex: 0,
    phase: prompts.length > 0 ? 'answering' : 'complete',
    feedback: 'none',
  }
}

function shuffleReciteCountries(countries: readonly ReciteSessionCountry[], random: () => number): ReciteSessionCountry[] {
  const result = countries.map(country => ({ ...country }))
  for (let index = result.length - 1; index > 0; index -= 1) {
    const value = Math.max(0, Math.min(0.999999999, random()))
    const swapWith = Math.floor(value * (index + 1))
    ;[result[index], result[swapWith]] = [result[swapWith]!, result[index]!]
  }
  return result
}

function shuffleRecitePromptSeeds(countryCount: number, random: () => number): RecitePromptSeed[] {
  const remaining: RecitePromptSeed[] = Array.from({ length: countryCount }, (_, countryIndex): RecitePromptSeed[] => [
    { countryIndex, kind: 'country' },
    { countryIndex, kind: 'capital' },
  ]).flat()
  const sequence: RecitePromptSeed[] = []
  let previous: RecitePromptSeed | undefined
  let sameKindStreak = 0

  while (remaining.length > 0) {
    const previousCountryIndex = previous?.countryIndex
    const nonAdjacent = previousCountryIndex === undefined
      ? remaining
      : remaining.filter(candidate => candidate.countryIndex !== previousCountryIndex)
    const preservesCountrySpacing = nonAdjacent.filter(candidate => canPreserveCountrySpacing(remaining, candidate))
    const withoutLongKindStreak = nonAdjacent.filter(candidate => candidate.kind !== previous?.kind || sameKindStreak < 2)
    const preferredCandidates = withoutLongKindStreak.filter(candidate => canPreserveCountrySpacing(remaining, candidate))
    const candidates = preferredCandidates.length > 0
      ? preferredCandidates
      : preservesCountrySpacing.length > 0
        ? preservesCountrySpacing
        : withoutLongKindStreak.length > 0
          ? withoutLongKindStreak
          : nonAdjacent.length > 0
            ? nonAdjacent
            : remaining
    const selectedIndex = Math.floor(clampRandom(random()) * candidates.length)
    const selected = candidates[selectedIndex]!
    const remainingIndex = remaining.indexOf(selected)
    remaining.splice(remainingIndex, 1)
    sequence.push(selected)
    sameKindStreak = selected.kind === previous?.kind ? sameKindStreak + 1 : 1
    previous = selected
  }

  return sequence
}

function canPreserveCountrySpacing(remaining: readonly RecitePromptSeed[], candidate: RecitePromptSeed): boolean {
  const after = remaining.filter(prompt => prompt !== candidate)
  if (after.length === 0) return true
  if (after.length === 1) return after[0]?.countryIndex !== candidate.countryIndex
  return new Set(after.map(prompt => prompt.countryIndex)).size > 1
}

function clampRandom(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : 0
}

export function getCurrentRecitePrompt(state: ReciteSessionState): RecitePromptView | null {
  const prompt = state.prompts[state.promptIndex]
  const country = prompt ? state.countries[prompt.countryIndex] : undefined
  if (!prompt || !country || state.phase === 'complete') return null
  return {
    countryId: country.id,
    countryIndex: prompt.countryIndex,
    kind: prompt.kind,
    incorrectAttempts: prompt.incorrectAttempts,
    outcome: prompt.outcome,
    feedback: state.feedback,
  }
}

export function submitReciteAnswer(
  state: ReciteSessionState,
  correct: boolean,
): ReciteSessionState {
  if (state.phase === 'complete') return state
  const current = state.prompts[state.promptIndex]
  if (!current || current.outcome !== null) return state
  if (!correct) {
    return replaceCurrentPrompt(
      { ...state, feedback: 'incorrect' },
      prompt => ({
        ...prompt,
        incorrectAttempts: prompt.incorrectAttempts + 1,
      }),
    )
  }
  return replaceCurrentPrompt(
    { ...state, feedback: 'correct' },
    prompt => ({
      ...prompt,
      outcome: prompt.incorrectAttempts > 0 ? 'recovered' : 'recalled',
    }),
  )
}

export function revealReciteAnswer(state: ReciteSessionState): ReciteSessionState {
  if (state.phase === 'complete') return state
  const current = state.prompts[state.promptIndex]
  if (!current || current.outcome !== null) return state
  return replaceCurrentPrompt(
    { ...state, feedback: 'revealed' },
    prompt => ({ ...prompt, outcome: 'revealed' }),
  )
}

export function continueReciteSession(state: ReciteSessionState): ReciteSessionState {
  if (state.phase === 'complete' || (state.feedback !== 'correct' && state.feedback !== 'revealed')) return state
  const nextIndex = state.promptIndex + 1
  if (nextIndex >= state.prompts.length) {
    return { ...state, phase: 'complete', promptIndex: nextIndex, feedback: 'none' }
  }
  return { ...state, promptIndex: nextIndex, feedback: 'none' }
}

export function getReciteCountryOutcomes(
  state: ReciteSessionState,
): readonly (ReciteCountryOutcome | null)[] {
  return state.countries.map((_, countryIndex) => {
    const outcomes = state.prompts
      .filter(prompt => prompt.countryIndex === countryIndex)
      .map(prompt => prompt.outcome)
    if (outcomes.some(outcome => outcome === null)) return null
    if (outcomes.some(outcome => outcome === 'revealed')) return 'revealed'
    if (outcomes.some(outcome => outcome === 'recovered')) return 'recovered'
    return 'recalled'
  })
}

export function getReciteResolvedPromptCount(state: ReciteSessionState): number {
  return state.prompts.filter(prompt => prompt.outcome !== null).length
}

/** Return Countries whose Country-name prompt has been resolved in the run. */
export function getReciteResolvedCountryIds(state: ReciteSessionState): readonly CountryId[] {
  const resolved = new Set<CountryId>()
  for (const prompt of state.prompts) {
    if (prompt.kind !== 'country' || prompt.outcome === null) continue
    const country = state.countries[prompt.countryIndex]
    if (country) resolved.add(country.id)
  }
  return [...resolved]
}
