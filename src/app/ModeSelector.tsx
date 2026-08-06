import type { Mode } from '@/core/types'
import { MODE_ENTRIES, type DrillMode, type ModeDef } from '@/app/modes'
import { getStats, getDueCount } from '@/core/scoring/useStats'
import { WORDS } from '@/features/major-system/words'

const ALL_NUMS = Object.keys(WORDS)

const MAJOR_SYSTEM_MODES = MODE_ENTRIES.filter(([, def]) => def.group === 'major-system')
const APPLICATION_MODES = MODE_ENTRIES.filter(([, def]) => def.group === 'application')

interface Props {
  onSelectMode: (mode: Mode) => void
  section: 'major-system' | null
  onSectionChange: (section: 'major-system' | null) => void
}

function ModeButton({
  id, def, subtitleColor, onSelect, badge,
}: {
  id: DrillMode
  def: ModeDef
  subtitleColor: string
  onSelect: (mode: Mode) => void
  badge?: number
}) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`group relative text-left p-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 transition-all duration-200 shadow-lg hover:shadow-xl ${def.accent}`}
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-3 right-3 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center tabular-nums">
          {badge}
        </span>
      )}
      <div className="text-3xl mb-3">{def.emoji}</div>
      <div className="font-bold text-zinc-100 text-base">{def.title}</div>
      <div className={`text-xs ${subtitleColor} font-semibold mb-1.5 uppercase tracking-wide`}>
        {def.subtitle}
      </div>
      <div className="text-sm text-zinc-500">{def.description}</div>
    </button>
  )
}

function MajorSystemDrills({ onSelectMode, dueCount, total, correct, onBack }: {
  onSelectMode: (mode: Mode) => void
  dueCount: number
  total: number
  correct: number
  onBack: () => void
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← Systems
      </button>
      {total > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Total practiced</p>
            <p className="text-2xl font-bold text-zinc-100 mt-0.5">{total.toLocaleString()} answers</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Accuracy</p>
            <p className="text-2xl font-bold text-violet-400 mt-0.5">
              {Math.round((correct / total) * 100)}%
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MAJOR_SYSTEM_MODES.map(([id, def]) => (
          <ModeButton
            key={id}
            id={id}
            def={def}
            subtitleColor="text-violet-400"
            onSelect={onSelectMode}
            badge={id === 'repetition' ? dueCount : undefined}
          />
        ))}
      </div>
    </div>
  )
}

export function ModeSelector({ onSelectMode, section, onSectionChange }: Props) {
  const stats = getStats()
  const entries = Object.values(stats)
  const total = entries.reduce((s, e) => s + e.correct + e.wrong, 0)
  const correct = entries.reduce((s, e) => s + e.correct, 0)
  const dueCount = getDueCount(ALL_NUMS)

  if (section === 'major-system') {
    return (
      <MajorSystemDrills
        onSelectMode={onSelectMode}
        dueCount={dueCount}
        total={total}
        correct={correct}
        onBack={() => onSectionChange(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Systems</p>
        <button
          onClick={() => onSectionChange('major-system')}
          className="group w-full text-left p-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 transition-all duration-200 shadow-lg hover:shadow-xl group-hover:border-violet-500/60 hover:border-violet-500/60 hover:shadow-violet-900/20"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl mb-3">🧠</div>
              <div className="font-bold text-zinc-100 text-base">Major System</div>
              <div className="text-xs text-violet-400 font-semibold mb-1.5 uppercase tracking-wide">
                Numbers 00–99
              </div>
              <div className="text-sm text-zinc-500">
                Phonetic mnemonic system — map numbers to words via consonant sounds
              </div>
            </div>
            <span className="text-zinc-600 text-lg mt-1">›</span>
          </div>
          <div className="mt-3 text-xs text-zinc-600">
            {MAJOR_SYSTEM_MODES.length} drills
            {dueCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-violet-600/20 text-violet-400 font-semibold">
                {dueCount} due
              </span>
            )}
          </div>
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Applications</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {APPLICATION_MODES.map(([id, def]) => (
            <ModeButton key={id} id={id} def={def} subtitleColor="text-cyan-400" onSelect={onSelectMode} />
          ))}
        </div>
      </div>
    </div>
  )
}
