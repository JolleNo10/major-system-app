// Node 22 exposes an experimental globalThis.localStorage accessor. Vitest's
// jsdom environment does not replace it because localStorage is not one of
// its browser-global override keys, so bind the jsdom instance explicitly.
const jsdomWindow = (globalThis as typeof globalThis & {
  jsdom?: { window: Window }
}).jsdom?.window

if (jsdomWindow) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: jsdomWindow.localStorage,
  })
}
