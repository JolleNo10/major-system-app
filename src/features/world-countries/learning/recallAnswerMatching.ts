import type { Country } from '@/features/world-countries/data/countries'
import {
  classifyCountryName,
  classifyPlaceName,
  type PlaceMatchKind,
} from './answerMatching'
import type { WorldCountriesRecallSkill } from './recallTargets'

export type RecallAnswerMatchKind = PlaceMatchKind | 'wrong-kind'

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
): RecallAnswerMatchKind {
  if (skill === 'country-to-capital') {
    const match = classifyPlaceName(value, country.capital, {
      fuzzy: options.fuzzy,
      candidates: options.capitalCandidates,
      aliases: country.capitalAliases,
    })
    if (match !== 'none') return match

    return classifyCountryName(value, country, { fuzzy: options.fuzzy }) === 'none' ? 'none' : 'wrong-kind'
  }

  const match = classifyCountryName(value, country, {
    fuzzy: options.fuzzy,
    candidates: options.countryCandidates?.map(candidate => candidate.country),
  })
  if (match !== 'none') return match

  return classifyPlaceName(value, country.capital, {
    fuzzy: options.fuzzy,
    aliases: country.capitalAliases,
  }) === 'none' ? 'none' : 'wrong-kind'
}

/** Describe the neutral retry shown when the opposite side of the pair is entered. */
export function getRecallAnswerKindMistakeMessage(skill: WorldCountriesRecallSkill): string {
  return skill === 'country-to-capital'
    ? "That's the Country — enter its Capital."
    : "That's the Capital — enter the Country."
}
