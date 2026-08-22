# Change Spec 0026 — Add task-scoped synthetic dots for visually weak Oceania countries

- **Status:** Ready
- **Date:** 2026-08-22
- **Implementation:** Automated implementation complete; manual browser verification pending.
- **Feature:** World Countries / Countries
- **Repository:** `JolleNo10/major-system-app`
- **Related ADRs:** ADR 0031 — Separate answer-selection interaction points from representative learning anchors; preserve the coordinate-space rules already established for SVG task assistance.
- **Builds on:** Change Spec 0025 — Correct tiny-Country pointer intent, multi-component selection, and hover feedback.
- **Current-state doc:** `docs/architecture/features/WORLD_COUNTRIES.md`
- **New ADR required:** No. This is an additive map-presentation capability inside the existing `maps/` ownership and task-assistance architecture.

## Goal

Make three Oceania Countries that have real SVG geography but are too visually weak at normal Continent-task scale behave like Countries that are represented by native map dots.

Add exactly one map-owned **synthetic dot** for each confirmed Country:

| Country | Country ID | Map |
|---|---|---|
| Samoa | `WS` | `oceania` |
| Solomon Islands | `SB` | `oceania` |
| Vanuatu | `VU` | `oceania` |

The synthetic dot exists to make the Country easy to **see, hover, and select** in map-learning tasks. It must reuse the same shared task interaction/presentation behavior as a native tiny dot rather than introduce Country-specific event logic.

## User-visible behavior

### Locate / map-answer tasks

When Samoa, Solomon Islands, or Vanuatu is an answer candidate in an active location-click task:

- show one synthetic dot for that Country at the normal resting visual size used for native tiny dots;
- give that dot the same forgiving screen-space interaction radius as native tiny-dot assistance;
- hovering the dot or its forgiving region:
  - enlarges that synthetic dot using the same hover sizing/animation as native tiny dots;
  - applies the normal task-hover Country color to the Country;
  - does not reveal the Country name unless existing task rules independently allow it;
- clicking the dot or forgiving region submits that Country exactly once;
- the Country shown with task-hover color must be the Country the same click would submit;
- leaving the interaction region restores the synthetic dot to its native-dot-equivalent resting presentation.

The question's correct answer must not control which synthetic dots are available. Every eligible Country in the answer-selection scope receives its configured dot and identical interaction behavior.

### One dot per confirmed Country

For this change, **one synthetic dot is intentional and sufficient for each of Samoa, Solomon Islands, and Vanuatu**, including Solomon Islands.

Do not create one synthetic dot per island or per path component.

The synthetic dot is a usability surrogate, not a replacement for the Country's real geography.

### Real geography remains valid

The original source Country geometry remains authoritative:

- direct clicks on genuine selectable source geometry continue to resolve to the Country;
- source geometry continues to receive the task-hover Country color when pointer intent resolves to that Country;
- the synthetic dot does not alter `getBBox()` geography, zoom bounds, map identity, labels, or Country membership;
- do not delete, enlarge, rewrite, or replace the source path.

For a Country with a configured synthetic dot, do not also manufacture a cloud of geometry-derived tiny-component halos for the same Country. The configured synthetic dot is the single forgiving dot-style answer-selection point for this presentation class. Genuine source geometry remains directly selectable.

### “Which country is this?” / explicit location target

When one of these Countries is intentionally presented as the location/question target:

- use the same configured synthetic-dot position as its map peg;
- apply the existing task-target emphasis behavior used for tiny native-dot targets;
- keep exactly one persistent representative marker;
- do not enlarge or synthesize markers over every island/component.

The fact that answer-selection and task-target presentation may consume the same configured point does not merge their semantics: answer-selection remains pointer-driven; task-target emphasis remains explicit caller intent.

### Normal maps

Synthetic dots introduced by this spec are **task-scoped presentation**.

They must not appear merely because the Country is visible, clickable, highlighted, selected, colored by progress/mastery, or shown in normal Geography/setup/navigation maps.

Normal maps continue to render the bundled SVG geography unchanged.

## Architecture

### Keep the existing separation from ADR 0031 / Change Spec 0025

Preserve:

```text
ordinary source geography
  -> Country identity, semantic color, direct hit, labels, zoom/bounds

answer-selection task
  -> 0..N task interaction points per Country

explicit location/task target
  -> 0..1 representative target point

map-owned pointer resolver
  -> one deterministic { Country, interaction point? } intent
```

Synthetic dots are an additional **map-owned source of task interaction/target points**. They are not a new workflow concept.

### Introduce explicit synthetic-dot metadata

Add a map-owned configuration/data concept equivalent to:

```text
MapSyntheticDot
  mapId
  CountryId
  source SVG identity / fingerprint used for staleness validation
  authored point in source/map coordinates
```

Exact type/file names are implementation detail.

Requirements:

- key decisions by stable canonical `CountryId` + `mapId`, not display labels;
- keep the coordinate authored in the relevant map asset's source coordinate system;
- validate that the referenced Country/source geometry still exists;
- use source fingerprint or equivalent validation consistent with existing map-owned learning-anchor validation so an asset replacement does not silently leave a stale marker;
- do not put Samoa/Solomon Islands/Vanuatu branches in `SvgMapController`, Drill, Learning, Practice, Today, or UI components;
- the controller consumes generic synthetic-dot definitions supplied through the map adapter/view seam.

A dedicated map metadata module is preferred over overloading `learningAnchors.ts` if overloading would blur the distinction between:
- a synthetic visual surrogate dot; and
- an explicit representative learning anchor for genuinely multi-dot native geography such as Micronesia.

It is acceptable for the synthetic-dot point to also provide the representative task-target coordinate for these three Countries, but the runtime roles remain separate.

### Native-dot parity

Do not implement a second hover/click state machine.

After source resolution, native and synthetic dot-like task points must share the same:

- screen-space hit radius;
- hover enlargement size;
- marker/ring styling;
- transition/reduced-motion rules;
- task hover color;
- pointer-intent resolver;
- overlap resolution;
- click dispatch;
- cleanup;
- resize/zoom/expanded-mode recomputation.

The only meaningful difference is where the point originates:

```text
native point     -> derived from source geometry
synthetic point  -> map-owned authored metadata
```

Downstream task behavior should not branch on Country identity.

### Synthetic point precedence

For a Country with an active configured synthetic dot:

- expose the synthetic dot as the Country's dot-style forgiving interaction point;
- do not additionally derive multiple tiny-component assistance points for that same Country;
- preserve direct source-geometry selection separately.

The existing centralized pointer-intent resolver from Change Spec 0025 remains authoritative.

Where a synthetic halo overlaps another Country's real geometry, use the same bounded tiny-point precedence already established for native microstates:

1. exact assisted point/source hit where applicable;
2. nearest active bounded dot-style interaction region;
3. ordinary selectable source geometry;
4. no intent.

Do not use DOM z-order or `pointer-events` target identity as the answer resolver.

## Dot placement

The three coordinates are authored map-presentation decisions, not runtime bounding-box guesses.

Choose one visually useful point for each Country by inspecting the bundled Oceania asset in its actual rendered task scale.

Placement rules:

- the dot should visually read as belonging to the Country/island group;
- prefer a central or recognizable part of the genuine island geography;
- avoid a point in open ocean far from the real group merely because it is the total `getBBox()` center;
- avoid unnecessary collision with another Country's dot/halo;
- all three should look consistent with native-dot placement at Oceania scale.

For Solomon Islands specifically, choose **one** representative synthetic point. Do not create a series of synthetic points along the archipelago.

The implementation agent may choose the exact coordinates from the current asset, but they must be recorded as explicit map metadata and covered by validation/tests.

## Styling

At rest in an active task, a synthetic dot should visually match the map's native tiny-dot baseline as closely as possible.

Do not invent a visibly different “synthetic” style.

Required parity:

- same base fill semantics as the Country at that moment;
- same stroke/ring rules;
- same normal radius;
- same hover scale;
- same highlighted/task-target treatment;
- same task-hover color behavior.

If the Country has a semantic/status fill, the synthetic marker should resolve its fill from the same current Country presentation rather than copying a fixed color.

## Scope and lifecycle

Synthetic dots are active only when task semantics require them.

### Answer-selection
Create/show the configured dot when:
- the map is in explicit answer-selection task mode; and
- that Country is in the current answer-selection candidate set; and
- the Country is not hidden.

### Task target
Create/show or emphasize the configured point when:
- the Country is the explicit task/location target according to the existing task-target contract.

### Otherwise
No generated synthetic-dot presentation.

On:
- next question;
- scope change;
- Country removal from candidate set;
- hidden-state change;
- map reload;
- zoom/map source change;
- controller destruction;

remove or recompute stale generated presentation/listeners/state through the same lifecycle as existing task assistance.

## Source/coordinate rules

Preserve the current SVG-coordinate invariant:

- authored point is tied to the source map asset;
- convert from source/group coordinates to the controller's root/render space through CTM/transform handling;
- screen-space marker size and hit radius remain stable through transformed Oceania groups;
- pointer-distance comparisons use one consistent coordinate space;
- resize, focus/expanded mode, responsive layout, and viewBox/zoom changes keep the marker aligned with the geography.

No Oceania-specific transform constants or pixel offsets.

## Files / ownership to inspect

Start from the current feature architecture and map seam, especially:

- `docs/architecture/features/WORLD_COUNTRIES.md`
- `src/features/world-countries/AGENTS.md`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/CountryLearningMap.tsx`
- `src/features/world-countries/maps/learningAnchors.ts`
- existing map-definition/registry code that identifies `mapId`
- bundled Oceania SVG
- `src/features/world-countries/maps/WorldCountriesMapClick.integration.test.tsx`
- relevant controller/map metadata tests

Do not expand discovery into unrelated feature areas.

## Cleanup / quality requirements

This addition must not regress the architecture established by Change Spec 0025.

Do not:

- add `if (country === 'Samoa')` logic to controller behavior;
- add per-workflow synthetic-dot logic;
- mutate bundled SVG markup as the source of truth;
- create duplicate task-pointer resolvers;
- create one synthetic marker per Solomon Islands component;
- make generic `selectableIds`, `highlightedIds`, click-handler presence, map level, or progress colors activate synthetic dots;
- make synthetic markers participate in normal map bounds/zoom;
- hardcode screen pixels for positions.

Prefer:

- one declarative map metadata registry;
- one generic synthetic-dot resolution path;
- one existing shared task-point rendering/pointer pipeline.

## Tests

### Metadata / validation

Add tests proving:

- Oceania has exactly one configured synthetic dot for `WS`;
- Oceania has exactly one configured synthetic dot for `SB`;
- Oceania has exactly one configured synthetic dot for `VU`;
- all three refer to valid Country/source geography in the current bundled map;
- configured points are finite and inside the map's usable viewBox;
- stale/missing source identity/fingerprint fails validation rather than silently relocating the dot;
- no duplicate `mapId + CountryId` synthetic-dot definitions are accepted.

### Controller / map behavior

Using real or representative SVG behavior, verify for each of the three:

- one synthetic marker exists at rest when the Country is in an active answer-selection scope;
- the marker is absent when answer-selection/task-target semantics are absent;
- the marker uses the same baseline size class/geometry constants as native tiny task markers;
- pointer inside its forgiving region resolves the correct Country;
- hover enlarges that exact synthetic point;
- task hover color is applied to the same Country;
- click at the same coordinates submits the same Country exactly once;
- pointer leave restores normal task presentation;
- genuine Country source geometry remains directly selectable;
- no additional geometry-derived tiny-component halos are generated for that Country;
- hidden/out-of-scope Country has no synthetic task point;
- map reload/scope change destroys stale generated state.

### Native parity regression

Add at least one comparison/regression against an existing native dot Country such as Nauru/Tonga:

- synthetic and native markers use the same task hover size rules;
- synthetic and native markers use the same hit-radius behavior;
- both use the same pointer-intent/click invariant;
- both use the same task-hover color mechanism.

Do not duplicate implementation solely to make the test pass.

### “Which country is this?”

For at least one synthetic Country:

- explicit task-target presentation uses its configured synthetic point;
- one persistent target is shown/emphasized;
- no set of per-island synthetic markers appears;
- changing the task target removes the old target correctly.

### Real workflow integration

Extend the real map-stack integration boundary so an Oceania Locate Country task includes these definitions:

```text
workflow
 -> CountryLearningMap
 -> SvgMapView
 -> SvgMapController
 -> bundled Oceania SVG + map metadata
```

At minimum verify Samoa, Solomon Islands, and Vanuatu are selectable through their synthetic dots without mocking away the controller.

## Manual browser verification gate

Before marking this Change Spec `Implemented`, manually verify in the running application:

### Locate Countries — Oceania

For **Samoa**:
- dot is clearly visible;
- forgiving hover is easy to acquire;
- dot enlarges;
- Samoa receives hover color;
- click answers Samoa.

Repeat the same checks for:
- **Solomon Islands**
- **Vanuatu**

Also verify:
- Solomon Islands has **one** synthetic dot, not a chain of generated dots;
- direct clicks on genuine island geometry still work;
- another answer being prompted does not disable these candidates' hover behavior;
- a native-dot Country in the same session still behaves identically;
- normal Oceania setup/geography/progress maps do not show the synthetic dots.

### Location-as-question

Trigger a question-target presentation for at least one of the three and confirm its synthetic point behaves like a native tiny task target.

## Acceptance criteria

- [ ] Samoa has exactly one task-scoped synthetic dot in Oceania.
- [ ] Solomon Islands has exactly one task-scoped synthetic dot in Oceania.
- [ ] Vanuatu has exactly one task-scoped synthetic dot in Oceania.
- [ ] Each is visibly present at native-dot-equivalent resting size during active answer-selection tasks.
- [ ] Each receives the same forgiving hit radius and hover enlargement as native tiny dots.
- [ ] Hovering each also applies the standard task-hover Country color.
- [ ] Hover Country and click-submitted Country are identical for the same pointer coordinates.
- [ ] Direct clicks on original source geography remain valid.
- [ ] Configured synthetic Countries do not also receive a collection of automatically derived component halos.
- [ ] Synthetic points can serve the existing explicit location/task-target presentation without conflating target and answer-selection state.
- [ ] No synthetic dots appear on ordinary Geography/setup/progress/navigation maps.
- [ ] No bundled SVG geography is edited to implement the feature.
- [ ] No Country-specific behavior is added to workflow/controller event logic.
- [ ] Coordinates remain correct through Oceania SVG transforms, resize, zoom, and expanded map mode.
- [ ] Metadata is validated against the current source asset and fails safely when stale.
- [ ] Existing native-dot Countries and the fixes from Change Spec 0025 remain unchanged.
- [ ] `npx vitest run src/features/world-countries` passes.
- [ ] `npm run typecheck` passes.
- [ ] Manual browser verification gate above is completed.

## Implementation and verification record

Implementation committed in `b8632be`.

- Synthetic-dot metadata lives in `src/features/world-countries/maps/syntheticDots.ts`.
- Samoa uses authored source-map point `(915.82, 327.45)`, aligned with the
  visible wrapped Samoa geometry in the bundled Oceania asset.
- Solomon Islands uses `(847.45, 322.37)` and Vanuatu uses `(869, 337.4)`.
- Each Country has exactly one configured synthetic dot. Configured dots
  replace automatic component-cloud derivation for that Country.
- Synthetic and native task points converge through the same pointer resolver,
  screen-space hit radius, marker/ring styling, task-hover color, click
  dispatch, transform handling, and lifecycle cleanup.
- Automated verification: `npx vitest run src/features/world-countries`
  passed with 82 files and 357 tests; `npm run typecheck` passed.
- Manual browser verification was attempted but could not run because the
  available browser runtime reported that no browser was available. The spec
  intentionally remains `Ready` and must not be marked `Implemented` until
  the manual Oceania checks pass.

The manual browser verification gate and its corresponding acceptance criterion
remain open.

## Documentation

Update `docs/architecture/features/WORLD_COUNTRIES.md` narrowly to state that `maps/` may own explicit task-scoped **synthetic dot metadata** for Countries whose genuine source geometry is not a usable dot-like learning target at the displayed map scale.

Document the invariant:

> Native geometry-derived dot points and authored synthetic dot points feed the same task interaction/presentation pipeline. Synthetic dots are task-scoped map presentation and never alter canonical geography or ordinary-map rendering.

Do not create a new ADR unless implementation discovers a required change to the ownership/invariants in ADR 0031 rather than merely implementing this capability.
