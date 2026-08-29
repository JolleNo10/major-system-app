import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { CountryCapitalMnemonicPanel } from '@/features/world-countries/mnemonics/CountryCapitalMnemonicPanel'
import { getDrillSelectionScopeLabel, type WorldCountriesDrillSelection } from './drillSelection'
import { getDrillModeDefinition, type WorldCountriesDrillMode } from './drillModes'
import { getCurrentDrillStep, type DrillSessionState } from './drillSessionState'
import { deriveDrillSessionProgress } from './drillSessionProgress'
import { WorldCountriesSessionProgressBar } from '@/features/world-countries/ui/WorldCountriesActivity'
import type { WorldCountriesProficiencySelection } from './drillProficiencyScope'

export function DrillSessionRails({
  selection,
  scopeLabel: providedScopeLabel,
  proficiencySelection = [],
  mode,
  state,
  entries,
  mnemonicOpen,
  onOpenMnemonic,
  onCloseMnemonic,
}: {
  selection: WorldCountriesDrillSelection
  scopeLabel?: string
  proficiencySelection?: WorldCountriesProficiencySelection
  mode: WorldCountriesDrillMode
  state: DrillSessionState
  entries: readonly Country[]
  mnemonicOpen: boolean
  onOpenMnemonic: () => void
  onCloseMnemonic: () => void
}) {
  const step = getCurrentDrillStep(state)
  const country = step ? entries.find(entry => entry.id === step.countryId) : undefined
  const { progressPercent, countryPosition, totalCountries } = deriveDrillSessionProgress(state)
  const subregions = useMemo(() => selection.subregionIds.map(getSubregionDefinition), [selection.subregionIds])
  const scopeLabel = providedScopeLabel ?? getDrillSelectionScopeLabel(selection, entries)

  const rails = useMemo(() => ({
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-drill-session-context-heading">
          <GeographyBreadcrumbs items={[{ label: 'World' }, { label: scopeLabel, current: true }]} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Selected geography</p>
            <h2 id="world-countries-drill-session-context-heading" className="mt-1 text-lg font-bold text-zinc-100">{scopeLabel}</h2>
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
            <WorldCountriesSessionProgressBar progressPercent={progressPercent} label="Drill progress" />
            <p className="mt-2 text-xs tabular-nums text-zinc-500">Country {countryPosition} / {totalCountries}</p>
          </div>
          {step && country && (
            <>
              <button type="button" onClick={mnemonicOpen ? onCloseMnemonic : onOpenMnemonic} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-cyan-300 hover:border-cyan-500 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
                {mnemonicOpen ? 'Hide mnemonics' : 'Show mnemonics'}
              </button>
              {mnemonicOpen && <CountryCapitalMnemonicPanel country={country} />}
            </>
          )}
        </section>
      ),
      leftLabel: 'Selected geography',
      rightLabel: 'Session',
    }), [country, mnemonicOpen, mode, onCloseMnemonic, onOpenMnemonic, proficiencySelection, scopeLabel, selection.subregionIds, state.countryIds.length, progressPercent, countryPosition, subregions, totalCountries, step])
  useRails(rails)

  return null
}
