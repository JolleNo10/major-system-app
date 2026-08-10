import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getContinents } from '@/features/world-countries/geography/queries'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { DrillResultStat } from './DrillResultStat'
import { getDrillSubregions, isEntireContinentSelection, type WorldCountriesDrillSelection } from './drillSelection'
import {
  getDrillModeDefinition,
  getDrillSkillLabel,
  WORLD_COUNTRIES_DRILL_MODES,
  type DrillModeDefinition,
  type WorldCountriesDrillMode,
} from './drillModes'
import { getCurrentDrillStep, getDrillSessionTotalSteps, type DrillAnswerRecord, type DrillSessionState } from './drillSessionState'
import { summarizeDrillAnswers } from './drillResultSummary'

export function DrillSetupRails({
  level,
  selection,
  mode,
  hoveredGroupId,
  onHoverGroup,
  onWorld,
  onSelectContinent,
  onToggleSubregion,
  onSelectEntireContinent,
  onModeChange,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleSubregion: (subregionId: SubregionId) => void
  onSelectEntireContinent: () => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
}) {
  const subregions = getDrillSubregions(selection.continent)
  const entireContinent = isEntireContinentSelection(selection)
  const selectedCount = selection.subregionIds.length

  useRails(
    {
      left: level === 'world' ? (
        <section className="space-y-4" aria-labelledby="world-countries-drill-geography-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p>
            <h2 id="world-countries-drill-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">Drill geography</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-400">Choose a Continent to enter its map-centered Drill setup.</p>
          <nav aria-label="Continents">
            <ul className="space-y-1.5">
              {getContinents().map(continent => (
                <DrillHierarchyRailRow
                  key={continent}
                  label={continent}
                  groupId={getContinentHoverGroupId(continent)}
                  hoveredGroupId={hoveredGroupId}
                  onClick={() => onSelectContinent(continent)}
                  onHoverGroup={onHoverGroup}
                />
              ))}
            </ul>
          </nav>
        </section>
      ) : (
        <section className="space-y-4" aria-labelledby="world-countries-drill-scope-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <button type="button" onClick={onWorld} className="text-zinc-500 hover:text-zinc-200">World</button>
            <span className="text-zinc-700">/</span>
            <span className="text-cyan-300">{selection.continent}</span>
          </nav>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{selection.continent}</p>
            <h2 id="world-countries-drill-scope-heading" className="mt-1 text-lg font-bold text-zinc-100">Drill scope</h2>
            <p className="mt-1 text-sm text-zinc-400">Select Subregions from the rail or map.</p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-zinc-500">Current selection</span>
              <span className="text-sm font-semibold tabular-nums text-cyan-300">{selectedCount}/{subregions.length}</span>
            </div>
            <button
              type="button"
              aria-pressed={entireContinent}
              onClick={onSelectEntireContinent}
              className={`mt-3 w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${entireContinent
                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100'
                : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-cyan-600'}
              `}
            >
              <span className="block font-semibold">Entire Continent</span>
              <span className="mt-1 block text-xs text-zinc-500">All currently defined Subregions</span>
            </button>
          </div>

          <nav aria-label={`${selection.continent} Subregions`}>
            <ul className="space-y-1.5">
              {subregions.map(subregion => {
                const selected = selection.subregionIds.includes(subregion.id)
                return (
                  <DrillHierarchyRailRow
                    key={subregion.id}
                    label={subregion.label}
                    groupId={getSubregionHoverGroupId(subregion.label)}
                    hoveredGroupId={hoveredGroupId}
                    onClick={() => onToggleSubregion(subregion.id)}
                    onHoverGroup={onHoverGroup}
                    selected={selected}
                  />
                )
              })}
            </ul>
          </nav>
          {selectedCount === 0 && <p className="text-sm text-amber-300" role="alert">Select at least one Subregion to start.</p>}
        </section>
      ),
      right: (
        <DrillModeRail
          mode={mode}
          onModeChange={onModeChange}
        />
      ),
      leftLabel: level === 'world' ? 'Drill geography' : 'Drill scope',
      rightLabel: 'Drill controls',
    },
    [level, mode, selection.continent, selection.subregionIds, hoveredGroupId, onHoverGroup, onWorld, onSelectContinent, onToggleSubregion, onSelectEntireContinent, onModeChange],
  )

  return null
}

function DrillModeRail({
  mode,
  onModeChange,
}: {
  mode: WorldCountriesDrillMode
  onModeChange: (mode: WorldCountriesDrillMode) => void
}) {
  return (
    <section className="space-y-4" aria-labelledby="world-countries-drill-controls-heading">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Drill</p>
        <h2 id="world-countries-drill-controls-heading" className="mt-1 text-lg font-bold text-zinc-100">Controls</h2>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-200">Recall modes</h3>
        <div className="mt-3 space-y-2">
          {WORLD_COUNTRIES_DRILL_MODES
            .filter(candidate => candidate.id !== 'capitals')
            .map(candidate => (
              <DrillModeButton
                key={candidate.id}
                candidate={candidate}
                selected={candidate.id === mode}
                onSelect={onModeChange}
              />
            ))}
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-4">
        <h3 className="text-sm font-semibold text-zinc-200">Practice</h3>
        <div className="mt-3 space-y-2">
          {WORLD_COUNTRIES_DRILL_MODES
            .filter(candidate => candidate.id === 'capitals')
            .map(candidate => (
              <DrillModeButton
                key={candidate.id}
                candidate={candidate}
                selected={candidate.id === mode}
                onSelect={onModeChange}
              />
            ))}
        </div>
      </div>
    </section>
  )
}

function DrillModeButton({
  candidate,
  selected,
  onSelect,
}: {
  candidate: DrillModeDefinition
  selected: boolean
  onSelect: (mode: WorldCountriesDrillMode) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(candidate.id)}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${selected
        ? 'border-violet-500 bg-violet-500/15'
        : 'border-zinc-700 bg-zinc-800 hover:border-violet-600'}
      `}
    >
      <span className={`block text-sm font-semibold ${selected ? 'text-violet-200' : 'text-zinc-200'}`}>{candidate.label}</span>
      <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{candidate.description}</span>
    </button>
  )
}

function DrillHierarchyRailRow({
  label,
  groupId,
  hoveredGroupId,
  onClick,
  onHoverGroup,
  selected = false,
}: {
  label: string
  groupId: string
  hoveredGroupId: string | null
  onClick: () => void
  onHoverGroup: (groupId: string | null) => void
  selected?: boolean
}) {
  const hovered = hoveredGroupId === groupId
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        onMouseEnter={() => onHoverGroup(groupId)}
        onMouseLeave={() => onHoverGroup(null)}
        onFocus={() => onHoverGroup(groupId)}
        onBlur={() => onHoverGroup(null)}
        className={`flex min-h-[40px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
          hovered
            ? 'border-cyan-500 bg-cyan-950/60 text-zinc-100'
            : selected
              ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-100'
              : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'
        }`}
      >
        {selected && <span aria-hidden="true" className="text-cyan-400">✓</span>}
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
    </li>
  )
}

export function DrillSessionRails({
  selection,
  mode,
  state,
  onExit,
}: {
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  state: DrillSessionState
  onExit: () => void
}) {
  const step = getCurrentDrillStep(state)
  const totalSteps = getDrillSessionTotalSteps(state)
  const completedSteps = state.countryIndex * getDrillModeDefinition(mode).skills.length + state.stepIndex
  const progressPercent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0
  const subregions = getDrillSubregions(selection.continent)

  useRails(
    {
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-drill-session-context-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500">World</span>
            <span className="text-zinc-700">/</span>
            <span className="text-cyan-300">{selection.continent}</span>
          </nav>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Selected geography</p>
            <h2 id="world-countries-drill-session-context-heading" className="mt-1 text-lg font-bold text-zinc-100">Drill context</h2>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Subregions</p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              {subregions.filter(subregion => selection.subregionIds.includes(subregion.id)).map(subregion => (
                <li key={subregion.id}>{subregion.label}</li>
              ))}
            </ul>
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
          <button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">Exit Drill</button>
        </section>
      ),
      leftLabel: 'Drill context',
      rightLabel: 'Session',
    },
    [mode, onExit, selection.continent, selection.subregionIds, state.countryIndex, state.countryOrder.length, state.stepIndex, step?.skill, totalSteps, progressPercent],
  )

  return null
}

export function DrillResultsRails({
  mode,
  scopeCountries,
  answers,
  onAgain,
  onChangeSetup,
}: {
  mode: WorldCountriesDrillMode
  scopeCountries: readonly Country[]
  answers: readonly DrillAnswerRecord[]
  onAgain: () => void
  onChangeSetup: () => void
}) {
  const summary = summarizeDrillAnswers(answers)
  const countryById = new Map(scopeCountries.map(entry => [entry.id, entry]))

  useRails(
    {
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-drill-results-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Session complete</p>
            <h2 id="world-countries-drill-results-heading" className="mt-1 text-lg font-bold text-zinc-100">Results</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DrillResultStat label="Correct" value={`${summary.correct}/${answers.length}`} />
            <DrillResultStat label="Accuracy" value={`${summary.accuracy}%`} />
          </div>
          <ol className="space-y-1.5" aria-label="Drill answers">
            {answers.map((answer, index) => (
              <li key={`${answer.countryId}-${answer.skill}-${index}`} className={`rounded-lg border px-3 py-2 ${answer.correct ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-5 shrink-0 text-xs tabular-nums text-zinc-600">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-200">{countryById.get(answer.countryId)?.country ?? answer.countryId}</span>
                  <span className={answer.correct ? 'text-green-400' : 'text-red-400'}>{answer.correct ? '✓' : '✗'}</span>
                </div>
                <p className="mt-1 pl-7 text-xs text-zinc-500">{getDrillSkillLabel(answer.skill)}</p>
                {!answer.correct && <p className="mt-1 pl-7 text-xs text-red-300">You answered: {answer.answer || '—'}</p>}
              </li>
            ))}
          </ol>
        </section>
      ),
      right: (
        <section className="space-y-4" aria-labelledby="world-countries-drill-next-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">{getDrillModeDefinition(mode).label}</p>
            <h2 id="world-countries-drill-next-heading" className="mt-1 text-lg font-bold text-zinc-100">Next action</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-400">Keep the geographic workspace open while you review this run or change the scope.</p>
          <button type="button" onClick={onAgain} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Run again</button>
          <button type="button" onClick={onChangeSetup} className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">Change setup</button>
        </section>
      ),
      leftLabel: 'Results',
      rightLabel: 'Next action',
    },
    [answers, mode, onAgain, onChangeSetup, scopeCountries, summary.accuracy, summary.correct],
  )

  return null
}
