import { useLayoutEffect, useRef, type ReactNode } from 'react'

function isNativeInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="button"]'))
}

export function MapSurface({ context, map, dock, className = '' }: {
  context: ReactNode
  map: ReactNode
  dock?: ReactNode
  className?: string
}) {
  return (
    <div data-map-surface className={`space-y-3 animate-fade-in ${className}`}>
      <div>{context}</div>
      <div>{map}</div>
      {dock && <div>{dock}</div>}
    </div>
  )
}

export function TaskDock({
  children,
  status,
  tone = 'neutral',
  focusPrimary = false,
  enableEnterPrimary = false,
}: {
  children: ReactNode
  status?: ReactNode
  tone?: 'neutral' | 'ready'
  focusPrimary?: boolean
  enableEnterPrimary?: boolean
}) {
  const dockRef = useRef<HTMLDivElement>(null)

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
      className={`rounded-xl border p-4 ${tone === 'ready' ? 'border-green-500/30 bg-green-500/10' : 'border-zinc-800 bg-zinc-900'}`}
    >
      {status && <div role="status" aria-live="polite" className="mb-3 text-sm text-zinc-300">{status}</div>}
      {children}
    </section>
  )
}
