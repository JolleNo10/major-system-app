import { useLayoutEffect, useRef, type ReactNode } from 'react'

export type MapSurfaceDockPlacement = 'overlay' | 'attached' | 'stacked'
export type TaskDockVariant = 'navigation' | 'checkpoint' | 'form' | 'hint' | 'completion'

function isNativeInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="button"]'))
}

export function MapSurface({ context, map, dock, dockPlacement = 'overlay', className = '' }: {
  context: ReactNode
  map: ReactNode
  dock?: ReactNode
  dockPlacement?: MapSurfaceDockPlacement
  className?: string
}) {
  const dockClass = dockPlacement === 'overlay'
    ? 'xl:pointer-events-none xl:absolute xl:inset-x-3 xl:bottom-3 xl:z-10'
    : dockPlacement === 'attached'
    ? 'relative z-10 mx-3 xl:-mt-4'
      : 'relative z-10'

  return (
    <div data-map-surface className={`space-y-2 animate-fade-in ${className}`}>
      <div>{context}</div>
      <div className="relative">
        <div>{map}</div>
        {dock && <div className={dockClass}>{dock}</div>}
      </div>
    </div>
  )
}

export function TaskDock({
  children,
  status,
  tone = 'neutral',
  variant = 'form',
  focusPrimary = false,
  enableEnterPrimary = false,
}: {
  children?: ReactNode
  status?: ReactNode
  tone?: 'neutral' | 'ready'
  variant?: TaskDockVariant
  focusPrimary?: boolean
  enableEnterPrimary?: boolean
}) {
  const dockRef = useRef<HTMLDivElement>(null)
  const variantClass = {
    navigation: 'border-zinc-700/70 bg-zinc-950/80 px-3 py-2',
    checkpoint: 'border-zinc-700/70 bg-zinc-950/90 px-3 py-3',
    form: 'px-0 py-0',
    hint: 'border-zinc-700/50 bg-zinc-950/75 px-3 py-2',
    completion: 'border-zinc-700/70 bg-zinc-950/90 px-3 py-3',
  }[variant]
  const toneClass = tone === 'ready' ? 'border-green-500/40' : ''
  const statusClass = tone === 'ready' ? 'text-green-300' : 'text-zinc-300'
  const shellClass = variant === 'form'
    ? 'pointer-events-auto'
    : 'pointer-events-auto rounded-lg border shadow-lg backdrop-blur-md'

  useLayoutEffect(() => {
    if (!focusPrimary) return
    dockRef.current?.querySelector<HTMLElement>('[data-primary-action]:not([disabled])')?.focus()
  }, [focusPrimary])

  useLayoutEffect(() => {
    if (!enableEnterPrimary) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isNativeInteractiveTarget(event.target)) return
      const primary = dockRef.current?.querySelector<HTMLElement>('[data-primary-action]:not([disabled])')
      if (!primary) return
      event.preventDefault()
      primary.click()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enableEnterPrimary])

  return (
    <section
      ref={dockRef}
      data-task-dock
      className={`${shellClass} ${variantClass} ${toneClass}`}
    >
      {status && <div role="status" aria-live="polite" className={`mb-2 text-sm ${statusClass}`}>{status}</div>}
      {children}
    </section>
  )
}
