import { SOUND_KEY } from '../data/soundKey'

const SILENT = ['Vowels (a, e, i, o, u)', 'h', 'w', 'y', 'c (mykt)', 'q', 'x']

export function SoundKeyTable() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-800/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Digit</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Sounds</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Memory tips</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {SOUND_KEY.map(({ digit, display, hint }) => (
              <tr key={digit} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-4">
                  <span className="text-3xl font-bold text-violet-400 tabular-nums">{digit}</span>
                </td>
                <td className="px-4 py-4">
                  <code className="text-base font-mono font-semibold text-zinc-100 bg-zinc-800 px-2 py-1 rounded">
                    {display}
                  </code>
                </td>
                <td className="px-4 py-4 text-sm text-zinc-400">{hint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-zinc-800/30 rounded-xl border border-zinc-800 p-5">
        <p className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
          Letters that are ignored
        </p>
        <div className="flex flex-wrap gap-2">
          {SILENT.map(l => (
            <span key={l} className="px-2.5 py-1 bg-zinc-800 rounded-lg text-sm text-zinc-500 font-mono border border-zinc-700">
              {l}
            </span>
          ))}
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          Only consonant sounds count. Silent letters, vowels and these are ignored.
        </p>
      </div>
    </div>
  )
}
