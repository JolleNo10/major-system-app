import { useRef, type ReactNode } from 'react'
import { useOverlay } from '@/app/layout/useOverlay'

// Full-screen modal shell shared by every overlay: the role="dialog" root, the
// useOverlay focus-trap/Escape wiring, the header bar with a close button, and
// the scrollable body. Callers supply the header content and the body.

interface Props {
  onClose: () => void
  ariaLabel: string
  header: ReactNode        // left side of the header bar (title text or tabs)
  maxWidth?: string        // body max-width utility (default max-w-2xl)
  bodyClassName?: string   // extra classes on the inner body container
  presentation?: 'modal' | 'side-panel'
  children: ReactNode
}

export function Overlay({ onClose, ariaLabel, header, maxWidth = 'max-w-2xl', bodyClassName = '', presentation = 'modal', children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useOverlay(ref, onClose)
  const sidePanel = presentation === 'side-panel'

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      tabIndex={-1}
      className={`fixed inset-0 z-[60] animate-fade-in outline-none ${sidePanel ? 'bg-black/30' : 'bg-zinc-950'}`}
    >
      <div className={sidePanel ? 'ml-auto flex h-full w-full max-w-xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl' : 'flex h-full flex-col'}>
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 shrink-0">
        {header}
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-xl"
          title="Close (Esc)"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className={`${maxWidth} mx-auto px-4 sm:px-6 py-6 ${bodyClassName}`}>
          {children}
        </div>
      </div>
      </div>
    </div>
  )
}

// A header tab button (Reference / Stats). `active` styles the current tab.
export function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  )
}
