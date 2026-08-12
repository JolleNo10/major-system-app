import { useState, useCallback, useEffect } from 'react'
import type { Mode } from '@/core/types'
import { MODES, HOME_TITLE } from '@/app/modes'
import { useAnswerMode } from '@/core/ui/useAnswerMode'
import { useSettings } from '@/app/settings/SettingsContext'
import { usePwaUpdate } from '@/app/settings/usePwaUpdate'
import { ModeSelector } from '@/app/ModeSelector'
import type { HomeSection } from '@/app/ModeSelector'
import { PageLayout } from '@/app/layout/PageLayout'
import { AnswerModeToggle } from '@/core/ui/AnswerModeToggle'
import { ReferenceOverlay } from '@/app/overlays/ReferenceOverlay'
import { SettingsOverlay } from '@/app/settings/SettingsOverlay'
import { StatsOverlay } from '@/app/overlays/StatsOverlay'

export default function App() {
  const [mode, setMode] = useState<Mode>('home')
  const [homeSection, setHomeSection] = useState<HomeSection>(null)
  const [showReference, setShowReference] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const { mode: answerMode, toggle: toggleAnswerMode } = useAnswerMode()
  const { settings } = useSettings()
  const pwa = usePwaUpdate(settings.offlineMode)

  const goHome = useCallback(() => setMode('home'), [])
  const closeRef = useCallback(() => setShowReference(false), [])

  // The Sound Key + Word List reference is Major-System-specific: show its
  // header button only inside Major-System drills or the Major-System home list.
  const showReferenceButton = mode !== 'home'
    ? MODES[mode].group === 'major-system'
    : homeSection === 'major-system'

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
            {mode === 'home' ? HOME_TITLE : MODES[mode].title}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {mode !== 'home' && !MODES[mode].hideAnswerToggle && (
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
            {showReferenceButton && (
              <button
                onClick={() => setShowReference(true)}
                title="Reference"
                aria-label="Reference"
                className="flex items-center justify-center gap-1.5 px-3 min-h-[40px] min-w-[40px] rounded-lg bg-zinc-800 border border-zinc-700 hover:border-violet-500 transition-colors text-sm font-medium text-zinc-300 hover:text-zinc-100"
              >
                <span aria-hidden="true">📚</span>
                <span className="hidden sm:inline">Reference</span>
              </button>
            )}
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

      {/* Main content — PageLayout owns the center column + optional rails (ADR 0001). */}
      <main className="flex-1 w-full px-4 py-6">
        <PageLayout>
          {mode === 'home'
            ? <ModeSelector onSelectMode={setMode} section={homeSection} onSectionChange={setHomeSection} />
            : (() => {
                const Drill = MODES[mode].component
                return <Drill answerMode={answerMode} />
              })()}
        </PageLayout>
      </main>

      {/* Reference overlay */}
      {showReference && <ReferenceOverlay onClose={closeRef} />}

      {/* Settings overlay */}
      {showSettings && <SettingsOverlay onClose={closeSettings} pwa={pwa} />}

      {/* Stats overlay */}
      {showStats && <StatsOverlay onClose={closeStats} />}
    </div>
  )
}
