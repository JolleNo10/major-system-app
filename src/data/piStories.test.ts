import { describe, it, expect } from 'vitest'
import { dataUrlToBlob } from './piStories'

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
