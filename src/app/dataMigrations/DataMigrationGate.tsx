import { useRef, useState, type ReactNode } from 'react'
import { Overlay } from '@/app/layout/Overlay'
import { readDataModelVersion, writeDataModelVersion } from './dataModelVersion'
import { APP_DATA_MIGRATIONS } from './migrationRegistry'
import { getCurrentDataModelVersion, runDataMigrations, type AppDataMigration } from './migrationRunner'

type GateState =
  | { status: 'current' }
  | { status: 'pending' | 'running' | 'newer'; version: number }
  | { status: 'error'; version: number | null; message: string }

export interface DataMigrationGateProps {
  children: ReactNode
  /** Injectable seams keep the app-owned migration lifecycle directly testable. */
  migrations?: readonly AppDataMigration[]
  readVersion?: () => number
  writeVersion?: (version: number) => void | Promise<void>
}

const ignoreClose = () => undefined

function stateForVersion(version: number, currentVersion: number): GateState {
  if (version > currentVersion) return { status: 'newer', version }
  if (version === currentVersion) return { status: 'current' }
  return { status: 'pending', version }
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'An unexpected error occurred.'
}

export function DataMigrationGate({
  children,
  migrations = APP_DATA_MIGRATIONS,
  readVersion = readDataModelVersion,
  writeVersion = writeDataModelVersion,
}: DataMigrationGateProps) {
  const currentVersion = getCurrentDataModelVersion(migrations)
  const [state, setState] = useState<GateState>(() => {
    try {
      return stateForVersion(readVersion(), currentVersion)
    } catch (error) {
      return { status: 'error', version: null, message: describeError(error) }
    }
  })
  const running = useRef(false)

  const startUpdate = async () => {
    if (running.current || state.status === 'running' || state.status === 'newer') return
    running.current = true
    setState({ status: 'running', version: state.status === 'current' ? currentVersion : state.version ?? 0 })
    try {
      const storedVersion = readVersion()
      const currentState = stateForVersion(storedVersion, currentVersion)
      if (currentState.status === 'current' || currentState.status === 'newer') {
        setState(currentState)
        return
      }
      await runDataMigrations(storedVersion, migrations, writeVersion)
      setState({ status: 'current' })
    } catch (error) {
      setState({ status: 'error', version: null, message: describeError(error) })
    } finally {
      running.current = false
    }
  }

  if (state.status === 'current') return <>{children}</>

  const newerData = state.status === 'newer'
  const isRunning = state.status === 'running'
  const hasError = state.status === 'error'

  return (
    <Overlay
      onClose={ignoreClose}
      dismissible={false}
      ariaLabel="Data compatibility"
      header={<h1 className="text-lg font-semibold text-zinc-100">{newerData ? 'Update Memo to continue' : 'Data update required'}</h1>}
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {newerData ? (
          <p role="alert" className="text-sm leading-6 text-zinc-300">
            Your saved learning data belongs to a newer version of Memo. Update Memo to a newer version before continuing. Your saved data has not been changed.
          </p>
        ) : (
          <>
            <p className="text-sm leading-6 text-zinc-300">
              This version of Memo needs to update your saved learning data before you continue. Your existing learning history will be kept.
            </p>
            {hasError && (
              <p role="alert" className="text-sm leading-6 text-red-300">
                The data update could not be completed: {state.message}
              </p>
            )}
            {isRunning && (
              <p role="status" className="text-sm text-cyan-200">Updating your saved learning data...</p>
            )}
            <button
              type="button"
              onClick={() => void startUpdate()}
              disabled={isRunning}
              className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-wait disabled:opacity-60"
            >
              {isRunning ? 'Updating...' : hasError ? 'Retry' : 'Update data'}
            </button>
          </>
        )}
      </div>
    </Overlay>
  )
}
