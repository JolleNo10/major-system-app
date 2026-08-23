import type { Country } from '@/features/world-countries/data/countries'
import {
  getMapSyntheticDots,
  validateMapSyntheticDots,
} from '@/features/world-countries/maps/syntheticDots'
import {
  detectCapitalDotCandidates,
} from './capitalDotDetection'
import type { CapitalAuthoringRepresentation } from './capitalAuthoringTypes'

export interface CapitalAuthoringGeometryAuditInput {
  mapId: string
  markup: string
  countries: readonly Country[]
}

export interface CapitalAuthoringGeometryAuditEntry {
  mapId: string
  countryId: string
  country: string
  classification: CapitalAuthoringRepresentation | 'unclassified'
  nativeDrawableComponentCount: number
  nativeDotCandidateCount: number
  syntheticDotCandidateCount: number
  manualFallbackRequired: boolean
  warnings: readonly string[]
}

export interface CapitalAuthoringGeometryAuditReport {
  mapId: string
  entries: readonly CapitalAuthoringGeometryAuditEntry[]
  warnings: readonly string[]
  errors: readonly string[]
}

export interface CapitalAuthoringGlobalGeometryAuditReport {
  maps: readonly CapitalAuthoringGeometryAuditReport[]
  warnings: readonly string[]
  errors: readonly string[]
}

function parseMarkup(markup: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const root = parsed.documentElement
  if (root.localName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) {
    throw new Error('SVG map source does not contain a valid SVG root')
  }
  return root as unknown as SVGSVGElement
}

function syntheticMetadataWarnings(
  mapId: string,
  country: Country,
  root: SVGSVGElement,
): string[] {
  const definitions = getMapSyntheticDots(mapId, [country.id])
  if (!definitions.length) return []
  const source = {
    mapId,
    viewBox: root.getAttribute('viewBox') ?? '',
    paths: new Map([...root.querySelectorAll<SVGPathElement>('path[id]')]
      .map(path => [path.id, path.getAttribute('d') ?? ''] as const)),
  }
  try {
    validateMapSyntheticDots(definitions, [source])
    return []
  } catch (reason) {
    return [`Synthetic metadata invalid: ${reason instanceof Error ? reason.message : 'validation failed.'}`]
  }
}

function entryForCountry(
  mapId: string,
  country: Country,
  root: SVGSVGElement,
): CapitalAuthoringGeometryAuditEntry {
  const detection = detectCapitalDotCandidates(root, country, mapId)
  const warnings = syntheticMetadataWarnings(mapId, country, root)
  if (!detection.classification) warnings.push('Detector returned no classification.')
  if (detection.classification === 'mixed-or-ambiguous') warnings.push('Mixed compact and ordinary geometry requires manual review.')
  if (detection.classification === 'missing-or-unresolved' && !detection.candidates.length) warnings.push('No usable native or curated synthetic candidate is available.')
  if (detection.problem === 'missing-geometry' && detection.candidates.length) warnings.push('Native SVG geometry is missing; using curated synthetic metadata.')
  return {
    mapId,
    countryId: country.id,
    country: country.country,
    classification: detection.classification ?? 'unclassified',
    nativeDrawableComponentCount: detection.nativeDrawableComponentCount ?? 0,
    nativeDotCandidateCount: detection.nativeDotCandidateCount ?? 0,
    syntheticDotCandidateCount: detection.syntheticDotCandidateCount ?? 0,
    manualFallbackRequired: !detection.classification
      || detection.classification === 'mixed-or-ambiguous'
      || detection.classification === 'missing-or-unresolved',
    warnings,
  }
}

/** Audit every expected Country against one actual bundled SVG asset. */
export function auditCapitalAuthoringMapMarkup(
  input: CapitalAuthoringGeometryAuditInput,
): CapitalAuthoringGeometryAuditReport {
  const errors: string[] = []
  let root: SVGSVGElement
  try {
    root = parseMarkup(input.markup)
  } catch (reason) {
    return {
      mapId: input.mapId,
      entries: [],
      warnings: [],
      errors: [reason instanceof Error ? reason.message : 'SVG source could not be parsed.'],
    }
  }

  const entries = input.countries.map(country => entryForCountry(input.mapId, country, root))
  const seenCountryIds = new Set<string>()
  for (const entry of entries) {
    if (seenCountryIds.has(entry.countryId)) errors.push(`Country ${entry.countryId} appears more than once in the audit.`)
    seenCountryIds.add(entry.countryId)
    if (entry.classification === 'unclassified') errors.push(`Country ${entry.countryId} returned no geometry classification.`)
  }
  return {
    mapId: input.mapId,
    entries,
    warnings: entries.flatMap(entry => entry.warnings),
    errors,
  }
}

/** Run the same audit over every authoring map and retain per-map coverage. */
export function auditCapitalAuthoringMaps(
  inputs: readonly CapitalAuthoringGeometryAuditInput[],
): CapitalAuthoringGlobalGeometryAuditReport {
  const maps = inputs.map(auditCapitalAuthoringMapMarkup)
  return {
    maps,
    warnings: maps.flatMap(report => report.warnings),
    errors: maps.flatMap(report => report.errors),
  }
}

/** Compact output suitable for a developer test/CLI log after SVG updates. */
export function formatCapitalAuthoringGeometryAudit(
  report: CapitalAuthoringGeometryAuditReport,
): string {
  const lines = [report.mapId]
  for (const entry of report.entries) {
    lines.push(`  ${entry.country.padEnd(28)} ${entry.classification} native=${entry.nativeDrawableComponentCount}/${entry.nativeDotCandidateCount} synthetic=${entry.syntheticDotCandidateCount} manual=${entry.manualFallbackRequired ? 'yes' : 'no'}`)
    for (const warning of entry.warnings) lines.push(`    warning: ${warning}`)
  }
  for (const error of report.errors) lines.push(`error: ${error}`)
  return lines.join('\n')
}
