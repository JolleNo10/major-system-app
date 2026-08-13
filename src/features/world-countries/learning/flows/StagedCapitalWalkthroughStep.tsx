import { useEffect } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'
import { LearningHeader } from './MemoryPreviewStep'

export function StagedCapitalWalkthroughStep({
  continent, entries, index, setNumber, hoveredCountryId, onMove, onContinue, onExit, surface = false,
}: {
  continent: Continent
  entries: readonly Country[]
  index: number
  setNumber: number
  hoveredCountryId?: string | null
  onMove: (offset: -1 | 1) => void
  onContinue: () => void
  onExit: () => void
  surface?: boolean
}) {
  const country = entries[index]
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="button"]')) return
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault()
        onMove(-1)
      } else if (event.key === 'ArrowRight' && index < entries.length - 1) {
        event.preventDefault()
        onMove(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [entries.length, index, onMove])
  if (!country) return null
  const status = (
    <>
      <span className="block text-xs font-semibold uppercase tracking-wider text-cyan-400">Study this relationship</span>
      <span className="mt-1 block text-2xl font-black text-zinc-100">{country.country} <span aria-hidden="true" className="text-sm text-zinc-600">↔</span> <span className="text-lg text-green-300">{country.capital}</span></span>
      <span className="mt-1 block text-xs text-zinc-500">Country · location context · capital</span>
    </>
  )
  const controls = (
    <TaskDock variant="navigation" status={surface ? undefined : status} enableEnterPrimary>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-30">← Previous</button>
        {index < entries.length - 1 ? <button type="button" data-primary-action onClick={() => onMove(1)} className="min-w-0 flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Next →</button> : <button type="button" data-primary-action onClick={onContinue} className="min-w-0 flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Continue to Practice</button>}
      </div>
    </TaskDock>
  )
  if (surface) return controls
  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label={`Set ${setNumber} · Step 1 - Review`} title={`${index + 1} / ${entries.length}`} onExit={onExit} />
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Study this relationship</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0.5"><h2 className="text-2xl font-black text-zinc-100">{country.country}</h2><span aria-hidden="true" className="text-sm text-zinc-600">↔</span><p className="text-lg font-semibold text-green-300">{country.capital}</p></div>
        <p className="mt-1 text-xs text-zinc-500">Country · location context · capital</p>
      </section>
      <CountryLearningMap continent={continent} scopeCountries={entries} namedCountryId={country.id} highlightedCountryId={country.id} hoveredCountryId={hoveredCountryId} showOrderNumbers ariaLabel={`${country.country} highlighted on the map`} />
      {controls}
    </div>
  )
}
