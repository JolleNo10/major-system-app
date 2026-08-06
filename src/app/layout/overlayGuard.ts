// Tracks how many full-screen overlays are open so drills can ignore their
// global keyboard shortcuts while a modal is covering them.
let count = 0

export function pushOverlay(): void { count++ }
export function popOverlay(): void { count = Math.max(0, count - 1) }
export function isOverlayOpen(): boolean { return count > 0 }
