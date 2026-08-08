import { useEffect, useState } from 'react'
import { getMnemonic, getMnemonics } from './mnemonicStore'
import type { Mnemonic, MnemonicTargetId } from './types'

export function useMnemonic(
  targetId: MnemonicTargetId | null,
  refreshKey: unknown,
): { mnemonic: Mnemonic | null; loading: boolean } {
  const [mnemonic, setMnemonic] = useState<Mnemonic | null>(null)
  const [loading, setLoading] = useState(targetId !== null)

  useEffect(() => {
    setMnemonic(null)
    setLoading(targetId !== null)
    if (targetId === null) return
    let alive = true
    void getMnemonic(targetId).then(next => {
      if (alive) {
        setMnemonic(next)
        setLoading(false)
      }
    })
    return () => { alive = false }
  }, [targetId, refreshKey])

  return { mnemonic, loading }
}

export function useBlobUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  return url
}

export function useMnemonics(
  targetIds: readonly MnemonicTargetId[],
  refreshKey: unknown,
): { mnemonics: Mnemonic[]; loading: boolean } {
  const [mnemonics, setMnemonics] = useState<Mnemonic[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    setLoading(true)
    void getMnemonics(targetIds).then(next => {
      if (alive) {
        setMnemonics(next)
        setLoading(false)
      }
    })
    return () => { alive = false }
  }, [refreshKey, targetIds])
  return { mnemonics, loading }
}
