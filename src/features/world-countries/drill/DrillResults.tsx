import type { Continent, Country } from '@/features/world-countries/data/countries'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { DrillResultStat } from './DrillResultStat'
import { DrillResultsRails } from './DrillRails'
import { getDrillModeDefinition, type WorldCountriesDrillMode } from './drillModes'
import type { DrillAnswerRecord } from './drillSessionState'
import { summarizeDrillAnswers } from './drillResultSummary'

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
          ariaLabel={`Results map for ${continent} Drill Countries`}
        />

        <section className="grid grid-cols-3 gap-2" aria-label="Drill summary">
          <DrillResultStat label="Correct" value={`${summary.correct}/${answers.length}`} />
          <DrillResultStat label="Accuracy" value={`${summary.accuracy}%`} />
          <DrillResultStat label="Countries" value={String(summary.countryCount)} />
        </section>
      </div>
    </>
  )
}
