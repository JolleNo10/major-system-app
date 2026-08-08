import { getMnemonics, putMnemonic } from './mnemonicStore'
import type { Mnemonic, MnemonicRecord, MnemonicTargetId } from './types'

export interface MnemonicExportEntry {
  targetId: string
  text: string
  imageDataUrl: string | null
  [key: string]: unknown
}

export interface MnemonicExport {
  version: 1
  mnemonics: MnemonicExportEntry[]
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Decode a base64 data URL without relying on fetch(dataUrl) in test runners. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]*)(?:;base64)?,([\s\S]*)$/.exec(dataUrl)
  if (!match) throw new Error('Invalid image data URL')
  const mime = match[1] || 'application/octet-stream'
  let bytes: string
  try {
    bytes = atob(match[2])
  } catch {
    throw new Error('Invalid base64 image data')
  }
  const array = new Uint8Array(bytes.length)
  for (let index = 0; index < bytes.length; index++) array[index] = bytes.charCodeAt(index)
  return new Blob([array], { type: mime })
}

export async function exportMnemonics(
  mnemonics: readonly Mnemonic[],
): Promise<Blob> {
  const rows = await encodeMnemonicEntries(mnemonics)
  const payload: MnemonicExport = { version: 1, mnemonics: rows }
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

/** Encode shared mnemonic fields for feature-owned backup envelopes. */
export async function encodeMnemonicEntries(
  mnemonics: readonly Mnemonic[],
): Promise<MnemonicExportEntry[]> {
  return Promise.all(mnemonics.map(async mnemonic => {
    const extras = Object.fromEntries(
      Object.entries(mnemonic).filter(([key]) => !['targetId', 'text', 'image', 'updatedAt'].includes(key)),
    )
    return {
      ...extras,
      targetId: mnemonic.targetId,
      text: mnemonic.text,
      imageDataUrl: mnemonic.image ? await blobToDataUrl(mnemonic.image) : null,
    } as MnemonicExportEntry
  }))
}

export function parseMnemonicExport(json: string): MnemonicExportEntry[] {
  const parsed: unknown = JSON.parse(json.replace(/^\uFEFF/, ''))
  if (!parsed || typeof parsed !== 'object' || (parsed as { version?: unknown }).version !== 1) {
    throw new Error('Expected a version 1 mnemonic export')
  }
  const rows = (parsed as { mnemonics?: unknown }).mnemonics
  if (!Array.isArray(rows)) throw new Error('Expected mnemonic entries')

  return rows.map(row => {
    if (!row || typeof row !== 'object') throw new Error('Invalid mnemonic row')
    const entry = row as Record<string, unknown>
    if (typeof entry.targetId !== 'string' || !entry.targetId.trim()) throw new Error('Invalid mnemonic target')
    if (typeof entry.text !== 'string') throw new Error('Invalid mnemonic text')
    if (entry.imageDataUrl !== null && typeof entry.imageDataUrl !== 'string') {
      throw new Error('Invalid mnemonic image')
    }
    if (typeof entry.imageDataUrl === 'string' && !/^data:[^;,]*(?:;base64)?,/.test(entry.imageDataUrl)) {
      throw new Error('Invalid mnemonic image data URL')
    }
    return entry as MnemonicExportEntry
  })
}

export function decodeMnemonicEntry(entry: MnemonicExportEntry): MnemonicRecord {
  const { targetId, text, imageDataUrl, ...extras } = entry
  return {
    ...extras,
    targetId,
    text,
    image: imageDataUrl ? dataUrlToBlob(imageDataUrl) : null,
    updatedAt: Date.now(),
  }
}

export async function importMnemonics(
  json: string,
  isValidTargetId: (targetId: MnemonicTargetId) => boolean = () => true,
): Promise<number> {
  const rows = parseMnemonicExport(json)
  let count = 0
  for (const row of rows) {
    if (!isValidTargetId(row.targetId)) throw new Error('Invalid mnemonic target for this feature')
    if (!row.text.trim() && !row.imageDataUrl) continue
    await putMnemonic(decodeMnemonicEntry(row))
    count++
  }
  return count
}

export async function exportMnemonicTargets(
  targetIds: readonly MnemonicTargetId[],
): Promise<Blob> {
  return exportMnemonics(await getMnemonics(targetIds))
}
