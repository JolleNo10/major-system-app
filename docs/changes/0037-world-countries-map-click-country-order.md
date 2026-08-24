# Change Spec 0037 - Map-based Country click-order authoring

- **Status:** Implemented
- **Date:** 2026-08-24
- **Issue:** None.
- **Related ADRs:** None.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)
- **Predecessor:** [Change Spec 0035 - Click-sequence Country order authoring](0035-world-countries-click-sequence-country-order.md)

## Goal

Make the map the primary pointer interaction for the existing Learning Subregion
`Click order` workflow.

Change Spec 0035 introduced a click-built Country sequence, but selection is
currently performed through Country rows in the left rail. When `Click order`
is active, the learner should instead be able to build and correct that same
sequence by clicking Countries directly on the map.

This is an extension of the existing Country-order authoring workflow. It must
reuse the same click-sequence draft, Save/Cancel semantics, and geography-order
persistence introduced by 0035.

No persistence migration is expected.

## User-visible behavior

Country-order editing still begins from the existing Learning Subregion rail:

```text
Learning order                         [ Edit order ]

1. Denmark
2. Norway
3. Sweden
...
```

After `Edit order`, the learner may still choose the existing `Click order`
mode.

While `Click order` is active:

- Countries in the current order-authoring membership are clickable on the map.
- Clicking an unselected Country assigns it the next sequence position.
- Clicking an already selected Country removes it from the sequence.
- Removing a Country closes the numbering gap for later selections.
- The rail continues to show sequence progress such as `5 / 12 selected`.
- Selected Countries visibly show their assigned sequence position.
- The assigned sequence positions are also visible on the map so the learner
  can construct and verify the order without repeatedly looking away from the
  map.
- `Save` remains disabled until every Country in the current membership is
  selected exactly once.
- Saving persists the same ordered Country IDs through the existing geography
  order-authoring seam.

Example:

```text
Click order                         3 / 5 selected

Map:
Norway [1]     Sweden [2]     Finland [3]
Denmark        Iceland

Rail:
[1] Norway
[ ] Denmark
[3] Finland
[2] Sweden
[ ] Iceland
```

Clicking Denmark on the map assigns position 4. Clicking Iceland assigns
position 5 and enables Save.

The map is the primary pointer surface during `Click order`. The rail remains
visible as sequence/status feedback and may remain an equivalent secondary
selection surface, including keyboard-accessible interaction. Both surfaces
must operate on the same sequence state.

## Scope

- Extend the existing Learning Subregion Country `Click order` mode so Country
  geometry on the map can append/remove entries from the active click sequence.
- Present partial click-sequence position numbers on the map while the sequence
  is being authored.
- Keep rail sequence numbers and progress synchronized with map interaction.
- Reuse the exact click-sequence rules introduced by Change Spec 0035.
- Make the full order-authoring Country membership selectable on the map while
  order editing is active, not merely the current staged-learning subset.
- Apply the behavior consistently when the shared Country-order editor is
  reached from Country Learning or Capital Learning.
- Preserve existing drag/drop order editing, canonical reset, map auto-order,
  Save/Cancel, save-error recovery, hover behavior, and persistence.
- Add integration coverage through the real Learning map click path.

## Interaction and states

### Normal Learning state

No change.

Map clicks continue to mean whatever the active Learning task currently owns.
This change must not make generic Learning maps into order editors.

### Order edit, drag/drop mode

No change.

The current order draft is presented in the rail and the existing map overview
remains available. Map clicks must not change order while drag/drop mode is
active.

### Entering `Click order`

Entering `Click order` keeps the existing 0035 behavior:

- start an empty click sequence over the current full Country-order membership;
- retain the pre-click full draft for restoration if the sequence is abandoned
  before completion;
- do not persist anything;
- keep Save disabled until the sequence is complete.

Additionally:

- the map becomes an active order-selection surface;
- every Country in the current order-authoring membership becomes selectable;
- Countries outside that membership must not be accepted into the sequence;
- partial sequence positions are rendered on their Countries on the map.

The user should not need to enter another screen, modal, overlay, or editor.

### Selecting from the map

A map Country activation resolves to the same canonical Country ID used by the
rail editor.

For a Country not already present in the click sequence:

1. append its Country ID to the click sequence;
2. assign it the next contiguous 1-based position;
3. update rail feedback immediately;
4. update the map's displayed position immediately.

For a Country already present in the sequence:

1. remove its Country ID;
2. renumber all later entries contiguously;
3. update the rail and map immediately;
4. disable Save again if the sequence is no longer complete.

Rapid or repeated clicks must never create duplicate Country IDs.

### Shared rail/map state

There must be one semantic click sequence.

Do not maintain one sequence for `InlineOrderEditor` and another sequence for
the map. A Country toggled from either surface must immediately produce the same
state on both surfaces.

If list-row activation remains enabled, this must be true:

```text
toggle from rail ─┐
                  ├─> one click-sequence state ─> rail feedback
toggle from map  ─┘                           └─> map feedback
```

The implementation may extract the 0035 click-sequence state into a reusable
controller/hook or lift ownership to the nearest common Learning workflow
owner. The exact internal shape is not prescribed, but sequence semantics must
have one owner.

### Map membership during order editing

The map already accepts a wider `overviewCountries` collection while order
editing is active.

During map-based click ordering, click resolution/selectability must use the
full order-authoring membership (`overviewCountries` or the equivalent
authoring collection), not only `scopeCountries` for the current staged
Learning set.

Example failure to prevent:

- Subregion contains 12 Countries.
- Current Learning stage contains 4 Countries.
- `Edit order` / `Click order` shows all 12 in the rail.
- Only those 4 staged Countries are clickable on the map.

The expected behavior is that all 12 Countries in the active order-authoring
membership can be selected.

Countries outside the active Subregion/order membership remain non-selectable
for this workflow.

### Partial order numbers on the map

While `Click order` is active:

- selected Countries show their assigned 1-based sequence number;
- unselected Countries do not show a fake/future position;
- removing a selected Country updates later displayed numbers immediately;
- the map must not display the previous full persisted/draft order as though it
  were the new click sequence.

The map presentation API should receive semantic Country-ID-to-position data
from the workflow/editor state rather than independently deriving a partial
sequence from rendered SVG order.

Existing Country-to-SVG mapping remains responsible for multipart Countries and
tiny-country interaction behavior.

### Leaving `Click order`

Preserve Change Spec 0035 semantics.

If the click sequence is incomplete and the user switches back to drag/drop:

- discard the incomplete click sequence;
- restore the full draft that existed when Click order began;
- remove click-order position labels from the map;
- disable order-selection map clicks.

If the click sequence is complete:

- it becomes the current full order draft;
- switching to drag/drop may continue from that order;
- map-specific click-order presentation is removed.

### Save

No new Save path.

Save is enabled only when every Country in the authoring membership appears
exactly once in the click sequence.

Save must continue to use the existing semantic geography order owner used by
drag/drop and 0035.

A failed Save keeps the complete sequence recoverable in the editor and on the
map until the user changes/cancels it.

### Cancel and context exit

Cancel or unmount:

- discards the unsaved click sequence;
- removes map click-order interaction/presentation;
- does not persist;
- preserves existing Learning state semantics.

### Hover and accessibility

Existing map hover and tiny-country target behavior must not regress.

The rail remains the keyboard-accessible representation of the click sequence.
Map interaction may remain pointer-oriented if the existing SVG map interaction
does not expose equivalent keyboard Country targets, but this change must not
remove the 0035 keyboard-operable rail controls.

Accessible map descriptions must not incorrectly announce persisted/full-order
positions when the visible map is presenting a partial click-built sequence.

## Architecture constraints

- Follow [World Countries](../architecture/features/WORLD_COUNTRIES.md).
- Treat Change Spec 0035 as the semantic source for click-sequence behavior.
- Country identity and order continue to use stable canonical Country IDs.
- Persist only through `geography/orderAuthoring.ts`.
- Do not add a second Country-order store or map-specific persistence.
- Do not put Learning workflow state inside `SvgMapController`.
- `SvgMapController`, `SvgMapView`, and `CountryLearningMap` remain generic map
  presentation/interaction seams; they may expose generic semantic inputs and
  callbacks but must not learn what "Country order authoring" means.
- The Learning workflow/editor owns the meaning of a Country click during
  `Click order`.
- There must be one click-sequence owner shared by rail and map input.
- Map selection during editing must be constrained to the active
  order-authoring membership.
- Existing tiny-country hit targets, multipart Country resolution, map zoom,
  fullscreen behavior, Drill interactions, and Learning answer interactions
  must remain intact.

No ADR is required. This adds a workflow-specific interaction over existing
map callbacks and the existing 0035 authoring state; it does not introduce a
new durable architectural boundary.

## Existing capabilities to reuse

- `src/features/world-countries/ui/InlineOrderEditor.tsx`
  - Owns the 0035 click-sequence semantics today.
  - Reuse/extract its toggle, completeness, restoration, Save gating, and
    sequence-position behavior rather than recreating them in the map flow.

- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
  - Existing Country-order authoring entry point shared by Country and Capital
    Learning.
  - Continue to own the visible rail/editor experience.

- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
  - Owns Learning map presentation state for Country Learning.
  - Already tracks order-edit mode and presents the wider order draft through
    the map overview.

- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
  - Equivalent Learning map presentation owner for Capital Learning.
  - Must receive the same map-order behavior because it uses the same Country
    ordering capability.

- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
  - Existing seam for caller-owned `CountryLearningMap` presentation overrides
    including `onCountryClick`.
  - Prefer extending/using this presentation seam rather than bypassing it.

- `src/features/world-countries/learning/CountryLearningMap.tsx`
  - Already accepts `onCountryClick` and resolves SVG IDs to canonical Country
    IDs.
  - Extend generic presentation only as needed for authoring membership and
    partial Country labels/positions.

- `src/features/world-countries/maps/SvgMapView.tsx`
  - Existing generic selectable/clickable SVG presentation seam.

- `src/features/world-countries/maps/geographyMapAdapter.ts`
  - Existing canonical Country ↔ SVG mapping and label helpers.

- `src/features/world-countries/geography/orderAuthoring.ts`
  - Existing semantic persistence owner. Reuse unchanged unless a genuine
    defect is discovered.

## Edge cases

- Clicking the same Country repeatedly never duplicates it.
- Removing position 2 from `[A, B, C, D]` produces positions `A=1, C=2, D=3`
  on both rail and map.
- A multipart Country maps all relevant SVG components to the same Country ID
  and toggles only one sequence entry.
- Tiny Countries continue to use the existing forgiving/synthetic interaction
  behavior where applicable.
- A Country visible on the map but outside the current Subregion/order
  membership cannot enter the sequence.
- A Country in the order membership remains selectable even when it is outside
  the current staged-learning subset.
- Switching to drag/drop with an incomplete sequence restores the pre-click
  full draft.
- Switching after a complete sequence keeps that complete order as the draft.
- Reset canonical and map auto-order clear/leave click mode exactly as defined
  by 0035 and remove partial map numbering.
- Save failure retains the complete sequence and corresponding map feedback.
- Cancel never persists.
- Leaving/unmounting the context never persists.
- Country and Capital Learning expose identical Country-order map behavior.
- Fullscreen/expanded map mode, if entered while Click order is active, must use
  the same active sequence and Country click callback rather than becoming a
  second or stale map state.
- Existing Drill map-click tasks are unaffected.

## Out of scope

- Changing the Country-order persistence schema.
- Changing canonical Country membership or canonical order.
- Removing drag/drop order editing.
- Removing list-row click ordering as an accessible/secondary input surface.
- Adding click-order authoring to World Continent order.
- Adding click-order authoring to Continent Subregion order.
- Changing map auto-order heuristics.
- Changing Learning progression, scheduler behavior, Drill evidence,
  proficiency, Recite, or mastery semantics.
- Reworking generic tiny-country target generation.
- Introducing a dedicated Country-order screen/modal.
- Retrofitting Change Spec 0035; this is a follow-up change.

## Acceptance criteria

- [ ] In Learning Subregion `Edit order` -> `Click order`, clicking an
      unselected Country on the map appends it to the next sequence position.
- [ ] Clicking an already selected Country on the map removes it and renumbers
      all later positions contiguously.
- [ ] Map and rail always reflect the same click sequence.
- [ ] Selected Countries display their current partial sequence positions on
      the map.
- [ ] Unselected Countries do not display sequence positions from the previous
      persisted/full order while Click order is active.
- [ ] All Countries in the active order-authoring membership are selectable on
      the map even when the current staged-learning subset is smaller.
- [ ] Countries outside the active order-authoring membership cannot be added
      through the map.
- [ ] Rapid/repeated activation cannot create duplicate Country IDs.
- [ ] Save remains disabled until all authoring Countries are selected exactly
      once.
- [ ] Saving a complete map-built sequence uses the same existing
      `saveSubregionCountryOrder`/geography-order seam and persists the exact
      selected order.
- [ ] Cancel and unmount never persist the sequence.
- [ ] Returning to drag/drop from an incomplete sequence restores the
      pre-click full draft.
- [ ] Returning to drag/drop from a complete sequence continues from the
      completed order.
- [ ] Reset canonical and map auto-order preserve their 0035 semantics and
      remove active partial-map ordering state.
- [ ] A failed Save leaves the completed sequence recoverable in both rail and
      map presentation.
- [ ] Country Learning and Capital Learning behave the same.
- [ ] Existing rail keyboard interaction remains available.
- [ ] Existing tiny-country/multipart Country map click behavior continues to
      resolve to one canonical Country selection.
- [ ] Existing Learning task map clicks and Drill map-click tasks do not gain
      order-authoring behavior outside Click order.
- [ ] Tests cover real map click -> Country ID -> click-sequence state ->
      rail/map feedback rather than only mocking the map callback.
- [ ] Current-state World Countries documentation reflects that Learning
      Subregion Country click-order authoring can use the map as its primary
      pointer surface.

## Source anchors

- `src/features/world-countries/ui/InlineOrderEditor.tsx`
- `src/features/world-countries/ui/InlineOrderEditor.test.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.test.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/maps/SvgMapView.tsx`
- `src/features/world-countries/maps/geographyMapAdapter.ts`
- `src/features/world-countries/maps/WorldCountriesMapClick.integration.test.tsx`
- `src/features/world-countries/geography/orderAuthoring.ts`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/changes/0035-world-countries-click-sequence-country-order.md`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` in the same change.

The current-state documentation should state that:

- Learning Subregion Country order can be authored by drag/drop or by a
  click-built sequence;
- during Click order, the map is the primary pointer selection surface;
- rail and map are two views/inputs over one temporary sequence;
- persistence remains owned by Geography order authoring.

Do not change unrelated architecture documents.

Do not modify Change Spec 0035; retain it as the historical description of the
implemented step that preceded this enhancement.

## Verification

Implemented evidence:

```text
npx vitest run src/features/world-countries/ui/InlineOrderEditor.test.tsx src/features/world-countries/learning/flows/GuidedLearningRails.test.tsx src/features/world-countries/maps/WorldCountriesMapClick.integration.test.tsx
npx vitest run src/features/world-countries
npm run typecheck
git diff --check
```

Results: focused map/rail coverage and the full World Countries suite passed;
the integration test exercises the real bundled
`CountryLearningMap -> SvgMapView -> SVG` path, full order-authoring membership,
out-of-membership rejection, add/remove/renumber behavior, and synchronized
rail/map labels. The full feature run passed 92 files and 435 tests; typecheck
and diff checks passed. A local Vite HTTP smoke check served the app
successfully. A browser executable/connector is not available in this
environment, so manual visual verification remains a follow-up for the
standard/expanded Learning Country and Capital flows.
