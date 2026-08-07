import { getDb, reqToPromise, txDone, hasIdb } from '@/core/scoring/attemptStore'

// Per-segment Pi stories: a freeform mnemonic narrative + one optional picture,
// stored together in the `pi_stories` object store of the shared `major-system`
// IndexedDB (keyed by 0-indexed segment). Purely user-authored — no shipped
// defaults; every segment starts empty. Backed up via JSON export/import.

const STORE = 'pi_stories'

export interface PiStory {
  seg: number
  text: string
  image: Blob | null
  updatedAt: number
}

export async function getStory(seg: number): Promise<PiStory | null> {
  if (!hasIdb) return null
  try {
    const db = await getDb()
    const os = db.transaction(STORE, 'readonly').objectStore(STORE)
    const rec = await reqToPromise(os.get(seg))
    return (rec as PiStory) ?? null
  } catch {
    return null
  }
}

export async function getAllStories(): Promise<PiStory[]> {
  if (!hasIdb) return []
  try {
    const db = await getDb()
    const os = db.transaction(STORE, 'readonly').objectStore(STORE)
    const recs = await reqToPromise(os.getAll())
    return recs as PiStory[]
  } catch {
    return []
  }
}

// Writes text + image together in one readwrite tx. Not swallowed: errors
// (usually QuotaExceededError) propagate so callers can surface a flash.
export async function putStory(seg: number, data: { text: string; image: Blob | null }): Promise<void> {
  if (!hasIdb) return
  const db = await getDb()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put({ seg, text: data.text, image: data.image, updatedAt: Date.now() } as PiStory)
  await txDone(tx)
}

export async function deleteStory(seg: number): Promise<void> {
  if (!hasIdb) return
  try {
    const db = await getDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(seg)
    await txDone(tx)
  } catch {
    /* non-critical */
  }
}

// Segments with non-empty text or an attached image — feeds the grid indicator.
export async function getStorySegs(): Promise<number[]> {
  const all = await getAllStories()
  return all.filter(s => s.text.trim() || s.image).map(s => s.seg)
}

// ---- JSON backup helpers ----

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Pure atob → Uint8Array → Blob decode (unit-testable; `fetch(dataUrl)` is
// unreliable in the node test env).
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  const mimeMatch = /data:([^;]+)/.exec(header)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const bytes = atob(data)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

interface StoryExportRow {
  seg: number
  text: string
  imageDataUrl: string | null
}

export async function exportStories(): Promise<Blob> {
  const all = await getAllStories()
  const rows: StoryExportRow[] = await Promise.all(
    all.map(async s => ({
      seg: s.seg,
      text: s.text,
      imageDataUrl: s.image ? await blobToDataUrl(s.image) : null,
    })),
  )
  return new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
}

// Validate + write each row; returns the number of stories imported.
// Skips empty rows (no text and no image) so the reported count and the
// grid indicators stay in sync — the same rule `onSave` applies in the editor.
export async function importStories(json: string): Promise<number> {
  // Strip a leading UTF-8 BOM — editors on Windows add one, and it makes
  // JSON.parse throw "Unexpected token" so a valid export reads as invalid.
  const parsed = JSON.parse(json.replace(/^\uFEFF/, ''))
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array')
  let count = 0
  for (const row of parsed as StoryExportRow[]) {
    if (typeof row.seg !== 'number' || typeof row.text !== 'string') {
      throw new Error('Invalid story row')
    }
    if (!row.text.trim() && !row.imageDataUrl) continue
    const image = row.imageDataUrl ? dataUrlToBlob(row.imageDataUrl) : null
    await putStory(row.seg, { text: row.text, image })
    count++
  }
  return count
}
