import { useId, useState } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getContinentsInEffectiveOrder, getCountriesForContinent, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { DrillResultStat } from './DrillResultStat'
import { isEntireContinentSelection, type WorldCountriesDrillSelection } from './drillSelection'
import {
  getDrillModeDefinition,
  getDrillSkillLabel,
  WORLD_COUNTRIES_DRILL_MODES,
  type DrillModeDefinition,
  type WorldCountriesDrillMode,
} from './drillModes'
import { getCurrentDrillStep, getDrillSessionTotalSteps, type DrillAnswerRecord, type DrillSessionState } from './drillSessionState'
import { summarizeDrillAnswers } from './drillResultSummary'
import type { GuidedLearningActionId } from './guidedLearning'
import type { WorldCountriesDrillOrder } from './drillOrder'

const RAIL_PANEL_CLS = 'rounded-xl border border-zinc-800 bg-zinc-900 p-4'
type PracticeMode = 'learn-countries' | 'countries' | 'capitals'
type DrillPracticeMode = Exclude<PracticeMode, 'learn-countries'>

const PRACTICE_MODE_CANDIDATES: readonly ModeOptionCandidate<PracticeMode>[] = [
  { id: 'learn-countries', label: 'Learn Countries', description: 'Build Country location memory with guided practice.' },
  { id: 'countries', label: 'Locate Countries', description: 'Click the target Country on the map.' },
  { id: 'capitals', label: 'Capitals', description: 'Practise capitals before Countries + Capitals.' },
]

export function DrillSetupRails({
  level,
  selection,
  mode,
  order,
  hoveredGroupId,
  onHoverGroup,
  onWorld,
  onSelectContinent,
  onToggleSubregion,
  onSelectEntireContinent,
  onModeChange,
  onPracticeStart = () => undefined,
  onOrderChange,
  onStart,
  onGuidedAction = () => undefined,
  entries = countries,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleSubregion: (subregionId: SubregionId) => void
  onSelectEntireContinent: () => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
  onPracticeStart?: (mode: WorldCountriesDrillMode) => void
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onStart: () => void
  onGuidedAction?: (action: GuidedLearningActionId) => void
  entries?: readonly Country[]
}) {
  const subregions = getSubregionsForContinentInEffectiveOrder(
    selection.continent,
    entries,
    getContinentMetadata(selection.continent),
  )
  const entireContinent = isEntireContinentSelection(selection, entries)
  const selectedCount = selection.subregionIds.length
  const modeGroupName = `world-countries-drill-mode-${useId()}`
  const [practiceMode, setPracticeMode] = useState<PracticeMode | null>(null)

  useRails(
    {
      left: (
        <section className="space-y-4">
          {level === 'world' ? (
            <section className={`${RAIL_PANEL_CLS} space-y-4`} aria-labelledby="world-countries-drill-geography-heading">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p>
                <h3 id="world-countries-drill-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">Geography</h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400">Choose a Continent to enter its map-centered Drill setup.</p>
              <nav aria-label="Continents">
                <ul className="space-y-1.5">
                  {getContinentsInEffectiveOrder(entries, getWorldMetadata()).map(continent => (
                    <DrillHierarchyRailRow
                      key={continent}
                      label={continent}
                      summary={formatContinentSummary(continent, entries)}
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
            <section className={`${RAIL_PANEL_CLS} space-y-4`} aria-labelledby="world-countries-drill-scope-heading">
              <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
                <button type="button" onClick={onWorld} className="text-zinc-500 hover:text-zinc-200">World</button>
                <span className="text-zinc-700">/</span>
                <span className="text-cyan-300">{selection.continent}</span>
              </nav>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{selection.continent}</p>
                <h3 id="world-countries-drill-scope-heading" className="mt-1 text-lg font-bold text-zinc-100">Drill scope</h3>
                <p className="mt-1 text-sm text-zinc-400">Select Subregions from the rail or map.</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-zinc-500">Scope</span>
                  <span className="text-right font-semibold text-zinc-200">
                    {selectedCount} {selectedCount === 1 ? 'Subregion' : 'Subregions'} selected
                  </span>
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
          )}
        </section>
      ),
      right: (
        <DrillSetupActionRail
          mode={mode}
          groupName={modeGroupName}
          onModeChange={onModeChange}
          practiceMode={practiceMode}
          onPracticeModeChange={setPracticeMode}
          onPracticeStart={onPracticeStart}
          order={order}
          onOrderChange={onOrderChange}
          level={level}
          selection={selection}
          onStart={onStart}
          onGuidedAction={onGuidedAction}
        />
      ),
      leftLabel: 'Drill scope',
      rightLabel: 'Drill',
    },
    [entries, level, mode, modeGroupName, onGuidedAction, onPracticeStart, order, practiceMode, selection.continent, selection.subregionIds, hoveredGroupId, onHoverGroup, onWorld, onSelectContinent, onToggleSubregion, onSelectEntireContinent, onModeChange, onOrderChange, onStart],
  )

  return null
}

function DrillModeRail({
  mode,
  onModeChange,
  groupName,
}: {
  mode: WorldCountriesDrillMode
  onModeChange: (mode: WorldCountriesDrillMode) => void
  groupName: string
}) {
  const modeGroupId = useId()
  const drillHeadingId = `${modeGroupId}-drill-heading`

  return (
    <fieldset className="space-y-3" aria-labelledby={drillHeadingId}>
      <div className="space-y-2" role="group" aria-labelledby={drillHeadingId}>
        <h3 id={drillHeadingId} className="sr-only">Drill</h3>
        <div className="space-y-2">
          {WORLD_COUNTRIES_DRILL_MODES
            .filter(candidate => candidate.id !== 'capitals')
            .map(candidate => (
              <DrillModeOption
                key={candidate.id}
                candidate={candidate}
                selected={candidate.id === mode}
                onSelect={onModeChange}
                groupName={groupName}
              />
            ))}
        </div>
      </div>
    </fieldset>
  )
}

function DrillPracticePanel({
  mode,
  onModeChange,
  canStart,
  onStart,
  onLearnCountries,
}: {
  mode: PracticeMode | null
  onModeChange: (mode: PracticeMode) => void
  canStart: boolean
  onStart: (mode: DrillPracticeMode) => void
  onLearnCountries: () => void
}) {
  const practiceHeadingId = useId()
  const groupName = `world-countries-practice-mode-${useId()}`

  return (
    <section className={`${RAIL_PANEL_CLS} space-y-3`} aria-labelledby={practiceHeadingId}>
      <h2 id={practiceHeadingId} className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learn and Practise</h2>
      {PRACTICE_MODE_CANDIDATES.map(candidate => (
        <DrillModeOption
          key={candidate.id}
          candidate={candidate}
          selected={candidate.id === mode}
          onSelect={onModeChange}
          groupName={groupName}
        />
      ))}
      <button
        type="button"
        disabled={!canStart || mode === null}
        onClick={() => {
          if (mode === 'learn-countries') onLearnCountries()
          else if (mode) onStart(mode)
        }}
        className="mt-3 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start practise
      </button>
    </section>
  )
}

function DrillSetupActionRail({
  level,
  selection,
  mode,
  groupName,
  onModeChange,
  practiceMode,
  onPracticeModeChange,
  onPracticeStart,
  onGuidedAction,
  order,
  onOrderChange,
  onStart,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  groupName: string
  onModeChange: (mode: WorldCountriesDrillMode) => void
  practiceMode: PracticeMode | null
  onPracticeModeChange: (mode: PracticeMode) => void
  onPracticeStart: (mode: WorldCountriesDrillMode) => void
  onGuidedAction: (action: GuidedLearningActionId) => void
  order: WorldCountriesDrillOrder
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onStart: () => void
}) {
  return (
    <section className="space-y-4">
      <CurrentDrillPanel
        level={level}
        selection={selection}
        mode={mode}
        groupName={groupName}
        onModeChange={onModeChange}
        order={order}
        onOrderChange={onOrderChange}
        onStart={onStart}
      />

      <DrillPracticePanel
        mode={practiceMode}
        onModeChange={onPracticeModeChange}
        canStart={level === 'continent'
          && selection.subregionIds.length > 0
          && (practiceMode !== 'learn-countries' || selection.subregionIds.length === 1)}
        onStart={onPracticeStart}
        onLearnCountries={() => onGuidedAction('learn-countries')}
      />

    </section>
  )
}

function CurrentDrillPanel({
  level,
  selection,
  mode,
  groupName,
  onModeChange,
  order,
  onOrderChange,
  onStart,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  groupName: string
  onModeChange: (mode: WorldCountriesDrillMode) => void
  order: WorldCountriesDrillOrder
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onStart: () => void
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="world-countries-current-drill-heading">
      <h2 id="world-countries-current-drill-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Drill
      </h2>
      <div className="mt-4 border-t border-zinc-800 pt-4">
        <DrillModeRail mode={mode} onModeChange={onModeChange} groupName={groupName} />
      </div>
      <div className="mt-4">
        <DrillOrderPanel order={order} onOrderChange={onOrderChange} />
      </div>
      <button
        type="button"
        disabled={level !== 'continent' || selection.subregionIds.length === 0}
        onClick={onStart}
        className="mt-3 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {level === 'world' ? 'Choose a Continent first' : 'Start Drill'}
      </button>
    </section>
  )
}

function DrillOrderPanel({
  order,
  onOrderChange,
}: {
  order: WorldCountriesDrillOrder
  onOrderChange: (order: WorldCountriesDrillOrder) => void
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-3" aria-labelledby="world-countries-drill-order-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="world-countries-drill-order-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Drill order
        </h2>
        <DrillOrderSelector order={order} onSelect={onOrderChange} />
      </div>
    </section>
  )
}

function DrillOrderSelector({
  order,
  onSelect,
}: {
  order: WorldCountriesDrillOrder
  onSelect: (order: WorldCountriesDrillOrder) => void
}) {
  return (
    <div className="inline-flex h-7 shrink-0 rounded-md border border-zinc-800 bg-zinc-950/60 p-0.5" role="radiogroup" aria-labelledby="world-countries-drill-order-heading">
      <DrillOrderOption order="ordered" selected={order === 'ordered'} onSelect={onSelect}>In order</DrillOrderOption>
      <DrillOrderOption order="random" selected={order === 'random'} onSelect={onSelect}>Random</DrillOrderOption>
    </div>
  )
}

function DrillOrderOption({
  order,
  selected,
  onSelect,
  children,
}: {
  order: WorldCountriesDrillOrder
  selected: boolean
  onSelect: (order: WorldCountriesDrillOrder) => void
  children: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(order)}
      className={`min-w-[4.25rem] rounded px-2 text-xs font-semibold transition-colors ${selected
        ? 'bg-cyan-600/40 text-cyan-100 shadow-sm'
        : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}
      `}
    >
      {children}
    </button>
  )
}

type ModeOptionCandidate<Mode extends string> = {
  id: Mode
  label: string
  description: string
}

function DrillModeOption<Mode extends string>({
  candidate,
  selected,
  onSelect,
  groupName,
}: {
  candidate: ModeOptionCandidate<Mode>
  selected: boolean
  onSelect: (mode: Mode) => void
  groupName: string
}) {
  const descriptionId = `${useId()}-description`

  return (
    <label
      className={`flex min-h-[40px] w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-within:ring-2 focus-within:ring-cyan-400/70 ${selected
        ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-100'
        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'}
      `}
    >
      <input
        type="radio"
        name={groupName}
        value={candidate.id}
        checked={selected}
        onChange={() => onSelect(candidate.id)}
        aria-describedby={descriptionId}
        className="sr-only"
      />
      {selected && <span aria-hidden="true" className="text-cyan-400">✓</span>}
      <span className="min-w-0 flex-1 font-semibold">{candidate.label}</span>
      <span className="group relative shrink-0">
        <span
          tabIndex={0}
          aria-label={`Explain ${candidate.label} mode`}
          aria-describedby={descriptionId}
          title={candidate.description}
          className="flex h-5 w-5 cursor-help items-center justify-center rounded-full text-sm text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <span aria-hidden="true">ⓘ</span>
        </span>
        <span
          id={descriptionId}
          role="tooltip"
          className="pointer-events-none invisible absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 max-w-[calc(100vw-3rem)] rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-left text-xs leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
        >
          {candidate.description}
        </span>
      </span>
    </label>
  )
}

function DrillHierarchyRailRow({
  label,
  summary,
  groupId,
  hoveredGroupId,
  onClick,
  onHoverGroup,
  selected = false,
}: {
  label: string
  summary?: string
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
        <span className="min-w-0 flex-1">
          <span className="block truncate">{label}</span>
          {summary && <span className="mt-0.5 block text-xs text-zinc-500">{summary}</span>}
        </span>
      </button>
    </li>
  )
}

function formatContinentSummary(continent: Continent, entries: readonly Country[]): string {
  const subregionCount = getSubregionsForContinentInEffectiveOrder(
    continent,
    entries,
    getContinentMetadata(continent),
  ).length
  const countryCount = getCountriesForContinent(continent, entries).length
  return `${formatCount(subregionCount, 'Subregion', 'Subregions')} · ${formatCount(countryCount, 'Country', 'Countries')}`
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function DrillSessionRails({
  selection,
  mode,
  state,
  onExit,
  entries,
}: {
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  state: DrillSessionState
  onExit: () => void
  entries: readonly Country[]
}) {
  const step = getCurrentDrillStep(state)
  const totalSteps = getDrillSessionTotalSteps(state)
  const completedSteps = state.countryIndex * getDrillModeDefinition(mode).skills.length + state.stepIndex
  const progressPercent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0
  const subregions = getSubregionsForContinentInEffectiveOrder(
    selection.continent,
    entries,
    getContinentMetadata(selection.continent),
  )

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
    [entries, mode, onExit, selection.continent, selection.subregionIds, state.countryIndex, state.countryOrder.length, state.stepIndex, step?.skill, totalSteps, progressPercent],
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
