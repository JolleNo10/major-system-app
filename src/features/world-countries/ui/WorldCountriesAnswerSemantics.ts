import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'

export type WorldCountriesAnswerKind = 'country' | 'capital'

const WORLD_COUNTRIES_TASK_HIGHLIGHT_FILLS: Record<WorldCountriesAnswerKind, string> = {
  country: '#0891b2',
  capital: '#8b5cf6',
}

/** Derive the domain of the answer the learner must provide for a recall skill. */
export function getWorldCountriesAnswerKind(skill: WorldCountriesRecallSkill): WorldCountriesAnswerKind {
  return skill === 'country-to-capital' ? 'capital' : 'country'
}

/** Resolve the established active-task map cue for an expected answer domain. */
export function getWorldCountriesTaskHighlightFill(answerKind: WorldCountriesAnswerKind): string {
  return WORLD_COUNTRIES_TASK_HIGHLIGHT_FILLS[answerKind]
}
