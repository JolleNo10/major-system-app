import { useState } from 'react'
import { readString, safeSet } from '../../utils/storage'
import { PiMemoTab } from './PiMemoTab'
import { PiReciteTab } from './PiReciteTab'
import type { AnswerMode } from '../../types'

const TAB_KEY = 'major-pi-tab'
type Tab = 'memo' | 'recite'

interface Props { answerMode: AnswerMode }

export function PiDrill({ answerMode }: Props) {
  const [tab, setTab] = useState<Tab>(() =>
    readString(TAB_KEY) === 'memo' ? 'memo' : 'recite')

  return (
    <div className="flex flex-col items-center gap-0 py-4 w-full">
      <div className="flex gap-1 p-1 rounded-lg bg-zinc-800 mb-2">
        {(['memo', 'recite'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); safeSet(TAB_KEY, t) }}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-cyan-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t === 'memo' ? 'Memo' : 'Recite'}
          </button>
        ))}
      </div>
      {tab === 'memo'
        ? <PiMemoTab answerMode={answerMode} />
        : <PiReciteTab answerMode={answerMode} />
      }
    </div>
  )
}
