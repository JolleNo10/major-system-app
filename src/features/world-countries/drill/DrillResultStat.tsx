export function DrillResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold text-zinc-100">{value}</p>
    </div>
  )
}
