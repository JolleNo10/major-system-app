import { countries, type CountryId } from '@/features/world-countries/data/countries'
import { parseViewBox } from './viewBoxFit'

export type MapLearningAnchorKind = 'single-dot' | 'multi-dot-representative'

export interface MapLearningAnchorDefinition {
  mapId: string
  countryId: CountryId
  sourceSvgId: string
  kind: MapLearningAnchorKind
  /** Exact source path data used to detect stale map decisions. */
  sourceFingerprint: string
  /** Required for an explicitly selected multi-dot representative. */
  point?: Readonly<{ x: number; y: number }>
}

export interface LearningAnchorValidationSource {
  mapId: string
  viewBox: string
  paths: ReadonlyMap<string, string>
}

/**
 * Map-owned learning decisions. These are deliberately keyed by stable
 * Country identity rather than display labels or SVG IDs. Compact, unambiguous
 * single-dot Countries are derived by the controller and do not need records.
 *
 * The Oceania Micronesia representative is the component nearest the source
 * asset's country-label anchor. The explicit point is the authoring decision;
 * runtime code must never replace it with the total path bounding-box center.
 */
export const MAP_LEARNING_ANCHORS: readonly MapLearningAnchorDefinition[] = [
  {
    mapId: 'oceania',
    countryId: 'FM',
    sourceSvgId: 'Micronesia',
    kind: 'multi-dot-representative',
    point: { x: 825.864, y: 268.92 },
    sourceFingerprint: 'M 791.769 263.199 m -2.15 0 a 2.15 2.15 0 1 0 4.3 0 a 2.15 2.15 0 1 0 -4.3 0 M 825.864 268.92 m -2.15 0 a 2.15 2.15 0 1 0 4.3 0 a 2.15 2.15 0 1 0 -4.3 0 M 841.667 270.385 m -2.15 0 a 2.15 2.15 0 1 0 4.3 0 a 2.15 2.15 0 1 0 -4.3 0 M 853.563 274.78 m -2.15 0 a 2.15 2.15 0 1 0 4.3 0 a 2.15 2.15 0 1 0 -4.3 0',
  },
]

export function getMapLearningAnchors(
  mapId: string,
  countryIds: Iterable<CountryId>,
): readonly MapLearningAnchorDefinition[] {
  const ids = new Set(countryIds)
  return MAP_LEARNING_ANCHORS.filter(anchor => anchor.mapId === mapId && ids.has(anchor.countryId))
}

/** Validate static decisions against the source metadata supplied by a map asset. */
export function validateMapLearningAnchors(
  definitions: readonly MapLearningAnchorDefinition[],
  sources: readonly LearningAnchorValidationSource[],
): void {
  const sourceByMap = new Map(sources.map(source => [source.mapId, source]))
  const seen = new Set<string>()

  for (const definition of definitions) {
    if (!definition.mapId.trim() || !definition.countryId.trim() || !definition.sourceSvgId.trim()) {
      throw new Error('Learning-anchor records require map, Country, and source SVG identity')
    }
    if (!definition.sourceFingerprint) throw new Error(`Missing source fingerprint for ${definition.mapId}:${definition.countryId}`)
    const key = `${definition.mapId}:${definition.countryId}`
    if (seen.has(key)) throw new Error(`Duplicate learning anchor for ${key}`)
    seen.add(key)
    if (!countries.some(country => country.id === definition.countryId)) {
      throw new Error(`Unknown Country ID ${definition.countryId} for ${key}`)
    }

    const source = sourceByMap.get(definition.mapId)
    if (!source) throw new Error(`Unknown learning-anchor map ${definition.mapId}`)
    const viewBox = parseViewBox(source.viewBox)
    if (!viewBox) throw new Error(`Invalid viewBox for learning-anchor map ${definition.mapId}`)
    const pathData = source.paths.get(definition.sourceSvgId)
    if (pathData === undefined) {
      throw new Error(`Unknown source SVG path ${definition.sourceSvgId} for ${key}`)
    }
    if (pathData !== definition.sourceFingerprint) {
      throw new Error(`Stale learning anchor source for ${key}`)
    }

    if (definition.kind === 'multi-dot-representative' && definition.point === undefined) {
      throw new Error(`Representative learning anchor ${key} has no point`)
    }
    if (definition.kind === 'single-dot' && definition.point !== undefined) {
      throw new Error(`Single-dot learning anchor ${key} must resolve from source geometry`)
    }
    if (definition.point) {
      const { x, y } = definition.point
      if (!Number.isFinite(x) || !Number.isFinite(y)
        || x < viewBox.x || y < viewBox.y
        || x > viewBox.x + viewBox.width || y > viewBox.y + viewBox.height) {
        throw new Error(`Learning anchor ${key} is outside its map viewBox`)
      }
    }
  }
}
