import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePageLayoutPresentation } from '@/app/layout/PageLayoutContext'

export type MapSurfaceDockPlacement = 'overlay' | 'attached' | 'stacked'
export type TaskDockVariant = 'navigation' | 'checkpoint' | 'form' | 'hint' | 'completion'

interface MapSurfaceFeedbackContextValue {
  setFeedbackOverlay: (feedbackOverlay: ReactNode | null) => void
}

const MapSurfaceFeedbackContext = createContext<MapSurfaceFeedbackContextValue | null>(null)
const EXPANDED_MEDIA_QUERY = '(min-width: 1280px)'

export function useMapSurfaceFeedbackOverlay(feedbackOverlay: ReactNode | null): void {
  const surface = useContext(MapSurfaceFeedbackContext)

  useLayoutEffect(() => {
    if (!surface) return
    surface.setFeedbackOverlay(feedbackOverlay)
    return () => surface.setFeedbackOverlay(null)
  }, [feedbackOverlay, surface])
}

export function MapFeedbackOverlay({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div data-map-feedback-overlay-host className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-5">
      {children}
    </div>
  )
}

function isNativeInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="button"]'))
}

export function MapSurface({ context, map, mapMeta, feedbackOverlay, dock, expandedCompanion, dockPlacement = 'overlay', className = '' }: {
  context: ReactNode
  map: ReactNode
  mapMeta?: ReactNode
  feedbackOverlay?: ReactNode
  dock?: ReactNode
  expandedCompanion?: ReactNode
  dockPlacement?: MapSurfaceDockPlacement
  className?: string
}) {
  const [registeredFeedbackOverlay, setRegisteredFeedbackOverlay] = useState<ReactNode | null>(null)
  const [expanded, setExpanded] = useState(false)
  const surfaceContext = useMemo(() => ({ setFeedbackOverlay: setRegisteredFeedbackOverlay }), [])
  const visibleFeedbackOverlay = feedbackOverlay !== undefined ? feedbackOverlay : registeredFeedbackOverlay
  const hasExpandedCompanion = expandedCompanion !== undefined && expandedCompanion !== null
  const expandedDockRow = expanded && hasExpandedCompanion
  usePageLayoutPresentation(expanded ? 'expanded-center' : 'standard', [expanded])

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia(EXPANDED_MEDIA_QUERY)
    const collapseBelowDesktop = () => {
      if (!media.matches) setExpanded(false)
    }
    collapseBelowDesktop()
    media.addEventListener?.('change', collapseBelowDesktop)
    media.addListener?.(collapseBelowDesktop)
    return () => {
      media.removeEventListener?.('change', collapseBelowDesktop)
      media.removeListener?.(collapseBelowDesktop)
    }
  }, [])

  const dockClass = expandedDockRow
    ? 'relative z-10 min-w-0 flex-1'
    : dockPlacement === 'overlay'
      ? expanded
        ? 'xl:pointer-events-none xl:absolute xl:left-1/2 xl:bottom-[14px] xl:z-20 xl:w-full xl:max-w-2xl xl:-translate-x-1/2'
        : 'xl:pointer-events-none xl:absolute xl:inset-x-[14px] xl:bottom-[14px] xl:z-20'
      : dockPlacement === 'attached'
        ? `relative z-10 mx-3 xl:-mt-4 ${expanded ? 'xl:mx-auto xl:max-w-2xl' : ''}`
        : `relative z-10 mt-2 ${expanded ? 'xl:mx-auto xl:max-w-2xl' : ''}`

  return (
    <MapSurfaceFeedbackContext.Provider value={surfaceContext}>
      <div
        data-map-surface
        data-map-surface-presentation={expanded ? 'expanded' : 'standard'}
        className={`space-y-2 animate-fade-in ${className}`}
      >
        <div data-map-surface-context>{context}</div>
        <div data-map-surface-body className="relative">
          {mapMeta && <div className="pointer-events-none absolute left-[18px] top-4 z-10 text-left text-xs text-zinc-300 drop-shadow-md">{mapMeta}</div>}
          <div data-map-surface-map className="relative">
            {map}
            {visibleFeedbackOverlay && <MapFeedbackOverlay>{visibleFeedbackOverlay}</MapFeedbackOverlay>}
          </div>
          <div className="pointer-events-none absolute right-3 top-3 z-30 hidden xl:block">
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse map' : 'Expand map'}
              title={expanded ? 'Collapse map' : 'Expand map'}
              onClick={() => setExpanded(value => !value)}
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-600/80 bg-zinc-950/75 text-lg text-zinc-200 shadow-lg backdrop-blur-md transition-colors hover:border-cyan-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
            >
              <span aria-hidden="true">{expanded ? '↙' : '↗'}</span>
            </button>
          </div>
          {dockPlacement === 'overlay' && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 rounded-b-2xl bg-gradient-to-t from-zinc-950/35 to-transparent" />}
          <div data-map-surface-dock-row className={expandedDockRow ? 'flex min-w-0 w-full items-stretch gap-3 px-3' : 'contents'}>
            {dock && <div data-map-surface-dock className={dockClass}>{dock}</div>}
            {expandedDockRow && <div data-map-surface-companion className="relative z-10 flex min-w-0 shrink-0 grow-0 basis-44 items-stretch">{expandedCompanion}</div>}
          </div>
        </div>
      </div>
    </MapSurfaceFeedbackContext.Provider>
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
    form: 'rounded-[18px] border border-white/[0.11] bg-[linear-gradient(180deg,rgba(20,22,28,0.54),rgba(11,12,16,0.72))] px-4 py-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[18px] backdrop-saturate-125',
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
          {status && <div className={`mb-2 text-sm ${statusClass}`}>{status}</div>}
          {children}
        </>
      )}
    </section>
  )
}
