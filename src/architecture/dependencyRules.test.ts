import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findDependencyViolations, scanSourceDependencies, type DependencySourceFile } from './dependencyRules'

describe('documented dependency boundaries', () => {
  it('keeps runtime source within the documented dependency rules', () => {
    const sourceRoot = fileURLToPath(new URL('../', import.meta.url))
    expect(scanSourceDependencies(sourceRoot)).toEqual([])
  })

  it('rejects forbidden edges and preserves only the documented public-root allowance', () => {
    const files: DependencySourceFile[] = [
      { path: 'src/core/storage.ts', source: "import { x } from '@/app/settings/settings'" },
      { path: 'src/core/reader.ts', source: "import { x } from '@/features/cards'" },
      { path: 'src/features/world-countries/a.ts', source: "import { x } from '@/features/pi'" },
      { path: 'src/features/pi/allowed.ts', source: "import { x } from '@/features/major-system'" },
      { path: 'src/features/pi/private.ts', source: "import { x } from '@/features/major-system/words'" },
      { path: 'src/features/world-countries/settings.ts', source: "import { x } from '@/app/settings/SettingsContext'" },
    ]

    expect(findDependencyViolations(files)).toEqual([
      expect.objectContaining({ source: 'src/core/storage.ts', kind: 'core-to-app' }),
      expect.objectContaining({ source: 'src/core/reader.ts', kind: 'core-to-feature' }),
      expect.objectContaining({ source: 'src/features/world-countries/a.ts', kind: 'feature-to-sibling' }),
      expect.objectContaining({ source: 'src/features/pi/private.ts', kind: 'feature-to-sibling' }),
    ])
  })
})
