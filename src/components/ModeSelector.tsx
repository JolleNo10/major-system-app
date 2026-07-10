import type { Mode } from '../types'
import { getStats, getDueCount } from '../hooks/useStats'
import { WORDS } from '../data/words'

const ALL_NUMS = Object.keys(WORDS)

interface ModeCard {
  id: Mode
  emoji: string
  title: string
  subtitle: string
  description: string
  accent: string
}

const MODES: ModeCard[] = [
  {
    id: 'encoding',
    emoji: '🧠',
    title: 'Enkoding',
    subtitle: 'Tall → Ord',
    description: 'Se et tall 00–99, husk det tilhørende ordet',
    accent: 'group-hover:border-violet-500/60 group-hover:shadow-violet-900/20',
  },
  {
    id: 'decoding',
    emoji: '🔍',
    title: 'Dekoding',
    subtitle: 'Ord → Tall',
    description: 'Se et ord, husk hvilket tall det representerer',
    accent: 'group-hover:border-blue-500/60 group-hover:shadow-blue-900/20',
  },
  {
    id: 'repetition',
    emoji: '🔁',
    title: 'Repetisjon',
    subtitle: 'Fordelt repetisjon',
    description: 'Øv på det som er klart — SM-2 planlegger neste økt automatisk',
    accent: 'group-hover:border-violet-500/60 group-hover:shadow-violet-900/20',
  },
  {
    id: 'sound-key',
    emoji: '🔢',
    title: 'Lydnøkkel',
    subtitle: 'Siffer → Lyder',
    description: 'Hva er lydene for hvert siffer 0–9?',
    accent: 'group-hover:border-emerald-500/60 group-hover:shadow-emerald-900/20',
  },
  {
    id: 'reverse-sound-key',
    emoji: '🔤',
    title: 'Omvendt lydnøkkel',
    subtitle: 'Lyd → Siffer',
    description: 'Hvilken lyd tilhører hvilket siffer?',
    accent: 'group-hover:border-teal-500/60 group-hover:shadow-teal-900/20',
  },
  {
    id: 'sequence',
    emoji: '🔗',
    title: 'Sekvenser',
    subtitle: 'Lange tallrekker',
    description: 'Enkod og dekod tallrekker par for par',
    accent: 'group-hover:border-orange-500/60 group-hover:shadow-orange-900/20',
  },
  {
    id: 'speed-round',
    emoji: '⚡',
    title: 'Hurtigrunde',
    subtitle: '60 sekunder',
    description: 'Hvor mange enkodinger klarer du på 60 sekunder?',
    accent: 'group-hover:border-yellow-500/60 group-hover:shadow-yellow-900/20',
  },
  {
    id: 'weak-spots',
    emoji: '🎯',
    title: 'Svake punkter',
    subtitle: 'Dine verste tall',
    description: 'Drill på tallene du gjør flest feil på',
    accent: 'group-hover:border-red-500/60 group-hover:shadow-red-900/20',
  },
]

interface Props {
  onSelectMode: (mode: Mode) => void
}

export function ModeSelector({ onSelectMode }: Props) {
  const stats = getStats()
  const entries = Object.values(stats)
  const total = entries.reduce((s, e) => s + e.correct + e.wrong, 0)
  const correct = entries.reduce((s, e) => s + e.correct, 0)
  const dueCount = getDueCount(ALL_NUMS)

  return (
    <div className="space-y-6">
      {total > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Totalt øvd</p>
            <p className="text-2xl font-bold text-zinc-100 mt-0.5">{total.toLocaleString()} svar</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Nøyaktighet</p>
            <p className="text-2xl font-bold text-violet-400 mt-0.5">
              {Math.round((correct / total) * 100)}%
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            className={`group relative text-left p-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 transition-all duration-200 shadow-lg hover:shadow-xl ${mode.accent}`}
          >
            {mode.id === 'repetition' && dueCount > 0 && (
              <span className="absolute top-3 right-3 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center tabular-nums">
                {dueCount}
              </span>
            )}
            <div className="text-3xl mb-3">{mode.emoji}</div>
            <div className="font-bold text-zinc-100 text-base">{mode.title}</div>
            <div className="text-xs text-violet-400 font-semibold mb-1.5 uppercase tracking-wide">
              {mode.subtitle}
            </div>
            <div className="text-sm text-zinc-500">{mode.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
