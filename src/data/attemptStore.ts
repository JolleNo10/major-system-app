import type { Direction } from '../types'
import {
  type Attempt, itemKey, STORAGE_KEY,
  HISTORY_RETENTION_DAYS, HISTORY_MAX, DAY_MS,
} from './itemStore'

// Per-answer attempts log, stored in IndexedDB (not the localStorage item blob).
// Appends are cheap and time/item-indexed; the localStorage store keeps only the
// small hot metadata used for synchronous question selection.
//
// Record: { id (auto), key: "enc:42", at, ok, ms }

const DB_NAME = 'major-system'
const DB_VERSION = 1
const STORE = 'attempts'
const MIGRATED_KEY = 'major-attempts-migrated'

interface AttemptRecord extends Attempt {
  id?: number
  key: string
}

const hasIdb = typeof indexedDB !== 'undefined'

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
          os.createIndex('by_key', 'key')
          os.createIndex('by_at', 'at')
          os.createIndex('by_key_at', ['key', 'at'])
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }).then(async db => {
      await migrateOnce(db)
      return db
    })
  }
  return dbPromise
}

// Move any attempts nested in the old localStorage blob into IndexedDB (once),
// then strip them from the blob so it only carries metadata going forward.
async function migrateOnce(db: IDBDatabase): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const store = JSON.parse(raw) as Record<string, { attempts?: Attempt[] }>
      const tx = db.transaction(STORE, 'readwrite')
      const os = tx.objectStore(STORE)
      let changed = false
      for (const [key, rec] of Object.entries(store)) {
        if (rec.attempts?.length) {
          for (const a of rec.attempts) os.add({ key, at: a.at, ok: a.ok, ms: a.ms } as AttemptRecord)
          delete rec.attempts
          changed = true
        }
      }
      await txDone(tx)
      if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    }
    localStorage.setItem(MIGRATED_KEY, '1')
  } catch {
    /* migration is best-effort; never block the app */
  }
}

// Append one attempt and prune this item's history (time window + hard cap).
export async function addAttempt(dir: Direction, num: string, attempt: Attempt): Promise<void> {
  if (!hasIdb) return
  try {
    const db = await getDb()
    const key = itemKey(dir, num)
    const tx = db.transaction(STORE, 'readwrite')
    const os = tx.objectStore(STORE)
    os.add({ key, at: attempt.at, ok: attempt.ok, ms: attempt.ms } as AttemptRecord)

    const idx = os.index('by_key_at')
    const cutoff = attempt.at - HISTORY_RETENTION_DAYS * DAY_MS

    // [key, []] is the standard prefix upper bound — [] sorts above any number,
    // so this matches every [key, at] entry regardless of the timestamp.
    const keyRange = IDBKeyRange.bound([key], [key, []])

    // Drop entries older than the retention window for this key (at < cutoff).
    const oldRange = IDBKeyRange.bound([key], [key, cutoff], false, true)
    idx.openCursor(oldRange).onsuccess = e => {
      const cur = (e.target as IDBRequest<IDBCursorWithValue>).result
      if (cur) { cur.delete(); cur.continue() }
    }

    // Enforce the hard cap: delete oldest surplus beyond HISTORY_MAX.
    const countReq = idx.count(keyRange)
    countReq.onsuccess = () => {
      let surplus = countReq.result - HISTORY_MAX
      if (surplus > 0) {
        idx.openCursor(keyRange).onsuccess = e => {
          const cur = (e.target as IDBRequest<IDBCursorWithValue>).result
          if (cur && surplus > 0) { cur.delete(); surplus--; cur.continue() }
        }
      }
    }

    await txDone(tx)
  } catch {
    /* non-critical */
  }
}

export async function getAttempts(dir: Direction, num: string): Promise<Attempt[]> {
  if (!hasIdb) return []
  try {
    const db = await getDb()
    const key = itemKey(dir, num)
    const idx = db.transaction(STORE, 'readonly').objectStore(STORE).index('by_key_at')
    const range = IDBKeyRange.bound([key], [key, []])
    const recs = await reqToPromise(idx.getAll(range))
    return recs.map(({ at, ok, ms }) => ({ at, ok, ms }))
  } catch {
    return []
  }
}

export async function getAllAttempts(): Promise<Array<{ key: string } & Attempt>> {
  if (!hasIdb) return []
  try {
    const db = await getDb()
    const os = db.transaction(STORE, 'readonly').objectStore(STORE)
    const recs = await reqToPromise(os.getAll())
    return recs.map(({ key, at, ok, ms }) => ({ key, at, ok, ms }))
  } catch {
    return []
  }
}

// Eagerly open + migrate at startup (fire-and-forget).
export function initAttempts(): void {
  if (hasIdb) void getDb()
}
