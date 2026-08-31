// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { applyNeighboursGuess, createNeighboursQuizRun, createNeighboursQuizSession, revealNeighboursMap, showNeighboursNumber, type NeighboursQuizRun, type NeighboursQuizSessionState } from './neighboursRun'
import { NeighboursQuizResults } from './NeighboursQuizResults'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

function country(id: string) {
  const result = countries.find(candidate => candidate.id === id)
  if (!result) throw new Error(`Missing Country fixture: ${id}`)
  return result
}

function renderResults(run: NeighboursQuizRun, session: NeighboursQuizSessionState) {
  const mount = document.createElement('div')
  document.body.append(mount)
  const onRetryMissed = vi.fn()
  act(() => {
    root = createRoot(mount)
    root.render(createElement(NeighboursQuizResults, {
      run,
      session,
      onRetryMissed,
      onNewQuiz: vi.fn(),
      onChangeSetup: vi.fn(),
    }))
  })
  return { mount, onRetryMissed }
}

describe('Neighbours Quiz results', () => {
  it('shows named, perfect, wrong-guess, and imperfect-target review details', () => {
    const run = createNeighboursQuizRun({ scopeCountries: [country('DE')], activeCountries: countries, questionCount: 'all' })!
    const firstNeighbour = run.questions[0]!.requiredNeighbourIds[0]!
    let session = createNeighboursQuizSession(run)
    session = applyNeighboursGuess(session, { countryId: firstNeighbour, submittedAnswer: country(firstNeighbour).country }).state
    session = applyNeighboursGuess(session, { countryId: 'US', submittedAnswer: 'Japan' }).state
    const { mount, onRetryMissed } = renderResults(run, session)

    expect(mount.textContent).toContain('Neighbours named')
    expect(mount.textContent).toContain('1 / 9')
    expect(mount.textContent).toContain('Perfect Countries')
    expect(mount.textContent).toContain('Wrong guesses')
    expect(mount.textContent).toContain('Review imperfect Countries')
    expect(mount.textContent).toContain('Austria')

    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Retry missed')?.click())
    expect(onRetryMissed).toHaveBeenCalledOnce()
  })

  it('counts a hinted otherwise-clean target as imperfect and retryable', () => {
    const run = createNeighboursQuizRun({ scopeCountries: [country('DE')], activeCountries: countries, questionCount: 'all' })!
    const required = run.questions[0]!.requiredNeighbourIds
    let session = showNeighboursNumber(createNeighboursQuizSession(run))
    for (const neighbourId of required) session = applyNeighboursGuess(session, { countryId: neighbourId, submittedAnswer: country(neighbourId).country }).state

    const { mount, onRetryMissed } = renderResults(run, session)
    expect(mount.textContent).toContain('Perfect Countries')
    expect(mount.textContent).toContain('0 / 1')
    expect(mount.textContent).toContain('Hint uses')
    expect(mount.textContent).toContain('Assistance')
    expect(mount.textContent).toContain('Show number')
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Retry missed')?.click())
    expect(onRetryMissed).toHaveBeenCalledOnce()
  })

  it('explains Show map as assistance for an otherwise-clean imperfect target', () => {
    const run = createNeighboursQuizRun({ scopeCountries: [country('DE')], activeCountries: countries, questionCount: 'all' })!
    const required = run.questions[0]!.requiredNeighbourIds
    let session = revealNeighboursMap(createNeighboursQuizSession(run))
    for (const neighbourId of required) session = applyNeighboursGuess(session, { countryId: neighbourId, submittedAnswer: country(neighbourId).country }).state

    const { mount } = renderResults(run, session)
    expect(mount.textContent).toContain('0 / 1')
    expect(mount.textContent).toContain('Assistance')
    expect(mount.textContent).toContain('Show map')
  })
})
