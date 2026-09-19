export const DATA_MODEL_VERSION_STORAGE_KEY = 'major-data-model-version'

export type DataModelVersionStorage = Pick<Storage, 'getItem' | 'setItem'>

function isValidVersion(version: number): boolean {
  return Number.isSafeInteger(version) && version >= 0
}

/** Missing and malformed legacy markers are the version-0 baseline. */
export function readDataModelVersion(storage: DataModelVersionStorage = window.localStorage): number {
  const stored = storage.getItem(DATA_MODEL_VERSION_STORAGE_KEY)
  if (stored === null || !/^(0|[1-9]\d*)$/.test(stored)) return 0
  const version = Number(stored)
  return isValidVersion(version) ? version : 0
}

/** Strictly persist a completed logical migration version. */
export function writeDataModelVersion(
  version: number,
  storage: DataModelVersionStorage = window.localStorage,
): void {
  if (!isValidVersion(version)) throw new Error('Data model versions must be non-negative safe integers.')
  storage.setItem(DATA_MODEL_VERSION_STORAGE_KEY, String(version))
}
