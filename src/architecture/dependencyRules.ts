import { readdirSync, readFileSync } from 'node:fs'
import { posix as path } from 'node:path'

export interface DependencySourceFile {
  path: string
  source: string
}

export interface DependencyViolation {
  source: string
  target: string
  kind: 'core-to-app' | 'core-to-feature' | 'feature-to-sibling'
  specifier: string
}

const importPatterns = [
  /\b(?:from|import)\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
]

/** Scan runtime TypeScript source for the repository's documented boundaries. */
export function scanSourceDependencies(sourceRoot: string): DependencyViolation[] {
  const files: DependencySourceFile[] = []

  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.normalize(path.join(directory.replace(/\\/g, '/'), entry.name))
      if (entry.isDirectory()) {
        visit(entryPath)
        continue
      }
      if (!/\.tsx?$/.test(entry.name) || /\.(?:test|spec)\.[^.]+$/.test(entry.name)) continue
      files.push({
        path: path.normalize(`src/${path.relative(sourceRoot.replace(/\\/g, '/'), entryPath)}`),
        source: readFileSync(entryPath, 'utf8'),
      })
    }
  }

  visit(sourceRoot)
  return findDependencyViolations(files)
}

export function findDependencyViolations(files: readonly DependencySourceFile[]): DependencyViolation[] {
  const violations: DependencyViolation[] = []
  for (const file of files) {
    const sourcePath = normalizeSourcePath(file.path)
    const sourceFeature = featureFromPath(sourcePath)

    for (const specifier of extractImportSpecifiers(file.source)) {
      const targetPath = resolveImportPath(sourcePath, specifier)
      const targetLayer = layerFromPath(targetPath)
      if (sourcePath.startsWith('src/core/') && targetLayer === 'app') {
        violations.push({ source: sourcePath, target: targetPath, kind: 'core-to-app', specifier })
      } else if (sourcePath.startsWith('src/core/') && targetLayer === 'feature') {
        violations.push({ source: sourcePath, target: targetPath, kind: 'core-to-feature', specifier })
      } else if (sourceFeature && targetLayer === 'feature') {
        const targetFeature = featureFromPath(targetPath)
        if (targetFeature && targetFeature !== sourceFeature && !isDocumentedFeatureAllowance(sourceFeature, targetFeature, specifier)) {
          violations.push({ source: sourcePath, target: targetPath, kind: 'feature-to-sibling', specifier })
        }
      }
    }
  }
  return violations
}

function extractImportSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  for (const pattern of importPatterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1])
  }
  return specifiers
}

function resolveImportPath(sourcePath: string, specifier: string): string {
  if (specifier.startsWith('@/')) return normalizeSourcePath(`src/${specifier.slice(2)}`)
  if (specifier.startsWith('.')) {
    const sourceDirectory = path.dirname(sourcePath)
    return normalizeSourcePath(path.join(sourceDirectory, specifier))
  }
  return specifier
}

function normalizeSourcePath(value: string): string {
  return path.normalize(value.replace(/\\/g, '/')).replace(/^\.\//, '')
}

function layerFromPath(value: string): 'app' | 'feature' | 'other' {
  if (value.startsWith('src/app/')) return 'app'
  if (value.startsWith('src/features/')) return 'feature'
  return 'other'
}

function featureFromPath(value: string): string | null {
  return value.match(/^src\/features\/([^/]+)(?:\/|$)/)?.[1] ?? null
}

function isDocumentedFeatureAllowance(sourceFeature: string, targetFeature: string, specifier: string): boolean {
  return sourceFeature === 'pi' && targetFeature === 'major-system' && specifier === '@/features/major-system'
}
