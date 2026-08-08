# ADR 0008 — Subregion identity, metadata, and country order

* **Status:** Proposed
* **Date:** 2026-08-08
* **Builds on:** ADR 0007 — World Countries Memo workflow
* **Refines:** ADR 0006 — Subregion mnemonic ordering and stale detection
* **Feature:** `src/features/world-countries/`
* **Goal:** make Subregions stable domain entities and allow persistent user-authored country ordering shared by Memo, Recite, and future Geography workflows.

## Context

ADR 0006 introduced Subregion mnemonic records containing:

```text
story
+
optional image
+
ordered countryIds snapshot
```

The ordered `countryIds` existed primarily so a mnemonic could be detected as stale if its underlying country sequence changed.

At that point:

```text
custom Subregion ordering
```

was explicitly out of scope.

ADR 0007 subsequently defined the first World Countries Memo workflow and derived Subregion country ordering directly from `countries.ts`.

The Subregion workflow is now becoming a first-class study area.

The user should be able to deliberately arrange the countries of a Subregion into a useful learning sequence.

Example:

```text
Northern Europe

1. Norway
2. Sweden
3. Denmark
4. Finland
5. Iceland
```

This sequence may represent:

* a geographic route;
* a convenient mnemonic sequence;
* an intentionally memorable order;
* the sequence used when reciting the Subregion.

The sequence is not specific to Memo.

It may be consumed by:

```text
Memo
Recite
future guided-review workflows
```

Therefore the sequence must belong to the **Subregion domain**, not to Memo and not to the mnemonic record.

At the same time, persistent Subregion data now makes stable Subregion identity more important.

The current implementation derives Subregion IDs from display labels by slugging them.

For example:

```text
Northern Europe
      ↓
northern-europe
```

That is convenient, but a display-label change must not silently create a new persistent identity.

This ADR therefore addresses both:

```text
stable Subregion identity
+
persistent Subregion metadata
```

---

# Decision

Introduce first-class stable Subregion definitions and persistent Subregion metadata.

Conceptually:

```text
Subregion
│
├── stable identity
│
├── display information
│
├── canonical membership
│     derived from country records
│
├── user metadata
│     countryOrder
│
├── mnemonic
│     story
│     image
│     authored-order snapshot
│
├── Memo
│
└── Recite
```

The central rule is:

> The Subregion owns the country order. Workflows consume it. Mnemonics remember which version of the order they were authored against.

---

# 1. Subregions have explicit stable IDs

Stop generating persistent Subregion identity from arbitrary display labels.

Introduce an explicit domain type:

```ts
export type SubregionId =
  | 'northern-europe'
  | 'western-europe'
  | 'central-europe'
  | 'eastern-europe'
  | 'southern-europe'
  | 'balkans'
  // ...
```

The exact TypeScript representation may be a literal union derived from a definition registry rather than a manually maintained union.

The important requirement is:

```text
SubregionId is explicitly defined domain data
```

and not:

```text
SubregionId = slug(displayLabel)
```

---

# 2. Introduce Subregion definitions

Create one canonical registry of Subregion identity and presentation metadata.

Conceptually:

```ts
interface SubregionDefinition {
  id: SubregionId
  label: string
  continent: Continent
}
```

Example:

```ts
{
  id: 'northern-europe',
  label: 'Northern Europe',
  continent: 'Europe',
}
```

Suggested location:

```text
src/features/world-countries/data/subregions.ts
```

The registry owns:

```text
stable ID
display label
Continent relationship
```

It does **not** own the list of member countries.

Membership remains derived from country records.

---

# 3. Country records reference Subregion identity

Country geography should reference the stable Subregion ID rather than making the display label the relationship key.

Preferred domain model:

```ts
interface Country {
  id: CountryId
  country: string
  capital: string
  continent: Continent
  subregionId: SubregionId
  aliases?: readonly string[]
}
```

Where presentation needs:

```text
Northern Europe
```

it resolves:

```text
country.subregionId
        ↓
SubregionDefinition
        ↓
label
```

If retaining a derived `subregion` display property temporarily reduces migration cost, it must not be used for persistence or identity.

The long-term domain relationship is:

```text
Country
   ↓
SubregionId
   ↓
SubregionDefinition
```

---

# 4. Membership remains data-driven

Introducing `SubregionDefinition` must not create a second country-membership database.

Correct:

```ts
countries.filter(
  country => country.subregionId === 'northern-europe'
)
```

Incorrect:

```ts
SUBREGIONS['northern-europe'].countries = [
  'NO',
  'SE',
  'DK',
  ...
]
```

Therefore:

```text
SubregionDefinition
    = what the Subregion is

Country records
    = which countries belong to it
```

This preserves ADR 0007's data-driven Geography principle.

---

# 5. Continent IDs used for persistence must also be explicit

Existing mnemonic target IDs use a structure such as:

```text
geo:subregion:europe:northern-europe
```

Do not continue generating the `europe` portion through a generic slug function either.

Use an explicit mapping:

```ts
type ContinentId =
  | 'africa'
  | 'asia'
  | 'europe'
  | 'north-america'
  | 'south-america'
  | 'oceania'
```

or equivalent explicit definitions.

Example:

```ts
const CONTINENT_IDS: Record<Continent, ContinentId> = {
  Africa: 'africa',
  Asia: 'asia',
  Europe: 'europe',
  'North America': 'north-america',
  'South America': 'south-america',
  Oceania: 'oceania',
}
```

Persistent identity must not depend on a generic:

```ts
stableSlug(label)
```

function.

---

# 6. Preserve existing persistent keys

Choose explicit IDs matching the IDs currently generated by the existing slug implementation wherever possible.

Example:

```text
Europe
→ europe

Northern Europe
→ northern-europe
```

Therefore an existing mnemonic target:

```text
geo:subregion:europe:northern-europe
```

remains:

```text
geo:subregion:europe:northern-europe
```

after this change.

The implementation changes the **source and guarantee of identity**, not the resulting key.

This avoids unnecessary migration of existing Geography mnemonic records.

Future display-label changes must not alter those IDs.

For example:

```text
id:
northern-europe

label:
Northern Europe
```

could later become:

```text
id:
northern-europe

label:
Nordic & Northern Europe
```

without changing persisted identity.

---

# 7. Subregion metadata

Introduce feature-owned persistent metadata:

```ts
interface SubregionMetadata {
  subregionId: SubregionId
  countryOrder: CountryId[]
  updatedAt: number
}
```

This metadata belongs to the Geography/Subregion domain.

It does not belong to:

```text
Memo
Recite
core/mnemonics
SvgMapController
```

Suggested feature structure:

```text
world-countries/
  data/
    countries.ts
    subregions.ts

  subregions/
    subregionMetadata.ts
    subregionMetadataStore.ts
```

Exact folders may follow the final feature organization.

---

# 8. `countryOrder` is user-authored metadata

`countryOrder` represents the user's preferred learning/recitation sequence.

Example:

```ts
{
  subregionId: 'northern-europe',

  countryOrder: [
    'NO',
    'SE',
    'DK',
    'FI',
    'IS',
  ],

  updatedAt: ...
}
```

Use stable domain Country IDs.

Never persist:

```text
SVG IDs
country names
array indexes
map path IDs
```

as the authoritative country order.

---

# 9. Country order is independent from mnemonic existence

The following is valid persistent state:

```text
custom country order
+
no story
+
no image
```

Likewise:

```text
custom country order
+
story
+
no image
```

or:

```text
custom country order
+
story
+
image
```

Deleting the mnemonic must not delete `SubregionMetadata`.

This matters because the generic mnemonic system intentionally defines:

```text
empty story
+
no image
=
no mnemonic record
```

Order therefore cannot be stored as part of mnemonic existence.

---

# 10. Effective country order

Consumers must use a central resolver rather than reading `countryOrder` directly.

Conceptually:

```ts
resolveSubregionCountryOrder(
  subregionId,
  currentCountries,
  metadata,
)
```

The resolver should:

1. derive current Subregion membership from country records;
2. read the persisted custom order if present;
3. retain stored IDs that remain members;
4. preserve their stored relative order;
5. append current members missing from the stored order;
6. ignore stored IDs that are no longer members.

Example:

Persisted:

```text
NO
SE
DK
FI
```

Current membership:

```text
NO
SE
DK
FI
IS
```

Effective order:

```text
NO
SE
DK
FI
IS
```

Example after a country leaves the Subregion:

Persisted:

```text
NO
SE
DK
FI
IS
```

Current membership:

```text
NO
SE
DK
FI
```

Effective order:

```text
NO
SE
DK
FI
```

Do not mutate persistent metadata merely because reconciliation was required during a read.

---

# 11. Default order

If no `SubregionMetadata` exists:

```text
effective order
=
canonical order currently produced from Geography data
```

Do not persist metadata just to represent the default.

The user creates an override by deliberately reordering countries.

Resetting the order deletes/resets the custom ordering metadata and returns the Subregion to the canonical order.

This gives the model:

```text
no metadata
    = use canonical order

metadata exists
    = use custom order reconciled with current membership
```

---

# 12. Memo consumes the shared order

Memo is expected to be the primary initial authoring surface for `countryOrder`.

The Subregion Memo workspace may allow:

```text
drag-and-drop
keyboard-accessible reorder controls
reset order
```

Memo then displays and studies countries using:

```text
effective country order
```

Memo does not own the order.

---

# 13. Recite consumes the same order

Recite must resolve exactly the same Subregion order.

Conceptually:

```text
SubregionMetadata
       ↓
effective order
     ↙     ↘
  Memo     Recite
```

Do not introduce:

```text
memoCountryOrder
reciteCountryOrder
```

The sequence belongs to the Subregion.

A future Recite UI may be allowed to modify it, but such modification must update the same `SubregionMetadata`.

---

# 14. Quiz scheduling remains independent

This ordering is not the quiz scheduler.

A mnemonic-friendly sequence may be:

```text
Norway
Sweden
Denmark
Finland
Iceland
```

while retrieval practice may intentionally ask:

```text
Finland
Norway
Iceland
Sweden
Denmark
```

Therefore:

```text
Subregion countryOrder
    = authored study / recitation sequence
```

while:

```text
quiz order
    = learning scheduler decision
```

Do not feed `countryOrder` into adaptive question scheduling unless a future design explicitly requires a special sequential mode.

---

# 15. Subregion mnemonic keeps an authored-order snapshot

ADR 0006 currently stores:

```ts
interface SubregionMnemonic extends Mnemonic {
  countryIds: CountryId[]
}
```

Retain this concept, but change its meaning.

It is no longer the source of current Subregion order.

Instead:

```text
SubregionMetadata.countryOrder
    = current user-authored order

SubregionMnemonic.countryIds
    = effective order when the mnemonic
      was authored / last saved
```

The mnemonic therefore remembers what sequence its story and picture describe.

---

# 16. Reordering makes the mnemonic stale

A Subregion story often encodes the sequence itself.

Example mnemonic authored for:

```text
Norway
→ Sweden
→ Denmark
→ Finland
```

If the user changes the order to:

```text
Denmark
→ Norway
→ Finland
→ Sweden
```

the existing mnemonic may now be misleading.

Therefore compare:

```text
SubregionMnemonic.countryIds
```

against:

```text
current effective country order
```

A difference means:

```text
mnemonic needs review
```

This applies to changes caused by:

```text
user reorder
membership change
country moving between Subregions
```

Changing order must still succeed immediately.

The existing story and image remain intact.

The UI shows a non-blocking warning such as:

```text
This mnemonic was created for a different country order.
Review and save it to update.
```

Saving the mnemonic again stores the current effective order snapshot and clears the stale condition.

---

# 17. Existing mnemonics require no destructive migration

Existing Subregion mnemonics already contain:

```text
countryIds[]
```

Keep them.

Those IDs represent the effective/canonical sequence at the time the mnemonic was authored.

Do **not** infer from an existing mnemonic that the user intentionally created a custom Subregion order.

Therefore do not automatically create:

```text
SubregionMetadata
```

from existing mnemonic records.

For an existing user with:

```text
mnemonic.countryIds
+
no SubregionMetadata
```

the current effective order still comes from the canonical Geography order.

The mnemonic snapshot is then compared to that effective order for stale detection.

---

# 18. Persistence

Subregion metadata is small structured user-authored state.

It should use an existing application persistence mechanism rather than creating another database connection.

The exact backing store may be chosen based on the existing World Countries persistence conventions.

The architectural requirements are:

```text
feature-owned API
stable Subregion key
persistent across sessions
included in Geography backup
independent from mnemonic lifecycle
```

Consumers should access it through functions such as:

```ts
getSubregionMetadata(subregionId)

setSubregionCountryOrder(
  subregionId,
  countryIds,
)

resetSubregionCountryOrder(subregionId)
```

Do not let components manipulate raw storage directly.

---

# 19. Geography backup now includes Subregion metadata

Custom country ordering is user-authored state.

It must be backed up.

The current Geography export only exports mnemonic records.

Going forward, Geography gets a feature-specific versioned backup envelope containing both:

```text
mnemonics
+
Subregion metadata
```

Conceptually:

```ts
interface GeographyExportV2 {
  version: 2
  feature: 'world-countries'

  mnemonics: MnemonicExportEntry[]

  subregions: Array<{
    subregionId: SubregionId
    countryOrder: CountryId[]
    updatedAt: number
  }>
}
```

Example:

```json
{
  "version": 2,
  "feature": "world-countries",

  "mnemonics": [
    {
      "targetId": "geo:subregion:europe:northern-europe",
      "text": "...",
      "imageDataUrl": null,
      "countryIds": ["NO", "SE", "DK", "FI", "IS"]
    }
  ],

  "subregions": [
    {
      "subregionId": "northern-europe",
      "countryOrder": ["NO", "SE", "DK", "FI", "IS"],
      "updatedAt": 1786200000000
    }
  ]
}
```

The exact timestamp is illustrative.

---

# 20. Core mnemonic backup remains domain-neutral

Do not add Geography metadata concepts to:

```text
core/mnemonics
```

The shared mnemonic package may expose reusable entry encoding/decoding helpers if needed, for example:

```text
Mnemonic[]
    ↓
MnemonicExportEntry[]
```

but it must not understand:

```text
SubregionMetadata
countryOrder
GeographyExport
```

The feature-specific envelope belongs to World Countries.

Target dependency:

```text
World Countries Geography backup
       │
       ├── generic mnemonic encoding
       │
       └── Subregion metadata encoding
```

not:

```text
core/mnemonics
       ↓
knows Geography metadata
```

---

# 21. Import remains backward compatible

Existing Geography backup files use the current version-1 mnemonic export format.

Do not make those files unusable.

Geography import should accept:

```text
Version 1
    mnemonic-only Geography export
```

and:

```text
Version 2
    Geography mnemonics
    +
    Subregion metadata
```

### Version 1 import

Import mnemonic content exactly as before.

No Subregion metadata is created.

### Version 2 import

Validate and import:

```text
mnemonics
+
Subregion metadata
```

Existing mnemonic validation rules remain in force.

Subregion metadata validation must ensure:

* `subregionId` is syntactically valid;
* duplicate Subregion records are handled deterministically;
* `countryOrder` is an array of Country IDs;
* duplicate Country IDs are normalized or rejected;
* malformed records do not silently corrupt existing data.

Historic or currently non-member Country IDs should not make an otherwise recoverable backup unusable.

The effective-order resolver remains responsible for reconciling metadata against current Geography membership.

---

# 22. Export scope

The existing user-facing:

```text
Geography export
```

should export all user-authored Geography material needed to reconstruct the current setup:

```text
Country–Capital mnemonics
Subregion mnemonics
Subregion country ordering
```

The user should not need a second independent “Subregion order backup”.

Import/export remains one Geography operation.

---

# 23. Data-change behavior

If Geography data changes:

## New country added to Subregion

Stored:

```text
NO SE DK FI
```

Current members:

```text
NO SE DK FI IS
```

Effective:

```text
NO SE DK FI IS
```

The mnemonic becomes stale if its snapshot does not include Iceland.

---

## Country removed

Stored:

```text
NO SE DK FI IS
```

Current:

```text
NO SE DK FI
```

Effective:

```text
NO SE DK FI
```

The obsolete ID remains harmless metadata or may be cleaned up on a later explicit write.

The mnemonic becomes stale.

---

## Country moves Subregion

It stops participating in the old Subregion's effective order.

It enters the new Subregion according to that Subregion's reconciliation/default rules.

---

## Country display name changes

No effect on order because persistence uses `CountryId`.

---

## Subregion display label changes

No effect on:

```text
metadata
mnemonics
navigation identity
```

because persistence uses explicit `SubregionId`.

---

## Canonical country order changes

Users without custom metadata receive the new canonical order.

Users with a custom order retain their explicitly ordered members, with any new current members appended.

---

# 24. Suggested domain APIs

Exact names may vary.

The feature should provide behavior equivalent to:

```ts
getSubregion(
  id: SubregionId,
): SubregionDefinition

getSubregionCountries(
  id: SubregionId,
): Country[]

getSubregionMetadata(
  id: SubregionId,
): Promise<SubregionMetadata | null>

setSubregionCountryOrder(
  id: SubregionId,
  countryIds: readonly CountryId[],
): Promise<void>

resetSubregionCountryOrder(
  id: SubregionId,
): Promise<void>

resolveSubregionCountryOrder(
  id: SubregionId,
  countries: readonly Country[],
  metadata?: SubregionMetadata | null,
): Country[]
```

The reconciliation logic should be a pure function with focused tests.

Memo and Recite must reuse that function rather than implement their own ordering logic.

---

# 25. Validation

Tests should cover at minimum:

### Stable identity

* known Subregions have explicit stable IDs;
* display labels do not determine persisted identity;
* existing IDs match current generated slugs so existing mnemonic target keys remain compatible;
* each Subregion ID is unique;
* every Country references a valid Subregion;
* Country continent and Subregion continent cannot disagree.

### Ordering

* no metadata produces canonical order;
* custom order is respected;
* duplicate IDs are handled;
* unknown/non-member IDs do not appear in effective order;
* newly added members are appended;
* removed members disappear;
* reset restores canonical order.

### Mnemonic interaction

* mnemonic snapshot equal to effective order is current;
* user reorder makes the existing mnemonic stale;
* membership change makes the mnemonic stale;
* deleting mnemonic content does not delete country order;
* saving mnemonic again stores the current effective-order snapshot.

### Backup

* Geography v2 exports mnemonic content and Subregion metadata;
* custom order exports even when no mnemonic exists;
* v2 round-trip preserves order;
* existing v1 Geography mnemonic exports still import;
* importing v1 does not create arbitrary order metadata;
* malformed Subregion metadata is rejected safely.

---

# Architectural constraints

1. Subregion identity must be explicit and stable.

2. Do not derive persistent identity from display labels at runtime.

3. Existing IDs should retain their current values to preserve existing persisted mnemonic keys.

4. Country membership remains derived from country records.

5. Subregion definitions do not duplicate member-country arrays.

6. Country records reference stable `SubregionId`.

7. `countryOrder` uses stable domain `CountryId`.

8. Subregion order belongs to Geography, not Memo.

9. Memo and Recite consume the same effective order.

10. Quiz scheduling remains independent.

11. Mnemonic content remains independent from Subregion metadata.

12. `SubregionMnemonic.countryIds` is an authored-order snapshot.

13. Changing order makes a mismatched mnemonic stale but does not modify or delete it.

14. Deleting a mnemonic does not delete Subregion metadata.

15. Geography backup includes both mnemonics and Subregion metadata.

16. Geography import remains compatible with existing version-1 mnemonic backups.

17. `core/mnemonics` remains unaware of Geography metadata.

18. SVG IDs are never persisted as country ordering.

19. Do not introduce a generic cross-feature metadata framework for this requirement.

---

# Consequences

## Positive

Subregions now have real stable domain identity.

Persistent state survives future display-label changes.

Memo, Recite, and later workflows share one country sequence.

The user can define an order before creating any mnemonic.

Mnemonic stories remain safely associated with the sequence they actually describe.

Existing Geography mnemonic storage keys remain compatible.

User-authored ordering becomes part of Geography backup rather than hidden unbacked state.

The implementation remains data-driven and does not create duplicate membership lists.

## Cost

The existing Geography model must migrate from display-label-based Subregion references toward explicit IDs.

A small Subregion metadata persistence layer is introduced.

Geography export/import gains a feature-specific v2 format.

Consumers must resolve Subregion labels from stable definitions rather than treating freeform strings as identity.

---

# Non-goals

This ADR does not define:

* exact Memo Subregion page layout;
* exact drag-and-drop implementation;
* drag animation;
* automatic generation of an optimal country order;
* multiple alternative orders per Subregion;
* separate Memo and Recite orders;
* quiz scheduling based on country order;
* cloud synchronization;
* generic metadata storage for unrelated features;
* automatic rewriting of mnemonic stories after reorder.

---

# Summary

The resulting model is:

```text
SubregionDefinition
stable ID + label
        │
        │ referenced by
        ▼
    countries.ts
        │
        └── defines current membership
                    │
                    ▼
           SubregionMetadata
             countryOrder
                    │
                    ▼
            effective order
              │          │
              ▼          ▼
            Memo       Recite
              │
              ▼
        SubregionMnemonic
         story + image
              +
      authored-order snapshot
```

And the persistence relationship is:

```text
Geography export v2
│
├── mnemonics
│     ├── country-capital
│     └── Subregion
│
└── Subregion metadata
      └── countryOrder
```

The governing principle is:

> **Stable Geography identity belongs to the domain. Country order belongs to the Subregion. Memo and Recite consume it. A mnemonic stores the order it was authored against, and Geography backup preserves all of it.**
