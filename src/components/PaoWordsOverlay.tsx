import { Overlay } from './Overlay'
import { PaoWordsGrid } from './PaoWordsGrid'

interface Props {
  onClose: () => void
}

export function PaoWordsOverlay({ onClose }: Props) {
  return (
    <Overlay
      onClose={onClose}
      ariaLabel="PAO Deck words"
      header={<span className="font-bold text-zinc-100">🎬 PAO Deck — Person · Action · Object</span>}
      maxWidth="max-w-4xl"
    >
      <PaoWordsGrid />
    </Overlay>
  )
}
