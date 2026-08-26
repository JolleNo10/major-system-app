import type { CountryId } from '@/features/world-countries/data/countries'
import type { WorldCountriesCoreRecallSkill } from '@/features/world-countries/learning/recallTargets'
import type { WorldCountriesTodayReviewCandidate } from './todayPlan'

interface RankedCandidate {
  candidate: WorldCountriesTodayReviewCandidate
  rank: number
}

function priorityTier(candidate: WorldCountriesTodayReviewCandidate): number {
  return candidate.schedule.priorityTier ?? Number.MAX_SAFE_INTEGER
}

function selectFromTier(
  candidates: readonly RankedCandidate[],
  limit: number,
): WorldCountriesTodayReviewCandidate[] {
  const remaining = [...candidates]
  const selected: WorldCountriesTodayReviewCandidate[] = []
  const representedCountries = new Set<CountryId>()
  let previousSkill: WorldCountriesCoreRecallSkill | undefined
  let previousSubregion: WorldCountriesTodayReviewCandidate['country']['subregionId'] | undefined

  while (remaining.length > 0 && selected.length < limit) {
    let unseenCountryCandidates = remaining.filter(({ candidate }) => (
      !representedCountries.has(candidate.country.id)
    ))
    if (unseenCountryCandidates.length === 0) {
      representedCountries.clear()
      unseenCountryCandidates = remaining
    }

    const skillAlternatives = previousSkill === undefined
      ? unseenCountryCandidates
      : unseenCountryCandidates.filter(({ candidate }) => candidate.target.skill !== previousSkill)
    const skillCandidates = skillAlternatives.length > 0 ? skillAlternatives : unseenCountryCandidates
    const subregionAlternatives = previousSubregion === undefined
      ? skillCandidates
      : skillCandidates.filter(({ candidate }) => candidate.country.subregionId !== previousSubregion)
    const bestPool = subregionAlternatives.length > 0 ? subregionAlternatives : skillCandidates
    const best = bestPool.reduce((current, entry) => entry.rank < current.rank ? entry : current)

    selected.push(best.candidate)
    previousSkill = best.candidate.target.skill
    previousSubregion = best.candidate.country.subregionId
    representedCountries.add(best.candidate.country.id)
    remaining.splice(remaining.indexOf(best), 1)
  }

  return selected
}

/**
 * Interleave a bounded review block without allowing variety to cross urgency
 * tiers. The input order supplies the stable rank used for every tie-break.
 */
export function interleaveWorldCountriesTodayReviewCandidates(
  candidates: readonly WorldCountriesTodayReviewCandidate[],
  limit = 12,
): WorldCountriesTodayReviewCandidate[] {
  if (limit <= 0 || candidates.length === 0) return []

  const ranked = candidates.map((candidate, rank) => ({ candidate, rank }))
  const tiers = [...new Set(ranked.map(entry => priorityTier(entry.candidate)))].sort((left, right) => left - right)
  const selected: WorldCountriesTodayReviewCandidate[] = []

  for (const tier of tiers) {
    const tierCandidates = ranked.filter(entry => priorityTier(entry.candidate) === tier)
    const remainingSlots = limit - selected.length
    selected.push(...selectFromTier(tierCandidates, remainingSlots))
    if (selected.length >= limit) break
  }

  return selected
}
