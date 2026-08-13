import { useEffect } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'

export function StagedCountryWalkthroughStep({
  entries, index, onMove, onContinue,
}: {
  entries: readonly Country[]
  index: number
  onMove: (offset: -1 | 1) => void
  onContinue: () => void
}) {
  const country = entries[index]
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="button"]')) return
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault()
        onMove(-1)
      } else if (event.key === 'ArrowRight' && index < entries.length - 1) {
        event.preventDefault()
        onMove(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [entries.length, index, onMove])
  if (!country) return null
  const controls = (
    <TaskDock variant="navigation" enableEnterPrimary>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-30">← Previous</button>
        {index < entries.length - 1 ? <button type="button" data-primary-action onClick={() => onMove(1)} className="min-w-0 flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Next →</button> : <button type="button" data-primary-action onClick={onContinue} className="min-w-0 flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Continue to Locate</button>}
      </div>
    </TaskDock>
  )
  return controls
}
