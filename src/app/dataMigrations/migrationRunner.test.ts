import { describe, expect, it, vi } from 'vitest'
import { getCurrentDataModelVersion, runDataMigrations, type AppDataMigration } from './migrationRunner'

function migration(fromVersion: number, migrate: () => Promise<void>): AppDataMigration {
  return {
    fromVersion,
    toVersion: fromVersion + 1,
    title: `Update ${fromVersion}`,
    migrate,
  }
}

describe('app data-migration runner', () => {
  it('validates an ordered, contiguous forward-only chain', () => {
    const chain = [migration(0, async () => undefined), migration(1, async () => undefined)]
    expect(getCurrentDataModelVersion(chain)).toBe(2)
    expect(() => getCurrentDataModelVersion([
      migration(0, async () => undefined),
      migration(2, async () => undefined),
    ])).toThrow('contiguous chain')
  })

  it('commits every successful step and resumes at the first incomplete step', async () => {
    let persistedVersion = 0
    let failSecond = true
    const order: string[] = []
    const first = migration(0, async () => { order.push('0->1') })
    const second = migration(1, async () => {
      expect(persistedVersion).toBe(1)
      order.push('1->2')
      if (failSecond) throw new Error('second step failed')
    })
    const third = migration(2, async () => {
      expect(persistedVersion).toBe(2)
      order.push('2->3')
    })
    const chain = [first, second, third]
    const persist = vi.fn(async (version: number) => { persistedVersion = version })

    await expect(runDataMigrations(0, chain, persist)).rejects.toThrow('second step failed')
    expect(order).toEqual(['0->1', '1->2'])
    expect(persistedVersion).toBe(1)
    expect(persist.mock.calls.map(([version]) => version)).toEqual([1])

    failSecond = false
    await expect(runDataMigrations(persistedVersion, chain, persist)).resolves.toBe(3)
    expect(order).toEqual(['0->1', '1->2', '1->2', '2->3'])
    expect(persist.mock.calls.map(([version]) => version)).toEqual([1, 2, 3])
    expect(persistedVersion).toBe(3)
  })

  it('does not downgrade data written by a newer model', async () => {
    const migrate = vi.fn(async () => undefined)
    const persist = vi.fn(async () => undefined)
    await expect(runDataMigrations(4, [migration(0, migrate)], persist)).rejects.toThrow('newer version')
    expect(migrate).not.toHaveBeenCalled()
    expect(persist).not.toHaveBeenCalled()
  })
})
