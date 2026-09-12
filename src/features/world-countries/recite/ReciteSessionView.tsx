import { useMemo } from 'react'
import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import { TaskDockMessage } from '@/features/world-countries/ui/TaskDockMessage'
import { WorldCountriesMapActivitySurface, type WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import { getWorldCountriesTaskHighlightFill } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import { WorldCountriesTypedAnswer, type WorldCountriesTypedAnswerEvaluation } from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import { classifyRecallAnswer, getRecallAnswerKindMistakeMessage } from '@/features/world-countries/learning/recallAnswerMatching'
import {
  getCurrentRecitePrompt,
  getReciteCountryOutcomes,
  getReciteResolvedPromptCount,
  getReciteResolvedCountryIds,
  type ReciteCountryOutcome,
  type ReciteMode,
  type RecitePromptView,
  type ReciteSessionState,
} from './reciteSession'
import { createReciteActiveCountryColors, getReciteModeLabel, type ReciteMapAssistance } from './recitePresentation'

export interface ActiveReciteRun {
  subregionIds: readonly SubregionId[]
  scopeLabel: string
  mode: ReciteMode
  assistance: ReciteMapAssistance
  population: readonly Country[]
  scopeCountries: readonly Country[]
  session: ReciteSessionState
}

export type ReciteSessionPhase = 'session' | 'complete'

const EMPTY_COUNTRY_IDS: readonly CountryId[] = []

export function ReciteSession({ run, phase, fuzzyMatching, onSubmit, onReveal, onContinue, onReciteAgain, onBackToSetup }: {
  run: ActiveReciteRun
  phase: ReciteSessionPhase
  fuzzyMatching: boolean
  onSubmit: (evaluation: WorldCountriesTypedAnswerEvaluation) => void
  onReveal: () => void
  onContinue: () => void
  onReciteAgain: () => void
  onBackToSetup: () => void
}) {
  const currentPrompt = phase === 'session' ? getCurrentRecitePrompt(run.session) : null
  const currentCountry = currentPrompt ? run.scopeCountries.find(country => country.id === currentPrompt.countryId) : undefined
  const runContinents = [...new Set(run.scopeCountries.map(country => country.continent))]
  const currentContinent = currentCountry?.continent
  const activeContinent = currentContinent ?? (phase === 'complete' && runContinents.length === 1 ? runContinents[0] : undefined)
  // Regional assets are authoritative for the active prompt. A completed
  // multi-continent run has no active target, so it may use the World map.
  const mapContinent = activeContinent
  // Answer feedback replaces the session object; the snapshot arrays are the semantic inputs here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const outcomes = useMemo(() => getReciteCountryOutcomes(run.session), [run.session.countries, run.session.prompts])
  const outcomeSignature = outcomes.join('|')
  // Keep the color map stable when a prompt's feedback changes without changing Country outcomes.
  const outcomesByCountryId = useMemo(
    () => new Map(run.session.countries.map((country, index) => [country.id, outcomes[index] ?? null] as const)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outcomeSignature, run.session.countries],
  )
  const activeMapCountries = useMemo(
    () => mapContinent ? run.population.filter(country => country.continent === mapContinent) : run.population,
    [mapContinent, run.population],
  )
  const selectedCountryIds = useMemo(
    () => run.session.countries.map(country => country.id),
    [run.session.countries],
  )
  const activeCountryColors = useMemo(
    () => createReciteActiveCountryColors(activeMapCountries, selectedCountryIds, outcomesByCountryId),
    [activeMapCountries, outcomesByCountryId, selectedCountryIds],
  )
  const resolvedCountryIds = useMemo(
    () => getReciteResolvedCountryIds(run.session),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run.session.countries, run.session.prompts],
  )
  const hiddenCountryIdsForReveal = useMemo(() => {
    const resolved = new Set(resolvedCountryIds)
    return run.session.countries
      .filter(country => !activeContinent || run.scopeCountries.find(entry => entry.id === country.id)?.continent === activeContinent)
      .filter(country => !resolved.has(country.id))
      .map(country => country.id)
  }, [activeContinent, resolvedCountryIds, run.scopeCountries, run.session.countries])
  const hiddenCountryIds = run.assistance === 'reveal' && phase === 'session'
    ? hiddenCountryIdsForReveal
    : EMPTY_COUNTRY_IDS
  const currentAnswerKind = currentPrompt
    ? currentPrompt.kind === 'capital' ? 'capital' : 'country'
    : undefined
  const currentPromptCountryId = currentPrompt?.countryId
  const highlightedCountryIds = useMemo(
    () => run.assistance !== 'reveal' && currentPromptCountryId ? [currentPromptCountryId] : EMPTY_COUNTRY_IDS,
    [currentPromptCountryId, run.assistance],
  )
  const currentSubregionId = currentCountry?.subregionId
  const learningCameraIntent = useMemo(
    () => currentSubregionId
      ? { kind: 'subregion-learning' as const, subregionId: currentSubregionId }
      : { kind: 'default' as const },
    [currentSubregionId],
  )
  const highlightFill = currentAnswerKind ? getWorldCountriesTaskHighlightFill(currentAnswerKind) : undefined
  const map = useMemo(() => (
    <GeographyOverviewMap
      level={mapContinent ? 'continent' : 'world'}
      continent={mapContinent}
      selectedCountryIds={selectedCountryIds}
      countryColorsById={activeCountryColors}
      countryPopulation={run.population}
      highlightedCountryIds={highlightedCountryIds}
      highlightFill={highlightFill}
      cameraIntent={learningCameraIntent}
      taskTargetCountryId={run.assistance === 'random' ? currentPromptCountryId : null}
      hiddenCountryIds={hiddenCountryIds}
      interactive={false}
      ariaLabel={`${mapContinent ?? 'World'} map for active Recite session`}
    />
  ), [activeCountryColors, currentPromptCountryId, highlightedCountryIds, hiddenCountryIds, highlightFill, learningCameraIntent, mapContinent, run.assistance, run.population, selectedCountryIds])

  if (phase === 'complete') {
    const count = (outcome: ReciteCountryOutcome) => outcomes.filter(candidate => candidate === outcome).length
    return (
      <section className="space-y-3 animate-fade-in" aria-labelledby="world-countries-recite-complete-heading">
        <MapSurface
          context={(
            <div className="px-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-400">World Countries · Recite</p>
              <h1 id="world-countries-recite-complete-heading" className="mt-1 text-2xl font-black text-zinc-100">Recite complete</h1>
              <p className="mt-1 text-sm text-zinc-500">{run.scopeLabel} · {run.session.countries.length} Countries</p>
            </div>
          )}
          map={map}
          dockPlacement="stacked"
          dock={(
            <TaskDockMessage
              variant="completion"
              tone="ready"
              enableEnterPrimary
              header={<span className="font-semibold text-green-300">Recite complete</span>}
              description={<div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-zinc-300">This completed run is now the latest Recite status for each Country in this mode.</span><span className="rounded-md bg-green-500/10 px-2 py-1 text-xs text-green-300">Recalled {count('recalled')}</span><span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-300">Recovered {count('recovered')}</span><span className="rounded-md bg-orange-900/40 px-2 py-1 text-xs text-orange-300">Revealed {count('revealed')}</span></div>}
              actions={<><button type="button" data-primary-action onClick={onReciteAgain} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Recite again</button><button type="button" onClick={onBackToSetup} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Back to setup</button></>}
            />
          )}
        />
      </section>
    )
  }

  if (!currentPrompt || !currentCountry) return null
  const activityProgress = run.mode === 'countries-capitals' && run.assistance === 'random'
    ? {
      label: 'Prompts',
      current: getReciteResolvedPromptCount(run.session),
      total: run.session.prompts.length,
    }
    : {
      label: 'Country',
      current: currentPrompt.countryIndex + 1,
      total: run.session.countries.length,
    }
  const activeTask: WorldCountriesActivityTask = run.mode === 'countries-from-capitals' && currentPrompt.kind === 'country'
    ? {
      direction: 'Capital → Country',
      cue: currentCountry.capital,
      answerKind: 'country',
      sessionContext: <><span className="text-zinc-300">{currentCountry.continent}</span> · {getReciteModeLabel(run.mode)}</>,
      progress: activityProgress,
    }
    : {
      direction: currentPrompt.kind === 'capital'
        ? 'Country → Capital'
        : run.assistance === 'random' ? 'Random Country recall' : 'Ordered Country recall',
      cue: currentPrompt.kind === 'capital'
        ? 'Name the capital'
        : run.assistance === 'random' ? 'Identify the highlighted Country' : 'Next country',
      answerKind: currentAnswerKind,
      sessionContext: <><span className="text-zinc-300">{currentCountry.continent}</span> · {getReciteModeLabel(run.mode)}</>,
      progress: activityProgress,
    }

  return (
    <section className="space-y-3 animate-fade-in">
      <WorldCountriesMapActivitySurface
        task={activeTask}
        map={map}
        dockPlacement="stacked"
        dock={(
          <RecitePromptDock
            key={`${currentPrompt.countryId}-${currentPrompt.kind}`}
            prompt={currentPrompt}
            country={currentCountry}
            scopeCountries={run.scopeCountries}
            fuzzyMatching={fuzzyMatching}
            onSubmit={onSubmit}
            onReveal={onReveal}
            onContinue={onContinue}
          />
        )}
      />
    </section>
  )
}

function RecitePromptDock({ prompt, country, scopeCountries, fuzzyMatching, onSubmit, onReveal, onContinue }: { prompt: RecitePromptView; country: Country; scopeCountries: readonly Country[]; fuzzyMatching: boolean; onSubmit: (evaluation: WorldCountriesTypedAnswerEvaluation) => void; onReveal: () => void; onContinue: () => void }) {
  const answerKind = prompt.kind === 'capital' ? 'capital' : 'country'
  const expected = prompt.kind === 'capital' ? country.capital : country.country
  const placeholder = prompt.kind === 'capital' ? 'Type the capital…' : 'Type the country…'

  return (
    <WorldCountriesTypedAnswer
      promptKey={`${prompt.countryId}-${prompt.kind}`}
      answerKind={answerKind}
      answerLabel={prompt.kind === 'capital' ? 'Type the capital' : 'Type the country name'}
      placeholder={placeholder}
      correctAnswer={expected}
      retryOnIncorrect
      reveal={{ canonicalAnswer: expected, answerKind: prompt.kind === 'capital' ? 'capital' : 'country', message: `Answer: ${expected}` }}
      evaluate={answer => {
        const skill = prompt.kind === 'capital' ? 'country-to-capital' : 'capital-to-country'
        const match = classifyRecallAnswer(skill, answer, country, {
          fuzzy: fuzzyMatching,
          countryCandidates: scopeCountries,
          capitalCandidates: scopeCountries.map(entry => entry.capital),
        })
        const outcome = match === 'wrong-kind' ? 'wrong-kind' : match === 'fuzzy' ? 'fuzzy' : match === 'exact' ? 'exact' : 'incorrect'
        return {
          outcome,
          canonicalAnswer: expected,
          answerKind,
          message: outcome === 'wrong-kind'
            ? getRecallAnswerKindMistakeMessage(skill)
            : outcome === 'incorrect'
            ? 'Not quite. Try again; the answer stays hidden.'
            : outcome === 'fuzzy'
              ? `Correct. The canonical answer is ${expected}.`
              : `Correct. ${expected}`,
        } satisfies WorldCountriesTypedAnswerEvaluation
      }}
      onAnswer={(_, evaluation) => onSubmit(evaluation)}
      onTransition={onContinue}
    >
      {typed => (
        <TaskDock variant="form" answerKind={typed.feedbackActive ? undefined : answerKind}>
          <div className="space-y-3">
            {typed.input}
            {typed.isAnswerable && <button type="button" onClick={() => { if (typed.reveal()) onReveal() }} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-orange-500 hover:text-zinc-100">Reveal / Skip</button>}
          </div>
        </TaskDock>
      )}
    </WorldCountriesTypedAnswer>
  )
}
