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

export type PageLayoutPresentation = 'standard' | 'expanded-center'

const STANDARD_PRESENTATION: PageLayoutPresentation = 'standard'

const EMPTY_RAILS: RailConfig = {}

interface PageLayoutReadContext {
  rails: RailConfig
  header: ReactNode
  presentation: PageLayoutPresentation
}

interface PageLayoutWriteContext {
  setRails: (rails: RailConfig) => void
  setHeader: (header: ReactNode) => void
  setPresentation: (presentation: PageLayoutPresentation) => void
}

const PageLayoutReadCtx = createContext<PageLayoutReadContext | null>(null)
const PageLayoutWriteCtx = createContext<PageLayoutWriteContext | null>(null)

export function PageLayoutProvider({ children }: { children: ReactNode }) {
  const [rails, setRails] = useState<RailConfig>(EMPTY_RAILS)
  const [header, setHeader] = useState<ReactNode>(null)
  const [presentation, setPresentation] = useState<PageLayoutPresentation>(STANDARD_PRESENTATION)
  // Publishers receive a separate, stable context so publishing a slot does
  // not re-render the component that owns that slot. This matters because
  // useRails/useLayoutHeader accept dependency arrays and their callers may
  // create ReactNodes or functions while rendering.
  const readValue = useMemo<PageLayoutReadContext>(
    () => ({ rails, header, presentation }),
    [rails, header, presentation],
  )
  const writeValue = useMemo<PageLayoutWriteContext>(
    () => ({ setRails, setHeader, setPresentation }),
    [],
  )
  return (
    <PageLayoutWriteCtx.Provider value={writeValue}>
      <PageLayoutReadCtx.Provider value={readValue}>{children}</PageLayoutReadCtx.Provider>
    </PageLayoutWriteCtx.Provider>
  )
}

function usePageLayoutRead(): PageLayoutReadContext {
  const ctx = useContext(PageLayoutReadCtx)
  if (!ctx) throw new Error('usePageLayout must be used within PageLayoutProvider')
  return ctx
}

function usePageLayoutWrite(): PageLayoutWriteContext {
  const ctx = useContext(PageLayoutWriteCtx)
  if (!ctx) throw new Error('usePageLayout must be used within PageLayoutProvider')
  return ctx
}

/** PageLayout reads the currently-registered rails. */
export function usePageRails(): RailConfig {
  return usePageLayoutRead().rails
}

/** PageLayout reads the currently-registered header (chrome above the rail row). */
export function usePageHeader(): ReactNode {
  return usePageLayoutRead().header
}

/** PageLayout reads the transient presentation requested by the current view. */
export function usePageLayoutPresentationMode(): PageLayoutPresentation {
  return usePageLayoutRead().presentation
}

/**
 * Register the rails for the current view. Pass a `deps` array (like useMemo):
 * the rails are re-published only when a dep changes, avoiding unnecessary slot
 * updates when a fresh ReactNode is created on every render. Publishers use a
 * write-only context, so publishing cannot re-render the publisher itself.
 * Rails are cleared automatically on unmount (e.g. switching Pi tabs).
 */
export function useRails(config: RailConfig, deps: DependencyList): void {
  const { setRails } = usePageLayoutWrite()
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
  const { setHeader } = usePageLayoutWrite()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(() => node, deps)
  useLayoutEffect(() => {
    setHeader(memoized)
    return () => setHeader(null)
  }, [memoized, setHeader])
}

/**
 * Register the transient PageLayout presentation for the current view. The
 * owner is returned to standard presentation automatically when it unmounts.
 */
export function usePageLayoutPresentation(
  presentation: PageLayoutPresentation,
  deps: DependencyList,
): void {
  const { setPresentation } = usePageLayoutWrite()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(() => presentation, deps)
  useLayoutEffect(() => {
    setPresentation(memoized)
    return () => setPresentation(STANDARD_PRESENTATION)
  }, [memoized, setPresentation])
}
