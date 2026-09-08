import type { CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'

/** The workflow-neutral camera semantics exposed by the World Countries maps. */
export type WorldCountriesMapCameraIntent =
  | { kind: 'default' }
  | { kind: 'subregion-learning'; subregionId: SubregionId }
  | { kind: 'fit-countries'; countryIds: readonly CountryId[] }
  | { kind: 'target-neighbourhood'; targetCountryId: CountryId; contextCountryIds?: readonly CountryId[] }

export const DEFAULT_WORLD_COUNTRIES_MAP_CAMERA_INTENT: WorldCountriesMapCameraIntent = Object.freeze({ kind: 'default' })

export function getWorldCountriesMapCameraIntentSignature(intent: WorldCountriesMapCameraIntent): string {
  switch (intent.kind) {
    case 'default':
      return 'default'
    case 'subregion-learning':
      return `subregion-learning:${intent.subregionId}`
    case 'fit-countries':
      return `fit-countries:${intent.countryIds.join('\u001f')}`
    case 'target-neighbourhood':
      return `target-neighbourhood:${intent.targetCountryId}:${(intent.contextCountryIds ?? []).join('\u001f')}`
  }
}
