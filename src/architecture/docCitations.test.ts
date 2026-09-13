import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  archiveRoot,
  collectCurrentStateDocs,
  extractDocCitations,
  extractDocLinks,
  findCitationViolations,
  scanArchiveLinks,
  scanDocCitations,
  scanDocLinks,
  type DocCitation,
  type TargetKind,
} from './docCitations'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))

describe('current-state documentation citations', () => {
  it('keeps every source path cited by current-state docs pointing at real source', () => {
    expect(scanDocCitations(repoRoot)).toEqual([])
  })

  it('covers the architecture documents and the per-feature routing documents', () => {
    const docs = collectCurrentStateDocs(repoRoot).map(doc => doc.path)

    expect(docs).toContain('docs/architecture/SYSTEM.md')
    expect(docs).toContain('docs/architecture/INVARIANTS.md')
    expect(docs).toContain('docs/architecture/features/WORLD_COUNTRIES.md')
    expect(docs).toContain('src/features/world-countries/AGENTS.md')
    expect(docs.filter(doc => doc.startsWith(archiveRoot))).toEqual([])
  })

  it('cites enough source to be a meaningful guard', () => {
    const citations = collectCurrentStateDocs(repoRoot).flatMap(extractDocCitations)
    expect(citations.length).toBeGreaterThan(50)
  })

  it('reads file and directory citations out of prose', () => {
    const markdown = [
      'The store lives in `src/core/scoring/attemptStore.ts` and the feature owns `src/features/pi/`.',
      'Prose mentioning src/core/storage.ts without backticks is not a citation.',
      'Neither is `useMnemonic` or `@/features/world-countries`.',
    ].join('\n')

    expect(extractDocCitations({ path: 'docs/architecture/CORE.md', markdown })).toEqual([
      { doc: 'docs/architecture/CORE.md', target: 'src/core/scoring/attemptStore.ts', kind: 'file' },
      { doc: 'docs/architecture/CORE.md', target: 'src/features/pi/', kind: 'directory' },
    ])
  })

  it('ignores shape patterns, which describe a convention rather than one path', () => {
    const markdown = 'Barrels live at `src/features/*/index.ts`, for example `src/features/pi/index.ts`.'

    expect(extractDocCitations({ path: 'docs/architecture/SYSTEM.md', markdown })).toEqual([
      { doc: 'docs/architecture/SYSTEM.md', target: 'src/features/pi/index.ts', kind: 'file' },
    ])
  })

  it('resolves relative document links against the linking document', () => {
    const markdown = [
      'See [Core](CORE.md), [Pi](features/PI.md), and [a decision](../archive/adr/0001-page-layout-panel-pattern.md).',
      'External [docs](https://example.com/x.md), [mail](mailto:a@b.c), and [a section](#ownership) are not paths.',
      'Neither is an absolute [link](/docs/architecture/SYSTEM.md).',
    ].join('\n')

    expect(extractDocLinks({ path: 'docs/architecture/SYSTEM.md', markdown })).toEqual([
      { doc: 'docs/architecture/SYSTEM.md', target: 'docs/architecture/CORE.md', kind: 'file' },
      { doc: 'docs/architecture/SYSTEM.md', target: 'docs/architecture/features/PI.md', kind: 'file' },
      { doc: 'docs/architecture/SYSTEM.md', target: 'docs/archive/adr/0001-page-layout-panel-pattern.md', kind: 'file' },
    ])
  })

  it('strips anchors, which address a section rather than a different document', () => {
    const markdown = 'See [ownership](../SYSTEM.md#top-level-ownership).'

    expect(extractDocLinks({ path: 'docs/architecture/features/PI.md', markdown })).toEqual([
      { doc: 'docs/architecture/features/PI.md', target: 'docs/architecture/SYSTEM.md', kind: 'file' },
    ])
  })

  it('keeps every relative link in current-state docs pointing at a real document', () => {
    expect(scanDocLinks(repoRoot)).toEqual([])
  })

  it('never routes an agent from current-state documentation into the archive', () => {
    expect(scanArchiveLinks(repoRoot)).toEqual([])
  })

  it('reports deleted, renamed, and re-shaped citation targets', () => {
    const citations: DocCitation[] = [
      { doc: 'a.md', target: 'src/core/present.ts', kind: 'file' },
      { doc: 'a.md', target: 'src/core/deleted.ts', kind: 'file' },
      { doc: 'b.md', target: 'src/features/pi/', kind: 'directory' },
      { doc: 'b.md', target: 'src/features/gone/', kind: 'directory' },
      { doc: 'c.md', target: 'src/core/becameABarrel.ts', kind: 'file' },
    ]
    const kinds: Record<string, TargetKind> = {
      'src/core/present.ts': 'file',
      'src/core/deleted.ts': 'missing',
      'src/features/pi': 'directory',
      'src/features/gone': 'missing',
      'src/core/becameABarrel.ts': 'directory',
    }

    expect(findCitationViolations(citations, target => kinds[target] ?? 'missing')).toEqual([
      expect.objectContaining({ target: 'src/core/deleted.ts', reason: 'missing' }),
      expect.objectContaining({ target: 'src/features/gone/', reason: 'missing' }),
      expect.objectContaining({ target: 'src/core/becameABarrel.ts', reason: 'expected-file' }),
    ])
  })
})
