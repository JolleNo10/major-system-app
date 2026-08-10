import type { Continent, Country } from '@/features/world-countries/data/countries'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { DrillResultsRails } from './DrillRails'
import { getDrillModeDefinition, type WorldCountriesDrillMode } from './drillModes'
import type { DrillAnswerRecord } from './drillSessionState'
import { summarizeDrillAnswers } from './drillResultSummary'

export function DrillResults({
  mode,
  continent,
  entries,
  answers,
  onAgain,
  onChangeSetup,
}: {
  mode: WorldCountriesDrillMode
  continent: Continent
  entries: readonly Country[]
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
        entries={entries}
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
          scopeCountries={entries}
          showNames
          ariaLabel={`Results map for ${continent} Drill Countries`}
        />

        <section className="grid grid-cols-3 gap-2" aria-label="Drill summary">
          <ResultStat label="Correct" value={`${summary.correct}/${answers.length}`} />
          <ResultStat label="Accuracy" value={`${summary.accuracy}%`} />
          <ResultStat label="Countries" value={String(summary.countryCount)} />
        </section>
      </div>
    </>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold text-zinc-100">{value}</p>
    </div>
  )
}
