import { useState, useEffect } from 'react'
import { useSettings } from '@/app/settings/SettingsContext'
import { useLayoutHeader } from '@/app/layout/PageLayoutContext'
import { readString, safeSet } from '@/core/storage'
import { PiMemoTab } from '@/features/pi/PiMemoTab'
import { PiReciteTab } from '@/features/pi/PiReciteTab'
import { PiTrainTab } from '@/features/pi/PiTrainTab'
import { PiAnchorTab } from '@/features/pi/PiAnchorTab'
import type { AnswerMode } from '@/core/types'

const TAB_KEY = 'major-pi-tab'
const MAX_PAIRS_KEY = 'major-pi-max-pairs'
type Tab = 'memo' | 'recite' | 'train' | 'anchors'
const TABS: Tab[] = ['memo', 'recite', 'train', 'anchors']
const TAB_LABELS: Record<Tab, string> = {
  memo: 'Memo', recite: 'Recite', train: 'Train', anchors: 'Anchors',
}

interface Props { answerMode: AnswerMode }

export function PiDrill({ answerMode }: Props) {
  const { settings } = useSettings()
  const settingsMaxPairs = Math.floor(settings.maxPiDigits / 2)

  const [tab, setTab] = useState<Tab>(() => {
    const v = readString(TAB_KEY)
    return (TABS as string[]).includes(v ?? '') ? v as Tab : 'recite'
  })

  const [maxPiPairs, setMaxPiPairs] = useState<number>(() => {
    const v = parseInt(readString(MAX_PAIRS_KEY) ?? '', 10)
    const cap = Math.floor(settings.maxPiDigits / 2)
    return v >= 10 && v <= cap ? v : cap
  })

  useEffect(() => {
    if (maxPiPairs > settingsMaxPairs) setMaxPiPairs(settingsMaxPairs)
  }, [settingsMaxPairs, maxPiPairs])

  // Tab bar + digit slider are chrome shared by every tab: publish them as the
  // PageLayout header (above the rail row) so each tab's rail top-aligns with
  // its body content, not with this chrome.
  useLayoutHeader(
    <div className="flex flex-col items-center gap-0">
      <div className="flex gap-1 p-1 rounded-lg bg-zinc-800 mb-2">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); safeSet(TAB_KEY, t) }}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-cyan-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500">Max π digits</span>
        <input
          type="range"
          min={10}
          max={settingsMaxPairs}
          step={10}
          value={maxPiPairs}
          onChange={e => {
            const v = +e.target.value
            setMaxPiPairs(v)
            safeSet(MAX_PAIRS_KEY, String(v))
          }}
          className="w-24 accent-cyan-500"
        />
        <span className="text-cyan-400 tabular-nums text-xs w-8 text-right">{maxPiPairs * 2}</span>
      </div>
    </div>,
    [tab, maxPiPairs, settingsMaxPairs],
  )

  return tab === 'memo'
    ? <PiMemoTab answerMode={answerMode} maxPiPairs={maxPiPairs} />
    : tab === 'train'
    ? <PiTrainTab answerMode={answerMode} maxPiPairs={maxPiPairs} />
    : tab === 'anchors'
    ? <PiAnchorTab answerMode={answerMode} maxPiPairs={maxPiPairs} />
    : <PiReciteTab answerMode={answerMode} maxPiPairs={maxPiPairs} />
}
