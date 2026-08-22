import type { Country } from '@/features/world-countries/data/countries'

export interface PlaceMatchOptions {
  aliases?: readonly string[]
  candidates?: readonly string[]
  fuzzy?: boolean
}

export type PlaceMatchKind = 'none' | 'exact' | 'fuzzy'

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

function compact(value: string): string {
  return normalizePlaceName(value).replace(/\s/g, '')
}

function basicMatch(value: string, answer: string): boolean {
  const normalizedValue = normalizePlaceName(value)
  const normalizedAnswer = normalizePlaceName(answer)
  return normalizedValue === normalizedAnswer || compact(value) === compact(answer)
}

function editDistance(left: string, right: string): number {
  const distances = Array.from({ length: left.length + 1 }, () => Array.from({ length: right.length + 1 }, () => 0))
  for (let leftIndex = 0; leftIndex <= left.length; leftIndex += 1) distances[leftIndex][0] = leftIndex
  for (let rightIndex = 0; rightIndex <= right.length; rightIndex += 1) distances[0][rightIndex] = rightIndex

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      const transpositionDistance = leftIndex > 1 && rightIndex > 1
        && left[leftIndex - 1] === right[rightIndex - 2]
        && left[leftIndex - 2] === right[rightIndex - 1]
        ? distances[leftIndex - 2][rightIndex - 2] + 1
        : Number.POSITIVE_INFINITY

      distances[leftIndex][rightIndex] = Math.min(
        distances[leftIndex - 1][rightIndex] + 1,
        distances[leftIndex][rightIndex - 1] + 1,
        distances[leftIndex - 1][rightIndex - 1] + substitutionCost,
        transpositionDistance,
      )
    }
  }
  return distances[left.length][right.length]
}

function fuzzyDistanceLimit(value: string): number {
  if (value.length < 5) return 0
  if (value.length < 8) return 1
  return 2
}

function isControlledFuzzyMatch(value: string, answer: string): boolean {
  const normalizedValue = compact(value)
  const normalizedAnswer = compact(answer)
  if (!normalizedValue || !normalizedAnswer) return false
  const limit = fuzzyDistanceLimit(normalizedAnswer)
  return limit > 0 && editDistance(normalizedValue, normalizedAnswer) <= limit
}

/**
 * Match one place name. Fuzzy matching is deliberately opt-in and compares
 * against all supplied candidates so a close answer cannot match ambiguously.
 */
export function matchesPlaceName(
  value: string,
  answer: string,
  options: PlaceMatchOptions = {},
): boolean {
  return classifyPlaceName(value, answer, options) !== 'none'
}

export function classifyPlaceName(
  value: string,
  answer: string,
  options: PlaceMatchOptions = {},
): PlaceMatchKind {
  const accepted = [answer, ...(options.aliases ?? [])]
  if (accepted.some(candidate => basicMatch(value, candidate))) return 'exact'
  if (!options.fuzzy) return 'none'

  const candidates = [...new Set(options.candidates ?? [answer, ...accepted])]
  const fuzzyMatches = candidates.filter(candidate => isControlledFuzzyMatch(value, candidate))
  const targetMatches = accepted.some(candidate => isControlledFuzzyMatch(value, candidate))
  return targetMatches && fuzzyMatches.length === 1 ? 'fuzzy' : 'none'
}

export function matchesCountryName(
  value: string,
  country: Country,
  options: Omit<PlaceMatchOptions, 'aliases'> = {},
): boolean {
  return classifyCountryName(value, country, options) !== 'none'
}

export function classifyCountryName(
  value: string,
  country: Country,
  options: Omit<PlaceMatchOptions, 'aliases'> = {},
): PlaceMatchKind {
  return classifyPlaceName(value, country.country, {
    ...options,
    aliases: country.aliases,
  })
}

export { editDistance }
