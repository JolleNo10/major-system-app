import { useSettings } from '@/app/settings/SettingsContext'
import {
  MASTERY_FACTOR_MIN, MASTERY_FACTOR_MAX, MASTERY_FACTOR_STEP, DEFAULT_SETTINGS,
  MAX_PI_DIGITS_MIN, MAX_PI_DIGITS_STEP,
  MAINTAIN_BATCH_MIN, MAINTAIN_BATCH_MAX, MAINTAIN_BATCH_STEP,
  UNMASTERED_SHARE_MIN, UNMASTERED_SHARE_MAX, UNMASTERED_SHARE_STEP,
  WORLD_COUNTRIES_LOCATION_CLEAN_TARGET_MIN,
  WORLD_COUNTRIES_LOCATION_CLEAN_TARGET_MAX,
  WORLD_COUNTRIES_LOCATION_CLEAN_TARGET_STEP,
} from '@/app/settings/settings'
import { masteryFastMs, RECALL_SLOW_MS } from '@/core/scoring/scoring'
import { Overlay } from '@/app/layout/Overlay'
import { PI_PAIRS } from '@/features/pi'
import { Switch } from '@/core/ui/Switch'
import {
  WORLD_COUNTRIES_ENTITY_GROUP_DEFINITIONS,
  UN_MEMBER_COUNTRY_IDS,
} from '@/features/world-countries'
import type { PwaUpdate } from '@/app/settings/usePwaUpdate'
import type { ReactNode } from 'react'

interface Props {
  onClose: () => void
  pwa: PwaUpdate
}

export function SettingsOverlay({ onClose, pwa }: Props) {
  const { settings, update } = useSettings()

  const factor = settings.masteryLatencyFactor
  const share = settings.sessionUnmasteredShare
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
              How fast a recall must be to count toward mastering a number this round. Mastery
              advances a level only on a correct answer within this limit (recall time, typing
              already discounted) that's also spaced out from the previous one. Higher = slower
              answers still count.
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

          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-semibold text-zinc-100">Unmastered focus</h3>
              <span className="text-sm font-mono tabular-nums text-violet-300">{Math.round(share * 100)}%</span>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              How much extra the scheduler favours items you haven’t mastered yet this session over
              already-mastered ones. Balanced is the tuned default; higher sharpens the focus on
              weak items, lower spreads exposure more evenly. Spacing between repeats always applies.
              Affects every drill with a “mastered this session” bar (Major System, Cards, PAO).
            </p>
            <input
              type="range"
              min={UNMASTERED_SHARE_MIN}
              max={UNMASTERED_SHARE_MAX}
              step={UNMASTERED_SHARE_STEP}
              value={share}
              onChange={e => update({ sessionUnmasteredShare: parseFloat(e.target.value) })}
              className="w-full h-2 accent-violet-600 cursor-pointer touch-none"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>Even exposure</span>
              <span>Balanced</span>
              <span>Focus weak</span>
            </div>

            {share !== DEFAULT_SETTINGS.sessionUnmasteredShare && (
              <button
                onClick={() => update({ sessionUnmasteredShare: DEFAULT_SETTINGS.sessionUnmasteredShare })}
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

          <SettingsGroup label="World Countries">
          <section>
            <h3 className="font-semibold text-zinc-100">Primary Country set</h3>
            <p className="mt-1 text-sm text-zinc-500">UN Member States ({UN_MEMBER_COUNTRY_IDS.length}) are always included. Add optional geopolitical groups below.</p>
            <div className="mt-4 space-y-3">
              {WORLD_COUNTRIES_ENTITY_GROUP_DEFINITIONS.map(group => {
                const checked = settings.worldCountriesIncludedEntityGroups.includes(group.id)
                return (
                  <div key={group.id} className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-200">{group.label}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{group.description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="group relative">
                        <span
                          tabIndex={0}
                          className="flex h-8 w-8 cursor-help items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                          aria-label={`Show entities in ${group.label}`}
                          aria-describedby={`world-countries-${group.id}-members`}
                          title={`Show entities in ${group.label}`}
                        >
                          <span aria-hidden="true" className="text-base">ⓘ</span>
                        </span>
                        <div
                          id={`world-countries-${group.id}-members`}
                          role="tooltip"
                          className="pointer-events-none invisible absolute right-0 top-10 z-20 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-left opacity-0 shadow-xl transition-opacity group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Included entities</p>
                            <span className="text-xs tabular-nums text-cyan-300">{group.members.length}</span>
                          </div>
                          <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto pr-1 text-xs leading-5 text-zinc-300">
                            {group.members.map(member => <li key={member}>{member}</li>)}
                          </ul>
                        </div>
                      </div>
                      <Switch
                        checked={checked}
                        onChange={enabled => update({
                          worldCountriesIncludedEntityGroups: enabled
                            ? [...settings.worldCountriesIncludedEntityGroups, group.id]
                            : settings.worldCountriesIncludedEntityGroups.filter(id => id !== group.id),
                        })}
                        label={`Include ${group.label}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-4 mb-1">
              <h3 className="font-semibold text-zinc-100">Fuzzy answer matching</h3>
              <Switch
                checked={settings.worldCountriesFuzzyAnswerMatching}
                onChange={value => update({ worldCountriesFuzzyAnswerMatching: value })}
                label="World Countries fuzzy answer matching"
              />
            </div>
            <p className="text-sm text-zinc-500">
              Accept a small spelling error in typed country and capital answers only when it is unambiguous.
            </p>
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-semibold text-zinc-100">Country location clean recalls</h3>
              <span className="text-sm font-mono tabular-nums text-cyan-300">{settings.worldCountriesLocationCleanTargetMinimum}</span>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              Minimum consecutive correct map selections before a Subregion advances from location learning.
              Larger Subregions still require at least one full pass through their countries.
            </p>
            <input
              type="range"
              min={WORLD_COUNTRIES_LOCATION_CLEAN_TARGET_MIN}
              max={WORLD_COUNTRIES_LOCATION_CLEAN_TARGET_MAX}
              step={WORLD_COUNTRIES_LOCATION_CLEAN_TARGET_STEP}
              value={settings.worldCountriesLocationCleanTargetMinimum}
              onChange={event => update({ worldCountriesLocationCleanTargetMinimum: +event.target.value })}
              className="w-full h-2 accent-cyan-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>{WORLD_COUNTRIES_LOCATION_CLEAN_TARGET_MIN}</span>
              <span>{WORLD_COUNTRIES_LOCATION_CLEAN_TARGET_MAX}</span>
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
