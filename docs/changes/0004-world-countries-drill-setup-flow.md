# Change Spec 0004 - Reorganize World Countries Drill setup

- **Status:** Implemented
- **Date:** 2026-08-12
- **Issue:** None.
- **Current-state docs:** [System architecture](../architecture/SYSTEM.md), [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Make World Countries Drill setup read as one coherent flow: choose how to
practise, choose what geography to practise, review the resulting drill, and
start. A user must not have to configure the mode and geographic scope from
opposite sides of the map or from separate setup drawers.

## User-visible behavior

The setup screen has three distinct responsibilities:

1. The left rail is **Drill setup**. It presents Mode first and
   Geography/Drill scope second.
2. The center remains the map-centered workspace, including its guidance and
   mode-dependent progress presentation.
3. The right rail is **Current drill**. It confirms the configured drill and
   contains the existing order, guided-learning, and start actions.

The visual order communicates the intended flow without enforcing a wizard:
users may change mode or geography at any time during setup.

## Scope

- Move all four existing mode choices from the right rail into the top of the
  left rail at both World and Continent setup levels.
- Present the mode choices under a **Mode** section with two visible groups:
  - **Drill:** Countries, Countries + Capitals, Countries from Capitals.
  - **Practice:** Capitals.
- Replace the existing large descriptive mode cards with compact selectable
  rows. Each row displays its mode label. Display the selected mode's existing
  description once beneath the complete set of choices instead of repeating
  descriptions in every row.
- Keep World geography selection and Continent Drill-scope selection beneath
  the Mode section. Preserve their existing behavior, content, hover coupling,
  and map interactions.
- Keep the selected mode in the Current drill summary on the right as a
  read-only confirmation rendered without button, link, or other interactive
  affordances.
- Keep all existing drill-order, guided-learning, and Start actions on the
  right. Their behavior and availability rules remain unchanged.
- Change responsive drawer labels and grouping so the left drawer is
  **Drill setup** and the right drawer is **Current drill**.

## Interaction and states

### Mode selection

- Exactly one mode is selected at all times; this change does not introduce an
  unselected-mode state.
- A fresh user continues to start with **Countries** selected.
- A returning user continues to receive the last persisted mode.
- Changing mode continues to update the map's progress colors, accessible map
  descriptions, progress legend, Current drill summary, and eventual session.
- Mode choices form one native radio group so their mutually exclusive state
  and keyboard behavior are explicit. The group contains two visually and
  programmatically labelled subsections, Drill and Practice; all four radio
  inputs share the same name even though they appear in those two subsections.
- The selected mode description appears once after both subsections, at the
  bottom of the Mode section. The radio group is programmatically described by
  that text.

### Geography selection

- A fresh setup can have zero selected Subregions even though Countries is the
  selected mode. These are independent states.
- At World level, the left rail order is Mode followed by Drill geography.
- At Continent level, the left rail order is Mode followed by the hierarchy
  breadcrumb and Drill scope.
- Geography remains interactive regardless of mode. Selecting a mode does not
  gate, reset, or automatically change Continent or Subregion selection.
- Mode remains selected when navigating between the World and Continent setup
  levels.

### Review and launch

- The right rail contains no mode-selection controls.
- Current drill continues to show the selected scope and mode, expose ordered
  versus random order, show the applicable existing guided-learning actions,
  and provide Start Drill.
- Existing disabled states remain: a drill cannot start at World level or with
  zero selected Subregions.
- Starting a drill preserves the current behavior: setup controls disappear
  and the active recall interface takes over.

### Responsive layout

- At widths where PageLayout replaces rails with drawers, Mode and
  Geography/Drill scope appear together in one **Drill setup** drawer, in that
  order.
- The separate right drawer is **Current drill** and contains the review and
  launch content described above.
- Drawers remain user-opened; this change does not automatically cover the map.
- Mode selection must not exist in both drawers or require opening the Current
  drill drawer to configure the drill.

## Architecture constraints

- Keep the change inside the World Countries Drill workflow and the existing
  `PageLayout` rail integration seam. `PageLayout` remains unaware of Drill
  concepts.
- Preserve the map-centered Drill setup described by the
  [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md).
- Recompose existing mode definitions and callbacks; do not duplicate mode
  identifiers, labels, descriptions, or selection state.
- Preserve the existing Drill preference shape and storage behavior. No
  migration, storage-key change, or persistence-version change is required.
- Preserve active-session behavior, scheduling, scoring, evidence recording,
  progress derivation, and guided-learning rules.

## Existing capabilities to reuse

- `DrillSetup` already owns the setup composition and supplies `mode` and
  `onModeChange` to the rail publisher.
- `DrillSetupRails` already composes both setup levels and is the owner of the
  left/right rail content and responsive labels.
- `WORLD_COUNTRIES_DRILL_MODES` remains the single source of mode labels,
  descriptions, grouping identities, and skills.
- `CurrentDrillPanel` remains the review-and-launch surface and continues to
  resolve the selected mode label with `getDrillModeDefinition`.
- `PageLayout` and `useRails` continue to own rail geometry and drawer
  presentation; no shared-layout API change is needed.

## Edge cases

- With no selected Subregions, all four modes remain selectable, the chosen
  mode appears in Current drill, and Start remains disabled.
- At World level, all four modes remain selectable before a Continent is
  chosen, and choosing a Continent preserves the selected mode.
- Selecting Practice: Capitals retains its existing non-recording behavior and
  remains visually distinguishable from the three Drill modes.
- Long labels and the selected description must remain readable in the
  existing rail/drawer width without horizontal overflow.
- Reopening either responsive drawer reflects mode and geography changes made
  during the same setup visit.

## Out of scope

- Adding, removing, renaming, or redefining modes.
- Introducing a required first-choice step or wizard-style gating.
- Changing the default mode or the last-used preference behavior.
- Changing geography defaults, scope derivation, or selection persistence.
- Changing drill order, guided-learning eligibility, Start rules, active
  recall, results, scoring, evidence, or map-progress semantics.
- Moving mode controls into the center workspace.
- Redesigning PageLayout or changing its desktop breakpoint.

## Acceptance criteria

- [ ] At both World and Continent setup levels, the left rail begins with a
      Mode section and places Geography/Drill scope beneath it.
- [ ] Mode presents Countries, Countries + Capitals, and Countries from
      Capitals under Drill, and Capitals under Practice.
- [ ] All four modes are compact native radio rows in one group, exactly one
      row is checked, and only the selected mode's description is displayed
      once below both Drill and Practice.
- [ ] A fresh setup shows Countries selected while allowing zero selected
      Subregions; persisted users continue to receive their saved mode.
- [ ] Changing modes updates the progress map/legend and the read-only mode
      value in Current drill without changing the geographic selection.
- [ ] Navigating between World and Continent setup preserves the selected mode.
- [ ] The right rail contains Current drill, drill order, applicable existing
      guided-learning actions, and Start, with no mode-selection controls or
      interactive affordance on its read-only mode value.
- [ ] Start remains disabled at World level and when no Subregions are selected;
      existing guided-action availability is unchanged.
- [ ] Below the rail breakpoint, one Drill setup drawer contains mode before
      geography/scope and one Current drill drawer contains review/launch
      content.
- [ ] The Mode radio group and its Drill and Practice subsections expose their
      labels to assistive technology; the group is programmatically associated
      with the selected description; and its rows are keyboard accessible,
      expose checked state, and do not overflow the existing rail/drawer width.
- [ ] Rail and responsive-drawer tests assert the new **Drill setup**,
      **Current drill**, and **Mode** labels and radio-group semantics instead
      of the removed **Drill geography**, **Drill controls**, and **Recall
      modes** labels.
- [ ] Active Drill, results, persisted preference schema, scheduling, scoring,
      evidence recording, and map-progress semantics have no behavior changes.
- [ ] World Countries feature tests, TypeScript compilation, and the production
      build pass.

## Source anchors

- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/drill/DrillRails.tsx`
- `src/features/world-countries/drill/drillModes.ts`
- `src/features/world-countries/drill/drillPreferences.ts`
- `src/features/world-countries/drill/DrillSetup.test.tsx`
- `src/features/world-countries/drill/PageLayoutDrillSetup.test.tsx`
- `src/app/layout/PageLayout.tsx`

## Documentation impact

No architectural ownership or invariant changes are expected. During
implementation, confirm that the World Countries current-state description of
map-centered Drill rails remains accurate; update that document in the same
change only if the implemented composition makes its wording inaccurate.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-12.
- Evidence: `npm test` (90 test files, 404 tests), `npx tsc -b`, and
  `npm run build` all pass. Focused rail tests cover the left Mode/geography
  composition, native radio semantics, selected-description association,
  responsive drawer labels, and the read-only Current drill summary.
