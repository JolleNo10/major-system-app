import {
  blobToDataUrl,
  dataUrlToBlob,
  decodeMnemonicEntry,
  exportMnemonics,
  parseMnemonicExport,
} from '@/core/mnemonics/backup'
import {
  deleteMnemonic,
  getMnemonic,
  getMnemonics,
  putMnemonic,
} from '@/core/mnemonics/mnemonicStore'
import type { Mnemonic } from '@/core/mnemonics/types'
import { getDb, reqToPromise, txDone, hasIdb } from '@/core/scoring/attemptStore'

const LEGACY_STORE = 'pi_stories'
const PI_TARGET_PREFIX = 'pi:segment:'

export interface PiStory {
  seg: number
  text: string
  image: Blob | null
  updatedAt: number
}

export function piMnemonicId(seg: number): string {
  return `${PI_TARGET_PREFIX}${seg}`
}

function segFromMnemonicId(targetId: string): number | null {
  if (!targetId.startsWith(PI_TARGET_PREFIX)) return null
  const value = Number(targetId.slice(PI_TARGET_PREFIX.length))
  return Number.isInteger(value) && value >= 0 ? value : null
}

function toPiStory(mnemonic: Mnemonic | null): PiStory | null {
  if (!mnemonic) return null
  const seg = segFromMnemonicId(mnemonic.targetId)
  return seg === null ? null : {
    seg,
    text: mnemonic.text,
    image: mnemonic.image,
    updatedAt: mnemonic.updatedAt,
  }
}

function toMnemonic(story: PiStory): Mnemonic {
  return {
    targetId: piMnemonicId(story.seg),
    text: story.text,
    image: story.image,
    updatedAt: story.updatedAt,
  }
}

async function getLegacyStory(seg: number): Promise<PiStory | null> {
  if (!hasIdb) return null
  try {
    const db = await getDb()
    const store = db.transaction(LEGACY_STORE, 'readonly').objectStore(LEGACY_STORE)
    return (await reqToPromise(store.get(seg)) as PiStory | undefined) ?? null
  } catch {
    return null
  }
}

async function getLegacyStories(): Promise<PiStory[]> {
  if (!hasIdb) return []
  try {
    const db = await getDb()
    const store = db.transaction(LEGACY_STORE, 'readonly').objectStore(LEGACY_STORE)
    return await reqToPromise(store.getAll()) as PiStory[]
  } catch {
    return []
  }
}

async function deleteLegacyStory(seg: number): Promise<void> {
  if (!hasIdb) return
  const db = await getDb()
  const tx = db.transaction(LEGACY_STORE, 'readwrite')
  tx.objectStore(LEGACY_STORE).delete(seg)
  await txDone(tx)
}

/**
 * Read the generic record first, then lazily copy an existing legacy record.
 * The legacy store is deliberately retained until the user explicitly deletes
 * a story, so introducing ADR 0006 cannot lose existing Pi content.
 */
export async function getStory(seg: number): Promise<PiStory | null> {
  const shared = toPiStory(await getMnemonic(piMnemonicId(seg)))
  if (shared) return shared

  const legacy = await getLegacyStory(seg)
  if (!legacy) return null
  try {
    await putMnemonic(toMnemonic(legacy))
  } catch {
    // The legacy record remains usable even if lazy migration hits quota.
  }
  return legacy
}

export async function getAllStories(): Promise<PiStory[]> {
  const shared = (await getMnemonics()).flatMap(record => {
    const story = toPiStory(record)
    return story ? [story] : []
  })
  const sharedSegs = new Set(shared.map(story => story.seg))
  const legacy = await getLegacyStories()
  const migrated: PiStory[] = []
  for (const story of legacy) {
    if (sharedSegs.has(story.seg)) continue
    try {
      await putMnemonic(toMnemonic(story))
    } catch {
      // Keep returning the legacy story if the generic copy cannot be made.
    }
    migrated.push(story)
  }
  return [...shared, ...migrated].sort((left, right) => left.seg - right.seg)
}

// Writes text + image together. Errors, including QuotaExceededError, are
// intentionally allowed to reach the editor so it can show a useful message.
export async function putStory(
  seg: number,
  data: { text: string; image: Blob | null },
): Promise<void> {
  await putMnemonic({
    targetId: piMnemonicId(seg),
    text: data.text,
    image: data.image,
    updatedAt: Date.now(),
  })
}

export async function deleteStory(seg: number): Promise<void> {
  await deleteMnemonic(piMnemonicId(seg))
  // Remove the legacy source on explicit user deletion; this is not part of
  // migration and prevents a deleted story from reappearing on the next read.
  try {
    await deleteLegacyStory(seg)
  } catch {
    /* the generic record is already deleted */
  }
}

export async function getStorySegs(): Promise<number[]> {
  const all = await getAllStories()
  return all.filter(story => story.text.trim() || story.image).map(story => story.seg)
}

// ---- JSON backup helpers ----

export { blobToDataUrl, dataUrlToBlob }

export async function exportStories(): Promise<Blob> {
  return exportMnemonics((await getAllStories()).map(toMnemonic))
}

interface LegacyStoryExportRow {
  seg: number
  text: string
  imageDataUrl: string | null
}

function isLegacyStoryRow(row: unknown): row is LegacyStoryExportRow {
  if (!row || typeof row !== 'object') return false
  const entry = row as Record<string, unknown>
  return Number.isInteger(entry.seg)
    && (entry.seg as number) >= 0
    && typeof entry.text === 'string'
    && (entry.imageDataUrl === null || typeof entry.imageDataUrl === 'string' || entry.imageDataUrl === undefined)
}

/** Import both ADR 0006 exports and the pre-ADR Pi array format. */
export async function importStories(json: string): Promise<number> {
  const parsed: unknown = JSON.parse(json.replace(/^\uFEFF/, ''))
  if (Array.isArray(parsed)) {
    let count = 0
    for (const row of parsed) {
      if (!isLegacyStoryRow(row)) throw new Error('Invalid story row')
      if (!row.text.trim() && !row.imageDataUrl) continue
      await putStory(row.seg, {
        text: row.text,
        image: row.imageDataUrl ? dataUrlToBlob(row.imageDataUrl) : null,
      })
      count++
    }
    return count
  }

  const rows = parseMnemonicExport(json)
  let count = 0
  for (const row of rows) {
    if (!/^pi:segment:\d+$/.test(row.targetId)) throw new Error('Invalid Pi mnemonic target')
    if (!row.text.trim() && !row.imageDataUrl) continue
    await putMnemonic(decodeMnemonicEntry(row))
    count++
  }
  return count
}
