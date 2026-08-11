import { countries, type Country, type CountryId } from '@/features/world-countries/data/countries'
import {
  type CountryClassification,
  countryClassifications,
  validateCountryClassifications,
} from '@/features/world-countries/data/countryClassification'

export type WorldCountriesEntityGroupId =
  | 'observer-states'
  | 'partially-recognized-sovereign-states'
  | 'special-political-status'
  | 'territories'

export interface WorldCountriesEntityGroupDefinition {
  id: WorldCountriesEntityGroupId
  label: string
  description: string
  /** Canonical display names currently matched by this policy group. */
  members: readonly string[]
  matches: (classification: CountryClassification) => boolean
}

type WorldCountriesEntityGroupPolicy = Omit<WorldCountriesEntityGroupDefinition, 'members'>

/** Stable country-set policy registry. Predicates live here, not in workflows. */
const WORLD_COUNTRIES_ENTITY_GROUP_POLICIES: readonly WorldCountriesEntityGroupPolicy[] = [
  {
    id: 'observer-states',
    label: 'UN observer states',
    description: 'Vatican City / Holy See and Palestine',
    matches: classification => classification.unStatus === 'observer',
  },
  {
    id: 'partially-recognized-sovereign-states',
    label: 'Partially recognized sovereign states',
    description: 'Non-UN sovereign-state entities with partial recognition',
    matches: classification => classification.unStatus === 'none'
      && classification.entityType === 'sovereign-state'
      && classification.recognition === 'partial',
  },
  {
    id: 'special-political-status',
    label: 'Special political-status entities',
    description: 'Associated states, special administrative regions, and disputed territories',
    matches: classification => classification.entityType === 'associated-state'
      || classification.entityType === 'special-administrative-region'
      || classification.entityType === 'disputed-territory',
  },
  {
    id: 'territories',
    label: 'Territories & dependencies',
    description: 'Entities classified as territories',
    matches: classification => classification.entityType === 'territory',
  },
]

export const WORLD_COUNTRIES_ENTITY_GROUP_DEFINITIONS: readonly WorldCountriesEntityGroupDefinition[] =
  WORLD_COUNTRIES_ENTITY_GROUP_POLICIES.map(policy => ({
    ...policy,
    members: countries
      .filter(country => policy.matches(countryClassifications.get(country.id)!))
      .map(country => country.country),
  }))

const definitionsById = new Map(
  WORLD_COUNTRIES_ENTITY_GROUP_DEFINITIONS.map(definition => [definition.id, definition]),
)

export const WORLD_COUNTRIES_ENTITY_GROUP_IDS: readonly WorldCountriesEntityGroupId[] = WORLD_COUNTRIES_ENTITY_GROUP_DEFINITIONS.map(
  definition => definition.id,
)

export function isWorldCountriesEntityGroupId(value: unknown): value is WorldCountriesEntityGroupId {
  return typeof value === 'string' && definitionsById.has(value as WorldCountriesEntityGroupId)
}

/** Normalize the persisted policy without ever persisting the resolved Country IDs. */
export function normalizeWorldCountriesIncludedEntityGroups(value: unknown): WorldCountriesEntityGroupId[] {
  if (!Array.isArray(value)) return []
  const result: WorldCountriesEntityGroupId[] = []
  const seen = new Set<WorldCountriesEntityGroupId>()
  for (const candidate of value) {
    if (!isWorldCountriesEntityGroupId(candidate) || seen.has(candidate)) continue
    seen.add(candidate)
    result.push(candidate)
  }
  return result
}

function getDefinition(id: WorldCountriesEntityGroupId): WorldCountriesEntityGroupDefinition {
  return definitionsById.get(id)!
}

/** Resolve the active learning population in canonical Country order. */
export function resolveCountrySet(
  entries: readonly Country[],
  classifications: ReadonlyMap<CountryId, CountryClassification> = countryClassifications,
  includedGroups: readonly WorldCountriesEntityGroupId[] = [],
): Country[] {
  validateCountryClassifications(entries, classifications)
  const selectedGroups = new Set(normalizeWorldCountriesIncludedEntityGroups(includedGroups))
  const included = new Set<CountryId>()
  const resolved: Country[] = []
  for (const country of entries) {
    if (included.has(country.id)) continue
    const classification = classifications.get(country.id)!
    const selected = classification.unStatus === 'member'
      || [...selectedGroups].some(groupId => getDefinition(groupId).matches(classification))
    if (!selected) continue
    included.add(country.id)
    resolved.push(country)
  }
  return resolved
}
