// @vitest-environment jsdom

import 'fake-indexeddb/auto'
import { act, createElement, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as mnemonicStore from '@/core/mnemonics/mnemonicStore'
import {
  deleteWorldCountriesMnemonic,
  getWorldCountriesMnemonicRevision,
  putWorldCountriesMnemonic,
  subscribeToWorldCountriesMnemonics,
  useWorldCountriesMnemonic,
} from './mnemonicRefresh'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

function Reader({ targetId }: { targetId: string }) {
  const { mnemonic, loading } = useWorldCountriesMnemonic(targetId)
  return createElement('output', { 'data-loading': loading }, mnemonic?.text ?? '')
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('World Countries mnemonic refresh', () => {
  it('refreshes mounted readers after successful save and delete without a parent counter', async () => {
    const targetId = 'geo:test:refresh'
    await deleteWorldCountriesMnemonic(targetId)
    await putWorldCountriesMnemonic({ targetId, text: 'first', image: null, updatedAt: 1 })

    const mount = document.createElement('div')
    document.body.append(mount)
    await act(async () => {
      root = createRoot(mount)
      root.render(createElement('div', null, createElement(Reader, { targetId }), createElement(Reader, { targetId })))
      await Promise.resolve()
    })
    await flush()
    expect([...mount.querySelectorAll('output')].map(output => output.textContent)).toEqual(['first', 'first'])

    await act(async () => {
      await putWorldCountriesMnemonic({ targetId, text: 'second', image: null, updatedAt: 2 })
      await Promise.resolve()
    })
    await flush()
    expect([...mount.querySelectorAll('output')].map(output => output.textContent)).toEqual(['second', 'second'])

    await act(async () => {
      await deleteWorldCountriesMnemonic(targetId)
      await Promise.resolve()
    })
    await flush()
    expect([...mount.querySelectorAll('output')].map(output => output.textContent)).toEqual(['', ''])
  })

  it('does not publish a successful refresh when the underlying save fails', async () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToWorldCountriesMnemonics(listener)
    const before = getWorldCountriesMnemonicRevision()
    const putSpy = vi.spyOn(mnemonicStore, 'putMnemonic').mockRejectedValueOnce(new Error('quota'))

    await expect(putWorldCountriesMnemonic({ targetId: 'geo:test:failure', text: 'failed', image: null, updatedAt: 1 })).rejects.toThrow('quota')

    putSpy.mockRestore()
    unsubscribe()
    expect(getWorldCountriesMnemonicRevision()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })
})
