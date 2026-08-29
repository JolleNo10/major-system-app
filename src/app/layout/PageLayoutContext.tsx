import {
  createContext, useContext, useLayoutEffect, useMemo, useState,
  type ReactNode,
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
  // not re-render the component that owns that slot. Callers memoize their
  // published values with standard React Hooks before writing to this context.
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
 * Register the rails for the current view. Callers should pass a value created
 * by `useMemo` so fresh ReactNodes do not cause unnecessary slot updates.
 * Publishers use a write-only context, so publishing cannot re-render the
 * publisher itself. Rails are cleared automatically on unmount.
 */
export function useRails(config: RailConfig): void {
  const { setRails } = usePageLayoutWrite()
  useLayoutEffect(() => {
    setRails(config)
    return () => setRails(EMPTY_RAILS)
  }, [config, setRails])
}

/**
 * Register the header chrome (rendered above the rail row, centered at the
 * center-column width). Callers should pass a value created by `useMemo` when
 * its ReactNode is built from render-time inputs. Cleared on unmount.
 */
export function useLayoutHeader(node: ReactNode): void {
  const { setHeader } = usePageLayoutWrite()
  useLayoutEffect(() => {
    setHeader(node)
    return () => setHeader(null)
  }, [node, setHeader])
}

/**
 * Register the transient PageLayout presentation for the current view. The
 * owner is returned to standard presentation automatically when it unmounts.
 */
export function usePageLayoutPresentation(
  presentation: PageLayoutPresentation,
): void {
  const { setPresentation } = usePageLayoutWrite()
  useLayoutEffect(() => {
    setPresentation(presentation)
    return () => setPresentation(STANDARD_PRESENTATION)
  }, [presentation, setPresentation])
}
