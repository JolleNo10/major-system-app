# Change Spec 0033 - Correct expanded Drill map fit and keep session progress beside the task dock

- **Status:** Draft (automated verification complete; manual browser verification pending)
- **Date:** 2026-08-24
- **Issue:** None.
- **Related ADRs:** [ADR 0028 - PageLayout owns an optional expanded-center presentation](../adr/0028-page-layout-expanded-center-presentation.md)
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md), `docs/architecture/SYSTEM.md`
- **Related changes:** [Change Spec 0020](0020-world-countries-expanded-map-and-tiny-country-targets.md), [Change Spec 0027](0027-world-countries-expanded-map-viewport-fit.md)

## Goal

Correct the existing World Countries expanded-map presentation so entering expanded mode never causes relevant Countries to disappear because the map is fitted to the expanded container incorrectly. At the same time, keep active Drill session progress visible while expanded by placing a compact progress panel beside the existing task/answer dock rather than over the map.

This is a correction and refinement of the existing `expanded-center` presentation. It must not introduce a second fullscreen mechanism or a Drill-specific map implementation.

## User-visible behavior

At `xl+`, expanding an active World Countries Drill keeps the existing focused presentation but changes two observable details.

First, the map must fit the actual available map area while preserving the active SVG/viewBox aspect ratio. Entering expanded mode must not crop or lose Countries that were visible in the equivalent standard map state. The map may become wider or taller, but it must stop scaling when either available width or available height is exhausted.

Second, Drill session progress remains visible while the rails are hidden. The progress panel belongs on the same bottom row as the task/answer dock, on its right side. It is not a map overlay.

For typed recall, the intended composition is:

```text
[ prompt / task context ]

[                                   ]
[                MAP                ]
[                                   ]

[ answer / task dock                    ] [ Country 2 / 12 ]
[ input + primary action                 ] [ progress bar   ]
```

The answer/task dock remains visually dominant and uses the available width. The progress panel is compact and secondary.

The expanded progress panel shows only session progress needed during the task:

- `Country X / N` using the same Country-position semantics as the existing Drill session rail;
- the existing session progress bar semantics.

Do not label this as `X / N drilled`: in modes such as **Countries + Capitals**, one Country can contain multiple Drill steps, so Country position and completed step progress are related but not identical.

The expanded progress panel does not duplicate `Exit Drill`, mnemonic controls, selected geography, or other rail content.

Collapsing returns to the current standard presentation and the existing right-rail Session panel remains unchanged.

## Scope

- Correct expanded World Countries map sizing so the active SVG/viewBox is contained within the map area rather than being forced into incompatible width/height dimensions.
- Preserve the same mounted map instance, active zoom/viewBox intent, highlight state, task assistance, answer state, and workflow state across expand/collapse.
- Make the expanded layout reserve space for the complete bottom dock row before sizing the map.
- Add a generic World Countries `MapSurface` seam for optional expanded-only companion content beside the existing dock, or an equivalent generic composition owned by `MapSurface`.
- Use that seam from active Drill sessions to show compact session progress on the right of the existing dock while expanded.
- Reuse one Drill-owned session-progress derivation for both the existing rail panel and the expanded progress panel.
- Preserve standard/non-expanded layout and existing rail behavior.
- Cover typing, multiple-choice, and map-click Drill interaction layouts without introducing per-mode expansion implementations.

No persistence, scoring, evidence, geography, or Country data changes are required.

## Interaction and states

### Expanded map fit

Expanded map sizing must behave as true contain sizing against the space that remains after required UI is accounted for.

Conceptually:

1. determine the usable expanded surface below the global application header;
2. reserve the prompt/context height;
3. reserve the bottom dock row height, including the Drill progress companion when present;
4. use the remaining rectangle as the map's maximum box;
5. preserve the active SVG/viewBox aspect ratio;
6. scale the rendered map until width or height reaches the corresponding maximum;
7. center the map in unused space rather than stretching it to both dimensions.

The active map state is authoritative. Expansion must not select different `zoomIds`, reset zoom, recalculate a different geography scope, substitute a different map asset, or remount the SVG merely to make it fit.

A zoomed/focused viewBox may have a very different aspect ratio from the source asset. The expanded presentation must respect the currently active ratio, not assume the original map ratio.

### Drill bottom row

When an active Drill session is expanded, the bottom task area is one row at `xl+`:

- primary region: the existing task/answer dock;
- secondary region: compact Drill session progress.

For typed recall, the progress panel must have the same outer rendered height as the answer form panel and align to the same top and bottom edges. Achieve this through row/stretch composition rather than independent hard-coded heights.

The answer/task dock takes remaining width. The progress panel uses a compact bounded width appropriate for `Country X / N` and the progress bar. Exact pixel width is presentation detail and must remain responsive.

For multiple-choice and map-click Drill interactions, keep progress in the same bottom-row concept beside the existing task dock/instruction when expanded. Do not float progress over the map. If the primary task content naturally grows taller, the companion may stretch with the row; do not impose a global fixed height that harms other answer modes.

Below `xl`, existing behavior remains unchanged and expanded-only companion presentation must not remain active.

### Progress semantics

The current Drill session rail derives:

- total session steps;
- completed steps;
- progress percentage;
- current Country position and Country count.

Those semantics remain the source of truth.

The new expanded panel must not recreate a second interpretation of session progress. Extract or reuse a small Drill-owned pure derivation/model so the rail and expanded panel cannot drift.

The progress bar continues to reflect completed Drill steps. `Country X / N` continues to reflect Country position in the session order.

### Expand/collapse lifecycle

Expansion and collapse are presentation changes only.

They must preserve:

- current Country and skill;
- typed draft/input state;
- feedback lifecycle and timers;
- selected answer mode;
- current map asset;
- map load state;
- active viewBox/zoom intent;
- highlights, names, hidden Countries, and task assistance;
- mnemonic-assisted state;
- Drill session progress.

Crossing below `xl` still returns safely to standard presentation through the existing `MapSurface` lifecycle.

## Architecture constraints

Follow [World Countries](../architecture/features/WORLD_COUNTRIES.md) and [ADR 0028](../adr/0028-page-layout-expanded-center-presentation.md).

- Keep the existing `expanded-center` PageLayout presentation. Do not add another fullscreen/wide-map state.
- `PageLayout` remains generic page geometry. Prefer no PageLayout change unless a genuinely generic expanded-center defect requires one.
- `MapSurface` remains the World Countries owner of expand/collapse and the feature-local expanded task composition.
- `MapSurface` must not learn Drill session semantics. It may accept generic companion/secondary dock content; Drill provides the actual progress node.
- `drill/` owns Drill session-progress semantics and any reusable progress derivation/presentation component.
- `maps/` owns SVG/viewBox behavior. Drill must not manipulate SVG dimensions or viewBox directly to work around presentation sizing.
- `SvgMapController` already synchronizes an inline aspect ratio with its active viewBox. Preserve that authority; do not replace it with workflow-specific dimensions.
- Do not infer or change Country visibility/zoom because the surface expanded. Visibility and zoom remain caller-owned task semantics.
- Do not duplicate the map, render a portal copy, use the browser Fullscreen API, or remount the map on expand/collapse.
- Do not change evidence, proficiency, scheduling, retry, result, answer-matching, or persistence behavior.
- Avoid hard-coded viewport/map dimensions that only fit a particular desktop resolution or one regional asset.

No new ADR is expected. Create one only if implementation discovers a new durable architecture decision beyond the existing expanded-center and MapSurface ownership contracts.

## Existing capabilities to reuse

### Expanded-center page presentation

- `src/app/layout/PageLayoutContext.tsx`
- `src/app/layout/PageLayout.tsx`

These already own the standard versus `expanded-center` page presentation and suppression of rails/header chrome.

### World Countries expanded surface

- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/MapSurface.test.tsx`
- `src/app/index.css`

`MapSurface` already owns the one expand/collapse control, keeps the same map/dock mounted, and publishes the existing expanded presentation. Extend this seam rather than adding Drill-local fullscreen state.

### SVG map sizing and active viewBox

- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`

`SvgMapController` owns `setZoomArea`, `resetZoom`, `setViewBox`, and aspect-ratio synchronization for the active viewBox. Expanded presentation should fit that state rather than alter its geographic meaning.

### Learning/Drill map adapter

- `src/features/world-countries/learning/CountryLearningMap.tsx`

This already resolves scope, explicit zoom, hidden Countries, task assistance, and map definitions. Do not add expanded-mode geography branching here unless a generic map-sizing seam genuinely requires it.

### Drill session progress

- `src/features/world-countries/drill/DrillSessionRails.tsx`
- `src/features/world-countries/drill/drillSessionState.ts`
- `src/features/world-countries/drill/drillModes.ts`

The current right rail already computes the progress values shown in the supplied Session panel. Reuse those semantics and centralize the derivation if needed.

### Active Drill task composition

- `src/features/world-countries/drill/DrillSession.tsx`

This already composes rails, `MapSurface`, map state, typed/multiple-choice/map-click interactions, and task docks. It should supply Drill-owned progress to the generic expanded companion seam.

## Edge cases

- **Oceania regional map:** expanding must not cause Countries at the edges or across the scattered region to disappear due to container sizing.
- **Wide, short viewport:** height limits the map; the map stays centered and all intended visible geography remains visible.
- **Tall, narrower `xl+` viewport:** width may limit the map; the map remains contained.
- **Focused Country shape:** an explicitly zoomed Country/viewBox remains fully visible after expand and collapse.
- **Incorrect Country-for-Shape feedback:** the transition from isolated Country to subregion context remains geographically correct and fits expanded mode without remounting.
- **Countries + Capitals:** Country count and step-progress bar remain semantically distinct and correct.
- **First Country:** progress is valid at session start and does not require a fake non-zero completed step.
- **Last Country / final skill:** progress updates normally through the final task and completion transition.
- **Typing:** progress panel exactly matches the form dock's outer row height.
- **Multiple choice:** a taller primary task area does not force a brittle fixed-height layout.
- **Map click:** progress remains available without covering selectable map geography.
- **Feedback overlays:** remain centered relative to the displayed map and do not collide with the bottom progress panel.
- **Collapse:** standard rail Session panel and standard 42rem center return without duplicated progress UI in the center.
- **Below `xl`:** current responsive/drawer behavior remains unchanged.

## Out of scope

- Browser Fullscreen API.
- Hiding the global application header.
- Redesigning Drill session rails in standard mode.
- Moving `Exit Drill` or mnemonic controls into expanded mode.
- Adding new Drill progress metrics or changing current progress semantics.
- Changing Drill mode definitions, session order, scoring, evidence, proficiency, Retry Failed Countries, or results.
- Changing Country map assets, Country-to-SVG mappings, synthetic dots, learning anchors, pointer intent, colors, or labels.
- Changing mobile/tablet expansion behavior below `xl`.
- Generalizing a new app-wide dock framework when the World Countries `MapSurface` seam is sufficient.

## Acceptance criteria

- [ ] Expanding an active World Countries Drill at `xl+` uses the existing `expanded-center` presentation; no second fullscreen mechanism is introduced.
- [ ] The same mounted map instance and current workflow/task state survive expand and collapse.
- [ ] Expanded map sizing preserves the active SVG/viewBox aspect ratio and never forces incompatible full width plus full height dimensions that can crop relevant geography.
- [ ] The rendered map is bounded by both available width and available height after prompt/context and the complete bottom dock row are reserved.
- [ ] When height is the limiting dimension, the map stops growing and remains horizontally centered.
- [ ] When width is the limiting dimension, the map remains vertically contained in the available map area.
- [ ] Countries intended to be visible before expansion remain visible after expansion for representative regional maps, including Oceania.
- [ ] Explicitly focused/zoomed Country views remain fully visible and keep their existing geographic zoom semantics after expansion.
- [ ] Expansion does not reset zoom, alter `zoomIds`, alter hidden/visible Country semantics, or remount/reload the SVG.
- [ ] Active Drill expanded mode shows a compact session-progress panel on the same bottom row as the existing task/answer dock.
- [ ] The progress panel is to the right of the primary dock and never overlays the map.
- [ ] In typed recall, the progress panel and answer form panel have the same outer rendered height and aligned top/bottom edges without independent fixed heights.
- [ ] The primary task/answer dock remains the dominant flexible-width panel; progress remains compact and secondary.
- [ ] Expanded progress shows `Country X / N` and the existing step-progress bar semantics.
- [ ] Expanded progress does not duplicate `Exit Drill`, mnemonic controls, selected geography, or other rail-only content.
- [ ] Rail and expanded progress use one Drill-owned derivation/model rather than duplicated progress formulas.
- [ ] Countries + Capitals correctly distinguishes Country position from completed step percentage.
- [ ] Multiple-choice and map-click Drill sessions retain usable bottom task composition and visible progress while expanded.
- [ ] The bottom row's height is included in map-fit calculations so adding progress cannot push required controls outside the viewport or steal already-allocated map space.
- [ ] Feedback overlays remain map-relative and reachable controls remain visible without expansion-induced page scrolling on ordinary desktop viewports.
- [ ] Collapsing restores the existing standard layout and right-rail Session panel without changing Drill state.
- [ ] Crossing below `xl` safely returns to current standard responsive behavior.
- [ ] Standard non-expanded World Countries presentation remains unchanged.
- [ ] Focused tests protect MapSurface expanded companion composition, Drill progress derivation, and Drill integration without brittle exact-pixel assertions in jsdom.
- [ ] Manual browser verification covers Oceania, a normal regional map, an explicitly focused Country shape, and a wide/short viewport.

## Source anchors

- `src/app/index.css`
- `src/app/layout/PageLayout.tsx`
- `src/app/layout/PageLayoutContext.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/MapSurface.test.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSession.test.tsx`
- `src/features/world-countries/drill/DrillSessionRails.tsx`
- `src/features/world-countries/drill/drillSessionState.ts`
- `src/features/world-countries/drill/drillModes.ts`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/changes/0027-world-countries-expanded-map-viewport-fit.md`
- `docs/adr/0028-page-layout-expanded-center-presentation.md`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` if needed so current-state documentation explicitly reflects the resulting expanded Drill behavior:

- the active map is contained by the remaining viewport while preserving active viewBox aspect ratio;
- expanded Drill may provide a compact secondary progress companion beside the task dock;
- Drill owns progress semantics while `MapSurface` owns generic expanded dock composition.

Update `docs/architecture/SYSTEM.md` only if implementation changes the generic `PageLayout` / `expanded-center` contract. Prefer keeping this correction within the documented `MapSurface` ownership boundary.

No new ADR is required unless implementation discovers a new durable architectural decision.

## Verification

Expected progressive verification:

```text
npx vitest run src/features/world-countries/ui/MapSurface.test.tsx
npx vitest run src/features/world-countries/drill/DrillSession.test.tsx
npx vitest run src/features/world-countries
npm run typecheck
```

Also manually verify at `xl+`:

- normal regional Drill map before/after expand;
- Oceania before/after expand;
- Country-for-Shape focused Country before/after expand and incorrect-feedback transition;
- typed Drill bottom row with answer form + same-height progress panel;
- multiple-choice Drill bottom row;
- map-click Drill bottom row;
- wide/short desktop viewport where height is limiting;
- expand -> collapse state preservation;
- resize from expanded `xl+` to below `xl`.

Automated verification completed on 2026-08-24:

- `npx vitest run src/features/world-countries/ui/MapSurface.test.tsx` — 3 tests passed.
- `npx vitest run src/features/world-countries/drill/DrillSession.test.tsx` — 23 tests passed.
- `npx vitest run src/features/world-countries` — 89 files / 410 tests passed.
- `npm run typecheck` — passed.
- Existing `SvgMapController` coverage within the feature suite passed, including active viewBox and aspect-ratio synchronization.

Manual browser verification is still pending: this environment has no browser
binary or browser surface, so the responsive `xl+` matrix (including Oceania,
Country-for-Shape, wide/short viewports, and resize below `xl`) could not be
performed honestly. Keep the Change Spec status as Draft until that matrix is
completed in a browser.
