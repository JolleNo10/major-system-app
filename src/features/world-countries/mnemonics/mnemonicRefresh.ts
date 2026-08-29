import { useMnemonic } from '@/core/mnemonics'
import { deleteMnemonic, putMnemonic } from '@/core/mnemonics/mnemonicStore'
import type { Mnemonic, MnemonicRecord, MnemonicTargetId } from '@/core/mnemonics'
import { useSyncExternalStore } from 'react'

type MnemonicListener = () => void

let mnemonicRevision = 0
const listeners = new Set<MnemonicListener>()

export function getWorldCountriesMnemonicRevision(): number {
  return mnemonicRevision
}

export function subscribeToWorldCountriesMnemonics(listener: MnemonicListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyWorldCountriesMnemonicChanged(): void {
  mnemonicRevision += 1
  for (const listener of listeners) listener()
}

export function useWorldCountriesMnemonicRevision(): number {
  return useSyncExternalStore(
    subscribeToWorldCountriesMnemonics,
    getWorldCountriesMnemonicRevision,
    getWorldCountriesMnemonicRevision,
  )
}

export async function putWorldCountriesMnemonic(mnemonic: MnemonicRecord): Promise<void> {
  await putMnemonic(mnemonic)
  notifyWorldCountriesMnemonicChanged()
}

export async function deleteWorldCountriesMnemonic(targetId: MnemonicTargetId): Promise<void> {
  await deleteMnemonic(targetId)
  notifyWorldCountriesMnemonicChanged()
}

export function useWorldCountriesMnemonic(
  targetId: MnemonicTargetId | null,
): { mnemonic: Mnemonic | null; loading: boolean } {
  const revision = useWorldCountriesMnemonicRevision()
  return useMnemonic(targetId, revision)
}
