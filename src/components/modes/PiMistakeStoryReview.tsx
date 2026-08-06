import { useEffect, useMemo, useState } from 'react'
import { PI_PAIRS } from '../../data/piDigits'
import { useBlobUrl, usePiStory } from '../../hooks/usePiStory'
import { segmentDigitRange } from '../../utils/piSegments'
import { highlightStory } from '../../utils/storyHighlight'

const PAIRS_PER_SEGMENT = 10

interface Props {
  segments: number[]
  words: Record<string, string>
}

// A mistake-only, read-only view of the mnemonic saved in Memo. Keeping this
// collapsed by default lets the learner choose whether to reveal the spoiler.
export function PiMistakeStoryReview({ segments, words }: Props) {
  const [openSeg, setOpenSeg] = useState<number | null>(null)
  const { story, loading } = usePiStory(openSeg, 0)
  const imageUrl = useBlobUrl(story?.image ?? null)

  useEffect(() => {
    if (openSeg !== null && !segments.includes(openSeg)) setOpenSeg(null)
  }, [openSeg, segments])

  const expectedWords = useMemo(() => {
    if (openSeg === null) return []
    return PI_PAIRS
      .slice(openSeg * PAIRS_PER_SEGMENT, (openSeg + 1) * PAIRS_PER_SEGMENT)
      .map(pair => words[pair] ?? pair)
  }, [openSeg, words])

  const highlighted = useMemo(
    () => story?.text.trim() ? highlightStory(story.text, expectedWords) : null,
    [story, expectedWords],
  )

  if (segments.length === 0) return null

  return (
    <div className="w-full rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 space-y-3 animate-fade-in">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Need a memory cue?</p>
        <p className="mt-0.5 text-xs text-zinc-500">Reveal the saved story and picture for a missed segment.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {segments.map(seg => {
          const [startDigit, endDigit] = segmentDigitRange(seg)
          const isOpen = openSeg === seg
          return (
            <button
              key={seg}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenSeg(isOpen ? null : seg)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                isOpen
                  ? 'border-violet-400 bg-violet-500/25 text-violet-100'
                  : 'border-violet-500/40 bg-zinc-900/70 text-violet-300 hover:border-violet-400 hover:text-violet-100'
              }`}
            >
              {isOpen ? 'Hide' : 'View'} story · π {startDigit}–{endDigit}
            </button>
          )
        })}
      </div>
      {openSeg !== null && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-3 space-y-3">
          {loading ? (
            <p className="text-xs text-zinc-500">Loading story…</p>
          ) : story && (story.text.trim() || story.image) ? (
            <>
              {highlighted && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                  {highlighted.segments.map((part, index) => part.matched
                    ? <mark key={index} className="rounded bg-violet-500/25 px-0.5 text-violet-200">{part.text}</mark>
                    : <span key={index}>{part.text}</span>,
                  )}
                </p>
              )}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={`Story picture for pi segment ${openSeg + 1}`}
                  className="max-h-72 w-full rounded-lg object-contain object-left"
                />
              )}
            </>
          ) : (
            <p className="text-xs leading-relaxed text-zinc-500">
              No story or picture is saved for this segment yet. Add one from the Memo tab.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
