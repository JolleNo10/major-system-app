# Change Spec 0033 - Correct expanded Drill map camera fit and compact fullscreen composition

- **Status:** Draft
- **Date:** 2026-08-24
- **Issue:** None.
- **Related ADRs:** [ADR 0028 - PageLayout owns an optional expanded-center presentation](../adr/0028-page-layout-expanded-center-presentation.md)
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md), [System](../architecture/SYSTEM.md)
- **Related changes:** [Change Spec 0020](0020-world-countries-expanded-map-and-tiny-country-targets.md), [Change Spec 0027](0027-world-countries-expanded-map-viewport-fit.md)
- **Failed implementation baseline:** commit `dc699a16` (`Change Spec 0033: fix expanded Drill map fit and progress dock`)

## Goal

Finish the existing expanded World Countries Drill presentation after manual verification exposed three defects:

1. expanded mode resized the SVG element but did **not** recompute the geographic camera/viewBox for the differently shaped fullscreen map slot;
2. the new answer/progress row stretched across almost the entire viewport and regressed the previously compact answer UI;
3. expanded Drill context consumed too much vertical space with four separate text rows.

The corrected experience must preserve the existing `expanded-center` architecture, preserve Drill/map state across expand/collapse, and use fullscreen space primarily for the map.

## User-visible behavior

### Expanded map camera

Entering expanded mode must visibly refit the map to the actual expanded map slot.

The learner must see the same semantic geographic target as before expansion, but the concrete SVG `viewBox` may and normally will change because the expanded map slot has a different width/height ratio.

Examples:

- a subregion remains the same subregion, but the camera may show additional context to the left/right on a wide fullscreen viewport;
- a focused Country remains the same focused Country, but the camera may show additional context around it to match the expanded slot;
- an Oceania/global/source-map view remains fully contained; fullscreen must not clip source content merely because the viewport is wider than the source viewBox.

Expansion must never stretch Country geometry.

### Compact expanded task context

The normal Drill context may keep its existing richer presentation.

Expanded Drill must use at most **two visual rows** above the map:

1. compact task identity, combining answer kind and recall direction on one row;
2. the main question/cue.

The explanatory helper sentence used by Location -> Country and similar modes is omitted while expanded.

Representative expanded presentation:

```text
ANSWER · COUNTRY  ·  LOCATION -> COUNTRY
Which country is this?
```

Other Drill modes follow the same compact principle while retaining the information required to answer:

```text
ANSWER · COUNTRY  ·  CAPITAL -> COUNTRY
Paris — Which country has this capital?
```

```text
ANSWER · CAPITAL  ·  COUNTRY -> CAPITAL
France — What is the capital?
```

Exact punctuation is presentation detail. The invariant is no more than two visual rows and no loss of the actual task cue.

### Compact answer + progress row

The bottom area remains one horizontal row in expanded Drill:

```text
            [ compact answer/task dock ] [ compact progress ]
```

The answer dock must retain approximately the compact width it had before the first 0033 implementation. Adding progress must widen the **combined row only enough to accommodate the progress panel**; it must not stretch the answer form nearly edge-to-edge across the viewport.

For typed recall:

- primary answer panel remains the dominant panel;
- progress is a compact companion on the right;
- both panels align top and bottom and have the same outer row height;
- there is deliberate spacing between map and row;
- the combined row is centered and bounded;
- the progress panel visually belongs to the same UI family as the answer dock.

The progress content remains:

- `Country X / N`;
- the existing Drill step-progress bar.

Do not add `Exit Drill`, mnemonic controls, geography selection, or other rail content to the expanded companion.

## Scope

- Correct the geographic camera/viewBox fit in expanded World Countries maps.
- Preserve semantic zoom target while allowing presentation-derived viewBox changes.
- Recompute the expanded camera when the available map slot changes.
- Preserve existing standard/non-expanded map framing behavior.
- Preserve the same mounted map/controller and current Drill state across expansion changes.
- Correct the 0033 bottom-row regression by restoring a centered, bounded answer/progress composition.
- Add/use a generic expanded-context seam so Drill can supply a compact two-row context without teaching `MapSurface` Drill semantics.
- Keep shared Drill progress derivation introduced by the first 0033 implementation.
- Update tests and current-state documentation where needed.

No persistence, scoring, scheduling, Country data, recall-target, answer-matching, retry, or proficiency changes are required.

## Interaction and states

### 1. Semantic zoom target versus concrete viewBox

The first 0033 implementation treated the current concrete SVG/viewBox as effectively authoritative during expansion. That assumption is incorrect.

The corrected authority model is:

```text
semantic zoom target + padding + presentation/map-slot aspect ratio
                              ↓
                    concrete rendered viewBox
```

The semantic target is stable across expansion:

- same `zoomIds`;
- same Country visibility;
- same active Country;
- same task target;
- same highlights/names;
- same map asset.

The concrete `viewBox` is presentation-derived and may change when the map slot aspect ratio changes.

### 2. Standard framing remains unchanged

Outside expanded mode, preserve current behavior:

- `zoomIds.length > 0`: existing tight Country-bounds framing with normal padding;
- no explicit zoom IDs: existing source/original viewBox.

Do not globally replace standard map framing with viewport-aspect fitting.

### 3. Expanded viewport-aware framing

When expanded, derive a viewBox that contains the full semantic target and matches the actual available map-slot aspect ratio.

#### Target bounds

For explicit `zoomIds`:

1. derive Country geometry bounds from the requested IDs;
2. apply the existing semantic zoom padding;
3. treat those padded bounds as the minimum target rectangle.

For no explicit `zoomIds` / source view:

1. treat the original source viewBox as the minimum target rectangle.

#### Fit algorithm

Given minimum target rectangle:

```text
target = { x, y, width, height }
targetCenter = center(target)
slotAspect = availableMapWidth / availableMapHeight
targetAspect = target.width / target.height
```

Then expand, never shrink, the target rectangle to match `slotAspect`:

- if `slotAspect > targetAspect`, preserve target height and expand width symmetrically;
- if `slotAspect < targetAspect`, preserve target width and expand height symmetrically;
- if effectively equal, keep the target rectangle.

The resulting viewBox:

- contains the entire padded target;
- preserves its center;
- matches the actual map-slot aspect ratio;
- may extend beyond the source viewBox where necessary to preserve content and aspect; that overscan shows map background rather than cropping source content.

Never crop the target to fill the slot.

### 4. Recalculate on presentation/size changes

The active semantic zoom intent must survive after the initial `setZoomArea()` call.

A resize of the actual map slot must cause the concrete viewBox to be recomputed from:

- original Country geometry / original source viewBox;
- original active `zoomIds`;
- original active padding;
- current fit mode (`standard` versus expanded viewport-fit);
- current measured map-slot width/height.

Do **not** derive the next fit from the previously fitted viewBox. Repeated expand/collapse/resize cycles must not accumulate drift or padding.

The current `ResizeObserver` behavior that only calls `render()` is insufficient for an active expanded camera fit.

### 5. Expansion state must reach the map generically

`MapSurface` owns expanded presentation; map code owns SVG camera behavior.

Use a generic presentation seam between them. A suitable design is a feature-local MapSurface presentation context/hook that exposes `standard | expanded` to descendants, or an equivalent generic contract.

Constraints:

- do not add Drill-specific conditions to `MapSurface`, `SvgMapView`, or `SvgMapController`;
- do not inspect `closest('[data-map-surface-presentation=...]')` from the map controller as a hidden DOM dependency;
- do not make Drill directly mutate SVG `viewBox`;
- do not remount/reload the map on expand/collapse.

`SvgMapView`/controller may observe the actual map slot once it knows whether viewport-aware fit is active.

### 6. Actual slot dimensions

The fit ratio must come from the rectangle genuinely available to the map **after** the expanded context and bottom task row are reserved.

Ensure the expanded map host/container has a measurable constrained width and height. The camera calculation must not use the old standard SVG aspect ratio as a substitute for the fullscreen map-slot ratio.

### 7. Compact expanded context

Provide an expanded-only context presentation through a generic MapSurface seam such as `expandedContext`, or an equivalent generic composition.

`MapSurface` chooses standard versus expanded content; Drill supplies both nodes.

Expanded Drill context:

- maximum two visual rows;
- first row combines answer kind + recall direction;
- second row contains the actual prompt/cue;
- helper/explanatory text is omitted;
- no additional activity/navigation chrome is reintroduced.

Standard context is unchanged.

### 8. Compact bottom row

Correct the first 0033 layout regression.

Before 0033, expanded stacked/form docks used a compact centered width (`max-w-2xl` was the established baseline). Preserve that visual scale.

The corrected combined row should conceptually be:

```text
max combined width ≈ previous answer width + compact progress width + gap

             [ previous-sized answer dock ][ progress ]
```

Requirements:

- combined row centered;
- answer dock approximately retains its pre-0033 expanded width rather than filling the viewport;
- companion stays compact, approximately the width needed for `Country X / N` plus progress bar;
- restore deliberate top spacing between map and dock row (`mt-2`/`mt-3` scale);
- preserve reasonable bottom breathing room;
- same-height typed panels via stretch layout, not duplicate fixed pixel heights;
- progress shell uses compatible radius/border/background/shadow treatment with the form dock instead of looking like an unrelated plain card;
- multiple-choice/map-click can grow naturally if their primary task content is taller.

Exact CSS pixel values are not architecture. Visual compactness relative to the pre-0033 dock is the requirement.

## Architecture constraints

Follow ADR 0028 and current World Countries architecture.

- Keep one `expanded-center` mechanism.
- `PageLayout` remains generic page geometry.
- `MapSurface` owns feature-local expansion state and expanded composition.
- `drill/` owns Drill progress semantics and compact Drill task context.
- `maps/` owns geographic bounds, concrete SVG viewBox calculation, and resizing behavior.
- Semantic zoom target is caller-owned; concrete viewBox is map-presentation-derived.
- `CountryLearningMap` continues to resolve Country -> SVG IDs and semantic zoom IDs.
- Do not move Country/Drill knowledge into `SvgMapController`.
- Do not use browser Fullscreen API, a second map, a portal copy, or remount-on-expand.
- Do not change existing standard framing semantics merely to make expanded framing easier.
- Do not use CSS stretching as a substitute for camera fitting.
- Do not infer a new target from the currently fitted viewBox.
- Avoid hard-coded viewport dimensions or Oceania-specific fullscreen branches.

No new ADR is expected. Create one only if implementation discovers a new durable architectural boundary beyond the current `expanded-center` and map-controller ownership model.

## Existing capabilities to reuse

### Map expansion

- `src/features/world-countries/ui/MapSurface.tsx`
- `src/app/layout/PageLayoutContext.tsx`
- `src/app/layout/PageLayout.tsx`

Reuse the existing expansion state and `expanded-center` publication.

### Semantic map zoom

- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`

`CountryLearningMap` already resolves `zoomIds`.

`SvgMapController.setZoomArea()` already owns Country geometry bounds and padding. Extend this ownership so it retains zoom intent and can derive standard versus viewport-aware concrete viewBoxes.

### Resize lifecycle

`SvgMapController` already has a `ResizeObserver`. Extend its behavior rather than creating a polling loop or window-only resize implementation.

### Drill progress

- `src/features/world-countries/drill/drillSessionProgress.ts`
- `src/features/world-countries/drill/DrillSessionProgressPanel.tsx`
- `src/features/world-countries/drill/DrillSessionRails.tsx`

Retain the shared progress derivation introduced by the first 0033 implementation.

### Drill task composition

- `src/features/world-countries/drill/DrillSession.tsx`

This remains the owner of standard and compact expanded Drill context nodes and the Drill-owned progress companion.

## Edge cases

- **Oceania / no explicit zoom IDs:** expanded mode fits the original/source viewBox to the real slot aspect by adding overscan rather than cropping any source content.
- **Wide, short desktop:** viewBox widens around the target; vertical target bounds remain fully visible.
- **Tall, narrower desktop:** viewBox becomes taller around the target; horizontal target bounds remain fully visible.
- **Focused Country shape:** the Country remains the semantic target and fully visible after expansion.
- **Multipart Country:** all requested geometry remains inside the fitted viewBox.
- **Incorrect Country-for-Shape feedback:** semantic target can change from Country to subregion through ordinary props; each target is fitted using the current presentation.
- **Resize while expanded:** camera recomputes without map reload.
- **Expand -> collapse -> expand:** no camera drift.
- **No ResizeObserver / test environment:** behavior degrades safely and does not crash.
- **Typing:** compact answer and progress panels align to the same row height.
- **Multiple choice / map click:** progress remains beside task content without imposing typed-form fixed dimensions.
- **Standard mode:** existing richer prompt and existing dock size/layout remain unchanged.
- **Below `xl`:** existing responsive collapse behavior remains unchanged.

## Out of scope

- New Drill modes or answer semantics.
- Changing which Countries are in a geographic scope.
- Changing normal semantic zoom targets or zoom padding values.
- Persisting expanded state.
- Browser fullscreen.
- Redesigning standard Drill rails.
- Moving rail actions into expanded mode.
- New progress metrics.
- Map asset edits.
- Tiny-Country anchor/synthetic-dot changes.
- Mobile/tablet expansion redesign.

## Acceptance criteria

### Camera fit

- [ ] Expanded mode recomputes the concrete map `viewBox` for the actual expanded map-slot aspect ratio.
- [ ] The semantic `zoomIds`/target remains unchanged solely because the user expanded or collapsed the map.
- [ ] For explicit zoom IDs, the expanded viewBox contains the full Country geometry bounds plus configured zoom padding.
- [ ] For no explicit zoom IDs, the expanded viewBox contains the full original/source viewBox.
- [ ] Wide slots expand the viewBox horizontally around the target center instead of cropping top/bottom.
- [ ] Tall/narrow slots expand the viewBox vertically around the target center instead of cropping left/right.
- [ ] Country geometry is never stretched.
- [ ] Resize while expanded recomputes the fit from semantic target/original geometry, not from the previously fitted viewBox.
- [ ] Expand/collapse/resize cycles do not accumulate camera drift.
- [ ] Collapse restores the existing standard tight/source framing behavior.
- [ ] The map/controller is not remounted or reloaded during expand/collapse.
- [ ] Oceania/source-view fullscreen keeps all source content visible.

### Expanded UI

- [ ] Expanded Drill context uses at most two visual rows.
- [ ] Answer kind and recall direction share one compact row.
- [ ] The actual task question/cue remains visible.
- [ ] Expanded helper/explanatory sentences are omitted.
- [ ] Standard context remains unchanged.
- [ ] The answer/progress row is centered and bounded rather than viewport-wide.
- [ ] Typed answer dock retains approximately its pre-0033 compact expanded width.
- [ ] Progress is a compact right-side companion.
- [ ] Typed answer and progress panels align to the same outer height.
- [ ] There is deliberate spacing between map and bottom row.
- [ ] Progress styling visually matches the answer-dock family.
- [ ] `Country X / N` and the existing step-progress bar remain correct.
- [ ] Multiple-choice and map-click expanded task layouts remain usable.

### Tests and regression

- [ ] Pure tests cover target-rectangle fitting for wider, taller, and equal aspect ratios.
- [ ] Tests prove fitted rectangles contain the complete padded target and preserve center.
- [ ] Tests prove repeated recalculation uses stable source/geometry bounds and does not drift.
- [ ] Controller/view tests cover resize-driven refit of active zoom intent.
- [ ] Tests cover the no-explicit-zoom/source-view expanded case.
- [ ] MapSurface/Drill tests cover standard versus compact expanded context.
- [ ] Drill tests cover compact progress companion presence without duplicating rail semantics.
- [ ] Existing World Countries tests remain green.
- [ ] Manual browser verification passes before status becomes `Implemented`.

## Source anchors

- `src/app/index.css`
- `src/app/layout/PageLayout.tsx`
- `src/app/layout/PageLayoutContext.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/MapSurface.test.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapController.test.ts`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSession.test.tsx`
- `src/features/world-countries/drill/drillSessionProgress.ts`
- `src/features/world-countries/drill/DrillSessionProgressPanel.tsx`
- `src/features/world-countries/drill/DrillSessionRails.tsx`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/changes/0027-world-countries-expanded-map-viewport-fit.md`
- `docs/adr/0028-page-layout-expanded-center-presentation.md`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` to reflect the corrected current-state rule after implementation:

- semantic zoom target is stable across presentation changes;
- concrete expanded viewBox is fitted to the actual available map-slot aspect ratio;
- standard view uses existing tight/source framing;
- expanded Drill uses compact task context and a compact progress companion beside the task dock.

Update `docs/architecture/SYSTEM.md` only if the generic PageLayout contract itself changes.

## Verification

Do not set this spec to `Implemented` based on automated tests alone.

Expected automated verification:

```text
npx vitest run src/features/world-countries/maps/SvgMapController.test.ts
npx vitest run src/features/world-countries/ui/MapSurface.test.tsx
npx vitest run src/features/world-countries/drill/DrillSession.test.tsx
npx vitest run src/features/world-countries
npm run typecheck
git diff --check
```

Required manual browser verification at `xl+`:

1. Oceania Location -> Country before/after expand:
   - no top/bottom Countries disappear;
   - expanded camera visibly adapts to the wider slot.
2. Normal regional Drill:
   - same semantic target;
   - fullscreen uses available space without clipping.
3. Country-for-Shape:
   - isolated Country fits in standard and expanded;
   - wrong-answer subregion transition also refits correctly.
4. Wide/short viewport:
   - no vertical clipping;
   - camera widens rather than stretching.
5. Expanded typed Drill:
   - maximum two context rows;
   - answer dock is compact, centered, and close to its pre-0033 width;
   - progress sits immediately to its right at the same height;
   - deliberate gap exists below map.
6. Expand -> collapse -> expand:
   - input/task state remains;
   - camera does not drift.
