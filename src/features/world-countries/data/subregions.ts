import type { Continent } from './countries'

/** Stable persistence IDs for display-level Continents. */
export const CONTINENT_IDS = {
  Africa: 'africa',
  Asia: 'asia',
  Europe: 'europe',
  'North America': 'north-america',
  'South America': 'south-america',
  Oceania: 'oceania',
} as const satisfies Record<Continent, string>

export type ContinentId = typeof CONTINENT_IDS[keyof typeof CONTINENT_IDS]

/**
 * The canonical identity and presentation registry for the app's Subregions.
 * Country membership deliberately remains in countries.ts.
 */
export const SUBREGION_DEFINITIONS = [
  { id: 'central-africa', label: 'Central Africa', continent: 'Africa' },
  { id: 'east-africa', label: 'East Africa', continent: 'Africa' },
  { id: 'indian-ocean', label: 'Indian Ocean', continent: 'Africa' },
  { id: 'north-africa', label: 'North Africa', continent: 'Africa' },
  { id: 'southern-africa', label: 'Southern Africa', continent: 'Africa' },
  { id: 'west-africa', label: 'West Africa', continent: 'Africa' },
  { id: 'caucasus', label: 'Caucasus', continent: 'Asia' },
  { id: 'central-asia', label: 'Central Asia', continent: 'Asia' },
  { id: 'east-asia', label: 'East Asia', continent: 'Asia' },
  { id: 'south-asia', label: 'South Asia', continent: 'Asia' },
  { id: 'southeast-asia', label: 'Southeast Asia', continent: 'Asia' },
  { id: 'west-asia', label: 'West Asia', continent: 'Asia' },
  { id: 'balkans', label: 'Balkans', continent: 'Europe' },
  { id: 'central-europe', label: 'Central Europe', continent: 'Europe' },
  { id: 'eastern-europe', label: 'Eastern Europe', continent: 'Europe' },
  { id: 'northern-europe', label: 'Northern Europe', continent: 'Europe' },
  { id: 'southern-europe', label: 'Southern Europe', continent: 'Europe' },
  { id: 'western-europe', label: 'Western Europe', continent: 'Europe' },
  { id: 'caribbean', label: 'Caribbean', continent: 'North America' },
  { id: 'central-america', label: 'Central America', continent: 'North America' },
  { id: 'northern-america', label: 'Northern America', continent: 'North America' },
  { id: 'australia-new-zealand', label: 'Australia & New Zealand', continent: 'Oceania' },
  { id: 'melanesia', label: 'Melanesia', continent: 'Oceania' },
  { id: 'micronesia', label: 'Micronesia', continent: 'Oceania' },
  { id: 'polynesia', label: 'Polynesia', continent: 'Oceania' },
  { id: 'andean-countries', label: 'Andean Countries', continent: 'South America' },
  { id: 'eastern-south-america', label: 'Eastern South America', continent: 'South America' },
  { id: 'northern-south-america', label: 'Northern South America', continent: 'South America' },
  { id: 'southern-cone', label: 'Southern Cone', continent: 'South America' },
] as const satisfies readonly {
  id: string
  label: string
  continent: Continent
}[]

export type SubregionId = typeof SUBREGION_DEFINITIONS[number]['id']
export type SubregionDefinition = typeof SUBREGION_DEFINITIONS[number]

const definitionsById = new Map<SubregionId, SubregionDefinition>(
  SUBREGION_DEFINITIONS.map(definition => [definition.id, definition]),
)
const definitionsByLabel = new Map<string, SubregionDefinition>(
  SUBREGION_DEFINITIONS.map(definition => [definition.label, definition]),
)
const continentIdByLabel = new Map<Continent, ContinentId>(
  Object.entries(CONTINENT_IDS) as [Continent, ContinentId][],
)

export function isContinentId(value: string): value is ContinentId {
  return Object.values(CONTINENT_IDS).includes(value as ContinentId)
}

export function continentIdFor(value: Continent | string): ContinentId | undefined {
  return continentIdByLabel.get(value as Continent)
}

export function getSubregionDefinition(id: SubregionId): SubregionDefinition {
  const definition = definitionsById.get(id)
  if (!definition) throw new Error(`Unknown Subregion ID: ${id}`)
  return definition
}

/** Short domain-facing alias used by feature consumers. */
export const getSubregion = getSubregionDefinition

export function isSubregionId(value: string): value is SubregionId {
  return definitionsById.has(value as SubregionId)
}

/** Resolve either the stable ID or a legacy display label during migration. */
export function subregionIdFor(value: SubregionId | string): SubregionId | undefined {
  if (isSubregionId(value)) return value
  return definitionsByLabel.get(value)?.id
}

export function subregionDefinitionFor(value: SubregionId | string): SubregionDefinition | undefined {
  const id = subregionIdFor(value)
  return id ? definitionsById.get(id) : undefined
}

export function getSubregionIdForLabel(label: string): SubregionId | undefined {
  return definitionsByLabel.get(label)?.id
}

export function getSubregionLabel(id: SubregionId): string {
  return getSubregionDefinition(id).label
}
