export type ReciteMode = 'full' | 'anchors'

const OPTIONS: { mode: ReciteMode; label: string; title: string }[] = [
  { mode: 'full', label: 'Full', title: 'Recite every pair in the range' },
  { mode: 'anchors', label: 'Anchors', title: 'Chain the opening pair of each segment' },
]

// The Recite tab's two flavours: reciting the full pair sequence vs. chaining
// each segment's opening pair (the former Anchors tab, folded in). Rendered at
// the top of each mode's setup panel, so it disappears once a run starts.
export function ReciteModeToggle({ mode, onChange }: { mode: ReciteMode; onChange: (mode: ReciteMode) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-zinc-800">
      {OPTIONS.map(o => (
        <button
          key={o.mode}
          onClick={() => onChange(o.mode)}
          title={o.title}
          className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === o.mode ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
