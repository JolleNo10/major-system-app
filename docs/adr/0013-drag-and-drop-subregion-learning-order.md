# ADR 0013 — Drag-and-drop Subregion learning-order editing

> **Archived legacy change record.** This interaction specification is retained
> at its original path for history and stable links. It is not an architectural
> or delivery authority. Use the current
> [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md),
> source, tests, and any named Change Spec. See the
> [classification ledger](LEGACY_CLASSIFICATION.md).

* **Status:** Accepted
* **Date:** 2026-08-09
* **Refines:** ADR 0008 — Subregion identity, metadata, and country order
* **Builds on:** ADR 0009 — Subregion Memo country-learning workflow
* **Feature:** `src/features/world-countries/`
* **Goal:** make editing a Subregion's learning order fast and natural by replacing repetitive up/down-button reordering with direct drag-and-drop while preserving accessible keyboard reordering and the existing country-order domain model.

---

## Context

ADR 0008 established that each Subregion may have a user-authored country order stored as:

```ts
SubregionMetadata.countryOrder
```

The order belongs to the Subregion and is consumed by workflows such as Memo and Recite.

The current Memo implementation exposes this through:

```text
Edit learning order
```

and displays every country with:

```text
↑
↓
```

buttons.

Changing an item several positions therefore requires several individual button presses.

For example, changing:

```text
1. Spain
2. Portugal
3. Italy
4. Greece
5. Malta
6. Cyprus
```

into:

```text
1. Portugal
2. Spain
3. Malta
4. Italy
5. Greece
6. Cyprus
```

requires repeatedly moving individual rows one position at a time.

This is unnecessarily tedious for a task whose mental model is simply:

> Put these countries in the order I want to learn them.

The UI should therefore support direct spatial reordering.

ADR 0008 already permits drag-and-drop and keyboard-accessible reorder controls. This ADR makes that interaction explicit and defines it as the normal editing experience.

---

# Decision

The Subregion learning-order editor will use a **sortable drag-and-drop list** as its primary interaction.

Conceptually:

```text
Edit learning order

☰  1. Portugal
☰  2. Spain
☰  3. Malta
☰  4. Italy
☰  5. Greece
☰  6. Cyprus

[ Save order ] [ Reset canonical order ]
```

The user can grab a country and move it directly to another position.

The interaction must support:

```text
mouse
touch
keyboard
```

Drag-and-drop is an editing interaction only.

It does not change the existing Subregion order domain model or persistence semantics.

---

# 1. `SubregionMetadata.countryOrder` remains authoritative

This ADR does not introduce another representation of learning order.

The model remains:

```text
canonical Geography membership
        +
SubregionMetadata.countryOrder
        ↓
effective Subregion order
```

The drag-and-drop editor modifies only its local draft until the user saves.

On save:

```ts
setSubregionCountryOrder(
  subregionId,
  orderedCountryIds,
)
```

continues to persist the result.

Do not store:

```text
drag positions
DOM indexes
SVG IDs
temporary sortable IDs
```

as domain state.

The persisted result remains an ordered list of stable `CountryId` values.

---

# 2. Drag-and-drop becomes the primary interaction

Each country row should be sortable.

The user should be able to move:

```text
country at position 8
```

directly to:

```text
position 2
```

in one interaction.

The list must update immediately while editing so that the visible numbering always represents the current draft order.

Example:

```text
before

1. Spain
2. Portugal
3. Italy
4. Malta
```

drag Malta between Portugal and Italy:

```text
after

1. Spain
2. Portugal
3. Malta
4. Italy
```

The operation changes only the local draft until **Save order** is selected.

---

# 3. Use a dedicated drag handle

Dragging should normally begin from an explicit handle associated with each row.

Conceptually:

```text
☰  3. Malta
```

rather than making every part of the row an unrestricted drag target.

This gives the interaction a clear affordance and reduces accidental dragging when the user interacts with or scrolls through the list.

The exact icon is a UI detail.

Examples include:

```text
☰
⠿
⋮⋮
```

The handle should visually indicate that the row can be moved.

---

# 4. Touch interaction is a first-class requirement

World Countries may be used on phones and tablets.

The implementation must therefore work with touch input as well as desktop pointer input.

Touch behavior should avoid turning ordinary vertical scrolling into accidental reordering.

Use an appropriate activation threshold, short hold, movement tolerance, or equivalent mechanism provided by the chosen sortable implementation.

Do not implement a desktop-only HTML drag interaction.

---

# 5. Keyboard reordering remains required

Removing the visible up/down buttons must not make country order dependent on pointer input.

The drag handle must be keyboard focusable and support accessible reordering.

The expected interaction should follow the sortable library's normal accessible model, conceptually:

```text
focus drag handle
        ↓
activate item
        ↓
Arrow Up / Arrow Down
        ↓
new position
        ↓
drop / confirm
```

Escape should cancel an active drag where supported.

Provide concise accessible instructions or screen-reader announcements through the chosen sortable implementation rather than requiring users to infer the interaction.

The implementation does not need to preserve the existing visible:

```text
↑ ↓
```

buttons if equivalent keyboard-accessible reordering is provided.

---

# 6. Prefer a sortable interaction library over custom drag mechanics

Do not hand-build pointer, touch, collision, keyboard, and accessibility behavior unless there is a demonstrated reason to do so.

Use a focused sortable drag-and-drop library compatible with the project's React application.

The preferred implementation is **dnd-kit** or its current maintained React sortable API.

The implementation should use the library only inside the Subregion learning-order editing capability rather than introducing application-wide drag/drop infrastructure without a real need.

This decision adds a small UI dependency in exchange for avoiding custom handling of:

```text
pointer dragging
touch dragging
keyboard dragging
collision detection
sortable transforms
drag cancellation
accessible drag semantics
```

If the selected library's current package/API structure has changed by implementation time, use its maintained equivalent rather than preserving obsolete package names solely to match this ADR.

---

# 7. Preserve explicit Save semantics

Dragging does not immediately modify persistent Subregion metadata.

The existing editing model remains:

```text
open editor
    ↓
modify local draft
    ↓
Save order
```

Closing without saving should continue to discard unsaved changes.

This prevents accidental drag gestures from immediately altering the user's durable learning sequence.

---

# 8. Reset canonical order remains available

The existing:

```text
Reset canonical order
```

action remains.

Reset means:

```text
remove custom country order
        ↓
return to canonical Geography order
```

It must continue to use the existing Subregion metadata API.

Drag-and-drop must not introduce a separately persisted "default order."

---

# 9. Existing order consequences remain unchanged

Changing country order continues to have the semantics established by ADR 0008.

In particular, the saved effective order is consumed by:

```text
Memo walkthrough
Stage B ordered recall
future Recite
Subregion mnemonic stale detection
```

Stage A random location practice remains randomized and does not become sequential merely because the user has authored a learning order.

A mnemonic authored against an earlier country sequence may therefore become stale after the reordered draft is saved.

This ADR does not change that behavior.

---

# 10. Ownership

The interaction belongs to the existing Memo Subregion order-editing UI.

Expected primary implementation area:

```text
src/features/world-countries/
  memo/
    subregion/
      SubregionOrderEditor.tsx
```

The editor may use a small feature-local sortable row component if that improves readability.

Do not move country-order persistence into Memo.

The existing ownership remains:

```text
geography/
    owns Subregion metadata and effective order

memo/
    owns the editing interaction
```

Do not introduce:

```text
memoCountryOrder
dragOrderStore
sortablePersistence
```

or another copy of the domain order.

---

# Alternatives considered

## Keep up/down arrows only

Rejected as the primary interaction.

They are simple and accessible but inefficient when countries need to move several positions.

They may require many repetitive interactions for a single conceptual reorder.

---

## Native HTML drag-and-drop only

Rejected.

The editor needs consistent mouse, touch, and keyboard behavior.

A desktop-oriented drag implementation alone is insufficient.

---

## Custom pointer/touch drag implementation

Rejected unless a concrete limitation in available sortable libraries requires it.

Implementing dragging, touch activation, keyboard behavior, collision detection, cancellation, accessibility, and animation locally introduces unnecessary complexity for a standard sortable-list interaction.

---

## Persist immediately after every drop

Rejected.

The current explicit editing transaction is useful:

```text
edit
review
save
```

A drag gesture should modify the draft, not immediately commit durable learning metadata.

---

# Consequences

## Positive

Reordering becomes substantially faster.

Users can directly express:

```text
put this country here
```

instead of repeatedly expressing:

```text
move up
move up
move up
move up
```

The visible list more closely matches the user's mental model of arranging a mnemonic or geographic learning route.

Mouse, touch, and keyboard users can use the same underlying editor.

The existing persistent order model remains unchanged.

## Negative

The application gains a small drag-and-drop UI dependency.

The editor becomes somewhat more complex than two simple arrow buttons.

Touch activation and keyboard behavior require deliberate testing.

---

# Current-state documentation

When this decision is accepted and implemented, update:

```text
docs/architecture/features/WORLD_COUNTRIES.md
```

to state that:

* `SubregionMetadata.countryOrder` remains the durable user-authored sequence;
* Memo's Subregion order editor provides sortable drag-and-drop editing;
* reordering remains a draft until explicitly saved;
* keyboard-accessible reordering is required.

Do not move detailed UI mechanics into the architecture document.

---

# Validation

Add focused tests around the reorder behavior where practical.

At minimum verify that:

```text
drag result
    ↓
draft Country[] order
    ↓
Save
    ↓
CountryId[] passed to Subregion metadata persistence
```

and that:

```text
Reset canonical order
```

still uses the existing reset behavior.

Manual validation should include:

```text
mouse reorder
touch reorder
keyboard reorder
cancel/close without saving
save reordered list
reset canonical order
```

Finally run:

```text
npx vitest run src/features/world-countries
npx tsc -b
npx vite build
```

## Confirmation

Implemented and verified against the repository on 2026-08-09.
