import { countries, type CountryId } from '@/features/world-countries/data/countries'
import { parseViewBox } from './viewBoxFit'

export interface MapSyntheticDotDefinition {
  mapId: string
  countryId: CountryId
  sourceSvgId: string
  /** Deterministic fingerprint of the source path's authored `d` attribute. */
  sourceFingerprint: string
  /** Authored point in the source path/map coordinate system. */
  point: Readonly<{ x: number; y: number }>
}

export interface SyntheticDotValidationSource {
  mapId: string
  viewBox: string
  paths: ReadonlyMap<string, string>
}

/**
 * Keep the fingerprint small enough for map metadata while still detecting
 * accidental source-path replacement. This is deliberately deterministic in
 * both the browser and the test environment; it is not a security hash.
 */
export function getSyntheticDotSourceFingerprint(pathData: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < pathData.length; index += 1) {
    hash ^= pathData.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

/**
 * Map-owned task-presentation decisions. Samoa uses the visible wrapped copy
 * of its source island group in the Oceania asset; the point remains authored
 * in that asset's source coordinate system rather than being derived from a
 * runtime bounding box.
 */
export const MAP_SYNTHETIC_DOTS: readonly MapSyntheticDotDefinition[] = [
  {
    mapId: 'oceania',
    countryId: 'WS',
    sourceSvgId: 'Samoa',
    sourceFingerprint: 'fnv1a32:3196800d',
    point: { x: 915.82, y: 327.45 },
  },
  {
    mapId: 'oceania',
    countryId: 'SB',
    sourceSvgId: 'Solomon_Islands',
    sourceFingerprint: 'fnv1a32:a73fcf3d',
    point: { x: 847.45, y: 322.37 },
  },
  {
    mapId: 'oceania',
    countryId: 'VU',
    sourceSvgId: 'Vanuatu',
    sourceFingerprint: 'fnv1a32:c12fcab2',
    point: { x: 869.0, y: 337.4 },
  },
]

export function getMapSyntheticDots(
  mapId: string,
  countryIds: Iterable<CountryId>,
): readonly MapSyntheticDotDefinition[] {
  const ids = new Set(countryIds)
  return MAP_SYNTHETIC_DOTS.filter(dot => dot.mapId === mapId && ids.has(dot.countryId))
}

/** Validate authored synthetic points against the current bundled source. */
export function validateMapSyntheticDots(
  definitions: readonly MapSyntheticDotDefinition[],
  sources: readonly SyntheticDotValidationSource[],
): void {
  const sourceByMap = new Map(sources.map(source => [source.mapId, source]))
  const seen = new Set<string>()

  for (const definition of definitions) {
    if (!definition.mapId.trim() || !definition.countryId.trim() || !definition.sourceSvgId.trim()) {
      throw new Error('Synthetic-dot records require map, Country, and source SVG identity')
    }
    if (!definition.sourceFingerprint.trim()) {
      throw new Error(`Missing source fingerprint for ${definition.mapId}:${definition.countryId}`)
    }
    const key = `${definition.mapId}:${definition.countryId}`
    if (seen.has(key)) throw new Error(`Duplicate synthetic dot for ${key}`)
    seen.add(key)
    if (!countries.some(country => country.id === definition.countryId)) {
      throw new Error(`Unknown Country ID ${definition.countryId} for ${key}`)
    }

    const source = sourceByMap.get(definition.mapId)
    if (!source) throw new Error(`Unknown synthetic-dot map ${definition.mapId}`)
    const viewBox = parseViewBox(source.viewBox)
    if (!viewBox) throw new Error(`Invalid viewBox for synthetic-dot map ${definition.mapId}`)
    const pathData = source.paths.get(definition.sourceSvgId)
    if (pathData === undefined) {
      throw new Error(`Unknown source SVG path ${definition.sourceSvgId} for ${key}`)
    }
    if (getSyntheticDotSourceFingerprint(pathData) !== definition.sourceFingerprint) {
      throw new Error(`Stale synthetic dot source for ${key}`)
    }

    const { x, y } = definition.point
    if (!Number.isFinite(x) || !Number.isFinite(y)
      || x < viewBox.x || y < viewBox.y
      || x > viewBox.x + viewBox.width || y > viewBox.y + viewBox.height) {
      throw new Error(`Synthetic dot ${key} is outside its map viewBox`)
    }
  }
}
