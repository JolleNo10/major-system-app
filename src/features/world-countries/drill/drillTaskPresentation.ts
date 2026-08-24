import type { Country } from '@/features/world-countries/data/countries'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'

export type DrillTaskAnswerKind = 'country' | 'capital'
export type DrillTaskHighlightTone = 'country-answer' | 'capital-answer'

export interface DrillTaskPresentation {
  direction: string
  cue: string
  typedPlaceholder: string
  typedAnswerLabel: string
  answerKind: DrillTaskAnswerKind
  highlightTone: DrillTaskHighlightTone
}

/** Derive the active question's copy and visual answer-domain cue. */
export function deriveDrillTaskPresentation(
  skill: WorldCountriesRecallSkill,
  country: Country,
): DrillTaskPresentation {
  switch (skill) {
    case 'location-to-country':
      return {
        direction: 'Location → Country',
        cue: 'Name the highlighted country',
        typedPlaceholder: 'Type the country…',
        typedAnswerLabel: 'Type the country name',
        answerKind: 'country',
        highlightTone: 'country-answer',
      }
    case 'country-to-capital':
      return {
        direction: 'Country → Capital',
        cue: country.country,
        typedPlaceholder: 'Type the capital…',
        typedAnswerLabel: 'Type the capital',
        answerKind: 'capital',
        highlightTone: 'capital-answer',
      }
    case 'capital-to-country':
      return {
        direction: 'Capital → Country',
        cue: country.capital,
        typedPlaceholder: 'Type the country…',
        typedAnswerLabel: 'Type the country name',
        answerKind: 'country',
        highlightTone: 'country-answer',
      }
    case 'shape-to-country':
      return {
        direction: 'Shape → Country',
        cue: 'Name this country',
        typedPlaceholder: 'Type the country…',
        typedAnswerLabel: 'Type the country name',
        answerKind: 'country',
        highlightTone: 'country-answer',
      }
  }
}
