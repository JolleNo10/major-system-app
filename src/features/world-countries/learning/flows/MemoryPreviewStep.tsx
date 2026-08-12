import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'

export function MemoryPreviewStep({
  onStart,
  onExit,
}: {
  onStart: () => void
  onExit: () => void
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label="Memory preview" title="See the structure before recalling it" onExit={onExit} />
      <WorldCountriesPanel>
        <h2 className="font-semibold text-zinc-100">Learning context</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          Review the learning order in the Learning context panel and open the Memory aid panel for an optional story or picture before you begin.
        </p>
      </WorldCountriesPanel>
      <button type="button" onClick={onStart} className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Start walkthrough</button>
    </div>
  )
}

export function LearningHeader({ label, title, onExit }: { label: string; title: string; onExit: () => void }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{label}</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">{title}</h1>
      </div>
    </header>
  )
}
