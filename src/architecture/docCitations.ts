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

// A markdown link target. Relative document links are repository paths; external URLs,
// mail links, absolute paths, and bare in-page anchors are not.
const documentLinkPattern = /\]\(([^)\s]+)\)/g

/** Frozen history. Current-state docs must never route into it. */
export const archiveRoot = 'docs/archive/'

function isRelativeRepositoryPath(target: string): boolean {
  return target.length > 0 && !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(target)
}

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

/** Document links resolved against the linking document's own directory. */
export function extractDocLinks(doc: DocFile): DocCitation[] {
  const from = path.dirname(doc.path)
  const links: DocCitation[] = []
  for (const match of doc.markdown.matchAll(documentLinkPattern)) {
    const target = match[1].split('#')[0]
    if (!isRelativeRepositoryPath(target)) continue
    links.push({ doc: doc.path, target: path.normalize(path.join(from, target)), kind: 'file' })
  }
  return links
}

/** Links that route current-state documentation back into frozen history. */
export function findArchiveLinks(links: readonly DocCitation[]): DocCitation[] {
  return links.filter(link => link.target.startsWith(archiveRoot))
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

function createTargetResolver(root: string): (target: string) => TargetKind {
  const cache = new Map<string, TargetKind>()
  return target => {
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
}

/** Fail when current-state documentation cites source paths that no longer exist. */
export function scanDocCitations(repoRoot: string): CitationViolation[] {
  const root = repoRoot.replace(/\\/g, '/').replace(/\/$/, '')
  const citations = collectCurrentStateDocs(root).flatMap(extractDocCitations)
  return findCitationViolations(citations, createTargetResolver(root))
}

/** Fail when current-state documentation links at a document that no longer exists. */
export function scanDocLinks(repoRoot: string): CitationViolation[] {
  const root = repoRoot.replace(/\\/g, '/').replace(/\/$/, '')
  const links = collectCurrentStateDocs(root).flatMap(extractDocLinks)
  return findCitationViolations(links, createTargetResolver(root))
}

/** Fail when current-state documentation routes an agent into the archive. */
export function scanArchiveLinks(repoRoot: string): DocCitation[] {
  const root = repoRoot.replace(/\\/g, '/').replace(/\/$/, '')
  return findArchiveLinks(collectCurrentStateDocs(root).flatMap(extractDocLinks))
}
