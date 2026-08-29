import type { Country } from '@/features/world-countries/data/countries'
import type { WorldCountriesRecallSkill } from './recallTargets'
import { getWorldCountriesAnswerKind, type WorldCountriesAnswerKind } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'

export interface WorldCountriesRecallTaskPresentation {
  direction: string
  cue: string
  typedPlaceholder: string
  typedAnswerLabel: string
  answerKind: WorldCountriesAnswerKind
}

/** Derive neutral copy for an active Country recall task. */
export function deriveRecallTaskPresentation(
  skill: WorldCountriesRecallSkill,
  country: Country,
): WorldCountriesRecallTaskPresentation {
  const answerKind = getWorldCountriesAnswerKind(skill)
  switch (skill) {
    case 'location-to-country':
      return {
        direction: 'Location → Country',
        cue: 'Name the highlighted country',
        typedPlaceholder: 'Type the country…',
        typedAnswerLabel: 'Type the country name',
        answerKind,
      }
    case 'country-to-capital':
      return {
        direction: 'Country → Capital',
        cue: country.country,
        typedPlaceholder: 'Type the capital…',
        typedAnswerLabel: 'Type the capital',
        answerKind,
      }
    case 'capital-to-country':
      return {
        direction: 'Capital → Country',
        cue: country.capital,
        typedPlaceholder: 'Type the country…',
        typedAnswerLabel: 'Type the country name',
        answerKind,
      }
    case 'shape-to-country':
      return {
        direction: 'Shape → Country',
        cue: 'Name this country',
        typedPlaceholder: 'Type the country…',
        typedAnswerLabel: 'Type the country name',
        answerKind,
      }
  }
}
