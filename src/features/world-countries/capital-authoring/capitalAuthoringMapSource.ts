import type { MemoMapDefinition } from '@/features/world-countries/maps/mapDefinitions'
import { parseSvgViewBox } from './capitalAuthoringCoordinates'
import type { CapitalAuthoringMapMetadata } from './capitalAuthoringTypes'

export interface CapitalAuthoringMapSource {
  markup: string
  metadata: CapitalAuthoringMapMetadata
}

function getSourceAssetName(url: string): string {
  const withoutQuery = url.split(/[?#]/, 1)[0]
  const basename = withoutQuery.split('/').pop() ?? url
  // Production Vite URLs may include an asset-content hash. Preserve the
  // checked-in SVG filename in the authoring artifact rather than the build
  // cache filename.
  return basename.replace(/-[a-z0-9_-]{8,}(?=\.svg$)/i, '')
}

function fallbackFingerprint(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export async function fingerprintSvgMarkup(markup: string): Promise<string> {
  try {
    const subtle = globalThis.crypto?.subtle
    if (subtle) {
      const bytes = new TextEncoder().encode(markup)
      const digest = await subtle.digest('SHA-256', bytes)
      const hash = [...new Uint8Array(digest)]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')
      return `sha256:${hash}`
    }
  } catch {
    // The deterministic fallback still detects changed bundled assets in
    // environments without Web Crypto (notably some test runners).
  }
  return fallbackFingerprint(markup)
}

export async function loadCapitalAuthoringMapSource(
  definition: MemoMapDefinition,
): Promise<CapitalAuthoringMapSource> {
  const response = await fetch(definition.svgUrl)
  if (!response.ok) throw new Error(`SVG map request failed with ${response.status}`)
  const markup = await response.text()
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const root = parsed.documentElement
  if (root.localName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) {
    throw new Error('SVG map source does not contain a valid SVG root')
  }
  const viewBox = root.getAttribute('viewBox')?.trim() ?? ''
  if (!parseSvgViewBox(viewBox)) throw new Error(`Map ${definition.id} has an invalid SVG viewBox`)

  return {
    markup,
    metadata: {
      id: definition.id,
      sourceAsset: getSourceAssetName(definition.svgUrl),
      sourceAssetSha: await fingerprintSvgMarkup(markup),
      viewBox,
    },
  }
}
