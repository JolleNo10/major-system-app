// Parse/serialize for the sound-key CSV. Unlike the word CSV (naive split — words
// never contain commas), sound-key `display`/`hint` fields carry commas AND quotes
// (e.g. `s, z`, `"0" ligner en S...`), so this uses RFC-4180-style quoting: fields
// with a comma/quote are wrapped in "…" with internal quotes doubled.
//
// Columns (default+custom per editable field, mirroring the word list's layering):
//   digit,sounds_default,sounds_custom,display_default,display_custom,hint_default,hint_custom
// `sounds` cells are comma-separated tokens (e.g. `sj, kj, skj, tj`).
// Effective value per field = custom || default.

export interface Layered {
  def: string
  custom: string
}

export interface SoundKeyRow {
  digit: string          // "0".."9"
  sounds: Layered
  display: Layered
  hint: Layered
}

export interface SoundKeyParseResult {
  rows: SoundKeyRow[]
  errors: string[]
}

export const SOUND_KEY_CSV_HEADER =
  'digit,sounds_default,sounds_custom,display_default,display_custom,hint_default,hint_custom'

const DIGIT_RE = /^[0-9]$/

function isHeader(line: string): boolean {
  return line.replace(/\s+/g, '').toLowerCase() === SOUND_KEY_CSV_HEADER.replace(/\s+/g, '').toLowerCase()
}

// Split one CSV line into fields, honouring "…"-quoted fields with doubled quotes.
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(cur); cur = ''
    } else cur += ch
  }
  fields.push(cur)
  return fields
}

function serializeField(v: string): string {
  return /[",\n]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v
}

export function parseSoundKeyCsv(text: string): SoundKeyParseResult {
  const rows: SoundKeyRow[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  const lines = text.split(/\r?\n/)
  lines.forEach((raw, i) => {
    if (!raw.trim()) return
    if (i === 0 && isHeader(raw)) return

    const lineNo = i + 1
    const parts = parseCsvLine(raw)
    if (parts.length !== 7) {
      errors.push(`Line ${lineNo}: expected 7 columns, got ${parts.length}`)
      return
    }

    const digit = parts[0].trim()
    const sounds: Layered = { def: parts[1].trim(), custom: parts[2].trim() }
    const display: Layered = { def: parts[3].trim(), custom: parts[4].trim() }
    const hint: Layered = { def: parts[5].trim(), custom: parts[6].trim() }

    if (!DIGIT_RE.test(digit)) {
      errors.push(`Line ${lineNo}: invalid digit "${parts[0].trim()}" (must be 0–9)`)
      return
    }
    if (seen.has(digit)) {
      errors.push(`Line ${lineNo}: duplicate digit ${digit}`)
      return
    }
    if (!(sounds.custom || sounds.def)) {
      errors.push(`Line ${lineNo}: missing sounds for digit ${digit}`)
      return
    }
    if (!(display.custom || display.def)) {
      errors.push(`Line ${lineNo}: missing display for digit ${digit}`)
      return
    }

    seen.add(digit)
    rows.push({ digit, sounds, display, hint })
  })

  return { rows, errors }
}

export function serializeSoundKeyCsv(rows: SoundKeyRow[]): string {
  const body = rows.map(r => [
    r.digit,
    serializeField(r.sounds.def), serializeField(r.sounds.custom),
    serializeField(r.display.def), serializeField(r.display.custom),
    serializeField(r.hint.def), serializeField(r.hint.custom),
  ].join(',')).join('\n')
  return `${SOUND_KEY_CSV_HEADER}\n${body}\n`
}
