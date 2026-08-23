import type { Country } from '@/features/world-countries/data/countries'

export const CAPITAL_AUTHORING_SCHEMA_VERSION = 1 as const

export type CapitalAuthoringPlacementStatus = 'placed' | 'unresolved'
export type CapitalAuthoringGeometry = 'normal' | 'single-dot' | 'multi-dot'
export type CapitalAuthoringDetectionProblem = 'missing-geometry' | 'unmeasurable-geometry'
export type CapitalAuthoringDecision =
  | 'manual-point'
  | 'confirmed-suggested-dot'
  | 'selected-from-multiple'
  | 'manual-override'
  | 'marked-unresolved'

export interface CapitalAuthoringPoint {
  x: number
  y: number
}

export interface CapitalAuthoringCandidate extends CapitalAuthoringPoint {
  id: string
  sourceElementId?: string
}

export interface CapitalAuthoringDetection {
  geometry: CapitalAuthoringGeometry
  candidates: readonly CapitalAuthoringCandidate[]
  mappedSvgIds: readonly string[]
  problem?: CapitalAuthoringDetectionProblem
}

export interface CapitalAuthoringDecisionInfo {
  geometry: CapitalAuthoringGeometry
  decision: CapitalAuthoringDecision
  detectedGeometry?: CapitalAuthoringGeometry
  detectedSvgIds?: readonly string[]
  detectionProblem?: CapitalAuthoringDetectionProblem
  candidates?: readonly CapitalAuthoringCandidate[]
  selectedCandidateId?: string
}

export interface CapitalAuthoringPlacement {
  countryId: string
  country: string
  capital: string
  status: CapitalAuthoringPlacementStatus
  anchor?: CapitalAuthoringPoint
  authoring: CapitalAuthoringDecisionInfo
}

export interface CapitalAuthoringMapMetadata {
  id: string
  sourceAsset: string
  sourceAssetSha: string
  viewBox: string
}

export interface CapitalAuthoringDocument {
  schemaVersion: typeof CAPITAL_AUTHORING_SCHEMA_VERSION
  map: CapitalAuthoringMapMetadata
  placements: Readonly<Record<string, CapitalAuthoringPlacement>>
}

export interface CapitalAuthoringCombinedExport {
  schemaVersion: typeof CAPITAL_AUTHORING_SCHEMA_VERSION
  maps: Readonly<Record<string, CapitalAuthoringDocument>>
}

export type CapitalAuthoringReviewFilter = 'all' | 'remaining' | 'unresolved' | 'dots'

export interface CapitalAuthoringCounts {
  total: number
  reviewed: number
  remaining: number
  manualPoints: number
  confirmedSingleDots: number
  selectedMultiDots: number
  unresolved: number
}

export interface CapitalAuthoringValidationContext {
  map: CapitalAuthoringMapMetadata
  countries: readonly Country[]
}

export interface CapitalAuthoringValidationResult {
  document: CapitalAuthoringDocument | null
  errors: readonly string[]
  warnings: readonly string[]
}
