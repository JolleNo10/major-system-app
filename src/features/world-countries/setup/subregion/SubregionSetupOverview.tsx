import type { Country } from '@/features/world-countries/data/countries'
import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { countryCapitalMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { SetupMnemonicEditor } from '../SetupMnemonicEditor'

/** Map-centered inspection surface. It intentionally has no learning actions. */
export function SubregionSetupOverview({
  continent,
  subregion,
  entries,
  highlightedCountryId = null,
  mnemonicVersion,
  onMnemonicChanged,
  mapEntries = entries,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  highlightedCountryId?: string | null
  mnemonicVersion?: number
  onMnemonicChanged?: () => void
  mapEntries?: readonly Country[]
}) {
  const definition = getSubregionDefinition(subregion)
  return (
    <div className="space-y-4 animate-fade-in">
      <WorldCountriesPanel>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Setup</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">{definition.label}</h1>
        <p className="mt-1 text-sm text-zinc-500">{entries.length} countries · {continent}</p>
      </WorldCountriesPanel>

      <CountryLearningMap
        continent={continent}
        scopeCountries={mapEntries}
        showNames
        showOrderNumbers
        highlightedCountryId={highlightedCountryId}
        ariaLabel={`Map of ${definition.label} for setup`}
      />

      <section className="space-y-3" aria-labelledby="setup-country-capital-mnemonics-heading">
        <div>
          <h2 id="setup-country-capital-mnemonics-heading" className="font-semibold text-zinc-100">Country–Capital mnemonics</h2>
          <p className="mt-1 text-sm text-zinc-400">Author optional stories or images for each relationship. These aids are read-only during learning.</p>
        </div>
        {entries.map(entry => (
          <SetupMnemonicEditor
            key={entry.id}
            targetId={countryCapitalMnemonicId(entry)}
            title={`${entry.country} ↔ ${entry.capital}`}
            subtitle="Optional memory aid for this relationship"
            refreshKey={`${entry.id}-${mnemonicVersion ?? 0}`}
            onChanged={onMnemonicChanged ?? (() => undefined)}
          />
        ))}
      </section>
    </div>
  )
}
