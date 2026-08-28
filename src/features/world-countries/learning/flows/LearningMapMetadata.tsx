import type { Country } from '@/features/world-countries/data/countries'

export function LearningMapMetadata({
  scopeLabel,
  entries,
}: {
  scopeLabel: string
  entries: readonly Country[]
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{scopeLabel}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-100">{entries.length} {entries.length === 1 ? 'country' : 'countries'} in scope</div>
    </div>
  )
}
