import { describe, expect, it, vi } from 'vitest'
import {
  DATA_MODEL_VERSION_STORAGE_KEY,
  readDataModelVersion,
  writeDataModelVersion,
  type DataModelVersionStorage,
} from './dataModelVersion'

function memoryStorage(initial: string | null = null): DataModelVersionStorage & { value: string | null } {
  const state = { value: initial }
  return {
    get value() { return state.value },
    set value(value: string | null) { state.value = value },
    getItem: vi.fn(() => state.value),
    setItem: vi.fn((_key: string, value: string) => { state.value = value }),
  } as DataModelVersionStorage & { value: string | null }
}

describe('app data-model version storage', () => {
  it('treats missing and malformed markers as the version-0 baseline', () => {
    for (const marker of [null, '', '-1', '1.5', ' 1', '01', 'not-a-version', '9007199254740992']) {
      expect(readDataModelVersion(memoryStorage(marker))).toBe(0)
    }
  })

  it('reads valid non-negative integer versions', () => {
    expect(readDataModelVersion(memoryStorage('0'))).toBe(0)
    expect(readDataModelVersion(memoryStorage('1'))).toBe(1)
    expect(readDataModelVersion(memoryStorage('24'))).toBe(24)
  })

  it('writes the dedicated marker strictly and propagates storage failures', () => {
    const storage = memoryStorage()
    writeDataModelVersion(1, storage)
    expect(storage.value).toBe('1')
    expect(storage.setItem).toHaveBeenCalledWith(DATA_MODEL_VERSION_STORAGE_KEY, '1')

    const failingStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('quota') },
    }
    expect(() => writeDataModelVersion(2, failingStorage)).toThrow('quota')
    expect(() => writeDataModelVersion(-1, storage)).toThrow('non-negative safe integers')
  })
})
