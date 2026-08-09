import { useMemo, useState } from 'react'
import { matchesPlaceName } from '@/features/world-countries/domain/answerMatching'
import { countryCapitalMnemonicId, subregionMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import { getCountryId } from '@/features/world-countries/domain/country'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForSubregionInEffectiveOrder } from '@/features/world-countries/domain/geography'
import { getSubregionMetadata, resetSubregionCountryOrder, setSubregionCountryOrder } from '@/features/world-countries/persistence/subregionMetadataStore'
import { isCountryMemoed, markCountryMemoed } from './memoStore'
import { MemoMnemonicCard } from './MemoMnemonicCard'
import type { Continent, Country } from '@/features/world-countries/data/countries'

interface CountryMemoItemProps {
  country: Country
  memoed: boolean
  onMemoed: () => void
  refreshKey: number
  onMnemonicChanged: () => void
}

function CountryMemoItem({ country, memoed, onMemoed, refreshKey, onMnemonicChanged }: CountryMemoItemProps) {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  const checkAnswer = () => {
    const correct = matchesPlaceName(answer, country.capital)
    setFeedback(correct ? 'correct' : 'wrong')
    if (correct) {
      onMemoed()
    }
  }

  return (
    <article className={`rounded-xl border p-4 ${memoed ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-zinc-100">{country.country}</h4>
          <p className="mt-1 text-sm text-zinc-500">Capital: <span className="text-zinc-300">{country.capital}</span></p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${memoed ? 'bg-green-500/15 text-green-300' : 'bg-zinc-800 text-zinc-500'}`}>
          {memoed ? 'Memoed ✓' : 'Not memoed'}
        </span>
      </div>

      {!memoed && (
        <div className="mt-4 space-y-2">
          <label htmlFor={`memo-answer-${country.id ?? country.country}`} className="text-xs text-zinc-500">Recall the capital</label>
          <div className="flex gap-2">
            <input
              id={`memo-answer-${country.id ?? country.country}`}
              autoComplete="off"
              value={answer}
              onChange={event => { setAnswer(event.target.value); setFeedback(null) }}
              onKeyDown={event => { if (event.key === 'Enter') checkAnswer() }}
              placeholder="Type the capital…"
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500"
            />
            <button type="button" onClick={checkAnswer} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
              Check
            </button>
          </div>
          {feedback === 'correct' && <p className="text-xs text-green-300">Correct — this Country–Capital fact is now memoed.</p>}
          {feedback === 'wrong' && <p className="text-xs text-red-300">Not quite. Try again, or reveal: {country.capital}.</p>}
        </div>
      )}

      <div className="mt-4 border-t border-zinc-800 pt-4">
        <MemoMnemonicCard
          targetId={countryCapitalMnemonicId(country)}
          title={`${country.country} ↔ ${country.capital}`}
          subtitle="One shared story for either future recall direction"
          refreshKey={refreshKey}
          onChanged={onMnemonicChanged}
        />
      </div>
    </article>
  )
}

export function MemoWorkspace({
  continent,
  subregion,
  memoedCountryIds,
  onMemoed,
}: {
  continent: Continent
  subregion: SubregionId
  memoedCountryIds: ReadonlySet<string>
  onMemoed: (ids: Set<string>) => void
}) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [orderVersion, setOrderVersion] = useState(0)
  const definition = getSubregionDefinition(subregion)
  const entries = useMemo(
    () => getCountriesForSubregionInEffectiveOrder(subregion, undefined, getSubregionMetadata(subregion)),
    [orderVersion, subregion],
  )
  const countryIds = useMemo(() => entries.map(getCountryId), [entries])
  const subregionProgress = entries.reduce((count, country) => count + (isCountryMemoed(country, memoedCountryIds) ? 1 : 0), 0)

  const moveCountry = (index: number, offset: -1 | 1) => {
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= entries.length) return
    const next = entries.map(getCountryId)
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    setSubregionCountryOrder(subregion, next)
    setOrderVersion(value => value + 1)
  }

  const resetOrder = () => {
    resetSubregionCountryOrder(subregion)
    setOrderVersion(value => value + 1)
  }

  return (
    <section className="space-y-4" aria-labelledby="memo-workspace-heading">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="memo-workspace-heading" className="text-xl font-bold text-zinc-100">{definition.label} Memo</h2>
            <p className="mt-1 text-sm text-zinc-500">{entries.length} Country–Capital facts in {continent}.</p>
          </div>
          <span className="text-sm tabular-nums text-cyan-300">{subregionProgress}/{entries.length} memoed</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${entries.length ? (subregionProgress / entries.length) * 100 : 0}%` }} />
        </div>
      </div>

      <MemoMnemonicCard
        targetId={subregionMnemonicId(subregion)}
        title={`${definition.label} mnemonic`}
        subtitle={`One story for the ordered ${countryIds.length}-country group`}
        countryIds={countryIds}
        refreshKey={refreshKey}
        onChanged={() => setRefreshKey(value => value + 1)}
      />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="subregion-order-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="subregion-order-heading" className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Country order</h3>
            <p className="mt-1 text-xs text-zinc-600">Shared by Memo and future Recite workflows.</p>
          </div>
          <button
            type="button"
            onClick={resetOrder}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-cyan-500 hover:text-zinc-200"
          >
            Reset canonical order
          </button>
        </div>
        <ol className="mt-3 space-y-2">
          {entries.map((country, index) => (
            <li key={country.id ?? country.country} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
              <span className="w-6 text-xs tabular-nums text-zinc-600">{index + 1}.</span>
              <span className="min-w-0 flex-1 text-sm text-zinc-300">{country.country}</span>
              <button
                type="button"
                onClick={() => moveCountry(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${country.country} up`}
                className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 enabled:hover:border-cyan-500 enabled:hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveCountry(index, 1)}
                disabled={index === entries.length - 1}
                aria-label={`Move ${country.country} down`}
                className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 enabled:hover:border-cyan-500 enabled:hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
      </section>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Countries and capitals</h3>
          <span className="text-xs text-zinc-600">Memo state is separate from mastery</span>
        </div>
        {entries.map(country => (
          <CountryMemoItem
            key={country.id ?? country.country}
            country={country}
            memoed={isCountryMemoed(country, memoedCountryIds)}
            onMemoed={() => onMemoed(markCountryMemoed(country))}
            refreshKey={refreshKey}
            onMnemonicChanged={() => setRefreshKey(value => value + 1)}
          />
        ))}
      </div>
      {entries.length === 0 && <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-500">No countries are available for this Subregion.</p>}
    </section>
  )
}
