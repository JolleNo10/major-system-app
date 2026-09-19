import { migrateWorldCountriesAttemptProvenance } from '@/features/world-countries'
import { getCurrentDataModelVersion, type AppDataMigration } from './migrationRunner'

export const APP_DATA_MIGRATIONS = [
  {
    fromVersion: 0,
    toVersion: 1,
    title: 'Update learning history',
    migrate: async () => { await migrateWorldCountriesAttemptProvenance() },
  },
] satisfies readonly AppDataMigration[]

export const CURRENT_DATA_MODEL_VERSION = getCurrentDataModelVersion(APP_DATA_MIGRATIONS)
