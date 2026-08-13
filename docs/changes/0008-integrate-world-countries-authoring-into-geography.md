# Change Spec 0008 - Integrate World Countries authoring into Geography

- **Status:** Implemented
- **Date:** 2026-08-13
- **Issue:** None.
- **Related ADRs:** [ADR 0025 - Contextual World Countries geography authoring](../adr/0025-contextual-world-countries-geography-authoring.md)
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Remove the separate World Countries Setup experience and make order and mnemonic authoring available directly from the Geography context where the learner sees and uses them. Hierarchy order must be visible in normal map/navigation presentation, and `Edit order` must turn the existing left-rail list into an in-place drag-and-drop editor rather than opening another panel.

## User-visible behavior

### No separate Setup workflow

Remove the user-facing Setup workspace and its `Open Setup` / `Setup` navigation actions.

The user remains in the normal World Countries Geography, Drill, or Learning context while viewing and editing structural information.

For this change, World and Continent Geography are the existing Drill
Geography views, while Country ordering is authored from the existing Learning
Subregion context. Drill navigation and active session behavior remain
unchanged.

Do not replace Setup with another configuration page, modal hierarchy, or configuration-only Subregion screen.

### Order is visible in normal Geography presentation

The effective order is visible wherever the corresponding hierarchy is presented:

```text
World view
1. Africa
2. Europe
3. Asia
...

Continent view
1. Northern Europe
2. Western Europe
3. Southern Europe
...

Subregion view
1. Denmark
2. Norway
3. Sweden
...
```

The left rail shows the sequence number beside each visible hierarchy member.

Normal map presentation also shows the effective sequence number for the hierarchy represented by the current map:

```text
World map      -> Continent sequence numbers
Continent map  -> Subregion sequence numbers
Subregion map  -> Country sequence numbers
```

Map numbering is presentation only. It derives from effective order and must not become a second order source of truth.

For grouped World/Continent maps, show one sequence annotation per current hierarchy member rather than repeating the same group number on every Country polygon. Exact label placement is maps-owned, but labels must remain legible and must not interfere with map click/hover behavior.

### Edit order stays in the left rail

At every hierarchy level that displays an ordered list, place `Edit order` in the left rail adjacent to that list heading.

Examples:

```text
Geography                         [ Edit order ]

1. Africa
2. Europe
3. Asia
```

```text
Learning order                    [ Edit order ]

1. Denmark
2. Norway
3. Sweden
```

The action edits exactly the hierarchy represented by the current list:

- World list -> Continent order.
- Continent list -> Subregion order.
- Subregion list -> Country order.

Do not expose a separate global `Edit Country order` action from World or Continent views.

### Inline reorder mode

Clicking `Edit order` transforms the **existing left-rail list in place** into reorder mode.

Do not open:

- a modal;
- an overlay;
- a drawer;
- a second rail;
- a side panel;
- a separate order screen.

In reorder mode:

```text
Learning order                 [ Save ] [ Cancel ]

☰ 1. Denmark
☰ 2. Norway
☰ 3. Sweden
☰ 4. Finland
```

Requirements:

- rows are draggable directly in the rail;
- visible drag handles appear;
- keyboard reordering remains supported;
- sequence numbers update immediately while reordering;
- map sequence annotations reflect the draft order while edit mode is active;
- `Save` persists the draft through the existing geography-order persistence capability;
- `Cancel` restores the persisted effective order;
- leaving/unmounting the context without saving must not persist the draft.

When reorder mode starts, the rows receive a brief, subtle movement cue to communicate that they can now be moved. Use a short jiggle/shake animation, approximately one second, then stop. Do not continuously animate draggable rows.

Respect `prefers-reduced-motion`: with reduced motion enabled, skip the jiggle and rely on the drag handles and changed controls/state to communicate editability.

### Learning Subregion order editing

Learn Countries and Learn Capitals already enter a Subregion context and show the Countries for that Subregion.

In that existing Subregion left rail:

- keep the Country list numbered;
- add `Edit order` beside the order/list heading;
- edit the Country order inline in that same list;
- do not navigate to Setup or another panel.

Country ordering is available while the stable Subregion context/list is shown. It is not necessary to expose reordering during quiet/active recall states where the left-rail order list is intentionally hidden.

After Save, subsequent Learning presentation for that Subregion must consume the newly persisted effective Country order through `geography/`. Do not create Learning-owned order state.

### Drill Country-order guidance

Drill keeps its existing World/Continent Geography navigation, map behavior,
selection behavior, session rails, and active question queue. This change does
not add a Drill Subregion detail view, a Drill Country list, or a Country-level
Drill scope.

In the existing Drill setup/map Geography context, show concise explanatory
text that Country order can be edited from Learn Countries. This is guidance
only: it must not add a navigation shortcut or change Drill behavior.

Drill continues to consume the effective Country order through `geography/`
when a new session is constructed. An already-running Drill question queue is
not mutated by order changes made elsewhere.

### Edit mnemonics

Add a contextual `Edit mnemonics` action in the left rail.

For this change, the supported target is the existing Subregion mnemonic. The
action is available whenever the stable Learning Subregion left rail and its
Country list are visible. Hide the action during ordered recall, active recall,
and completion states. Country-capital mnemonic authoring and new
World/Continent mnemonic targets are out of scope.

This change does not redesign the mnemonic editor. Reuse/re-home the existing authoring capability as needed so Drill and Learning do not import obsolete `setup/` internals.

The no-panel requirement in this Change Spec applies specifically to **Edit order**. Existing mnemonic authoring presentation may remain panel/overlay based unless separately changed.

## Scope

- Remove the user-facing Setup workflow and shell navigation seam.
- Make hierarchy order visible in normal left-rail Geography presentation.
- Add effective hierarchy sequence annotations to normal map presentation.
- Add contextual `Edit order` actions to World, Continent, and Subregion ordered rail lists.
- Implement in-place left-rail drag/drop editing with Save/Cancel, draft numbering, keyboard support, and a brief motion cue.
- Surface Country-order editing in existing Learning Subregion views.
- Add explanatory Country-order guidance in the existing Drill setup/map Geography context.
- Add contextual `Edit mnemonics` in the stable Learning Subregion left rail.
- Retain existing Reset canonical order and map auto-order capabilities as draft-only actions.
- Re-home reusable order/mnemonic authoring behavior currently trapped under `setup/`.
- Remove obsolete Setup screens/components once no active code depends on them.
- Update current-state World Countries architecture after implementation.

No persistence migration is expected.

## Interaction and states

### View mode

The rail shows:

- heading/context;
- `Edit order`;
- ordered hierarchy rows with sequence numbers.

Rows are not draggable.

### Entering edit mode

On `Edit order`:

- preserve the current Geography/activity context;
- initialize a draft from the current effective order;
- replace `Edit order` with explicit Save/Cancel controls;
- expose drag handles and keyboard reordering semantics;
- play the one-time movement cue unless reduced motion is requested.

Entering edit mode must not start an activity, change Drill selection, change Learning progress, or write persistence.

### Editing

During editing:

- drag/drop and keyboard operations update only the draft;
- visible rail numbers update immediately;
- map order annotations update from the same draft;
- membership is fixed: ordering may reorder existing members but cannot add/remove Countries, Subregions, or Continents.

Retain existing Reset canonical order and map auto-order actions as draft
transformations. They update only the draft and require an explicit Save; they
must not persist or close the editor directly.

### Save

Save writes through the existing semantic geography-order owner and exits edit mode.

The normal rail and map then render the saved effective order.

If the persistence call reports a failure, remain in edit mode with the draft
intact and show a recoverable error. The change does not require redesigning
the storage layer or reliably detecting browser-storage failures that are
silently swallowed by existing helpers.

A save must not alter:

- Drill evidence;
- Drill proficiency;
- Learning milestones;
- Practice results;
- Drill mode/order preference (`In order` versus `Random`);
- country-set membership;
- mnemonic data.

### Cancel

Cancel discards the draft and exits edit mode.

Rail and map return to the persisted effective order.

### Navigation while editing

Do not silently persist a draft because the user navigates away.

Prefer normal navigation to discard the unsaved draft. If the implementation already has a standard unsaved-change guard that can be reused without cross-feature work, it may be used; introducing a new app-wide guard is not required.

### Responsive and accessibility behavior

The same inline edit behavior must work when the left rail is rendered through the existing responsive drawer behavior.

Requirements:

- visible focus states;
- keyboard-accessible Edit/Save/Cancel actions;
- keyboard-accessible reordering;
- drag handles have accessible names/instructions;
- current sequence remains available to assistive technology;
- reduced-motion behavior as described above;
- do not change generic PageLayout rail widths or drawer contracts for this feature.

## Architecture constraints

Follow [ADR 0025](../adr/0025-contextual-world-countries-geography-authoring.md) and the current [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md) until that current-state document is updated at implementation completion.

Change-specific constraints:

- `geography/` remains the source of truth for effective hierarchy order and order persistence.
- `maps/` may render draft/persisted annotations but must not own order persistence.
- `mnemonics/` remains the owner of mnemonic identity/storage and reusable authoring capability.
- `drill/` may surface World/Continent order authoring in its existing Geography rails, but must not gain a Subregion detail view or become the owner of Country-order authoring.
- `learning/flows/` must not import Drill internals.
- `drill/` and `learning/flows/` must not import reusable authoring components from obsolete `setup/`.
- Reusable drag/drop presentation belongs in a workflow-neutral feature-local seam (`ui/` or another semantic owner); persistence calls remain with the geography capability/integration layer rather than the generic row presentation.
- Do not create compatibility wrappers that keep `setup/` as an apparent active owner.
- Do not change PageLayout geometry or generic rail ownership.
- Historical ADRs/implemented Change Specs remain historical; update current-state architecture instead of rewriting history.

## Existing capabilities to reuse

- `src/features/world-countries/ui/GeographyHierarchyRow.tsx`
  - already supports `sequenceNumber`; use/extend the workflow-neutral row presentation instead of creating parallel numbered row components.
- `src/features/world-countries/setup/LearningOrderEditor.tsx`
  - contains existing drag/drop, keyboard, draft, save/reset mechanics worth extracting; do not reuse its panel composition as the new UX.
- `src/features/world-countries/setup/subregion/SubregionSetupScreen.tsx`
  - demonstrates effective Country-order lookup and draft map updates; reuse the semantic mechanics, not the Setup screen.
- `src/features/world-countries/learning/CountryLearningMap.tsx`
  - already supports Country order labels for a scoped Country map.
- `src/features/world-countries/maps/geographyMapAdapter.ts`
  - already contains Country order-label generation; extend map-owned annotation capability for Continent/Subregion group numbering as needed rather than duplicating translation logic in workflows.
- `src/features/world-countries/geography/queries.ts` and existing metadata stores
  - continue to resolve persisted effective hierarchy order.
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
  - existing Learning Subregion Country list is the target surface for inline Country-order editing.
- `src/features/world-countries/drill/DrillSetupRails.tsx`
  - existing World/Continent Geography rails are the target surface for sequence numbers, `Edit order`, and Country-order guidance; do not add a Drill Subregion detail view.

## Edge cases

- A hierarchy with zero or one reorderable member does not need active drag/drop; `Edit order` may be hidden or disabled when no meaningful reorder is possible.
- If persisted order metadata is partial/stale relative to the active country population, initialize the draft from the existing effective-order query result; do not expose stale IDs as draggable rows.
- Country-set changes continue to affect membership through existing population resolution. Reordering cannot restore excluded Countries.
- When the persistence capability reports a failed write, keep the user in edit mode with the draft intact and show a recoverable error; do not present the draft as saved. Reliable detection of silently swallowed browser-storage failures is not required.
- Map labels must tolerate small/fragmented geographic shapes without changing geographic identity or click targets.
- Draft map annotations and rail numbering must always derive from the same draft order while editing.
- Switching Drill purpose between Drill and Learn & Practise must not implicitly save or reset geography order.
- Random Drill order remains a session scheduling choice. It does not change the authored geographic Country order shown in Geography.

## Out of scope

- New order persistence schemas or migrations.
- Changing canonical Continent/Subregion/Country membership.
- A Country-level Drill selection scope.
- A new Setup replacement or configuration-only navigation hierarchy.
- Redesigning mnemonic authoring UI beyond making it contextually reachable from the left rail.
- Changing Recite behavior or Recite ordering semantics except that it continues to consume the same persisted effective order where it already does so.
- Changing Drill proficiency, Learning Readiness, Practice recording, evidence IDs, or mastery semantics.
- Generic PageLayout redesign.
- Rewriting historical ADRs or implemented Change Specs.

## Acceptance criteria

- [x] The World Countries primary experience no longer exposes a separate Setup workspace or `Open Setup` action.
- [x] World left-rail Geography rows show effective Continent sequence numbers and `Edit order`.
- [x] Continent left-rail Geography rows show effective Subregion sequence numbers and `Edit order`.
- [x] A Subregion Country-list rail shows effective Country sequence numbers and `Edit order`.
- [x] Learn Countries and Learn Capitals use their existing Subregion Country-list context for Country-order editing; no Setup/order panel opens.
- [x] Drill preserves its existing navigation, map, selection, session, and question-queue behavior and shows concise Country-order guidance in the existing setup/map Geography context.
- [x] Clicking `Edit order` transforms the currently visible rail list itself into reorder mode.
- [x] No modal, overlay, drawer, side panel, or separate order screen is opened by `Edit order`.
- [x] Reorder mode exposes visible drag handles plus Save/Cancel controls.
- [x] Rows give a brief one-time movable/jiggle cue on entering reorder mode and do not continuously animate.
- [x] `prefers-reduced-motion` suppresses the jiggle without removing functional edit affordances.
- [x] Pointer drag/drop reorders the draft.
- [x] Keyboard interaction can reorder the draft without pointer drag/drop.
- [x] Rail sequence numbers update immediately with the draft.
- [x] Normal map sequence annotations update immediately with the same draft.
- [x] Save persists through the existing geography-order capability and exits edit mode.
- [x] Cancel/navigation without Save does not persist the draft.
- [x] Reset canonical order and map auto-order actions update only the draft and require explicit Save.
- [x] When persistence reports a failed save, the draft is preserved and a recoverable error is exposed.
- [x] Normal World map presentation shows one effective sequence annotation per Continent.
- [x] Normal Continent map presentation shows one effective sequence annotation per Subregion.
- [x] Normal Subregion map presentation shows effective Country sequence annotations.
- [x] Map order annotations do not change map hover/click geography semantics.
- [x] Contextual `Edit mnemonics` is available from the stable Learning Subregion left rail for the existing Subregion mnemonic target whenever that rail is visible, and is hidden during ordered recall, active recall, and completion.
- [x] Drill/Learning consume saved order through `geography/`; neither becomes an independent order source of truth.
- [x] Random versus In-order Drill scheduling remains independent from authored geographic order.
- [x] No order edit writes Drill evidence/proficiency, Learning milestones, Practice progress, mnemonic data, or unrelated feature state.
- [x] Country-order editing is available from the Learning Subregion rail, while Drill does not expose a Country-order editor or new Subregion navigation.
- [x] No active Drill/Learning code imports reusable authoring capability from `setup/`.
- [x] Obsolete Setup workflow/screens/navigation seam are removed once unused rather than retained behind compatibility wrappers.
- [x] World Countries feature tests cover inline reorder state, Save/Cancel/failure behavior, hierarchy-level targeting, map/rail draft synchronization, reduced-motion behavior, and regression of Drill/Learning semantics.
- [x] `npx vitest run src/features/world-countries`, `npx tsc -b`, and `npx vite build` pass.
- [x] `docs/architecture/features/WORLD_COUNTRIES.md` is updated to describe the implemented current state.

## Source anchors

- `src/features/world-countries/WorldCountries.tsx`
- `src/features/world-countries/geography/queries.ts`
- `src/features/world-countries/ui/GeographyHierarchyRow.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/maps/geographyMapAdapter.ts`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/drill/DrillSetupRails.tsx`
- `src/features/world-countries/setup/LearningOrderEditor.tsx`
- `src/features/world-countries/setup/subregion/SubregionSetupScreen.tsx`
- `src/features/world-countries/setup/SetupMnemonicEditor.tsx`

## Documentation impact

On implementation:

- update `docs/architecture/features/WORLD_COUNTRIES.md` from the new current state;
- remove Setup ownership/navigation/source anchors and describe contextual authoring;
- update the dependency diagram and invariants;
- retain ADR 0024's Learning/Practice boundary and the still-applicable reusable-Learning parts of ADR 0023;
- review feature `AGENTS.md` only if implementation starting points materially change after `setup/` removal.

## Verification

- Implemented and verified on 2026-08-13.
- Evidence: `npx vitest run src/features/world-countries` (59 files, 201
  tests), `npx tsc -b`, `npm run build` (`tsc -b && vite build`), plus focused
  inline-editor, draft, map-annotation, and Drill setup regression tests.
