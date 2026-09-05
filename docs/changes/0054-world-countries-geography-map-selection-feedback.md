# Change Spec 0054 - World Countries Geography Map Selection Feedback

- **Status:** Implemented
- **Date:** 2026-09-05
- **Issue:** None.
- **Related ADRs:** None. This is a presentation/interaction refinement inside existing World Countries map, geography-selection, Drill, and Recite ownership.
- **Current-state docs:** [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md)
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Make Continent-level Subregion selection immediately understandable on the map. A user must be able to distinguish persistent geographic selection from temporary hover and from Drill/Learning/Recite status colors without having to cross-check the left rail.

This is the first map-interaction refinement tranche. It improves selection feedback using existing map capabilities; it does not redesign setup, legends, zoom, or activity semantics.

## User-visible behavior

On a Continent overview map where Geography Subregions are selectable:

- Every selected Subregion keeps a persistent cyan/accent outline after pointer hover ends.
- Hover remains temporary: hovering any Country previews its whole Subregion using the existing grouped hover treatment and synchronized rail hover/focus behavior.
- Hovering a selected Subregion must not make its selected identity disappear. The temporary hover fill may appear, but the persistent selection outline remains visible.
- When exactly one Subregion is selected, show the Country names for the Countries in that Subregion. Example: selecting Central America shows its member Country names in addition to the persistent regional outline.
- Selecting zero or multiple Subregions does not automatically turn on all selected Country names. Persistent outlines plus the rail remain the compact multi-selection confirmation.
- Country status/progress/readiness colors remain visible. Selection must not replace semantic Country fill colors.
- Clicking any Country continues to select/deselect that Country's whole Subregion; unselected Subregions remain clickable while another Subregion is selected.

Clarify the Continent Drill setup helper copy so the action/result relationship is explicit. The copy should communicate that hover previews a Subregion and clicking any Country toggles that Subregion, rather than implying the Country itself is the selection unit.

## Scope

### Shared Continent overview selection presentation

Enhance `GeographyOverviewMap`'s existing `selectedSubregionIds` presentation rather than introducing Drill- or Recite-specific map state.

Use the existing Subregion hover groups and SVG group-outline capability to show both:

- temporary hovered group state; and
- persistent selected group state.

The selected group outline should use the existing World Countries cyan interaction/selection accent and be visually distinct from the current neutral hover outline. Do not introduce a new palette system solely for this change.

### Selected Country names

Derive automatic selected Country names from the existing `selectedSubregionIds` input:

- exactly one selected Subregion -> reveal names for all mapped Countries in that Subregion;
- zero or multiple selected Subregions -> no automatic selected-scope names.

Automatic names must be combined with, not replace, any explicit `namedCountryIds` supplied by a caller.

Do not render a new visible Continent or Subregion text label inside overview SVGs. Current architecture intentionally keeps hierarchy names in the rail; this change uses existing Country labels only.

### Shared Drill / Recite effect

The behavior applies wherever a Continent-level `GeographyOverviewMap` is already given `selectedSubregionIds`. Current expected consumers include Drill setup and Recite setup. Implement once in the shared map presentation instead of duplicating behavior in each workflow.

World-level map navigation, active Drill/Practice/Recite sessions, and Learning maps remain unchanged.

### Setup guidance

Update the Continent Drill setup map guidance to make the existing interaction semantics clear, for example:

`Selected 1 of 3 Subregions. Hover previews a Subregion; click any Country to select or deselect it.`

Keep the count dynamic and preserve the proficiency-scope-specific guidance path.

## Interaction and states

### No selected Subregion

- No persistent selection outline.
- No automatic Country names.
- Hover previews one Subregion using current grouped hover behavior.

### One selected Subregion

- All mapped Country geometry belonging to the Subregion is persistently outlined with the selection accent.
- Member Country names remain visible after hover leaves.
- Other Countries may retain the existing muted treatment.
- Hovering either the selected or an unselected Subregion preserves the selected outline.

### Multiple selected Subregions / Entire Continent

- Each selected Subregion receives a persistent selection outline.
- Do not automatically show every Country name solely because it is selected.
- Existing rail selection counts/check states remain authoritative and synchronized.

### Hover synchronization

Preserve the existing two-way relationship:

- rail hover/focus -> preview matching map group;
- map hover -> preview/highlight the matching rail group;
- pointer leave/blur clears only temporary hover, not selection.

Do not add a new tooltip/popover abstraction in this tranche. Existing Country hover-name behavior may remain.

### Semantic colors

Selection and progress must use separate visual channels:

- caller-provided `countryColorsById` continues to own Country fill/status color;
- geographic selection uses persistent group outline and optional Country names;
- hover uses the existing temporary grouped hover fill/outline.

A Country's semantic fill must not be overwritten merely because its Subregion is selected.

## Architecture constraints

- Follow `src/features/world-countries/AGENTS.md` and `docs/architecture/features/WORLD_COUNTRIES.md`.
- Keep `GeographyOverviewMap` workflow-neutral. It receives selected Subregion identity and owns its geographic presentation; Drill/Recite continue to own selection semantics and callbacks.
- Reuse `geographyMapAdapter.ts` for Country/Subregion-to-SVG translation and stable map group IDs.
- Reuse `SvgMapGroupOutline`, `SvgMapView` named IDs, and existing controller name visibility. Do not build a second SVG overlay/geometry system.
- Keep `selectedSubregionIds` as the source of truth for this presentation. Do not create duplicate React selection state or persistence.
- Do not infer stable domain identity from SVG labels/IDs.
- Do not add a topology-union/outer-boundary algorithm just to make a prettier outline; the existing group-outline layer is sufficient for this tranche.
- Preserve existing selection, proficiency, evidence, Learning Readiness, Recite status, ordering, and persistence contracts.

No ADR is required because ownership, data flow, and public boundaries remain unchanged.

## Existing capabilities to reuse

- `maps/GeographyOverviewMap.tsx` — already derives selected Countries, muted Countries, hover groups, selected SVG IDs, named IDs, and workflow-neutral map callbacks.
- `maps/geographyMapAdapter.ts` — existing Country/Subregion/SVG translation and group-ID helpers.
- `maps/SvgMapView.tsx` — declarative `groupOutlines` and `namedIds` bridge.
- `maps/SvgMapController.ts` — existing group-outline rendering and Country-name visibility.
- `ui/GeographySelectionRail.tsx` / `ui/GeographyHierarchyRow.tsx` — existing selected, hover, focus, and keyboard-accessible secondary surface.
- `drill/DrillSetup.tsx` — existing selected Subregion input and map helper copy.
- `recite/ReciteSetup.tsx` — existing shared Continent selection map consumer.

## Edge cases

- A selected Country that cannot be resolved to the current SVG must not break selection rendering for other Countries.
- Missing/unavailable Country label geometry must degrade to the persistent outline; selection must remain understandable.
- Caller-provided `namedCountryIds` must remain visible when automatic single-Subregion names are added or removed.
- A selected Subregion that is simultaneously hovered remains selected after pointer leave.
- Hovering or clicking an unselected Subregion while another is selected must remain possible.
- `selectedCountryIds` used by the alternative proficiency scope must retain its current behavior; do not reinterpret it as Subregion selection or automatically show names for it.
- Order-edit interaction suppression in Drill setup remains unchanged.
- Map loading/error behavior remains unchanged.

## Out of scope

- Progress vs proficiency/readiness legend redesign or a map-color mode switcher.
- New map tooltips, popovers, persistent Subregion-name overlays, or leader-line labels.
- Automatic focus/zoom, `Focus selection`, insets, or dense-island map redesign.
- Start-button/Activity panel scope-summary redesign.
- Entire Continent control redesign.
- World-level selection/navigation redesign.
- Active Drill/Practice/Recite/Learning map behavior.
- Changing Geography/proficiency selection rules or persistence.
- New map assets or edits to SVG source files.

## Acceptance criteria

- [ ] A selected Subregion on a Continent `GeographyOverviewMap` has a persistent cyan/accent group outline after hover ends.
- [ ] Every selected Subregion receives persistent outline treatment when multiple Subregions are selected.
- [ ] Hovering a selected Subregion does not remove its persistent selected identity; pointer leave clears hover only.
- [ ] Hovering an unselected Subregion while another is selected still previews that Subregion and keeps the existing map-to-rail synchronization.
- [ ] Exactly one selected Subregion automatically shows its member Country names.
- [ ] Zero or multiple selected Subregions do not automatically show all selected Country names.
- [ ] Automatic selected-scope names are unioned with caller-provided `namedCountryIds` rather than replacing them.
- [ ] `countryColorsById` semantic fills remain intact for selected Countries.
- [ ] An unselected Subregion remains clickable/toggleable while another Subregion is selected.
- [ ] Drill and Recite Continent setup receive the same improved selection presentation through the shared map seam; no workflow-specific duplicate map implementation is introduced.
- [ ] The Drill Continent helper copy clearly states that hover previews a Subregion and clicking a Country toggles that Subregion.
- [ ] World map navigation, proficiency `selectedCountryIds`, order editing, map loading/error behavior, active sessions, evidence, Learning state, and persistence remain unchanged.
- [ ] No visible custom Continent/Subregion names, new persistence, new SVG assets, or new geometry/topology subsystem are introduced.

## Source anchors

- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.test.tsx`
- `src/features/world-countries/maps/geographyMapAdapter.ts`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/SvgMapController.ts`
- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/drill/DrillSetup.test.tsx`
- `src/features/world-countries/recite/ReciteSetup.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.test.tsx`
- `src/features/world-countries/ui/GeographySelectionRail.tsx`
- `src/features/world-countries/ui/GeographyHierarchyRow.tsx`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

No architecture update is expected if implementation stays within the existing map/geography/UI ownership and continues to avoid visible custom Continent/Subregion labels. Update `WORLD_COUNTRIES.md` only if implementation materially changes a documented current-state contract; do not document incidental CSS or internal helper details.

## Verification

Implemented with the following focused verification:

- `npx vitest run src/features/world-countries/maps/GeographyOverviewMap.test.tsx src/features/world-countries/drill/DrillSetup.test.tsx` — 2 files passed, 37 tests passed.
- `git diff --check` — passed.
- Code inspection and the required two-axis review found no spec-axis findings; the standards review’s copy-only test concern was addressed by removing that brittle assertion.

Browser/manual verification was not run because it was not requested.

Use risk-proportionate focused verification. At minimum, add/adjust meaningful behavior coverage around shared map selection presentation and run the nearest affected tests, expected to include:

- `src/features/world-countries/maps/GeographyOverviewMap.test.tsx`
- `src/features/world-countries/drill/DrillSetup.test.tsx` when helper behavior/copy needs coverage
- the relevant Recite coordinator/setup test only if needed to protect the shared-consumer contract

Do not add brittle tests for exact CSS class strings or pixel values. Prefer assertions for persistent selected state, name visibility, semantic-fill preservation, and click/hover behavior. Do not automatically run feature-wide tests, global typecheck, lint, build, or browser/manual verification unless focused evidence is insufficient or the implementation expands the blast radius.
