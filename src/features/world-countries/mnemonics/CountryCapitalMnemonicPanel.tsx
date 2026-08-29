import { useEffect, useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import { countryCapitalMnemonicId } from './geographyMnemonicIds'
import { GeographyMnemonicEditor } from './GeographyMnemonicEditor'
import { GeographyMnemonicView } from './GeographyMnemonicView'

/** Shared Country ↔ Capital mnemonic panel used by Learning and Drill. */
export function CountryCapitalMnemonicPanel({
  country,
}: {
  country: Country
}) {
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setEditing(false)
  }, [country.id])

  const targetId = countryCapitalMnemonicId(country)
  const title = `${country.country} ↔ ${country.capital}`
  const subtitle = 'Optional memory aid for this Country–Capital relationship'
  const action = (
    <button
      type="button"
      onClick={() => setEditing(current => !current)}
      className="shrink-0 text-left text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
    >
      {editing ? 'Close mnemonic editor' : 'Edit mnemonics'}
    </button>
  )

  return editing ? (
    <GeographyMnemonicEditor
      targetId={targetId}
      title={title}
      subtitle={subtitle}
      headerAction={action}
      initiallyEditing
    />
  ) : (
    <GeographyMnemonicView
      targetId={targetId}
      title={title}
      subtitle={subtitle}
      headerAction={action}
    />
  )
}
