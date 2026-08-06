import { useSettings } from '@/app/settings/SettingsContext'
import {
  MASTERY_FACTOR_MIN, MASTERY_FACTOR_MAX, MASTERY_FACTOR_STEP, DEFAULT_SETTINGS,
  MAX_PI_DIGITS_MIN, MAX_PI_DIGITS_STEP,
  MAINTAIN_BATCH_MIN, MAINTAIN_BATCH_MAX, MAINTAIN_BATCH_STEP,
} from '@/app/settings/settings'
import { masteryFastMs, MASTERY_REPS } from '@/core/scoring/roundMastery'
import { RECALL_SLOW_MS } from '@/core/scoring/scoring'
import { Overlay } from '@/app/layout/Overlay'
import { PI_PAIRS } from '@/features/pi'
import { Switch } from '@/core/ui/Switch'
import type { PwaUpdate } from '@/app/settings/usePwaUpdate'
import type { ReactNode } from 'react'

interface Props {
  onClose: () => void
  pwa: PwaUpdate
}

export function SettingsOverlay({ onClose, pwa }: Props) {
  const { settings, update } = useSettings()

  const factor = settings.masteryLatencyFactor
  const limitS = (masteryFastMs(factor) / 1000).toFixed(1)
  const slowS = (RECALL_SLOW_MS / 1000).toFixed(1)
  const atSlow = masteryFastMs(factor) >= RECALL_SLOW_MS

  const buildLabel = (() => {
    const d = new Date(pwa.buildTime)
    return isNaN(d.getTime()) ? pwa.buildTime : d.toLocaleString()
  })()
  const updateStatus = pwa.checking
    ? 'Checking…'
    : pwa.needRefresh
      ? 'Update ready'
      : 'Up to date'

  return (
    <Overlay
      onClose={onClose}
      ariaLabel="Settings"
      header={<h2 className="font-bold text-zinc-100 text-lg">⚙️ Settings</h2>}
      maxWidth="max-w-xl"
      bodyClassName="space-y-10"
    >

          <SettingsGroup label="Major System">
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
          </SettingsGroup>

          <SettingsGroup label="Pi">
          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-semibold text-zinc-100">Max π digits available</h3>
              <span className="text-sm font-mono tabular-nums text-cyan-300">{settings.maxPiDigits}</span>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              Upper bound for the segment slider in the Pi drill. Raise this as more pi digit data is added.
            </p>
            <input
              type="range"
              min={MAX_PI_DIGITS_MIN}
              max={Math.min(PI_PAIRS.length * 2, 10000)}
              step={MAX_PI_DIGITS_STEP}
              value={settings.maxPiDigits}
              onChange={e => update({ maxPiDigits: +e.target.value })}
              className="w-full h-2 accent-cyan-600 cursor-pointer touch-none"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>{MAX_PI_DIGITS_MIN}</span>
              <span>{Math.min(PI_PAIRS.length * 2, 10000)}</span>
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-semibold text-zinc-100">Pairs per answer</h3>
              <span className="text-sm font-mono tabular-nums text-cyan-300">{settings.piPairsPerAnswer}</span>
            </div>
            <p className="text-sm text-zinc-500 mb-3">
              In the Pi drills' typing mode, answer one pair at a time or a whole 10-pair row at once. Ignored in multiple-choice.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([1, 10] as const).map(size => (
                <button
                  key={size}
                  onClick={() => update({ piPairsPerAnswer: size })}
                  className={`px-4 py-3 rounded-lg border text-sm font-semibold transition-colors ${
                    settings.piPairsPerAnswer === size
                      ? 'bg-cyan-600/20 border-cyan-500 text-zinc-100'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {size === 1 ? '1 pair' : '10 pairs'}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-semibold text-zinc-100">Maintenance batch size</h3>
              <span className="text-sm font-mono tabular-nums text-cyan-300">
                {settings.piMaintainBatchSegs} seg · {settings.piMaintainBatchSegs * 20} digits
              </span>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              Max segments per review batch in the Maintain tab. Larger batches recite longer
              contiguous runs at once (each segment = 20 digits).
            </p>
            <input
              type="range"
              min={MAINTAIN_BATCH_MIN}
              max={MAINTAIN_BATCH_MAX}
              step={MAINTAIN_BATCH_STEP}
              value={settings.piMaintainBatchSegs}
              onChange={e => update({ piMaintainBatchSegs: +e.target.value })}
              className="w-full h-2 accent-cyan-600 cursor-pointer touch-none"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>{MAINTAIN_BATCH_MIN}</span>
              <span>{MAINTAIN_BATCH_MAX}</span>
            </div>
          </section>
          </SettingsGroup>

          <SettingsGroup label="App">
          <section>
            <div className="flex items-center justify-between gap-4 mb-1">
              <h3 className="font-semibold text-zinc-100">Offline mode</h3>
              <Switch
                checked={settings.offlineMode}
                onChange={v => update({ offlineMode: v })}
                label="Offline mode"
              />
            </div>
            <p className="text-sm text-zinc-500">
              When on, the app won’t contact the server to check for updates, to conserve hosting
              usage — it runs entirely from its offline cache. You can still update manually below.
            </p>
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-semibold text-zinc-100">App version</h3>
              <span className="text-sm font-mono tabular-nums text-violet-300">{updateStatus}</span>
            </div>
            <p className="text-sm text-zinc-500 mb-1">
              Version {pwa.version} · {pwa.buildCommit}
            </p>
            <p className="text-xs text-zinc-600 mb-4">
              Built {buildLabel}
              {pwa.lastChecked != null && ` · Last checked ${new Date(pwa.lastChecked).toLocaleTimeString()}`}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { void pwa.checkForUpdate() }}
                disabled={pwa.checking}
                className="px-3 min-h-[36px] rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pwa.checking ? 'Checking…' : 'Check for updates'}
              </button>
              {pwa.needRefresh && (
                <button
                  onClick={() => { void pwa.updateNow() }}
                  className="px-3 min-h-[36px] rounded-lg bg-violet-600 border border-violet-500 text-white hover:bg-violet-500 text-sm font-medium transition-colors"
                >
                  Update now
                </button>
              )}
            </div>
          </section>
          </SettingsGroup>
    </Overlay>
  )
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</h2>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>
      <div className="space-y-8">{children}</div>
    </div>
  )
}
