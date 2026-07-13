import { useRef, useState } from 'react'
import { useWords } from '../context/WordsContext'
import { getStats } from '../hooks/useStats'
import { parseWordsCsv, serializeWordsCsv } from '../data/wordsCsv'

export function WordListGrid() {
  const { words, shipped, saved, overrides, setOverride, resetOverride, resetTrials, persist, resetFactory, importSaved } = useWords()
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stats = getStats()

  const keys = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
  const trialCount = Object.keys(overrides).length
  const savedCount = Object.keys(saved).length

  const flash = (msg: string) => { setImportMsg(msg); setTimeout(() => setImportMsg(null), 3000) }

  const handleExport = () => {
    const rows = keys.map(number => {
      const effective = words[number]
      return { number, def: shipped[number], custom: effective !== shipped[number] ? effective : '' }
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([serializeWordsCsv(rows)], { type: 'text/csv' }))
    a.download = 'words.csv'
    a.click()
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { rows, errors } = parseWordsCsv(ev.target?.result as string)
      if (errors.length) {
        setImportErrors(errors)
        setImportMsg(null)
      } else {
        setImportErrors([])
        importSaved(rows)
        flash(`Imported ${rows.length} word${rows.length !== 1 ? 's' : ''}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const startEdit = (key: string) => {
    setEditing(key)
    setEditValue(words[key])
  }

  const confirmEdit = (key: string) => {
    const val = editValue.trim()
    if (!val) { setEditing(null); return }
    const baseline = saved[key] ?? shipped[key]
    if (val === baseline) resetOverride(key)
    else setOverride(key, val)
    setEditing(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter') confirmEdit(key)
    if (e.key === 'Escape') setEditing(null)
  }

  const btn = 'text-zinc-400 hover:text-zinc-200 transition-colors'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
        <span className="text-zinc-500">
          {importMsg
            ? <span className="text-violet-300">{importMsg}</span>
            : trialCount > 0 ? `${trialCount} pending edit${trialCount !== 1 ? 's' : ''} — Persist to save`
            : savedCount > 0 ? `${savedCount} saved customization${savedCount !== 1 ? 's' : ''}`
            : 'Click a word to edit'}
        </span>
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportFile} />
          <button onClick={() => fileInputRef.current?.click()} className={btn}>↑ Import</button>
          <button onClick={handleExport} className={btn}>↓ Export</button>
          {trialCount > 0 && (
            <button onClick={persist} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">✓ Persist</button>
          )}
          {trialCount > 0 && (
            <button onClick={resetTrials} className={btn}>↺ Reset edits</button>
          )}
          {(savedCount > 0 || trialCount > 0) && (
            <button
              onClick={() => { if (confirm('Reset all words to the shipped defaults? Saved customizations will be lost.')) resetFactory() }}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              Reset to factory
            </button>
          )}
        </div>
      </div>

      {importErrors.length > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-red-300 font-medium">Import failed — {importErrors.length} error{importErrors.length !== 1 ? 's' : ''}, nothing applied</span>
            <button onClick={() => setImportErrors([])} className="text-red-400 hover:text-red-200">×</button>
          </div>
          <ul className="text-red-300/80 font-mono text-xs space-y-0.5 max-h-40 overflow-y-auto">
            {importErrors.slice(0, 20).map((err, i) => <li key={i}>{err}</li>)}
            {importErrors.length > 20 && <li>…and {importErrors.length - 20} more</li>}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {keys.map(key => {
          const isEditing = editing === key
          const isTrial = key in overrides
          const isSaved = !isTrial && key in saved
          const s = stats[key]
          const total = s ? s.correct + s.wrong : 0
          const accuracy = total > 0 ? s.correct / total : null

          return (
            <div
              key={key}
              className={`relative rounded-lg border p-2.5 transition-all cursor-pointer group min-h-[60px]
                ${isEditing
                  ? 'border-violet-500 bg-violet-500/10'
                  : isTrial
                  ? 'border-yellow-600/40 bg-zinc-800/60 hover:border-yellow-500/60 hover:bg-zinc-800'
                  : isSaved
                  ? 'border-violet-600/40 bg-zinc-800/60 hover:border-violet-500/60 hover:bg-zinc-800'
                  : 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800'
                }
              `}
              onClick={() => !isEditing && startEdit(key)}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-xs font-mono text-zinc-600">{key}</span>
                <div className="flex items-center gap-1">
                  {accuracy !== null && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        accuracy >= 0.8 ? 'bg-green-500' : accuracy >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      title={`${s.correct}✓ ${s.wrong}✗`}
                    />
                  )}
                  {(isTrial || isSaved) && (
                    <button
                      onClick={e => { e.stopPropagation(); resetOverride(key) }}
                      className={`${isTrial ? 'text-yellow-500 hover:text-yellow-300' : 'text-violet-400 hover:text-violet-300'} text-sm leading-none px-1 -mr-0.5 opacity-70 group-hover:opacity-100 transition-opacity`}
                      title={isTrial ? 'Discard pending edit' : 'Revert to shipped default'}
                    >
                      ↺
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => handleKeyDown(e, key)}
                  onBlur={() => confirmEdit(key)}
                  onClick={e => e.stopPropagation()}
                  className="w-full bg-transparent text-sm font-semibold text-zinc-100 outline-none border-b border-violet-400"
                />
              ) : (
                <div className={`text-sm font-semibold truncate ${isTrial ? 'text-yellow-300' : isSaved ? 'text-violet-300' : 'text-zinc-200'}`}>
                  {words[key]}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Yellow = pending edit (not yet saved) · Violet = saved customization · Coloured dot = training history
      </p>
    </div>
  )
}
