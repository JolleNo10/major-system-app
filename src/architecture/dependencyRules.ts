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

export interface RuntimeWorldCountriesImportViolation {
  source: string
  target: string
  specifier: string
}

interface ImportReference {
  specifier: string
  typeOnly: boolean
}

const importDeclarationPattern = /\bimport\s+(type\s+)?([\s\S]*?)\sfrom\s*['"]([^'"]+)['"]/g
const sideEffectImportPattern = /\bimport\s*['"]([^'"]+)['"]/g
const dynamicImportPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g

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

/** Find World Countries imports that would create a runtime dependency from a source file. */
export function findRuntimeWorldCountriesImports(
  sourcePath: string,
  source: string,
): RuntimeWorldCountriesImportViolation[] {
  const normalizedSourcePath = normalizeSourcePath(sourcePath)
  return extractImportReferences(source)
    .map(reference => ({
      ...reference,
      target: resolveImportPath(normalizedSourcePath, reference.specifier),
    }))
    .filter(({ target, typeOnly }) =>
      target.startsWith('src/features/world-countries/') ||
      (target === 'src/features/world-countries' && !typeOnly),
    )
    .filter(({ target, typeOnly }) => !(typeOnly && target === 'src/features/world-countries'))
    .map(({ specifier, target }) => ({
      source: normalizedSourcePath,
      target,
      specifier,
    }))
}

function extractImportSpecifiers(source: string): string[] {
  return extractImportReferences(source).map(reference => reference.specifier)
}

function extractImportReferences(source: string): ImportReference[] {
  const references: ImportReference[] = []
  for (const match of source.matchAll(importDeclarationPattern)) {
    references.push({
      specifier: match[3],
      typeOnly: Boolean(match[1]) || isTypeOnlyImportClause(match[2]),
    })
  }
  for (const match of source.matchAll(sideEffectImportPattern)) {
    references.push({ specifier: match[1], typeOnly: false })
  }
  for (const match of source.matchAll(dynamicImportPattern)) {
    references.push({ specifier: match[1], typeOnly: false })
  }
  return references
}

function isTypeOnlyImportClause(clause: string): boolean {
  const trimmedClause = clause.trim()
  if (!trimmedClause.startsWith('{') || !trimmedClause.endsWith('}')) return false
  const specifiers = trimmedClause.slice(1, -1).split(',').map(specifier => specifier.trim())
  return specifiers.length > 0 && specifiers.every(specifier => specifier.startsWith('type '))
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
