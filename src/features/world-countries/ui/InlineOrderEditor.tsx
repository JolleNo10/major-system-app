import { PointerActivationConstraints } from '@dnd-kit/dom'
import { DragDropProvider, PointerSensor } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { useEffect, useRef, useState } from 'react'
import { reorderDraft } from './reorderDraft'

export interface AutoOrderAction<T> {
  label: string
  pendingLabel: string
  hint: string
  errorMessage: string
  run: (draft: readonly T[]) => Promise<readonly T[]>
}

export interface InlineOrderClickState {
  active: boolean
  positions: ReadonlyMap<string, number>
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
  clickOrder = false,
  onClickOrderStateChange,
  onClickOrderToggle,
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
  clickOrder?: boolean
  onClickOrderStateChange?: (state: InlineOrderClickState) => void
  onClickOrderToggle?: ((toggle: ((id: string) => void) | null) => void)
}) {
  const [draft, setDraft] = useState(() => [...entries])
  const [clickMode, setClickMode] = useState(false)
  const [clickSequence, setClickSequence] = useState<readonly string[]>([])
  const [autoOrdering, setAutoOrdering] = useState(false)
  const [autoOrderError, setAutoOrderError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const autoOrderRunRef = useRef(0)
  const clickModeDraftRef = useRef<readonly T[] | null>(null)
  const clickSequenceRef = useRef<readonly string[]>([])
  const clickToggleRef = useRef<(id: string) => void>(() => undefined)
  const clickStateCallbackRef = useRef(onClickOrderStateChange)
  const clickToggleCallbackRef = useRef(onClickOrderToggle)
  clickStateCallbackRef.current = onClickOrderStateChange
  clickToggleCallbackRef.current = onClickOrderToggle

  useEffect(() => () => {
    autoOrderRunRef.current += 1
  }, [])

  const invalidateAutoOrder = () => {
    autoOrderRunRef.current += 1
    setAutoOrdering(false)
  }

  const updateDraft = (nextDraft: readonly T[]) => {
    invalidateAutoOrder()
    setDraft([...nextDraft])
    onDraftChanged(nextDraft)
  }

  const clearClickMode = () => {
    setClickMode(false)
    clickSequenceRef.current = []
    setClickSequence([])
    clickModeDraftRef.current = null
  }

  const restoreClickModeDraft = () => {
    if (!clickMode || clickSequence.length === draft.length) return draft
    const restoredDraft = clickModeDraftRef.current ?? draft
    setDraft([...restoredDraft])
    onDraftChanged(restoredDraft)
    return restoredDraft
  }

  const leaveClickMode = () => {
    const nextDraft = restoreClickModeDraft()
    clearClickMode()
    return nextDraft
  }

  const reset = () => {
    if (clickMode) clearClickMode()
    updateDraft(onResetCanonical())
  }

  const runAutoOrder = async () => {
    if (!autoOrder) return
    const sourceDraft = clickMode ? leaveClickMode() : draft
    const runId = autoOrderRunRef.current + 1
    autoOrderRunRef.current = runId
    setAutoOrdering(true)
    setAutoOrderError(false)
    try {
      const nextDraft = [...await autoOrder.run(sourceDraft)]
      if (autoOrderRunRef.current !== runId) return
      setDraft(nextDraft)
      onDraftChanged(nextDraft)
    } catch {
      if (autoOrderRunRef.current !== runId) return
      setAutoOrderError(true)
    } finally {
      if (autoOrderRunRef.current === runId) setAutoOrdering(false)
    }
  }

  const save = () => {
    if (autoOrdering || (clickMode && clickSequence.length !== draft.length)) return
    invalidateAutoOrder()
    try {
      onSave(draft)
      setSaveError(false)
    } catch {
      setSaveError(true)
    }
  }

  const cancel = () => {
    invalidateAutoOrder()
    onCancel()
  }

  const enterClickMode = () => {
    if (!clickOrder || autoOrdering) return
    clickModeDraftRef.current = [...draft]
    clickSequenceRef.current = []
    setClickSequence([])
    setClickMode(true)
  }

  const toggleClickEntry = (entry: T) => {
    if (!clickMode) return
    const id = getId(entry)
    const currentSequence = clickSequenceRef.current
    const nextSequence = currentSequence.includes(id)
      ? currentSequence.filter(candidate => candidate !== id)
      : [...currentSequence, id]
    clickSequenceRef.current = nextSequence
    setClickSequence(nextSequence)

    if (nextSequence.length !== draft.length || draft.some(item => !nextSequence.includes(getId(item)))) return
    const nextDraft = nextSequence
      .map(candidate => draft.find(item => getId(item) === candidate))
      .filter((item): item is T => item !== undefined)
    if (nextDraft.length !== draft.length) return
    setDraft(nextDraft)
    onDraftChanged(nextDraft)
  }

  const clickSequencePositions = new Map(clickSequence.map((id, index) => [id, index + 1]))
  const clickSequenceComplete = clickSequence.length === draft.length && draft.every(item => clickSequencePositions.has(getId(item)))

  clickToggleRef.current = (id: string) => {
    if (!clickMode) return
    const entry = draft.find(item => getId(item) === id)
    if (entry) toggleClickEntry(entry)
  }

  useEffect(() => {
    onClickOrderStateChange?.({ active: clickMode, positions: clickSequencePositions })
  }, [clickMode, clickSequence, draft, onClickOrderStateChange])

  useEffect(() => {
    onClickOrderToggle?.(clickMode ? id => clickToggleRef.current(id) : null)
    return () => onClickOrderToggle?.(null)
  }, [clickMode, onClickOrderToggle])

  useEffect(() => () => {
    clickStateCallbackRef.current?.({ active: false, positions: new Map() })
    clickToggleCallbackRef.current?.(null)
  }, [])

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
      {clickOrder && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{clickMode ? 'Click order' : 'Order tools'}</p>
            {clickMode && <p id="inline-click-order-status" role="status" aria-live="polite" className="mt-1 text-xs tabular-nums text-zinc-400">{clickSequence.length} / {draft.length} selected</p>}
          </div>
          <button
            type="button"
            onClick={clickMode ? leaveClickMode : enterClickMode}
            disabled={autoOrdering}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100 disabled:cursor-wait disabled:opacity-50"
          >
            {clickMode ? 'Use drag & drop' : 'Click order'}
          </button>
        </div>
      )}
      {clickMode ? (
        <ClickOrderList
          entries={draft}
          getId={getId}
          getLabel={getLabel}
          positions={clickSequencePositions}
          onSelect={toggleClickEntry}
          onHover={onItemHover}
          onLeave={onItemLeave}
        />
      ) : (
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
      )}
      {saveError && <p role="alert" className="mt-2 text-xs text-red-300">Could not save this order. Your draft is still available.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={autoOrdering || (clickMode && !clickSequenceComplete)} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:cursor-wait disabled:opacity-50">Save</button>
        <button type="button" onClick={cancel} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Cancel</button>
        <button type="button" onClick={reset} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Reset canonical order</button>
      </div>
    </>
  )
}

function ClickOrderList<T>({
  entries,
  getId,
  getLabel,
  positions,
  onSelect,
  onHover,
  onLeave,
}: {
  entries: readonly T[]
  getId: (item: T) => string
  getLabel: (item: T) => string
  positions: ReadonlyMap<string, number>
  onSelect: (item: T) => void
  onHover?: (item: T) => void
  onLeave?: () => void
}) {
  return (
    <ol className="mt-2 space-y-2" aria-describedby="inline-click-order-status">
      {entries.map(item => {
        const id = getId(item)
        const position = positions.get(id)
        const label = getLabel(item)
        return (
          <li key={id} className="world-order-row rounded-lg border border-zinc-800 bg-zinc-950/40 transition-colors" onMouseEnter={onHover ? () => onHover(item) : undefined} onMouseLeave={onLeave}>
            <button
              type="button"
              aria-pressed={position !== undefined}
              aria-label={position === undefined ? `Add ${label} to click order` : `Remove ${label} from click order, position ${position}`}
              onClick={() => onSelect(item)}
              onFocus={onHover ? () => onHover(item) : undefined}
              onBlur={onLeave}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
            >
              <span className={`w-5 shrink-0 text-right text-xs tabular-nums ${position === undefined ? 'text-zinc-600' : 'font-semibold text-cyan-300'}`} aria-hidden="true">{position ?? '·'}.</span>
              <span className="min-w-0 flex-1 text-sm text-zinc-300">{label}</span>
              <span className="sr-only">{position === undefined ? 'Not selected' : `Selected as position ${position}`}</span>
            </button>
          </li>
        )
      })}
    </ol>
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
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`world-order-row animate-shake flex items-center gap-2 rounded-lg border bg-zinc-950/40 px-3 py-2 transition-colors ${
        isDragging ? 'border-cyan-400/70 opacity-50' : isDropTarget ? 'border-cyan-500/70' : 'border-zinc-800'
      }`}
    >
      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-600" aria-label={`Sequence ${index + 1}`}>{index + 1}.</span>
      <button
        ref={handleRef}
        type="button"
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
