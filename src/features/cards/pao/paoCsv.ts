// Parse/serialize for the PAO card CSV (Person/Action/Object per card). A card's
// three fields are short free text (names may carry commas/quotes, e.g.
// "Da Vinci, Leonardo"), so this uses RFC-4180-style quoting like the sound-key
// CSV: a field containing a comma/quote/newline is wrapped in "…" with internal
// quotes doubled. Unlike the layered word CSV, each field is a single effective
// value (import folds it straight into the store's saved layer).
//
// Columns: number,person,action,object

export interface PaoRow {
  number: string   // "01".."52"
  person: string
  action: string
  object: string
}

export interface PaoParseResult {
  rows: PaoRow[]
  errors: string[]
}

export const PAO_CSV_HEADER = 'number,person,action,object'

// Card numbers are 01–52 (52-card deck, ♣=01-13, ♦=14-26, ♥=27-39, ♠=40-52).
const NUM_RE = /^(0[1-9]|[1-4][0-9]|5[0-2])$/

function isHeader(line: string): boolean {
  return line.replace(/\s+/g, '').toLowerCase() === PAO_CSV_HEADER.replace(/\s+/g, '').toLowerCase()
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

export function parsePaoCsv(text: string): PaoParseResult {
  const rows: PaoRow[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  const lines = text.split(/\r?\n/)
  lines.forEach((raw, i) => {
    if (!raw.trim()) return
    if (i === 0 && isHeader(raw)) return

    const lineNo = i + 1
    const parts = parseCsvLine(raw)
    if (parts.length !== 4) {
      errors.push(`Line ${lineNo}: expected 4 columns, got ${parts.length}`)
      return
    }

    const number = parts[0].trim()
    const person = parts[1].trim()
    const action = parts[2].trim()
    const object = parts[3].trim()

    if (!NUM_RE.test(number)) {
      errors.push(`Line ${lineNo}: invalid card number "${parts[0].trim()}" (must be 01–52)`)
      return
    }
    if (seen.has(number)) {
      errors.push(`Line ${lineNo}: duplicate card ${number}`)
      return
    }
    if (!person || !action || !object) {
      errors.push(`Line ${lineNo}: card ${number} needs a person, action and object`)
      return
    }

    seen.add(number)
    rows.push({ number, person, action, object })
  })

  return { rows, errors }
}

export function serializePaoCsv(rows: PaoRow[]): string {
  const body = rows.map(r => [
    r.number,
    serializeField(r.person),
    serializeField(r.action),
    serializeField(r.object),
  ].join(',')).join('\n')
  return `${PAO_CSV_HEADER}\n${body}\n`
}
