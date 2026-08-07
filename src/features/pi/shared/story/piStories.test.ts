import { describe, it, expect } from 'vitest'
import { dataUrlToBlob, importStories } from '@/features/pi/shared/story/piStories'

describe('dataUrlToBlob', () => {
  it('decodes a base64 data URL to a Blob with the right MIME type and byte length', () => {
    // "hello" → base64 "aGVsbG8=" (5 bytes)
    const blob = dataUrlToBlob('data:image/webp;base64,aGVsbG8=')
    expect(blob.type).toBe('image/webp')
    expect(blob.size).toBe(5)
  })

  it('falls back to a generic MIME type when the header lacks one', () => {
    const blob = dataUrlToBlob('data:;base64,aGVsbG8=')
    expect(blob.type).toBe('application/octet-stream')
    expect(blob.size).toBe(5)
  })
})

describe('importStories', () => {
  const rows = [
    { seg: 0, text: 'a vivid story', imageDataUrl: null },
    { seg: 1, text: 'another', imageDataUrl: null },
  ]

  it('parses a plain export payload (IDB-less env just validates + counts)', async () => {
    expect(await importStories(JSON.stringify(rows))).toBe(2)
  })

  it('tolerates a leading UTF-8 BOM (Windows editors add one)', async () => {
    expect(await importStories('\uFEFF' + JSON.stringify(rows))).toBe(2)
  })

  it('skips empty rows so the count matches the visible indicators', async () => {
    const withEmpties = [
      { seg: 0, text: 'kept', imageDataUrl: null },
      { seg: 1, text: '   ', imageDataUrl: null },
      { seg: 2, text: '', imageDataUrl: null },
    ]
    expect(await importStories(JSON.stringify(withEmpties))).toBe(1)
  })

  it('rejects a non-array payload', async () => {
    await expect(importStories('{"seg":0}')).rejects.toThrow()
  })
})
