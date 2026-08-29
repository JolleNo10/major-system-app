import type { WorldCountriesRecallSkill } from './recallTargets'

export function getRecallSkillLabel(skill: WorldCountriesRecallSkill): string {
  if (skill === 'location-to-country') return 'Location → Country'
  if (skill === 'shape-to-country') return 'Shape → Country'
  if (skill === 'country-to-capital') return 'Country → Capital'
  return 'Capital → Country'
}
