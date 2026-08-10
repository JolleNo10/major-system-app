import type { Country } from '@/features/world-countries/data/countries'
import {
  classifyCountryName,
  classifyPlaceName,
  type PlaceMatchKind,
} from './answerMatching'
import type { WorldCountriesRecallSkill } from './recallTargets'

export interface RecallAnswerOptions {
  fuzzy?: boolean
  countryCandidates?: readonly Country[]
  capitalCandidates?: readonly string[]
}

/** Evaluate a typed answer against the relationship represented by a skill. */
export function classifyRecallAnswer(
  skill: WorldCountriesRecallSkill,
  value: string,
  country: Country,
  options: RecallAnswerOptions = {},
): PlaceMatchKind {
  if (skill === 'country-to-capital') {
    return classifyPlaceName(value, country.capital, {
      fuzzy: options.fuzzy,
      candidates: options.capitalCandidates,
    })
  }

  return classifyCountryName(value, country, {
    fuzzy: options.fuzzy,
    candidates: options.countryCandidates?.map(candidate => candidate.country),
  })
}

