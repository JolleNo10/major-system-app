import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useOverlay } from '@/app/layout/useOverlay'
import {
  usePageLayoutPresentationMode,
  usePageRails,
  usePageHeader,
} from '@/app/layout/PageLayoutContext'

// The one base layout for every screen (ADR 0001). A fixed-width center column
// flanked by optional left/right rails. Rules that make it drift-proof:
//
//   • Center is a hard 42rem (max-w-2xl, 672px) at xl+, and shrinks to fit
//     below that. It NEVER moves whether 0, 1, or 2 rails are present.
//   • The grid gutters are symmetric — minmax(0, 18rem) each — so they shrink
//     together and cap at 288px. Equal gutters keep the center dead-centered on
//     the viewport, so a rail appearing/vanishing cannot nudge it.
//   • Single breakpoint (xl / 1280px): three columns at/above, drawers below.
//   • The center IS the mode's entire content column; everything a mode renders
//     is `children`, so nothing can align to a different width.
//
// Rails are not props here — App renders one PageLayout and drills publish their
// current rails through `useRails` (see PageLayoutContext), which keeps every
// phase of every mode inside this one column automatically.

const TOGGLE_CLS =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 ' +
  'text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:border-violet-500 transition-colors'

export function PageLayout({ children }: { children: ReactNode }) {
  const { left, right, leftLabel = 'Stats', rightLabel = 'Tools' } = usePageRails()
  const header = usePageHeader()
  const presentation = usePageLayoutPresentationMode()
  const expanded = presentation === 'expanded-center'
  const [openDrawer, setOpenDrawer] = useState<'left' | 'right' | null>(null)

  useLayoutEffect(() => {
    if (expanded) setOpenDrawer(null)
  }, [expanded])

  return (
    <div
      data-page-layout
      data-page-layout-presentation={presentation}
      className="w-full"
    >
      {/* Header chrome — spans the center-column width, centered, above the rail
          row. Keeping it out of the grid lets the rails top-align with the body
          content rather than with the chrome. */}
      {header && !expanded && (
        <div className="mx-auto w-full max-w-2xl">
          {header}
        </div>
      )}

      {/* Narrow-screen toggles — one per registered rail. */}
      {!expanded && (left || right) && (
        <div className="flex justify-center gap-2 mb-4 xl:hidden">
          {left && (
            <button onClick={() => setOpenDrawer('left')} className={TOGGLE_CLS}>
              <span aria-hidden="true">📊</span> {leftLabel}
            </button>
          )}
          {right && (
            <button onClick={() => setOpenDrawer('right')} className={TOGGLE_CLS}>
              <span aria-hidden="true">🧰</span> {rightLabel}
            </button>
          )}
        </div>
      )}

      {/* 3-column grid: [gutter] [center] [gutter]. Below xl only the center
          track exists (shrinks to fit on phones). At xl+ the symmetric gutters
          appear and the center is pinned to a hard 42rem. justify-center centers
          the whole track group, so surplus space splits evenly to both sides.
          items-start keeps every cell content-height (top-aligned) — without it
          the grid stretches the rails to the center's full height. */}
      <div className={expanded
        ? 'grid w-full min-w-0 items-start justify-center gap-6 px-4 xl:px-8 grid-cols-[minmax(0,1fr)]'
        : 'grid w-full items-start justify-center gap-6 grid-cols-[minmax(0,42rem)] xl:grid-cols-[minmax(0,18rem)_42rem_minmax(0,18rem)]'}
      >
        {/* Gutters are plain blocks so the rail fills the gutter width and sits
            right beside the center (connected), and stays as tall as its own
            content. Only real columns at xl. */}
        <div className={expanded ? 'hidden' : 'hidden min-w-0 xl:block'}>{left}</div>
        <div className={expanded ? 'min-w-0 w-full' : 'min-w-0'}>{children}</div>
        <div className={expanded ? 'hidden' : 'hidden min-w-0 xl:block'}>{right}</div>
      </div>

      {!expanded && openDrawer === 'left' && left && (
        <Drawer side="left" label={leftLabel} onClose={() => setOpenDrawer(null)}>{left}</Drawer>
      )}
      {!expanded && openDrawer === 'right' && right && (
        <Drawer side="right" label={rightLabel} onClose={() => setOpenDrawer(null)}>{right}</Drawer>
      )}
    </div>
  )
}

function Drawer({ side, label, onClose, children }: {
  side: 'left' | 'right'
  label: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useOverlay(ref, onClose)
  const sideCls = side === 'left' ? 'left-0 border-r' : 'right-0 border-l'

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in xl:hidden" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`fixed inset-y-0 z-50 w-80 max-w-[85vw] flex flex-col bg-zinc-950 border-zinc-800 outline-none animate-fade-in xl:hidden ${sideCls}`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 shrink-0">
          <span className="font-semibold text-zinc-100">{label}</span>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-xl"
            title="Close (Esc)"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  )
}
