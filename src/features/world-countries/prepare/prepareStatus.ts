import type { WorldCountriesMemoReadiness } from '@/features/world-countries/learning/memoReadiness'

const PREPARE_STATUS_COPY = {
  NOT_MEMOED: {
    label: 'Not prepared',
    description: 'Countries preparation is incomplete.',
  },
  COUNTRIES_MEMOED: {
    label: 'Countries prepared',
    description: 'Countries are prepared; Capital preparation is incomplete.',
  },
  COUNTRIES_AND_CAPITALS_MEMOED: {
    label: 'Countries + Capitals prepared',
    description: 'Countries and Capitals are prepared.',
  },
} satisfies Record<WorldCountriesMemoReadiness, { label: string; description: string }>

export function getPrepareStatusLabel(readiness: WorldCountriesMemoReadiness): string {
  return PREPARE_STATUS_COPY[readiness].label
}

export function getPrepareStatusDescription(readiness: WorldCountriesMemoReadiness): string {
  return PREPARE_STATUS_COPY[readiness].description
}
