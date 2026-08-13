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
    ? 'xl:pointer-events-none xl:absolute xl:inset-x-[14px] xl:bottom-[14px] xl:z-20'
    : dockPlacement === 'attached'
      ? 'relative z-10 mx-3 xl:-mt-4'
      : 'relative z-10'

  return (
    <div data-map-surface className={`space-y-2 animate-fade-in ${className}`}>
      <div>{context}</div>
      <div className="relative">
        {mapMeta && <div className="pointer-events-none absolute left-[18px] top-4 z-10 text-left text-xs text-zinc-300 drop-shadow-md">{mapMeta}</div>}
        <div>{map}</div>
        {dockPlacement === 'overlay' && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 rounded-b-2xl bg-gradient-to-t from-zinc-950/35 to-transparent" />}
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
    navigation: 'rounded-[12px] border border-zinc-700/70 bg-zinc-950/80 p-2 shadow-[0_14px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl',
    checkpoint: tone === 'ready'
      ? 'rounded-[14px] border border-green-500/40 bg-[linear-gradient(90deg,rgba(5,46,22,0.92),rgba(9,9,11,0.94))] px-4 py-3.5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-[14px]'
      : 'rounded-[14px] border border-zinc-700/80 bg-zinc-950/90 px-4 py-3.5 shadow-[0_18px_55px_rgba(0,0,0,0.42)] backdrop-blur-[14px]',
    form: 'rounded-[14px] border border-zinc-700/80 bg-zinc-950/90 px-4 py-3.5 shadow-[0_18px_55px_rgba(0,0,0,0.42)] backdrop-blur-[14px]',
    hint: 'rounded-lg border border-zinc-700/50 bg-zinc-950/75 px-3 py-2 shadow-lg backdrop-blur-md',
    completion: 'rounded-[14px] border border-green-500/30 bg-zinc-950/90 px-4 py-3.5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-[14px]',
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
        <div className="flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
          {status && <div role="status" aria-live="polite" className={`min-w-0 flex-1 text-sm ${statusClass}`}>{status}</div>}
          {children && <div className="w-full shrink-0 xl:w-auto">{children}</div>}
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
