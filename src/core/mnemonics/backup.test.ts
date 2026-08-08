import { describe, expect, it } from 'vitest'
import {
  dataUrlToBlob,
  exportMnemonics,
  importMnemonics,
  parseMnemonicExport,
} from './backup'

describe('shared mnemonic backup', () => {
  it('exports the versioned target-based format', async () => {
    const blob = await exportMnemonics([{
      targetId: 'geo:country-capital:NO',
      text: 'A Viking lassos Oslo',
      image: null,
      updatedAt: 1,
    }])
    expect(JSON.parse(await blob.text())).toEqual({
      version: 1,
      mnemonics: [{
        targetId: 'geo:country-capital:NO',
        text: 'A Viking lassos Oslo',
        imageDataUrl: null,
      }],
    })
  })

  it('decodes base64 image data and skips empty entries', async () => {
    expect(dataUrlToBlob('data:image/webp;base64,aGVsbG8=').size).toBe(5)
    const json = JSON.stringify({
      version: 1,
      mnemonics: [
        { targetId: 'geo:country-capital:NO', text: 'kept', imageDataUrl: null },
        { targetId: 'geo:country-capital:SE', text: '  ', imageDataUrl: null },
      ],
    })
    expect(await importMnemonics(json, targetId => targetId.startsWith('geo:'))).toBe(1)
  })

  it('rejects malformed namespaces before writing', async () => {
    expect(() => parseMnemonicExport(JSON.stringify({ version: 2, mnemonics: [] }))).toThrow()
    await expect(importMnemonics(JSON.stringify({
      version: 1,
      mnemonics: [{ targetId: 'pi:segment:4', text: 'wrong feature', imageDataUrl: null }],
    }), targetId => targetId.startsWith('geo:'))).rejects.toThrow()
  })
})
