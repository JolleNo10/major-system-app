# ADR 0006 — Reusable mnemonic stories for Pi and Geography

- **Status:** Accepted
- **Date:** 2026-08-08
- **Builds on:** ADR 0005 — Shared learning model
- **Refines:** ADR 0005’s non-goal of keeping Pi stories feature-specific; Geography is now a second concrete consumer, so shared mnemonic persistence and image handling are justified.
- **Goal:** allow users to save mnemonic text and optional images for multiple learning domains without duplicating Pi-specific story infrastructure

## Context

Pi already supports user-authored mnemonic content.

For a Pi segment, the user can currently save:

```text
freeform text
+
optional image
```

The content is persisted locally and can be imported/exported.

The World Countries feature now needs the same basic functionality for two different mnemonic purposes.

### Country–Capital mnemonic

Example:

```text
Norway ↔ Oslo
```

The user may create a mnemonic story such as:

```text
A Norwegian Viking throws an O-shaped lasso...
```

with an optional mnemonic image.

This mnemonic belongs to the **Country–Capital relationship**.

It does not belong specifically to:

```text
Norway → Oslo
```

or:

```text
Oslo → Norway
```

The same mnemonic can support both recall directions.

---

### Subregion mnemonic

A user may also want one larger mnemonic story for the countries in a subregion.

Example:

```text
Northern Europe

Denmark
Estonia
Finland
Iceland
Ireland
Latvia
Lithuania
Norway
Sweden
United Kingdom
...
```

The user may create one story or image encoding the ordered sequence of countries.

This mnemonic belongs to the **Subregion**, not to one individual country.

---

# Decision

Introduce a reusable mnemonic-content abstraction that can attach:

```text
text
+
optional image
```

to a stable mnemonic target.

The shared capability should support at least:

```text
Pi segment

Country–Capital relationship

Geographic Subregion
```

without making the shared layer understand Pi or Geography.

---

# Core concept: `Mnemonic`

Introduce a domain-neutral mnemonic record.

Conceptually:

```ts
export type MnemonicTargetId = string

export interface Mnemonic {
  targetId: MnemonicTargetId

  text: string
  image: Blob | null

  updatedAt: number
}
```

A mnemonic target is identified by a stable string.

Examples:

```text
pi:segment:4

geo:country-capital:NO

geo:subregion:europe:northern-europe
```

The shared mnemonic system treats these as opaque identifiers.

It must not parse them to make domain decisions.

---

# Mnemonics are separate from scoring identities

ADR 0005 introduces concepts such as:

```text
RecallItem
LearningScope
```

Mnemonic content should not automatically be attached to `RecallItemId`.

This distinction matters for Geography.

For example:

```text
Domain fact:
Norway ↔ Oslo
```

may generate two recall items:

```text
geo:capital:NO:country-to-capital

geo:capital:NO:capital-to-country
```

but there should normally be **one mnemonic**:

```text
geo:country-capital:NO
```

shared by both.

Therefore:

```text
Recall identity ≠ Mnemonic identity
```

Feature code decides which mnemonic target is relevant to a recall item.

---

# Geography mnemonic targets

## 1. Country–Capital target

Every Country–Capital relationship may have one mnemonic.

Example:

```text
geo:country-capital:NO
```

Record:

```ts
{
  targetId: 'geo:country-capital:NO',

  text: '...',
  image: Blob,

  updatedAt: ...
}
```

This content belongs to:

```text
Norway ↔ Oslo
```

rather than one quiz direction.

Both:

```text
Norway → Oslo
```

and:

```text
Oslo → Norway
```

may display the same mnemonic.

---

# 2. Subregion target

Every Subregion may have one mnemonic.

Example:

```text
geo:subregion:europe:northern-europe
```

This mnemonic is intended to help remember:

```text
which countries belong to the subregion
```

and potentially:

```text
their sequence/order
```

Example:

```ts
{
  targetId: 'geo:subregion:europe:northern-europe',

  text: 'A Denmark-shaped dragon crashes into Estonia...',

  image: Blob,

  updatedAt: ...
}
```

---

# Stable identities are required

Mnemonic persistence must not use user-visible labels as its long-term identity.

Avoid keys such as:

```text
Norway

Northern Europe
```

because display names or classifications may later change.

Prefer stable domain identifiers.

For countries:

```ts
interface Country {
  id: CountryId
  country: string
  capital: string
  ...
}
```

For example:

```text
NO
SE
DK
```

For subregions, introduce or derive an explicit stable identifier:

```text
northern-europe
western-europe
balkans
```

with the continent included where useful for uniqueness:

```text
europe:northern-europe
```

The display label remains:

```text
Northern Europe
```

but persistence uses the stable ID.

If ADR 0005 has not yet introduced stable country IDs, that work is a prerequisite for persistent geography mnemonics.

Do not key permanent mnemonic data using the current `country` display string.

---

# Subregion country ordering

A subregion mnemonic often depends on sequence.

For example, the mnemonic story may encode:

```text
Denmark
→ Estonia
→ Finland
→ Iceland
→ ...
```

If the underlying dataset later changes ordering, the stored story could become misleading.

Therefore a subregion mnemonic should record the ordered list of countries that the mnemonic was authored against.

Suggested feature-specific record:

```ts
interface SubregionMnemonic extends Mnemonic {
  countryIds: CountryId[]
}
```

Example:

```ts
{
  targetId:
    'geo:subregion:europe:northern-europe',

  countryIds: [
    'DK',
    'EE',
    'FI',
    'IS',
    ...
  ],

  text: '...',
  image: ...,

  updatedAt: ...
}
```

The initial implementation may use the canonical country order produced by the Geography feature.

Custom drag-and-drop mnemonic ordering is not required by this ADR.

---

# Stale mnemonic detection

Because the country membership of a Subregion may change in the dataset, the application should be able to compare:

```text
stored countryIds

vs

current subregion countryIds
```

If they differ, do not silently rewrite the mnemonic.

The UI may display a warning such as:

```text
This mnemonic was created for an older country list.
```

The user can then review and resave it.

The existing mnemonic remains intact until explicitly updated.

---

# Shared package

Create a shared mnemonic capability.

Suggested structure:

```text
src/core/mnemonics/
  types.ts
  mnemonicStore.ts
  imageProcessing.ts
  backup.ts
```

Potential later additions:

```text
useMnemonic.ts
MnemonicEditor.tsx
MnemonicView.tsx
```

Only extract UI components once Pi and Geography actually share sufficiently similar presentation.

The initial architectural priority is shared:

```text
storage
image processing
backup encoding
CRUD behavior
```

not forcing identical feature UI.

---

# Shared storage contract

Suggested API:

```ts
getMnemonic(
  targetId: MnemonicTargetId,
): Promise<Mnemonic | null>

putMnemonic(
  mnemonic: Mnemonic,
): Promise<void>

deleteMnemonic(
  targetId: MnemonicTargetId,
): Promise<void>

getMnemonics(
  targetIds?: readonly MnemonicTargetId[],
): Promise<Mnemonic[]>
```

Feature wrappers may provide stronger types.

For example:

```ts
getCountryCapitalMnemonic(countryId)

putCountryCapitalMnemonic(countryId, data)

getSubregionMnemonic(subregionId)

putSubregionMnemonic(subregionId, data)
```

Pi may similarly expose:

```ts
getPiSegmentMnemonic(segment)
```

The feature wrappers own target ID construction.

---

# Empty mnemonic behavior

Preserve the existing Pi semantic:

```text
empty text
+
no image
=
no stored mnemonic
```

Saving:

```ts
{
  text: '',
  image: null
}
```

should delete the mnemonic rather than persist an empty record.

This keeps:

```text
story indicators
exports
queries
```

consistent.

---

# Image behavior

Reuse the image-processing behavior already proven by Pi.

Before persistence:

1. load the supplied image;
2. preserve aspect ratio;
3. downscale large images;
4. encode to an efficient browser format;
5. persist the resulting `Blob`.

Initial defaults should preserve current Pi behavior:

```text
maximum edge ≈ 1024 px

preferred:
WebP

quality:
≈ 0.8

fallback:
JPEG
```

The implementation should move this behavior from Pi-specific code into:

```text
core/mnemonics/imageProcessing.ts
```

Pi and Geography should use the same function.

Do not store full-resolution phone/camera images directly.

---

# IndexedDB ownership

Continue using the application's existing shared IndexedDB connection.

Do not open a separate IndexedDB database or independently version the existing database from the Geography feature.

The existing connection owner should remain responsible for schema upgrades.

Add a generic mnemonic object store, for example:

```text
mnemonics
```

with:

```text
keyPath = targetId
```

Conceptually:

```ts
{
  targetId:
    'geo:country-capital:NO',

  text: '...',
  image: Blob | null,
  updatedAt: number
}
```

The database version should be upgraded once through the existing owner.

---

# Existing Pi story compatibility

Existing Pi users may already have data stored in:

```text
pi_stories
```

That content must not be lost.

Do not delete or blindly replace the existing store.

Preferred incremental migration:

```text
Pi requests mnemonic
        ↓
check generic mnemonics store
        ↓
not found?
        ↓
check legacy pi_stories
        ↓
found
        ↓
convert to:
pi:segment:<seg>
        ↓
write generic mnemonic
        ↓
return mnemonic
```

This provides lazy migration.

Existing legacy records may remain in `pi_stories` during the transition.

Once migration has been proven over time, removal of the legacy store can be considered separately.

No destructive migration is required by ADR 0006.

---

# Pi target mapping

Existing Pi story:

```ts
{
  seg: 4,
  text: '...',
  image: ...
}
```

maps to:

```text
pi:segment:4
```

The Pi feature remains responsible for translating:

```text
segment number
↔
MnemonicTargetId
```

The generic mnemonic layer must not know what a Pi segment is.

---

# Geography feature wrappers

Suggested location:

```text
src/features/world-countries/mnemonics/
```

Possible structure:

```text
mnemonics/
  geographyMnemonicIds.ts
  geographyMnemonics.ts
  CountryCapitalMnemonic.tsx
  SubregionMnemonic.tsx
```

The wrappers provide domain-specific IDs and metadata.

Example:

```ts
function countryCapitalMnemonicId(
  countryId: CountryId,
): MnemonicTargetId {
  return `geo:country-capital:${countryId}`
}
```

Example:

```ts
function subregionMnemonicId(
  continentId: ContinentId,
  subregionId: SubregionId,
): MnemonicTargetId {
  return `geo:subregion:${continentId}:${subregionId}`
}
```

---

# Country–Capital UX

Wherever Country/Capital Study or Memo functionality is presented, the user should be able to:

```text
view mnemonic
edit mnemonic
save text
attach image
replace image
remove image
delete mnemonic
```

Example:

```text
Norway
Oslo

────────────────────

Mnemonic

A Viking from Norway throws an
O-shaped lasso around Oslo...

[ mnemonic image ]

Edit
```

Editing:

```text
[ text area ]

[ choose/replace image ]

Save
Cancel
```

The feature should indicate which Country–Capital facts already have mnemonic content.

---

# Subregion UX

A Subregion Study/Memo view should be able to display:

```text
Northern Europe

Countries:
Denmark
Estonia
Finland
Iceland
...

────────────────────

Subregion mnemonic

[ story ]

[ image ]

Edit
```

The mnemonic should visually remain associated with the whole Subregion rather than one country.

If the saved `countryIds` no longer match the current subregion contents, display the stale-content warning.

---

# Country mnemonic vs Subregion mnemonic

These are separate records.

Example:

```text
geo:country-capital:NO

text:
Norway ↔ Oslo mnemonic

image:
country/capital image
```

and:

```text
geo:subregion:europe:northern-europe

text:
story connecting all Northern European countries

image:
subregion sequence image
```

Saving one must not modify the other.

---

# Relationship to ADR 0005

ADR 0005 separates:

```text
Feature Domain
Learning Domain
```

ADR 0006 adds a third orthogonal concern:

```text
Mnemonic Content
```

Conceptually:

```text
               Geography Domain
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
  Learning adapter       Mnemonic adapter
        │                       │
        ▼                       ▼
  core/learning          core/mnemonics
```

A Country–Capital fact can therefore have:

```text
learning state
+
mnemonic content
```

without either system owning the other.

Example:

```text
Norway ↔ Oslo
   │
   ├── RecallItem
   │     Norway → Oslo
   │     Oslo → Norway
   │
   └── Mnemonic
         text
         image
```

This separation is intentional.

---

# Mnemonics must not determine mastery

Saving a story does not mean the item is mastered.

Likewise:

```text
mastered item
```

does not imply:

```text
mnemonic exists
```

These systems remain independent.

Correct:

```text
Country–Capital fact
      │
      ├── learning progress
      │
      └── optional mnemonic
```

Incorrect:

```text
mnemonic saved
      ↓
mark mastered
```

---

# Backup / Export

Reuse the existing Pi backup technique:

```text
Blob
↔
data URL
↔
JSON
```

but make the encoding helpers generic.

Suggested exported format:

```ts
interface MnemonicExport {
  version: 1
  mnemonics: Array<{
    targetId: string
    text: string
    imageDataUrl: string | null
  }>
}
```

Feature-specific exports may filter by prefix.

For example:

```text
pi:
```

or:

```text
geo:
```

Possible filenames:

```text
pi-mnemonics.json

geography-mnemonics.json
```

Do not require users to export all application mnemonics together.

---

# Import

Import must:

1. validate structure;
2. reject malformed target IDs for the importing feature;
3. decode image data safely;
4. skip completely empty entries;
5. preserve existing content unless the import explicitly replaces the same target;
6. report how many mnemonics were imported.

Feature-specific import wrappers should validate their own namespaces.

For example, Geography import should not accept:

```text
pi:segment:4
```

as Geography content.

---

# Object URL lifecycle

When displaying stored Blob images:

```ts
URL.createObjectURL(image)
```

must be paired with:

```ts
URL.revokeObjectURL(url)
```

when the image changes or the component unmounts.

Preserve the existing Pi cleanup behavior.

---

# Storage errors

Mnemonic writes are user-authored content and should not silently fail.

Errors such as:

```text
QuotaExceededError
```

should propagate far enough for the feature UI to display a message.

Example:

```text
Could not save — storage may be full.
```

Read failures may degrade to:

```text
no mnemonic available
```

where appropriate.

---

# Proposed implementation sequence

## Phase 1 — Extract generic image processing

Move the reusable Pi image processing into:

```text
core/mnemonics/imageProcessing.ts
```

Update Pi to use the shared implementation.

No behavior change.

---

## Phase 2 — Add generic mnemonic storage

Add:

```text
mnemonics
```

to the existing IndexedDB schema.

Create:

```text
core/mnemonics/mnemonicStore.ts
```

with generic CRUD.

Add unit tests.

---

## Phase 3 — Preserve / migrate Pi

Add Pi adapter IDs:

```text
pi:segment:<n>
```

Read existing `pi_stories` records as fallback.

Lazy-copy legacy records into the generic store.

Verify existing Pi stories still appear unchanged.

---

## Phase 4 — Add Geography stable identities

Ensure Country records have stable IDs.

Ensure Subregions have stable IDs.

Do this before persisting Geography mnemonic content.

Do not use display labels as persistent keys.

---

## Phase 5 — Add Country–Capital mnemonics

Implement:

```text
geo:country-capital:<countryId>
```

Support:

```text
text
image
edit
delete
import/export
```

Use the same mnemonic for both recall directions.

---

## Phase 6 — Add Subregion mnemonics

Implement:

```text
geo:subregion:<continentId>:<subregionId>
```

Persist the ordered:

```text
countryIds[]
```

used when the mnemonic is saved.

Detect mismatches against current membership.

---

# Non-goals

ADR 0006 does not require:

* image generation;
* cloud synchronization;
* multiple images per mnemonic;
* rich-text editing;
* audio attachments;
* video attachments;
* AI-generated stories;
* automatic story generation;
* custom ordering of Subregion countries;
* automatic display after every wrong quiz answer;
* automatic mastery changes based on mnemonic existence;
* storing separate Country → Capital and Capital → Country stories;
* replacing the Geography domain with mnemonic structures;
* destructive deletion of existing Pi story data.

---

# Architectural constraints

1. `core/mnemonics` must not import Pi.

2. `core/mnemonics` must not import World Countries.

3. Mnemonic target IDs are opaque to the shared layer.

4. Feature code owns target-ID construction.

5. Country–Capital mnemonic identity is relationship-level, not recall-direction-level.

6. Subregion mnemonic identity is Subregion-level.

7. Subregion mnemonics retain the ordered country IDs they were authored against.

8. Mnemonic content does not determine mastery.

9. Learning progress does not require mnemonic content.

10. Images are processed before storage.

11. Use the existing IndexedDB connection owner.

12. Existing Pi stories must remain readable.

13. Empty text + no image represents absence of a mnemonic.

14. User-authored write errors must be surfaced.

---

# Acceptance criteria

The feature is complete when:

1. A user can save text for `Norway ↔ Oslo`.

2. A user can optionally attach an image to that mnemonic.

3. The same mnemonic is available from both:

```text
Norway → Oslo
Oslo → Norway
```

4. Country–Capital mnemonic persistence uses a stable country identity.

5. A user can save separate text and optional image for `Northern Europe`.

6. The Subregion mnemonic records the ordered list of countries it was authored against.

7. A changed Subregion membership/order can be detected without destroying the existing mnemonic.

8. Country and Subregion mnemonics do not overwrite each other.

9. Pi continues to support its existing text/image stories.

10. Existing Pi story data survives introduction of the generic store.

11. Pi and Geography use the same image-processing implementation.

12. Generic mnemonic persistence contains no Pi or Geography logic.

13. Empty mnemonic content is deleted rather than persisted.

14. Geography mnemonic data can be exported and imported.

15. Stored Blob object URLs are properly revoked.

---

# Implementation guidance for Codex

Do not implement this by copying:

```text
piStories.ts
```

into:

```text
countryStories.ts
```

with renamed variables.

This is now a demonstrated shared capability.

Extract the common mechanism:

```text
text
image
CRUD
image processing
backup encoding
```

while keeping domain-specific meaning in feature adapters.

Target architecture:

```text
Pi Segment
     │
     └── pi mnemonic adapter ──────┐
                                   │
                                   ▼
                            core/mnemonics
                                   ▲
                                   │
Country ↔ Capital ────────────────┤
                                   │
Subregion ────────────────────────┘
```

The reusable abstraction is:

> User-authored mnemonic content attached to a stable domain target.

It is not:

> Pi stories copied into another feature.
