import { getDb, hasIdb, reqToPromise, txDone } from '@/core/scoring/attemptStore'
import type { Mnemonic, MnemonicRecord, MnemonicTargetId } from './types'

export const MNEMONIC_STORE = 'mnemonics'

export async function getMnemonic(targetId: MnemonicTargetId): Promise<Mnemonic | null> {
  if (!hasIdb) return null
  try {
    const db = await getDb()
    const store = db.transaction(MNEMONIC_STORE, 'readonly').objectStore(MNEMONIC_STORE)
    return (await reqToPromise(store.get(targetId)) as Mnemonic | undefined) ?? null
  } catch {
    // Read failures can degrade to an absent mnemonic. User-authored writes do
    // not use this fallback and therefore still surface quota errors.
    return null
  }
}

export async function putMnemonic(mnemonic: MnemonicRecord | Mnemonic): Promise<void> {
  if (!mnemonic.text.trim() && !mnemonic.image) {
    await deleteMnemonic(mnemonic.targetId)
    return
  }
  if (!hasIdb) return
  const db = await getDb()
  const tx = db.transaction(MNEMONIC_STORE, 'readwrite')
  tx.objectStore(MNEMONIC_STORE).put({
    ...mnemonic,
    updatedAt: mnemonic.updatedAt || Date.now(),
  })
  await txDone(tx)
}

export async function deleteMnemonic(targetId: MnemonicTargetId): Promise<void> {
  if (!hasIdb) return
  const db = await getDb()
  const tx = db.transaction(MNEMONIC_STORE, 'readwrite')
  tx.objectStore(MNEMONIC_STORE).delete(targetId)
  await txDone(tx)
}

export async function getMnemonics(
  targetIds?: readonly MnemonicTargetId[],
): Promise<Mnemonic[]> {
  if (!hasIdb || targetIds?.length === 0) return []
  try {
    const db = await getDb()
    const store = db.transaction(MNEMONIC_STORE, 'readonly').objectStore(MNEMONIC_STORE)
    const records = await reqToPromise(store.getAll()) as Mnemonic[]
    if (!targetIds) return records
    const wanted = new Set(targetIds)
    return records.filter(record => wanted.has(record.targetId))
  } catch {
    return []
  }
}
