import type { Country, CountryId } from '@/features/world-countries/data/countries'
import { createRecallSession, type WorldCountriesRecallSessionState } from '@/features/world-countries/learning/recallSession'
import { summarizeRecallAnswers, type RecallResultSummary } from '@/features/world-countries/learning/recallSummary'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'

export type PracticeRecallOutcome = 'exact' | 'fuzzy' | 'incorrect' | 'revealed'

export interface PracticeRecallAnswer {
  countryId: CountryId
  skill: WorldCountriesRecallSkill
  outcome: PracticeRecallOutcome
  submittedAnswer?: string
}

/** Shape accepted by the existing map-backed Practice results surface. */
export interface PracticeResultAnswer {
  countryId: CountryId
  skill: WorldCountriesRecallSkill
  correct: boolean
  answer?: string
  submittedAnswer?: string
}

export type PracticeQuestionCount = 10 | 20 | 50 | 'all'

export const PRACTICE_QUESTION_COUNTS: readonly PracticeQuestionCount[] = [10, 20, 50, 'all']

export interface PracticeQuizRun {
  countries: readonly Country[]
  countryIds: readonly CountryId[]
  questionCount: PracticeQuestionCount
  session: WorldCountriesRecallSessionState
}

export function getDefaultPracticeQuestionCount(countryCount: number): PracticeQuestionCount {
  if (countryCount >= 20) return 20
  if (countryCount >= 10) return 10
  return 'all'
}

export function isPracticeQuestionCountValid(
  questionCount: PracticeQuestionCount,
  countryCount: number,
): boolean {
  return questionCount === 'all' || questionCount <= countryCount
}

export function normalizePracticeQuestionCount(
  questionCount: PracticeQuestionCount,
  countryCount: number,
): PracticeQuestionCount {
  return isPracticeQuestionCountValid(questionCount, countryCount)
    ? questionCount
    : getDefaultPracticeQuestionCount(countryCount)
}

/** Create a randomized, snapshot-based Country → Capital Practice run. */
export function createPracticeQuizRun({
  scopeCountries,
  questionCount,
  countryIds,
  random = Math.random,
}: {
  scopeCountries: readonly Country[]
  questionCount: PracticeQuestionCount
  /** Supplied only by Retry missed; it bypasses the configured count. */
  countryIds?: readonly CountryId[]
  random?: () => number
}): PracticeQuizRun | null {
  const countriesById = new Map<CountryId, Country>()
  for (const country of scopeCountries) {
    if (countriesById.has(country.id)) continue
    countriesById.set(country.id, {
      ...country,
      ...(country.countryAliases ? { countryAliases: [...country.countryAliases] } : {}),
      ...(country.capitalAliases ? { capitalAliases: [...country.capitalAliases] } : {}),
    })
  }

  const eligibleIds = countryIds
    ? [...new Set(countryIds)].filter(id => countriesById.has(id))
    : [...countriesById.keys()]
  if (eligibleIds.length === 0) return null

  const randomizedIds = shuffle(eligibleIds, random)
  const selectedIds = countryIds
    ? randomizedIds
    : randomizedIds.slice(0, questionCount === 'all' ? randomizedIds.length : Math.min(questionCount, randomizedIds.length))
  const countries = selectedIds.map(id => countriesById.get(id)).filter((country): country is Country => country !== undefined)
  if (countries.length === 0) return null

  const session = createRecallSession({
    countryIds: selectedIds,
    countryOrder: selectedIds,
    skills: ['country-to-capital'],
  })
  return {
    countries,
    countryIds: selectedIds,
    questionCount: countryIds ? 'all' : questionCount,
    session,
  }
}

export function isPracticeRecallCorrect(outcome: PracticeRecallOutcome): boolean {
  return outcome === 'exact' || outcome === 'fuzzy'
}

export function getPracticeMissedCountryIds(
  run: Pick<PracticeQuizRun, 'countryIds'>,
  answers: readonly PracticeRecallAnswer[],
): CountryId[] {
  const missed = new Set(answers.filter(answer => !isPracticeRecallCorrect(answer.outcome)).map(answer => answer.countryId))
  return run.countryIds.filter(countryId => missed.has(countryId))
}

export function summarizePracticeAnswers(
  answers: readonly PracticeRecallAnswer[],
): RecallResultSummary {
  return summarizeRecallAnswers(answers.map(answer => ({
    countryId: answer.countryId,
    skill: answer.skill,
    correct: isPracticeRecallCorrect(answer.outcome),
  })))
}

export function summarizePracticeResultAnswers(
  answers: readonly PracticeResultAnswer[],
): RecallResultSummary {
  return summarizeRecallAnswers(answers)
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const value = Math.max(0, Math.min(0.999999999, random()))
    const swapWith = Math.floor(value * (index + 1))
    ;[result[index], result[swapWith]] = [result[swapWith], result[index]]
  }
  return result
}
