import {
  getAllContinentMetadata,
  replaceAllContinentMetadata,
} from './continentMetadataStore'
import {
  getAllSubregionMetadata,
  replaceAllSubregionMetadata,
} from './subregionMetadataStore'
import { notifyWorldCountriesGeographyChanged } from './geographyRefresh'
import {
  normalizeWorldMetadata,
  type WorldMetadata,
} from './worldMetadata'
import { getWorldMetadata, replaceWorldMetadata } from './worldMetadataStore'
import {
  normalizeContinentMetadata,
  type ContinentMetadata,
} from './continentMetadata'
import {
  normalizeSubregionMetadata,
  type SubregionMetadata,
} from './subregionMetadata'

export interface WorldCountriesOrderBackup {
  subregions: SubregionMetadata[]
  continents: ContinentMetadata[]
  world: WorldMetadata | null
}

interface GeographyV3Envelope extends WorldCountriesOrderBackup {
  version: 3
  feature: 'world-countries'
  mnemonics: unknown[]
}

/** Export only the raw saved World Countries ordering metadata. */
export function exportWorldCountriesOrder(): Blob {
  const payload: GeographyV3Envelope = {
    version: 3,
    feature: 'world-countries',
    mnemonics: [],
    subregions: getAllSubregionMetadata(),
    continents: getAllContinentMetadata(),
    world: getWorldMetadata(),
  }
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

/** Parse and validate a complete v3 Geography envelope for order restoration. */
export function parseWorldCountriesOrder(json: string): WorldCountriesOrderBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(json.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error('Invalid World Countries order backup JSON')
  }

  if (!isRecord(parsed)
    || parsed.version !== 3
    || parsed.feature !== 'world-countries'
    || !Array.isArray(parsed.mnemonics)
    || !Array.isArray(parsed.subregions)
    || !Array.isArray(parsed.continents)
    || !Object.prototype.hasOwnProperty.call(parsed, 'world')) {
    throw new Error('Unsupported World Countries order backup')
  }

  const subregions = normalizeOwnerRows(parsed.subregions, normalizeSubregionMetadata, row => row.subregionId, 'Subregion')
  const continents = normalizeOwnerRows(parsed.continents, normalizeContinentMetadata, row => row.continentId, 'Continent')
  const world = parsed.world === null ? null : normalizeWorldMetadata(parsed.world)

  return { subregions, continents, world }
}

/** Replace all saved order metadata after it has been parsed and confirmed. */
export function restoreWorldCountriesOrder(payload: WorldCountriesOrderBackup): void {
  const normalized = normalizeOrderPayload(payload)
  replaceWorldMetadata(normalized.world)
  replaceAllContinentMetadata(normalized.continents)
  replaceAllSubregionMetadata(normalized.subregions)
  notifyWorldCountriesGeographyChanged()
}

function normalizeOrderPayload(payload: WorldCountriesOrderBackup): WorldCountriesOrderBackup {
  if (!isRecord(payload)
    || !Array.isArray(payload.subregions)
    || !Array.isArray(payload.continents)
    || (payload.world !== null && !isRecord(payload.world))) {
    throw new Error('Invalid World Countries order payload')
  }
  const subregions = normalizeOwnerRows(payload.subregions, normalizeSubregionMetadata, row => row.subregionId, 'Subregion')
  const continents = normalizeOwnerRows(payload.continents, normalizeContinentMetadata, row => row.continentId, 'Continent')
  return {
    subregions,
    continents,
    world: payload.world === null ? null : normalizeWorldMetadata(payload.world),
  }
}

function normalizeOwnerRows<T>(
  rows: readonly unknown[],
  normalize: (value: unknown) => T,
  getId: (row: T) => string,
  label: string,
): T[] {
  const normalizedRows = rows.map(row => normalize(row))
  if (new Set(normalizedRows.map(getId)).size !== normalizedRows.length) {
    throw new Error(`Duplicate ${label} metadata`)
  }
  return normalizedRows
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
