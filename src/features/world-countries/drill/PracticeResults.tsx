import type { Country } from '@/features/world-countries/data/countries'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { DrillResultStats } from './DrillResultStats'
import type { DrillAnswerRecord } from './drillSessionState'
import { summarizeDrillAnswers } from './drillResultSummary'
import { getDrillSkillLabel } from './drillModes'
import { PracticeResultsRails } from './PracticeResultsRails'
import { ProgressMapLegend } from '@/features/world-countries/learning/ProgressMapLegend'
import { WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES } from '@/features/world-countries/learning/learningReadiness'

export function PracticeResults({ scopeCountries, answers, onAgain, onChangeSetup }: {
  scopeCountries: readonly Country[]
  answers: readonly DrillAnswerRecord[]
  onAgain: () => void
  onChangeSetup: () => void
}) {
  const summary = summarizeDrillAnswers(answers)
  const continentGroups = [...new Set(scopeCountries.map(country => country.continent))].map(continent => ({
    continent,
    countries: scopeCountries.filter(country => country.continent === continent),
  }))
  const scopeLabel = continentGroups.length === 1 ? continentGroups[0]!.continent : 'World'
  return <>
    <PracticeResultsRails scopeCountries={scopeCountries} answers={answers} onAgain={onAgain} onChangeSetup={onChangeSetup} />
    <div className="space-y-4 animate-fade-in">
      <section className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Practice complete</p>
        <h1 className="text-2xl font-bold text-zinc-100">Practice results</h1>
        <p className="text-sm text-zinc-500">This session was practice only. It did not change Learning Readiness or Drill proficiency.</p>
      </section>
      {continentGroups.map(group => <CountryLearningMap key={group.continent} continent={group.continent} scopeCountries={group.countries} showNames ariaLabel={`Results map for ${scopeLabel} Practice Countries`} />)}
      <ProgressMapLegend title="Learning Readiness" entries={WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES} explanation="Practice results are transient and do not change Learning Readiness." mapCues="Learning Readiness remains separate from this Practice result." ariaLabel="Learning Readiness legend" collapsibleDetails />
      <DrillResultStats summary={summary} answerCount={answers.length} showCountryCount ariaLabel="Practice summary" />
      {summary.bySkill.size > 0 && <WorldCountriesPanel aria-label="Practice results by skill">
        <h2 className="text-sm font-semibold text-zinc-200">Results by skill</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[...summary.bySkill.entries()].map(([skill, result]) => <div key={skill} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"><p className="text-xs uppercase tracking-wider text-zinc-500">{getDrillSkillLabel(skill)}</p><p className="mt-1 text-lg font-bold text-zinc-100">{result.correct}/{result.attempts}</p><p className="text-xs text-zinc-500">{result.accuracy}% accuracy</p></div>)}
        </div>
      </WorldCountriesPanel>}
    </div>
  </>
}
