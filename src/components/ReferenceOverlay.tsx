import { useState, useEffect } from 'react'
import { SoundKeyTable } from './SoundKeyTable'
import { WordListGrid } from './WordListGrid'
import { clearSchedules } from '../data/itemStore'

interface Props {
  onClose: () => void
}

export function ReferenceOverlay({ onClose }: Props) {
  const [tab, setTab] = useState<'sound-key' | 'word-list'>('sound-key')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 animate-fade-in">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('sound-key')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'sound-key'
                ? 'bg-violet-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            🔑 Sound Key
          </button>
          <button
            onClick={() => setTab('word-list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'word-list'
                ? 'bg-violet-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            📋 Word List
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-xl"
          title="Close (Esc)"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          {tab === 'sound-key' ? <SoundKeyTable /> : <WordListGrid />}

          <div className="mt-10 pt-6 border-t border-zinc-800/60">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">Dev</p>
            <button
              onClick={() => {
                if (confirm('Reset all repetition schedules? Words and statistics will be kept.')) {
                  clearSchedules()
                }
              }}
              className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 text-xs font-medium transition-colors"
            >
              Reset repetition schedules
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
