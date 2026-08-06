import { useBlobUrl } from '@/features/pi/shared/story/usePiStory'
import { highlightStory } from '@/features/pi/shared/story/storyHighlight'
import type { PiStory } from '@/features/pi/shared/story/piStories'

// Read-only render of a segment's story: the highlighted freeform text (the
// segment's ordered words marked, with a missing-word warning) + the picture.
// Shared by the study/result rail (StoryPanel) and the Memo setup window.
export function StoryView({ story, expectedWords }: {
  story: PiStory
  expectedWords: string[]
}) {
  const url = useBlobUrl(story.image ?? null)
  return (
    <>
      {story.text.trim() && (() => {
        const { segments, missing } = highlightStory(story.text, expectedWords)
        return (
          <>
            <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {segments.map((s, i) =>
                s.matched
                  ? <mark key={i} className="bg-violet-500/25 text-violet-200 rounded px-0.5">{s.text}</mark>
                  : <span key={i}>{s.text}</span>,
              )}
            </p>
            {missing.length > 0 && (
              <p className="text-xs text-amber-400">
                ⚠ {missing.length} word{missing.length !== 1 ? 's' : ''} not in your story: {missing.join(', ')}
              </p>
            )}
          </>
        )
      })()}
      {url && <img src={url} alt="Story picture" className="max-h-64 rounded-lg" />}
    </>
  )
}
