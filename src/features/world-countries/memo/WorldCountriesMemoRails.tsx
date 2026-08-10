import { useRails } from '@/app/layout/PageLayoutContext'
import type { ReactNode } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import {
  getContinentMemoReadinessProgress,
  getNextSubregionToMemo,
  getSubregionMemoReadinessProgress,
  type MemoLearningStates,
  type MemoMilestone,
  type MemoReadinessProgress,
} from './memoProgress'
import {
  deriveWorldCountriesMemoReadinessFromTracks,
  getWorldCountriesMemoReadinessLabel,
} from '@/features/world-countries/learning/memoReadiness'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { countryCapitalMnemonicId, subregionMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import type { CountryLearningPhase } from '@/features/world-countries/learning/countryLearningFlow'
import type { CapitalLearningPhase } from '@/features/world-countries/learning/capitalLearningFlow'
import { MemoMnemonicCard } from './MemoMnemonicCard'

interface WorldOverviewRailsProps {
  continents: readonly Continent[]
  progress: MemoReadinessProgress
  learningStates: MemoLearningStates
  hoveredGroupId: string | null
  onSelectContinent: (continent: Continent) => void
  onHoverGroup: (groupId: string | null) => void
}

export function WorldOverviewRails({
  continents,
  progress,
  learningStates,
  hoveredGroupId,
  onSelectContinent,
  onHoverGroup,
}: WorldOverviewRailsProps) {
  useRails(
    {
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-continents-rail-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p>
            <h2 id="world-countries-continents-rail-heading" className="mt-1 text-lg font-bold text-zinc-100">Continents</h2>
          </div>

          <ProgressSummary label="World Memo progress" progress={progress} />

          <nav aria-label="Continents">
            <ul className="space-y-1.5">
              {continents.map(continent => (
                <MemoHierarchyRailRow
                  key={continent}
                  label={continent}
                  groupId={getContinentHoverGroupId(continent)}
                  hoveredGroupId={hoveredGroupId}
                  onClick={() => onSelectContinent(continent)}
                  onHoverGroup={onHoverGroup}
                  trailing={formatContinentProgress(getContinentMemoReadinessProgress(continent, learningStates))}
                />
              ))}
            </ul>
          </nav>
        </section>
      ),
      leftLabel: 'Continents',
    },
    [continents, learningStates, progress, hoveredGroupId, onSelectContinent, onHoverGroup],
  )

  return null
}

interface ContinentOverviewRailsProps {
  continent: Continent
  subregions: readonly SubregionDefinition[]
  progress: MemoReadinessProgress
  learningStates: MemoLearningStates
  hoveredGroupId: string | null
  onWorld: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onHoverGroup: (groupId: string | null) => void
  onEditOrder: () => void
}

export function ContinentOverviewRails({
  continent,
  subregions,
  progress,
  learningStates,
  hoveredGroupId,
  onWorld,
  onSelectSubregion,
  onHoverGroup,
  onEditOrder,
}: ContinentOverviewRailsProps) {
  const nextSubregion = getNextSubregionToMemo(
    subregions,
    subregion => getSubregionMemoReadinessProgress(subregion, learningStates).readiness !== 'NOT_MEMOED',
  )

  useRails(
    {
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-subregions-rail-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <button type="button" onClick={onWorld} className="text-zinc-500 hover:text-zinc-200">World</button>
            <span className="text-zinc-700">/</span>
            <span className="text-cyan-300">{continent}</span>
          </nav>

          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{continent}</p>
              <h2 id="world-countries-subregions-rail-heading" className="mt-1 text-lg font-bold text-zinc-100">Subregions</h2>
            </div>
            <button type="button" onClick={onEditOrder} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">
              Edit order
            </button>
          </div>

          <ProgressSummary label="Continent Memo progress" progress={progress} />

          <nav aria-label={`${continent} Subregions`}>
            <ol className="space-y-1.5">
              {subregions.map((subregion, index) => (
                <MemoHierarchyRailRow
                  key={subregion.id}
                  label={subregion.label}
                  groupId={getSubregionHoverGroupId(subregion.label)}
                  hoveredGroupId={hoveredGroupId}
                  onClick={() => onSelectSubregion(subregion.id)}
                  onHoverGroup={onHoverGroup}
                  sequenceNumber={index + 1}
                  trailing={getWorldCountriesMemoReadinessLabel(getSubregionMemoReadinessProgress(subregion.id, learningStates).readiness)}
                />
              ))}
            </ol>
          </nav>
        </section>
      ),
      right: (
        <NextToMemoPanel
          nextSubregion={nextSubregion}
          onSelectSubregion={onSelectSubregion}
        />
      ),
      leftLabel: 'Subregions',
      rightLabel: 'Next to memo',
    },
    [continent, learningStates, subregions, nextSubregion, progress, hoveredGroupId, onWorld, onSelectSubregion, onHoverGroup, onEditOrder],
  )

  return null
}

interface MemoHierarchyRailRowProps {
  label: string
  onClick: () => void
  groupId: string
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  sequenceNumber?: number
  trailing?: ReactNode
}

function MemoHierarchyRailRow({
  label,
  onClick,
  groupId,
  hoveredGroupId,
  onHoverGroup,
  sequenceNumber,
  trailing,
}: MemoHierarchyRailRowProps) {
  const hovered = hoveredGroupId === groupId

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => onHoverGroup(groupId)}
        onMouseLeave={() => onHoverGroup(null)}
        onFocus={() => onHoverGroup(groupId)}
        onBlur={() => onHoverGroup(null)}
        className={`flex min-h-[40px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
          hovered
            ? 'border-cyan-500 bg-cyan-950/60 text-zinc-100'
            : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'
        }`}
      >
        {sequenceNumber !== undefined && (
          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-600">{sequenceNumber}.</span>
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {trailing !== undefined && (
          <span className="shrink-0 text-xs tabular-nums text-zinc-500">{trailing}</span>
        )}
      </button>
    </li>
  )
}

interface SubregionRailNavigation {
  continent: Continent
  subregion: SubregionId
  onWorld: () => void
  onContinent: () => void
  nextSubregion: SubregionDefinition | null
  onSelectSubregion: (subregion: SubregionId) => void
}

interface SubregionRailContent {
  entries: readonly Country[]
  learned: boolean
  capitalsLearned: boolean
  track: 'countries' | 'capitals'
  capitalWalkthroughCountryId: string | null
  capitalRecallCorrectionCountryId: string | null
  mnemonicVersion: number
  onMnemonicChanged: () => void
}

interface SubregionOverviewRailsProps {
  phase: 'overview' | CountryLearningPhase | CapitalLearningPhase
  navigation: SubregionRailNavigation
  content: SubregionRailContent
  onEditOrder: () => void
}

export function SubregionOverviewRails({
  phase,
  navigation,
  content,
  onEditOrder,
}: SubregionOverviewRailsProps) {
  const { continent, subregion, onWorld, onContinent, nextSubregion, onSelectSubregion } = navigation
  const { entries, learned, capitalsLearned, track, capitalWalkthroughCountryId, capitalRecallCorrectionCountryId, mnemonicVersion, onMnemonicChanged } = content
  const visible = phase !== 'ordered-recall' && phase !== 'recall' && phase !== 'complete'
  const showSubregionMnemonic = visible && track === 'countries'
  const capitalWalkthroughCountry = capitalWalkthroughCountryId
    ? entries.find(entry => entry.id === capitalWalkthroughCountryId) ?? null
    : null
  const showCapitalMnemonic = visible && track === 'capitals' && phase === 'walkthrough' && capitalWalkthroughCountry !== null
  const capitalRecallCorrectionCountry = capitalRecallCorrectionCountryId
    ? entries.find(entry => entry.id === capitalRecallCorrectionCountryId) ?? null
    : null
  const showCapitalCorrectionMnemonic = track === 'capitals' && phase === 'recall' && capitalRecallCorrectionCountry !== null
  const trackPresentation = {
    countries: { learned, label: 'Countries' },
    capitals: { learned: capitalsLearned, label: 'Capitals' },
  }[track]
  const showNextToMemo = phase === 'overview' && nextSubregion?.id !== subregion

  useRails(
    {
      left: visible ? (
        <section className="space-y-4" aria-labelledby="world-countries-learning-context-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <button type="button" onClick={onWorld} className="text-zinc-500 hover:text-zinc-200">World</button>
            <span className="text-zinc-700">/</span>
            <button type="button" onClick={onContinent} className="text-zinc-500 hover:text-zinc-200">{continent}</button>
            <span className="text-zinc-700">/</span>
            <span className="text-cyan-300">{getSubregionDefinition(subregion).label}</span>
          </nav>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Subregion</p>
            <h2 id="world-countries-learning-context-heading" className="mt-1 text-lg font-bold text-zinc-100">Learning context</h2>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Learning status</p>
            {phase === 'overview' ? (
              <div className="mt-1 space-y-1 text-sm font-semibold">
                <p className="text-violet-300">
                  Memo readiness: {getWorldCountriesMemoReadinessLabel(deriveWorldCountriesMemoReadinessFromTracks(learned, capitalsLearned))}
                </p>
                <p className={learned ? 'text-green-300' : 'text-zinc-300'}>
                  {learned ? 'Countries learned ✓' : 'Countries not learned'}
                </p>
                <p className={capitalsLearned ? 'text-green-300' : 'text-zinc-300'}>
                  {capitalsLearned ? 'Capitals learned ✓' : 'Capitals not learned'}
                </p>
                {!learned && capitalsLearned && (
                  <p className="pt-1 text-xs font-normal leading-relaxed text-amber-300">
                    Capital completion is preserved. Complete Countries first to unlock Capital review and practice.
                  </p>
                )}
              </div>
            ) : (
              <p className={`mt-1 text-sm font-semibold ${trackPresentation.learned ? 'text-green-300' : 'text-zinc-300'}`}>
                {trackPresentation.learned ? `${trackPresentation.label} learned ✓` : `${trackPresentation.label} not learned`}
              </p>
            )}
          </div>
          <section aria-labelledby="learning-order-rail-heading">
            <div className="flex items-center justify-between gap-2">
              <h3 id="learning-order-rail-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learning order</h3>
              {phase === 'overview' && (
                <button type="button" onClick={onEditOrder} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">
                  Edit order
                </button>
              )}
            </div>
            <ol className="mt-3 space-y-1.5 text-sm text-zinc-300">
              {entries.map((entry, index) => (
                <li key={entry.id} className="flex gap-2">
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-600">{index + 1}.</span>
                  <span className="min-w-0 break-words">{entry.country}</span>
                </li>
              ))}
            </ol>
          </section>
        </section>
      ) : undefined,
      right: visible || showCapitalCorrectionMnemonic ? (
        <div className="w-full space-y-3">
          {showNextToMemo && (
            <NextToMemoPanel
              nextSubregion={nextSubregion}
              onSelectSubregion={onSelectSubregion}
            />
          )}
          {showSubregionMnemonic ? (
            <MemoMnemonicCard
              targetId={subregionMnemonicId(subregion)}
              title="Subregion memory aid"
              subtitle={`Optional story or picture for this ordered ${entries.length}-country group`}
              countryIds={entries.map(entry => entry.id)}
              refreshKey={mnemonicVersion}
              onChanged={onMnemonicChanged}
            />
          ) : showCapitalMnemonic && capitalWalkthroughCountry ? (
            <MemoMnemonicCard
              targetId={countryCapitalMnemonicId(capitalWalkthroughCountry)}
              title={`${capitalWalkthroughCountry.country} ↔ ${capitalWalkthroughCountry.capital}`}
              subtitle="Optional memory aid for this Country–Capital relationship"
              refreshKey={`${capitalWalkthroughCountry.id}-${mnemonicVersion}`}
              onChanged={onMnemonicChanged}
            />
          ) : showCapitalCorrectionMnemonic && capitalRecallCorrectionCountry ? (
            <MemoMnemonicCard
              targetId={countryCapitalMnemonicId(capitalRecallCorrectionCountry)}
              title={`${capitalRecallCorrectionCountry.country} ↔ ${capitalRecallCorrectionCountry.capital}`}
              subtitle="Optional memory aid for the correction"
              refreshKey={`${capitalRecallCorrectionCountry.id}-${mnemonicVersion}`}
              onChanged={onMnemonicChanged}
            />
          ) : null}
        </div>
      ) : undefined,
      leftLabel: 'Learning context',
      rightLabel: showNextToMemo ? 'Memo tools' : showSubregionMnemonic || showCapitalMnemonic || showCapitalCorrectionMnemonic ? 'Memory aid' : undefined,
    },
    [visible, showNextToMemo, showSubregionMnemonic, showCapitalMnemonic, showCapitalCorrectionMnemonic, capitalWalkthroughCountry, capitalRecallCorrectionCountry, continent, subregion, entries, track, trackPresentation.learned, trackPresentation.label, mnemonicVersion, learned, capitalsLearned, onWorld, onContinent, nextSubregion, onSelectSubregion, onEditOrder, onMnemonicChanged],
  )

  return null
}

function NextToMemoPanel({
  nextSubregion,
  onSelectSubregion,
}: {
  nextSubregion: SubregionDefinition | null
  onSelectSubregion: (subregion: SubregionId) => void
}) {
  const hasNext = nextSubregion !== null

  return (
    <section
      aria-labelledby="world-countries-next-to-memo-heading"
      aria-disabled={!hasNext}
      className={`rounded-xl border bg-zinc-900 p-4 ${hasNext ? 'border-zinc-800' : 'border-zinc-800 opacity-70'}`}
    >
      <h3 id="world-countries-next-to-memo-heading" className="text-sm font-semibold text-zinc-200">Next to memo</h3>
      <div className={`mt-3 rounded-lg border px-3 py-2.5 ${hasNext ? 'border-cyan-500/40 bg-cyan-600/10' : 'border-zinc-800 bg-zinc-800/40'}`}>
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{hasNext ? 'Unmemoed subregion' : 'Complete'}</p>
        <p className={`mt-1 text-sm font-semibold ${hasNext ? 'text-cyan-300' : 'text-zinc-500'}`}>
          {nextSubregion?.label ?? 'All subregions learned'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          if (nextSubregion) onSelectSubregion(nextSubregion.id)
        }}
        disabled={!hasNext}
        className="mt-3 w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {hasNext ? 'Open subregion →' : 'All subregions learned'}
      </button>
    </section>
  )
}

function ProgressSummary({ label, progress }: { label: string; progress: MemoReadinessProgress }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3" aria-label={label}>
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="mt-3 space-y-3">
        <MemoMilestone label="Countries memoed" milestone={progress.countriesMemoed} color="bg-violet-500" />
        <MemoMilestone label="Countries + Capitals memoed" milestone={progress.countriesAndCapitalsMemoed} color="bg-fuchsia-500" />
      </div>
    </div>
  )
}

function MemoMilestone({ label, milestone, color }: { label: string; milestone: MemoMilestone; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-zinc-200">{milestone.count}/{milestone.total} Subregions</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${milestone.ratio * 100}%` }} />
      </div>
    </div>
  )
}

function formatContinentProgress(progress: MemoReadinessProgress): string {
  return `${progress.countriesMemoed.count}/${progress.countriesMemoed.total} Subregions`
}
