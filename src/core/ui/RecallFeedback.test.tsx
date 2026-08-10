import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RecallFeedback } from './RecallFeedback'

describe('RecallFeedback', () => {
  it('renders transient overlay feedback without an action button', () => {
    const markup = renderToStaticMarkup(
      <RecallFeedback
        correct={false}
        message="The correct country is Norway."
        detail="The session will continue automatically."
      />,
    )

    expect(markup).toContain('role="status"')
    expect(markup).toContain('border-red-500/30')
    expect(markup).toContain('The correct country is Norway.')
    expect(markup).not.toContain('<button')
  })

  it('supports compact inline feedback', () => {
    const markup = renderToStaticMarkup(
      <RecallFeedback correct message="Correct." variant="inline" />,
    )

    expect(markup).toContain('text-center')
    expect(markup).toContain('text-green-300')
  })
})
