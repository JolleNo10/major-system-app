import { useState, useEffect } from 'react'
import { useWords } from '../context/WordsContext'
import { rankByWeakness } from '../utils/numberStats'
import { recallColor } from '../utils/recallColor'
import {
  rankPiPositions, loadPiSessions, bestReach, bestFromStartReach,
  type PiPositionStat, type PiSession,
} from '../data/piStats'
import { Overlay, TabButton } from './Overlay'
import type { Direction } from '../types'

interface Props {
  onClose: () => void
}

type Tab = Direction | 'pi'

export function StatsOverlay({ onClose }: Props) {
  const { words } = useWords()
  const [tab, setTab] = useState<Tab>('enc')

  const nums = Object.keys(words).sort()

  const header = (
    <div className="flex gap-2">
      <TabButton active={tab === 'enc'} onClick={() => setTab('enc')}>🔢 Encoding</TabButton>
      <TabButton active={tab === 'dec'} onClick={() => setTab('dec')}>🔤 Decoding</TabButton>
      <TabButton active={tab === 'pi'} onClick={() => setTab('pi')}>🥧 π</TabButton>
    </div>
  )

  return (
    <Overlay onClose={onClose} ariaLabel="Stats" header={header}>
      {tab === 'pi'
        ? <PiTab />
        : <DirectionTab dir={tab} nums={nums} words={words} />}
    </Overlay>
  )
}

function DirectionTab({ dir, nums, words }: { dir: Direction; nums: string[]; words: Record<string, string> }) {
  const ranked = rankByWeakness(dir, nums)
  const practiced = ranked.filter(s => s.tested).length

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Worst first
        </p>
        <span className="text-xs text-zinc-600 tabular-nums">{practiced}/{ranked.length} practiced</span>
      </div>

      <div className="space-y-0.5">
        {ranked.map(s => (
          <div
            key={s.num}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
              !s.tested ? 'opacity-30'
              : s.wrong > 0 ? 'bg-red-500/5'
              : 'bg-green-500/5'
            }`}
          >
            <span className={`font-bold tabular-nums w-6 shrink-0 ${s.tested ? 'text-violet-400' : 'text-zinc-500'}`}>
              {s.num}
            </span>
            <span className="text-zinc-300 truncate">{words[s.num]}</span>

            {s.tested ? (
              <span className="ml-auto flex items-center gap-2.5 text-xs tabular-nums shrink-0">
                <span className="flex items-center gap-1.5">
                  {s.onStreak && <span title="On a correct streak — old mistakes fading">🔥</span>}
                  <span className="text-green-400">✓{s.correct}</span>
                  {s.wrong > 0 && <span className="text-red-400">✗{s.wrong}</span>}
                </span>
                <span className={`font-mono w-10 text-right ${s.median !== null ? recallColor(s.median) : 'text-zinc-700'}`}>
                  {s.median !== null ? `${(s.median / 1000).toFixed(1)}s` : '—'}
                </span>
              </span>
            ) : (
              <span className="ml-auto text-xs text-zinc-700 shrink-0">not practiced</span>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function PiTab() {
  const [positions, setPositions] = useState<PiPositionStat[] | null>(null)
  const [sessions, setSessions] = useState<PiSession[]>([])

  useEffect(() => {
    let alive = true
    setSessions(loadPiSessions())
    void rankPiPositions().then(p => { if (alive) setPositions(p) })
    return () => { alive = false }
  }, [])

  const lastRun = sessions.length ? sessions[sessions.length - 1] : null

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-600/10 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-cyan-600">Best from π #1</div>
          <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-cyan-300">
            {bestFromStartReach(sessions) * 2}d
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Best reach</div>
          <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-zinc-100">
            {bestReach(sessions) * 2}d
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Runs</div>
          <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-zinc-100">
            {sessions.length}
          </div>
        </div>
      </div>

      {lastRun && (
        <p className="text-xs text-zinc-600 mb-3 tabular-nums">
          Last run: π #{lastRun.anchor}–{lastRun.anchor + lastRun.pairs - 1} · reach {lastRun.reach * 2}d · {lastRun.accuracy}%
        </p>
      )}

      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Weak positions — worst first
      </p>

      {positions === null ? (
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : positions.length === 0 ? (
        <p className="text-sm text-zinc-600">No π positions practised yet. Try the number quiz.</p>
      ) : (
        <div className="space-y-0.5">
          {positions.map(p => (
            <div
              key={p.pos}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                p.wrong > 0 ? 'bg-red-500/5' : 'bg-green-500/5'
              }`}
            >
              <span className="font-bold tabular-nums w-10 shrink-0 text-violet-400">#{p.pos}</span>
              <span className="font-mono text-cyan-400 tabular-nums shrink-0">{p.pair}</span>
              <span className="ml-auto flex items-center gap-2.5 text-xs tabular-nums shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-green-400">✓{p.correct}</span>
                  {p.wrong > 0 && <span className="text-red-400">✗{p.wrong}</span>}
                </span>
                <span className={`font-mono w-10 text-right ${p.median !== null ? recallColor(p.median) : 'text-zinc-700'}`}>
                  {p.median !== null ? `${(p.median / 1000).toFixed(1)}s` : '—'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
