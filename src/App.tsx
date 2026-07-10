import { useState, useCallback, useEffect } from 'react'
import type { Mode } from './types'
import { useAnswerMode } from './hooks/useAnswerMode'
import { ModeSelector } from './components/ModeSelector'
import { AnswerModeToggle } from './components/AnswerModeToggle'
import { ReferenceOverlay } from './components/ReferenceOverlay'
import { EncodingDrill } from './components/modes/EncodingDrill'
import { DecodingDrill } from './components/modes/DecodingDrill'
import { SoundKeyDrill } from './components/modes/SoundKeyDrill'
import { ReverseSoundKeyDrill } from './components/modes/ReverseSoundKeyDrill'
import { SequenceDrill } from './components/modes/SequenceDrill'
import { SpeedRound } from './components/modes/SpeedRound'
import { WeakSpots } from './components/modes/WeakSpots'
import { RepetitionDrill } from './components/modes/RepetitionDrill'

const MODE_TITLES: Record<Mode, string> = {
  home: 'Majorsystemet',
  encoding: 'Enkoding',
  decoding: 'Dekoding',
  'sound-key': 'Lydnøkkel',
  'reverse-sound-key': 'Omvendt lydnøkkel',
  sequence: 'Sekvenser',
  'speed-round': 'Hurtigrunde',
  'weak-spots': 'Svake punkter',
  'repetition': 'Repetisjon',
}

export default function App() {
  const [mode, setMode] = useState<Mode>('home')
  const [showReference, setShowReference] = useState(false)
  const { mode: answerMode, toggle: toggleAnswerMode } = useAnswerMode()

  const goHome = useCallback(() => setMode('home'), [])
  const closeRef = useCallback(() => setShowReference(false), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode !== 'home' && !showReference) goHome()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, showReference, goHome])

  return (
    <div className="min-h-dvh bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {mode !== 'home' ? (
            <button
              onClick={goHome}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-medium shrink-0"
              title="Tilbake (Esc)"
            >
              <span className="text-lg">←</span>
            </button>
          ) : (
            <span className="text-xl shrink-0">🧠</span>
          )}

          <span className="font-bold text-zinc-100 flex-1 truncate">
            {MODE_TITLES[mode]}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {mode !== 'home' && mode !== 'speed-round' && (
              <AnswerModeToggle mode={answerMode} onToggle={toggleAnswerMode} />
            )}
            <button
              onClick={() => setShowReference(true)}
              title="Referanse"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-violet-500 transition-colors text-sm font-medium text-zinc-300 hover:text-zinc-100"
            >
              <span>📚</span>
              <span className="hidden sm:inline">Referanse</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {mode === 'home' && <ModeSelector onSelectMode={setMode} />}
        {mode === 'encoding' && <EncodingDrill answerMode={answerMode} />}
        {mode === 'decoding' && <DecodingDrill answerMode={answerMode} />}
        {mode === 'sound-key' && <SoundKeyDrill answerMode={answerMode} />}
        {mode === 'reverse-sound-key' && <ReverseSoundKeyDrill answerMode={answerMode} />}
        {mode === 'sequence' && <SequenceDrill answerMode={answerMode} />}
        {mode === 'speed-round' && <SpeedRound answerMode={answerMode} />}
        {mode === 'weak-spots' && <WeakSpots answerMode={answerMode} />}
        {mode === 'repetition' && <RepetitionDrill answerMode={answerMode} />}
      </main>

      {/* Reference overlay */}
      {showReference && <ReferenceOverlay onClose={closeRef} />}
    </div>
  )
}
