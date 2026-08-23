import rawGlobeGeography from './assets/world-countries-globe.geojson?raw'
import { countries, type CountryId } from '@/features/world-countries/data/countries'
import type { Feature, Geometry } from 'geojson'

export interface GlobeFeatureProperties {
  countryId: CountryId
  sourceName: string
  sourceIdentity: string
}

export type GlobeFeature = Feature<Geometry, GlobeFeatureProperties> & {
  id: CountryId
  properties: GlobeFeatureProperties
  geometry: Exclude<Geometry, { type: 'GeometryCollection' }>
}

export interface GlobeFeatureCollection {
  type: 'FeatureCollection'
  name?: string
  features: readonly GlobeFeature[]
}

/** Source-identity exceptions preserved in the compiled artifact. */
export const GLOBE_SOURCE_ID_EXCEPTIONS: Readonly<Record<CountryId, string>> = Object.freeze({
  PS: 'PSX',
  TW: 'TWN',
  XK: 'KOS',
})

let cachedGeography: GlobeFeatureCollection | null = null

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Reflect.ownKeys(value as object).forEach(key => {
      const child = (value as Record<PropertyKey, unknown>)[key]
      if (child && typeof child === 'object') deepFreeze(child)
    })
    Object.freeze(value)
  }
  return value
}

function isCountryFeature(value: unknown): value is GlobeFeature {
  if (!value || typeof value !== 'object') return false
  const feature = value as Partial<GlobeFeature>
  const properties = feature.properties
  const geometry = feature.geometry
  if (feature.type !== 'Feature' || typeof feature.id !== 'string' || !geometry) return false
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return false
  return Boolean(properties)
    && typeof properties?.countryId === 'string'
    && typeof properties?.sourceName === 'string'
    && typeof properties?.sourceIdentity === 'string'
}

/** Validate a prepared runtime artifact against the active canonical Country set. */
export function createValidatedGlobeGeography(
  value: unknown,
  requiredCountryIds: readonly CountryId[] = countries.map(country => country.id),
): GlobeFeatureCollection {
  if (!value || typeof value !== 'object') throw new Error('Globe geography must be an object')
  const collection = value as Partial<GlobeFeatureCollection>
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    throw new Error('Globe geography must be a FeatureCollection')
  }

  const features = collection.features.map(feature => {
    if (!isCountryFeature(feature)) throw new Error('Globe geography contains an invalid Country feature')
    return feature
  })
  const byCountryId = new Map<CountryId, GlobeFeature>()
  for (const feature of features) {
    if (byCountryId.has(feature.properties.countryId)) {
      throw new Error(`Globe geography contains duplicate Country ${feature.properties.countryId}`)
    }
    if (feature.id !== feature.properties.countryId) {
      throw new Error(`Globe feature ${feature.id} has a mismatched canonical Country ID`)
    }
    byCountryId.set(feature.properties.countryId, feature)
  }

  const requiredIds = new Set(requiredCountryIds)
  if (requiredIds.size !== requiredCountryIds.length) {
    throw new Error('Globe geography required Country IDs must be unique')
  }
  const unknown = [...byCountryId.keys()].filter(id => !requiredIds.has(id))
  if (unknown.length) throw new Error(`Globe geography contains unknown Countries: ${unknown.join(', ')}`)
  const missing = requiredCountryIds.filter(id => !byCountryId.has(id))
  if (missing.length) throw new Error(`Globe geography is missing Countries: ${missing.join(', ')}`)

  return deepFreeze({
    type: 'FeatureCollection',
    features: [...features],
  })
}

/** Parse and cache the immutable bundled artifact once per module lifecycle. */
export function getGlobeGeography(): GlobeFeatureCollection {
  if (cachedGeography) return cachedGeography
  cachedGeography = createValidatedGlobeGeography(JSON.parse(rawGlobeGeography))
  return cachedGeography
}

export function getGlobeFeature(
  countryId: CountryId,
  hiddenCountryIds: ReadonlySet<CountryId> | readonly CountryId[] = [],
): GlobeFeature | undefined {
  if (hiddenCountryIds && typeof hiddenCountryIds === 'object' && 'has' in hiddenCountryIds) {
    if ((hiddenCountryIds as ReadonlySet<CountryId>).has(countryId)) return undefined
  } else if ((hiddenCountryIds as readonly CountryId[]).includes(countryId)) return undefined
  return getGlobeGeography().features.find(feature => feature.properties.countryId === countryId)
}

export function getGlobeFeatures(countryIds: readonly CountryId[]): GlobeFeature[] {
  const requested = new Set(countryIds)
  return getGlobeGeography().features.filter(feature => requested.has(feature.properties.countryId))
}
