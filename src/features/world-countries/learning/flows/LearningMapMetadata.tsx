import type { Country } from '@/features/world-countries/data/countries'

export function LearningMapMetadata({
  scopeLabel,
  fullEntries,
  activeEntries,
  activeScopeLabel,
}: {
  scopeLabel: string
  fullEntries: readonly Country[]
  activeEntries: readonly Country[]
  activeScopeLabel: string
}) {
  const fullEntryIds = new Set(fullEntries.map(entry => entry.id))
  const activeScopeIsFull = activeEntries.length === fullEntries.length
    && activeEntries.every(entry => fullEntryIds.has(entry.id))
  const activeCountLabel = activeScopeIsFull
    ? `${activeScopeLabel} · all ${activeEntries.length} Countries`
    : `${activeScopeLabel} · ${activeEntries.length} ${activeEntries.length === 1 ? 'Country' : 'Countries'}`
  const fullScopeLabel = activeScopeIsFull
    ? `${scopeLabel} · full Subregion`
    : `${scopeLabel} · ${fullEntries.length} Countries total`

  return (
    <div data-learning-scope-metadata>
      <div data-learning-active-scope className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-300">{activeCountLabel}</div>
      <div data-learning-full-scope className="mt-1 text-[11px] font-medium text-zinc-300">{fullScopeLabel}</div>
    </div>
  )
}
