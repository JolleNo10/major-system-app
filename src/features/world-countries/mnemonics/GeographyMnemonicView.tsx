import { useMemo } from 'react'
import { useBlobUrl, useMnemonic } from '@/core/mnemonics'
import type { Mnemonic } from '@/core/mnemonics'
import { isSubregionMnemonicStale } from './geographyMnemonics'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'

/** Workflow-neutral mnemonic presentation. It deliberately exposes no authoring controls. */
export function GeographyMnemonicView({
  targetId,
  title,
  subtitle,
  countryIds,
  refreshKey,
}: {
  targetId: string
  title: string
  subtitle: string
  countryIds?: readonly string[]
  refreshKey: unknown
}) {
  const { mnemonic, loading } = useMnemonic(targetId, refreshKey)
  const imageUrl = useBlobUrl(mnemonic?.image ?? null)
  const savedCountryIds = useMemo(() => {
    if (!mnemonic || !('countryIds' in mnemonic) || !Array.isArray((mnemonic as Mnemonic & { countryIds?: unknown }).countryIds)) return null
    return (mnemonic as Mnemonic & { countryIds: string[] }).countryIds
  }, [mnemonic])
  const stale = countryIds ? isSubregionMnemonicStale(savedCountryIds ? { countryIds: savedCountryIds } : null, countryIds) : false
  const hasContent = Boolean(mnemonic && (mnemonic.text.trim() || mnemonic.image))

  return (
    <WorldCountriesPanel as="article">
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      {loading ? (
        <p className="mt-3 text-xs text-zinc-500">Loading mnemonic…</p>
      ) : hasContent ? (
        <div className="mt-3 space-y-2">
          {mnemonic?.text.trim() && <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{mnemonic.text}</p>}
          {imageUrl && <img src={imageUrl} alt="Mnemonic" className="max-h-56 max-w-full rounded-lg object-contain" />}
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-600">No mnemonic has been prepared for this relationship yet.</p>
      )}
      {stale && <p className="mt-3 text-xs text-amber-400">This mnemonic was created for a different country order.</p>}
    </WorldCountriesPanel>
  )
}
