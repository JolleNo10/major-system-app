import { useState } from 'react'
import { useWords } from '../context/WordsContext'
import { rankByWeakness } from '../utils/numberStats'
import { recallColor } from '../utils/recallColor'
import { Overlay, TabButton } from './Overlay'
import type { Direction } from '../types'

interface Props {
  onClose: () => void
}

export function StatsOverlay({ onClose }: Props) {
  const { words } = useWords()
  const [tab, setTab] = useState<Direction>('enc')

  const nums = Object.keys(words).sort()
  const ranked = rankByWeakness(tab, nums)
  const practiced = ranked.filter(s => s.tested).length

  const header = (
    <div className="flex gap-2">
      <TabButton active={tab === 'enc'} onClick={() => setTab('enc')}>🔢 Encoding</TabButton>
      <TabButton active={tab === 'dec'} onClick={() => setTab('dec')}>🔤 Decoding</TabButton>
    </div>
  )

  return (
    <Overlay onClose={onClose} ariaLabel="Stats" header={header}>
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
    </Overlay>
  )
}
