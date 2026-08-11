import type { Country } from '@/features/world-countries/data/countries'
import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { countryCapitalMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import { PrepareMnemonicEditor } from '../PrepareMnemonicEditor'

/** Map-centered inspection surface. It intentionally has no learning actions. */
export function SubregionPrepareOverview({
  continent,
  subregion,
  entries,
  highlightedCountryId = null,
  learned,
  capitalsLearned,
  mnemonicVersion,
  onMnemonicChanged,
  mapEntries = entries,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  highlightedCountryId?: string | null
  learned: boolean
  capitalsLearned: boolean
  mnemonicVersion?: number
  onMnemonicChanged?: () => void
  mapEntries?: readonly Country[]
}) {
  const definition = getSubregionDefinition(subregion)
  return (
    <div className="space-y-4 animate-fade-in">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Prepare</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">{definition.label}</h1>
        <p className="mt-1 text-sm text-zinc-500">{entries.length} countries · {continent}</p>
      </section>

      <section className="space-y-3" aria-labelledby="prepare-country-capital-mnemonics-heading">
        <div>
          <h2 id="prepare-country-capital-mnemonics-heading" className="font-semibold text-zinc-100">Country–Capital mnemonics</h2>
          <p className="mt-1 text-sm text-zinc-400">Author optional stories or images for each relationship. These aids are read-only during Drill learning.</p>
        </div>
        {entries.map(entry => (
          <PrepareMnemonicEditor
            key={entry.id}
            targetId={countryCapitalMnemonicId(entry)}
            title={`${entry.country} ↔ ${entry.capital}`}
            subtitle="Optional memory aid for this relationship"
            refreshKey={`${entry.id}-${mnemonicVersion ?? 0}`}
            onChanged={onMnemonicChanged ?? (() => undefined)}
          />
        ))}
      </section>

      <CountryLearningMap
        continent={continent}
        scopeCountries={mapEntries}
        showNames
        showOrderNumbers
        highlightedCountryId={highlightedCountryId}
        ariaLabel={`Map of ${definition.label} for preparation`}
      />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-semibold text-zinc-100">Countries</h2>
        <p className="mt-1 text-sm text-zinc-400">Inspect the map, reference material, mnemonic, and learning order here.</p>
        <p className="mt-3 text-sm text-zinc-500">{learned ? 'Countries are marked learned.' : 'Countries are not learned yet.'}</p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-semibold text-zinc-100">Capitals</h2>
        <p className="mt-1 text-sm text-zinc-400">Capital learning and review are launched from Drill.</p>
        <p className="mt-3 text-sm text-zinc-500">{capitalsLearned ? 'Capitals are marked learned.' : 'Capitals are not learned yet.'}</p>
      </section>
    </div>
  )
}
