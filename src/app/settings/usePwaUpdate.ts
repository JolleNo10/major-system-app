import { useCallback, useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export interface PwaUpdate {
  /** A new SW version is installed and waiting (not yet applied). */
  needRefresh: boolean
  /** An update() call is in flight. */
  checking: boolean
  /** Epoch ms of the last completed check, or null if never checked. */
  lastChecked: number | null
  /** User-facing reason the latest update check could not complete. */
  updateError: string | null
  /** Explicit update check — runs regardless of offline mode (user action). */
  checkForUpdate: () => Promise<void>
  /** Apply the waiting version: skipWaiting + reload. */
  updateNow: () => Promise<void>
  buildTime: string
  buildCommit: string
  version: string
}

/**
 * Registers the service worker once and controls update behaviour:
 * - offlineMode off → check once on launch; auto-apply if a new version is found.
 * - offlineMode on  → no proactive checks; the manual button still works.
 * Auto-apply only follows checks we initiate, so a background-discovered update
 * waits for the next launch instead of reloading the user mid-drill.
 */
export function usePwaUpdate(offlineMode: boolean): PwaUpdate {
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<number | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const offlineModeRef = useRef(offlineMode)
  const autoApplyRef = useRef(false)

  // Keep the ref live so the once-created SW callbacks read the current value.
  useEffect(() => {
    offlineModeRef.current = offlineMode
  }, [offlineMode])

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, r) {
      registrationRef.current = r
      // Launch check — only when the user allows it (online mode).
      if (r && !offlineModeRef.current) {
        autoApplyRef.current = true
        void r.update().then(() => {
          setUpdateError(null)
          setLastChecked(Date.now())
        }).catch(() => {
          autoApplyRef.current = false
          setUpdateError('Could not contact the update service.')
        })
      }
    },
    onNeedRefresh() {
      // Only auto-apply updates surfaced by a check we initiated. Background
      // discoveries stay waiting and apply on the next launch.
      if (autoApplyRef.current) {
        autoApplyRef.current = false
        void updateServiceWorker(true)
      }
    },
    onRegisterError(err) {
      console.error('SW registration failed', err)
      setUpdateError('The update service could not start.')
    },
  })

  const checkForUpdate = useCallback(async () => {
    if (checking) return
    setChecking(true)
    setUpdateError(null)
    autoApplyRef.current = true
    try {
      const registration = registrationRef.current
      if (!registration) throw new Error('Service worker registration unavailable')
      await registration.update()
      setLastChecked(Date.now())
    } catch {
      autoApplyRef.current = false
      setUpdateError('Could not contact the update service.')
    } finally {
      setChecking(false)
    }
  }, [checking])

  const updateNow = useCallback(async () => {
    await updateServiceWorker(true)
  }, [updateServiceWorker])

  return {
    needRefresh,
    checking,
    lastChecked,
    updateError,
    checkForUpdate,
    updateNow,
    buildTime: __BUILD_TIME__,
    buildCommit: __BUILD_COMMIT__,
    version: __APP_VERSION__,
  }
}
