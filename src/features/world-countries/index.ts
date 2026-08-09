export { WorldCountries } from './WorldCountries'
export { MapWorkarea } from './maps/workarea/MapWorkarea'

export { CONTINENT_MAP_IDS, countries } from './data/countries'
export type { Country, CountryId, Continent } from './data/countries'
export {
  CONTINENT_IDS,
  SUBREGION_DEFINITIONS,
  continentIdFor,
  getSubregion,
  getSubregionDefinition,
  getSubregionIdForLabel,
  getSubregionLabel,
  isContinentId,
  isSubregionId,
  subregionDefinitionFor,
  subregionIdFor,
} from './data/subregions'
export type { ContinentId, SubregionDefinition, SubregionId } from './data/subregions'

export { getCountryById, getCountryId } from './domain/country'
export {
  getContinents,
  getCountriesForContinent,
  getCountriesForSubregion,
  getCountriesForSubregionId,
  getCountriesForSubregionInEffectiveOrder,
  getSubregionDefinitionsForContinent,
  getSubregionIdsForContinent,
  getSubregionsForContinent,
} from './domain/geography'
export {
  matchesCountryName,
  matchesPlaceName,
  normalizePlaceName,
  type PlaceMatchOptions,
} from './domain/answerMatching'
