# ADR 0032 - Renderer-neutral World Countries geographic overview with an orthographic globe

- **Status:** Accepted
- **Date:** 2026-08-23

## Context

World Countries currently presents geography through SVG assets. `GeographyOverviewMap` translates canonical `CountryId` state into source-SVG IDs and delegates to `SvgMapView` / `SvgMapController`. `CountryLearningMap` extends the SVG path for learning, answer-selection assistance, explicit visibility/zoom, representative learning anchors, synthetic dots, and the isolated real-source geometry required by `Country for Shape`.

The feature now needs a richer world-scale presentation: a rotatable globe, continuous World -> Continent -> Subregion focus, and a physical illuminated-Earth visual in Memo's existing dark interface.

The new presentation must not make workflow owners depend on D3 coordinates, GeoJSON/TopoJSON IDs, projection state, or a second geography identity model. It also must not weaken the mature SVG-only contracts for precision answer selection, tiny-Country task assistance, or Country-for-Shape source geometry.

The durable choice is therefore where multiple renderers are allowed and which boundary owns them.

## Decision

### 1. `GeographyOverviewMap` is the renderer-neutral overview boundary

`src/features/world-countries/maps/GeographyOverviewMap.tsx` remains the workflow-facing seam for World/Continent geographic overview and context.

Its public semantics remain canonical and renderer-neutral:

- `CountryId` and `Country` identity;
- World / Continent / focused Subregion context;
- selected Subregions / Countries;
- caller-owned Country colors and accessible descriptions;
- highlighted, hidden, muted, interactive, hover-group, and click behavior;
- map load-state reporting.

Workflow owners MUST NOT depend on:

- SVG path IDs;
- GeoJSON/TopoJSON feature IDs;
- D3 projection coordinates;
- renderer DOM structure;
- camera rotation/scale.

Renderer-specific identity translation stays inside `maps/`.

### 2. Add a feature-owned D3 orthographic globe for overview/context presentation

World Countries adds a 2.5D globe based on D3 geographic projection/path primitives, using an orthographic projection.

The globe is feature-owned and locally rendered. It MUST NOT depend on:

- MapLibre / Mapbox / Google Maps;
- Three.js / WebGL for this change;
- an iframe;
- runtime CDN-loaded D3;
- runtime third-party geography requests.

Use the smallest D3 package surface required; do not adopt the full `d3` package merely for convenience.

### 3. Keep precision and source-geometry learning on the existing SVG renderer

`CountryLearningMap`, `SvgMapView`, and `SvgMapController` remain the authoritative renderer path for capabilities that depend on existing source-SVG semantics, including:

- map-click answer selection;
- ADR 0031 task-pointer intent and tiny-Country interaction points;
- representative learning anchors;
- map-owned synthetic task dots;
- learning sequence/name behavior tied to the current SVG source;
- explicit real-source Country shape isolation and same-SVG wrong-answer reveal for `Country for Shape`.

This ADR does not introduce a generic renderer abstraction around every World Countries map. It makes the geographic **overview** seam renderer-neutral while preserving the existing precision-learning seam.

A later decision may migrate a precision task to the globe only after equivalent interaction and learning invariants are defined and verified.

### 4. Renderer policy is centralized; workflows do not select renderers

Initial policy:

```text
GeographyOverviewMap
  -> orthographic globe by default
  -> existing SVG overview as recoverable fallback

CountryLearningMap / explicit SVG task semantics
  -> existing SVG renderer
```

Today, Drill, Recite, Learning, and Practice MUST NOT accumulate independent `globe` / `svg` branches.

A caller expresses semantic map intent through the existing overview or learning map seam. The owning map component chooses the renderer.

### 5. Globe geography is a bundled, compiled presentation asset keyed to canonical Country identity

The globe uses published real-world Country boundary data from an appropriate public source, preferably Natural Earth or a similarly suitable public dataset.

The implementation produces and commits a runtime geography artifact that is:

- bundled under World Countries map assets;
- simplified to an interactive level of detail before runtime;
- normalized or adapted to canonical World Countries `CountryId`;
- validated against the active/canonical Country population expected on the globe;
- accompanied by source/provenance documentation.

Runtime rendering must not infer canonical identity from display names on every frame.

Source-specific aliases or exceptions are map-owned adapter metadata. Canonical Country classification and membership MUST NOT be changed to accommodate the source dataset.

### 6. Existing semantic Country colors remain authoritative

The globe introduces material, ocean, atmosphere, and lighting presentation; it does not redefine learning status.

When the caller supplies a semantic Country color, that color is the authoritative base fill. Existing World Countries progress/readiness/Recite/status meanings must remain distinguishable.

Decorative atlas land colors may be used only on overview states where no caller-owned semantic fill is present and where doing so does not create a false learning-state meaning.

Hover/temporary interaction must preserve the resolved semantic fill and use the existing neutral-outline principle rather than introducing a new status-like hover color.

### 7. Globe camera/gesture state is transient renderer state

Rotation, projection scale, in-flight animation, drag state, and visual focus pose are presentation state.

They are not persisted and do not alter:

- geography selection/order;
- Drill/Recite queues;
- learning evidence or milestones;
- Today planning;
- proficiency or mastery.

A semantic World/Continent/Subregion focus may request a camera target. The current camera pose itself is not domain state.

### 8. Continuous interaction stays below React workflow state

Drag and focus animation are renderer-local imperative behavior.

- projection redraw is bounded by `requestAnimationFrame`;
- pointer movement does not cause application/workflow React state updates on every frame;
- superseded camera animations are cancelled;
- renderer cleanup cancels listeners/animation work.

Meaningful semantic events such as Country click, hover-group change, or load failure may still cross the component boundary.

## Consequences

- World Countries gains a distinctive globe without rewriting learning workflows around new geometry IDs.
- `GeographyOverviewMap` can change visual renderer while preserving current Today/Drill/Recite overview semantics.
- `CountryLearningMap` remains intentionally SVG-specific, avoiding a premature general map framework.
- Country-for-Shape remains exact source-SVG geometry and is not silently reinterpreted from globe polygons.
- The existing task-pointer/tiny-Country architecture remains intact.
- A new bundled geography asset and small D3 dependency surface are introduced and must be maintained/validated.
- Globe performance becomes an explicit renderer responsibility.
- Future globe-based precision tasks require a separate compatibility decision rather than ad-hoc workflow branching.

## Alternatives considered

### Replace all SVG maps with the globe

Rejected. Current SVG behavior includes mature task-pointer precedence, tiny-Country assistance, representative anchors, same-SVG declarative updates, and the exact source geometry required by Country-for-Shape. Reimplementing those contracts is not required to deliver the overview globe.

### Make every workflow choose between `globe` and `svg`

Rejected. Renderer choice would spread into Today, Drill, Recite, and Learning and make presentation technology part of workflow logic.

### Introduce a generic `MapRenderer` framework around both overview and learning maps now

Rejected. The repository already has two useful semantic seams: `GeographyOverviewMap` and `CountryLearningMap`. Generalizing both before a second precision renderer exists would add abstraction without demonstrated need.

### Use Three.js / WebGL

Rejected for this change. True 3D provides more lighting/elevation options but adds WebGL lifecycle, accessibility, testing, hit-testing, and device-performance complexity that is unnecessary for the selected 2.5D design.

### Use MapLibre or a hosted mapping service

Rejected. Memo needs Country learning objects and controlled presentation, not a general navigation/tile stack or runtime network dependency.

### Keep only flat SVG overview maps

Rejected. It cannot provide the desired continuous spherical orientation, direct rotation, or physical-globe experience.

## Current-state documentation impact

When implemented, update:

- `docs/architecture/features/WORLD_COUNTRIES.md`
  - describe `GeographyOverviewMap` as the renderer-neutral World/Continent overview boundary;
  - document the orthographic globe as the default overview renderer and SVG as fallback;
  - keep `CountryLearningMap` / `SvgMapController` as the precision/source-geometry renderer path;
  - document bundled globe geography ownership and transient camera state;
  - retain existing Country-for-Shape and ADR 0031 SVG invariants.

- `src/features/world-countries/AGENTS.md`
  - route overview/globe work through `GeographyOverviewMap` and the globe renderer/adapter;
  - route precision, tiny-Country, task-pointer, and Country-for-Shape map work through `CountryLearningMap` / `SvgMapController`.

No persistence documentation change is expected because globe pose is transient.

## Confirmation

Implemented and verified against the repository on 2026-08-23. The World
Countries feature suite (87 files, 389 tests), typecheck, full test suite, and
production build passed. Browser/performance inspection was unavailable in
this environment; the renderer has focused geometry, interaction, cleanup,
fallback, and semantic-state tests, with manual inspection remaining for the
listed responsive and profiler checks.
