// localStorage writes can throw (Safari private mode, quota exceeded). These
// helpers swallow those errors so a failed persist never breaks the app flow.
// Reads that already guard JSON.parse can keep using localStorage directly.

export function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* quota exceeded / storage unavailable — non-fatal */
  }
}

export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* storage unavailable — non-fatal */
  }
}
