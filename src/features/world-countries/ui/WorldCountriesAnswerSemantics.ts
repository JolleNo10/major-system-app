import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'

export type WorldCountriesAnswerKind = 'country' | 'capital'

export interface WorldCountriesAnswerAccent {
  highlightFill: string
  dockBorderClassName: string
  typingInput: {
    borderClassName: string
    focusBorderClassName: string
    submitButtonClassName: string
  }
}

const WORLD_COUNTRIES_ANSWER_ACCENTS: Record<WorldCountriesAnswerKind, WorldCountriesAnswerAccent> = {
  country: {
    highlightFill: '#0891b2',
    dockBorderClassName: 'border-cyan-500/45',
    typingInput: {
      borderClassName: 'border-cyan-500/60',
      focusBorderClassName: 'focus-within:border-cyan-400',
      submitButtonClassName: 'bg-cyan-600 hover:bg-cyan-500',
    },
  },
  capital: {
    highlightFill: '#8b5cf6',
    dockBorderClassName: 'border-violet-500/45',
    typingInput: {
      borderClassName: 'border-violet-500/60',
      focusBorderClassName: 'focus-within:border-violet-400',
      submitButtonClassName: 'bg-violet-600 hover:bg-violet-500',
    },
  },
}

/** Derive the domain of the answer the learner must provide for a recall skill. */
export function getWorldCountriesAnswerKind(skill: WorldCountriesRecallSkill): WorldCountriesAnswerKind {
  return skill === 'country-to-capital' ? 'capital' : 'country'
}

/** Resolve the established active-task map cue for an expected answer domain. */
export function getWorldCountriesTaskHighlightFill(answerKind: WorldCountriesAnswerKind): string {
  return WORLD_COUNTRIES_ANSWER_ACCENTS[answerKind].highlightFill
}

/** Resolve the shared answer-domain accent for active World Countries recall UI. */
export function getWorldCountriesAnswerAccent(answerKind: WorldCountriesAnswerKind): WorldCountriesAnswerAccent {
  return WORLD_COUNTRIES_ANSWER_ACCENTS[answerKind]
}
