import type { Country } from '@/features/world-countries/data/countries'
import type {
  CapitalAuthoringCandidate,
  CapitalAuthoringCounts,
  CapitalAuthoringDetection,
  CapitalAuthoringDocument,
  CapitalAuthoringPlacement,
  CapitalAuthoringPoint,
} from './capitalAuthoringTypes'

function copyCandidates(candidates: readonly CapitalAuthoringCandidate[]): CapitalAuthoringCandidate[] {
  return candidates.map(candidate => ({ ...candidate }))
}

export function createEmptyCapitalAuthoringDocument(
  map: CapitalAuthoringDocument['map'],
): CapitalAuthoringDocument {
  return {
    schemaVersion: 1,
    map: { ...map },
    placements: {},
  }
}

export function createManualPointPlacement(
  country: Country,
  point: CapitalAuthoringPoint,
  detection: CapitalAuthoringDetection,
  previous?: CapitalAuthoringPlacement,
): CapitalAuthoringPlacement {
  const isOverride = detection.geometry !== 'normal'
    || previous?.authoring.decision === 'confirmed-suggested-dot'
    || previous?.authoring.decision === 'selected-from-multiple'

  return {
    countryId: country.id,
    country: country.country,
    capital: country.capital,
    status: 'placed',
    anchor: { ...point },
    authoring: {
      geometry: isOverride ? 'normal' : detection.geometry,
      decision: isOverride ? 'manual-override' : 'manual-point',
      ...(isOverride ? { detectedGeometry: detection.geometry } : {}),
      ...(isOverride && detection.mappedSvgIds.length ? { detectedSvgIds: [...detection.mappedSvgIds] } : {}),
      ...(isOverride && detection.problem ? { detectionProblem: detection.problem } : {}),
      ...(detection.candidates.length ? { candidates: copyCandidates(detection.candidates) } : {}),
    },
  }
}

export function createCandidatePlacement(
  country: Country,
  detection: CapitalAuthoringDetection,
  candidate: CapitalAuthoringCandidate,
): CapitalAuthoringPlacement {
  const decision = detection.geometry === 'multi-dot'
    ? 'selected-from-multiple'
    : 'confirmed-suggested-dot'

  return {
    countryId: country.id,
    country: country.country,
    capital: country.capital,
    status: 'placed',
    anchor: { x: candidate.x, y: candidate.y },
    authoring: {
      geometry: detection.geometry,
      decision,
      ...(detection.mappedSvgIds.length ? { detectedSvgIds: [...detection.mappedSvgIds] } : {}),
      ...(detection.problem ? { detectionProblem: detection.problem } : {}),
      candidates: copyCandidates(detection.candidates),
      selectedCandidateId: candidate.id,
    },
  }
}

export function createUnresolvedPlacement(
  country: Country,
  detection: CapitalAuthoringDetection,
): CapitalAuthoringPlacement {
  return {
    countryId: country.id,
    country: country.country,
    capital: country.capital,
    status: 'unresolved',
    authoring: {
      geometry: detection.geometry,
      decision: 'marked-unresolved',
      detectedGeometry: detection.geometry,
      ...(detection.mappedSvgIds.length ? { detectedSvgIds: [...detection.mappedSvgIds] } : {}),
      ...(detection.problem ? { detectionProblem: detection.problem } : {}),
      ...(detection.candidates.length ? { candidates: copyCandidates(detection.candidates) } : {}),
    },
  }
}

export function getCapitalAuthoringCounts(
  countries: readonly Country[],
  placements: Readonly<Record<string, CapitalAuthoringPlacement>>,
): CapitalAuthoringCounts {
  let manualPoints = 0
  let confirmedSingleDots = 0
  let selectedMultiDots = 0
  let unresolved = 0

  for (const placement of Object.values(placements)) {
    if (placement.status === 'unresolved') {
      unresolved += 1
      continue
    }
    if (placement.authoring.decision === 'confirmed-suggested-dot') confirmedSingleDots += 1
    else if (placement.authoring.decision === 'selected-from-multiple') selectedMultiDots += 1
    else manualPoints += 1
  }

  const reviewed = Object.keys(placements).length
  return {
    total: countries.length,
    reviewed,
    remaining: Math.max(0, countries.length - reviewed),
    manualPoints,
    confirmedSingleDots,
    selectedMultiDots,
    unresolved,
  }
}

export function matchesCapitalAuthoringFilter(
  country: Country,
  filter: 'all' | 'remaining' | 'unresolved' | 'dots',
  placements: Readonly<Record<string, CapitalAuthoringPlacement>>,
): boolean {
  const placement = placements[country.id]
  if (filter === 'all') return true
  if (filter === 'remaining') return placement === undefined
  if (filter === 'unresolved') return placement?.status === 'unresolved'
  return placement?.authoring.geometry === 'single-dot'
    || placement?.authoring.geometry === 'multi-dot'
    || placement?.authoring.detectedGeometry === 'single-dot'
    || placement?.authoring.detectedGeometry === 'multi-dot'
}

export function updateCapitalAuthoringPlacement(
  document: CapitalAuthoringDocument,
  placement: CapitalAuthoringPlacement,
): CapitalAuthoringDocument {
  return {
    ...document,
    placements: {
      ...document.placements,
      [placement.countryId]: placement,
    },
  }
}

export function removeCapitalAuthoringPlacement(
  document: CapitalAuthoringDocument,
  countryId: string,
): CapitalAuthoringDocument {
  const placements = { ...document.placements }
  delete placements[countryId]
  return { ...document, placements }
}
