import { readdirSync, readFileSync, statSync } from 'node:fs'
import { posix as path } from 'node:path'

export interface DocFile {
  path: string
  markdown: string
}

export interface DocCitation {
  doc: string
  target: string
  kind: 'file' | 'directory'
}

export interface CitationViolation extends DocCitation {
  reason: 'missing' | 'expected-file' | 'expected-directory'
}

export type TargetKind = 'file' | 'directory' | 'missing'

// A backticked concrete path anchored at src/. Trailing slash means the doc cites a
// folder; tokens containing `*` are shape patterns (`src/features/*/index.ts`), not citations.
const citationPattern = /`(src\/[^`\s*]+)`/g

/** Current-state docs agents load during implementation. Archives are excluded on purpose. */
export function collectCurrentStateDocs(repoRoot: string): DocFile[] {
  const root = repoRoot.replace(/\\/g, '/').replace(/\/$/, '')
  const docs: DocFile[] = []

  function visit(directory: string, accept: (name: string) => boolean): void {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(entryPath, accept)
      else if (accept(entry.name)) docs.push({ path: entryPath, markdown: readFileSync(path.join(root, entryPath), 'utf8') })
    }
  }

  visit('docs/architecture', name => name.endsWith('.md'))
  visit('src', name => name === 'AGENTS.md')
  return docs.sort((a, b) => a.path.localeCompare(b.path))
}

export function extractDocCitations(doc: DocFile): DocCitation[] {
  const citations: DocCitation[] = []
  for (const match of doc.markdown.matchAll(citationPattern)) {
    const target = match[1]
    citations.push({ doc: doc.path, target, kind: target.endsWith('/') ? 'directory' : 'file' })
  }
  return citations
}

export function findCitationViolations(citations: readonly DocCitation[], resolve: (target: string) => TargetKind): CitationViolation[] {
  const violations: CitationViolation[] = []
  for (const citation of citations) {
    const actual = resolve(citation.target.replace(/\/$/, ''))
    if (actual === 'missing') violations.push({ ...citation, reason: 'missing' })
    else if (actual !== citation.kind) violations.push({ ...citation, reason: actual === 'directory' ? 'expected-file' : 'expected-directory' })
  }
  return violations
}

/** Fail when current-state documentation cites source paths that no longer exist. */
export function scanDocCitations(repoRoot: string): CitationViolation[] {
  const root = repoRoot.replace(/\\/g, '/').replace(/\/$/, '')
  const citations = collectCurrentStateDocs(root).flatMap(extractDocCitations)
  const cache = new Map<string, TargetKind>()

  const resolve = (target: string): TargetKind => {
    const cached = cache.get(target)
    if (cached) return cached
    let kind: TargetKind
    try {
      kind = statSync(path.join(root, target)).isDirectory() ? 'directory' : 'file'
    } catch {
      kind = 'missing'
    }
    cache.set(target, kind)
    return kind
  }

  return findCitationViolations(citations, resolve)
}
