import { useState } from 'react'
import { RANKS } from '../data/cards'

interface Props {
  low: number   // rank index 0 (A) .. 12 (K)
  high: number
  onChange: (low: number, high: number) => void
  red?: boolean  // color active chips like the selected suit
}

// Contiguous rank-range picker: tap one rank, then another, to set the range.
// Used by the Deck Memo drills to limit a single suit to e.g. A–4 or 5–6.
export function RankRangeSelector({ low, high, onChange, red = false }: Props) {
  const [anchor, setAnchor] = useState<number | null>(null)

  const click = (i: number) => {
    if (anchor === null) {
      setAnchor(i)
      onChange(i, i)
    } else {
      onChange(Math.min(anchor, i), Math.max(anchor, i))
      setAnchor(null)
    }
  }

  const full = low === 0 && high === RANKS.length - 1

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <span className="text-xs text-zinc-500 mr-1">Ranks:</span>
      <div className="flex gap-1 flex-wrap justify-center">
        {RANKS.map((rank, i) => {
          const active = i >= low && i <= high
          return (
            <button
              key={rank}
              onClick={() => click(i)}
              title={anchor === null ? `Start range at ${rank}` : `Set range to ${rank}`}
              className={`min-w-[2rem] h-8 px-1.5 rounded-md text-sm font-bold tabular-nums transition-colors ${
                active
                  ? red
                    ? 'bg-rose-600/20 text-rose-400 border border-rose-600'
                    : 'bg-zinc-700 text-zinc-100 border border-zinc-500'
                  : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400'
              } ${anchor === i ? 'ring-2 ring-violet-400' : ''}`}
            >{rank}</button>
          )
        })}
      </div>
      {!full && (
        <button
          onClick={() => { setAnchor(null); onChange(0, RANKS.length - 1) }}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
          title="Use all 13 ranks"
        >All</button>
      )}
    </div>
  )
}
