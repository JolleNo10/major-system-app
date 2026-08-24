# Change Spec 0035 - Click-sequence Country order authoring

- **Status:** Implemented
- **Date:** 2026-08-24
- **Issue:** None.
- **Related ADRs:** None.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Make Country-order authoring faster when the learner already knows the desired
sequence. In the existing Learning Subregion `Edit order` experience, add an
alternate click-sequence mode so the user can choose Countries one after
another in the intended order and then save that completed sequence, without
having to drag every row into position.

The existing drag/drop editor remains available. This change does not alter
Country-order persistence, Country membership, Learning semantics, or the
World/Continent hierarchy-order editors.

## User-visible behavior

Country-order editing continues to begin from the existing stable Learning
Subregion rail:

```text
Learning order                         [ Edit order ]

1. Denmark
2. Norway
3. Sweden
...
```

Entering `Edit order` keeps the existing inline editor in the same rail. The
editor additionally exposes a clear action such as:

```text
[ Click order ]
```

Selecting `Click order` switches the Country list from drag/reorder interaction
to click-sequence interaction without opening another screen, panel, modal,
drawer, or overlay.

In click-sequence mode:

- the user starts with no Countries assigned to the new sequence;
- every Country in the current Subregion remains visible and selectable;
- clicking an unselected Country appends it to the next sequence position;
- selected Countries visibly show their assigned sequence number;
- the sequence count is visible, for example `5 / 12 selected`;
- a Country cannot appear more than once in the sequence;
- clicking an already selected Country removes it from the draft sequence and
  the later selected positions close the gap;
- the user can continue selecting until every Country has exactly one sequence
  position;
- `Save` is disabled until the sequence contains every Country exactly once;
- once complete, `Save` writes that exact Country order through the existing
  Country-order persistence seam and exits order editing.

Example:

```text
Click order                     3 / 5 selected

[1] Norway
[ ] Denmark
[3] Finland
[2] Sweden
[ ] Iceland

[ Save (disabled) ] [ Cancel ]
```

After selecting Denmark and Iceland, Save becomes available. Saving persists:

```text
1. Norway
2. Sweden
3. Finland
4. Denmark
5. Iceland
```

The list does not need to physically jump/re-sort after every click. The
important feedback while constructing the sequence is the explicit assigned
sequence number. An implementation may present the completed sequence in final
order before Save if that remains clear and does not introduce extra
confirmation.

## Scope

- Add an alternate click-sequence interaction to Country-order editing in the
  existing Learning Subregion rail.
- Add a visible button/action for entering that mode from the existing inline
  Country-order editor.
- Keep the existing drag/drop interaction available as an alternative.
- Build a complete draft from the same current effective Country membership.
- Reuse the existing Save/Cancel/persistence path.
- Preserve existing hover/map feedback where it naturally applies to Country
  rows.
- Add meaningful behavior tests for constructing, correcting, completing,
  cancelling, and saving a click-built sequence.
- Update current-state World Countries documentation so Country-order
  authoring is no longer described or implied as drag-only.

No persistence migration is expected.

## Interaction and states

### Normal Country-order view

No change.

The stable Learning Subregion rail shows the effective numbered Country order
and `Edit order`.

### Existing edit mode

`Edit order` continues to create a local draft and show the inline editor.

Drag/drop and its keyboard reordering behavior remain available and must not
regress.

The Country editor exposes `Click order`. This action is specific to Country
ordering; do not add it to the World Continent-order or Continent
Subregion-order editors in this change.

### Entering click-sequence mode

Entering click-sequence mode:

- remains inside the same left-rail list;
- does not persist anything;
- does not change Learning milestones, Drill evidence, proficiency, Practice
  results, or scope membership;
- starts an empty click-built sequence over the current Country membership;
- keeps the pre-click full draft available until the click sequence is
  complete, so an incomplete sequence is never treated as a valid persisted
  order.

The interaction should make the active mode obvious. A user must be able to
return to drag/drop editing without saving.

If the click sequence is incomplete when the user returns to drag/drop mode,
discard the incomplete click sequence and restore the full draft that existed
when click-sequence mode began.

If the click sequence is complete, it becomes the current full draft. Switching
back to drag/drop may continue editing that completed order.

### Selecting Countries

For each Country row:

- unselected means it has no new sequence position yet;
- activating an unselected row appends it to the sequence;
- selected means it visibly shows the assigned 1-based position;
- activating a selected row removes that Country from the click sequence;
- after removal, later positions are renumbered contiguously;
- the candidate Country membership itself never changes.

The interaction must work with pointer input and keyboard activation. Country
rows used as click targets must expose appropriate button/focus semantics and
communicate selected state and/or assigned sequence position to assistive
technology.

Do not use drag handles as the click target in click-sequence mode.

### Draft behavior

A click-built order is draft state only.

An implementation may keep the click sequence separately until complete or
derive a temporary full-membership draft for presentation, but it must never
send an incomplete Country membership to the persistence owner.

Existing consumers that receive Country-order drafts must continue to receive a
valid full Country membership whenever they are given an order.

### Save

`Save` is disabled in click-sequence mode until all Countries have been selected
exactly once.

When complete, Save:

1. resolves the selected sequence to the full ordered Country list;
2. calls the same semantic order-saving path used by drag/drop;
3. refreshes the existing Geography/Learning presentation through the current
   seams;
4. exits editing on success.

No additional confirmation step is required.

If persistence reports a failure, remain in edit mode with the completed
click-built order intact and expose the same recoverable save failure behavior
as the existing editor.

### Cancel and context exit

`Cancel` discards both the click sequence and any unsaved order draft exactly as
the existing Country-order editor does.

Unmounting/leaving the authoring context without Save must not persist the
click-built sequence.

### Existing draft actions

Existing draft-only actions such as Reset canonical order and map auto-order
must retain their current semantics.

If one of these actions is invoked while a click sequence is in progress, the
implementation must not combine two ambiguous partial-order states. It may
either:

- leave click-sequence mode and apply the requested full-draft action; or
- apply the action to the underlying full draft and clear the in-progress click
  sequence.

Whichever behavior is chosen must be deterministic, visible, and tested. The
action must still require explicit Save.

## Architecture constraints

- Follow [World Countries](../architecture/features/WORLD_COUNTRIES.md).
- Preserve contextual authoring: `Edit order` continues to transform the
  existing rail list in place.
- Country identity and membership remain canonical feature data; authoring only
  changes the ordering of stable Country IDs.
- Persist only through the existing semantic geography order owner. Do not add
  Learning-owned Country-order persistence.
- Temporary click-sequence state is UI/workflow draft state and is not
  persisted independently.
- Do not introduce a second Country-order storage format, migration, or
  compatibility layer.
- Maps remain workflow-neutral. This change does not require making the map
  itself an order-authoring surface.

No new ADR is required because this is an additional interaction over the
existing authoring and persistence boundaries.

## Existing capabilities to reuse

- `src/features/world-countries/ui/InlineOrderEditor.tsx`
  - Existing workflow-neutral inline draft editor, Save/Cancel behavior,
    drag/drop handling, save error recovery, canonical reset, and optional map
    auto-order action.
  - Extend or compose this seam rather than creating a parallel persistence
    editor.
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
  - Existing Learning Subregion Country-order authoring entry point.
  - Enable the click-sequence capability here so it is Country-order specific.
- `src/features/world-countries/geography/orderAuthoring.ts`
  - Existing semantic Country-order saving owner. Reuse unchanged unless a real
    defect is found.
- Existing `onOrderDraftChanged`, Geography refresh, hover, and order-saved
  seams in the Learning flow.

## Edge cases

- A Subregion with one Country does not need a meaningful ordering interaction;
  preserve the existing rule that order editing is only exposed when useful.
- Rapid repeated activation of the same Country must never produce duplicate
  Country IDs.
- Removing a selected Country must renumber the remaining selected sequence
  contiguously.
- Save must remain unavailable for `0..N-1` selected Countries and become
  available only at `N`.
- A completed sequence must contain the exact same Country membership as the
  current order.
- Cancelling after completing the sequence must not persist it.
- A failed Save must not throw away the completed sequence.
- Switching to click mode after prior unsaved drag changes must not silently
  persist or lose those changes. An incomplete click sequence returns to the
  pre-click draft when the user switches back.
- If effective membership changes because the owning context is replaced or
  unmounted, discard local click-sequence state rather than trying to merge it
  across scopes.
- Reduced-motion behavior for the existing reorder cue must not regress.

## Out of scope

- Clicking Countries directly on the SVG map to author order.
- Adding click-sequence authoring to World Continent order.
- Adding click-sequence authoring to Continent Subregion order.
- Replacing/removing drag-and-drop ordering.
- Changing map auto-order heuristics.
- Changing canonical Country order or Country membership.
- Changing persistence schema, import/export format, Learning milestones, Drill
  evidence, proficiency, Recite behavior, or Practice scheduling.
- A new Setup/configuration screen or dedicated Country-order editor.

## Acceptance criteria

- [ ] In the stable Learning Subregion Country-order editor, the user can choose
      a `Click order` action without leaving the current rail/context.
- [ ] `Click order` is not added to the World Continent-order or Continent
      Subregion-order editors.
- [ ] Click-sequence mode initially has no assigned positions and shows progress
      toward the complete Country count.
- [ ] Activating Countries in the order B, A, C assigns sequence positions
      1=B, 2=A, 3=C.
- [ ] A Country cannot occur more than once in the click-built sequence.
- [ ] Activating an already selected Country removes it and later selected
      positions are renumbered without gaps.
- [ ] Save is disabled until every Country in the current membership has exactly
      one position.
- [ ] Saving a complete click sequence persists exactly that order through the
      same geography-order seam as drag/drop and exits edit mode.
- [ ] Save does not alter membership or any Learning/Drill/Practice evidence or
      milestone state.
- [ ] Cancel never persists the click-built sequence.
- [ ] Leaving/unmounting the context without Save never persists it.
- [ ] Returning to drag/drop from an incomplete click sequence restores the
      pre-click full draft; returning after a complete click sequence can
      continue from the completed order.
- [ ] Existing drag/drop, keyboard reorder, canonical reset, map auto-order,
      hover feedback, and save-error recovery continue to work.
- [ ] A reported save failure leaves the complete click-built draft recoverable
      in edit mode.
- [ ] Click targets are keyboard operable, have visible focus treatment, and
      expose selected/sequence meaning accessibly.
- [ ] Tests cover the meaningful click-sequence state transitions and protect
      the existing drag-order behavior from regression.
- [ ] Current-state World Countries documentation is updated to reflect the
      alternate Country click-sequence authoring interaction.

## Source anchors

- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/ui/InlineOrderEditor.tsx`
- `src/features/world-countries/ui/InlineOrderEditor.test.tsx`
- `src/features/world-countries/geography/orderAuthoring.ts`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` in the same change so
the current-state authoring description records that Learning Subregion Country
order can be authored inline either by the existing reorder interaction or by
building a complete click sequence before Save.

Do not change unrelated architecture documents.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-24.
- Evidence:
  - `npx vitest run src/features/world-countries/ui/InlineOrderEditor.test.tsx`
  - `npx vitest run src/features/world-countries/learning/flows/GuidedLearningRails.test.tsx`
  - `npx vitest run src/features/world-countries`
  - `npm run typecheck`
