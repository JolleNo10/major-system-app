// Downscale + re-encode an image before storing so a fully-populated set of Pi
// stories stays in the low tens of MB. Longest edge → ~1024px, WebP@0.8 (JPEG
// fallback), via an offscreen canvas. No external deps.

const MAX_EDGE = 1024
const QUALITY = 0.8

let webpSupport: boolean | null = null

// Detect WebP encode support once — some browsers return a PNG data URL when
// asked for webp, so sniff the returned MIME type rather than assuming.
function supportsWebp(): boolean {
  if (webpSupport === null) {
    try {
      const c = document.createElement('canvas')
      c.width = 1
      c.height = 1
      webpSupport = c.toDataURL('image/webp').startsWith('data:image/webp')
    } catch {
      webpSupport = false
    }
  }
  return webpSupport
}

async function loadBitmap(file: Blob): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; done: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      done: () => bitmap.close?.(),
    }
  }
  // Fallback: <img> + object URL.
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Image failed to load'))
      el.src = url
    })
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      done: () => URL.revokeObjectURL(url),
    }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, QUALITY))
}

export async function processImage(file: Blob): Promise<Blob> {
  const src = await loadBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(src.width, src.height))
    const w = Math.max(1, Math.round(src.width * scale))
    const h = Math.max(1, Math.round(src.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    src.draw(ctx, w, h)

    const preferWebp = supportsWebp()
    let blob = await canvasToBlob(canvas, preferWebp ? 'image/webp' : 'image/jpeg')
    if (!blob && preferWebp) blob = await canvasToBlob(canvas, 'image/jpeg')
    if (!blob) throw new Error('Image encode failed')
    return blob
  } finally {
    src.done()
  }
}
