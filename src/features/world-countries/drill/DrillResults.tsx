import type { Continent, Country } from '@/features/world-countries/data/countries'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { useEffect, useMemo, useState } from 'react'
import { DrillResultStat } from './DrillResultStat'
import { DrillResultsRails } from './DrillRails'
import { getDrillModeDefinition, getDrillSkillLabel, getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
import type { DrillAnswerRecord } from './drillSessionState'
import { summarizeDrillAnswers } from './drillResultSummary'
import {
  loadWorldCountriesRecallProgress,
  type RecallProgress,
} from '@/features/world-countries/learning/recallProgress'
import { createDrillProgressColors, getDrillProgressLegend } from './drillProgressPresentation'

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
  const [recallProgress, setRecallProgress] = useState<RecallProgress | null>(null)

  useEffect(() => {
    let active = true
    setRecallProgress(null)
    void loadWorldCountriesRecallProgress({
      countryIds: scopeCountries.map(country => country.id),
      skills,
    }).then(progress => {
      if (active) setRecallProgress(progress)
    })
    return () => { active = false }
  }, [scopeCountries, skills])

  const countryColorsById = useMemo(() => {
    if (!recallProgress) return undefined
    return createDrillProgressColors(mode, scopeCountries, recallProgress)
  }, [mode, recallProgress, scopeCountries])

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
        <p className="px-1 text-xs text-zinc-500" aria-label="Results map progress legend">
          Durable progress: {getDrillProgressLegend(mode)}
        </p>

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
