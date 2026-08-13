import { useLayoutEffect, useRef, type ReactNode } from 'react'

export type MapSurfaceDockPlacement = 'overlay' | 'attached' | 'stacked'
export type TaskDockVariant = 'navigation' | 'checkpoint' | 'form' | 'hint' | 'completion'

function isNativeInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="button"]'))
}

export function MapSurface({ context, map, mapMeta, dock, dockPlacement = 'overlay', className = '' }: {
  context: ReactNode
  map: ReactNode
  mapMeta?: ReactNode
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
        {mapMeta && <div className="pointer-events-none absolute left-3 top-3 z-10 text-left text-xs text-zinc-300 drop-shadow-md">{mapMeta}</div>}
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
    navigation: 'rounded-lg border border-zinc-700/70 bg-zinc-950/80 px-3 py-2 shadow-lg backdrop-blur-md',
    checkpoint: tone === 'ready'
      ? 'rounded-xl border border-green-500/40 bg-gradient-to-r from-green-950/50 via-zinc-950/95 to-zinc-950/95 px-3 py-3 shadow-xl backdrop-blur-md'
      : 'rounded-xl border border-zinc-700/70 bg-zinc-950/90 px-3 py-3 shadow-xl backdrop-blur-md',
    form: 'px-0 py-0',
    hint: 'rounded-lg border border-zinc-700/50 bg-zinc-950/75 px-3 py-2 shadow-lg backdrop-blur-md',
    completion: 'rounded-xl border border-green-500/30 bg-zinc-950/90 px-3 py-3 shadow-xl backdrop-blur-md',
  }[variant]
  const toneClass = tone === 'ready' ? 'border-green-500/50' : ''
  const statusClass = tone === 'ready' ? 'text-green-300' : 'text-zinc-300'
  const shellClass = 'pointer-events-auto'
  const horizontal = variant === 'checkpoint' || variant === 'completion'

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
      {horizontal ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {status && <div role="status" aria-live="polite" className={`min-w-0 text-sm ${statusClass}`}>{status}</div>}
          {children && <div className="shrink-0">{children}</div>}
        </div>
      ) : (
        <>
          {status && <div role="status" aria-live="polite" className={`mb-2 text-sm ${statusClass}`}>{status}</div>}
          {children}
        </>
      )}
    </section>
  )
}
