import { describe, expect, it } from 'vitest'
import { CURRENT_DATA_MODEL_VERSION, APP_DATA_MIGRATIONS } from './migrationRegistry'

describe('application data-migration registry', () => {
  it('derives current model version from the single initial registered migration', () => {
    expect(APP_DATA_MIGRATIONS.map(({ fromVersion, toVersion }) => [fromVersion, toVersion])).toEqual([[0, 1]])
    expect(CURRENT_DATA_MODEL_VERSION).toBe(1)
  })
})
