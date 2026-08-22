# Change Spec 0027 - Fit expanded World Countries maps within the viewport

- **Status:** Implemented
- **Date:** 2026-08-22
- **Issue:** None.
- **Related ADRs:** ADR 0028 - PageLayout owns an optional expanded-center presentation
- **Current-state docs:** `docs/architecture/SYSTEM.md`, `docs/architecture/features/WORLD_COUNTRIES.md`
- **Related Change Specs:** Change Spec 0020 - Expanded World Countries maps and forgiving tiny-country targets

## Goal

Refine the existing World Countries expanded-map experience so expansion uses the available desktop viewport without creating vertical page scrolling. While a map is expanded, remove nonessential World Countries activity chrome (`Today`, `Drill`, `Recite`) so the map/task surface receives the available space.

This is a refinement of the existing `expanded-center` presentation. It must not introduce a second fullscreen, wide-map, or workflow-specific expansion mechanism.

## User-visible behavior

At `xl+`, when the user activates the existing **Expand map** control:

- the existing PageLayout rails remain suppressed as today;
- the World Countries activity header containing `Today`, `Drill`, and `Recite` is also hidden;
- the global application header remains visible;
- the same map instance, prompt/context, feedback, task dock, typed draft, workflow state, and answer lifecycle remain mounted and active;
- the map grows only as far as the available width **or** available viewport height allows, whichever limit is reached first;
- the map preserves its current SVG/viewBox aspect ratio and is never stretched;
- when height becomes the limiting dimension, the map stops growing horizontally instead of forcing additional page height;
- the expanded map/task experience must not introduce vertical page scrolling on an ordinary desktop viewport merely because the map expanded;
- the map remains horizontally centered when the viewport-height limit prevents it from using the full available width;
- the existing Collapse map control remains reachable without scrolling.

When the user collapses the map:

- the standard 42rem center presentation returns;
- the currently published World Countries activity header returns with the existing selected activity unchanged;
- the currently published rails return;
- map/task/workflow state remains unchanged.

Below `xl`, existing responsive behavior remains unchanged and the expanded-only presentation must not remain active.

## Scope

- Refine app `PageLayout` expanded-center presentation so registered layout header chrome is suppressed while expanded and restored on collapse.
- Refine the World Countries common expanded map sizing so width and usable viewport height are both constraints.
- Preserve existing `MapSurface` expansion ownership and the existing `PageLayout` presentation contract.
- Preserve existing map aspect-ratio behavior across overview maps and zoomed/focused maps.
- Preserve existing dock placement semantics and map-relative feedback behavior.
- Add/adjust tests only where they protect meaningful expanded-presentation behavior.

No persistence or data-model changes are required.

## Interaction and states

### Expanded

The visual hierarchy is:

```text
[ global app header — remains visible ]

[ compact task/context ]
[                         ]
[          MAP            ]   <- fit within both width and remaining viewport height
[                         ]
[ task/answer dock ]
```

The `Today / Drill / Recite` activity selector is absent while expanded.

The map should receive as much useful area as possible after accounting for UI that intentionally remains visible. Sizing must treat the remaining viewport height as a real constraint, not merely apply a large independent `dvh` maximum while still forcing `width: 100%`.

A correct implementation therefore behaves conceptually as **contain** sizing:

1. determine the maximum space available to the expanded map/task presentation;
2. preserve the SVG's current aspect ratio;
3. scale until either maximum width or maximum usable height is reached;
4. do not exceed the other dimension;
5. center the resulting map when it cannot consume the full width.

Exact CSS values are implementation details. Do not encode a fixed map height that only works for one viewport size.

### Collapse / lifecycle

- Collapse restores the header and rails already published by their owners; do not reconstruct workflow state.
- Switching activity or leaving the owning map surface still clears expanded state through the existing lifecycle.
- Crossing below `xl` still forces a safe return to standard presentation.
- Expansion/collapse must not reset input focus/state beyond unavoidable layout movement.

## Architecture constraints

- Follow ADR 0028 and the current `SYSTEM.md` PageLayout contract.
- `PageLayout` remains the owner of generic page geometry and presentation of registered rails/header chrome.
- `PageLayout` must remain unaware of World Countries, `Today`, `Drill`, `Recite`, or maps. It suppresses the **registered layout header generically** because expanded-center is a focused center presentation.
- `WorldCountries.tsx` continues to own and publish its activity header. Do not add map-expansion state to the World Countries shell merely to hide the tabs.
- `MapSurface.tsx` remains the World Countries owner of the expand/collapse affordance and publication of `expanded-center`.
- Map sizing remains presentation behavior. Do not modify Country identity, map assets, geography adapters, SVG interaction semantics, answer behavior, persistence, proficiency, scheduling, or workflow state.
- Do not create browser fullscreen, a portal, a second mounted map, a modal, a duplicate map component, or per-workflow expansion logic.

## Existing capabilities to reuse

- `src/app/layout/PageLayout.tsx` — existing authority for center width, rails, registered header presentation, and expanded-center geometry.
- `src/app/layout/PageLayoutContext.tsx` — existing standard/expanded-center publication contract and registered header seam.
- `src/features/world-countries/ui/MapSurface.tsx` — existing common World Countries expand/collapse owner.
- `src/features/world-countries/maps/SvgMapView.tsx` — existing shared SVG host.
- `src/features/world-countries/maps/SvgMapController.ts` — already keeps the rendered SVG aspect ratio synchronized with its active viewBox, including focused/zoomed maps.
- `src/app/index.css` — existing standard and expanded SVG sizing rules.
- `src/features/world-countries/WorldCountries.tsx` — existing publisher of the `Today / Drill / Recite` layout header; its activity ownership/state should remain unchanged.

## Edge cases

- Wide-but-short desktop viewport: height becomes the limiting dimension; the map stays centered and does not create page scroll.
- Tall-but-narrow `xl+` viewport: width may remain the limiting dimension; normal aspect-ratio scaling applies.
- A zoomed/focused SVG viewBox with a different aspect ratio must still fit correctly without distortion.
- Overlay, attached, and stacked task docks must retain their existing semantics. Expanded sizing must not hide an essential dock action below the viewport as a consequence of making the map too tall.
- Map feedback overlays remain relative to the displayed map and centered as before.
- The global sticky application header remains visible and must be included in the practical vertical-space budget.
- The activity selected before expansion remains selected after collapse.
- Normal standard presentation must remain visually unchanged.

## Out of scope

- Hiding the global application header.
- Browser Fullscreen API.
- Persisting expanded state.
- Changing the World Countries activity navigation design in standard mode.
- Changing rail content or rail semantics.
- Changing map data/assets, tiny-country assistance, map colors, labels, zoom behavior, answer workflows, or scoring.
- Mobile/tablet expansion redesign below `xl`.

## Acceptance criteria

- [ ] At `xl+`, expanding a World Countries `MapSurface` hides both PageLayout rails and the registered World Countries `Today / Drill / Recite` activity header.
- [ ] The global application header remains visible while the map is expanded.
- [ ] Collapsing restores the activity header and rails already published for the current view without changing the selected activity.
- [ ] Expanded map sizing is constrained by both available width and usable viewport height; whichever limit is reached first determines displayed map size.
- [ ] A wide-but-short desktop viewport does not make the map continue growing from width alone and thereby force vertical page scrolling.
- [ ] Expanding the map does not itself introduce vertical page scrolling on ordinary `xl+` desktop viewports.
- [ ] The expanded map preserves the current SVG/viewBox aspect ratio and is not stretched.
- [ ] When height limits map size before width, the displayed map is horizontally centered rather than stretched to full width.
- [ ] The collapse control and required task-dock actions remain reachable without scrolling caused by expansion.
- [ ] Existing map instance, prompt, typed draft, feedback lifecycle, current task/session state, and map load state survive expand/collapse.
- [ ] Crossing below `xl` safely returns to standard presentation.
- [ ] Standard non-expanded World Countries presentation is unchanged.
- [ ] `PageLayout` contains no World Countries/activity-specific conditionals; header suppression is generic expanded-center behavior.
- [ ] No Today/Drill/Recite workflow introduces its own expansion or viewport-sizing state.
- [ ] Existing meaningful `PageLayout` and `MapSurface` tests remain green.
- [ ] Add/update a PageLayout presentation test proving registered header suppression in expanded-center and restoration after collapse.
- [ ] Do not add brittle tests for exact CSS pixel values; verify viewport-fit behavior through direct/manual responsive checks if DOM layout simulation cannot establish it meaningfully.

## Source anchors

- `src/app/layout/PageLayout.tsx`
- `src/app/layout/PageLayoutContext.tsx`
- `src/app/layout/PageLayoutContext.test.tsx`
- `src/app/index.css`
- `src/features/world-countries/WorldCountries.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/MapSurface.test.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`

## Documentation impact

This change conforms to the existing architecture and ADR 0028. Update current-state architecture only if implementation changes the documented generic expanded-center contract. If the implemented behavior makes the current description incomplete, amend:

- `docs/architecture/SYSTEM.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`

Do not create a new ADR unless implementation requires a new durable architectural choice beyond this spec.

## Verification

Complete when marking the spec `Implemented`.

Expected verification scope:

```text
npx vitest run src/app/layout/PageLayoutContext.test.tsx
npx vitest run src/features/world-countries/ui/MapSurface.test.tsx
npm run typecheck
```

Automated implementation verification completed on 2026-08-22: the focused
PageLayout and MapSurface suites, full repository suite (115 files, 557 tests),
and typecheck all pass. Manual responsive checks could not run in this
environment because no browser surface was available.

Also manually verify at `xl+` with at least:

- a wide/short desktop viewport where height is the limiting dimension;
- a more typical desktop viewport where width can be the limiting dimension;
- expand -> collapse restoration of `Today / Drill / Recite` and rails;
- viewport resize from expanded `xl+` to below `xl`.
