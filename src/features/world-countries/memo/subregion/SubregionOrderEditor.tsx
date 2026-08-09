import { PointerActivationConstraints } from '@dnd-kit/dom'
import { DragDropProvider, PointerSensor } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { resetSubregionCountryOrder, setSubregionCountryOrder } from '@/features/world-countries/geography/subregionMetadataStore'
import { reorderCountryDraft } from './subregionOrder'

export function SubregionOrderEditor({
  subregion,
  entries,
  onDraftChanged,
  onChanged,
  onClose,
}: {
  subregion: SubregionId
  entries: readonly Country[]
  onDraftChanged: (draft: readonly Country[]) => void
  onChanged: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(() => [...entries])

  const save = () => {
    setSubregionCountryOrder(subregion, draft.map(country => country.id))
    onChanged()
    onClose()
  }

  const reset = () => {
    resetSubregionCountryOrder(subregion)
    onChanged()
    onClose()
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
          const nextDraft = reorderCountryDraft(draft, source.initialIndex, source.index)
          setDraft(nextDraft)
          onDraftChanged(nextDraft)
        }}
      >
        <ol className="mt-4 space-y-2" aria-describedby="order-editor-instructions">
          {draft.map((country, index) => (
            <SortableCountryRow key={country.id} country={country} index={index} />
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

function SortableCountryRow({ country, index }: { country: Country; index: number }) {
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id: country.id,
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
        className="touch-none cursor-grab rounded border border-transparent px-1.5 py-1 text-lg leading-none text-zinc-500 hover:border-zinc-700 hover:text-cyan-300 active:cursor-grabbing"
        aria-label={`Reorder ${country.country}`}
        aria-describedby="order-editor-instructions"
        title="Drag to reorder"
      >
        ⠿
      </button>
      <span className="min-w-0 flex-1 text-sm text-zinc-300">{country.country}</span>
    </li>
  )
}
