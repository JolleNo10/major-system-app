import type { ReactNode } from 'react'
import { TaskDock } from './MapSurface'

type TaskDockMessageVariant = 'checkpoint' | 'completion'

/**
 * The common vertical composition for concise World Countries status docks.
 * TaskDock remains the container so richer callers can keep composing it
 * directly when their content does not fit this message-and-actions shape.
 */
export function TaskDockMessage({
  header,
  description,
  actions,
  variant = 'checkpoint',
  tone = 'neutral',
  focusPrimary = false,
  enableEnterPrimary = false,
}: {
  header: ReactNode
  description: ReactNode
  actions: ReactNode
  variant?: TaskDockMessageVariant
  tone?: 'neutral' | 'ready'
  focusPrimary?: boolean
  enableEnterPrimary?: boolean
}) {
  return (
    <TaskDock
      variant={variant}
      tone={tone}
      contentSizing="contained"
      focusPrimary={focusPrimary}
      enableEnterPrimary={enableEnterPrimary}
    >
      <div data-task-dock-message className="min-w-0 space-y-3">
        <div data-task-dock-message-content role="status" aria-live="polite" className="min-w-0">
          <div data-task-dock-message-header className="text-sm text-zinc-300">{header}</div>
          <div data-task-dock-message-description className="mt-1 min-w-0 text-sm text-zinc-200">{description}</div>
        </div>
        <div data-task-dock-message-actions className="flex min-w-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      </div>
    </TaskDock>
  )
}
