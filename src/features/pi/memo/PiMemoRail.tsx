import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { PiSegmentRangePreview } from '@/features/pi/shared/PiSegmentGrid'
import { useBlobUrl } from '@/features/pi/shared/story/usePiStory'
import { StoryView } from '@/features/pi/shared/story/StoryView'
import { type PiStory } from '@/features/pi/shared/story/piStories'
import { processImage } from '@/features/pi/memo/imageResize'
import { highlightStory } from '@/features/pi/shared/story/storyHighlight'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { PiStoryEditor } from '@/features/pi/memo/usePiStoryEditor'
import type { Phase } from '@/features/pi/memo/PiMemoTab'

// The Pi Memo tab's right rail (side panel), split out from the middle-panel
// drill (`PiMemoTab`). The one public interface is `usePiMemoRail`, which maps
// the current phase to a rail view + label and publishes it via `useRails`.
// The three phase views below are its private implementation:
//   setup  → NextToMemoTool + StoryIoPanel  ("Next to memo")
//   study  → MemoStudyTools  (StoryPanel + Copy-words, "Study tools")
//   result → StoryPanel      ("Story & picture")
// Recall shows no rail — the story/picture is a spoiler for the pairs.

interface PiMemoRailArgs {
  phase: Phase
  // setup
  nextSeg: number
  statusesLoading: boolean
  onStudySeg: (seg: number) => void
  // study + result: the story editor + the segment's words (for highlight)
  storyEditor: PiStoryEditor
  sequence: string[]
  words: Record<string, string>
  // study
  onCopyWords: () => void
  copied: boolean
}

// Publish the right rail for the Memo tab's current phase. Owns the phase→view
// mapping, the rail label, and the `useRails` wiring so the caller keeps no
// side-panel knowledge.
export function usePiMemoRail({
  phase, nextSeg, statusesLoading, onStudySeg,
  storyEditor, sequence, words, onCopyWords, copied,
}: PiMemoRailArgs): void {
  const rails = useMemo(() => {
    const storyPanel = (
    <StoryPanel
      story={storyEditor.story}
      loading={storyEditor.loading}
      expectedWords={sequence.map(num => words[num])}
      editing={storyEditor.editing}
      onEdit={storyEditor.onEdit}
      onCancel={storyEditor.onCancel}
      onSave={storyEditor.onSave}
      flash={storyEditor.flash}
    />
  )
  const rightRail =
    phase === 'setup'
      ? (
        <div className="w-full space-y-3">
          <NextToMemoTool nextSeg={nextSeg} loading={statusesLoading} onStudy={onStudySeg} />
          <StoryIoPanel onImport={storyEditor.onImport} onExport={storyEditor.onExport} flash={storyEditor.flash} />
        </div>
      )
      : phase === 'study'
      ? <MemoStudyTools storyPanel={storyPanel} onCopyWords={onCopyWords} copied={copied} />
      : phase === 'result'
      ? storyPanel
      : undefined
  const rightLabel =
    phase === 'setup' ? 'Next to memo' : phase === 'study' ? 'Study tools' : 'Story & picture'
    return { right: rightRail, rightLabel }
  }, [phase, nextSeg, statusesLoading, onStudySeg, storyEditor.story, storyEditor.loading, sequence, words, storyEditor.editing, storyEditor.onCancel, storyEditor.onEdit, storyEditor.onSave, storyEditor.onImport, storyEditor.onExport, storyEditor.flash, onCopyWords, copied])
  useRails(rails)
}

// Setup-phase rail tool: JSON backup of all per-segment stories (moved here from
// the setup window so the grid keeps its focus on segment selection).
function StoryIoPanel({ onImport, onExport, flash }: {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onExport: () => void
  flash: string | null
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const btn = 'flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-violet-500 transition-colors'
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
      <p className="text-sm font-medium text-zinc-300">Backup stories</p>
      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
      <div className="flex items-center gap-2">
        <button onClick={() => fileRef.current?.click()} className={btn}>↑ Import stories</button>
        <button onClick={onExport} className={btn}>↓ Export stories</button>
      </div>
      {flash && <p className="text-xs text-center text-violet-400">{flash}</p>}
    </div>
  )
}

// Right-rail quick tool: jump straight into studying the next untested segment.
function NextToMemoTool({ nextSeg, loading, onStudy }: {
  nextSeg: number
  loading: boolean
  onStudy: (seg: number) => void
}) {
  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3'

  if (loading) return null

  if (nextSeg < 0) {
    return (
      <div className={panelCls}>
        <p className="text-sm font-medium text-zinc-300">Next to memo</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          You've started every segment 🎉 Pick any one on the left to study it again.
        </p>
      </div>
    )
  }

  return (
    <div className={panelCls}>
      <p className="text-sm font-medium text-zinc-300">Next to memo</p>
      <div className="rounded-lg border border-violet-500/40 bg-violet-600/10 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-violet-400">Untrained</div>
        <PiSegmentRangePreview startSeg={nextSeg} />
      </div>
      <button
        onClick={() => onStudy(nextSeg)}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
      >Study →</button>
    </div>
  )
}

// Study-phase rail: the story panel plus a Copy-words action ("Study tools").
function MemoStudyTools({ storyPanel, onCopyWords, copied }: {
  storyPanel: React.ReactNode
  onCopyWords: () => void
  copied: boolean
}) {
  return (
    <div className="w-full space-y-3">
      {storyPanel}
      <button
        onClick={onCopyWords}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:border-violet-500 transition-colors"
      >
        <span aria-hidden="true">📋</span> {copied ? 'Copied!' : 'Copy words'}
      </button>
    </div>
  )
}

// The per-segment story: a freeform mnemonic + one picture, authored inline in
// the study/result phases (view↔edit toggle). Image via upload or clipboard
// paste, downscaled by processImage before it reaches the save callback.
function StoryPanel({ story, loading, expectedWords, editing, onEdit, onCancel, onSave, flash }: {
  story: PiStory | null
  loading: boolean
  expectedWords: string[]   // the segment's 10 Major-System words, for highlight + warning
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (text: string, image: Blob | null) => void
  flash: string | null
}) {
  const panelCls = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3'
  const btn = 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors'

  const [draftText, setDraftText] = useState('')
  const [draftImage, setDraftImage] = useState<Blob | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Seed the draft from the current story each time we enter edit mode.
  useEffect(() => {
    if (editing) {
      setDraftText(story?.text ?? '')
      setDraftImage(story?.image ?? null)
    }
  }, [editing, story])

  const draftUrl = useBlobUrl(draftImage)

  const handleBlob = useCallback(async (blob: Blob) => {
    try {
      setDraftImage(await processImage(blob))
    } catch {
      /* unsupported / decode error — leave the draft image unchanged */
    }
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void handleBlob(file)
  }

  // Capture pasted images; preventDefault only when an image is found so plain
  // text paste into the textarea still works.
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) { e.preventDefault(); void handleBlob(file); return }
      }
    }
  }

  if (loading) {
    return (
      <div className={panelCls}>
        <p className="text-sm font-medium text-zinc-300">Story &amp; picture</p>
        <p className="text-xs text-zinc-500">Loading story…</p>
      </div>
    )
  }

  if (!editing) {
    const hasContent = story && (story.text.trim() || story.image)
    return (
      <div className={panelCls}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-300">Story &amp; picture</p>
          <button onClick={onEdit} disabled={loading} className={`${btn} bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed`}>
            {hasContent ? 'Edit' : '+ Add'}
          </button>
        </div>
        {hasContent ? (
          <StoryView story={story!} expectedWords={expectedWords} />
        ) : (
          <button onClick={onEdit} className="w-full text-left text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            Add a story or picture to anchor this segment.
          </button>
        )}
        {flash && <p className="text-xs text-violet-400">{flash}</p>}
      </div>
    )
  }

  return (
    <div className={panelCls}>
      <p className="text-sm font-medium text-zinc-300">Story &amp; picture</p>
      <div onPaste={handlePaste}>
        <textarea
          autoComplete="off"
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
          rows={4}
          placeholder="Describe the vivid story linking these pairs… (paste an image here too)"
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:outline-none resize-y"
        />
        {draftText.trim() && (() => {
          const { missing } = highlightStory(draftText, expectedWords)
          return missing.length > 0 ? (
            <p className="mt-1.5 text-xs text-amber-400">
              ⚠ {missing.length} word{missing.length !== 1 ? 's' : ''} not yet in your story: {missing.join(', ')}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-emerald-400">✓ All {expectedWords.length} words are in your story</p>
          )
        })()}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => fileRef.current?.click()} className={`${btn} bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-violet-500`}>
            Upload image
          </button>
          {draftImage && (
            <button onClick={() => setDraftImage(null)} className={`${btn} bg-zinc-800 border border-zinc-700 text-red-300 hover:border-red-500`}>
              Remove image
            </button>
          )}
          {draftText.trim() && (
            <button onClick={() => setDraftText('')} className={`${btn} bg-zinc-800 border border-zinc-700 text-red-300 hover:border-red-500`}>
              Clear story
            </button>
          )}
        </div>
        {draftUrl && <img src={draftUrl} alt="Story picture preview" className="max-h-64 rounded-lg mt-2" />}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => onSave(draftText, draftImage)} className={`${btn} flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold`}>
          Save
        </button>
        <button onClick={onCancel} className={`${btn} flex-1 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100`}>
          Cancel
        </button>
      </div>
      {flash && <p className="text-xs text-red-400">{flash}</p>}
    </div>
  )
}
