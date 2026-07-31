import { useSoundKey } from '../context/SoundKeyContext'

export function SoundKeyPanel() {
  const { entries } = useSoundKey()
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Sound Key</p>
      {entries.map(({ digit, display, hint }) => (
        <div
          key={digit}
          className="flex items-start gap-3 py-2 border-b border-zinc-800/50 last:border-0"
        >
          <span className="text-lg font-black text-violet-400 tabular-nums w-4 shrink-0 leading-tight">
            {digit}
          </span>
          <div className="min-w-0">
            <code className="text-sm font-mono font-semibold text-zinc-100">{display}</code>
            <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{hint}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
