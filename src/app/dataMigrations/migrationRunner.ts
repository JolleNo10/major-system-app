export interface AppDataMigration {
  fromVersion: number
  toVersion: number
  title: string
  migrate: () => Promise<void>
}

export type PersistDataModelVersion = (version: number) => void | Promise<void>

/** Validate an ordered, gap-free, forward-only chain starting at legacy version 0. */
export function getCurrentDataModelVersion(migrations: readonly AppDataMigration[]): number {
  let expectedVersion = 0
  for (const migration of migrations) {
    if (!Number.isSafeInteger(migration.fromVersion) || !Number.isSafeInteger(migration.toVersion)) {
      throw new Error('Data migrations must use safe integer versions.')
    }
    if (migration.fromVersion !== expectedVersion || migration.toVersion !== migration.fromVersion + 1) {
      throw new Error(`Data migrations must form a contiguous chain from version 0; expected ${expectedVersion}.`)
    }
    if (!migration.title.trim() || typeof migration.migrate !== 'function') {
      throw new Error(`Data migration ${migration.fromVersion} -> ${migration.toVersion} is incomplete.`)
    }
    expectedVersion = migration.toVersion
  }
  return expectedVersion
}

/** Run each pending step and persist its version only after that step succeeds. */
export async function runDataMigrations(
  storedVersion: number,
  migrations: readonly AppDataMigration[],
  persistVersion: PersistDataModelVersion,
): Promise<number> {
  const currentVersion = getCurrentDataModelVersion(migrations)
  if (!Number.isSafeInteger(storedVersion) || storedVersion < 0) {
    throw new Error('The saved data model version is invalid.')
  }
  if (storedVersion > currentVersion) {
    throw new Error('Saved learning data belongs to a newer version of this application.')
  }

  let version = storedVersion
  while (version < currentVersion) {
    const migration = migrations.find(candidate => candidate.fromVersion === version)
    if (!migration) throw new Error(`No data migration is registered from version ${version}.`)
    await migration.migrate()
    await persistVersion(migration.toVersion)
    version = migration.toVersion
  }
  return version
}
