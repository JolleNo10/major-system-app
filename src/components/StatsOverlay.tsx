import { useState, useRef } from 'react'
import { useWords } from '../context/WordsContext'
import { rankByWeakness } from '../utils/numberStats'
import { recallColor } from '../data/typingSpeed'
import { useOverlay } from '../hooks/useOverlay'
import type { Direction } from '../types'

interface Props {
  onClose: () => void
}

export function StatsOverlay({ onClose }: Props) {
  const { words } = useWords()
  const [tab, setTab] = useState<Direction>('enc')
  const ref = useRef<HTMLDivElement>(null)
  useOverlay(ref, onClose)

  const nums = Object.keys(words).sort()
  const ranked = rankByWeakness(tab, nums)
  const practiced = ranked.filter(s => s.tested).length

  const tabBtn = (value: Direction, label: string) => (
    <button
      onClick={() => setTab(value)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === value
          ? 'bg-violet-600 text-white'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Stats" tabIndex={-1} className="fixed inset-0 z-50 flex flex-col bg-zinc-950 animate-fade-in outline-none">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex gap-2">
          {tabBtn('enc', '🔢 Encoding')}
          {tabBtn('dec', '🔤 Decoding')}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-xl"
          title="Close (Esc)"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
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
        </div>
      </div>
    </div>
  )
}
