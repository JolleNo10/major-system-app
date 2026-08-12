# Change Spec 0005 - Compact World Countries activity header

* **Status:** Implemented
* **Date:** 2026-08-12
* **Issue:** None.
* **Related ADRs:** None.
* **Current-state docs:** [System architecture](../architecture/SYSTEM.md), [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Reduce persistent World Countries header chrome so the active workflow content, especially map-centered Prepare and Drill screens, starts higher in the viewport.

Keep feature identity, activity navigation, and maintenance access, but present them as compact navigation rather than a multi-row introductory header.

## User-visible behavior

Replace the current header structure:

* `WORLD COUNTRIES`
* `Learn, practise and retain`
* separate `Prepare / Drill / Recite` row
* separate `Due review` action

with one compact feature-navigation row on desktop:

`World Countries    Prepare  Drill  Recite                        Due review`

The active activity remains visually selected.

`Due review` remains visually separated from the three user-directed activities because Maintenance is a separate system-directed review capability, not a fourth peer activity.

Remove `Learn, practise and retain` from the persistent World Countries header.

The resulting header should function as quiet application chrome. Workflow-specific content such as `Choose a Continent`, maps, learning content, and recall interfaces should retain the stronger visual hierarchy.

## Scope

* Recompose the World Countries layout header into one compact navigation row.
* Display **World Countries** as the feature identifier.
* Keep **Prepare**, **Drill**, and **Recite** as the primary activity navigation.
* Keep the current active-activity indication.
* Keep **Due review** as a separate action aligned to the opposite side of the activity navigation at desktop widths.
* Remove the persistent `Learn, practise and retain` tagline.
* Remove unnecessary vertical spacing and padding associated with the existing two-row header.
* Preserve the existing activity and Maintenance state transitions exactly.

## Interaction and states

### Activity navigation

* Prepare, Drill, and Recite continue to behave as one tablist.
* Exactly one of those activities is active at a time.
* Existing tab accessibility semantics and keyboard behavior remain intact.
* Switching activity continues to replace only the World Countries workflow body.

### Due review

* `Due review` remains outside the Prepare / Drill / Recite tablist.
* Activating it continues to open the existing Maintenance workflow.
* When Maintenance is active, `Due review` retains an active-state treatment.
* Maintenance must not be presented as a fourth normal activity tab.

### Desktop layout

At the normal center-column desktop width, the header should occupy one compact row:

1. World Countries identity.
2. Prepare / Drill / Recite navigation.
3. Due review action aligned toward the right edge.

The header must no longer reserve a separate row for introductory copy or another separate row solely for activity navigation.

The intended result is a materially smaller vertical footprint than the current header so the workflow heading and map/content move upward.

### Narrow layout

When the available width cannot reasonably contain all controls on one row:

* allow controlled wrapping rather than shrinking controls to unreadable sizes;
* preserve the grouping of Prepare / Drill / Recite;
* keep `Due review` identifiable as a separate action;
* avoid horizontal overflow.

The compact desktop header must not require a change to the existing `PageLayout` breakpoint or rail/drawer behavior.

## Architecture constraints

* Keep World Countries shell composition in `WorldCountries.tsx`.
* Continue publishing feature header content through the existing `useLayoutHeader` integration seam.
* Do not teach `PageLayout` about World Countries, activities, Maintenance, or feature-specific header behavior.
* Do not change the fixed-center PageLayout geometry, rail ownership, or responsive drawer model.
* Do not move Prepare / Drill / Recite into either rail.
* Do not move `Due review` into the Drill Current drill panel or another workflow-specific surface.
* Do not change World Countries workflow ownership or state semantics.

## Existing capabilities to reuse

* `WorldCountries.tsx` already owns the active World Countries area and activity transitions.
* `AREAS` remains the source for Prepare / Drill / Recite activity labels.
* `useLayoutHeader` remains the publication seam for feature-owned header chrome.
* `PageLayout` continues to render the published header above its center/rail content without feature-specific logic.

## Edge cases

* Entering Maintenance and then selecting Prepare, Drill, or Recite must continue to switch back to that workflow normally.
* The compact header must remain usable when browser text scaling increases or the viewport becomes narrower.
* Activity labels and Due review must not overlap or overflow.
* Header recomposition must not alter the vertical or horizontal geometry of the map, rails, or workflow body except that the body begins higher because the header consumes less vertical space.

## Out of scope

* Renaming Prepare, Drill, Recite, or Due review.
* Redefining Maintenance or merging it with Recite.
* Changing the default World Countries activity.
* Changing workflow state, persistence, learning progress, scheduling, map behavior, or drill behavior.
* Redesigning the global `PageLayout`.
* Changing rail widths, center-column width, or responsive breakpoints.
* Adding breadcrumbs or additional feature navigation.
* Reintroducing the removed tagline elsewhere as part of this change.
* Applying the same header treatment to unrelated features.

## Acceptance criteria

* [x] The persistent `Learn, practise and retain` tagline is removed.
* [x] At standard desktop center-column width, World Countries identity, Prepare / Drill / Recite navigation, and Due review are presented in one compact header row.
* [x] Prepare, Drill, and Recite remain one accessible tablist with the current activity visibly selected.
* [x] Due review remains outside that tablist and continues to open the existing Maintenance workflow.
* [x] Maintenance retains a visible active treatment without becoming a fourth activity tab.
* [x] The header consumes materially less vertical space than the current implementation and no longer contains separate title/tagline and activity-navigation rows.
* [x] Workflow content begins higher in the viewport without changing PageLayout center-column or rail geometry.
* [x] Narrow layouts wrap cleanly without horizontal overflow or unreadably compressed controls.
* [x] Prepare, Drill, Recite, and Maintenance workflow behavior is unchanged.
* [x] No changes are made to persistence, learning evidence, map behavior, scheduling, scoring, or workflow state models.
* [x] Focused World Countries shell/header tests cover activity navigation, Maintenance navigation, active states, and accessible tab semantics.
* [x] World Countries feature tests, TypeScript compilation, and the production build pass.

## Source anchors

* `src/features/world-countries/WorldCountries.tsx`
* `src/app/layout/PageLayout.tsx`
* `src/app/layout/PageLayoutContext.tsx`

`PageLayout.tsx` and `PageLayoutContext.tsx` are architectural/reference anchors. They should not require modification unless the current integration seam is found to prevent the specified feature-local composition.

## Documentation impact

No current-state architecture change is expected.

The existing architecture already assigns high-level Prepare, Drill, Recite, and Maintenance composition to `WorldCountries.tsx` and header/layout presentation to the existing app layout integration seam.

Update architecture documentation only if implementation requires changing one of those ownership boundaries. Otherwise this Change Spec is sufficient.

## Verification

* Implemented on 2026-08-12.
* Evidence:

  * `npx vitest run src/features/world-countries`
  * `npx tsc -b`
  * `npx vite build`
  * All 59 World Countries test files passed (218 tests); TypeScript and the production build passed in the Compose app container.
  * Focused shell tests cover the compact wrapping classes, activity tab semantics, activity switching, Maintenance navigation, and active-state treatment.
  * A live desktop/narrow browser check was unavailable because no browser connection was present in the execution environment. The responsive layout uses feature-local `flex-wrap`, `min-w-0`, `max-w-full`, and non-shrinking controls; no PageLayout geometry or breakpoint was changed.
