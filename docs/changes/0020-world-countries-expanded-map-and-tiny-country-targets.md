# Change Spec 0020 - Expanded World Countries maps and forgiving tiny-country targets

- **Status:** Implemented
- **Date:** 2026-08-22
- **Issue:** None.
- **Related ADRs:** [ADR 0028 - PageLayout owns an optional expanded-center presentation](../adr/0028-page-layout-expanded-center-presentation.md)
- **Current-state docs:** [System architecture](../architecture/SYSTEM.md), [World Countries](../architecture/features/WORLD_COUNTRIES.md)
- **Related Change Specs:** [0010](0010-world-countries-map-centered-interaction-qol.md), [0017](0017-world-countries-uniform-typed-answer-interaction.md), [0018](0018-align-world-countries-today-with-drill-layout.md), [0019](0019-world-countries-overlay-answer-feedback.md)

## Goal

Improve map-centered World Countries interaction in two ways without creating per-workflow implementations:

1. tiny/dot-like Countries are easier to see, hover, and click; and
2. the common map task surface can expand to use the browser window while PageLayout hides the rails.

The implementation must preserve the existing ownership model: `SvgMapController` owns generic SVG interaction behavior, World Countries `MapSurface` owns the feature-local map/task presentation, and app `PageLayout` owns page geometry and rail presentation.

## User-visible behavior

### Tiny Countries

Countries represented by extremely small SVG geometry are easier to target.

- A genuinely tiny/dot-like Country receives a modest visible marker enlargement so it is possible to see what can be targeted.
- Its interactive hit area is materially larger than its visible source geometry.
- Hovering the enlarged hit area behaves exactly like hovering the Country itself: the same Country hover, label, and highlight behavior is used.
- Clicking the enlarged hit area dispatches the same Country click as clicking the original geometry.
- The visible tiny marker uses the Country's current semantic/map color treatment; it must not introduce a new status color language.
- On hover, a tiny marker may make a short, restrained animated "pop" through small scale/ring emphasis.
- Tiny markers do not continuously pulse.
- A hidden answer target must never pulse or otherwise reveal itself merely because it is the current correct answer.
- With reduced-motion preference enabled, the marker remains legible and targetable but does not require scale/pulse animation.

The source Country geometry remains the authoritative geography. Visual marker/hit-target augmentation must not change map zoom bounds, Country identity, persistence, ordering, or answer semantics.

### Expanded map surface

Every World Countries surface using the common `MapSurface` receives one common expand/collapse capability rather than each workflow opting into its own implementation.

At desktop/wide layout (`xl+`):

- a small expand control appears in a consistent position at the top-right of the map surface;
- activating it expands the existing map/task surface within the browser window;
- both PageLayout rails disappear, including their rail presentation controls;
- the center surface grows into the space previously reserved for the center + rails;
- browser chrome and unrelated application chrome remain visible;
- the same map instance/task state, prompt, feedback, answer lifecycle, and workflow remain active; this is not navigation to a second screen;
- activating the collapse control returns to the standard 42rem center and restores the currently published rails.

Below `xl`, the existing single-column/drawer layout remains the responsive behavior and the expand affordance is not required. If the viewport becomes narrower than the expansion breakpoint while expanded, the layout must return safely to standard responsive presentation rather than leaving an unreachable expanded-only state.

Expanded state is transient. It may remain active across question/feedback transitions while the owning common map surface remains mounted, but it resets when that expanded surface/workflow is left. It is not persisted in Settings.

## Visual contract for expanded mode

The implementation agent may tune exact CSS values, but must preserve this composition:

```text
STANDARD

[left rail]   [ prompt/context ]   [right rail]
              [      map       ]
              [ answer/task    ]

EXPANDED

          [ compact prompt/context ]
[                                           ]
[                  MAP                      ]
[                                           ]
          [ centered answer/task ]
```

Rules:

- **The map gets the extra space first.** More viewport space means more map, not proportionally larger controls.
- The map is the visual dominant element and should use most of the useful expanded body area.
- The SVG/map aspect ratio must be preserved; never stretch geography to fill an arbitrary rectangle.
- The map should grow in both width and practical displayed height on ordinary desktop windows rather than merely widening a fixed-height strip.
- Keep reasonable outer breathing room; expanded does not mean touching every browser edge.
- Prompt/context above the map remains compact.
- Feedback remains map-relative and centered using the existing feedback-overlay model.
- The answer/task dock remains visually attached to the map experience but is centered and width-bounded. It should stay near the current comfortable task/form width rather than expanding inputs/buttons across the full viewport.
- Existing dock semantics (`overlay`, `attached`, `stacked`) remain authoritative. Expanded mode changes available geometry, not workflow meaning.
- The expand/collapse control must not overlap map metadata, feedback, answer controls, or essential Country labels.
- Entering/collapsing may use a short layout transition, but the task must remain immediately usable and reduced-motion preference must be respected.

## Scope

- Add the generic PageLayout expanded-center presentation required by ADR 0028.
- Add one World Countries common expand/collapse experience at the `MapSurface` layer.
- Make the common map surface consume the PageLayout presentation contract; do not implement expansion inside workflow owners.
- Make World Countries map rendering scale appropriately when its common surface is expanded.
- Add centralized tiny/dot-like Country visual and interaction-target augmentation in the SVG map layer.
- Preserve all existing Country click/hover callbacks and feature adapters.
- Cover existing map-task consumers including Today, Drill, standalone Practice, guided Learning, and Recite through their existing shared seams rather than per-mode expansion code.
- Update current-state architecture documentation in the same implementation change.

## Interaction and states

### Expand/collapse

- The expand control is a real accessible button with an accessible name such as `Expand map` / `Collapse map` and an equivalent visible tooltip/title treatment.
- The control does not steal answer-input focus during ordinary question transitions.
- Expansion must not reset typed input, current question, scheduler/session state, feedback timers, map load state, hover state, or evidence state.
- Collapse restores the rails currently published by the feature; workflows do not republish/reconstruct them solely for collapse.
- If a rail drawer was open when expansion begins, PageLayout must not leave the drawer visible over the expanded surface.
- Do not add a global keyboard shortcut solely for this change. Native keyboard activation of the expand/collapse button is sufficient.

### Tiny-country target behavior

- Determine tiny/dot-like treatment from rendered/source map geometry, not a hard-coded list of Country IDs.
- Keep the original Country path as the source for zoom/bounds and semantic styling.
- The forgiving hit target must track interactivity: hidden or non-interactive Countries must not retain a ghost click/hover target.
- A target enlargement must not make adjacent Countries consistently unreachable. Where expanded hit areas overlap, interaction must remain deterministic and favor the Country actually nearest/intended by the pointer rather than arbitrary DOM ordering.
- Hovering into/out of the forgiving area must not produce repeated flicker between the marker and original path.
- Existing hover groups, hidden Countries, muted Countries, semantic fills, selected/highlighted state, and caller-controlled click handlers continue to work.
- Marker augmentation must not be included in `getBBox()`-based zoom calculations or otherwise widen a geography scope.

### Animation

The intended animation is restrained usability feedback, not decoration:

- tiny marker is slightly clearer at rest;
- pointer hover may enlarge it by roughly 20-30% with a subtle ring/emphasis;
- transition should feel immediate/short, not floaty;
- leaving returns cleanly to rest state;
- no continuous idle pulsing;
- no automatic animation that leaks the current correct Country before the workflow reveals it;
- reduced-motion disables nonessential scale/motion while preserving static emphasis.

## Architecture constraints

- ADR 0028 is a prerequisite architectural decision for the expanded-center behavior.
- `src/app/layout/PageLayout*` owns page width, center geometry, rail suppression, drawer behavior, and layout-header geometry. It must remain unaware of World Countries or map/task semantics.
- `src/features/world-countries/ui/MapSurface.tsx` owns the World Countries expand/collapse affordance, expanded map/task visual contract, and the request to PageLayout.
- `src/features/world-countries/maps/SvgMapController.ts` owns generic SVG Country hit-target and tiny-geometry behavior.
- `GeographyOverviewMap` / `CountryLearningMap` remain workflow-neutral adapters; do not add Today/Drill/Learning/Recite branches for this behavior.
- Today, Drill, Practice, Learning, and Recite must not own `expanded` page-layout state, viewport breakout CSS, rail-hiding logic, duplicate expand controls, or tiny-Country ID exceptions.
- Do not create a second map component, second answer panel, portal, modal, browser fullscreen view, or duplicate mounted SVG for expanded mode.
- Do not reintroduce the old mode-level `wide` mechanism or negative-margin breakout techniques.
- Expanded presentation does not change task semantics, answer modes, evidence, mastery/proficiency, scheduling, persistence, or geography identity.

## Existing capabilities to reuse

- `src/app/layout/PageLayout.tsx` — single existing authority for center/rail geometry and responsive rail drawers.
- `src/app/layout/PageLayoutContext.tsx` — existing app-owned publication boundary for view-scoped layout slots; extend this boundary rather than bypassing PageLayout.
- `src/features/world-countries/ui/MapSurface.tsx` — common owner of map-relative context, feedback, and task dock presentation across World Countries workflows.
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx` — existing shared typed-answer lifecycle; expansion must not create a second answer implementation.
- `src/features/world-countries/maps/SvgMapController.ts` — existing owner of discovered SVG Country paths, hover/click listeners, visibility, coloring, and zoom.
- `src/features/world-countries/maps/SvgMapView.tsx` — React lifecycle adapter for the shared map controller.
- `src/features/world-countries/learning/CountryLearningMap.tsx` and `src/features/world-countries/maps/GeographyOverviewMap.tsx` — existing workflow-neutral map adapters.

## Edge cases

- European microstates, small islands, and dense island groups may have nearby/overlapping target areas; no Country should become practically impossible to select because another invisible halo always wins.
- A tiny Country that is hidden by caller policy must have no visible marker augmentation, hover, click, or accessible ghost interaction.
- A visible but intentionally non-clickable map (for example non-interactive Recite scaffolding) must not become clickable because the forgiving target exists.
- Expanded mode must survive ordinary map highlight/name/color updates without remounting the SVG.
- Answer feedback overlays must remain centered on the expanded map and keep their current timing/focus semantics.
- Expanding while an answer field contains text must preserve that exact draft and focus behavior.
- Normal 42rem presentation must remain visually unchanged when not expanded.
- Resizing across `xl` while expanded must not leave hidden rails/drawers or an inaccessible collapse state.

## Out of scope

- Browser Fullscreen API.
- Persisting expanded/collapsed preference.
- Redesigning PageLayout rail semantics or rail content.
- New mobile map navigation.
- Changing map assets or redrawing geographic boundaries.
- Changing Country inclusion/classification, Country-to-SVG IDs, or map zoom scopes.
- New answer modes or workflow-specific answer UI.
- Continuous attention animations, celebration effects, confetti, sound, or target-revealing pulses.

## Acceptance criteria

### Shared architecture

- [x] PageLayout exposes one generic standard/expanded-center presentation contract; there are no independent wide/hide-left/hide-right/fullscreen flags implementing the same concern.
- [x] Standard PageLayout remains 42rem / 672px at `xl+` with existing rail geometry and drawer behavior.
- [x] Expanded-center suppresses both rail presentation and rail drawer/toggle UI and lets the center use the available viewport width.
- [x] Collapsing restores the rails already published for the current view.
- [x] PageLayout contains no World Countries, map, Drill, Today, Learning, Practice, Recite, or answer-mode conditionals.
- [x] World Countries expansion state/affordance is implemented at the common `MapSurface` boundary, not duplicated in workflow components.
- [x] Today, Drill, Practice, Learning, and Recite continue using their existing map/task/answer seams and do not contain separate expansion implementations.

### Expanded visual behavior

- [x] At `xl+`, the common map surface provides one consistent accessible expand/collapse control.
- [x] Expanding visibly increases useful map width and displayed map size while keeping geography aspect ratio intact.
- [x] The map receives the added space; answer inputs/buttons do not scale to viewport width.
- [x] The answer/task dock remains centered and comfortably width-bounded in expanded mode.
- [x] Existing map-relative feedback overlays remain centered and visually attached to the expanded map.
- [x] Expansion/collapse does not reset current prompt, typed draft, feedback lifecycle, session/scheduler state, or map load state.
- [x] Leaving the owning surface clears expanded presentation; no stale wide layout leaks into another mode/view.
- [x] Below `xl`, existing responsive behavior remains usable and no unreachable expanded-only state remains.

### Tiny-country interaction

- [x] Tiny/dot-like Country treatment is geometry-derived rather than a hard-coded Country list.
- [x] Tiny visible Countries have a clearer rest marker and a materially larger pointer target than the source dot/path.
- [x] Hover and click through the forgiving target dispatch the same Country identity/callbacks as the original path.
- [x] Hidden/non-interactive Countries have no ghost forgiving target.
- [x] Enlarged targets do not affect map zoom/bounds calculations.
- [x] Dense/overlapping tiny-country targets remain practically selectable; no neighboring target is consistently unreachable due only to DOM order.
- [x] Hover animation is restrained and does not continuously pulse or reveal an unrevealed answer target.
- [x] Reduced-motion preserves legibility/target size while suppressing nonessential marker motion.

### Regression and verification

- [x] Existing `SvgMapController` hidden, hover, click, coloring, group, and zoom tests remain green.
- [x] Add controller tests for tiny-geometry detection/augmentation, click/hover through the forgiving target, hidden/non-interactive behavior, and zoom exclusion.
- [x] Add PageLayout context/layout tests for expanded publication, rail/drawer suppression, collapse restoration, and unmount cleanup.
- [x] Add common `MapSurface` tests proving one expand/collapse path requests PageLayout presentation and preserves its map/dock children.
- [x] Verify at least Drill location-click and one other map consumer use the shared tiny-country behavior without workflow-specific code.
- [x] Verify Today, Drill, Practice/Learning, and Recite map/task surfaces inherit expansion through the common seam.
- [x] `npx vitest run src/features/world-countries` passes.
- [x] Relevant `src/app/layout` tests pass.
- [x] `npm run typecheck` passes.

## Source anchors

- `src/app/layout/PageLayout.tsx`
- `src/app/layout/PageLayoutContext.tsx`
- `src/app/layout/PageLayoutContext.test.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapController.test.ts`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`

## Documentation impact

On implementation:

- update `docs/architecture/SYSTEM.md` to document PageLayout standard vs expanded-center presentation;
- update `docs/architecture/features/WORLD_COUNTRIES.md` to document `MapSurface` ownership of expansion and `SvgMapController` ownership of forgiving tiny-Country interaction;
- remove/replace the current World Countries statement that PageLayout geometry remains unchanged;
- keep ADR 0028 as rationale and this Change Spec as delivery scope; current-state docs become authoritative after implementation.

## Verification

- Implemented and verified on 2026-08-22.
- Evidence: `npx vitest run src/features/world-countries` (80 files, 329 tests), relevant `src/app/layout` tests, `npm run typecheck`, focused MapSurface expansion tests, and focused SvgMapController tests for tiny geometry, hidden/non-interactive targets, semantic marker color, zoom exclusion, neighboring-source protection, letterboxed coordinate mapping, and pointer routing. Today, Drill, Practice/Learning, and Recite retain their existing MapSurface/LearningMapSurface seams; no workflow-specific expansion code was added. A full `npm test` run had 525 passing tests and one unrelated order-dependent SettingsOverlay failure; that test passes when run alone.
