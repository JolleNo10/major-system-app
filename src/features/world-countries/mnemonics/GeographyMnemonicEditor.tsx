import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { deleteMnemonic, processImage, putMnemonic, useBlobUrl, useMnemonic } from '@/core/mnemonics'
import type { Mnemonic } from '@/core/mnemonics'
import { isSubregionMnemonicStale } from './geographyMnemonics'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'

/** Reusable contextual authoring for an existing geography mnemonic target. */
export function GeographyMnemonicEditor({
  targetId,
  title,
  subtitle,
  countryIds,
  refreshKey,
  onChanged,
  headerAction,
  initiallyEditing = false,
}: {
  targetId: string
  title: string
  subtitle: string
  countryIds?: readonly string[]
  refreshKey: unknown
  onChanged: () => void
  headerAction?: ReactNode
  initiallyEditing?: boolean
}) {
  const { mnemonic, loading } = useMnemonic(targetId, refreshKey)
  const [editing, setEditing] = useState(initiallyEditing)
  const [draftText, setDraftText] = useState('')
  const [draftImage, setDraftImage] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageUrl = useBlobUrl(mnemonic?.image ?? null)
  const draftUrl = useBlobUrl(draftImage)

  useEffect(() => {
    setEditing(initiallyEditing)
    setError(null)
  }, [initiallyEditing, targetId])

  useEffect(() => {
    if (!editing) return
    setDraftText(mnemonic?.text ?? '')
    setDraftImage(mnemonic?.image ?? null)
  }, [editing, mnemonic])

  const save = async () => {
    try {
      if (!draftText.trim() && !draftImage) await deleteMnemonic(targetId)
      else await putMnemonic({ targetId, text: draftText, image: draftImage, ...(countryIds ? { countryIds: [...countryIds] } : {}), updatedAt: Date.now() })
      setEditing(false)
      setError(null)
      onChanged()
    } catch {
      setError('Could not save this mnemonic.')
    }
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setDraftImage(await processImage(file))
      setError(null)
    } catch {
      setError('Could not read that image.')
    }
  }

  const hasContent = Boolean(mnemonic && (mnemonic.text.trim() || mnemonic.image))
  const savedCountryIds = mnemonic && 'countryIds' in mnemonic && Array.isArray((mnemonic as Mnemonic & { countryIds?: unknown }).countryIds)
    ? (mnemonic as Mnemonic & { countryIds: string[] }).countryIds
    : null
  const stale = countryIds ? isSubregionMnemonicStale(savedCountryIds ? { countryIds: savedCountryIds } : null, countryIds) : false

  return (
    <WorldCountriesPanel as="article">
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
          <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
        </div>
        {(headerAction || (!loading && !editing)) && <div className="flex flex-wrap items-center justify-start gap-2">
          {headerAction}
          {!loading && !editing && <button type="button" onClick={() => setEditing(true)} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-cyan-500 hover:text-zinc-100">{hasContent ? 'Edit' : '+ Add'}</button>}
        </div>}
      </div>
      {loading ? <p className="mt-3 text-xs text-zinc-500">Loading mnemonic…</p> : editing ? (
        <div className="mt-3 space-y-2">
          <textarea autoComplete="off" value={draftText} onChange={event => setDraftText(event.target.value)} rows={4} placeholder="Write a vivid story that links these places…" className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-cyan-500" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={event => void handleFile(event)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">{draftImage ? 'Replace image' : 'Attach image'}</button>
            {draftImage && <button type="button" onClick={() => setDraftImage(null)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-red-300 hover:border-red-500">Remove image</button>}
            <button type="button" onClick={() => void save()} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100">Cancel</button>
          </div>
          {draftUrl && <img src={draftUrl} alt="Mnemonic preview" className="max-h-56 max-w-full rounded-lg object-contain" />}
        </div>
      ) : hasContent ? (
        <div className="mt-3 space-y-2">
          {mnemonic?.text.trim() && <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{mnemonic.text}</p>}
          {imageUrl && <img src={imageUrl} alt="Mnemonic" className="max-h-56 max-w-full rounded-lg object-contain" />}
        </div>
      ) : <button type="button" onClick={() => setEditing(true)} className="mt-3 text-left text-xs text-zinc-600 transition-colors hover:text-zinc-400">Add a story or picture to anchor this relationship.</button>}
      {stale && <p className="mt-3 text-xs text-amber-400">This mnemonic was created for a different Country order. Review and save it to update.</p>}
      {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
    </WorldCountriesPanel>
  )
}
