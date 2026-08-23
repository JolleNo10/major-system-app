# Branch Tool Spec — Capital Authoring Reference Mode

**Repository:** `JolleNo10/major-system-app`  
**Branch:** `tool/capital-map-authoring`  
**Scope:** `World Countries` → branch-only `capital-authoring/` developer tooling  
**Status:** Ready for implementation  
**Numbered change spec:** No — this is intentionally branch-only tooling and is not intended to merge as a product feature.

## 1. Goal

Make manual capital placement materially faster and more reliable by giving the author geographic reference information while working in the capital map editor, especially when the map is expanded/fullscreen.

The editor must remain a **human-verification tool**. Reference information may suggest where a capital is, but it must never automatically mark a country reviewed, automatically save a placement, or become authoritative over the author's explicit decision.

The intended workflow is:

1. Select a country in the existing editor.
2. Expand the map when useful.
3. Turn on **Reference mode**.
4. See:
   - an approximate geographic target on the existing SVG;
   - a compact external-map reference for the canonical capital;
   - quick links to Google Maps, OpenStreetMap, and image search;
   - a simple human-readable approximate position clue.
5. Place/confirm the capital using the existing authoring interactions.
6. Navigate to the next country without closing Reference mode.

## 2. Existing implementation constraints

The implementation must work with the existing branch implementation rather than creating a parallel editor.

Relevant current files:

- `src/features/world-countries/capital-authoring/CapitalMapAuthoringEditor.tsx`
- `src/features/world-countries/capital-authoring/CapitalAuthoringMap.tsx`
- `src/features/world-countries/capital-authoring/capitalAuthoringTypes.ts`
- `src/features/world-countries/capital-authoring/capitalAuthoringCoordinates.ts`
- `src/features/world-countries/capital-authoring/capitalAuthoringState.ts`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/maps/countryMapIds.ts`
- `src/features/world-countries/maps/mapDefinitions.ts`
- `src/features/world-countries/data/countries.ts`

Current behavior to preserve:

- The editor uses the exact bundled World Countries SVG assets.
- Current Country geometry is highlighted.
- Detected SVG dot candidates are advisory until explicitly confirmed.
- A saved authoring anchor is visually separate from candidate dots.
- Manual point placement and keyboard nudging continue to work.
- `MapSurface` expands the same mounted map rather than creating a separate fullscreen editor.
- Export/import stores explicit authoring decisions in SVG user-space coordinates.

## 3. Architectural decision

Keep all reference-specific logic **inside `capital-authoring/`**.

Do not add geographic coordinate/reference concepts to the canonical `Country` model, production map controller, learning flows, Drill, Recite, or ordinary World Countries map presentation.

Do not change `MapSurface` merely to expose its internal `expanded` state. Reference mode should be usable on the same mounted authoring surface and should naturally become most useful when the user expands that surface.

A small generic `MapSurface` change is acceptable only if implementation proves it is unavoidable; it is not the intended design.

No ADR is required: this is branch-only developer tooling and does not establish production architecture.

## 4. Reference data

### 4.1 Checked-in authoring-only dataset

Add a branch-only reference dataset under `capital-authoring/`, for example:

`capitalAuthoringReferenceData.ts`

Key it by the canonical World Countries `country.id`.

Minimum data per supported country:

- canonical Country ID;
- capital latitude;
- capital longitude;
- country reference latitude;
- country reference longitude.

The country reference position is used only to estimate the capital's offset relative to the Country on the bundled SVG.

Suggested shape:

```ts
interface CapitalAuthoringGeoReference {
  countryId: string
  capital: { lat: number; lon: number }
  countryReference: { lat: number; lon: number }
}
```

Do **not** copy capital names into this dataset unless required for validation. `Country.capital` remains the canonical answer/name.

### 4.2 Source and runtime behavior

Use a reputable public geographic source to populate the checked-in coordinates. REST Countries / GeoNames-derived capital coordinates are acceptable for this authoring aid.

The final editor must **not fetch this coordinate dataset at runtime**. Check the required values into the branch so:

- the core authoring tool remains deterministic;
- tests require no network;
- a temporary API failure cannot block authoring;
- external data cannot silently change placement suggestions between sessions.

Record the source and retrieval date in comments adjacent to the dataset.

Reference coordinates are advisory. If a source disagrees with the canonical Country/capital model, do not silently mutate canonical data; resolve or explicitly omit that reference entry.

### 4.3 Validation

Add tests that catch accidental reference-data drift:

- keys must correspond to real canonical Country IDs;
- latitudes and longitudes must be valid finite ranges;
- every authorable canonical Country should have a reference entry where practical;
- missing entries are permitted only as explicit known exceptions and must not break the editor.

## 5. Reference mode UX

### 5.1 Toggle

Add a compact **Reference** toggle/action to the existing authoring controls associated with the map.

Behavior:

- default: off;
- state is transient and not persisted;
- when turned on, it stays on while Previous/Next or the country list changes the current Country;
- when turned off, all reference-only overlays/panels disappear;
- changing map definitions may leave Reference mode enabled, but the reference view must refresh to the newly selected Country/map.

Do not overload the shared `MapSurface` expand button.

### 5.2 Reference drawer/card

When Reference mode is enabled, show a compact floating reference panel associated with the map, optimized for expanded desktop use.

Preferred presentation:

- right-side overlay/drawer over unused map space;
- approximately 320–400 px wide on large desktop layouts;
- translucent/dark authoring-tool styling consistent with the current UI;
- must not resize or remount the SVG map when opened/closed;
- must not cover the map's expand/collapse affordance;
- must have an obvious close/reference-toggle action;
- must remain usable in standard map presentation, even if more compact.

Do not create a modal, route, page, second editor, or separate workflow.

### 5.3 Drawer content

Show:

- `{capital}` prominently;
- `{country}` secondary;
- label such as `Reference only` / `Approximate geographic reference`;
- an OpenStreetMap reference preview centered around the capital with a marker;
- the capital coordinates in small secondary text;
- a generated approximate positional clue from the local SVG reference prediction, e.g.:
  - `north-west area`;
  - `central area`;
  - `south-east area`;
- external actions:
  - **Google Maps**;
  - **OpenStreetMap**;
  - **Image search**.

The map preview is supporting evidence, not a placement control. Clicking/panning it must never update the authored SVG anchor.

### 5.4 External URL behavior

Build URLs locally from the current canonical capital/country and checked-in coordinates.

Preferred Google Maps URL form:

`https://www.google.com/maps/search/?api=1&query=<lat>,<lon>`

Preferred OSM target:

`https://www.openstreetmap.org/?mlat=<lat>&mlon=<lon>#map=<zoom>/<lat>/<lon>`

Preferred image search query:

`<capital> <country> map`

Open external targets in a new tab and use safe `rel` attributes.

Do not add a paid map SDK or API key.

### 5.5 OSM preview failure

External preview availability is best-effort.

If the iframe/map preview is blocked, offline, or unavailable:

- the authoring editor continues to function;
- the text reference and ghost target remain available;
- the external links remain available;
- do not show a blocking application error.

Lazy-create/load the external preview only while Reference mode is open.

## 6. Approximate ghost target on the existing SVG

### 6.1 Purpose

Show a clearly advisory marker giving the author an approximate place to inspect on the existing bundled SVG.

This is **not** an automatic capital placement.

Visually distinguish all three concepts:

- detected source/candidate dot: existing candidate styling;
- saved authored anchor: existing saved-anchor styling;
- geographic reference target: new ghost/reference styling.

Suggested reference styling: violet/purple ring + crosshair or dashed target, semi-transparent, with no pointer events.

Do not reuse red (saved anchor), green (selected candidate), cyan/blue (detected candidates), or the Country highlight style.

### 6.2 Projection approach

Do not pretend the SVG has a known formal map projection unless that is actually established from the source asset.

Use a lightweight **authoring heuristic** based on the geometry already present in the selected bundled SVG.

Recommended first implementation:

1. For each Country on the current authoring map that has reference data and measurable SVG geometry:
   - get a representative SVG point from the union/bounding geometry of the Country;
   - pair that SVG point with the checked-in geographic country reference `{lon, lat}`.
2. Fit a simple 2D affine geographic→SVG transform for the currently selected map using the available Country pairs.
3. For the current Country, use the target Country's actual SVG representative point as the local anchor and use the fitted transform primarily for the **capital delta relative to the country reference**, rather than trusting a global translated prediction:

```text
geoDelta = capitalGeo - countryReferenceGeo
svgDelta ≈ fittedLinearTransform(geoDelta)
ghostTarget = targetCountrySvgReference + svgDelta
```

This local anchoring reduces error caused by an imperfect global projection fit.

Implementation may use an equivalent least-squares formulation. Keep it small, deterministic, testable, and branch-local.

Do not introduce a map/projection library for this.

### 6.3 Guardrails and confidence

The ghost target must be allowed to say "no useful suggestion".

Suppress the ghost target when:

- the current Country lacks checked-in geographic reference data;
- current Country SVG geometry is missing/unmeasurable;
- too few calibration Countries exist for a stable transform;
- the fitted values are non-finite;
- the predicted target is implausibly far outside the current Country's SVG bounds.

A simple bounding-box sanity rule is sufficient. Do not spend branch-tool effort building geospatial topology.

Optionally expose an internal/reference confidence classification such as `good` / `rough` / `unavailable`, but do not present false precision to the author.

The UI copy should use words such as **Approximate** or **Reference**, never `Correct`, `Exact`, or `Detected capital`.

### 6.4 Positional clue

Derive the text clue from the ghost target relative to the current Country's SVG bounds.

Use a simple 3×3 classification:

- north-west / north / north-east;
- west / central / east;
- south-west / south / south-east.

Use `area` or equivalent wording, e.g. `north-east area`.

Do not infer `coast`, `interior`, `border`, or other geography that the heuristic does not actually know.

## 7. Interaction rules

Reference mode must not change the existing authoring decision model.

Specifically:

- clicking the ghost target does nothing;
- opening/panning the external reference map does nothing to the SVG;
- enabling Reference mode does not create a placement;
- navigating with Previous/Next does not create a placement;
- an existing placement remains unchanged when Reference mode is toggled;
- candidate confirmation still requires the existing explicit action;
- manual placement still requires the existing manual point interaction;
- Mark unresolved and Clear/reopen remain unchanged;
- arrow-key nudging continues to move only an already saved anchor.

If the author manually clicks near/on the ghost target using the existing manual placement mechanism, that click is an ordinary explicit manual decision and may save normally.

## 8. Export/import and persistence

**Do not change the authoring export schema for this feature.**

Keep:

`CAPITAL_AUTHORING_SCHEMA_VERSION = 1`

Reference coordinates, external URLs, fitted transforms, ghost targets, panel state, and confidence values must not be serialized into `CapitalAuthoringDocument`.

The portable output should continue to represent only what the human author actually decided, including the existing decision provenance around dots/manual placement.

No new durable browser persistence is needed for Reference mode.

## 9. Suggested code organization

Keep branch-only concerns cohesive. Exact names may vary, but a structure similar to this is preferred:

```text
capital-authoring/
  CapitalMapAuthoringEditor.tsx
  CapitalAuthoringMap.tsx
  CapitalAuthoringReferencePanel.tsx       # new
  capitalAuthoringReferenceData.ts         # new checked-in data
  capitalAuthoringReferenceProjection.ts   # new pure math/heuristic
  capitalAuthoringReferenceUrls.ts         # optional small pure helper
  ...tests
```

Responsibilities:

### `CapitalMapAuthoringEditor.tsx`

Own:

- transient Reference mode open/closed state;
- composition of panel + map;
- passing current reference presentation to the map;
- preserving reference mode across Country navigation.

Do not move existing authoring state/persistence logic into the reference implementation.

### `CapitalAuthoringMap.tsx`

Own/render:

- reference ghost target as part of the SVG authoring overlay;
- no persistence semantics;
- no runtime internet lookup.

Prefer extending the existing authoring-overlay render pass rather than creating a second competing SVG mutation system.

### `capitalAuthoringReferenceProjection.ts`

Pure/testable logic for:

- collecting calibration pairs;
- fitting/calculating the approximate transform;
- target prediction;
- sanity checking;
- relative 3×3 clue classification.

Do not import React here.

### `CapitalAuthoringReferencePanel.tsx`

Own:

- visual reference panel;
- OSM iframe/reference preview;
- external links;
- fallback presentation.

It does not own authoring placement state.

## 10. Performance and lifecycle

The normal editor should incur minimal additional work when Reference mode is off.

Requirements:

- no external iframe/network content until Reference mode is enabled;
- do not remount/reload the bundled SVG merely because Reference mode changes;
- memoize/recompute the fitted map transform only when the loaded map/source/reference geometry materially changes;
- moving between Countries should update the target and panel without reparsing the entire application state;
- no timers/polling/background network calls.

## 11. Accessibility

- Reference toggle must have clear accessible state (`aria-pressed`, `aria-expanded`, or equivalent appropriate semantics).
- External links must have descriptive accessible names.
- The ghost target is visual guidance and should be `aria-hidden` unless a useful textual equivalent is deliberately provided.
- The textual approximate position clue provides the non-visual equivalent.
- The OSM preview should have a useful title.
- Keyboard authoring behavior must remain intact.

## 12. Testing

Add focused tests close to the new branch tool.

### Pure reference/projection tests

Cover at minimum:

- valid affine/local-delta prediction from deterministic synthetic calibration points;
- prediction remains finite;
- insufficient calibration returns unavailable rather than nonsense;
- missing reference data returns unavailable;
- implausible/out-of-bounds prediction is suppressed or classified unavailable;
- 3×3 position labels produce expected north-west/central/etc. values.

### URL tests

Cover:

- Google Maps URL contains the correct coordinates;
- OSM URL contains the correct coordinates;
- image search uses the canonical Country/capital strings and correct encoding.

### Reference-data tests

Cover:

- valid canonical IDs;
- coordinate ranges;
- duplicate IDs impossible/absent;
- expected authoring population has reference data except explicit exceptions.

### UI tests

Cover at minimum:

- Reference mode is off initially;
- turning it on shows current Country/capital reference information;
- changing Country while open updates the panel and keeps the mode open;
- turning it off removes reference UI;
- no placement is created by toggling Reference mode;
- existing authored placement is unchanged by toggling or external-reference rendering;
- missing reference data produces a graceful unavailable state;
- external preview is not rendered while Reference mode is closed.

### Regression tests

Preserve existing tests for:

- candidate detection;
- candidate confirmation;
- manual placement;
- import/export;
- local storage behavior;
- SVG user-space coordinates.

## 13. Validation commands

Follow the World Countries feature bootstrap and progressive verification policy.

During implementation, run the narrowest relevant tests first, then near completion:

```bash
npx vitest run src/features/world-countries/capital-authoring
npx vitest run src/features/world-countries
npm run typecheck
```

A full production build is not required unless implementation crosses an integration boundary that makes it necessary.

## 14. Non-goals

Do not turn this branch tool into a production feature.

Explicitly out of scope:

- changing normal World Countries map behavior;
- adding latitude/longitude to the production Country domain model;
- changing `SvgMapController` production contracts for this tool;
- changing learning anchors or synthetic-dot production behavior;
- automatically committing capital placements;
- automatically accepting source-map dots based on geographic proximity;
- changing the v1 authoring export format;
- persisting Reference mode;
- adding a commercial map SDK/API key;
- geocoding at runtime;
- building an exact map projection/geospatial engine;
- trying to infer coastline/border semantics from the approximation;
- broad refactors outside `World Countries`.

## 15. Acceptance criteria

The work is complete when all of the following are true:

1. The branch-only capital editor exposes a transient Reference mode.
2. Reference mode works naturally while the shared map is expanded/fullscreen and does not require a separate screen.
3. The current canonical capital/country is shown in a compact reference panel.
4. The panel provides an OSM preview plus Google Maps, OSM, and image-search actions.
5. External content is loaded only on demand and failure does not block authoring.
6. A visually distinct approximate ghost target is shown on the existing SVG when a defensible reference can be calculated.
7. The target is explicitly advisory and may be unavailable when confidence/inputs are insufficient.
8. Reference mode remains open while navigating Countries and refreshes to the current Country.
9. The reference target/panel never creates or mutates an authoring placement by itself.
10. Manual placement, dot confirmation, unresolved handling, clearing, arrow nudging, navigation, and existing review filters continue to work.
11. `CAPITAL_AUTHORING_SCHEMA_VERSION` remains `1` and exported JSON contains no reference-only data.
12. Coordinate/reference data is checked into the branch and is not fetched from an external API during normal editor operation.
13. New projection/data/UI tests pass along with existing `capital-authoring` tests.
14. World Countries feature tests and TypeScript typecheck pass.

## 16. Implementation priority

Implement in this order to keep the work debuggable:

1. Add and validate checked-in geographic reference data.
2. Add pure URL helpers and the reference panel with external links/OSM preview.
3. Wire transient Reference mode into the existing editor.
4. Implement the pure geographic→SVG advisory projection heuristic with synthetic tests.
5. Extend the existing SVG authoring overlay with the non-interactive ghost target.
6. Add the 3×3 textual positional clue.
7. Add UI/regression coverage and run feature validation.

If the projection heuristic proves materially misleading on a map, do **not** compensate with hardcoded per-Country authored capital coordinates: either improve the generic branch-local heuristic or suppress the ghost target for cases that cannot be predicted responsibly. The external reference panel remains the reliable fallback.
