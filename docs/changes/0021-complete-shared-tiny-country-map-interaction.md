# Change Spec 0021 - Complete shared tiny-Country map interaction

- **Status:** Superseded
- **Date:** 2026-08-22
- **Issue:** None.
- **Related ADRs:** None required.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)
- **Corrects:** [Change Spec 0020](0020-world-countries-expanded-map-and-tiny-country-targets.md), tiny-Country behavior only.
- **Superseded by:** [Change Spec 0023](0023-correct-tiny-country-task-assistance.md), which corrects the tiny-Country activation model while preserving the expanded-map work.

## Goal

Complete the tiny/dot-like Country behavior introduced by Change Spec 0020 so it is a property of the shared SVG map capability rather than an accidental behavior of particular workflows or map scales.

Two distinct generic behaviors are required:

1. **Selectable tiny Countries** must remain easy to click anywhere World Countries exposes Country-click interaction.
2. **Explicitly highlighted tiny Countries** must become visibly larger for the duration of the highlight, then return to their normal tiny-marker size when that highlight moves or clears.

Do not solve either requirement inside Today, Drill, Practice, Learning, Recite, or individual question components.

## User-visible behavior

### Selectable tiny Countries

Whenever a World Countries map allows the user to click Countries, tiny/dot-like Countries receive the same forgiving interaction behavior regardless of which workflow owns the click.

This includes the current click-capable paths, without creating per-path implementations:

- Drill location-click questions;
- Learn & Practise -> `Locate Countries`;
- Learn & Practise -> `Locate Capitals`;
- guided Learning location practice;
- Country-click behavior exposed through `GeographyOverviewMap` for navigation/selection;
- any future World Countries consumer that uses the existing generic Country-click map seam.

For a "find/locate X" question, the correct tiny Country must **not** receive special pre-answer emphasis merely because it is the expected answer. All selectable tiny Countries use the same normal tiny-marker treatment until the workflow explicitly highlights a Country through existing map presentation state.

The forgiving target must:

- be materially easier to hit than the original SVG dot/path;
- dispatch exactly the same Country identity/callback as the source path;
- preserve the existing nearest/intended-Country behavior when tiny targets overlap;
- never make a neighboring normal Country unreachable when the pointer is actually inside that Country's source geometry;
- disappear or become non-interactive whenever the source Country is hidden or excluded from interaction.

### Explicitly highlighted tiny Countries

A tiny Country that the map is intentionally highlighting must receive stronger **visible** emphasis for as long as that generic highlight is active.

Examples include:

- `Which country is this?` / Location -> Country recall, where the location is deliberately shown but the Country name is hidden;
- Today Location -> Country review;
- Drill Location -> Country recall;
- post-answer feedback in Locate Country / Locate Capital practice where the expected Country is deliberately highlighted;
- any other current or future caller using the same generic Country highlight presentation.

Required behavior:

- the tiny marker is visibly larger than its normal tiny-marker rest size while highlighted;
- the existing semantic highlight color/stroke remains authoritative;
- highlighting a tiny Country does not by itself reveal its text label; existing name-visibility rules remain authoritative;
- changing the highlighted Country removes the prior marker emphasis and applies it to the new one;
- clearing the highlight returns the marker to normal rest size;
- hover may add a small additional pop/ring on top of highlighted emphasis, but the two states must compose predictably;
- there is no continuous pulse;
- reduced-motion keeps the larger highlighted size but removes nonessential animated scaling.

A short transition into/out of highlighted size is allowed. The important state is persistent size emphasis for the full highlight duration, not a one-time animation.

## Scope

- Correct the shared tiny-Country detection/sizing behavior in the SVG map layer.
- Make forgiving interaction size stable in **rendered screen space**, not dependent on one SVG asset's coordinate scale.
- Make generic Country highlight state affect tiny-marker visible size.
- Verify all current Country-click paths inherit the correction through existing map adapters.
- Update World Countries current-state architecture to describe the completed tiny-marker contract.
- Preserve Change Spec 0020 expanded-map behavior unchanged.

## Interaction and states

### Screen-space invariant

The current implementation uses fixed SVG user-unit thresholds/radii. That is insufficient because World, Continent, zoomed, standard, and expanded maps render different SVG coordinate ranges at different CSS sizes.

The completed behavior must be defined by the **rendered result**:

- a Country whose source geometry is visually tiny at the current rendered scale is eligible for tiny-marker augmentation;
- the forgiving hit target maintains a useful minimum pointer size in CSS/screen pixels across different bundled SVG viewBoxes, zoom states, container sizes, and expanded/standard presentation;
- visible marker sizing likewise remains legible across those presentation changes;
- resizing or a map viewBox/zoom change must not leave stale interaction geometry.

Implementation may convert desired screen-space sizes into SVG user units or use another SVG-safe technique. The required invariant is the rendered size, not a specific calculation method.

Target tuning guidance:

- aim for roughly a **24 px minimum pointer diameter** for a tiny Country on desktop;
- normal visible marker should remain modest, roughly **6-8 px diameter** where augmentation is required;
- highlighted tiny marker should be clearly larger than rest, roughly **10-12 px diameter** as a starting visual target;
- dense microstate/island clusters may require bounded tuning, but overlap must be solved by deterministic pointer resolution rather than by making the feature ineffective.

These are usability targets, not persisted/configurable values.

### Recalculation lifecycle

Tiny-marker/hit geometry must remain correct after all presentation changes that alter screen scale, including:

- initial SVG load;
- `setZoomArea` / reset zoom / viewBox changes;
- container resize;
- standard <-> expanded `MapSurface` presentation;
- ordinary responsive viewport resizing.

Do not remount the SVG merely to refresh tiny targets.

### Highlight versus answer knowledge

Map-layer code must never infer the current correct answer.

Correct:

```text
workflow chooses generic highlighted Country IDs
        -> shared map presentation
        -> tiny marker receives highlighted visual size
```

Incorrect:

```text
Locate Countries mode
        -> map guesses expected Country
        -> special target marker
```

In locate/click questions before feedback, the expected answer is intentionally not highlighted, so it receives only the same normal tiny-marker treatment as other selectable tiny Countries.

## Architecture constraints

- `src/features/world-countries/maps/SvgMapController.ts` remains the **single owner** of tiny-geometry augmentation, rendered marker sizing, forgiving pointer targets, overlap resolution, and the composition of rest/hover/highlight tiny-marker states.
- `src/features/world-countries/maps/SvgMapView.tsx` remains the declarative React adapter. It may carry only generic map presentation state.
- `CountryLearningMap` and `GeographyOverviewMap` remain workflow-neutral Country/SVG adapters.
- Prefer the existing generic `highlightedIds` / highlighted-Country state as the signal for persistent tiny-marker emphasis. Introduce a separate generic emphasis signal only if implementation proves that highlighted semantics cannot represent this cleanly without changing unrelated behavior.
- If a new generic signal is necessary, it must describe presentation (`emphasizedIds` or equivalent), not workflow intent (`questionTarget`, `locateCountry`, `correctCountry`, etc.).
- Do **not** add tiny-Country code, Country-ID exceptions, marker CSS, hit-radius logic, or resize calculations to Today, Drill, Practice, Learning, Recite, `SchedulerLocationPracticeStep`, or other workflow components.
- Do **not** hard-code Andorra, Monaco, Vatican City, island states, or any other Country list. Eligibility remains geometry/rendering derived.
- Source Country paths remain authoritative for identity, semantic styling, discovery, geographic bounds, and zoom calculations. Generated marker/hit geometry must not contaminate map bounds.
- Preserve existing hidden, hoverable, muted, colored, highlighted, hover-group, label, and accessible-description semantics.
- No persistence, scoring, evidence, scheduling, Country identity, or answer-matching changes.

## Existing capabilities to reuse

- `src/features/world-countries/maps/SvgMapController.ts` - existing central Country discovery, visual state, hover/click routing, zoom, and first-generation tiny-target implementation.
- `src/features/world-countries/maps/SvgMapView.tsx` - existing declarative controller adapter and generic `highlightedIds` / click callback seam.
- `src/features/world-countries/learning/CountryLearningMap.tsx` - shared Country-learning/recall map adapter used across Drill, Practice, Learning, Today, and Recite-related map presentation.
- `src/features/world-countries/maps/GeographyOverviewMap.tsx` - shared overview/navigation/selection map adapter.
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx` - shared Learning map host that allows location-practice phases to change presentation without remounting the map.

## Edge cases

- A tiny Country close to another tiny Country: nearest intended marker wins deterministically.
- A tiny Country halo overlapping a normal Country: an actual pointer hit inside the normal Country source geometry wins over the halo.
- A highlighted tiny Country is also hovered: highlighted size is the persistent base state; hover adds only bounded temporary emphasis and leaving hover returns to highlighted size, not ordinary rest size.
- A highlighted Country changes while feedback/question transitions occur: the old marker returns to rest and the new marker receives highlight emphasis without stale state.
- A highlighted tiny Country is hidden: hidden state wins; no marker or hit target remains visible/interactive.
- A map is visible but intentionally non-interactive: tiny markers may remain visually legible, but no ghost Country click target may become active.
- Zooming into a Subregion must not cause a previously sensible halo to become enormous in screen pixels.
- Expanding the common map surface must not make a tiny target too small because its SVG-user-unit radius was calculated for the former layout.
- Reduced-motion affects animation only, not marker legibility, highlighted size, or hit area.

## Out of scope

- Redrawing or editing bundled SVG geography assets.
- Hard-coded per-Country marker configuration.
- Changing map zoom scopes.
- New answer modes.
- Browser fullscreen/expanded-map redesign.
- Touch-specific redesign of all map interactions.
- New labels or callouts for microstates.
- Continuous pulse/beacon animations.

## Acceptance criteria

### Shared ownership

- [x] There is one tiny-Country implementation in the shared map layer; no workflow contains its own tiny-Country size/hit logic.
- [x] Current Country-click consumers continue to use `CountryLearningMap` / `GeographyOverviewMap` -> `SvgMapView` -> `SvgMapController`; no parallel click implementation is added.
- [x] No hard-coded Country IDs are used to decide augmentation.

### Rendered-size behavior

- [x] Tiny eligibility and/or generated sizing produces a stable minimum **screen-space** interaction target rather than relying only on fixed SVG user-unit thresholds/radii.
- [x] Tests demonstrate equivalent usable hit size for the same tiny source geometry rendered at materially different SVG/container scales.
- [x] Tests demonstrate hit/marker sizing remains correct after viewBox/zoom changes.
- [x] Tests demonstrate sizing is refreshed after container/presentation resize without remounting the SVG.
- [x] Generated augmentation remains excluded from geography/zoom bounds.

### Country-click behavior

- [x] `Locate Countries` can select tiny Countries through the shared forgiving target.
- [x] `Locate Capitals` can select tiny Countries through the same shared forgiving target.
- [x] Guided Learning location practice can select tiny Countries through the same shared forgiving target.
- [x] Drill location-click uses the same shared path.
- [x] `GeographyOverviewMap` Country clicks/navigation/selection inherit the same behavior when Countries are interactive.
- [x] No locate/click workflow highlights the expected Country before answer merely to make its tiny hit target work.
- [x] Overlapping tiny targets resolve deterministically by intended/nearest pointer location and do not steal direct source-geometry hits from neighboring Countries.
- [x] One pointer activation produces one Country callback.

### Highlighted tiny-Country behavior

- [x] A tiny Country in generic highlighted state renders visibly larger than its ordinary tiny-marker rest state.
- [x] Clearing highlight restores ordinary rest size.
- [x] Moving highlight from one tiny Country to another restores the first and emphasizes the second.
- [x] Hovering a highlighted tiny Country may increase it further, and pointer leave returns to highlighted size rather than ordinary rest size.
- [x] Highlight size follows the Country's existing semantic highlight color/stroke and does not reveal a name unless existing name rules permit it.
- [x] Today `Which country is this?` inherits highlighted tiny-marker emphasis through the common map state.
- [x] Drill/Practice `Which country is this?` or equivalent Location -> Country recall inherits the same behavior.
- [x] Locate feedback that explicitly highlights the expected Country receives the same tiny-marker emphasis without workflow-specific code.
- [x] Reduced-motion preserves static highlighted size while suppressing nonessential transition/pop motion.

### Regression and verification

- [x] Existing `SvgMapController` discovery, hidden, hover, click, group, color, label, and zoom behavior remains green.
- [x] Existing `CountryLearningMap`, `GeographyOverviewMap`, Drill, Practice, Learning, Today, and Recite tests remain green.
- [x] Add focused tests for screen-space tiny sizing, highlight/rest transitions, highlight+hover composition, resize/zoom refresh, hidden/non-interactive behavior, overlap resolution, and single click dispatch.
- [x] `npx vitest run src/features/world-countries` passes.
- [x] `npm run typecheck` passes.

## Source anchors

- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapController.test.ts`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/learning/flows/SchedulerLocationPracticeStep.tsx`
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
- `src/features/world-countries/today/TodayReviewSession.tsx`

## Documentation impact

On implementation, update `docs/architecture/features/WORLD_COUNTRIES.md` so the `SvgMapController` ownership statement records both invariants:

- tiny-Country hit/marker usability is maintained in rendered screen space across map scale/zoom/resize; and
- generic highlighted state provides persistent visible tiny-marker emphasis without workflow-specific target semantics.

Do not add a new ADR. This corrects the implementation/completeness of the existing map ownership decision rather than changing ownership or dependency direction.

## Verification

Implemented in the shared `SvgMapController` with no workflow-specific tiny-
Country logic. Focused tests cover screen-space scaling, zoom and resize
refresh, overlap/source-geometry resolution, hidden/non-interactive states,
highlight/rest/hover composition, and reduced motion. The World Countries
feature suite (79 files, 335 tests), typecheck, and the full repository suite
(112 files, 535 tests) passed.
