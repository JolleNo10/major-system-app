# Change Spec 0044 - Extract SVG map task-assistance runtime

- **Status:** Implemented
- **Date:** 2026-08-29
- **Issue:** None.
- **Related ADRs:** None. This is a behavior-preserving refactor inside the existing World Countries `maps/` ownership boundary.
- **Related changes:** Earlier World Countries map cleanup extracted pure SVG geometry helpers to `svgGeometry.ts` and task marker element factories to `svgTaskMarkers.ts`. Change Spec 0043 is the preceding health cleanup but is otherwise unrelated.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Reduce the size and mixed responsibilities of `src/features/world-countries/maps/SvgMapController.ts` by extracting its cohesive task-assistance / map-answer interaction subsystem into one focused Maps-owned runtime while preserving `SvgMapController` as the public imperative facade.

The task-assistance subsystem currently owns a large cluster of state and behavior for:

- task answer-selection membership;
- representative learning targets;
- automatic and authored task anchors;
- synthetic dots;
- derived interaction points for compact and multi-component geography;
- task marker and hit-target DOM lifecycle;
- fixed-on-screen marker sizing;
- pointer listener lifecycle;
- pointer-intent resolution;
- source-path hit testing;
- bounded forgiving hit regions;
- task hover rendering;
- task click dispatch.

These responsibilities are already conceptually one Maps subsystem and have strong regression coverage. Extracting them creates a meaningful internal ownership boundary rather than splitting the controller merely to reduce line count.

There is no intended user-visible behavior change.

RepoWise health is a secondary signal. The implementation should improve responsibility boundaries, local reasoning, and direct testability rather than chase a numeric score.

## Current baseline

At the start of this change, RepoWise reports approximately:

```text
src/features/world-countries/maps/SvgMapController.ts
score 2.05
CCN 36
Nest 4
NLOC 1755
Tested: yes
```

The controller already delegates:

- pure affine/path operations to `svgGeometry.ts`;
- task marker element creation to `svgTaskMarkers.ts`;
- aspect-fitting math to `viewBoxFit.ts`.

This change should build on those seams rather than reverse or duplicate them.

## User-visible behavior

No user-visible behavior is intended to change.

Preserve all current map behavior, including:

- ordinary map loading and country discovery;
- generic Country hover and click behavior;
- hidden, muted, highlighted, named, and custom-colored Countries;
- Country label overrides;
- hover groups and group outlines;
- semantic zoom and standard/expanded presentation;
- task answer-selection restrictions;
- task target display;
- task hover and click behavior;
- compact-country assistance;
- multi-component Country interaction points;
- authored learning anchors;
- synthetic dots;
- transformed/nested SVG geometry;
- marker sizing through zoom, resize, and presentation changes;
- reduced-motion rendering;
- source-fingerprint validation;
- map cleanup and destroy behavior.

## Scope

### 1. Create one focused task-assistance runtime

Create a Maps-owned module, preferably:

`src/features/world-countries/maps/svgTaskAssistance.ts`

The exact name may vary if a clearly better feature-local name exists.

The module should own the stateful runtime for SVG task assistance. A small internal class, factory-backed object, or equivalent focused runtime is acceptable because this subsystem is inherently stateful and owns DOM/listener lifecycle.

Do not create a generic framework or reusable application-wide interaction engine.

A conceptual shape is:

```ts
interface SvgTaskAssistanceRuntime {
  configure(assistance: SvgMapTaskAssistance | null): SvgMapMutationResult
  clearHover(): void
  attach(svg: SVGSVGElement): void
  detach(): void
  sync(): void
  reset(): void

  getHoveredCountryId(): string | null
  renderCountryTaskState(...): void
}
```

This is illustrative only. The implementation may use a class or another explicit interface if that produces a clearer dependency boundary.

The runtime remains an implementation detail of `SvgMapController`; callers should not need to instantiate it.

### 2. Move task-only state out of `SvgMapController`

Move the current equivalents of the following task-specific state into the new runtime where practical:

```text
TaskPointerIntent
TaskInteractionPoint
TaskRepresentativeTarget
AutomaticTaskAnchor

taskRepresentativeTargets
taskInteractionPoints
taskTargetLayers
taskAnswerSelection
taskAnswerSelectionConfigured
taskTargetId
taskPointerIntent
taskAnchorDefinitions
taskSyntheticDotDefinitions
automaticTaskAnchors
automaticTaskInteractionPoints
taskPointerListeners
```

The exact private names may change.

`SvgMapController` should no longer directly coordinate all of this mutable task runtime state.

### 3. Move task-assistance configuration and validation

Move the detailed implementation behind `setTaskAssistance(...)` into the new runtime.

The public controller method must remain available and preserve its current result and error semantics.

The extracted implementation must preserve:

- trimming and validating task IDs;
- unknown Country reporting;
- duplicate authored learning-anchor rejection;
- duplicate synthetic-dot rejection;
- stale learning-anchor source-fingerprint rejection;
- stale synthetic-dot source-fingerprint rejection;
- `single-dot` anchors resolving their point from source geometry;
- `multi-dot-representative` anchors requiring an authored point;
- invalid/non-finite/out-of-viewBox authored points being rejected;
- replacing previous task configuration cleanly;
- clearing previous task pointer intent when task assistance is replaced;
- removing stale markers/layers before or during synchronization;
- `answerSelectionIds === undefined` retaining the current distinction from an explicitly supplied empty answer selection.

Do not weaken validation in order to simplify the extraction.

### 4. Move task interaction-point and representative-target lifecycle

Move the task-specific DOM lifecycle currently responsible for:

- deriving task interaction points;
- resolving representative target anchors;
- creating/updating interaction markers;
- creating/updating representative target markers;
- task target layers;
- marker positioning;
- screen-center tracking for hit testing;
- removing stale points/targets/layers;
- synchronizing task assistance after map state or presentation changes.

Continue to reuse:

`src/features/world-countries/maps/svgTaskMarkers.ts`

for marker element creation.

Do not duplicate those element factories inside the new runtime.

### 5. Preserve automatic interaction geometry rules

The extracted runtime must preserve the current automatic assistance behavior.

#### Compact unambiguous source geometry

Compact source geometry continues to resolve to its center only when it passes the existing compact/unambiguous rules, including the current maximum-dimension/area semantics and drawn-component check.

#### Multi-component geometry

When compact geometry does not apply, a source path with multiple drawn components continues to derive interaction points from the component starts using the existing path parsing behavior.

The existing source-path fingerprint cache semantics must remain intact so derived points/anchors are recomputed when source geometry changes and reused when it has not.

#### Synthetic dots

A configured synthetic dot continues to override automatically derived interaction points for that Country and remains identified as `synthetic` in task marker metadata.

#### Representative target anchors

The target-resolution order remains equivalent to the current behavior:

1. explicit authored learning anchor, if present;
2. configured synthetic dot;
3. automatic compact single-dot anchor when geometry is unambiguous;
4. otherwise no representative target.

Do not invent automatic representative points for ambiguous multi-component geography.

### 6. Move task pointer listener lifecycle and intent resolution

Move the map-level task pointer listener lifecycle into the runtime.

Preserve attachment/removal for:

- `pointermove`;
- `pointerover`;
- `pointerleave`;
- `pointercancel`;
- `click`.

The runtime must continue to resolve task hover and task click from the same coordinate semantics.

Preserve the current intent priority:

```text
exact eligible source Country geometry
  -> nearest interaction point belonging to that Country, if any
  -> bounded forgiving interaction point across task candidates
  -> exact eligible source Country
  -> no task intent
```

This ordering is important. The forgiving task halo must not incorrectly steal a click from exact assisted source geometry, while still being able to win over enclosing ordinary geography after exact local assisted geometry has had its chance.

Preserve nearest-point selection semantics, including deterministic tie handling.

### 7. Preserve source-Country hit testing

The runtime must preserve current source-Country pointer resolution semantics:

- only eligible task candidates participate;
- client coordinates are transformed into the source path's local coordinate system;
- use `SVGGeometryElement.isPointInFill(...)` when available;
- gracefully fall back to bounding-box containment where SVG APIs are incomplete;
- transformed/nested SVG paths continue to work;
- overlapping source geometry continues to resolve deterministically according to current behavior.

Do not replace this with DOM event-target-only selection. The current map-level pointer resolver exists specifically because tiny, transformed, nested, and forgiving assisted geography cannot rely on ordinary source path events alone.

### 8. Move task-exclusive coordinate helpers where appropriate

Move low-level SVG coordinate helpers into the new runtime when they are used only by task assistance, for example current equivalents of:

- rendered-scale calculation used for fixed-pixel task geometry;
- source point -> layer point conversion;
- path/source point -> screen point conversion;
- SVG point <-> client point conversion used by task hit testing;
- client point -> source-path local point conversion;
- task-only element transform traversal.

Continue to reuse the affine operations from `svgGeometry.ts` rather than reimplementing matrix multiplication/inversion/parsing.

Do **not** blindly move controller/camera helpers that are genuinely shared with semantic zoom or presentation.

In particular, general `viewBox` parsing/fitting and semantic camera intent should remain with the controller unless implementation proves a helper is exclusively task-owned.

### 9. Preserve fixed-pixel marker and hit-target sizing

Task markers and forgiving hit regions must retain their current effective on-screen sizing through:

- normal map presentation;
- expanded presentation;
- semantic zoom changes;
- viewport resize;
- nested/transformed map SVGs.

Preserve the existing target radius, hover scale, and hit radius behavior unless those constants are simply moved with the runtime.

The change must not make marker radius proportional to map zoom.

### 10. Preserve task rendering semantics

The runtime may own the task-specific marker/ring rendering logic, or expose the minimum state needed for `SvgMapController.render()` to invoke it.

Either approach is acceptable if the boundary remains clear.

Preserve:

- task pointer intent causing the source Country to use task hover fill;
- interaction-marker hover growth;
- interaction-ring visibility/opacity;
- representative target visibility only for the configured task target;
- hidden Countries suppressing task geometry;
- source/semantic Country coloring remaining authoritative for marker fill where task hover does not override it;
- hover stroke/stroke-width settings;
- reduced-motion transitions;
- no duplicate marker groups.

Avoid moving the entire generic Country rendering loop into the task runtime.

Generic map rendering remains a `SvgMapController` responsibility.

### 11. Preserve generic hover/click separation

Ordinary Country hover remains owned by `SvgMapController`.

Ordinary path clicks must continue to behave as they do today:

- when task answer selection is **not** configured, source path click may dispatch through the generic Country click handler subject to generic selectability;
- when task answer selection **is** configured, source path click does not independently dispatch an answer because the map-level task pointer resolver owns that click exactly once.

Do not merge generic hover state and task pointer-intent state into one generalized hover engine.

Task pointer hover should continue to be task-specific rather than silently changing workflow-neutral generic hover callback semantics.

### 12. Keep `SvgMapController` as the public facade

Do not require existing callers to construct or understand the task runtime.

Preserve the current controller-facing API, including:

```ts
setTaskAssistance(...)
clearTaskHover()
setCountryClickHandler(...)
```

and all unrelated existing public controller methods.

`SvgMapView.tsx` should continue to configure task assistance through `SvgMapController.setTaskAssistance(...)`.

If public task types such as these are physically moved to the new module:

```ts
SvgMapLearningAnchor
SvgMapSyntheticDot
SvgMapTaskAssistance
```

preserve existing imports by re-exporting them from `SvgMapController.ts` unless current repository inspection proves there are no external imports and changing the import path is clearly preferable.

Default preference: **preserve the controller module's public type surface**.

### 13. Keep map load/reset/destroy lifecycle explicit

`SvgMapController.load(...)` should continue to own:

- fetch/markup loading;
- SVG validation/sanitization;
- map reset;
- importing/mounting the SVG;
- country discovery/binding;
- generic hover listener attachment;
- overall render lifecycle.

The controller should attach the task runtime to the newly loaded SVG at the appropriate point.

`resetMap()` / `destroy()` must ensure the runtime:

- removes task pointer listeners;
- removes task DOM layers/markers;
- clears task intent/configuration/cache state as required by the existing behavior;
- does not retain DOM references to an old SVG.

Do not allow the extracted runtime to outlive or retain a destroyed controller/map instance.

### 14. Keep camera/viewBox ownership in the controller

Do not turn this change into a camera refactor.

Keep the existing `SvgMapController` ownership of:

- `originalViewBox`;
- presentation (`standard` / `expanded`);
- semantic zoom intent;
- `setZoomArea(...)`;
- `resetZoom()`;
- resize observation and viewBox recomputation;
- `viewBoxFit.ts` usage.

The task runtime may be notified/synchronized after camera changes so fixed-pixel task geometry remains correct.

### 15. Keep unrelated controller responsibilities out of scope

Do not extract or redesign, except for the minimum wiring required by this task boundary:

- SVG source loading/sanitization;
- country discovery;
- generic Country render state;
- generic hover groups;
- group outlines;
- labels;
- colors;
- hidden/muted state;
- semantic camera/viewBox behavior;
- React integration in `SvgMapView`.

## Suggested responsibility split after the change

Conceptually:

```text
SvgMapController
  - load / sanitize / discover SVG Countries
  - generic Country visual state
  - generic Country hover + callbacks
  - labels / outlines / visibility / colors
  - semantic zoom + presentation + resize
  - public map facade
  - delegates task assistance

svgTaskAssistance
  - task configuration / validation
  - task answer-selection state
  - authored/synthetic/automatic anchor state
  - interaction point derivation + caches
  - task marker/layer lifecycle
  - fixed-pixel sizing
  - task pointer listeners
  - pointer intent + hit testing
  - task click dispatch
  - task marker/ring presentation

svgTaskMarkers
  - task marker DOM element factories

svgGeometry
  - pure path / affine geometry operations

viewBoxFit
  - pure viewBox/aspect fitting
```

The exact private APIs are implementation-defined.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- Stay inside World Countries plus direct existing dependencies.
- `maps/` remains the owner of task-scoped answer-selection interaction points, synthetic dots, representative learning anchors, and map-owned pointer-intent resolution.
- Do not move task interaction semantics into `learning/`, `drill/`, `today/`, `recite/`, or `ui/`.
- `SvgMapController` remains the imperative SVG map facade used by `SvgMapView`.
- `SvgMapView` remains the declarative React lifecycle adapter.
- Reuse `svgGeometry.ts`, `svgTaskMarkers.ts`, `syntheticDots.ts`, and `viewBoxFit.ts` as appropriate.
- Do not create broad `common/`, `domain/`, or generic interaction framework layers.
- Do not introduce React into the task runtime.
- Do not introduce persistence.
- Do not change map asset formats or authored anchor/synthetic-dot data formats.
- Do not make edits solely to improve RepoWise metrics.

No ADR is required.

## Existing capabilities to reuse

- `src/features/world-countries/maps/SvgMapController.ts`
  - Current public facade and source of exact existing task semantics.
- `src/features/world-countries/maps/SvgMapController.test.ts`
  - Strong direct regression coverage for loading, rendering, task assistance, transformed geometry, pointer behavior, zoom, resize, cleanup, and reduced motion.
- `src/features/world-countries/maps/WorldCountriesMapClick.integration.test.tsx`
  - Higher-level map click integration coverage.
- `src/features/world-countries/maps/SvgMapView.tsx`
  - Declarative caller of `SvgMapController.setTaskAssistance(...)` and generic callbacks.
- `src/features/world-countries/maps/svgGeometry.ts`
  - Existing pure SVG transform/path helpers.
- `src/features/world-countries/maps/svgGeometry.test.ts`
  - Existing pure geometry coverage.
- `src/features/world-countries/maps/svgTaskMarkers.ts`
  - Existing task marker element factories.
- `src/features/world-countries/maps/syntheticDots.ts`
  - Existing synthetic-dot source-fingerprint behavior.
- `src/features/world-countries/maps/viewBoxFit.ts`
  - Existing pure map viewBox/aspect fitting.

## Edge cases and invariants

### Configuration

- `setTaskAssistance(null)` removes task-only markers/intent and restores ordinary map behavior.
- Explicit `answerSelectionIds: []` remains distinct from omission of `answerSelectionIds` if current behavior distinguishes them.
- Unknown answer IDs are reported, not silently treated as valid.
- Unknown task target is reported and does not become active.
- Duplicate anchors/dots remain rejected.
- Invalid/stale authored metadata remains rejected exactly as before.

### Selection and click dispatch

- Hidden Countries are never task candidates.
- Generic selectability restrictions continue to constrain task candidates.
- Task answer selection further narrows generic selectability when configured.
- A single user click must not dispatch both a source-path click and a task-runtime click.
- Clicking ordinary source geometry for an eligible task Country remains valid even outside a tiny forgiving marker halo.
- A bounded forgiving halo remains local and must not create unbounded selection regions.

### Hover / pointer intent

- Pointer move/over updates task intent.
- Pointer leave/cancel clears task intent.
- `clearTaskHover()` remains safe and idempotent.
- Task pointer intent invalidates when its Country/interaction point ceases to be eligible or present.
- Multi-point Countries highlight the specific nearest active interaction point while retaining Country-level task hover semantics.

### Geometry

- Transformed source paths remain correctly hit-tested.
- Nested SVGs remain supported.
- Missing/incomplete SVG CTM APIs in jsdom/test DOMs continue to use the existing fallback semantics.
- `preserveAspectRatio="none"` behavior remains correct.
- Coordinates outside letterboxed SVG content remain rejected where current behavior rejects them.
- `getBBox()` failure or unavailable geometry remains non-fatal where it is non-fatal today.

### Marker lifecycle

- Task markers are not added to ordinary maps merely because generic selectable/highlighted Countries exist.
- Representative target and interaction markers are removed when no longer requested.
- Reconfiguration does not accumulate duplicate layers or markers.
- Markers survive zoom/resize/presentation changes without remounting the SVG.
- Marker/hit-target size remains effectively fixed in screen pixels.
- Reduced-motion behavior remains unchanged.

### Source geometry changes

- Automatic caches remain keyed/validated by current source path data.
- Changed path geometry invalidates/recomputes derived automatic task points.
- Stale authored source fingerprints remain rejected rather than silently reused.

### Cleanup

- Reload removes listener and DOM references to the prior SVG.
- Destroy removes all task listeners/layers and leaves no task runtime attached to detached DOM.
- Calling public methods after controller destroy retains current controller error semantics.

## Testing strategy

### 1. Add focused runtime tests

Add a focused test file for the new module, preferably:

`src/features/world-countries/maps/svgTaskAssistance.test.ts`

The tests should directly exercise the extracted runtime where this materially improves local testability.

Useful focused coverage includes:

- task configuration normalization;
- stale/invalid anchor validation;
- stale/invalid synthetic-dot validation;
- automatic compact anchor resolution;
- multi-component interaction-point derivation;
- synthetic-dot override;
- pointer intent priority;
- nearest-point resolution and deterministic tie behavior;
- transformed path hit testing;
- fixed-pixel marker sizing;
- marker/layer cleanup;
- listener attach/detach/reset.

Do not force every behavior into a direct runtime unit test if an existing controller-level DOM test is the clearer contract test.

### 2. Preserve controller facade regression coverage

Do not delete all task-assistance tests from `SvgMapController.test.ts` merely because a new runtime exists.

Retain representative controller-level tests proving that the public facade still correctly wires:

- `setTaskAssistance(...)`;
- Country click callbacks;
- task hover/click through the mounted SVG;
- task behavior through zoom/resize;
- cleanup/destroy;
- generic path click versus task resolver ownership.

Existing behavior-heavy tests may be moved to the focused runtime test file only where doing so makes them substantially clearer, but public facade coverage must remain.

### 3. Preserve integration coverage

Keep `WorldCountriesMapClick.integration.test.tsx` green.

Do not rewrite higher-level workflow tests to accommodate behavior changes; there should be no behavior change.

## Verification

Run at minimum:

```bash
npx vitest run src/features/world-countries/maps/svgTaskAssistance.test.ts
npx vitest run src/features/world-countries/maps/SvgMapController.test.ts
npx vitest run src/features/world-countries/maps/WorldCountriesMapClick.integration.test.tsx
npx vitest run src/features/world-countries/maps
npx vitest run src/features/world-countries
npm run typecheck
```

If the repository uses the Windows command shims in the implementation environment, the equivalent `npx.cmd` / `npm.cmd` commands are acceptable.

Then run:

```bash
repowise health
```

Record the actual post-change metrics for `SvgMapController.ts` and the new runtime.

The implementation is successful based primarily on clearer ownership and green regression coverage. A score improvement is desirable but not an acceptance gate.

## Acceptance criteria

### Runtime boundary

- [x] A focused Maps-owned task-assistance runtime exists outside `SvgMapController.ts`.
- [x] The runtime owns the majority of task-specific mutable state, marker/layer lifecycle, pointer listeners, and pointer-intent resolution.
- [x] `SvgMapController.ts` no longer directly implements the complete task-assistance subsystem.
- [x] No generic application-wide interaction framework is introduced.

### Public facade

- [x] `SvgMapController` remains the imperative public map facade.
- [x] `SvgMapView` continues to configure task assistance through the controller.
- [x] Existing public task-assistance methods remain behavior-compatible.
- [x] Existing public task types remain import-compatible, preferably through re-export if moved.
- [x] No unrelated caller API changes are required.

### Task semantics

- [x] Authored learning-anchor validation is unchanged.
- [x] Synthetic-dot validation is unchanged.
- [x] Automatic compact-anchor behavior is unchanged.
- [x] Multi-component interaction-point derivation is unchanged.
- [x] Task pointer intent preserves current exact-geometry / local-point / bounded-halo / source-Country precedence.
- [x] Task candidate filtering preserves hidden/selectable/answer-selection rules.
- [x] Generic source-path click and task pointer click do not double-dispatch.
- [x] Task hover remains separate from generic hover callback semantics.

### Geometry and presentation

- [x] Transformed and nested SVG source geometry remains supported.
- [x] Test-DOM fallbacks remain supported where browser SVG APIs are incomplete.
- [x] Task markers and hit targets remain effectively fixed in screen pixels through zoom/resize/presentation changes.
- [x] Reduced-motion behavior remains unchanged.
- [x] Marker/layer lifecycle does not accumulate duplicates.
- [x] Hidden Countries suppress task geometry.

### Controller ownership

- [x] Generic Country rendering remains in `SvgMapController`.
- [x] Generic hover/groups/outlines remain in `SvgMapController`.
- [x] SVG loading/sanitization/discovery remains in `SvgMapController`.
- [x] Semantic zoom/presentation/resize ownership remains in `SvgMapController`.
- [x] Existing `svgGeometry.ts`, `svgTaskMarkers.ts`, and `viewBoxFit.ts` seams are reused rather than duplicated.

### Regression coverage

- [x] Focused tests cover the extracted runtime.
- [x] Representative `SvgMapController` task-assistance facade tests remain.
- [x] Existing map integration tests remain green.
- [x] Full World Countries tests remain green.
- [x] Typecheck passes.

## Source anchors

- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapController.test.ts`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/WorldCountriesMapClick.integration.test.tsx`
- `src/features/world-countries/maps/svgGeometry.ts`
- `src/features/world-countries/maps/svgGeometry.test.ts`
- `src/features/world-countries/maps/svgTaskMarkers.ts`
- `src/features/world-countries/maps/syntheticDots.ts`
- `src/features/world-countries/maps/viewBoxFit.ts`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `src/features/world-countries/AGENTS.md`

## Documentation impact

No current-state architectural ownership change is expected.

`docs/architecture/features/WORLD_COUNTRIES.md` already states that `maps/` owns task-scoped answer-selection interaction points, synthetic dot metadata, representative learning anchors, map-owned pointer-intent resolution, and workflow-neutral callbacks.

The new runtime should implement that existing `maps/` ownership more explicitly; it should not change dependency direction or workflow ownership.

If implementation reveals a need to move these semantics out of `maps/`, change the public controller contract substantially, or introduce a new cross-feature interaction architecture, stop and evaluate that separately rather than silently encoding it in this refactor.

Do not rewrite historical Change Specs.

## Implementation record

When implemented:

- change **Status** to `Implemented`;
- check the acceptance criteria based on actual implementation;
- record exact verification commands and results;
- record before/after RepoWise metrics for `SvgMapController.ts` and the new runtime;
- note any intentionally retained task-specific methods in the controller and why they remain part of the facade/render seam;
- do not add an ADR unless implementation unexpectedly changes ownership, dependency direction, or public architectural contract.

### Implementation

`SvgMapTaskAssistanceRuntime` now owns task configuration and validation,
automatic/authored/synthetic task geometry, source hit testing, pointer intent,
task listeners, marker/layer lifecycle, fixed-pixel sizing, and task marker/ring
rendering. `SvgMapController` remains the public imperative facade and retains
SVG loading/sanitization, Country discovery, generic Country rendering and
hover, labels/colors/highlights/muting/hiding, outlines, camera/presentation,
resize, and public methods. Its intentionally retained task-specific methods
(`setTaskAssistance`, `clearTaskHover`) delegate through the facade, while its
generic render loop supplies the final Country fill to the runtime so generic
map styling remains authoritative.

Public task types remain import-compatible through type re-exports from
`SvgMapController.ts`. `SvgMapView.tsx` and its callers were left unchanged.
No ADR was added because ownership and dependency direction remain within the
existing `maps/` contract.

### RepoWise metrics

The Change Spec's pre-change baseline was recorded as approximately:

```text
SvgMapController.ts: score 2.05, CCN 36, Nest 4, NLOC 1755, Tested: yes
```

The post-change `repowise health` result was:

```text
SvgMapController.ts: score 2.35, CCN 33, Nest 4, NLOC 1018, Tested: yes
svgTaskAssistance.ts: score 5.55, CCN 33, Nest 4, NLOC 842, Tested: yes
```

The CLI table rounds these scores to 2.4 and 5.5 respectively.

### Verification

All requested scoped verification passed:

```text
npx.cmd vitest run src/features/world-countries/maps/svgTaskAssistance.test.ts       PASS (5 tests)
npx.cmd vitest run src/features/world-countries/maps/SvgMapController.test.ts        PASS (42 tests)
npx.cmd vitest run src/features/world-countries/maps/WorldCountriesMapClick.integration.test.tsx PASS (13 tests)
npx.cmd vitest run src/features/world-countries/maps                              PASS (12 files, 99 tests)
npx.cmd vitest run src/features/world-countries                                 PASS (102 files, 527 tests)
npm.cmd run typecheck                                                            PASS
repowise health                                                                  PASS
```

The additional final `npm.cmd test` run reported 727 passing tests and one
unrelated failure in `src/app/settings/SettingsOverlay.test.tsx`, where the
test expected geography-order confirmation copy that was not rendered. No
settings code was changed, and the World Countries and Maps suites above pass.
