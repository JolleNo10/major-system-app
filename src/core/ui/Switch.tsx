interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  id?: string
  label?: string
}

/** Accessible on/off toggle (track + knob), keyboard handled natively by button. */
export function Switch({ checked, onChange, id, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
        checked
          ? 'bg-violet-600 border-violet-500'
          : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
