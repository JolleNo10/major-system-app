export { CONTINENT_MAP_IDS, countries } from '@/features/world-countries/data/countries'
export type { Country, CountryId, Continent } from '@/features/world-countries/data/countries'
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
} from '@/features/world-countries/data/subregions'
export type {
  ContinentId,
  SubregionDefinition,
  SubregionId,
} from '@/features/world-countries/data/subregions'
export { WorldCountriesDrill } from '@/features/world-countries/quiz/CountryCapitalDrill'
export { MapWorkarea } from '@/features/world-countries/workarea/MapWorkarea'
export { WorldCountriesMemo } from '@/features/world-countries/memo/WorldCountriesMemo'
export {
  getContinents,
  getCountriesForContinent,
  getCountriesForSubregion,
  getCountriesForSubregionId,
  getCountriesForSubregionInEffectiveOrder,
  getSubregionDefinitionsForContinent,
  getSubregionIdsForContinent,
  getSubregionsForContinent,
} from '@/features/world-countries/memo/geographyMemo'
export {
  getContinentMemoProgress,
  getCountryMemoProgress,
  getMemoProgress,
  getSubregionMemoProgress,
  getWorldMemoProgress,
  type MemoProgress,
  type MemoProgressStatus,
} from '@/features/world-countries/memo/memoProgress'
export {
  countryCapitalMnemonicId,
  continentId,
  isCountryCapitalMnemonicTargetId,
  isGeographyMnemonicTargetId,
  isSubregionMnemonicTargetId,
  subregionId,
  subregionMnemonicId,
} from '@/features/world-countries/mnemonics/geographyMnemonicIds'
export {
  deleteCountryCapitalMnemonic,
  deleteSubregionMnemonic,
  exportGeographyMnemonics,
  getCountryCapitalMnemonic,
  getGeographyMnemonics,
  getSubregionCountryIds,
  getSubregionCountries,
  getSubregionMnemonic,
  importGeographyMnemonics,
  isSubregionMnemonicStale,
  putCountryCapitalMnemonic,
  putSubregionMnemonic,
  type GeographyExportV2,
  type SubregionMnemonic,
} from '@/features/world-countries/mnemonics/geographyMnemonics'
export {
  countrySubregionId,
  getCanonicalSubregionCountries,
  normalizeSubregionMetadata,
  resolveSubregionCountryIds,
  resolveSubregionCountryOrder,
  type SubregionMetadata,
} from '@/features/world-countries/subregions/subregionMetadata'
export {
  getAllSubregionMetadata,
  getSubregionMetadata,
  resetSubregionCountryOrder,
  setSubregionCountryOrder,
  setSubregionMetadata,
  SUBREGION_METADATA_STORAGE_KEY,
} from '@/features/world-countries/subregions/subregionMetadataStore'
export {
  capitalToCountryItemId,
  countryId,
  countryRecallItemId,
  countryToCapitalItemId,
  getContinentScope,
  getCountryPoolScope,
  getCountryScope,
  getSubregionScope,
  getWorldScope,
  loadCountryLearningProgress,
  recordCountryAttempt,
  selectCountryEntry,
} from '@/features/world-countries/learning'
export {
  createShuffleBag,
  drawShuffleBag,
  type ShuffleBagState,
} from '@/features/world-countries/learning/shuffleBag'
export {
  createLocationRecallSession,
  submitLocationSelection,
  type LocationRecallConfig,
  type LocationRecallResult,
  type LocationRecallState,
} from '@/features/world-countries/learning/locationRecallSession'
export {
  createOrderedRecallSession,
  submitOrderedRecall,
  type OrderedRecallConfig,
  type OrderedRecallResult,
  type OrderedRecallState,
} from '@/features/world-countries/learning/orderedRecallSession'
export {
  createCountryLearningFlow,
  moveCountryWalkthrough,
  startCountryWalkthrough,
  startLocationPractice,
  startOrderedRecall,
  submitCountryLocation,
  submitCountryOrderAnswer,
  type CountryLearningConfig,
  type CountryLearningFlowState,
  type CountryLearningPhase,
} from '@/features/world-countries/learning/countryLearningFlow'
export {
  getAllSubregionLearningStates,
  getSubregionLearningState,
  markSubregionCountriesLearned,
  clearSubregionCountriesLearned,
  SUBREGION_LEARNING_STORAGE_KEY,
} from '@/features/world-countries/learning/subregionLearningStore'
export { isSubregionCountriesLearned, type SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
export {
  matchesCountryName,
  matchesPlaceName,
  normalizePlaceName,
  type PlaceMatchOptions,
} from '@/features/world-countries/learning/answerMatching'
