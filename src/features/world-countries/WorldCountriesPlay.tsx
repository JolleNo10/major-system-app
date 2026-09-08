import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'

export function WorldCountriesPlay({
  scopeLabel,
  onBack,
  onOpenRecite,
  onOpenQuiz,
  onOpenMapPractice,
  onOpenMixedPractice,
  onOpenCustomPractice,
}: {
  scopeLabel: string
  onBack: () => void
  onOpenRecite: () => void
  onOpenQuiz: () => void
  onOpenMapPractice: () => void
  onOpenMixedPractice: () => void
  onOpenCustomPractice: () => void
}) {
  const rails = useMemo(() => ({
    left: <WorldCountriesPanel className="space-y-4"><GeographyBreadcrumbs items={[{ label: 'World', onSelect: onBack }, { label: 'Play', current: true }]} /><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Freeform</p><h2 className="mt-1 text-lg font-bold text-zinc-100">Choose what to practise</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">Play does not replace or reset the guided path. Existing workflow evidence rules remain authoritative.</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"><p className="text-xs uppercase tracking-wider text-zinc-500">Current guided scope</p><p className="mt-1 text-sm font-semibold text-zinc-200">{scopeLabel}</p></div></WorldCountriesPanel>,
    right: <WorldCountriesPanel className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Important</p><h2 className="mt-1 text-lg font-bold text-zinc-100">Guided path stays intact</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">Recite and non-recording Practice remain non-recording. Recorded Drill keeps its existing evidence behavior.</p></div><button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-700 px-3 py-2.5 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Back to {scopeLabel}</button></WorldCountriesPanel>,
    leftLabel: 'Play',
    rightLabel: 'Activity guidance',
  }), [onBack, scopeLabel])
  useRails(rails)

  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-play-heading">
      <div className="space-y-1"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries · Play</p><h1 id="world-countries-play-heading" className="text-2xl font-black text-zinc-100">What do you feel like doing?</h1><p className="text-sm text-zinc-500">Choose an existing activity intentionally; the guided path remains separate.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PlayCard activity="recite" title="Recite" description="Free recall across one or multiple Continents/Subregions, with all existing Recite modes." onClick={onOpenRecite} />
        <PlayCard activity="quiz" title="Quiz" description="Use the existing Practice-owned Capitals and Neighbours Quiz experiences." onClick={onOpenQuiz} />
        <PlayCard activity="map-practice" title="Map practice" description="Use existing non-recording map-backed Country Practice." onClick={onOpenMapPractice} />
        <PlayCard activity="mixed-practice" title="Mixed practice" description="Use existing non-recording Capital Practice without changing the guided curriculum." onClick={onOpenMixedPractice} />
        <PlayCard activity="custom-practice" title="Custom practice" description="Advanced scope and mode configuration continues through the existing Drill setup." onClick={onOpenCustomPractice} wide />
      </div>
    </section>
  )
}

function PlayCard({ activity, title, description, onClick, wide = false }: { activity: string; title: string; description: string; onClick: () => void; wide?: boolean }) {
  return <button type="button" data-play-activity={activity} onClick={onClick} className={`rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:border-cyan-500 hover:bg-zinc-800 ${wide ? 'sm:col-span-2' : ''}`}><span className="block text-sm font-semibold text-zinc-100">{title}</span><span className="mt-1 block text-xs leading-relaxed text-zinc-500">{description}</span><span className="mt-3 block text-xs font-semibold text-cyan-300">Open {title} →</span></button>
}
