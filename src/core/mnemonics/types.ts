/**
 * Domain-neutral user-authored mnemonic content.
 *
 * The target ID is intentionally opaque here. Feature adapters own its
 * construction and interpretation.
 */
export type MnemonicTargetId = string

export interface Mnemonic {
  targetId: MnemonicTargetId
  text: string
  image: Blob | null
  updatedAt: number
}

/** A mnemonic may carry feature-owned metadata alongside its shared fields. */
export type MnemonicRecord = Mnemonic & Record<string, unknown>
