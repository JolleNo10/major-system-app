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

export interface ReciteSessionState {
  mode: ReciteMode
  countries: readonly ReciteSessionCountry[]
  prompts: readonly RecitePromptState[]
  promptIndex: number
  phase: 'answering' | 'complete'
  feedback: RecitePromptFeedback
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
): ReciteSessionState {
  const snapshot = countries.map(country => ({ ...country }))
  const prompts = snapshot.flatMap((_, countryIndex) => [
    createPrompt(countryIndex, 'country'),
    ...(mode === 'countries-capitals' ? [createPrompt(countryIndex, 'capital')] : []),
  ])
  return {
    mode,
    countries: snapshot,
    prompts,
    promptIndex: 0,
    phase: prompts.length > 0 ? 'answering' : 'complete',
    feedback: 'none',
  }
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
