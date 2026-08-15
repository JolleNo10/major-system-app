import { useRails } from '@/app/layout/PageLayoutContext'
import type { Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import type { WorldCountriesDrillSelection } from './drillSelection'
import { getDrillSkillLabel, getDrillModeDefinition, type WorldCountriesDrillMode } from './drillModes'
import { getCurrentDrillStep, getDrillSessionTotalSteps, type DrillSessionState } from './drillSessionState'
import type { WorldCountriesProficiencySelection } from './drillProficiencyScope'

export function DrillSessionRails({
  selection,
  proficiencySelection = [],
  mode,
  state,
  onExit,
  entries,
}: {
  selection: WorldCountriesDrillSelection
  proficiencySelection?: WorldCountriesProficiencySelection
  mode: WorldCountriesDrillMode
  state: DrillSessionState
  onExit: () => void
  entries: readonly Country[]
}) {
  const step = getCurrentDrillStep(state)
  const totalSteps = getDrillSessionTotalSteps(state)
  const completedSteps = state.countryIndex * getDrillModeDefinition(mode).skills.length + state.stepIndex
  const progressPercent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0
  const subregions = selection.subregionIds.map(getSubregionDefinition)

  useRails(
    {
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-drill-session-context-heading">
          <GeographyBreadcrumbs items={[{ label: 'World' }, { label: selection.continent, current: true }]} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Selected geography</p>
            <h2 id="world-countries-drill-session-context-heading" className="mt-1 text-lg font-bold text-zinc-100">Drill context</h2>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            {proficiencySelection.length > 0 ? <><p className="text-xs uppercase tracking-wider text-zinc-500">Proficiency scope</p><ul className="mt-2 space-y-1 text-sm text-zinc-300">{proficiencySelection.map(filter => <li key={filter}>{filter === 'weak' ? 'Weak' : 'Developing'}</li>)}</ul><p className="mt-2 text-xs text-zinc-500">{state.countryIds.length} Countries in this session</p></> : <><p className="text-xs uppercase tracking-wider text-zinc-500">Subregions</p><ul className="mt-2 space-y-1 text-sm text-zinc-300">{subregions.filter(subregion => selection.subregionIds.includes(subregion.id)).map(subregion => <li key={subregion.id}>{subregion.label}</li>)}</ul></>}
          </div>
        </section>
      ),
      right: (
        <section className="space-y-4" aria-labelledby="world-countries-drill-session-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Drill</p>
            <h2 id="world-countries-drill-session-heading" className="mt-1 text-lg font-bold text-zinc-100">Session</h2>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Mode</p>
            <p className="mt-1 text-sm font-semibold text-zinc-200">{getDrillModeDefinition(mode).label}</p>
            <p className="mt-1 text-xs text-zinc-500">{step ? getDrillSkillLabel(step.skill) : 'Complete'}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-label="Drill progress">
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, progressPercent)}%` }} />
            </div>
            <p className="mt-2 text-xs tabular-nums text-zinc-500">Country {Math.min(state.countryIndex + 1, state.countryOrder.length)} / {state.countryOrder.length}</p>
          </div>
          <button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Exit Drill</button>
        </section>
      ),
      leftLabel: 'Drill context',
      rightLabel: 'Session',
    },
    [entries, mode, onExit, proficiencySelection, selection.continent, selection.subregionIds, state.countryIds.length, state.countryIndex, state.countryOrder.length, state.stepIndex, step?.skill, totalSteps, progressPercent],
  )

  return null
}
