import { useState, useCallback, useEffect } from 'react'
import { usePiStory, usePiStorySegs } from '@/features/pi/shared/story/usePiStory'
import { putStory, deleteStory, exportStories, importStories, type PiStory } from '@/features/pi/shared/story/piStories'

export interface PiStoryEditor {
  story: PiStory | null          // the selected segment's story (null when none / no selection)
  loading: boolean               // the selected segment's story read is in flight (avoid stale seed)
  storySegs: Set<number>         // every segment that has a stored story (grid indicators)
  editing: boolean               // view↔edit toggle for the StoryPanel
  flash: string | null           // transient save/import status message
  onEdit: () => void
  onCancel: () => void
  onSave: (text: string, image: Blob | null) => Promise<void>
  onExport: () => Promise<void>
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
}

// Owns the per-segment Pi story edit/persist lifecycle: the refresh counter
// that re-runs the read hooks after a write, the view↔edit toggle, the flash
// message, and save/delete/export/import over `piStories`. Shared by the Memo
// tab's setup panel (grid indicators + Import/Export/flash) and the
// study/result rail (StoryPanel). `phase` is an opaque dependency — passing it
// resets edit mode when the tab moves between phases.
export function usePiStoryEditor(selectedSeg: number | null, phase: string): PiStoryEditor {
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const { story, loading } = usePiStory(selectedSeg, refresh)
  const storySegs = usePiStorySegs(refresh)

  const doFlash = useCallback((msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3000)
  }, [])

  // Reset the view↔edit toggle whenever the segment or phase changes.
  useEffect(() => { setEditing(false) }, [selectedSeg, phase])

  const onSave = useCallback(async (text: string, image: Blob | null) => {
    if (selectedSeg === null) return
    try {
      // Empty text + no image → delete, keeping the grid indicator + export clean.
      if (!text.trim() && !image) await deleteStory(selectedSeg)
      else await putStory(selectedSeg, { text, image })
      setRefresh(k => k + 1)
      setEditing(false)
    } catch {
      doFlash('Could not save — storage may be full')
    }
  }, [selectedSeg, doFlash])

  const onExport = useCallback(async () => {
    const blob = await exportStories()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pi-stories.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }, [])

  const onImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const n = await importStories(ev.target?.result as string)
        setRefresh(k => k + 1)
        doFlash(`Imported ${n} stor${n === 1 ? 'y' : 'ies'}`)
      } catch {
        doFlash('Import failed — invalid file')
      }
    }
    reader.onerror = () => doFlash('Import failed — could not read file')
    reader.readAsText(file)
  }, [doFlash])

  const onEdit = useCallback(() => setEditing(true), [])
  const onCancel = useCallback(() => setEditing(false), [])

  return { story, loading, storySegs, editing, flash, onEdit, onCancel, onSave, onExport, onImport }
}
