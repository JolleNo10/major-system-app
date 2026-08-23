# Implementation prompt - Change Spec 0030

Implement **Change Spec 0030 - Introduce the World Countries dark physical globe overview** and **ADR 0032 - Renderer-neutral World Countries geographic overview with an orthographic globe** in repository `JolleNo10/major-system-app`.

Scope is strictly **World Countries / Countries** plus direct dependency/package changes required by this implementation.

## Mandatory loading

Before editing:

1. Read root `CLAUDE.md` and `AGENTS.md`.
2. Read `src/features/world-countries/AGENTS.md`.
3. Read `docs/architecture/features/WORLD_COUNTRIES.md`.
4. Read Change Spec 0030 in full.
5. Read ADR 0032 in full.
6. Read Change Spec 0029 only for the implemented `Country for Shape` SVG invariants this change must preserve.
7. Read ADR 0031 only for the SVG task-pointer/tiny-Country invariants this change must preserve.
8. Inspect the current implementation anchors named in Change Spec 0030. Stop discovery once the overview and SVG-learning seams are clear.

Do not inspect sibling features for examples.

## Critical correction from repository state

`docs/changes/0029-country-for-shape-drill-mode.md` already exists and is Implemented.

This globe work is **Change Spec 0030**. Do not overwrite, renumber, supersede, or reinterpret Change Spec 0029.

ADR `0032` is the new architectural decision number for this change.

## Architectural target

Keep two deliberate map seams:

```text
workflow overview/context
        |
GeographyOverviewMap
        |
  orthographic globe
        |
   SVG fallback

precision/learning/source-geometry tasks
        |
CountryLearningMap
        |
SvgMapView / SvgMapController
```

Do not create a general `MapRenderer` framework around all World Countries maps.

Do not make Today, Drill, Recite, Learning, or Practice choose the renderer themselves.

`GeographyOverviewMap` must remain canonical-Country/geography-facing. Renderer/source IDs stay under `maps/`.

## Globe technology

Implement a D3 orthographic 2.5D globe.

Preferred dependency shape:

- `d3-geo` for orthographic projection/path generation;
- add only narrowly required D3/helper packages for interpolation/easing if needed;
- do not add the full `d3` bundle solely for convenience.

Do not use:

- CDN module imports;
- MapLibre/Mapbox/Google Maps;
- Three.js/WebGL;
- iframe/external globe widgets;
- runtime third-party geography requests.

Because this changes dependencies/package metadata, final integration verification is Level D under root `AGENTS.md`; do not run full suite/build repeatedly during the inner loop.

## Geography asset

Choose an appropriate published Country-boundary source, preferably Natural Earth or another suitable public source with enough polygon coverage for the active World Countries population.

Create a committed runtime artifact that is already prepared for the app:

- pre-simplified before runtime;
- locally bundled;
- normalized/adapted to canonical `CountryId`;
- immutable at runtime;
- validated for required Country coverage.

Do not perform repeated display-name matching inside animation frames.

Add a source/provenance note beside the asset recording:

- source project;
- source release/date/version if available;
- source URL/reference;
- license/public-domain status;
- transformation/simplification process;
- source identity -> canonical `CountryId` mapping exceptions.

If the first chosen dataset omits required microstates/canonical Countries, do not silently ship missing geometry. Use a more suitable source/detail/preprocessing strategy or keep the globe from becoming the primary renderer until coverage validation passes.

## Overview semantics to preserve

Start from current `GeographyOverviewMap` behavior, not from the chat demo.

Preserve:

- `level: 'world' | 'continent'`;
- `continent`;
- `focusedSubregionId`;
- `selectedSubregionIds`;
- `selectedCountryIds`;
- `coloredCountryIds` / `countryColor` compatibility where still used;
- `countryColorsById`;
- `highlightedCountryIds`;
- `hiddenCountryIds`;
- `interactive`;
- hover-group IDs/callbacks;
- canonical `onCountryClick` behavior;
- accessible Country descriptions;
- map load-state callback.

At World level, preserve the current Continent hover-group semantics.

At Continent level, preserve the current Subregion hover-group semantics and selected geography/proficiency scope behavior.

Do not replace hover-group semantic fills. Use neutral outline-style emphasis consistent with current map status interaction rules.

## SVG behavior that must not move

Leave `CountryLearningMap` on SVG.

Specifically preserve:

- task answer-selection interaction points;
- representative learning anchors;
- synthetic task dots;
- pointer-intent precedence;
- source geometry discovery/styling;
- exact explicit visibility/zoom semantics;
- Country-for-Shape isolated real source geometry;
- Country-for-Shape same-mounted-SVG wrong-answer subregion reveal.

Do not make globe geometry the prompt source for `shape-to-country`.

## Visual target

Use `docs/changes/assets/0030-dark-physical-globe-reference.png` as visual direction.

Focus on the center and right panels only.

Ignore generated text, side-panel composition, stars, light-mode stand, and geographic-label mistakes.

Required visual result:

- dark/quiet Memo environment;
- globe is the visual hero and remains colorful;
- rich blue ocean;
- soft upper-left illumination;
- lower/right limb darkening;
- thin warm Country borders;
- restrained cool atmosphere rim;
- subtle physical surface texture;
- no bright rectangle behind the globe unless inherited from the existing surface;
- no pins;
- no avatars;
- no stars;
- no sci-fi grid/HUD;
- no neon glow;
- no idle spin.

Directional non-semantic material values:

```text
ocean highlight  #6FB6E6
ocean shadow     #214A6B
warm boundary    #E7D7B4
atmosphere       #7DB2E4
```

Optional decorative atlas land palette when no semantic Country fill exists:

```text
sand      #E3C78F
sage      #A9C9A1
clay      #D99E84
lavender  #C7B6D9
```

Caller semantic Country colors are authoritative and must not be replaced by the decorative palette.

Implement lighting/material mostly as screen/sphere-level layers. Avoid filter-heavy per-Country effects.

## Performance implementation rules

The artifact demos were not a performance reference. Implement for the actual app.

Required:

- pointer/rotation state stays renderer-local;
- do not `setState` in workflow/application React on every pointer move;
- coalesce redraw to at most one `requestAnimationFrame`;
- cancel superseded camera animation;
- cancel RAF/listeners on unmount;
- parse/prepare globe geometry once per stable asset lifecycle;
- do not reload geometry for normal color/selection/focus changes;
- do not use per-Country blur/drop-shadow/turbulence filters during rotation;
- do not use `feTurbulence` on the rotating map layer;
- keep ocean/atmosphere/light layers cheap and primarily fixed/screen-space;
- use pre-simplified source geometry, not runtime simplification of a high-detail source;
- preserve exact semantic event behavior even if rendering internals are optimized.

If SVG path redraw is still measurably poor after these requirements are met, stop and report profiling evidence before changing the architecture to Canvas/WebGL. Do not silently switch technologies.

## Camera/focus behavior

### World

Fit the whole sphere to the actual overview viewport.

### Continent

Use one world geometry asset. Rotate and scale to frame the selected Continent.

### Focused Subregion

Rotate/scale further to frame the Subregion. Deep zoom may crop the sphere while keeping spatial context.

### Transitions

- animate from current pose;
- do not reset to a canonical pose before moving;
- a new semantic focus supersedes the previous animation;
- manual drag immediately cancels automatic movement;
- reduced motion reaches the same final target without normal-duration movement.

Use geographic bounds/centroids or another robust geometry-driven focus calculation. Do not hard-code per-Subregion camera coordinates unless a documented exceptional case proves necessary.

## Drag/click/touch behavior

- use Pointer Events or an equivalent browser-native input path;
- establish a deliberate movement threshold separating click from drag;
- drag must never submit a Country click on release;
- hidden/out-of-scope interaction restrictions remain correct;
- pointer capture/cleanup must remain robust when leaving the globe bounds;
- do not trap vertical page scrolling on touch; preserve usable page navigation while supporting intentional globe rotation.

Do not add keyboard globe navigation merely because the renderer is new. Existing rail/list controls remain the accessible selection path; preserve current accessibility rather than inventing a second interaction model.

## Fallback behavior

Keep the current SVG overview capability available as a fallback inside the overview boundary.

On globe initialization/data failure:

1. switch once to SVG overview;
2. preserve all semantic props/callbacks;
3. preserve workflow state;
4. do not persist the fallback as a preference;
5. do not create an error/remount loop.

If SVG fallback also fails, surface the existing map error behavior.

## Tests

Add meaningful behavior tests rather than brittle visual/CSS snapshots.

### Geography asset / adapter

Cover:

- canonical `CountryId` mapping;
- required Country coverage;
- explicit source mapping exceptions;
- multipart Country grouping;
- unresolved/missing source Country failure;
- hidden Country lookup behavior where appropriate.

### Globe renderer

Cover:

- world render readiness;
- caller semantic fill mapping;
- hidden/highlighted/muted presentation state inputs;
- Country pointer hit -> canonical Country;
- group hover semantics;
- click vs drag threshold;
- focus update World -> Continent -> Subregion;
- newer focus cancels older focus;
- manual drag cancels focus animation;
- reduced motion final state;
- resize/expanded fit update;
- cleanup;
- initialization failure signaling.

Prefer testing pure geometry/focus/pointer helpers separately from DOM presentation where that yields stronger tests.

### Overview integration

Use real `GeographyOverviewMap` integration for:

- World Continent selection semantics;
- Continent Subregion semantics;
- current semantic colors;
- hidden/focused restrictions;
- SVG fallback.

### Regression

Keep existing SVG tests for:

- tiny-Country task assistance;
- learning anchors/synthetic dots;
- CountryLearningMap;
- Country-for-Shape isolated geometry and wrong-answer reveal.

Do not weaken tests just because overview rendering is no longer SVG-primary.

## Documentation after implementation

Update current-state docs in the same implementation change:

### `docs/architecture/features/WORLD_COUNTRIES.md`

Record that:

- `GeographyOverviewMap` owns renderer-neutral overview/context presentation;
- orthographic globe is the default overview renderer;
- SVG remains overview fallback;
- `CountryLearningMap` / `SvgMapController` remain precision/source-geometry paths;
- globe geography is locally bundled map-owned presentation data;
- globe pose is transient;
- Country-for-Shape and ADR 0031 remain SVG-specific.

### `src/features/world-countries/AGENTS.md`

Change map-task routing so:

- overview/globe tasks start at `maps/GeographyOverviewMap.tsx` and the globe renderer/adapter;
- precision/tiny-Country/task-pointer/Country-for-Shape tasks start at `learning/CountryLearningMap.tsx` / `maps/SvgMapController.ts`.

### Globe source note

Add the required source/provenance note beside the bundled globe asset.

Do not change persistence docs.

## Verification strategy

Follow root progressive verification.

### Inner loop

Run nearest map/adapter tests only as needed.

### Feature completion

Run:

```bash
npx vitest run src/features/world-countries
```

### Final dependency/build integration

Because package dependencies/build output change, run Level D verification once at the final integration boundary:

```bash
npm test
npm run build
```

Do not run a separate `npm run typecheck` immediately before `npm run build`; the build already runs TypeScript per repository policy.

If the environment cannot run the host toolchain, follow the documented Docker equivalent and rebuild the app image once after package/lockfile changes.

## Manual browser/performance verification

Verify in the actual app, not the artifact sandbox:

1. Today World mastery overview.
2. Drill World setup; hover/click a Continent through the globe.
3. Drill Continent setup; hover/toggle a Subregion.
4. A focused Subregion surface if currently exposed through `GeographyOverviewMap`.
5. Manual rotation and click-vs-drag behavior.
6. Expanded-center mode and return.
7. Semantic progress/readiness colors under globe lighting.
8. Reduced motion.
9. Narrow/touch viewport including normal page scrolling.
10. Navigate to Country-for-Shape and confirm the question still uses isolated bundled SVG source geometry and wrong-answer subregion reveal on that same SVG path.
11. Confirm no runtime CDN/third-party geography request.
12. Inspect performance while rotating and during deep focus: no overlapping RAF loops, no per-pointer React workflow rerender, and no filter-driven jank from Country paths.

Record qualitative browser/performance observations and any relevant profiler evidence in the completion report.

## Completion documentation

After implementation and verification:

1. mark Change Spec 0030 `Implemented` and add verification evidence;
2. add ADR 0032 `Confirmation`;
3. update `WORLD_COUNTRIES.md` and feature `AGENTS.md` current state;
4. include the globe source/provenance note;
5. keep Change Spec 0029 and its implemented Country-for-Shape documentation unchanged.

## Completion report

Report concisely:

- files added/changed;
- D3/helper dependencies added;
- source geography and provenance;
- runtime geography asset format and byte size;
- canonical Country mapping strategy and explicit exceptions;
- overview/globe component boundary;
- SVG fallback behavior;
- surfaces that now use the globe;
- surfaces intentionally remaining SVG;
- camera/focus strategy;
- performance strategy and browser observations;
- tests added/updated;
- feature/full/build verification results;
- documentation updates;
- deviations from Change Spec 0030 / ADR 0032 and why.
