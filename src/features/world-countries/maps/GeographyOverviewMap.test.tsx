// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { SetupMap } from '@/features/world-countries/setup/SetupMap'
import europeSvg from '@/features/world-countries/maps/assets/MapChart_Map_Europe_names.svg?raw'
import { GeographyOverviewMap } from './GeographyOverviewMap'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
afterEach(() => { act(() => root?.unmount()); root = null; document.body.replaceChildren(); vi.unstubAllGlobals() })

describe('GeographyOverviewMap', () => {
  it('reports grouped map hover and Country clicks through workflow-neutral callbacks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const onHoverGroup = vi.fn(); const onCountryClick = vi.fn(); const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(GeographyOverviewMap, { level: 'world', onHoverGroup, onCountryClick, ariaLabel: 'World map' })); await Promise.resolve(); await Promise.resolve() })
    const path = mount.querySelector('path#Norway')
    await act(async () => { path?.dispatchEvent(new Event('pointerenter', { bubbles: true })); path?.dispatchEvent(new Event('click', { bubbles: true })) })
    expect(onHoverGroup).toHaveBeenLastCalledWith('continent-europe')
    expect(onCountryClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'NO', continent: 'Europe' }))
  })

  it('keeps readiness color separate from geographic selection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => europeSvg })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(SetupMap, { level: 'continent', continent: 'Europe', learningReadinessColorsById: new Map([['NO', '#71717a']]), learningReadinessByCountryId: new Map([['NO', 'COUNTRIES_LEARNED' as const]]) })); await Promise.resolve(); await Promise.resolve() })
    expect((mount.querySelector('path#Norway') as SVGPathElement | null)?.style.fill).toBe('#71717a')
    expect(mount.textContent).toContain('Learning Readiness')
    expect(mount.textContent).toContain('Countries learned')
  })

  it('exposes non-color descriptions on individual Country maps', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path id="Norway"/><text id="Norway_label">Norway</text></g></svg>' })))
    const mount = document.createElement('div'); document.body.append(mount)
    await act(async () => { root = createRoot(mount); root.render(createElement(CountryLearningMap, { continent: 'Europe', scopeCountries: [{ id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' }], countryAccessibleDescriptionsById: new Map([['NO', 'Learning Readiness: Countries learned.']]), ariaLabel: 'Learning map' })); await Promise.resolve(); await Promise.resolve() })
    const map = mount.querySelector('[role="img"]'); const descriptionId = map?.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy(); expect(mount.querySelector(`#${descriptionId}`)?.textContent).toContain('Norway: Learning Readiness: Countries learned.')
  })
})
