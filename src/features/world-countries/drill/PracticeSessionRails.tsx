import { useRails } from '@/app/layout/PageLayoutContext'
import type { Country } from '@/features/world-countries/data/countries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import type { WorldCountriesDrillSelection } from './drillSelection'
import { getDrillSkillLabel } from './drillModes'
import { getCurrentDrillStep, getDrillSessionSkills, getDrillSessionTotalSteps, type DrillSessionState } from './drillSessionState'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import { deriveWorldCountriesLearningReadiness, getWorldCountriesLearningReadinessLabel, getWorldCountriesLearningStateList } from '@/features/world-countries/learning/learningReadiness'
import type { WorldCountriesProficiencySelection } from './drillProficiencyScope'

export function PracticeSessionRails({ selection, proficiencySelection = [], state, onExit, entries, learningStates }: {
  selection: WorldCountriesDrillSelection
  proficiencySelection?: WorldCountriesProficiencySelection
  state: DrillSessionState
  onExit: () => void
  entries: readonly Country[]
  learningStates: LearningStates
}) {
  const step = getCurrentDrillStep(state)
  const totalSteps = getDrillSessionTotalSteps(state)
  const completedSteps = state.countryIndex * getDrillSessionSkills(state).length + state.stepIndex
  const progressPercent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0
  const subregions = getSubregionsForContinentInEffectiveOrder(selection.continent, entries, getContinentMetadata(selection.continent))
  const stateList = getWorldCountriesLearningStateList(learningStates)
  useRails({
    left: (
      <section className="space-y-4" aria-labelledby="world-countries-practice-context-heading">
        <GeographyBreadcrumbs items={[{ label: 'World' }, { label: selection.continent, current: true }]} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Practice</p>
          <h2 id="world-countries-practice-context-heading" className="mt-1 text-lg font-bold text-zinc-100">Practice context</h2>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          {proficiencySelection.length > 0 ? <><p className="text-xs uppercase tracking-wider text-zinc-500">Proficiency scope</p><ul className="mt-2 space-y-1 text-sm text-zinc-300">{proficiencySelection.map(filter => <li key={filter}>{filter === 'weak' ? 'Weak' : 'Developing'}</li>)}</ul><p className="mt-2 text-xs text-zinc-500">{state.countryIds.length} Countries in this session</p></> : <><p className="text-xs uppercase tracking-wider text-zinc-500">Subregions</p><ul className="mt-2 space-y-1 text-sm text-zinc-300">{subregions.filter(subregion => selection.subregionIds.includes(subregion.id)).map(subregion => <li key={subregion.id}>{subregion.label} · {getWorldCountriesLearningReadinessLabel(deriveWorldCountriesLearningReadiness(stateList.find(state => state.subregionId === subregion.id)))}</li>)}</ul></>}
        </div>
      </section>
    ),
    right: (
      <section className="space-y-4" aria-labelledby="world-countries-practice-session-heading">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Practice</p>
          <h2 id="world-countries-practice-session-heading" className="mt-1 text-lg font-bold text-zinc-100">Session</h2>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Current skill</p>
          <p className="mt-1 text-sm font-semibold text-zinc-200">{step ? getDrillSkillLabel(step.skill) : 'Complete'}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-label="Practice progress"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, progressPercent)}%` }} /></div>
          <p className="mt-2 text-xs tabular-nums text-zinc-500">Country {Math.min(state.countryIndex + 1, state.countryOrder.length)} / {state.countryOrder.length}</p>
        </div>
        <button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Exit Practice</button>
      </section>
    ),
    leftLabel: 'Practice context',
    rightLabel: 'Session',
  }, [entries, learningStates, onExit, proficiencySelection, progressPercent, selection.continent, selection.subregionIds, state.countryIds.length, state.countryIndex, state.countryOrder.length, state.stepIndex, step?.skill, totalSteps])
  return null
}
