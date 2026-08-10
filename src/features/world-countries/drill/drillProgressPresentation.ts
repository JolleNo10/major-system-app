import type { Country, CountryId } from '@/features/world-countries/data/countries'
import {
  deriveCountryRecallProgress,
  deriveWorldCountriesCountryProgress,
  type RecallProgress,
} from '@/features/world-countries/learning/recallProgress'
import {
  getCountryProgressState,
  type WorldCountriesProgressPerspective,
} from '@/features/world-countries/learning/progressPresentation'
import {
  getDrillSkillLabel,
  getSkillsForDrillMode,
  type WorldCountriesDrillMode,
} from './drillModes'

const DRILL_PROGRESS_COLORS: Readonly<Record<string, string>> = {
  unpractised: '#52525b',
  weak: '#dc2626',
  developing: '#d97706',
  strong: '#2563eb',
  mastered: '#16a34a',
  complete: '#16a34a',
}

export function getDrillProgressPerspective(
  mode: WorldCountriesDrillMode,
): WorldCountriesProgressPerspective {
  const skills = getSkillsForDrillMode(mode)
  return mode === 'countries-capitals' ? 'core' : skills[0]
}

export function createDrillProgressColors(
  mode: WorldCountriesDrillMode,
  scopeCountries: readonly Country[],
  recallProgress: RecallProgress,
): Map<CountryId, string> {
  const skills = getSkillsForDrillMode(mode)
  const perspective = getDrillProgressPerspective(mode)
  return new Map(scopeCountries.map(country => {
    const progress = perspective === 'core'
      ? deriveWorldCountriesCountryProgress(country.id, recallProgress)
      : deriveCountryRecallProgress(country.id, skills, recallProgress)
    const state = getCountryProgressState(progress, perspective)
    return [country.id, DRILL_PROGRESS_COLORS[state] ?? DRILL_PROGRESS_COLORS.unpractised]
  }))
}

export function getDrillProgressLegend(mode: WorldCountriesDrillMode): string {
  const perspective = getDrillProgressPerspective(mode)
  return perspective === 'core'
    ? 'Core Country progress — Unpractised · Weak · Developing · Strong · Complete'
    : `${getDrillSkillLabel(perspective)} progress — Unpractised · Weak · Developing · Strong · Mastered`
}
