import { useState } from 'react'
import { SoundKeyGrid } from '@/features/major-system/SoundKeyGrid'
import { WordListGrid } from '@/core/ui/WordListGrid'
import { Overlay, TabButton } from '@/app/layout/Overlay'
import { useWords } from '@/features/major-system/WordsContext'
import { clearSchedules } from '@/core/scoring/itemStore'

const MAJOR_KEYS = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))

interface Props {
  onClose: () => void
}

export function ReferenceOverlay({ onClose }: Props) {
  const [tab, setTab] = useState<'sound-key' | 'word-list'>('sound-key')
  const words = useWords()

  const header = (
    <div className="flex gap-2">
      <TabButton active={tab === 'sound-key'} onClick={() => setTab('sound-key')}>🔑 Sound Key</TabButton>
      <TabButton active={tab === 'word-list'} onClick={() => setTab('word-list')}>📋 Word List</TabButton>
    </div>
  )

  return (
    <Overlay onClose={onClose} ariaLabel="Reference" header={header} maxWidth="max-w-4xl">
      {tab === 'sound-key' ? <SoundKeyGrid /> : <WordListGrid store={words} keys={MAJOR_KEYS} />}

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
    </Overlay>
  )
}
