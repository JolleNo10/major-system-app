import type { Country } from '@/features/world-countries/countries'

export type CountryQuizDirection = 'country-to-capital' | 'capital-to-country'

export interface CountryQuestion {
  entry: Country
  prompt: string
  answer: string
  options: string[]
}

function shuffleWith<T>(items: T[], rng: () => number): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapWith = Math.floor(rng() * (index + 1))
    ;[shuffled[index], shuffled[swapWith]] = [shuffled[swapWith], shuffled[index]]
  }
  return shuffled
}

function answerFor(entry: Country, direction: CountryQuizDirection): string {
  return direction === 'country-to-capital' ? entry.capital : entry.country
}

export function normalizePlaceName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function matchesPlaceName(value: string, answer: string): boolean {
  const normalizedValue = normalizePlaceName(value)
  const normalizedAnswer = normalizePlaceName(answer)
  return normalizedValue === normalizedAnswer
    || normalizedValue.replace(/\s/g, '') === normalizedAnswer.replace(/\s/g, '')
}

export function buildCountryQuestion(
  entry: Country,
  allCountries: Country[],
  direction: CountryQuizDirection,
  rng: () => number = Math.random,
): CountryQuestion {
  const answer = answerFor(entry, direction)
  const eligible = allCountries.filter(candidate => (
    candidate.country !== entry.country && answerFor(candidate, direction) !== answer
  ))
  const sameSubregion = shuffleWith(
    eligible.filter(candidate => candidate.subregion === entry.subregion),
    rng,
  )
  const sameContinent = shuffleWith(
    eligible.filter(candidate => (
      candidate.subregion !== entry.subregion && candidate.continent === entry.continent
    )),
    rng,
  )
  const elsewhere = shuffleWith(
    eligible.filter(candidate => candidate.continent !== entry.continent),
    rng,
  )
  const distractors = [...sameSubregion, ...sameContinent, ...elsewhere]
    .slice(0, 2)
    .map(candidate => answerFor(candidate, direction))

  return {
    entry,
    prompt: direction === 'country-to-capital' ? entry.country : entry.capital,
    answer,
    options: shuffleWith([answer, ...distractors], rng),
  }
}

export function pickCountry(
  pool: Country[],
  previousCountry?: string,
  rng: () => number = Math.random,
): Country {
  const candidates = pool.length > 1
    ? pool.filter(entry => entry.country !== previousCountry)
    : pool
  return candidates[Math.floor(rng() * candidates.length)]
}
