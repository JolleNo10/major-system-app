import { useRef, useState } from 'react'
import { useSoundKeyStore } from '../context/SoundKeyContext'
import { skKey, type SoundKeyField } from '../data/soundKey'
import {
  parseSoundKeyCsv, serializeSoundKeyCsv, type SoundKeyRow, type Layered,
} from '../data/soundKeyCsv'

const SILENT = ['Vowels (a, e, i, o, u)', 'h', 'w', 'y', 'c (mykt)', 'q', 'x']
const DIGITS = Array.from({ length: 10 }, (_, i) => i)

// A field can be left empty in the editor only when it's the free-form hint.
const REQUIRED: Record<SoundKeyField, boolean> = { sounds: true, hint: false }

const COLS: { field: SoundKeyField; label: string; placeholder: string }[] = [
  { field: 'sounds', label: 'Sounds', placeholder: 'e.g. s, z' },
  { field: 'hint', label: 'Memory tip', placeholder: 'optional' },
]

export function SoundKeyGrid() {
  const {
    words, shipped, saved, overrides,
    setOverride, resetOverride, resetTrials, persist, resetFactory, importEffective,
  } = useSoundKeyStore()

  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const trialCount = Object.keys(overrides).length
  const savedCount = Object.keys(saved).length

  const flash = (msg: string) => { setImportMsg(msg); setTimeout(() => setImportMsg(null), 3000) }

  const layered = (digit: number, field: SoundKeyField): Layered => {
    const k = skKey(digit, field)
    const def = shipped[k] ?? ''
    const eff = words[k] ?? ''
    return { def, custom: eff !== def ? eff : '' }
  }

  const handleExport = () => {
    const rows: SoundKeyRow[] = DIGITS.map(d => ({
      digit: String(d),
      sounds: layered(d, 'sounds'),
      hint: layered(d, 'hint'),
    }))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([serializeSoundKeyCsv(rows)], { type: 'text/csv' }))
    a.download = 'sound-key.csv'
    a.click()
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { rows, errors } = parseSoundKeyCsv(ev.target?.result as string)
      if (errors.length) {
        setImportErrors(errors)
        setImportMsg(null)
      } else {
        setImportErrors([])
        const map: Record<string, string> = {}
        for (const r of rows) {
          map[skKey(r.digit, 'sounds')] = r.sounds.custom || r.sounds.def
          map[skKey(r.digit, 'hint')] = r.hint.custom || r.hint.def
        }
        importEffective(map)
        flash(`Imported ${rows.length} row${rows.length !== 1 ? 's' : ''}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const startEdit = (key: string) => { setEditing(key); setEditValue(words[key] ?? '') }

  const confirmEdit = (key: string, field: SoundKeyField) => {
    const val = editValue.trim()
    if (REQUIRED[field] && !val) { setEditing(null); return }
    const baseline = saved[key] ?? shipped[key] ?? ''
    if (val === baseline) resetOverride(key)
    else setOverride(key, val)
    setEditing(null)
  }

  const btn = 'text-zinc-400 hover:text-zinc-200 transition-colors'

  const renderCell = (digit: number, field: SoundKeyField, placeholder: string) => {
    const key = skKey(digit, field)
    const isEditing = editing === key
    const isTrial = key in overrides
    const isSaved = !isTrial && key in saved
    const value = words[key] ?? ''

    return (
      <td className="px-3 py-2 align-top">
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editValue}
            placeholder={placeholder}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') confirmEdit(key, field)
              if (e.key === 'Escape') setEditing(null)
            }}
            onBlur={() => confirmEdit(key, field)}
            className="w-full bg-transparent text-sm text-zinc-100 outline-none border-b border-violet-400"
          />
        ) : (
          <div className="flex items-start gap-1.5 group">
            <button
              onClick={() => startEdit(key)}
              className={`text-left text-sm rounded px-1.5 py-1 -mx-1.5 -my-1 transition-colors w-full ${
                isTrial ? 'text-yellow-300 bg-yellow-600/10 hover:bg-yellow-600/20'
                : isSaved ? 'text-violet-300 hover:bg-violet-600/10'
                : 'text-zinc-300 hover:bg-zinc-800'
              } ${field === 'sounds' ? 'font-mono' : ''}`}
              aria-label={`Edit ${field} for digit ${digit}: ${value || '(empty)'}`}
            >
              {value || <span className="text-zinc-600 italic">empty</span>}
            </button>
            {(isTrial || isSaved) && (
              <button
                onClick={() => resetOverride(key)}
                className={`${isTrial ? 'text-yellow-500 hover:text-yellow-300' : 'text-violet-400 hover:text-violet-300'} text-sm leading-none mt-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0`}
                title={isTrial ? 'Discard pending edit' : 'Revert to shipped default'}
                aria-label={isTrial ? `Discard pending edit for ${field} of digit ${digit}` : `Revert ${field} of digit ${digit} to shipped default`}
              >
                ↺
              </button>
            )}
          </div>
        )}
      </td>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
        <span className="text-zinc-500">
          {importMsg
            ? <span className="text-violet-300">{importMsg}</span>
            : trialCount > 0 ? `${trialCount} pending edit${trialCount !== 1 ? 's' : ''} — Persist to save`
            : savedCount > 0 ? `${savedCount} saved customization${savedCount !== 1 ? 's' : ''}`
            : 'Click a value to edit'}
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
              onClick={() => { if (confirm('Reset the sound key to the shipped defaults? Saved customizations will be lost.')) resetFactory() }}
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

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-800/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Digit</th>
              {COLS.map(c => (
                <th key={c.field} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {DIGITS.map(digit => (
              <tr key={digit} className="hover:bg-zinc-800/20 transition-colors">
                <td className="px-4 py-2 align-top">
                  <span className="text-2xl font-bold text-violet-400 tabular-nums">{digit}</span>
                </td>
                {COLS.map(c => renderCell(digit, c.field, c.placeholder))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Yellow = pending edit (not yet saved) · Violet = saved customization · Sounds are comma-separated
      </p>

      <div className="bg-zinc-800/30 rounded-xl border border-zinc-800 p-5">
        <p className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
          Letters that are ignored
        </p>
        <div className="flex flex-wrap gap-2">
          {SILENT.map(l => (
            <span key={l} className="px-2.5 py-1 bg-zinc-800 rounded-lg text-sm text-zinc-500 font-mono border border-zinc-700">
              {l}
            </span>
          ))}
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          Only consonant sounds count. Silent letters, vowels and these are ignored.
        </p>
      </div>
    </div>
  )
}
