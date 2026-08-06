import {
  createContext, useContext, useLayoutEffect, useMemo, useState,
  type DependencyList, type ReactNode,
} from 'react'

// Slots injected into the single app-wide PageLayout (ADR 0001). A drill/tab
// describes the rails and/or header for its *current* view; PageLayout renders
// them around/above its center column. Because there is exactly one PageLayout
// (owned by App) and everything a mode renders lives inside its center column,
// nothing can drift out of alignment.
//
//   • rails  — left/right panels flanking the BODY (top-aligned with the body,
//     i.e. the content, not any header above it). Gutters at xl+, drawers below.
//   • header — chrome that spans the center width ABOVE the rail row (e.g. Pi's
//     tab bar + digit slider), so the rails align with the body content beneath
//     it rather than with the chrome.

export interface RailConfig {
  left?: ReactNode
  right?: ReactNode
  leftLabel?: string
  rightLabel?: string
}

const EMPTY_RAILS: RailConfig = {}

interface Ctx {
  rails: RailConfig
  setRails: (rails: RailConfig) => void
  header: ReactNode
  setHeader: (header: ReactNode) => void
}

const PageLayoutCtx = createContext<Ctx | null>(null)

export function PageLayoutProvider({ children }: { children: ReactNode }) {
  const [rails, setRails] = useState<RailConfig>(EMPTY_RAILS)
  const [header, setHeader] = useState<ReactNode>(null)
  // The setters are stable useState dispatchers; memoize the value so the
  // context only changes identity when a slot actually changes.
  const value = useMemo<Ctx>(
    () => ({ rails, setRails, header, setHeader }),
    [rails, header],
  )
  return <PageLayoutCtx.Provider value={value}>{children}</PageLayoutCtx.Provider>
}

function usePageLayoutCtx(): Ctx {
  const ctx = useContext(PageLayoutCtx)
  if (!ctx) throw new Error('usePageLayout must be used within PageLayoutProvider')
  return ctx
}

/** PageLayout reads the currently-registered rails. */
export function usePageRails(): RailConfig {
  return usePageLayoutCtx().rails
}

/** PageLayout reads the currently-registered header (chrome above the rail row). */
export function usePageHeader(): ReactNode {
  return usePageLayoutCtx().header
}

/**
 * Register the rails for the current view. Pass a `deps` array (like useMemo):
 * the rails are re-published only when a dep changes — this is what prevents an
 * update loop, since a fresh ReactNode is created on every render. Rails are
 * cleared automatically on unmount (e.g. switching Pi tabs).
 */
export function useRails(config: RailConfig, deps: DependencyList): void {
  const { setRails } = usePageLayoutCtx()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(() => config, deps)
  useLayoutEffect(() => {
    setRails(memoized)
    return () => setRails(EMPTY_RAILS)
  }, [memoized, setRails])
}

/**
 * Register the header chrome (rendered above the rail row, centered at the
 * center-column width). Same `deps`/loop rules as {@link useRails}; cleared on
 * unmount.
 */
export function useLayoutHeader(node: ReactNode, deps: DependencyList): void {
  const { setHeader } = usePageLayoutCtx()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(() => node, deps)
  useLayoutEffect(() => {
    setHeader(memoized)
    return () => setHeader(null)
  }, [memoized, setHeader])
}
