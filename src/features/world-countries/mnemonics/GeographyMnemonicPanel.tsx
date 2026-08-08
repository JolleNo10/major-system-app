import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  deleteMnemonic,
  processImage,
  putMnemonic,
  useBlobUrl,
  useMnemonic,
} from '@/core/mnemonics'
import type { Country } from '@/features/world-countries/data/countries'
import {
  countryCapitalMnemonicId,
  subregionMnemonicId,
} from './geographyMnemonicIds'
import {
  exportGeographyMnemonics,
  getSubregionCountryIds,
  isSubregionMnemonicStale,
  importGeographyMnemonics,
} from './geographyMnemonics'

function useFlash(): [string | null, (message: string) => void] {
  const [flash, setFlash] = useState<string | null>(null)
  const show = (message: string) => {
    setFlash(message)
    window.setTimeout(() => setFlash(null), 3000)
  }
  return [flash, show]
}

function MnemonicCard({
  targetId,
  title,
  subtitle,
  countryIds,
  refreshKey,
  onChanged,
}: {
  targetId: string
  title: string
  subtitle: string
  countryIds?: readonly string[]
  refreshKey: unknown
  onChanged: () => void
}) {
  const { mnemonic, loading } = useMnemonic(targetId, refreshKey)
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [draftImage, setDraftImage] = useState<Blob | null>(null)
  const [flash, showFlash] = useFlash()
  const fileRef = useRef<HTMLInputElement>(null)
  const imageUrl = useBlobUrl(mnemonic?.image ?? null)
  const draftUrl = useBlobUrl(draftImage)

  useEffect(() => {
    setEditing(false)
  }, [targetId])

  useEffect(() => {
    if (!editing) return
    setDraftText(mnemonic?.text ?? '')
    setDraftImage(mnemonic?.image ?? null)
  }, [editing, mnemonic])

  const beginEdit = () => setEditing(true)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setDraftImage(await processImage(file))
    } catch {
      showFlash('Could not read that image')
    }
  }

  const save = async () => {
    try {
      if (!draftText.trim() && !draftImage) {
        await deleteMnemonic(targetId)
      } else {
        await putMnemonic({
          targetId,
          text: draftText,
          image: draftImage,
          ...(countryIds ? { countryIds: [...countryIds] } : {}),
          updatedAt: Date.now(),
        })
      }
      setEditing(false)
      onChanged()
      showFlash('Saved')
    } catch {
      showFlash('Could not save — storage may be full')
    }
  }

  const hasContent = Boolean(mnemonic && (mnemonic.text.trim() || mnemonic.image))
  const stale = countryIds
    ? isSubregionMnemonicStale(
      mnemonic && 'countryIds' in mnemonic && Array.isArray(mnemonic.countryIds)
        ? { countryIds: mnemonic.countryIds as string[] }
        : null,
      countryIds,
    )
    : false

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
          <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
        </div>
        {!loading && !editing && (
          <button
            onClick={beginEdit}
            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-cyan-500 hover:text-zinc-100"
          >
            {hasContent ? 'Edit' : '+ Add'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500">Loading mnemonic…</p>
      ) : editing ? (
        <div className="space-y-2">
          <textarea
            value={draftText}
            onChange={event => setDraftText(event.target.value)}
            rows={4}
            placeholder="Write a vivid story that links these places…"
            className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-cyan-500"
          />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={event => void handleFile(event)} />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-cyan-500 hover:text-zinc-100"
            >
              {draftImage ? 'Replace image' : 'Attach image'}
            </button>
            {draftImage && (
              <button
                onClick={() => setDraftImage(null)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-red-300 hover:border-red-500"
              >
                Remove image
              </button>
            )}
            <button
              onClick={() => void save()}
              className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100"
            >
              Cancel
            </button>
          </div>
          {draftUrl && <img src={draftUrl} alt="Mnemonic preview" className="max-h-56 rounded-lg" />}
        </div>
      ) : hasContent ? (
        <div className="space-y-2">
          {mnemonic?.text.trim() && <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{mnemonic.text}</p>}
          {imageUrl && <img src={imageUrl} alt="Mnemonic" className="max-h-56 rounded-lg" />}
        </div>
      ) : (
        <button onClick={beginEdit} className="text-left text-xs text-zinc-600 transition-colors hover:text-zinc-400">
          Add a story or picture to anchor this relationship.
        </button>
      )}

      {stale && <p className="text-xs text-amber-400">This mnemonic was created for an older country list.</p>}
      {flash && <p className="text-xs text-cyan-400">{flash}</p>}
    </article>
  )
}

export function GeographyMnemonicPanel({ country }: { country: Country }) {
  const [refresh, setRefresh] = useState(0)
  const [flash, showFlash] = useFlash()
  const fileRef = useRef<HTMLInputElement>(null)
  const subregionCountryIds = useMemo(
    () => getSubregionCountryIds(country.continent, country.subregion),
    [country.continent, country.subregion],
  )
  const countryTargetId = countryCapitalMnemonicId(country)
  const subregionTargetId = subregionMnemonicId(country.continent, country.subregion)

  const download = async () => {
    const blob = await exportGeographyMnemonics()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'geography-mnemonics.json'
    anchor.click()
    URL.revokeObjectURL(url)
    showFlash('Exported Geography mnemonics')
  }

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = async loadEvent => {
      try {
        const count = await importGeographyMnemonics(loadEvent.target?.result as string)
        setRefresh(value => value + 1)
        showFlash(`Imported ${count} mnemonic${count === 1 ? '' : 's'}`)
      } catch {
        showFlash('Import failed — invalid Geography file')
      }
    }
    reader.onerror = () => showFlash('Import failed — could not read file')
    reader.readAsText(file)
  }

  return (
    <section className="w-full max-w-2xl space-y-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Mnemonics</h2>
          <p className="mt-1 text-xs text-zinc-600">Optional stories are separate from learning progress.</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:border-cyan-500 hover:text-zinc-200">Import</button>
          <button onClick={() => void download()} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:border-cyan-500 hover:text-zinc-200">Export</button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <MnemonicCard
          targetId={countryTargetId}
          title={`${country.country} ↔ ${country.capital}`}
          subtitle="Shared by both quiz directions"
          refreshKey={refresh}
          onChanged={() => setRefresh(value => value + 1)}
        />
        <MnemonicCard
          targetId={subregionTargetId}
          title={country.subregion}
          subtitle={`${subregionCountryIds.length} countries in ${country.continent}`}
          countryIds={subregionCountryIds}
          refreshKey={refresh}
          onChanged={() => setRefresh(value => value + 1)}
        />
      </div>
      {flash && <p className="text-xs text-cyan-400">{flash}</p>}
    </section>
  )
}
