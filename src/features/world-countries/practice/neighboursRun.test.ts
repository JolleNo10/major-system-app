import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import {
  advanceNeighboursTarget,
  applyNeighboursGuess,
  createNeighboursQuizRun,
  createNeighboursQuizSession,
  createNeighboursRetryRun,
  deriveNeighboursTargetProgress,
  getCurrentNeighboursTarget,
  getEligibleNeighboursTargetCountries,
  isNeighboursTargetPerfect,
  revealNeighboursRemaining,
  summarizeNeighboursRun,
  revealNeighboursMap,
  showNeighboursNumber,
} from './neighboursRun'

function country(id: string) {
  const result = countries.find(candidate => candidate.id === id)
  if (!result) throw new Error(`Missing Country fixture: ${id}`)
  return result
}

describe('World Countries Neighbours Practice runs', () => {
  it('uses selected geography for targets while active population supplies answers', () => {
    const active = ['DE', 'AT', 'BE', 'CH', 'CZ', 'DK', 'FR', 'LU', 'NL', 'PL'].map(country)
    const scope = [country('IS'), country('DE')]
    expect(getEligibleNeighboursTargetCountries(scope, active).map(entry => entry.id)).toEqual(['DE'])

    const run = createNeighboursQuizRun({ scopeCountries: scope, activeCountries: active, questionCount: 'all', random: () => 0 })
    expect(run?.targetIds).toEqual(['DE'])
    expect(new Set(run?.questions[0]?.requiredNeighbourIds)).toEqual(new Set(['AT', 'BE', 'CH', 'CZ', 'DK', 'FR', 'LU', 'NL', 'PL']))
    expect(run?.countries).not.toBe(active)
    expect(run?.countries.find(entry => entry.id === 'PL')).toBeDefined()
  })

  it('snapshots unique randomized targets and preserves their required neighbours', () => {
    const scope = ['DE', 'FR', 'ES'].map(country)
    const run = createNeighboursQuizRun({ scopeCountries: scope, activeCountries: countries, questionCount: 10, random: () => 0 })
    expect(run?.targetIds).toHaveLength(3)
    expect(new Set(run?.targetIds).size).toBe(3)
    expect(run?.questions.map(question => question.requiredNeighbourIds.length)).toEqual(
      run?.targetIds.map(targetId => run?.questions.find(question => question.targetId === targetId)?.requiredNeighbourIds.length),
    )
  })

  it('keeps the same target for correct answers, ignores duplicates, and records incorrect guesses', () => {
    const run = createNeighboursQuizRun({ scopeCountries: [country('DE')], activeCountries: countries, questionCount: 'all' })!
    let session = createNeighboursQuizSession(run)
    const firstNeighbour = run.questions[0]!.requiredNeighbourIds[0]!
    let result = applyNeighboursGuess(session, { countryId: firstNeighbour, submittedAnswer: country(firstNeighbour).country })
    expect(result.outcome).toBe('found')
    session = result.state
    expect(session.targetIndex).toBe(0)
    result = applyNeighboursGuess(session, { countryId: firstNeighbour, submittedAnswer: country(firstNeighbour).country })
    expect(result.outcome).toBe('already-found')
    expect(result.state.targets[0]?.incorrectGuesses).toEqual([])
    result = applyNeighboursGuess(session, { countryId: 'US', submittedAnswer: 'United States' })
    expect(result.outcome).toBe('incorrect')
    expect(result.state.targets[0]?.foundNeighbourIds).toEqual([firstNeighbour])
    expect(result.state.targets[0]?.incorrectGuesses).toEqual(['United States'])
  })

  it('keeps hints score-neutral and moves to explicit review for Reveal remaining', () => {
    const run = createNeighboursQuizRun({ scopeCountries: [country('DE')], activeCountries: countries, questionCount: 'all' })!
    let session = createNeighboursQuizSession(run)
    session = showNeighboursNumber(session)
    session = revealNeighboursMap(session)
    expect(getCurrentNeighboursTarget(session)).toMatchObject({ showNumberUsed: true, revealMapUsed: true })
    const revealed = revealNeighboursRemaining(session)
    const target = getCurrentNeighboursTarget(revealed)!
    expect(target.phase).toBe('review')
    expect(target.revealedNeighbourIds).toHaveLength(target.requiredNeighbourIds.length)
    expect(deriveNeighboursTargetProgress(target)).toMatchObject({
      foundCount: 0,
      revealedCount: target.requiredNeighbourIds.length,
      resolvedCount: target.requiredNeighbourIds.length,
      remainingCount: 0,
      hintUses: 2,
    })
    expect(summarizeNeighboursRun(run, revealed)).toMatchObject({ named: 0, revealed: target.requiredNeighbourIds.length, perfectTargets: 0 })
    const continued = advanceNeighboursTarget(revealed)
    expect(continued.phase).toBe('complete')
  })

  it('completes a perfect target only after every neighbour is named', () => {
    const run = createNeighboursQuizRun({ scopeCountries: [country('DE')], activeCountries: countries, questionCount: 'all' })!
    let session = createNeighboursQuizSession(run)
    for (const neighbourId of run.questions[0]!.requiredNeighbourIds) {
      session = applyNeighboursGuess(session, { countryId: neighbourId, submittedAnswer: country(neighbourId).country }).state
    }
    const target = getCurrentNeighboursTarget(session)!
    expect(target.phase).toBe('complete')
    expect(isNeighboursTargetPerfect(target)).toBe(true)
    expect(summarizeNeighboursRun(run, session)).toMatchObject({ named: target.requiredNeighbourIds.length, perfectTargets: 1, incorrectGuesses: 0 })
    expect(advanceNeighboursTarget(session).phase).toBe('complete')
  })

  it('requires an unaided and error-free target for Perfect Countries', () => {
    const run = createNeighboursQuizRun({ scopeCountries: [country('DE')], activeCountries: countries, questionCount: 'all' })!
    const required = run.questions[0]!.requiredNeighbourIds
    const completeWith = (prepare: (session: ReturnType<typeof createNeighboursQuizSession>) => ReturnType<typeof createNeighboursQuizSession>) => {
      let session = prepare(createNeighboursQuizSession(run))
      for (const neighbourId of required) {
        session = applyNeighboursGuess(session, { countryId: neighbourId, submittedAnswer: country(neighbourId).country }).state
      }
      return getCurrentNeighboursTarget(session)!
    }

    expect(isNeighboursTargetPerfect(completeWith(session => session))).toBe(true)
    expect(isNeighboursTargetPerfect(completeWith(session => {
      const firstNeighbour = required[0]!
      const withFirst = applyNeighboursGuess(session, { countryId: firstNeighbour, submittedAnswer: country(firstNeighbour).country }).state
      const withDuplicate = applyNeighboursGuess(withFirst, { countryId: firstNeighbour, submittedAnswer: country(firstNeighbour).country }).state
      return {
        ...withDuplicate,
        targets: withDuplicate.targets.map(target => ({ ...target, foundNeighbourIds: target.foundNeighbourIds.filter((id, index, ids) => ids.indexOf(id) === index) })),
      }
    }))).toBe(true)
    expect(isNeighboursTargetPerfect(completeWith(showNeighboursNumber))).toBe(false)
    expect(isNeighboursTargetPerfect(completeWith(revealNeighboursMap))).toBe(false)
    expect(isNeighboursTargetPerfect(completeWith(session => applyNeighboursGuess(session, { submittedAnswer: 'Japan' }).state))).toBe(false)
  })

  it('retries each imperfect target from the completed run once, reshuffled', () => {
    const run = createNeighboursQuizRun({ scopeCountries: ['DE', 'FR'].map(country), activeCountries: countries, questionCount: 'all', random: () => 0 })!
    const session = createNeighboursQuizSession(run)
    const imperfect = run.targetIds.slice(0, 1)
    const retry = createNeighboursRetryRun(run, imperfect, () => 0)
    expect(retry?.targetIds).toEqual(imperfect)
    expect(retry?.questionCount).toBe('all')
    expect(retry?.questions[0]?.requiredNeighbourIds).toEqual(run.questions.find(question => question.targetId === imperfect[0])?.requiredNeighbourIds)
    expect(summarizeNeighboursRun(run, session).imperfectTargetIds).toEqual(run.targetIds)
  })
})
