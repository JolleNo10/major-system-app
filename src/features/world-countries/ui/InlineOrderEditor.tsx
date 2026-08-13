import { PointerActivationConstraints } from '@dnd-kit/dom'
import { DragDropProvider, PointerSensor } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { useState } from 'react'
import { reorderDraft } from './reorderDraft'

export interface AutoOrderAction<T> {
  label: string
  pendingLabel: string
  hint: string
  errorMessage: string
  run: (draft: readonly T[]) => Promise<readonly T[]>
}

/** Workflow-neutral, draft-first ordering controls for an existing rail list. */
export function InlineOrderEditor<T>({
  entries,
  getId,
  getLabel,
  onItemHover,
  onItemLeave,
  onDraftChanged,
  onSave,
  onCancel,
  onResetCanonical,
  autoOrder,
}: {
  entries: readonly T[]
  getId: (item: T) => string
  getLabel: (item: T) => string
  onItemHover?: (item: T) => void
  onItemLeave?: () => void
  onDraftChanged: (draft: readonly T[]) => void
  onSave: (draft: readonly T[]) => void
  onCancel: () => void
  onResetCanonical: () => readonly T[]
  autoOrder?: AutoOrderAction<T>
}) {
  const [draft, setDraft] = useState(() => [...entries])
  const [autoOrdering, setAutoOrdering] = useState(false)
  const [autoOrderError, setAutoOrderError] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const updateDraft = (nextDraft: readonly T[]) => {
    setDraft([...nextDraft])
    onDraftChanged(nextDraft)
  }

  const reset = () => updateDraft(onResetCanonical())

  const runAutoOrder = async () => {
    if (!autoOrder) return
    setAutoOrdering(true)
    setAutoOrderError(false)
    try {
      updateDraft(await autoOrder.run(draft))
    } catch {
      setAutoOrderError(true)
    } finally {
      setAutoOrdering(false)
    }
  }

  const save = () => {
    try {
      onSave(draft)
      setSaveError(false)
    } catch {
      setSaveError(true)
    }
  }

  return (
    <>
      <p id="inline-order-editor-instructions" className="sr-only">
        Drag a handle to reorder. Focus a handle and press Space, use Arrow Up or Arrow Down, then press Space to drop. Press Escape to cancel.
      </p>
      {autoOrder && (
        <div className="mt-2 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runAutoOrder()}
              disabled={autoOrdering}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100 disabled:cursor-wait disabled:opacity-50"
            >
              {autoOrdering ? autoOrder.pendingLabel : autoOrder.label}
            </button>
            <span className="text-xs text-zinc-600">{autoOrder.hint}</span>
          </div>
          {autoOrderError && <p role="alert" className="text-xs text-red-300">{autoOrder.errorMessage}</p>}
        </div>
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
          updateDraft(reorderDraft(draft, source.initialIndex, source.index))
        }}
      >
        <ol className="mt-2 space-y-2" aria-describedby="inline-order-editor-instructions">
          {draft.map((item, index) => (
            <SortableOrderRow
              key={getId(item)}
              id={getId(item)}
              label={getLabel(item)}
              index={index}
              onHover={onItemHover ? () => onItemHover(item) : undefined}
              onLeave={onItemLeave}
            />
          ))}
        </ol>
      </DragDropProvider>
      {saveError && <p role="alert" className="mt-2 text-xs text-red-300">Could not save this order. Your draft is still available.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={save} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500">Save</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Cancel</button>
        <button type="button" onClick={reset} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Reset canonical order</button>
      </div>
    </>
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
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({ id, index })

  return (
    <li
      ref={ref}
      className={`world-order-row animate-shake flex items-center gap-2 rounded-lg border bg-zinc-950/40 px-3 py-2 transition-colors ${
        isDragging ? 'border-cyan-400/70 opacity-50' : isDropTarget ? 'border-cyan-500/70' : 'border-zinc-800'
      }`}
    >
      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-600" aria-label={`Sequence ${index + 1}`}>{index + 1}.</span>
      <button
        ref={handleRef}
        type="button"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onFocus={onHover}
        onBlur={onLeave}
        className="touch-none cursor-grab rounded border border-transparent px-1.5 py-1 text-lg leading-none text-zinc-500 hover:border-zinc-700 hover:text-cyan-300 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
        aria-label={`Reorder ${label}`}
        aria-describedby="inline-order-editor-instructions"
        title="Drag to reorder"
      >
        ⋮⋮
      </button>
      <span className="min-w-0 flex-1 text-sm text-zinc-300">{label}</span>
    </li>
  )
}
