import { useState, useCallback, useEffect } from 'react'
import type { Mode } from './types'
import { useAnswerMode } from './hooks/useAnswerMode'
import { ModeSelector } from './components/ModeSelector'
import { AnswerModeToggle } from './components/AnswerModeToggle'
import { ReferenceOverlay } from './components/ReferenceOverlay'
import { SettingsOverlay } from './components/SettingsOverlay'
import { StatsOverlay } from './components/StatsOverlay'
import { EncodingDrill } from './components/modes/EncodingDrill'
import { DecodingDrill } from './components/modes/DecodingDrill'
import { SoundKeyDrill } from './components/modes/SoundKeyDrill'
import { ReverseSoundKeyDrill } from './components/modes/ReverseSoundKeyDrill'
import { SequenceDrill } from './components/modes/SequenceDrill'
import { SpeedRound } from './components/modes/SpeedRound'
import { WeakSpots } from './components/modes/WeakSpots'
import { RepetitionDrill } from './components/modes/RepetitionDrill'
import { PiDrill } from './components/modes/PiDrill'
import { MajorCardsDrill } from './components/modes/MajorCardsDrill'
import { ThemedCardsDrill } from './components/modes/ThemedCardsDrill'

const MODE_TITLES: Record<Mode, string> = {
  home: 'Major System',
  encoding: 'Encoding',
  decoding: 'Decoding',
  'sound-key': 'Sound Key',
  'reverse-sound-key': 'Reverse Sound Key',
  sequence: 'Sequences',
  'speed-round': 'Speed Round',
  'weak-spots': 'Weak Spots',
  'repetition': 'Repetition',
  'pi-digits': 'Digits of π',
  'cards': 'Card Deck',
  'themed-cards': 'Themed Deck',
}

export default function App() {
  const [mode, setMode] = useState<Mode>('home')
  const [showReference, setShowReference] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const { mode: answerMode, toggle: toggleAnswerMode } = useAnswerMode()

  const goHome = useCallback(() => setMode('home'), [])
  const closeRef = useCallback(() => setShowReference(false), [])
  const closeSettings = useCallback(() => setShowSettings(false), [])
  const closeStats = useCallback(() => setShowStats(false), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode !== 'home' && !showReference && !showSettings && !showStats) goHome()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, showReference, showSettings, showStats, goHome])

  return (
    <div className="min-h-dvh bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {mode !== 'home' ? (
            <button
              onClick={goHome}
              className="flex items-center justify-center min-h-[40px] min-w-[40px] -ml-2 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
              title="Back (Esc)"
              aria-label="Back"
            >
              <span className="text-xl">←</span>
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
              onClick={() => setShowStats(true)}
              title="Stats"
              aria-label="Stats"
              className="flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg bg-zinc-800 border border-zinc-700 hover:border-violet-500 transition-colors text-zinc-300 hover:text-zinc-100"
            >
              <span aria-hidden="true">📊</span>
            </button>
            <button
              onClick={() => setShowReference(true)}
              title="Reference"
              aria-label="Reference"
              className="flex items-center justify-center gap-1.5 px-3 min-h-[40px] min-w-[40px] rounded-lg bg-zinc-800 border border-zinc-700 hover:border-violet-500 transition-colors text-sm font-medium text-zinc-300 hover:text-zinc-100"
            >
              <span aria-hidden="true">📚</span>
              <span className="hidden sm:inline">Reference</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              title="Settings"
              aria-label="Settings"
              className="flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg bg-zinc-800 border border-zinc-700 hover:border-violet-500 transition-colors text-zinc-300 hover:text-zinc-100"
            >
              <span aria-hidden="true">⚙️</span>
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
        {mode === 'pi-digits' && <PiDrill answerMode={answerMode} />}
        {mode === 'cards' && <MajorCardsDrill answerMode={answerMode} />}
        {mode === 'themed-cards' && <ThemedCardsDrill answerMode={answerMode} />}
      </main>

      {/* Reference overlay */}
      {showReference && <ReferenceOverlay onClose={closeRef} />}

      {/* Settings overlay */}
      {showSettings && <SettingsOverlay onClose={closeSettings} />}

      {/* Stats overlay */}
      {showStats && <StatsOverlay onClose={closeStats} />}
    </div>
  )
}
