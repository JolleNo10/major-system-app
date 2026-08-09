# ADR 0015 — Continent Subregion learning order

* **Status:** Accepted
* **Date:** 2026-08-09
* **Builds on:** ADR 0008 — Subregion identity, metadata, and country order
* **Builds on:** ADR 0013 — Drag-and-drop Subregion learning-order editing
* **Builds on:** ADR 0014 — Semantic page rail ownership
* **Feature:** `src/features/world-countries/`
* **Goal:** extend the existing learning-order pattern one hierarchy level upward so Subregions within a Continent can be placed in a user-defined order and later traversed in that order during full Continent Recite.

---

## Context

World Countries already distinguishes between:

```text
canonical geographic membership
```

and:

```text
user-authored learning order
```

for Countries within a Subregion.

The current model is:

```text
Subregion
    ↓
canonical Countries
    +
SubregionMetadata.countryOrder
    ↓
effective Country order
```

The effective order is used as the user's intended learning and recall sequence.

Memo exposes that order in the Subregion learning context and allows the user to edit it using a sortable drag-and-drop editor.

For example:

```text
Southern Europe

1. Portugal
2. Spain
3. Italy
4. Malta
5. Greece
6. Cyprus
```

The user can change this order without changing which Countries belong to Southern Europe.

The same requirement now exists one level higher.

A Continent consists of multiple Subregions.

For example:

```text
Europe

Northern Europe
Western Europe
Eastern Europe
Southern Europe
```

The canonical data determines that these Subregions belong to Europe.

However, the user should also be able to define the order in which those Subregions are learned and recalled.

For example:

```text
1. Northern Europe
2. Western Europe
3. Southern Europe
4. Eastern Europe
```

This is important because eventual full Continent Recite should follow a deliberate route:

```text
first Subregion
    ↓
its Countries in learning order
    ↓
second Subregion
    ↓
its Countries in learning order
    ↓
...
```

Without a user-defined Continent-level order, complete Continent recall would have to depend on canonical dataset order or another implicit ordering rule.

That would be inconsistent with the learning-order model already established for Countries.

---

# Decision

Apply the existing Subregion Country-order pattern to Subregions within a Continent.

The hierarchy becomes:

```text
Continent
    ↓
effective Subregion order
    ↓
Subregion
    ↓
effective Country order
```

A Continent may therefore have a user-authored ordered list of its Subregions.

Conceptually:

```text
canonical Continent membership
        +
Continent Subregion order
        ↓
effective Subregion order
```

This is the same distinction already used for:

```text
canonical Subregion membership
        +
Subregion Country order
        ↓
effective Country order
```

No separate ordering concept should be introduced.

---

# 1. Persist Subregion order at Continent level

Introduce the Continent-level equivalent of:

```ts
SubregionMetadata.countryOrder
```

Conceptually:

```ts
interface ContinentMetadata {
  continent: Continent
  subregionOrder: SubregionId[]
  updatedAt: number
}
```

The exact implementation should follow the established `SubregionMetadata` pattern.

The persisted order contains stable `SubregionId` values.

It must not store:

```text
display labels
array positions
DOM positions
drag IDs
map IDs
```

Canonical Geography remains authoritative for membership.

The metadata changes only the order.

---

# 2. Resolve effective order the same way as Country order

Provide the Continent-level equivalent of the existing effective Country-order resolver.

Current Country behavior is conceptually:

```text
stored Country IDs
    ↓
discard IDs that are no longer members
    ↓
preserve valid stored order
    ↓
append any new canonical members
```

Subregion ordering should use the same behavior.

Conceptually:

```ts
resolveContinentSubregionOrder(...)
```

and/or the corresponding Geography query:

```ts
getSubregionsForContinentInEffectiveOrder(...)
```

The exact naming should follow the existing Geography modules.

When no Continent metadata exists:

```text
effective order = canonical order
```

When metadata exists:

```text
effective order = valid stored order
                  + canonical members missing from stored order
```

Every current canonical Subregion must therefore appear exactly once.

---

# 3. Persistence follows the existing metadata-store pattern

The persistence API should mirror the existing Country-order operations.

Conceptually:

```ts
getContinentMetadata(continent)
setContinentSubregionOrder(continent, subregionIds)
resetContinentSubregionOrder(continent)
```

As with Country order:

```text
Save order
```

persists the explicit user sequence.

And:

```text
Reset canonical order
```

removes the custom order so the effective order falls back to canonical Geography order.

Do not persist a duplicate canonical order merely to represent the default.

---

# 4. Continent Memo uses the effective Subregion order

The current Continent Memo view obtains its Subregions from canonical Geography order.

After this decision, it must use the effective Subregion order.

Therefore the visible:

```text
Subregions
```

list in the Continent view becomes the user's learning route through that Continent.

Example:

```text
Europe

1. Northern Europe
2. Western Europe
3. Southern Europe
4. Eastern Europe
```

The order shown in Memo must match the effective persisted order.

Selecting a Subregion continues to behave exactly as today.

Only its position in the Continent sequence changes.

---

# 5. Add Continent-level order editing

The Continent Memo view should expose:

```text
Edit order
```

for its Subregion list, following the same interaction already used for Country ordering within a Subregion.

Conceptually:

```text
Edit learning order

☰  1. Northern Europe
☰  2. Western Europe
☰  3. Southern Europe
☰  4. Eastern Europe

[ Save order ] [ Reset canonical order ]
```

The interaction should retain the existing ordering behavior:

```text
drag-and-drop
mouse
touch
keyboard
local draft
explicit Save
Reset canonical order
```

Do not introduce another interaction model for this hierarchy level.

The existing dnd-kit approach should be reused.

---

# 6. Editing remains draft-first

As with Country-order editing:

```text
open editor
    ↓
copy effective order into local draft
    ↓
reorder draft
    ↓
Save order
    ↓
persist
```

Dragging must not immediately change durable metadata.

Closing without saving discards the draft.

The visible numbering inside the editor must follow the current draft order.

---

# 7. Reuse the existing reorder behavior

The current Country editor uses a simple pure reorder operation:

```text
items
fromIndex
toIndex
    ↓
new ordered items
```

The Subregion editor should use the same behavior.

If a small generic reorder helper or sortable-row abstraction naturally removes duplication between the two editors, that refactoring is acceptable.

However, do not introduce a larger generalized ordering framework solely for this change.

The important point is consistency with the existing Country-order implementation.

---

# 8. Full Continent Recite follows this route

The principal semantic reason for Continent Subregion ordering is eventual full Continent Recite.

A complete Continent sequence is defined hierarchically.

For example:

```text
Europe Subregion order

1. Northern Europe
2. Western Europe
3. Southern Europe
4. Eastern Europe
```

with:

```text
Northern Europe Country order
1. Denmark
2. Norway
3. Sweden
4. Finland
...
```

and:

```text
Western Europe Country order
1. France
2. Belgium
3. Netherlands
...
```

means full Europe Recite follows:

```text
Northern Europe
    ↓
all Northern Europe Countries in effective Country order
    ↓
Western Europe
    ↓
all Western Europe Countries in effective Country order
    ↓
Southern Europe
    ↓
all Southern Europe Countries in effective Country order
    ↓
Eastern Europe
    ↓
all Eastern Europe Countries in effective Country order
```

Therefore:

```text
Continent effective Subregion order
        +
each Subregion's effective Country order
        ↓
full Continent recall sequence
```

This ADR establishes that ordering contract even if full Continent Recite is implemented later.

---

# 9. Do not persist a flattened Continent Country order

Do not introduce:

```text
Continent.countryOrder
```

containing every Country in the Continent.

That would duplicate the existing Subregion Country orders.

The complete sequence is derived from the hierarchy:

```text
effective Subregion order
        ↓
effective Country order for each Subregion
```

For example:

```text
Subregions:
[B, A]

B Countries:
[B1, B2]

A Countries:
[A1, A2, A3]
```

produces:

```text
[B1, B2, A1, A2, A3]
```

without storing that flattened array.

Changing Country order inside one Subregion therefore automatically changes the corresponding portion of future full Continent Recite.

---

# 10. Canonical Geography membership remains unchanged

As with `SubregionMetadata.countryOrder`, the new order cannot change membership.

Continent metadata may reorder:

```text
Northern Europe
Western Europe
Eastern Europe
Southern Europe
```

but cannot add a Subregion that does not canonically belong to Europe.

Likewise, resetting the order does not modify Geography data.

It simply removes the user-authored ordering override.

---

# 11. Ownership follows the existing pattern

The existing architecture states that user-specific geographic ordering belongs to:

```text
geography/
```

while Memo owns the editing interaction.

Keep that boundary.

Conceptually:

```text
data/
    canonical Continent → Subregion membership

geography/
    Continent Subregion metadata/order
    Subregion Country metadata/order

memo/
    order editors and presentation

recite/
    consumes effective order
```

Do not put durable Subregion ordering state in:

```text
memo/
```

and do not create Recite-specific copies of the order.

---

# 12. Continent overview rail

The current Continent Memo left rail owns the:

```text
Subregions
```

list.

That list should:

1. use effective Subregion order;
2. display that order consistently;
3. expose the order-editing action.

The interaction should parallel the Subregion learning-context rail where Country learning order is currently shown and edited.

Do not change the semantic rail ownership established by ADR 0014.

This change adds functionality to the existing Continent Subregions rail; it does not introduce another navigation surface.

---

# 13. Backup and reset

Continent Subregion order is user-authored World Countries state and must follow the same persistence expectations as existing Subregion Country order.

If World Countries backup/export includes Geography metadata, Continent order must be included as part of that capability.

World Countries reset behavior must remove the custom Continent order along with other World Countries-owned persisted state where applicable.

Do not affect unrelated application features.

---

# Alternatives considered

## Keep canonical Subregion order

Rejected.

Canonical order remains a suitable fallback, but it cannot represent the user's chosen learning route.

This is the same reason Country order is already user-editable inside a Subregion.

---

## Infer Subregion order from geography

Rejected.

A useful recall path is user-specific.

There is no need to introduce rules such as:

```text
north to south
west to east
clockwise
```

when the existing application model already allows the user to explicitly define learning order.

---

## Flatten all Countries into one Continent order

Rejected.

It duplicates the existing Country-order state and creates two sources of truth.

The hierarchical sequence is sufficient.

---

## Add a different Continent ordering mechanism

Rejected.

Country ordering already establishes the desired interaction and persistence semantics.

The Continent-level feature should follow that pattern rather than introduce another one.

---

# Consequences

## Positive

The ordering model becomes consistent across the Geography hierarchy:

```text
Continent
    ↓
ordered Subregions
    ↓
Subregion
    ↓
ordered Countries
```

Users can establish a stable route through an entire Continent.

Future full Continent Recite has an explicit deterministic sequence.

The implementation largely reuses concepts and behavior already present for Country ordering.

Canonical Geography remains cleanly separated from personal learning order.

## Negative

A small amount of additional Continent-level Geography metadata and persistence is required.

The Continent Memo rail gains another editing action.

Backup/import and reset behavior must include the new persisted order.

---

# Current-state documentation

When implemented, update:

```text
docs/architecture/features/WORLD_COUNTRIES.md
```

to reflect that `geography/` owns user-authored ordering at both hierarchy levels:

```text
Continent → Subregion order
Subregion → Country order
```

Document the invariant:

```text
canonical Geography defines membership;
user metadata may change order only.
```

Document that Continent Memo presents Subregions in effective learning order and that future complete Continent Recite traverses:

```text
effective Subregion order
    ↓
effective Country order within each Subregion
```

Do not duplicate detailed drag-and-drop mechanics in the current-state architecture document.

Update persistence documentation only where the persisted World Countries state or backup contract changes.

---

# Validation

Mirror the existing Country-order tests at the Continent/Subregion level.

At minimum verify:

```text
no custom order
    ↓
canonical Subregion order
```

```text
saved custom order
    ↓
effective custom Subregion order
```

```text
invalid or duplicate stored IDs
    ↓
ignored / normalized
```

```text
new canonical Subregion absent from saved order
    ↓
appended once in canonical order
```

```text
Reset canonical order
    ↓
custom metadata removed
    ↓
canonical order restored
```

Editor validation should cover:

```text
drag
    ↓
local draft changes
```

```text
Save
    ↓
draft SubregionId[] persisted
```

```text
Close without Save
    ↓
persisted order unchanged
```

and mouse, touch, and keyboard ordering behavior should remain equivalent to the existing Country-order editor.

Finally run:

```text
npx vitest run src/features/world-countries
npx tsc -b
npx vite build
```

## Confirmation

Implemented and verified against the repository on 2026-08-10.
