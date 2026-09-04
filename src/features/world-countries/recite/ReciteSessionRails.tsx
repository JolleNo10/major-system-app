import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionDefinition } from '@/features/world-countries/data/subregions'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import type { ActiveReciteRun, ReciteSessionPhase } from './ReciteSessionView'
import { getReciteAssistanceLabel, getReciteModeLabel } from './ReciteSetup'
import { getCurrentRecitePrompt } from './reciteSession'

export function ReciteSessionRails({ run, phase, onExit }: { run: ActiveReciteRun; phase: ReciteSessionPhase; onExit: () => void }) {
  const rails = useMemo(() => ({
    left: <ReciteSessionGeographyRail run={run} onExit={onExit} />,
    right: <ReciteSessionControls run={run} phase={phase} onExit={onExit} />,
    leftLabel: 'Geography',
    rightLabel: 'Recite',
  }), [onExit, phase, run])
  useRails(rails)
  return null
}

function ReciteSessionGeographyRail({ run, onExit }: { run: ActiveReciteRun; onExit: () => void }) {
  const currentPrompt = getCurrentRecitePrompt(run.session)
  const currentContinent = currentPrompt
    ? run.scopeCountries.find(country => country.id === currentPrompt.countryId)?.continent
    : undefined
  const groups = groupReciteSubregionsByContinent(run)

  return (
    <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-recite-session-geography-heading">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Selected geography</p>
        <h2 id="world-countries-recite-session-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">Recite context</h2>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
        <p className="text-xs uppercase tracking-wider text-zinc-500">{run.scopeLabel} scope</p>
        <ul className="mt-2 space-y-3 text-sm text-zinc-300">
          {groups.map(group => (
            <li key={group.continent} aria-current={group.continent === currentContinent ? 'location' : undefined} data-current-continent={group.continent === currentContinent ? 'true' : undefined}>
              <p className={`font-semibold ${group.continent === currentContinent ? 'text-cyan-200' : 'text-zinc-200'}`}>{group.continent}</p>
              <ul className="mt-1 space-y-1 pl-3 text-zinc-400">
                {group.subregions.map(subregion => <li key={subregion.id}>{subregion.label}</li>)}
              </ul>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">{run.session.countries.length} Countries in this ordered snapshot</p>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">The map is a geographic scaffold. Answer through the Recite prompt.</p>
      <button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">Back to setup</button>
    </WorldCountriesPanel>
  )
}

function groupReciteSubregionsByContinent(run: ActiveReciteRun): readonly { continent: Continent; subregions: readonly SubregionDefinition[] }[] {
  const groups: Array<{ continent: Continent; subregions: SubregionDefinition[] }> = []
  for (const subregionId of run.subregionIds) {
    const subregion = getSubregionDefinition(subregionId)
    const group = groups.find(candidate => candidate.continent === subregion.continent)
    if (group) group.subregions.push(subregion)
    else groups.push({ continent: subregion.continent, subregions: [subregion] })
  }
  return groups
}

function ReciteSessionControls({ run, phase, onExit }: { run: ActiveReciteRun; phase: ReciteSessionPhase; onExit: () => void }) {
  const current = getCurrentRecitePrompt(run.session)
  return (
    <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-recite-session-controls-heading">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Recite</p>
        <h2 id="world-countries-recite-session-controls-heading" className="mt-1 text-lg font-bold text-zinc-100">Session</h2>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Mode</p>
        <p className="mt-1 text-sm font-semibold text-zinc-200">{getReciteModeLabel(run.mode)}</p>
        <p className="mt-1 text-xs text-zinc-500">{getReciteAssistanceLabel(run.assistance)}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, current ? ((current.countryIndex + (current.kind === 'capital' ? 0.5 : 0)) / run.session.countries.length) * 100 : 100)}%` }} /></div>
        <p className="mt-2 text-xs tabular-nums text-zinc-500">{phase === 'complete' ? run.session.countries.length : (current?.countryIndex ?? run.session.countries.length) + 1} / {run.session.countries.length} Countries</p>
      </div>
      <button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">Back to setup</button>
    </WorldCountriesPanel>
  )
}
