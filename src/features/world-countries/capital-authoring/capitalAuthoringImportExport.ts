import type { Country } from '@/features/world-countries/data/countries'
import { parseSvgViewBox, isPointInSvgViewBox } from './capitalAuthoringCoordinates'
import {
  CAPITAL_AUTHORING_SCHEMA_VERSION,
  type CapitalAuthoringCombinedExport,
  type CapitalAuthoringDocument,
  type CapitalAuthoringMapMetadata,
  type CapitalAuthoringPlacement,
  type CapitalAuthoringValidationContext,
  type CapitalAuthoringValidationResult,
} from './capitalAuthoringTypes'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFinitePoint(value: unknown): value is { x: number; y: number } {
  return isRecord(value)
    && typeof value.x === 'number'
    && typeof value.y === 'number'
    && Number.isFinite(value.x)
    && Number.isFinite(value.y)
}

function comparePoint(left: { x: number; y: number }, right: { x: number; y: number }): boolean {
  return left.x === right.x && left.y === right.y
}

function validateMetadata(value: unknown): value is CapitalAuthoringMapMetadata {
  return isRecord(value)
    && typeof value.id === 'string' && value.id.trim().length > 0
    && typeof value.sourceAsset === 'string' && value.sourceAsset.trim().length > 0
    && typeof value.sourceAssetSha === 'string' && value.sourceAssetSha.trim().length > 0
    && typeof value.viewBox === 'string' && value.viewBox.trim().length > 0
}

function placementErrors(
  placement: unknown,
  country: Country | undefined,
  viewBox: ReturnType<typeof parseSvgViewBox>,
): string[] {
  if (!isRecord(placement)) return ['Placement must be an object.']
  const errors: string[] = []
  if (typeof placement.countryId !== 'string' || !placement.countryId.trim()) errors.push('Placement is missing countryId.')
  if (!country) errors.push(`Placement references an unknown Country ID: ${String(placement.countryId)}.`)
  else {
    if (placement.country !== country.country) errors.push(`Country name does not match canonical data for ${country.id}.`)
    if (placement.capital !== country.capital) errors.push(`Capital name does not match canonical data for ${country.id}.`)
  }

  if (placement.status !== 'placed' && placement.status !== 'unresolved') errors.push(`Placement ${String(placement.countryId)} has an invalid status.`)
  if (!isRecord(placement.authoring)) {
    errors.push(`Placement ${String(placement.countryId)} is missing authoring provenance.`)
    return errors
  }
  const authoring = placement.authoring
  if (!['normal', 'single-dot', 'multi-dot'].includes(String(authoring.geometry))) errors.push(`Placement ${String(placement.countryId)} has an invalid geometry.`)
  if (!['manual-point', 'confirmed-suggested-dot', 'selected-from-multiple', 'manual-override', 'marked-unresolved'].includes(String(authoring.decision))) errors.push(`Placement ${String(placement.countryId)} has an invalid decision.`)
  if (authoring.detectedGeometry !== undefined && !['normal', 'single-dot', 'multi-dot'].includes(String(authoring.detectedGeometry))) errors.push(`Placement ${String(placement.countryId)} has an invalid detected geometry.`)
  if (authoring.detectionProblem !== undefined && !['missing-geometry', 'unmeasurable-geometry'].includes(String(authoring.detectionProblem))) errors.push(`Placement ${String(placement.countryId)} has an invalid detection problem.`)

  const candidates = authoring.candidates
  if (candidates !== undefined) {
    if (!Array.isArray(candidates)) errors.push(`Placement ${String(placement.countryId)} candidates must be an array.`)
    else {
      const ids = new Set<string>()
      for (const candidate of candidates) {
        if (!isRecord(candidate) || typeof candidate.id !== 'string' || !candidate.id.trim()) {
          errors.push(`Placement ${String(placement.countryId)} has an invalid candidate ID.`)
          continue
        }
        if (ids.has(candidate.id)) errors.push(`Placement ${String(placement.countryId)} repeats candidate ${candidate.id}.`)
        ids.add(candidate.id)
        if (!isFinitePoint(candidate)) errors.push(`Candidate ${candidate.id} for ${String(placement.countryId)} has invalid coordinates.`)
        else if (viewBox && !isPointInSvgViewBox(candidate, viewBox)) errors.push(`Candidate ${candidate.id} for ${String(placement.countryId)} is outside the SVG viewBox.`)
      }
      if (authoring.selectedCandidateId !== undefined && !ids.has(authoring.selectedCandidateId)) {
        errors.push(`Placement ${String(placement.countryId)} selects a candidate that is not present.`)
      }
      if (authoring.geometry === 'single-dot' && candidates.length !== 1) errors.push(`Single-dot placement ${String(placement.countryId)} must preserve exactly one candidate.`)
      if (authoring.geometry === 'multi-dot' && candidates.length < 2) errors.push(`Multi-dot placement ${String(placement.countryId)} must preserve multiple candidates.`)
      if (authoring.detectedGeometry === 'single-dot' && candidates.length !== 1) errors.push(`Detected single-dot placement ${String(placement.countryId)} must preserve exactly one candidate.`)
      if (authoring.detectedGeometry === 'multi-dot' && candidates.length < 2) errors.push(`Detected multi-dot placement ${String(placement.countryId)} must preserve multiple candidates.`)
    }
  } else if (authoring.selectedCandidateId !== undefined) {
    errors.push(`Placement ${String(placement.countryId)} selects a candidate without preserving candidates.`)
  }

  if ((authoring.geometry === 'single-dot' || authoring.geometry === 'multi-dot') && !Array.isArray(candidates)) {
    errors.push(`Dot placement ${String(placement.countryId)} must preserve its candidate set.`)
  }
  if ((authoring.detectedGeometry === 'single-dot' || authoring.detectedGeometry === 'multi-dot') && !Array.isArray(candidates)) {
    errors.push(`Detected dot placement ${String(placement.countryId)} must preserve its candidate set.`)
  }

  if (placement.status === 'placed') {
    if (!isFinitePoint(placement.anchor)) errors.push(`Placed Country ${String(placement.countryId)} must have a finite anchor.`)
    else if (viewBox && !isPointInSvgViewBox(placement.anchor, viewBox)) errors.push(`Anchor for ${String(placement.countryId)} is outside the SVG viewBox.`)
    if (authoring.decision === 'marked-unresolved') errors.push(`Placed Country ${String(placement.countryId)} cannot use the unresolved decision.`)
    if (authoring.decision === 'confirmed-suggested-dot' && authoring.geometry !== 'single-dot') errors.push(`Confirmed single-dot placement ${String(placement.countryId)} must use single-dot geometry.`)
    if (authoring.decision === 'selected-from-multiple' && authoring.geometry !== 'multi-dot') errors.push(`Selected multi-dot placement ${String(placement.countryId)} must use multi-dot geometry.`)
    if (authoring.decision === 'confirmed-suggested-dot' || authoring.decision === 'selected-from-multiple') {
      const selected = Array.isArray(candidates)
        ? candidates.find(candidate => candidate.id === authoring.selectedCandidateId)
        : undefined
      if (!selected || !isFinitePoint(placement.anchor) || !comparePoint(selected, placement.anchor)) {
        errors.push(`Placement ${String(placement.countryId)} must preserve the selected candidate as its anchor.`)
      }
    }
  } else if (placement.anchor !== undefined) {
    errors.push(`Unresolved Country ${String(placement.countryId)} cannot contain an authoritative anchor.`)
  } else if (authoring.decision !== 'marked-unresolved') {
    errors.push(`Unresolved Country ${String(placement.countryId)} must use the unresolved decision.`)
  }

  return errors
}

export function validateCapitalAuthoringDocument(
  value: unknown,
  context: CapitalAuthoringValidationContext,
): CapitalAuthoringValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isRecord(value)) return { document: null, errors: ['Authoring export must be a JSON object.'], warnings }
  if (value.schemaVersion !== CAPITAL_AUTHORING_SCHEMA_VERSION) errors.push(`Unsupported authoring schema version: ${String(value.schemaVersion)}.`)
  if (!validateMetadata(value.map)) errors.push('Authoring export is missing valid map metadata.')
  if (!isRecord(value.placements)) errors.push('Authoring export is missing placements.')
  if (errors.length) return { document: null, errors, warnings }

  const metadata = value.map
  const viewBox = parseSvgViewBox(metadata.viewBox)
  if (!viewBox) errors.push('Authoring export contains an invalid SVG viewBox.')
  if (metadata.id !== context.map.id) errors.push(`Authoring export is for map ${metadata.id}, not ${context.map.id}.`)
  if (metadata.sourceAsset !== context.map.sourceAsset) warnings.push(`SVG source asset differs: export uses ${metadata.sourceAsset}, current map uses ${context.map.sourceAsset}.`)
  if (metadata.sourceAssetSha !== context.map.sourceAssetSha) warnings.push('SVG source fingerprint differs; imported coordinates are not verified against the current asset.')
  if (metadata.viewBox !== context.map.viewBox) warnings.push(`SVG viewBox differs: export uses ${metadata.viewBox}, current map uses ${context.map.viewBox}.`)

  const countryById = new Map(context.countries.map(country => [country.id, country]))
  const placements: Record<string, CapitalAuthoringPlacement> = {}
  for (const [countryId, rawPlacement] of Object.entries(value.placements)) {
    const country = countryById.get(countryId)
    if (!isRecord(rawPlacement) || rawPlacement.countryId !== countryId) errors.push(`Placement key ${countryId} does not match its countryId.`)
    errors.push(...placementErrors(rawPlacement, country, viewBox))
    if (errors.length && !country) continue
    placements[countryId] = rawPlacement as CapitalAuthoringPlacement
  }

  if (errors.length) return { document: null, errors, warnings }
  return {
    document: {
      schemaVersion: CAPITAL_AUTHORING_SCHEMA_VERSION,
      map: { ...metadata },
      placements,
    },
    errors,
    warnings,
  }
}

export function parseCapitalAuthoringImport(
  json: string,
  context: CapitalAuthoringValidationContext,
): CapitalAuthoringValidationResult {
  try {
    const value: unknown = JSON.parse(json)
    if (isRecord(value) && value.schemaVersion === CAPITAL_AUTHORING_SCHEMA_VERSION && isRecord(value.maps)) {
      const selected = value.maps[context.map.id]
      if (selected === undefined) return { document: null, errors: [`Combined export does not contain map ${context.map.id}.`], warnings: [] }
      return validateCapitalAuthoringDocument(selected, context)
    }
    return validateCapitalAuthoringDocument(value, context)
  } catch {
    return { document: null, errors: ['The selected file is not valid JSON.'], warnings: [] }
  }
}

export function serializeCapitalAuthoringDocument(document: CapitalAuthoringDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`
}

export function serializeCapitalAuthoringCombinedExport(
  documents: readonly CapitalAuthoringDocument[],
): string {
  const combined: CapitalAuthoringCombinedExport = {
    schemaVersion: CAPITAL_AUTHORING_SCHEMA_VERSION,
    maps: Object.fromEntries(documents.map(document => [document.map.id, document])),
  }
  return `${JSON.stringify(combined, null, 2)}\n`
}

export function readCapitalAuthoringStorage(
  key: string,
  context: CapitalAuthoringValidationContext,
): CapitalAuthoringValidationResult {
  try {
    const value = globalThis.localStorage?.getItem(key)
    if (!value) return { document: null, errors: [], warnings: [] }
    return parseCapitalAuthoringImport(value, context)
  } catch {
    return { document: null, errors: ['Saved authoring data could not be read from local storage.'], warnings: [] }
  }
}

export function writeCapitalAuthoringStorage(key: string, document: CapitalAuthoringDocument): string | null {
  try {
    globalThis.localStorage?.setItem(key, serializeCapitalAuthoringDocument(document))
    return null
  } catch {
    return 'Authoring changes could not be saved to local storage.'
  }
}

export function getCapitalAuthoringStorageKey(mapId: string): string {
  return `world-countries-capital-authoring:v1:${mapId}`
}

export function clearCapitalAuthoringStorage(mapId: string): string | null {
  try {
    globalThis.localStorage?.removeItem(getCapitalAuthoringStorageKey(mapId))
    return null
  } catch {
    return 'Saved authoring data could not be cleared from local storage.'
  }
}
