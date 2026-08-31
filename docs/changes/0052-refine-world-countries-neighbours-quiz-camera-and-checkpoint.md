# Change Spec 0052 - Refine World Countries Neighbours Quiz Camera and Checkpoint

- **Status:** Ready
- **Date:** 2026-08-31
- **Issue:** None.
- **Related ADRs:** [ADR 0028](../adr/0028-page-layout-expanded-center-presentation.md), [ADR 0032](../adr/0032-model-world-countries-quiz-as-practice.md)
- **Current-state docs:** [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Refine the World Countries Neighbours Quiz so the map behaves like a local border-recall surface rather than a full-geometry fit, expanded presentation becomes a focused map-and-answer mode without duplicated tools/progress, and resolved targets use a compact checkpoint with one clear summary instead of competing center and rail summaries.

This Change Spec refines the presentation delivered by Change Specs 0050 and 0051 without changing Neighbours run semantics, scoring, persistence, or architectural ownership.

## User-visible behavior

### Target-centric neighbourhood camera

An active Neighbours question must open on a stable local geographic neighbourhood around the prompted Country.

For example, for North Korea the viewport should show the Korean peninsula and enough nearby geography to expose the local portions of China and Russia that border North Korea. It must not zoom out merely because China or Russia have very large total SVG bounds.

Likewise:

- Germany should frame Germany and its immediate Central-European border context;
- Nepal should frame Nepal plus nearby India/China border context rather than the full extents of India and China;
- Mongolia should show Mongolia and the adjacent parts of China/Russia without fitting all of Russia;
- Malaysia must retain the meaningful Malaysian target geometry and nearby Thailand/Brunei/Indonesia border context without fitting all of Indonesia.

The camera remains stable for the whole target. Correct answers, `Show map`, `Reveal remaining`, and entering the checkpoint must not successively refit or jump the viewport.

The camera requirement from Change Spec 0050 that described fitting the prompted Country plus all required neighbours is refined by this spec: **the local portions of required neighbours must be represented by the target-centric neighbourhood, but their complete Country extents must not be required to fit inside the viewport.**

### Standard active presentation

Standard desktop behavior from Change Spec 0051 remains:

- map and typed answer are the primary recall surface;
- target is highlighted;
- found neighbours become visible, green, and named;
- the right rail contains progress, Found, `Show number`, `Show map`, `Reveal remaining`, and incorrect-guess status;
- unresolved/out-of-run/map-only geometry follows the existing 0051 visibility rules;
- the user can expand/collapse the map through the shared `MapSurface` control.

### Expanded presentation

Expanded presentation is a focused recall mode.

When the Neighbours map is expanded:

- PageLayout's existing expanded-center presentation remains the owner of page width and rail suppression;
- keep the expanded task header/cue;
- keep the existing top-right target progress, for example `Target 1 / 10` with its progress bar;
- keep the map as the dominant surface;
- keep the typed answer dock below the map at its normal intrinsic height;
- do **not** render a Neighbours expanded companion;
- do **not** duplicate Found/progress below or beside the map;
- do **not** expose `Show number`, `Show map`, or `Reveal remaining` while expanded.

The learner may collapse back to standard presentation to use those secondary actions. Their state is transient run state and must remain unchanged across expansion/collapse.

Expanded presentation therefore has one progress surface only: the existing task progress in the expanded header.

### Resolved target checkpoint

Natural completion and `Reveal remaining` continue to end at an explicit checkpoint before advancement.

In standard presentation the center checkpoint immediately below the map becomes the primary resolution surface. It should be compact and visually connected to the map rather than resembling a second large results page.

It contains:

- `All neighbours found.` for natural completion, or concise review wording for a reveal checkpoint;
- compact target statistics such as `3 / 3 named · 0 revealed · 1 incorrect guess`, with hint use included when relevant;
- the complete resolved neighbour set, with learner-named and revealed/missed neighbours visually distinguishable;
- one primary `Next Country →` action, or `See results →` on the final target.

For small neighbour sets, avoid large two-column result cards with excessive empty space. Prefer compact chips/rows or another dense treatment consistent with the existing UI. The presentation must still scale cleanly for targets with many neighbours without horizontal overflow.

The standard right rail becomes checkpoint-aware. Once the current target is resolved:

- do not keep the full active `Found` summary alongside a second complete center summary;
- do not show disabled hint buttons;
- do not duplicate the resolved-neighbour list or continuation action;
- replace the active tools with minimal checkpoint/session context, for example `Checkpoint` and `Target 2 / 10`, optionally with concise mistake/hint metadata when useful.

The center checkpoint remains the only place that advances to the next target/results.

When the map is expanded at checkpoint time, there is still no expanded companion. The compact center checkpoint remains below the map and the existing top task progress remains the only separate progress presentation.

## Scope

- Add/reuse a map-owned target-centric neighbourhood zoom capability suitable for Neighbours recall.
- Use that zoom capability from the Neighbours Quiz instead of generic full-bounds `zoomCountryIds` behavior for target + all required neighbours.
- Keep the target camera stable throughout one question/checkpoint lifecycle.
- Remove the Neighbours `expandedCompanion` presentation and rely on the existing expanded task progress plus centered dock.
- Make the standard Neighbours right rail phase-aware so active tools are replaced by minimal checkpoint context after target resolution.
- Tighten the center checkpoint presentation while retaining the complete resolved answer and one explicit continuation action.
- Add/update focused map, session, presentation, and coordinator tests for these behaviors.

## Interaction and states

### Active / standard

- Right rail publishes the current Neighbours session tools.
- Answer dock accepts typed Country recall.
- Camera uses the target-local neighbourhood intent.
- `Show number`, `Show map`, and `Reveal remaining` behave as in Change Spec 0051.

### Active / expanded

- PageLayout rails are suppressed by the existing expanded-center contract.
- No Neighbours companion is rendered inside `MapSurface`.
- Only expanded header progress + map + answer dock remain.
- Hint/reveal actions are intentionally unavailable until collapse.
- Found neighbours remain visible/named directly on the map.

### Resolved / standard

- Answer form is replaced by the compact checkpoint.
- Right rail switches from active tools to minimal checkpoint context.
- Exactly one visible primary continuation action exists.

### Resolved / expanded

- No expanded companion or hint controls appear.
- Compact checkpoint remains the continuation surface below the map.
- Exactly one visible primary continuation action exists.

### Map loading/error

Existing fallback behavior remains unchanged:

- typed recall stays functional when the map fails;
- non-map hints/reveal remain usable in standard presentation;
- checkpoint and continuation remain usable;
- expanded presentation must not create a dependency on a ready map for continuation/collapse.

### Responsive behavior

- Existing PageLayout rail/drawer behavior remains authoritative in standard presentation.
- Expanded-center remains desktop-only according to the existing `MapSurface` breakpoint behavior.
- Do not add a Neighbours-specific fullscreen or mobile layout system.
- The checkpoint must avoid horizontal overflow and excessive empty height at ordinary desktop and smaller supported widths.

## Architecture constraints

- Follow `src/features/world-countries/AGENTS.md` and `docs/architecture/features/WORLD_COUNTRIES.md`.
- Quiz remains Practice semantics under ADR 0032. Do not add persistence, evidence, scheduling, mastery, or a new `quiz/`/assessment engine.
- `maps/` continues to own Country-to-SVG translation, geometry discovery, visibility, and zoom behavior.
- Do not solve local neighbourhood zoom by exposing raw SVG IDs or path geometry to `NeighboursQuizSession`.
- Do not globally change the established generic `zoomCountryIds` contract if other callers rely on full selected-Country bounds. Introduce/extend a distinct map zoom intent/capability for the local-neighbourhood case.
- `PageLayout` remains the width/rail authority under ADR 0028. Do not add workflow-local viewport breakout or browser Fullscreen API behavior.
- Keep `MapSurface.expandedCompanion` as a reusable shared capability. Neighbours simply stops using it for this workflow; do not remove or redefine it globally.
- Neighbours run snapshot state remains authoritative. Camera/presentation changes must not re-read live Settings/geography in a way that changes the active run.
- Target advancement remains owned by the top-level Quiz coordinator as established by Change Spec 0051.

## Existing capabilities to reuse

- `NeighboursQuizSession` — owns the active Neighbours map/input/checkpoint orchestration.
- `NeighboursQuizSessionTools` — current active standard-rail tools; reuse or narrow rather than introducing duplicate active control logic.
- `deriveNeighboursTargetProgress` — canonical target-local found/revealed/remaining derivation.
- `GeographyOverviewMap` — caller-facing World Countries map presentation seam, including Country-population masking and map-owned zoom translation.
- `SvgMapView` / `SvgMapController` — generic SVG presentation and camera implementation. Extend here when local geometry/bounds behavior is required.
- `WorldCountriesMapActivitySurface` / `MapSurface` — shared task context, expansion, dock, and PageLayout presentation integration.
- `WorldCountriesTaskContext` — already provides the top-right expanded target progress that should become the sole fullscreen progress presentation.
- Existing `TaskDock` checkpoint/form styling — refine the Neighbours composition rather than creating a separate page layout.

## Edge cases

- **Large neighbour:** a Country such as Russia/China must not make a small target's neighbourhood unusably wide merely because the whole neighbour path has a large bounding box.
- **Large target:** the target itself must remain meaningfully represented; a local zoom algorithm must not crop the prompted Country so aggressively that its identity/shape is lost.
- **Multipart target:** Malaysia and other multipart/fragmented target geometry must retain the meaningful target components needed to understand its border context. Do not assume a target is one compact path rectangle.
- **Tiny target:** a very small target must receive a sensible minimum neighbourhood window so there is enough surrounding geography to recall neighbours.
- **Cross-Continent/transcontinental border:** continue using the world map and run-snapshotted effective neighbours.
- **Show map after expansion/collapse:** expanding does not itself mark `Show map` used or invalidate perfection. Collapsing restores the standard tools with prior hint state intact.
- **Checkpoint entered while expanded:** the checkpoint is usable without first collapsing and no companion appears.
- **Many neighbours:** the resolved answer list remains compact but readable and does not create horizontal overflow.
- **Map failure:** continuation and standard-mode non-map hints remain usable.

## Out of scope

- Changing Neighbours scoring, strict `Perfect Countries` semantics, Retry missed behavior, or results scoring.
- Changing Country/Capital data or land-border relationships.
- Changing fuzzy answer matching.
- Changing the standard active right-rail information architecture beyond what is needed to switch to checkpoint context.
- Removing or redesigning generic `MapSurface.expandedCompanion` for other workflows.
- Changing generic full-Country zoom semantics for existing map callers.
- Browser Fullscreen API support.
- New persistence/preferences for zoom, expansion, hints, or checkpoint state.
- Capitals Quiz changes.

## Acceptance criteria

- [ ] A Neighbours target uses a stable target-centric local neighbourhood camera rather than fitting the complete SVG bounds of all required neighbours.
- [ ] A North-Korea-like case with a very large required neighbour does not zoom out to the large neighbour's full extent; the target and local border context remain prominent.
- [ ] A target with ordinary compact neighbours, such as Germany, still shows useful immediate neighbour context.
- [ ] Multipart/large target geometry is handled deliberately; Malaysia-like targets retain meaningful target geometry and nearby border context without fitting all of Indonesia.
- [ ] Tiny targets receive enough surrounding context to make neighbour recall possible.
- [ ] Correct answers, `Show map`, `Reveal remaining`, and checkpoint entry do not cause the current target camera to jump/refit.
- [ ] Existing generic full-country `zoomCountryIds` behavior remains unchanged for callers that do not opt into the new neighbourhood zoom capability.
- [ ] Existing 0051 population masking remains intact: out-of-run/map-only geometry does not leak merely because the new camera changes.
- [ ] In expanded Neighbours presentation there is no `data-map-surface-companion`/Neighbours companion content.
- [ ] Expanded Neighbours presentation does not show `Show number`, `Show map`, `Reveal remaining`, a duplicate Found panel, or a second progress block.
- [ ] Expanded Neighbours presentation retains the existing top task progress (`Target N / total`) and progress bar.
- [ ] Expanded active presentation retains the typed answer dock at normal intrinsic height below the map.
- [ ] Collapsing back to standard presentation restores the standard session tools without mutating hint/found/run state.
- [ ] Standard active presentation continues to show the 0051 Found/progress/hint rail.
- [ ] Standard resolved presentation replaces active rail tools with minimal checkpoint/session context; disabled hint controls are not shown.
- [ ] The standard checkpoint is visually compact and directly associated with the map rather than a large sparse result block.
- [ ] The checkpoint presents the complete resolved neighbour set and visually distinguishes named from revealed/missed neighbours.
- [ ] The checkpoint has exactly one visible `Next Country →` / `See results →` continuation action.
- [ ] Expanded checkpoint also has no companion and exactly one continuation action.
- [ ] Existing map-failure fallback, run snapshot behavior, strict Perfect semantics, Retry missed, and coordinator-owned advancement remain unchanged.
- [ ] Capitals Quiz behavior remains unchanged.

## Source anchors

- `src/features/world-countries/practice/NeighboursQuizSession.tsx`
- `src/features/world-countries/practice/NeighboursQuizSessionTools.tsx`
- `src/features/world-countries/practice/NeighboursQuizSession.test.tsx`
- `src/features/world-countries/practice/WorldCountriesQuiz.tsx`
- `src/features/world-countries/practice/WorldCountriesQuiz.test.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.test.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapController.test.ts`
- `src/features/world-countries/maps/geographyMapAdapter.ts`
- `src/features/world-countries/ui/WorldCountriesActivity.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `docs/changes/0050-add-world-countries-neighbours-quiz.md`
- `docs/changes/0051-improve-world-countries-neighbours-quiz-interaction.md`

## Documentation impact

No new ADR is expected. The change follows ADR 0028's existing expanded-center ownership and ADR 0032's existing Practice semantics.

When implemented:

- keep Change Specs 0050/0051 as historical delivery records; 0052 is the current refinement and should not rewrite their historical requirements;
- update `docs/architecture/features/WORLD_COUNTRIES.md` only if the final reusable map zoom capability or Neighbours expanded/checkpoint responsibility adds a current-state rule that future agents need to understand;
- do not copy detailed layout acceptance criteria into architecture documentation.

Set this Change Spec to `Implemented` only after the camera behavior and both standard/expanded checkpoint states are verified, not merely after unit tests compile.

## Verification

Implementation completed on 2026-09-01; the status remains `Ready` until the required manual browser verification is completed.

- Evidence: focused camera/map/session/presentation tests passed (80/80), including duplicate expanded-progress, stale-camera fallback, contained checkpoint, asymmetric-cluster, and standard/expanded aspect regressions.
- Evidence: full World Countries feature suite passed (612/612 tests).
- Evidence: `npm run typecheck`, `npm run lint`, and `git diff --check` passed.
- Automated coverage includes a synthetic dramatically oversized neighbour, compact-neighbour, tiny-target, multipart-target, sampled local path geometry, asymmetric/Sudan-like clusters, stable camera intent, contained checkpoint content, standard checkpoint rail, and expanded no-companion presentation.
- Manual verification pending: a live North-Korea-like large-neighbour target and standard plus expanded checkpoint layouts could not be checked because no in-app browser session was available.
- After that manual check, set the status to `Implemented` and replace this note with the final manual evidence.
