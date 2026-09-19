// Required architecture before modification:
// docs/architecture/features/WORLD_COUNTRIES.md

export { WorldCountries } from './WorldCountries'
export { migrateWorldCountriesAttemptProvenance } from './learning/attemptTypeMigration'
export {
  WORLD_COUNTRIES_ENTITY_GROUP_DEFINITIONS,
  normalizeWorldCountriesIncludedEntityGroups,
} from './geography/countrySet'
export { UN_MEMBER_COUNTRY_IDS } from './data/countryClassification'
export type { WorldCountriesEntityGroupId } from './geography/countrySet'
export type { LearningSetMaximum } from './learning/stagedLearningPlan'
export {
  exportWorldCountriesOrder,
  parseWorldCountriesOrder,
  resetWorldCountriesOrder,
  restoreWorldCountriesOrder,
} from './geography/orderBackup'
export type { WorldCountriesOrderBackup } from './geography/orderBackup'
export {
  applyWorldCountriesCapitalBackfill,
  planWorldCountriesCapitalBackfill,
} from './learning/capitalEvidenceBackfill'
export type {
  WorldCountriesCapitalBackfillPlan,
  WorldCountriesCapitalBackfillResult,
} from './learning/capitalEvidenceBackfill'
