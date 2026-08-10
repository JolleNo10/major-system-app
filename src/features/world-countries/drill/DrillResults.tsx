import { useMemo } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { DrillResultStat } from './DrillResultStat'
import { DrillResultsRails } from './DrillRails'
import { getDrillModeDefinition, getDrillSkillLabel, getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
import type { DrillAnswerRecord } from './drillSessionState'
import { summarizeDrillAnswers } from './drillResultSummary'
import type { WorldCountriesProgressPerspective } from '@/features/world-countries/learning/progressPresentation'
import { useWorldCountriesCountryColors } from '@/features/world-countries/learning/useWorldCountriesCountryColors'
import { DrillProgressLegend } from './DrillProgressLegend'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import { createDrillProgressColors } from './drillProgressPresentation'

export function DrillResults({
  mode,
  continent,
  scopeCountries,
  answers,
  onAgain,
  onChangeSetup,
}: {
  mode: WorldCountriesDrillMode
  continent: Continent
  scopeCountries: readonly Country[]
  answers: readonly DrillAnswerRecord[]
  onAgain: () => void
  onChangeSetup: () => void
}) {
  const summary = summarizeDrillAnswers(answers)
  const definition = getDrillModeDefinition(mode)
  const skills = getSkillsForDrillMode(mode)
  const perspective: WorldCountriesProgressPerspective = mode === 'countries-capitals' ? 'core' : skills[0]
  const memoLearningStates = useMemo(() => getAllSubregionLearningStates(), [])
  const { recallProgress } = useWorldCountriesCountryColors({
    countries: scopeCountries,
    skills,
    perspective,
  })
  const countryColorsById = useMemo(
    () => recallProgress
      ? createDrillProgressColors(mode, scopeCountries, recallProgress, memoLearningStates)
      : undefined,
    [memoLearningStates, mode, recallProgress, scopeCountries],
  )

  return (
    <>
      <DrillResultsRails
        mode={mode}
        scopeCountries={scopeCountries}
        answers={answers}
        onAgain={onAgain}
        onChangeSetup={onChangeSetup}
      />
      <div className="space-y-4 animate-fade-in">
        <section className="space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Drill complete</p>
          <h1 className="text-2xl font-bold text-zinc-100">{definition.label}</h1>
          <p className="text-sm text-zinc-500">The map keeps the selected Countries in their geographic context while you review the run.</p>
        </section>

        <CountryLearningMap
          continent={continent}
          scopeCountries={scopeCountries}
          showNames
          countryColorsById={countryColorsById}
          ariaLabel={`Results map for ${continent} Drill Countries`}
        />
        <DrillProgressLegend mode={mode} />

        <section className="grid grid-cols-3 gap-2" aria-label="Drill summary">
          <DrillResultStat label="Correct" value={`${summary.correct}/${answers.length}`} />
          <DrillResultStat label="Accuracy" value={`${summary.accuracy}%`} />
          <DrillResultStat label="Countries" value={String(summary.countryCount)} />
        </section>

        {summary.bySkill.size > 1 && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-label="Results by recall skill">
            <h2 className="text-sm font-semibold text-zinc-200">Results by skill</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[...summary.bySkill.entries()].map(([skill, result]) => (
                <div key={skill} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">{getDrillSkillLabel(skill)}</p>
                  <p className="mt-1 text-lg font-bold text-zinc-100">{result.correct}/{result.attempts}</p>
                  <p className="text-xs text-zinc-500">{result.accuracy}% accuracy</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
