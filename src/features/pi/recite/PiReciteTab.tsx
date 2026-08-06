import { useState } from 'react'
import { readString, safeSet } from '@/core/storage'
import { PiReciteFull } from '@/features/pi/recite/PiReciteFull'
import { PiReciteAnchors } from '@/features/pi/recite/PiReciteAnchors'
import type { ReciteMode } from '@/features/pi/recite/ReciteModeToggle'
import type { AnswerMode } from '@/core/types'

const MODE_KEY = 'major-pi-recite-mode'

interface Props { answerMode: AnswerMode; maxPiPairs: number }

// The Recite tab hosts two flavours behind one Full/Anchors toggle: reciting
// every pair in a range (PiReciteFull) or chaining each segment's opening pair
// (PiReciteAnchors, the former standalone Anchors tab). Each body keeps its own
// selection state/persistence and rails; this wrapper only owns the mode.
export function PiReciteTab({ answerMode, maxPiPairs }: Props) {
  const [mode, setMode] = useState<ReciteMode>(() =>
    readString(MODE_KEY) === 'anchors' ? 'anchors' : 'full',
  )

  const changeMode = (next: ReciteMode) => {
    setMode(next)
    safeSet(MODE_KEY, next)
  }

  return mode === 'anchors'
    ? <PiReciteAnchors answerMode={answerMode} maxPiPairs={maxPiPairs} mode={mode} onModeChange={changeMode} />
    : <PiReciteFull answerMode={answerMode} maxPiPairs={maxPiPairs} mode={mode} onModeChange={changeMode} />
}
