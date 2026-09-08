# Change Spec 0055 - World Countries Authored Subregion Learning Frames and Camera Cleanup

- **Status:** Implemented
- **Date:** 2026-09-08
- **Issue:** None.
- **Related ADRs:** [ADR 0033](../adr/0033-author-world-countries-subregion-learning-camera-frames.md), [ADR 0031](../adr/0031-separate-selection-interaction-points-from-representative-learning-anchors.md)
- **Current-state docs:** [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Replace target-dependent learning-camera heuristics with one shared, deterministic Subregion learning-frame capability across applicable World Countries active learning/recall experiences, and simplify the map camera boundary so workflows express semantic camera intent rather than composing overlapping zoom mechanisms.

In this specification, a “valid authored learning frame” means structurally valid registry data unless learning or pedagogical quality is explicitly stated. Structural validity covers complete Subregion coverage, authoritative map applicability, finite positive bounds, and source-coordinate containment. It does not by itself prove that the rectangle is a good learning composition.

## User-visible behavior

### One stable learning frame per Subregion

When an active learning/recall task uses Subregion geographic context, every prompt in that Subregion shows the same deliberate map frame.

Examples:

- Northern Europe has one stable learning view whether the current target is Norway, Sweden, Iceland, or a Capital prompt associated with one of them.
- Micronesia has one stable learning view whether the target is Palau, Nauru, Micronesia, Marshall Islands, or another Country represented through the existing tiny/distributed target assistance.
- Australia & New Zealand has one deliberate frame that keeps useful regional context instead of zooming Australia to fill the map.

Changing the target changes highlight/marker/status presentation, not the camera.

### Camera behavior is independent of Recite assistance/order

Recite uses the same Subregion learning frame for the same current Subregion in:

- `Visible`;
- `Reveal as you go`;
- `Random`.

`Random` may change which prompt appears next. It must not select a different camera strategy.

Country and Capital prompts for the same Country also use the same frame.

### The rule applies outside Recite when the task semantics match

Audit active map-backed World Countries workflows and use the shared Subregion learning frame wherever the map's role is stable regional learning/recall context.

Expected categories include active Today, Drill, Learning, Practice, Quiz, and Recite surfaces that:

- have a current Country/Subregion;
- use the map as regional learning/recall scaffolding or an answer surface within that regional context; and
- do not have a stronger task-specific camera requirement.

Do not infer applicability merely from component names. Inspect each caller and preserve its learning semantics.

### Explicit task-specific cameras remain explicit

Do not replace cameras whose geometry is part of the task itself.

Known retained cases include:

- Neighbours Quiz target-local neighbourhood framing;
- Country for Shape explicit Country-shape fitting;
- any other verified caller that deliberately requests a specific geometry fit.

These may change frame with the target because that change is semantically required.

### Setup and overview maps remain setup and overview maps

World/Continent setup, navigation, selection, progress overview, and authoring maps do not automatically jump to authored learning frames when a Subregion is selected or hovered.

Their existing default or explicit camera semantics remain authoritative unless a separate product requirement says otherwise.

### Tiny/distributed target assistance remains independent

Existing representative learning anchors, automatic compact targets, interaction points, and synthetic dots continue to make tiny/distributed Countries usable.

They identify or emphasize the target inside the stable learning frame. They do not choose the frame.

## Scope

- Add map-owned authored learning frames for every current World Countries `SubregionId`.
- Add a workflow-neutral semantic camera-intent seam at the common map boundary.
- Migrate applicable active learning/recall callers from workflow-specific/adaptive zoom selection to the shared Subregion learning-frame intent.
- Preserve and explicitly classify task-specific cameras such as Neighbours and Country for Shape.
- Remove adaptive learning-camera machinery and overlapping API surface that becomes obsolete after caller migration.
- Preserve map task assistance, SVG identity translation, stable map layout, and presentation batching.
- Update current-state World Countries architecture to describe the resulting camera ownership/rules.

## Interaction and states

### Same Subregion, next prompt

- Keep the same map asset and authored learning frame.
- Update target highlight/marker/status only.
- Country → Capital changes answer-semantic color but not frame.
- Retry/fuzzy/feedback/reveal state does not refit the camera.

### Next Subregion in same Continent

- Keep the authoritative regional map when applicable.
- Apply the next Subregion's authored learning frame.

### Next Continent

- Load the authoritative map for the new target's Continent.
- Apply that Subregion's authored learning frame.

### Missing/unresolvable learning frame

- Keep the task usable.
- Fall back to the complete authoritative regional map.
- Do not invoke adaptive target-derived framing.
- Automated validation must make missing production coverage a failure so this path is resilience rather than routine behavior.

### Expanded map presentation

- Use the same semantic camera intent as standard presentation.
- Existing aspect-fit behavior may expand the authored bounds for the new slot ratio.
- Expansion/collapse must not change which learning frame is selected.
- Camera changes must not resize the physical map surface.

## Architecture constraints

- Follow ADR 0033 for camera ownership and camera-intent semantics.
- Follow ADR 0031 for answer-selection interaction points and representative task targets; do not merge camera and target-assistance responsibilities.
- `maps/` owns authored frame metadata, Country/Subregion-to-SVG translation, frame resolution, aspect fitting, and low-level camera application.
- Workflow code supplies semantic Country/Subregion/task intent only; no raw SVG IDs, viewBox coordinates, target-size thresholds, or Country-specific camera exceptions.
- Prefer one caller-facing camera intent over simultaneous optional `zoomCountryIds` / `neighbourhoodZoom` / future learning-frame props with implicit precedence.
- Low-level controller/view code remains workflow-agnostic.
- Keep unrelated activity/session/persistence behavior unchanged.

## Existing capabilities to reuse

- `GeographyOverviewMap` — common Country/Subregion map adapter and the appropriate caller-facing camera boundary.
- `SvgMapView` / `SvgMapController` — generic camera/viewBox application, aspect fitting, source-map layout, and batched presentation.
- `mapDefinitions.ts` — authoritative regional map ownership.
- `learningAnchors.ts` / `syntheticDots.ts` / task-assistance runtime — target presentation that remains separate from camera framing.
- geography `SubregionId` definitions/queries — stable semantic identity and membership.
- existing explicit Country fit and target-local neighbourhood capabilities where real callers still require them.

## Edge cases

- **Large Country:** Australia must not select a Country-specific crop when the task uses the Australia & New Zealand learning frame.
- **Tiny Country:** Palau/Nauru/Tuvalu-like targets stay visible through task assistance inside the stable authored frame.
- **Distributed Country:** Micronesia-like representative targets do not expand the camera to total Country bounds.
- **Same Country, different answer kind:** Country and Capital prompts retain the same frame.
- **Random prompt crosses Subregions:** frame changes only because Subregion changes, not because order is Random.
- **Reveal-as-you-go:** hidden/revealed geometry changes do not change the frame.
- **Partial selected scope:** the frame represents the Subregion, not merely the subset selected for the session; stable geographic context is intentional.
- **Map asset change:** frame validation should detect values outside or inconsistent with the authoritative source coordinate system.
- **Special task camera:** Neighbours/Shape behavior must not silently inherit a learning frame.

## Out of scope

- Changing Country/Capital data, Subregion membership, ordering, or persistence.
- Changing Recite Random prompt interleaving, progress, outcome semantics, or assistance behavior.
- Changing answer matching, feedback timing, wrong-kind retry, or task colors.
- Redesigning tiny-Country answer-selection interaction semantics from ADR 0031.
- Reworking Neighbours Quiz camera behavior beyond adapting it to the cleaned semantic camera-intent boundary.
- Building a permanent visual frame editor unless repository inspection proves an existing authoring seam should be extended rather than directly authoring the finite frame metadata.
- Adding per-Country learning frames.

## Acceptance criteria

- [x] Every current `SubregionId` has exactly one structurally valid authored learning frame on its authoritative regional map; composition quality is calibrated separately.
- [x] The common map boundary exposes a semantic Subregion learning-frame camera intent without leaking raw SVG coordinates to workflows.
- [x] Caller-facing camera selection no longer relies on several overlapping optional zoom props with accidental precedence; the final API makes the active semantic camera intent clear.
- [x] Recite `Visible`, `Reveal as you go`, and `Random` use the same frame for the same Subregion.
- [x] Recite Country and Capital prompts for the same target use the same frame.
- [x] At least one applicable active non-Recite learning/recall workflow uses the same shared capability after the caller audit, and all other applicable callers identified by the audit are migrated in the same change.
- [x] Setup/navigation/overview/authoring maps retain their intended camera behavior and do not automatically adopt learning frames.
- [x] Neighbours Quiz retains its target-local neighbourhood semantics.
- [x] Country for Shape retains explicit shape fitting.
- [x] Tiny/distributed target anchors and synthetic dots remain independent from camera selection and continue to render correctly.
- [x] A large target such as Australia no longer causes a target-specific learning crop.
- [x] A sparse/tiny Subregion such as Micronesia/Polynesia uses a stable authored regional context rather than target-dependent adaptive zoom.
- [x] Same-Subregion prompt transitions do not recompute or change camera intent.
- [x] Cross-Subregion transitions select the new authored frame; cross-Continent transitions also select the authoritative regional map.
- [x] Missing frame resolution falls back to the complete regional map, never adaptive target heuristics.
- [x] Adaptive learning-camera flags/thresholds/helpers/tests with no legitimate remaining caller are removed rather than retained behind compatibility wrappers.
- [x] Generic camera capabilities with verified remaining callers continue to work.
- [x] Camera viewBox changes do not resize the physical map surface.
- [x] Batched map presentation remains intact.

## Source anchors

- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.test.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapController.test.ts`
- `src/features/world-countries/maps/mapDefinitions.ts`
- `src/features/world-countries/maps/learningAnchors.ts`
- `src/features/world-countries/maps/syntheticDots.ts`
- `src/features/world-countries/recite/ReciteSessionView.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.test.tsx`
- `src/features/world-countries/practice/NeighboursQuizSession.tsx`
- relevant active Today/Drill/Learning/Practice/Quiz map callers found during the required caller audit
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Post-implementation calibration

Subsequent real-use inspection exposed authored-value defects that were not covered by the original structural and caller-behavior validation: Poland was clipped or pushed against the lower edge in Central Europe, Serbia had the same problem in the Balkans, Romania had a poor Eastern Europe composition, and several Oceania frames were too tightly cropped. These findings do not invalidate ADR 0033 or the semantic camera-intent architecture. They require calibration of the map-owned authored data and stronger learning-frame quality regression coverage.

## Documentation impact

When implemented:

- update `docs/architecture/features/WORLD_COUNTRIES.md` so `maps/` explicitly owns authored Subregion learning frames and the semantic camera-intent boundary;
- document the general rule that applicable active learning/recall workflows reuse stable Subregion frames independently of ordering and answer kind;
- document that setup/overview camera semantics and explicit task-local cameras remain distinct;
- keep ADR 0031's target-assistance ownership unchanged;
- set this Change Spec to `Implemented` only after sufficient risk-proportionate evidence and record actual verification.

## Implementation evidence

- `src/features/world-countries/maps/subregionLearningFrames.ts` contains the authored map-coordinate registry. Its `Record<SubregionId, ...>` construction follows the canonical Subregion definitions, and focused tests verify complete one-per-Subregion coverage, uniqueness, authoritative regional map applicability, finite positive bounds, and source viewBox compatibility.
- `cameraIntent.ts` defines the single caller-facing semantic contract. `GeographyOverviewMap` and `CountryLearningMap` resolve Country/Subregion identities at the map boundary; workflows do not receive raw SVG IDs or viewBox coordinates.
- Active stable learning/recall callers in Recite, Today, Drill, Learning, and Practice use `subregion-learning`; Neighbours Quiz uses `target-neighbourhood`; Country for Shape and the verified shape-task paths retain `fit-countries`; setup, navigation, preview, results, and overview surfaces retain default/explicit overview behavior.
- Focused map, registry, Recite, and migrated-caller tests passed: 8 files, 161 tests. Focused learning-flow and Today tests passed: 6 files, 18 tests.
- The complete World Countries feature suite passed: 113 files, 701 tests.
- `npm.cmd run lint` passed. `git diff --check` passed. `npm.cmd run typecheck` reports only an unrelated error in the untouched `src/features/world-countries/drill/DrillSetup.test.tsx` fixture (`Map<any, any>` is not assignable to `Map<string, never>`).
- Browser/manual verification was not performed; no browser surface was already available without setup, and repository instructions do not require starting a development server for this task.
- The original implementation evidence above is structural/architectural evidence, not a claim that every committed frame value was manually visually calibrated.
- The calibration follow-up passes the focused World Countries map suite: 13 files and 148 tests, including source-geometry safe-zone regressions for Poland, Serbia, and Romania and authored Oceania composition guards. Lint passes; typecheck still reports only the unrelated existing `DrillSetup.test.tsx` fixture error.

## Verification

Use focused automated verification proportional to this cross-cutting map-boundary change.

Expected evidence includes:

- learning-frame registry coverage/validation tests for all current Subregions;
- map-boundary tests for semantic camera intent and fallback;
- controller/view tests for fixed-frame application, aspect fit, stable physical layout, and retained batching;
- Recite tests proving all three assistance modes use the same Subregion-frame semantics;
- representative non-Recite active learning/recall tests for every migrated camera category found by the caller audit;
- Neighbours Quiz tests protecting its target-local camera;
- Country-for-Shape or equivalent focused coverage protecting explicit shape fit where current tests exist.

Because the common camera API is expected to change, run the relevant World Countries typecheck/compiler path and focused map/activity tests. Widen to the feature-wide World Countries suite if caller migration spans enough workflows that focused evidence is insufficient. Run `git diff --check`.

Browser/manual verification is not required by default. Do not start or troubleshoot a dev server solely for it. If an already-available browser surface can be used without setup, a small visual matrix across a normal continental Subregion, Australia & New Zealand, Micronesia/Polynesia, and one special task camera is useful; otherwise report it as not performed.
