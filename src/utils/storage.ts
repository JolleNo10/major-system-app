// localStorage access can throw (Safari private mode, quota exceeded). These
// helpers swallow those errors so a failed read/persist never breaks app flow.

// Guarded raw string read — returns null if the key is absent or storage throws.
export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

// Guarded JSON read — returns `fallback` on missing key or parse/storage error.
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

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
