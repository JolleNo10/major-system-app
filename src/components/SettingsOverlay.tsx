import { useRef } from 'react'
import { useSettings } from '../context/SettingsContext'
import {
  MASTERY_FACTOR_MIN, MASTERY_FACTOR_MAX, MASTERY_FACTOR_STEP, DEFAULT_SETTINGS,
} from '../data/settings'
import { masteryFastMs, MASTERY_REPS } from '../utils/roundMastery'
import { RECALL_SLOW_MS } from '../data/typingSpeed'
import { useOverlay } from '../hooks/useOverlay'

interface Props {
  onClose: () => void
}

export function SettingsOverlay({ onClose }: Props) {
  const { settings, update } = useSettings()
  const ref = useRef<HTMLDivElement>(null)
  useOverlay(ref, onClose)

  const factor = settings.masteryLatencyFactor
  const limitS = (masteryFastMs(factor) / 1000).toFixed(1)
  const slowS = (RECALL_SLOW_MS / 1000).toFixed(1)
  const atSlow = masteryFastMs(factor) >= RECALL_SLOW_MS

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Settings" tabIndex={-1} className="fixed inset-0 z-50 flex flex-col bg-zinc-950 animate-fade-in outline-none">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 shrink-0">
        <h2 className="font-bold text-zinc-100 text-lg">⚙️ Settings</h2>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-xl"
          title="Close (Esc)"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-8">

          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-semibold text-zinc-100">Mastery speed tolerance</h3>
              <span className="text-sm font-mono tabular-nums text-violet-300">≤ {limitS}s</span>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              How fast a recall must be to count toward mastering a number this round. A number is
              mastered after {MASTERY_REPS} correct answers in a row within this limit (recall time,
              typing already discounted). Higher = slower answers still count.
            </p>

            <input
              type="range"
              min={MASTERY_FACTOR_MIN}
              max={MASTERY_FACTOR_MAX}
              step={MASTERY_FACTOR_STEP}
              value={factor}
              onChange={e => update({ masteryLatencyFactor: parseFloat(e.target.value) })}
              className="w-full h-2 accent-violet-600 cursor-pointer touch-none"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>Strict (fast only)</span>
              <span>Lenient</span>
            </div>

            <p className="text-xs text-zinc-600 mt-3">
              Reference: fast ≤ 1.2s · slow ≥ {slowS}s.{' '}
              {atSlow
                ? 'At this setting, any answer that isn’t slow counts.'
                : `Answers between ${limitS}s and ${slowS}s won’t count yet.`}
            </p>

            {factor !== DEFAULT_SETTINGS.masteryLatencyFactor && (
              <button
                onClick={() => update({ masteryLatencyFactor: DEFAULT_SETTINGS.masteryLatencyFactor })}
                className="mt-4 px-3 min-h-[36px] rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-sm font-medium transition-colors"
              >
                Reset to default
              </button>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
