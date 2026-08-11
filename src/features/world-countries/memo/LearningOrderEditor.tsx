import { PointerActivationConstraints } from '@dnd-kit/dom'
import { DragDropProvider, PointerSensor } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { useState } from 'react'
import { reorderDraft } from './reorderDraft'

/**
 * Optional best-effort auto-ordering action (for example, reading map label
 * positions) that returns a reordered draft.
 */
export interface AutoOrderAction<T> {
  label: string
  pendingLabel: string
  hint: string
  errorMessage: string
  run: (draft: readonly T[]) => Promise<readonly T[]>
}

/**
 * Shared draft-first learning-order editor used at every Geography hierarchy
 * level. Callers supply identity/label accessors and persistence so the view,
 * drag-and-drop, keyboard reordering, and map auto-ordering stay in one place.
 */
export function LearningOrderEditor<T>({
  entries,
  getId,
  getLabel,
  onItemHover,
  onDraftChanged,
  persistOrder,
  resetOrder,
  onChanged,
  onClose,
  autoOrder,
}: {
  entries: readonly T[]
  getId: (item: T) => string
  getLabel: (item: T) => string
  onItemHover?: (item: T | null) => void
  onDraftChanged: (draft: readonly T[]) => void
  persistOrder: (orderedIds: string[]) => void
  resetOrder: () => void
  onChanged: () => void
  onClose: () => void
  autoOrder?: AutoOrderAction<T>
}) {
  const [draft, setDraft] = useState(() => [...entries])
  const [autoOrdering, setAutoOrdering] = useState(false)
  const [autoOrderError, setAutoOrderError] = useState(false)

  const save = () => {
    persistOrder(draft.map(getId))
    onChanged()
    onClose()
  }

  const reset = () => {
    resetOrder()
    onChanged()
    onClose()
  }

  const runAutoOrder = async () => {
    if (!autoOrder) return
    setAutoOrdering(true)
    setAutoOrderError(false)
    try {
      const nextDraft = [...await autoOrder.run(draft)]
      setDraft(nextDraft)
      onDraftChanged(nextDraft)
    } catch {
      setAutoOrderError(true)
    } finally {
      setAutoOrdering(false)
    }
  }

  return (
    <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4" aria-labelledby="order-editor-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="order-editor-heading" className="font-semibold text-zinc-100">Edit learning order</h3>
          <p className="mt-1 text-xs text-zinc-500">This order is shared by Memo and future Recite workflows.</p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-200">Close</button>
      </div>

      <p id="order-editor-instructions" className="mt-3 text-xs leading-relaxed text-zinc-500">
        Drag the handle to reorder. For keyboard control, focus a handle and press Space, use Arrow Up or Arrow Down, then press Space to drop. Press Escape to cancel.
      </p>

      {autoOrder && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runAutoOrder()}
              disabled={autoOrdering}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100 disabled:cursor-wait disabled:opacity-50"
            >
              {autoOrdering ? autoOrder.pendingLabel : autoOrder.label}
            </button>
            <span className="text-xs text-zinc-600">{autoOrder.hint}</span>
          </div>
          {autoOrderError && (
            <p role="alert" className="mt-2 text-xs text-red-300">{autoOrder.errorMessage}</p>
          )}
        </>
      )}

      <DragDropProvider
        sensors={defaults => [
          PointerSensor.configure({
            activationConstraints(event) {
              if (event.pointerType === 'touch') {
                return [new PointerActivationConstraints.Delay({ value: 300, tolerance: 5 })]
              }
              return [new PointerActivationConstraints.Distance({ value: 8 })]
            },
          }),
          ...defaults.filter(sensor => sensor !== PointerSensor),
        ]}
        onDragEnd={event => {
          if (event.canceled) return
          const { source } = event.operation
          if (!source || !isSortable(source) || source.initialIndex === source.index) return
          const nextDraft = reorderDraft(draft, source.initialIndex, source.index)
          setDraft(nextDraft)
          onDraftChanged(nextDraft)
        }}
      >
        <ol className="mt-4 space-y-2" aria-describedby="order-editor-instructions">
          {draft.map((item, index) => (
            <SortableOrderRow
              key={getId(item)}
              id={getId(item)}
              label={getLabel(item)}
              index={index}
              onHover={onItemHover ? () => onItemHover(item) : undefined}
              onLeave={onItemHover ? () => onItemHover(null) : undefined}
            />
          ))}
        </ol>
      </DragDropProvider>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={save} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Save order</button>
        <button type="button" onClick={reset} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500">Reset canonical order</button>
      </div>
    </section>
  )
}

function SortableOrderRow({
  id,
  label,
  index,
  onHover,
  onLeave,
}: {
  id: string
  label: string
  index: number
  onHover?: () => void
  onLeave?: () => void
}) {
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id,
    index,
  })

  return (
    <li
      ref={ref}
      className={`flex items-center gap-2 rounded-lg border bg-zinc-950/40 px-3 py-2 transition-colors ${
        isDragging
          ? 'border-cyan-400/70 opacity-50'
          : isDropTarget
            ? 'border-cyan-500/70'
            : 'border-zinc-800'
      }`}
    >
      <span className="w-6 text-xs tabular-nums text-zinc-600">{index + 1}.</span>
      <button
        ref={handleRef}
        type="button"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onFocus={onHover}
        onBlur={onLeave}
        className="touch-none cursor-grab rounded border border-transparent px-1.5 py-1 text-lg leading-none text-zinc-500 hover:border-zinc-700 hover:text-cyan-300 active:cursor-grabbing"
        aria-label={`Reorder ${label}`}
        aria-describedby="order-editor-instructions"
        title="Drag to reorder"
      >
        ⠿
      </button>
      <span className="min-w-0 flex-1 text-sm text-zinc-300">{label}</span>
    </li>
  )
}
