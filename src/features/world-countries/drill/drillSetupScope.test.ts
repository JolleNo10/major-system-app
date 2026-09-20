import { describe, expect, it } from 'vitest'
import { describeDrillSetupRun } from './drillSetupScope'

describe('Drill setup run description', () => {
  it('names both core skills in order for the main Drill mode', () => {
    expect(describeDrillSetupRun({ activity: { kind: 'drill' }, mode: 'countries-capitals', order: 'random' }))
      .toBe('Location → Country, then Country → Capital · Random order')
  })

  it('names the single skill and the chosen order for a sub mode', () => {
    expect(describeDrillSetupRun({ activity: { kind: 'drill' }, mode: 'capitals', order: 'ordered' }))
      .toBe('Country → Capital · In order')
  })

  it('omits order for Practice, which always randomises', () => {
    expect(describeDrillSetupRun({ activity: { kind: 'practice', mode: 'locate-countries' }, mode: 'countries', order: 'ordered' }))
      .toBe('Location → Country')
  })

  it('names the answer interaction only where Practice actually offers the choice', () => {
    expect(describeDrillSetupRun({
      activity: { kind: 'practice', mode: 'countries-from-capitals' },
      mode: 'countries',
      order: 'random',
      practiceInteraction: 'recall',
    })).toBe('Capital → Country · Type the answer')
  })
})
