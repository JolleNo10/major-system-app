import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { MEMO_MAP_DEFINITIONS, type MemoMapDefinition } from '@/features/world-countries/maps/mapDefinitions'
import { MapSurface } from '@/features/world-countries/ui/MapSurface'
import { CapitalAuthoringMap } from './CapitalAuthoringMap'
import { CapitalAuthoringReferencePanel } from './CapitalAuthoringReferencePanel'
import { CAPITAL_AUTHORING_GEO_REFERENCES } from './capitalAuthoringReferenceData'
import { parseSvgViewBox } from './capitalAuthoringCoordinates'
import { loadCapitalAuthoringMapSource } from './capitalAuthoringMapSource'
import {
  clearCapitalAuthoringStorage,
  getCapitalAuthoringStorageKey,
  parseCapitalAuthoringImport,
  readCapitalAuthoringStorage,
  serializeCapitalAuthoringCombinedExport,
  serializeCapitalAuthoringDocument,
  writeCapitalAuthoringStorage,
} from './capitalAuthoringImportExport'
import {
  createCandidatePlacement,
  createEmptyCapitalAuthoringDocument,
  createManualPointPlacement,
  createUnresolvedPlacement,
  getCapitalAuthoringCounts,
  matchesCapitalAuthoringFilter,
  removeCapitalAuthoringPlacement,
  updateCapitalAuthoringPlacement,
} from './capitalAuthoringState'
import type {
  CapitalAuthoringDetection,
  CapitalAuthoringDocument,
  CapitalAuthoringMapMetadata,
  CapitalAuthoringReviewFilter,
} from './capitalAuthoringTypes'

const DEFAULT_MAP_ID = 'europe'

function getDefinition(mapId: string): MemoMapDefinition {
  return MEMO_MAP_DEFINITIONS.find(definition => definition.id === mapId) ?? MEMO_MAP_DEFINITIONS[0]
}

function getCountriesForMap(definition: MemoMapDefinition): Country[] {
  const continents = new Set(definition.domainContinents)
  return countries.filter(country => continents.has(country.continent))
}

function blankMapMetadata(mapId: string): CapitalAuthoringMapMetadata {
  return { id: mapId, sourceAsset: '', sourceAssetSha: '', viewBox: '' }
}

function downloadJson(filename: string, json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && (target.matches('input, textarea, select, button, [contenteditable="true"]') || target.isContentEditable)
}

function metadataMismatchWarnings(
  document: CapitalAuthoringDocument,
  current: CapitalAuthoringMapMetadata | null,
): string[] {
  if (!current || document.map.id !== current.id) return []
  const warnings: string[] = []
  if (document.map.sourceAsset && document.map.sourceAsset !== current.sourceAsset) warnings.push(`Current SVG asset is ${current.sourceAsset}; imported work names ${document.map.sourceAsset}.`)
  if (document.map.sourceAssetSha && document.map.sourceAssetSha !== current.sourceAssetSha) warnings.push('Current SVG fingerprint differs from the fingerprint stored with this work.')
  if (document.map.viewBox && document.map.viewBox !== current.viewBox) warnings.push(`Current SVG viewBox is ${current.viewBox}; imported work names ${document.map.viewBox}.`)
  return warnings
}

function filterLabel(filter: CapitalAuthoringReviewFilter): string {
  return filter === 'all' ? 'All' : filter === 'remaining' ? 'Remaining' : filter === 'unresolved' ? 'Unresolved' : 'Dot decisions'
}

function placementStatusLabel(placement: CapitalAuthoringDocument['placements'][string] | undefined): string {
  if (!placement) return 'absent'
  if (placement.status === 'unresolved') {
    return placement.authoring.detectedGeometry === 'single-dot'
      ? 'unresolved (single dot)'
      : placement.authoring.detectedGeometry === 'multi-dot'
        ? 'unresolved (multi dot)'
        : 'unresolved'
  }
  if (placement.authoring.decision === 'confirmed-suggested-dot') return 'confirmed single dot'
  if (placement.authoring.decision === 'selected-from-multiple') return 'selected multi dot'
  if (placement.authoring.decision === 'manual-override') return 'manual override'
  return 'manual point'
}

export function CapitalMapAuthoringEditor() {
  const initialDefinition = getDefinition(DEFAULT_MAP_ID)
  const [selectedMapId, setSelectedMapId] = useState(DEFAULT_MAP_ID)
  const definition = useMemo(() => getDefinition(selectedMapId), [selectedMapId])
  const mapCountries = useMemo(() => getCountriesForMap(definition), [definition])
  const [currentCountryId, setCurrentCountryId] = useState(mapCountries[0]?.id ?? null)
  const [reviewFilter, setReviewFilter] = useState<CapitalAuthoringReviewFilter>('all')
  const [sourceMetadata, setSourceMetadata] = useState<CapitalAuthoringMapMetadata | null>(null)
  const [authoringDocument, setAuthoringDocument] = useState<CapitalAuthoringDocument>(() => createEmptyCapitalAuthoringDocument(blankMapMetadata(initialDefinition.id)))
  const [detection, setDetection] = useState<CapitalAuthoringDetection>({ geometry: 'normal', candidates: [], mappedSvgIds: [], problem: 'missing-geometry' })
  const [warnings, setWarnings] = useState<string[]>([])
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [manualPlacementMode, setManualPlacementMode] = useState(false)
  const [referenceMode, setReferenceMode] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const currentCountry = mapCountries.find(country => country.id === currentCountryId) ?? mapCountries[0]
  const currentPlacement = currentCountry ? authoringDocument.placements[currentCountry.id] : undefined
  const counts = useMemo(
    () => getCapitalAuthoringCounts(mapCountries, authoringDocument.placements),
    [authoringDocument.placements, mapCountries],
  )
  const reviewCountries = useMemo(
    () => mapCountries.filter(country => matchesCapitalAuthoringFilter(country, reviewFilter, authoringDocument.placements)),
    [authoringDocument.placements, mapCountries, reviewFilter],
  )
  const currentIndex = currentCountry ? mapCountries.findIndex(country => country.id === currentCountry.id) : -1
  const sourceWarnings = useMemo(
    () => [...warnings, ...metadataMismatchWarnings(authoringDocument, sourceMetadata)],
    [authoringDocument, sourceMetadata, warnings],
  )

  useEffect(() => {
    if (!reviewCountries.length) return
    if (!reviewCountries.some(country => country.id === currentCountryId)) setCurrentCountryId(reviewCountries[0].id)
  }, [currentCountryId, reviewCountries])

  useEffect(() => {
    if (!sourceMetadata || authoringDocument.map.id !== selectedMapId) return
    setStorageError(writeCapitalAuthoringStorage(getCapitalAuthoringStorageKey(selectedMapId), authoringDocument))
  }, [authoringDocument, selectedMapId, sourceMetadata])

  const handleSourceReady = useCallback((metadata: CapitalAuthoringMapMetadata) => {
    const definitionCountries = getCountriesForMap(getDefinition(metadata.id))
    const result = readCapitalAuthoringStorage(getCapitalAuthoringStorageKey(metadata.id), {
      map: metadata,
      countries: definitionCountries,
    })
    setSourceMetadata(metadata)
    setWarnings([...result.warnings, ...result.errors])
    setAuthoringDocument(result.document ?? createEmptyCapitalAuthoringDocument(metadata))
  }, [])

  const handleSourceError = useCallback((message: string | null) => setSourceError(message), [])
  const handleDetection = useCallback((nextDetection: CapitalAuthoringDetection) => setDetection(nextDetection), [])

  const selectMap = (mapId: string) => {
    const nextDefinition = getDefinition(mapId)
    const nextCountries = getCountriesForMap(nextDefinition)
    setSelectedMapId(mapId)
    setSourceMetadata(null)
    setSourceError(null)
    setWarnings([])
    setStorageError(null)
    setAuthoringDocument(createEmptyCapitalAuthoringDocument(blankMapMetadata(mapId)))
    setCurrentCountryId(nextCountries[0]?.id ?? null)
    setReviewFilter('all')
    setManualPlacementMode(false)
  }

  const commitDocument = (nextDocument: CapitalAuthoringDocument) => {
    setAuthoringDocument(nextDocument)
    setStorageError(null)
  }

  const commitManualPoint = (point: { x: number; y: number }) => {
    if (!currentCountry) return
    const placement = createManualPointPlacement(currentCountry, point, detection, currentPlacement)
    commitDocument(updateCapitalAuthoringPlacement(authoringDocument, placement))
    setManualPlacementMode(false)
  }

  const commitCandidate = (candidateId: string) => {
    if (!currentCountry) return
    const candidate = detection.candidates.find(item => item.id === candidateId)
    if (!candidate) return
    commitDocument(updateCapitalAuthoringPlacement(
      authoringDocument,
      createCandidatePlacement(currentCountry, detection, candidate),
    ))
    setManualPlacementMode(false)
  }

  const markUnresolved = () => {
    if (!currentCountry) return
    commitDocument(updateCapitalAuthoringPlacement(
      authoringDocument,
      createUnresolvedPlacement(currentCountry, detection),
    ))
    setManualPlacementMode(false)
  }

  const clearCurrentPlacement = () => {
    if (!currentCountry) return
    commitDocument(removeCapitalAuthoringPlacement(authoringDocument, currentCountry.id))
  }

  const navigate = (direction: -1 | 1) => {
    if (!reviewCountries.length) return
    const index = reviewCountries.findIndex(country => country.id === currentCountry?.id)
    const nextIndex = Math.min(reviewCountries.length - 1, Math.max(0, index + direction))
    setCurrentCountryId(reviewCountries[nextIndex].id)
    setManualPlacementMode(false)
  }

  const handleMapKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isEditableTarget(event.target) || !currentPlacement?.anchor || !sourceMetadata) return
    const directionByKey: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    }
    const direction = directionByKey[event.key]
    if (!direction) return
    const viewBox = parseSvgViewBox(sourceMetadata.viewBox)
    if (!viewBox || !currentCountry) return
    const scale = event.altKey ? 4 : event.shiftKey ? 0.25 : 1
    const point = {
      x: Math.min(viewBox.x + viewBox.width, Math.max(viewBox.x, currentPlacement.anchor.x + direction.x * scale)),
      y: Math.min(viewBox.y + viewBox.height, Math.max(viewBox.y, currentPlacement.anchor.y + direction.y * scale)),
    }
    event.preventDefault()
    commitManualPoint(point)
  }

  const handleExportCurrent = () => {
    if (!sourceMetadata) return
    downloadJson(`capital-map-${selectedMapId}.v1.json`, serializeCapitalAuthoringDocument(authoringDocument))
  }

  const handleExportAll = async () => {
    try {
      const documents = await Promise.all(MEMO_MAP_DEFINITIONS.map(async candidateDefinition => {
        if (candidateDefinition.id === selectedMapId && sourceMetadata) return authoringDocument
        const source = await loadCapitalAuthoringMapSource(candidateDefinition)
        const candidateCountries = getCountriesForMap(candidateDefinition)
        const stored = readCapitalAuthoringStorage(getCapitalAuthoringStorageKey(candidateDefinition.id), {
          map: source.metadata,
          countries: candidateCountries,
        })
        return stored.document ?? createEmptyCapitalAuthoringDocument(source.metadata)
      }))
      downloadJson('capital-maps.v1.json', serializeCapitalAuthoringCombinedExport(documents))
    } catch (reason) {
      setWarnings(previous => [...previous, reason instanceof Error ? reason.message : 'All maps could not be exported.'])
    }
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !sourceMetadata) return
    setIsImporting(true)
    try {
      const result = parseCapitalAuthoringImport(await file.text(), {
        map: sourceMetadata,
        countries: mapCountries,
      })
      if (result.document) {
        setAuthoringDocument(result.document)
        setWarnings([...result.warnings])
        setStorageError(null)
      } else {
        setWarnings([...result.warnings, ...result.errors])
      }
    } catch {
      setWarnings(previous => [...previous, 'The selected authoring file could not be read.'])
    } finally {
      setIsImporting(false)
    }
  }

  const handleClearMap = () => {
    const error = clearCapitalAuthoringStorage(selectedMapId)
    setStorageError(error)
    if (sourceMetadata) setAuthoringDocument(createEmptyCapitalAuthoringDocument(sourceMetadata))
  }

  if (!currentCountry) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">No canonical Countries are configured for this map.</div>
  }

  return (
    <section data-capital-authoring-editor className="space-y-4" aria-labelledby="capital-authoring-title">
      <header className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Branch-only developer tooling</p>
            <h1 id="capital-authoring-title" className="mt-1 text-xl font-bold text-zinc-100">Capital map authoring</h1>
            <p className="mt-1 max-w-3xl text-sm text-amber-100/80">Human-verify Capital anchors against the exact bundled World Countries SVG. Nothing is automatically marked complete.</p>
          </div>
          <span className="rounded-full border border-amber-400/30 px-3 py-1 text-xs text-amber-200">?capital-authoring=1</span>
        </div>
      </header>

      {(sourceWarnings.length > 0 || sourceError || storageError) && (
        <div role="alert" className="space-y-1 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {sourceError && <p>{sourceError}</p>}
          {storageError && <p>{storageError}</p>}
          {sourceWarnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <label className="grid gap-1 text-sm text-zinc-300">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Map</span>
              <select value={selectedMapId} onChange={event => selectMap(event.target.value)} className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-100">
                {MEMO_MAP_DEFINITIONS.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
              </select>
            </label>
            <div className="text-sm text-zinc-300">
              <p><span className="font-semibold text-zinc-100">{currentCountry.country}</span> → {currentCountry.capital}</p>
              <p className="text-xs text-zinc-500">Item {currentIndex + 1} / {mapCountries.length} · {counts.reviewed} reviewed</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate(-1)} disabled={!reviewCountries.length || reviewCountries[0].id === currentCountry.id} className="min-h-10 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
              <button type="button" onClick={() => navigate(1)} disabled={!reviewCountries.length || reviewCountries[reviewCountries.length - 1]?.id === currentCountry.id} className="min-h-10 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </div>

          <MapSurface
            context={null}
            map={
              <div
                tabIndex={0}
                onKeyDown={handleMapKeyDown}
                className="h-full rounded-2xl outline-none focus-visible:ring-2 focus:ring-cyan-400"
                aria-label="Capital map. Use arrow keys to nudge the saved anchor when focused."
              >
                <CapitalAuthoringMap
                  definition={definition}
                  country={currentCountry}
                  placement={currentPlacement}
                  onSourceReady={handleSourceReady}
                  onSourceError={handleSourceError}
                  onDetection={handleDetection}
                  onMapPoint={commitManualPoint}
                  onCandidateSelect={commitCandidate}
                />
                {referenceMode && (
                  <CapitalAuthoringReferencePanel
                    country={currentCountry}
                    reference={CAPITAL_AUTHORING_GEO_REFERENCES[currentCountry.id]}
                    onClose={() => setReferenceMode(false)}
                  />
                )}
              </div>
            }
            dockPlacement="stacked"
            dock={
              <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <button
                  type="button"
                  onClick={() => setReferenceMode(value => !value)}
                  aria-pressed={referenceMode}
                  aria-expanded={referenceMode}
                  aria-controls="capital-authoring-reference-panel"
                  className={referenceMode ? 'min-h-10 rounded-lg bg-violet-600 px-3 text-sm font-medium text-white' : 'min-h-10 rounded-lg border border-violet-400/50 px-3 text-sm font-medium text-violet-200'}
                >
                  {referenceMode ? 'Reference: On' : 'Reference'}
                </button>
                <button type="button" onClick={() => setManualPlacementMode(true)} className={`min-h-10 rounded-lg px-3 text-sm font-medium ${manualPlacementMode ? 'bg-cyan-600 text-white' : 'border border-zinc-700 text-zinc-200'}`}>Place/override manually</button>
                <button type="button" onClick={markUnresolved} disabled={!sourceMetadata} className="min-h-10 rounded-lg border border-red-500/40 px-3 text-sm text-red-200 disabled:opacity-40">Mark unresolved</button>
                <button type="button" onClick={clearCurrentPlacement} disabled={!currentPlacement} className="min-h-10 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 disabled:opacity-40">Clear/reopen</button>
              </div>
            }
          />
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="font-semibold text-zinc-100">Review status</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-zinc-500">Current</dt><dd className="font-medium text-zinc-100">{currentPlacement?.status ?? 'absent'}</dd></div>
              <div><dt className="text-zinc-500">Detected</dt><dd className="font-medium text-zinc-100">{detection.geometry}</dd></div>
              <div><dt className="text-zinc-500">Reviewed</dt><dd className="font-medium text-zinc-100">{counts.reviewed} / {counts.total}</dd></div>
              <div><dt className="text-zinc-500">Remaining</dt><dd className="font-medium text-zinc-100">{counts.remaining}</dd></div>
              <div><dt className="text-zinc-500">Manual points</dt><dd className="font-medium text-zinc-100">{counts.manualPoints}</dd></div>
              <div><dt className="text-zinc-500">Single dots</dt><dd className="font-medium text-zinc-100">{counts.confirmedSingleDots}</dd></div>
              <div><dt className="text-zinc-500">Multi dots</dt><dd className="font-medium text-zinc-100">{counts.selectedMultiDots}</dd></div>
              <div><dt className="text-zinc-500">Unresolved</dt><dd className="font-medium text-zinc-100">{counts.unresolved}</dd></div>
            </dl>
          </section>

          {detection.geometry === 'single-dot' && (
            <section className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm text-sky-100">
              <h2 className="font-semibold">Likely single-dot Country</h2>
              <p className="mt-1 text-sky-100/80">The suggestion is advisory. Confirm it explicitly or place an override manually.</p>
              <button type="button" onClick={() => commitCandidate(detection.candidates[0]?.id ?? '')} className="mt-3 min-h-10 rounded-lg bg-sky-600 px-3 font-medium text-white disabled:opacity-40" disabled={!detection.candidates[0]}>Confirm suggested dot</button>
            </section>
          )}

          {detection.geometry === 'multi-dot' && (
            <section className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4 text-sm text-violet-100">
              <h2 className="font-semibold">Multiple dot candidates</h2>
              <p className="mt-1 text-violet-100/80">Select the symbolic point that represents this Capital.</p>
              <div className="mt-3 space-y-2">
                {detection.candidates.map(candidate => (
                  <button key={candidate.id} type="button" onClick={() => commitCandidate(candidate.id)} className="flex min-h-10 w-full items-center justify-between rounded-lg border border-violet-300/30 px-3 text-left hover:bg-violet-300/10">
                    <span>{candidate.id}</span><span className="font-mono text-xs">{candidate.x.toFixed(2)}, {candidate.y.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {detection.problem && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {detection.problem === 'missing-geometry' ? 'No matching SVG geometry was found for this Country; it remains visible as an authoring problem.' : 'The matching SVG geometry could not be measured. Manual placement remains available.'}
            </p>
          )}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex flex-wrap gap-2">
              {(['all', 'remaining', 'unresolved', 'dots'] as const).map(filter => (
                <button key={filter} type="button" onClick={() => setReviewFilter(filter)} className={`min-h-9 rounded-lg px-2.5 text-xs ${reviewFilter === filter ? 'bg-zinc-100 text-zinc-950' : 'border border-zinc-700 text-zinc-300'}`}>{filterLabel(filter)}</button>
              ))}
            </div>
            <div className="mt-3 max-h-72 space-y-1 overflow-auto pr-1">
              {reviewCountries.map(country => {
                const placement = authoringDocument.placements[country.id]
                return (
                  <button key={country.id} type="button" onClick={() => setCurrentCountryId(country.id)} className={`flex min-h-9 w-full items-center justify-between rounded-lg px-2 text-left text-sm ${currentCountry.id === country.id ? 'bg-cyan-600/30 text-cyan-100' : 'text-zinc-300 hover:bg-zinc-800'}`}>
                    <span className="truncate">{country.country}</span><span className="ml-2 text-right text-xs text-zinc-500">{placementStatusLabel(placement)}</span>
                  </button>
                )
              })}
              {!reviewCountries.length && <p className="px-2 py-3 text-sm text-zinc-500">No Countries match this filter.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="font-semibold text-zinc-100">Portable authoring data</h2>
            <div className="mt-3 grid gap-2">
              <button type="button" onClick={handleExportCurrent} disabled={!sourceMetadata} className="min-h-10 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white disabled:opacity-40">Export current map</button>
              <button type="button" onClick={() => importInputRef.current?.click()} disabled={!sourceMetadata || isImporting} className="min-h-10 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 disabled:opacity-40">{isImporting ? 'Importing…' : 'Import current map'}</button>
              <button type="button" onClick={() => void handleExportAll()} className="min-h-10 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200">Export all maps</button>
              <button type="button" onClick={handleClearMap} className="min-h-10 rounded-lg border border-red-500/40 px-3 text-sm text-red-200">Clear/reset local current map</button>
              <input ref={importInputRef} type="file" accept="application/json,.json" onChange={event => void handleImportFile(event)} className="hidden" />
            </div>
            <p className="mt-3 text-xs text-zinc-500">Saved locally as {getCapitalAuthoringStorageKey(selectedMapId)}. Coordinates are exported in SVG user space.</p>
          </section>
        </aside>
      </div>
    </section>
  )
}
