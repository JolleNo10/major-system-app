import { useRef, useState, type ReactNode } from 'react'
import { useOverlay } from '../hooks/useOverlay'

// Opt-in three-pane layout: optional left (stats/context) and right (tools)
// rails flanking a drill's main content. On lg+ the provided rails render as
// persistent columns; below lg they collapse into slide-in drawers opened from
// a small toolbar row. Drawers reuse the app's useOverlay wiring (focus trap,
// Escape, backdrop, overlayGuard) so the drill's global keydown handlers stay
// dormant behind them. Rails not supplied are simply omitted.

interface Props {
  children: ReactNode
  left?: ReactNode
  right?: ReactNode
  leftLabel?: string
  rightLabel?: string
}

const TOGGLE_CLS =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 ' +
  'text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:border-violet-500 transition-colors'

export function ToolLayout({ children, left, right, leftLabel = 'Stats', rightLabel = 'Tools' }: Props) {
  const [openDrawer, setOpenDrawer] = useState<'left' | 'right' | null>(null)
  // Rails become persistent side columns only at xl+, where there's room to
  // break out (xl:-mx-20) beyond the reading column and flank the main pane
  // without shrinking it. The side cells are ALWAYS both rendered at xl (empty
  // when a rail is absent) so they're symmetric — that keeps the main pane the
  // same width and dead-centered whether 0, 1, or 2 rails exist. Below xl the
  // rails collapse to the drawer toggles below.
  const cellCls = 'hidden xl:flex xl:w-72 shrink-0'

  return (
    <div className="w-full">
      {/* Narrow-screen toggles — one per provided rail. */}
      {(left || right) && (
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

      <div className="flex items-start justify-center gap-6 xl:-mx-20">
        {(left || right) && <div className={`${cellCls} justify-start`}>{left}</div>}
        <div className="min-w-0 flex flex-col items-center">{children}</div>
        {(left || right) && <div className={`${cellCls} justify-end`}>{right}</div>}
      </div>

      {openDrawer === 'left' && left && (
        <Drawer side="left" label={leftLabel} onClose={() => setOpenDrawer(null)}>{left}</Drawer>
      )}
      {openDrawer === 'right' && right && (
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
