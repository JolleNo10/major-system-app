# Change Spec 0030 - Introduce the World Countries dark physical globe overview

- **Status:** Implemented
- **Date:** 2026-08-23
- **Related ADRs:** [ADR 0032 - Renderer-neutral World Countries geographic overview with an orthographic globe](../adr/0032-renderer-neutral-world-countries-geographic-overview.md)
- **Current-state docs:** [SYSTEM.md](../architecture/SYSTEM.md), [WORLD_COUNTRIES.md](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Make World Countries overview geography more tactile and enjoyable by replacing `GeographyOverviewMap`'s normal flat-map rendering with a performant, interactive D3 orthographic globe that feels like a colorful illuminated physical object inside Memo's dark interface.

Preserve all current overview selection/progress semantics and keep the existing SVG renderer for precision learning/answer tasks, including the implemented `Country for Shape` Drill mode.

## Visual reference

Primary direction: [0030 dark physical globe reference](assets/0030-dark-physical-globe-reference.png).

Treat the image as **visual direction, not a literal UI specification**.

Use the center and right panels for the intended dark-room globe material and regional-focus feel. Ignore generated copy, side-card layout, decorative stars, the light-mode globe stand, and any geographic-label inaccuracies in the concept image.

The implementation is successful when the globe feels like an illuminated Earth in a dark room, not when it pixel-matches the concept image.

## User-visible behavior

### Overview globe

Every existing `GeographyOverviewMap` surface uses the globe as its primary renderer while preserving its current semantic behavior.

This includes the current overview use cases such as:

- Today World mastery context;
- Drill setup World and Continent geography selection;
- other World/Continent overview/setup surfaces already expressed through `GeographyOverviewMap`.

The globe:

- uses real Country boundary geometry;
- is draggable to rotate when the owning map is interactive;
- presents World, Continent, and focused Subregion context on one spherical model;
- supports the existing Country/group hover and Country-click callback semantics;
- preserves caller-owned semantic Country colors, hidden state, highlights, muting, and accessible descriptions;
- works inside the existing `MapSurface` and expanded-center presentation.

The globe MUST NOT idle-spin.

### World view

At `level="world"` the full globe fits the available map surface.

Manual rotation changes only the view. It does not change selected geography.

Existing World overview group behavior remains intact:

- hovering a Country may resolve the same Continent hover group used today;
- the group receives neutral outline emphasis without replacing semantic Country fills;
- clicking a Country reports the same canonical Country to the caller so the caller can retain its existing Continent-selection behavior.

### Continent view

At `level="continent"` the same world globe rotates and zooms to frame the selected Continent.

Existing Continent overview semantics remain intact:

- Subregion hover-group behavior remains;
- selected Subregions / proficiency-selected Countries remain presented using current scope semantics;
- Country clicks continue to drive the caller's existing Subregion/geography behavior.

Changing from World to Continent MUST NOT require loading a different regional globe asset.

When React keeps the same overview component mounted, the movement should animate from the current globe pose rather than reset to a canonical starting pose first.

### Focused Subregion

When `focusedSubregionId` is supplied, the globe rotates/zooms to frame that Subregion.

- focused Countries remain visually prominent;
- surrounding geography remains present as context according to existing muted/hidden semantics;
- no separate regional map asset is loaded;
- the globe may be deeply zoomed/cropped while retaining visible curvature where practical.

The implementation must preserve current World Countries scope/status color rules. This change does **not** redefine muted Countries or proficiency/readiness state colors.

### Dark physical-globe appearance

The surrounding Memo UI remains dark and visually quiet. The globe itself remains visibly colorful and illuminated.

Required globe material cues:

- a rich blue ocean with clear light-facing and shadow-facing values;
- a restrained cool atmospheric rim around the sphere;
- soft upper-left illumination;
- lower/right limb darkening to create volume;
- warm, thin Country boundaries;
- subtle material/surface texture that does not obscure borders or semantic fills;
- no separate bright rectangular “map card” background when the existing center surface can provide the dark environment.

Directional visual palette for non-semantic material layers:

| Role | Directional value |
| --- | --- |
| Ocean highlight | `#6FB6E6` |
| Ocean shadow | `#214A6B` |
| Warm boundary | `#E7D7B4` |
| Atmosphere rim | `#7DB2E4` |

Optional decorative atlas land colors for **non-semantic** overview state may draw from:

- sand `#E3C78F`;
- sage `#A9C9A1`;
- clay `#D99E84`;
- lavender `#C7B6D9`.

These decorative land colors MUST NOT replace caller-owned learning/status fills.

### Semantic colors remain authoritative

Where the caller supplies `countryColorsById`, the resolved semantic color remains the Country's base fill.

The globe may apply a low-opacity, screen-space illumination/shadow layer over the sphere, but it must not transform semantic colors so strongly that Weak / Developing / Strong / Mastered / readiness / Recite distinctions become ambiguous.

Temporary pointer interaction preserves semantic fill and uses neutral outline emphasis. Do not introduce teal/cyan/neon hover fill as a new progress-like signal.

### Highlighted Country

Caller-owned Country highlight remains visible on the globe through restrained physical emphasis:

- brighter/wider warm-neutral boundary;
- optional subtle luminance/lift treatment;
- no large neon glow.

### Drag versus click

On interactive overview maps:

- a deliberate drag rotates the globe;
- a click/tap without meaningful drag activates the Country under the pointer;
- drag must not accidentally fire Country selection;
- starting a drag cancels any in-flight automatic camera movement and gives control to the user.

Touch behavior must not make a large globe trap normal page scrolling. The gesture implementation must preserve usable vertical page navigation while still allowing intentional globe rotation.

### Focus animation and reduced motion

Semantic World / Continent / Subregion focus requests animate from the current pose.

With reduced-motion preference:

- the final target orientation/scale is the same;
- movement is removed or materially shortened;
- no decorative continuous motion is introduced.

### Loading and fallback

Globe data/code are bundled locally; no third-party runtime request is needed.

If globe initialization fails on a `GeographyOverviewMap` surface:

- fall back to the existing SVG overview renderer;
- preserve current selection, colors, callbacks, and workflow state;
- avoid a globe/fallback remount loop;
- report load state through the existing map-state seam.

If both renderers fail, use the existing map-error behavior.

## Scope

- Add a feature-owned orthographic globe renderer under `src/features/world-countries/maps/`.
- Refactor `GeographyOverviewMap` so its workflow-facing props remain canonical/render-neutral while its primary renderer becomes the globe.
- Preserve the existing SVG overview path as fallback.
- Bundle a pre-simplified runtime Country-boundary artifact and map-owned canonical identity adapter/validation.
- Preserve current World and Continent hover-group behavior.
- Preserve current caller-provided colors, hidden/highlighted/muted state, accessible descriptions, and interaction callbacks.
- Support World, Continent, and focused-Subregion camera targets.
- Integrate with current `MapSurface` normal/expanded sizing.
- Add only the minimal D3/runtime geography dependencies required.
- Add asset source/provenance documentation beside the bundled globe geography.

## Interaction and states

### Non-interactive overview

When `interactive={false}`:

- the globe still displays semantic state and semantic focus;
- Country hover/click selection is disabled;
- drag is not required for comprehension;
- existing rail/list controls remain the accessible navigation path on interactive setup surfaces.

### Interactive overview

When interactive:

- existing group hover callbacks still fire with the same group IDs;
- group outline is presentation-only and does not alter selection state;
- Country click returns canonical Country identity through the current callback contract;
- hidden Countries cannot hover/click;
- focused Subregion restrictions remain equivalent to current overview behavior.

### Resizing / expanded center

- compute projection fit from the actual available map viewport;
- resizing/expanding does not reset selected geography or semantic focus;
- current manual orientation may be preserved when no new semantic focus request is made;
- no page-level horizontal/vertical overflow is introduced by the globe.

### Map data mismatch

A required canonical Country that cannot resolve to the bundled globe geography is a development/test failure, not a silent missing Country.

If a source dataset cannot provide adequate required Country coverage, use another source/detail level or pre-processing strategy before enabling the globe as primary overview renderer.

## Architecture constraints

- Follow ADR 0032.
- `GeographyOverviewMap` is the renderer-neutral overview seam; do not move globe/source IDs into Today, Drill, Recite, or Geography rails.
- Keep `CountryLearningMap` and `SvgMapController` as the precision/source-geometry path.
- `Country for Shape` from Change Spec 0029 MUST remain SVG source geometry. Do not render its isolated prompt from globe data.
- Preserve ADR 0031 task-pointer/tiny-Country behavior on the SVG path.
- Canonical Country identity remains in `data/`; source geography identity belongs in `maps/`.
- `geography/` remains authoritative for World -> Continent -> Subregion membership/order.
- Globe pose/gesture state is transient and MUST NOT be persisted.
- No new Drill mode, recall skill, proficiency state, evidence type, or persistence schema is introduced.
- Existing World Countries semantic map colors remain caller-owned; the globe renderer must not become a second status-calculation owner.
- No cross-feature mapping framework is introduced.

## Existing capabilities to reuse

- `maps/GeographyOverviewMap.tsx` — preserve this as the caller-facing overview contract and current group/selection semantics.
- `maps/geographyMapAdapter.ts` / `maps/countryMapIds.ts` — precedent that source-geometry identity translation belongs inside `maps/`; add globe-specific mapping rather than forcing SVG aliases onto globe data.
- `maps/SvgMapView.tsx` / `maps/SvgMapController.ts` — retain as SVG fallback and precision renderer.
- `maps/mapDefinitions.ts` — retain existing SVG source definitions for fallback/precision maps; the globe should not create one regional asset per Continent.
- `learning/CountryLearningMap.tsx` — leave as the SVG learning/precision map seam, including explicit visibility/zoom introduced for Country-for-Shape.
- `ui/MapSurface.tsx` — reuse normal/expanded map surface ownership.
- existing `GeographyOverviewMap` group IDs/callbacks and semantic color inputs.
- existing rails/lists as non-pointer navigation and selection fallback.

## Performance requirements

Performance is part of acceptance, not optional polish.

### Geometry/data

- pre-simplify/prepare the runtime geography artifact before runtime;
- do not ship raw high-detail source geography just because it is available;
- parse/prepare immutable globe geography once per stable asset lifecycle and cache safely where useful;
- do not perform display-name identity matching per animation frame.

### Rendering

- continuous rotation/focus redraw occurs at most once per `requestAnimationFrame`;
- pointer movement MUST NOT cause workflow-level React state updates on every move;
- do not apply blur/drop-shadow/turbulence filters separately to every Country path;
- do not use SVG `feTurbulence` or equivalent continuously recomputed procedural texture on the rotating Country layer;
- implement ocean lighting, atmosphere, and material texture primarily as sphere/screen-space layers that do not require per-Country heavy filter work;
- static texture assets/patterns are acceptable when locally bundled and visually restrained;
- cancel superseded focus animations and animation work on unmount.

### Dependency/runtime

- no CDN imports;
- no runtime geography fetch to a third party;
- prefer focused packages such as `d3-geo` plus only required helper packages over the full `d3` bundle;
- record added dependency and runtime geography asset sizes in the completion report.

## Edge cases

- multipart and archipelago Countries render all source components as one canonical Country state.
- Countries crossing the antimeridian render without rear-hemisphere artifacts.
- rear-hemisphere geometry is correctly clipped at the orthographic horizon.
- high-latitude Countries can be focused without invalid tilt or runaway scale.
- hidden Countries have no visible/interactive globe geometry.
- group hover never makes a hidden Country interactive.
- caller semantic colors remain stable through rotation, resize, and camera focus.
- rapid Continent/Subregion focus changes replace the previous animation cleanly.
- a drag started during focus animation takes control immediately.
- a normal click after a drag is not emitted accidentally.
- repeated resize/expand cycles do not accumulate listeners or animation loops.
- a globe initialization/data error falls back once to SVG without changing workflow state.
- tiny Countries that are difficult to click on the globe remain selectable through existing rails; this change does not add general-purpose globe pins.

## Out of scope

- moving `CountryLearningMap` to the globe;
- moving Locate/map-click answer selection to the globe;
- moving ADR 0031 task-assistance points/anchors/synthetic dots to the globe;
- moving `Country for Shape` to globe geometry;
- changing the exact source SVG assets used by existing precision/shape tasks;
- true WebGL/Three.js 3D;
- terrain/elevation/satellite imagery/roads/rivers/cities;
- capital or mnemonic pins;
- labels as a new globe feature beyond existing overview semantics;
- idle auto-rotation;
- user-selectable globe/flat preference;
- persisted globe camera state;
- redefining mastery/readiness/proficiency/Recite color semantics;
- editing canonical Country membership to match the globe dataset.

## Acceptance criteria

- [ ] Change Spec number/path is `0030`; existing implemented Change Spec 0029 Country-for-Shape is untouched.
- [ ] `GeographyOverviewMap` uses a locally bundled D3 orthographic globe as its primary renderer without changing its workflow-facing canonical Country/geography contract.
- [ ] `CountryLearningMap`, precision answer-selection maps, and Country-for-Shape remain on the existing SVG path.
- [ ] The globe renders real Country boundaries and validates required canonical Country coverage against its bundled source data.
- [ ] No D3 code or geography data is fetched from a CDN/third-party service at runtime.
- [ ] World overview fits the full globe and supports manual rotation on interactive surfaces.
- [ ] World hover/click retains existing Continent-group and canonical Country callback behavior.
- [ ] Continent overview rotates/zooms the same globe and retains existing Subregion group/selection behavior.
- [ ] `focusedSubregionId` rotates/zooms the globe to that Subregion without loading a regional globe asset.
- [ ] Caller-owned semantic Country colors, hidden IDs, highlighted IDs, muted/scope state, accessible descriptions, and interaction restrictions are preserved.
- [ ] Pointer hover/group emphasis preserves semantic fill and uses neutral outline-style emphasis rather than a new status-like fill.
- [ ] The dark-mode globe has visibly blue ocean, upper-left illumination, lower/right limb shading, warm thin Country borders, and a restrained cool atmosphere rim.
- [ ] The globe visually reads as a colorful physical object in the dark Memo center surface rather than a navy/charcoal dashboard map.
- [ ] No stars, pins, avatars, neon HUD/grid treatment, large glow, or idle rotation are introduced.
- [ ] A deliberate drag rotates without dispatching Country selection; a click/tap without meaningful drag retains Country activation.
- [ ] Touch interaction does not make the globe prevent normal page scrolling.
- [ ] Semantic focus animation starts from the current pose and is cancelled/replaced cleanly by newer focus or manual drag.
- [ ] Reduced-motion mode reaches the same final focus without normal full-duration animation.
- [ ] Resize and expanded-center presentation recompute fit without resetting workflow selection or accumulating listeners/RAF loops.
- [ ] Continuous drag/focus rendering is RAF-bounded and does not trigger workflow/application React state updates per pointer move.
- [ ] Heavy per-Country blur/turbulence/filter work is absent from the animation path.
- [ ] Globe initialization failure falls back to the existing SVG overview renderer with current workflow state/callbacks intact.
- [ ] Existing World Countries feature tests remain valid except where assertions intentionally change from SVG overview rendering to renderer-neutral/globe behavior.
- [ ] Manual browser verification covers Today World overview, Drill World setup, Drill Continent setup, group hover/click, focused Subregion, expand/collapse, semantic colors, drag/click discrimination, reduced motion, responsive/touch behavior, and an SVG Country-for-Shape regression.

## Source anchors

- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/maps/geographyMapAdapter.ts`
- `src/features/world-countries/maps/countryMapIds.ts`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/maps/mapDefinitions.ts`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/AGENTS.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

During implementation:

1. Update `docs/architecture/features/WORLD_COUNTRIES.md` only after the globe/overview boundary is implemented, as required by ADR 0032.
2. Update `src/features/world-countries/AGENTS.md` map-task routing so overview/globe work starts at `GeographyOverviewMap` / globe adapters and precision/shape/tiny-Country work starts at `CountryLearningMap` / `SvgMapController`.
3. Add a local globe geography source/provenance note beside the runtime asset, including source, source version/date, license/public-domain statement, transformation/simplification method, and identity mapping notes.
4. Do not change `docs/architecture/PERSISTENCE.md` unless implementation violates this spec by introducing persisted camera state.

When delivery is complete, mark this Change Spec `Implemented` and record verification evidence below.

## Verification

Implemented and verified on 2026-08-23.

- Evidence: focused globe geography, focus, renderer, overview, SVG fallback,
  and existing map regression tests passed during implementation; the full
  World Countries feature suite and final repository suite/build are recorded
  in the completion report. Manual browser/performance verification was not
  available in this environment and remains an explicit follow-up.
