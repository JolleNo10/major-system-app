// Downscale + re-encode an image before storage. The longest edge is limited
// to ~1024px and the result prefers WebP@0.8 with a JPEG fallback.

const MAX_EDGE = 1024
const QUALITY = 0.8

let webpSupport: boolean | null = null

function supportsWebp(): boolean {
  if (webpSupport === null) {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp')
    } catch {
      webpSupport = false
    }
  }
  return webpSupport
}

async function loadBitmap(file: Blob): Promise<{
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
  done: () => void
}> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, width, height) => ctx.drawImage(bitmap, 0, 0, width, height),
      done: () => bitmap.close?.(),
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Image failed to load'))
      element.src = url
    })
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (ctx, width, height) => ctx.drawImage(image, 0, 0, width, height),
      done: () => URL.revokeObjectURL(url),
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, QUALITY))
}

export async function processImage(file: Blob): Promise<Blob> {
  const source = await loadBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height))
    const width = Math.max(1, Math.round(source.width * scale))
    const height = Math.max(1, Math.round(source.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context unavailable')
    source.draw(context, width, height)

    const preferredType = supportsWebp() ? 'image/webp' : 'image/jpeg'
    let result = await canvasToBlob(canvas, preferredType)
    if (!result && preferredType === 'image/webp') result = await canvasToBlob(canvas, 'image/jpeg')
    if (!result) throw new Error('Image encode failed')
    return result
  } finally {
    source.done()
  }
}
