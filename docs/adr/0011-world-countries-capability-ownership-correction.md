# ADR 0011 — World Countries capability ownership correction

> **Legacy expanded ADR.** The corrected capability-ownership decisions and
> rationale are retained. Migration, validation, acceptance, and implementation
> guidance is historical delivery detail. See the
> [classification ledger](LEGACY_CLASSIFICATION.md) and current
> [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md).

* **Status:** Accepted
* **Date:** 2026-08-09
* **Builds on:** ADR 0010 — World Countries feature architecture and structural reset
* **Feature:** `src/features/world-countries/`
* **Goal:** correct the initial ADR 0010 implementation in place, preserving useful structural work while restoring capability ownership, canonical identity, and the ADR 0009 Learning foundation.

---

# Context

The first implementation attempt for ADR 0010 was based on an earlier version of that decision.

That implementation completed several valuable parts of the structural reset:

```text
WorldCountries.tsx
maps/
maps/assets/
maps/workarea/
drill/
recite/
maintenance/
removal of quiz/
removal of root learning.ts
application-mode rewiring
```

It also passes the World Countries tests, TypeScript compilation, and the production build.

However, the implementation organized shared behavior into broad technical layers:

```text
domain/
persistence/
```

In doing so, it split apart the `learning/` capability established by ADR 0009:

```text
learning session engines       → domain/
Country-learning flow state    → memo/
Subregion learning state       → domain/
Subregion learning store       → persistence/
```

It similarly split shared Geography behavior between `domain/` and `persistence/` instead of giving Geography one clear owner.

The implementation also retained a second Country-code table and fallback Country-ID construction even though canonical Country records already receive stable IDs from `data/countries.ts`.

The code is therefore operational, but its ownership model does not provide the intended long-term foundation.

---

# Decision

Correct the current refactor **in place**.

Do not keep the current structure unchanged, and do not revert and redo the entire ADR 0010 implementation.

The correction will:

1. preserve the application shell, workflow boundaries, map consolidation, and removal of obsolete Quiz architecture;
2. restore `learning/` as a first-class capability;
3. introduce `geography/` as the owner of shared Geography behavior and user-specific Subregion metadata;
4. remove the broad feature-local `domain/` and `persistence/` directories;
5. make canonical Country and Subregion identity authoritative at runtime;
6. delete duplicate and fallback Country-ID construction;
7. remove confirmed dead pre-ADR-0009 Memo code;
8. reduce the public feature barrel to genuine external requirements;
9. preserve World Countries behavior while correcting ownership and dependencies;
10. preserve Pi and unrelated feature persistence strictly.

This is a targeted architectural correction, not a new learning-feature implementation.

---

# 1. Keep, change, and remove

## Keep

Retain the useful parts of the current ADR 0010 implementation:

```text
WorldCountries.tsx
drill/
recite/
maintenance/
maps/
maps/assets/
maps/workarea/
memo/subregion/
mnemonics/
application mode key: world-countries
WorldCountries application-mode wiring
```

Retain the deletion of:

```text
quiz/
root learning.ts
root learning.test.ts
common/
top-level assets/
top-level workarea/
top-level subregions/
```

## Change

Change capability ownership:

```text
domain/geography.ts
→ geography/queries.ts

domain/subregionMetadata.ts
→ geography/subregionMetadata.ts

persistence/subregionMetadataStore.ts
→ geography/subregionMetadataStore.ts

domain/answerMatching.ts
→ learning/answerMatching.ts

domain/shuffleBag.ts
→ learning/shuffleBag.ts

domain/locationRecallSession.ts
→ learning/locationRecallSession.ts

domain/orderedRecallSession.ts
→ learning/orderedRecallSession.ts

memo/countryLearningFlow.ts
→ learning/countryLearningFlow.ts

domain/subregionLearningState.ts
→ learning/subregionLearningState.ts

persistence/subregionLearningStore.ts
→ learning/subregionLearningStore.ts
```

Move associated tests with their owners.

## Remove

After imports have migrated, remove:

```text
domain/
persistence/
domain/country.ts
domain/country.test.ts
```

Also remove confirmed dead Memo architecture:

```text
memo/MemoWorkspace.tsx
memo/memoStore.ts
memo/memoStore.test.ts
```

Do not remove `MemoMnemonicCard` or `memoProgress`; they remain active parts of the ADR 0009 Memo workflow.

Remove the unused Geography convenience wrapper:

```text
getSubregionGroups
```

It has no production consumer, is not part of the intended Geography-query API, and only composes existing queries. A future concrete caller may compose those queries directly or justify a new abstraction from its requirements.

---

# 2. Target structure

```text
src/features/world-countries/
│
├── AGENTS.md
├── index.ts
├── WorldCountries.tsx
│
├── data/
│   ├── countries.ts
│   └── subregions.ts
│
├── geography/
│   ├── queries.ts
│   ├── subregionMetadata.ts
│   ├── subregionMetadata.test.ts
│   ├── subregionMetadataStore.ts
│   └── subregionMetadataStore.test.ts
│
├── learning/
│   ├── answerMatching.ts
│   ├── answerMatching.test.ts
│   ├── shuffleBag.ts
│   ├── shuffleBag.test.ts
│   ├── locationRecallSession.ts
│   ├── locationRecallSession.test.ts
│   ├── orderedRecallSession.ts
│   ├── orderedRecallSession.test.ts
│   ├── countryLearningFlow.ts
│   ├── countryLearningFlow.test.ts
│   ├── subregionLearningState.ts
│   ├── subregionLearningStore.ts
│   └── subregionLearningStore.test.ts
│
├── maps/
│   ├── SvgMapController.ts
│   ├── SvgMapController.test.ts
│   ├── SvgMapView.tsx
│   ├── countryMapIds.ts
│   ├── countryMapIds.test.ts
│   ├── geographyMapAdapter.ts
│   ├── geographyMapAdapter.test.ts
│   ├── mapDefinitions.ts
│   ├── mapDefinitions.test.ts
│   ├── assets/
│   └── workarea/
│
├── mnemonics/
├── memo/
│   └── subregion/
├── drill/
├── recite/
└── maintenance/
```

The tree records ownership. It does not require empty placeholder files.

---

# 3. Capability ownership over technical layers

World Countries will use capability-oriented ownership rather than feature-wide technical layers.

```text
data        owns canonical bundled identity and reference data
geography   owns Geography queries and user-specific Geography metadata
learning    owns answer evaluation, recall mechanics, learning state, and learning storage
maps        owns SVG infrastructure and Geography-to-SVG translation
mnemonics   owns mnemonic targets and content
workflows   compose capabilities for a user intention
```

Storage access does not require a top-level `persistence/` directory.

For example:

```text
learning/subregionLearningState.ts
```

remains pure, while:

```text
learning/subregionLearningStore.ts
```

may use storage APIs. The filenames and dependency direction preserve the pure/impure boundary while keeping one capability together.

Likewise, `geography/subregionMetadataStore.ts` belongs with the Geography metadata it stores.

---

# 4. Canonical Country identity

The canonical runtime `Country` model must require stable identity:

```ts
interface Country {
  id: CountryId
  country: string
  capital: string
  continent: Continent
  subregionId: SubregionId
  subregion: string
  unM49Subregion?: string
  aliases?: readonly string[]
}
```

Normal application code uses:

```ts
country.id
country.subregionId
```

It must not reconstruct identity from a Country name, dataset index, fallback slug, or SVG identifier.

If import code or focused tests require incomplete input, define a separate type such as:

```ts
type CountryRecordInput = Omit<Country, 'id' | 'subregionId'>
```

or construct complete canonical fixtures explicitly.

Delete the second Country-code table and fallback identity behavior currently contained in `domain/country.ts`.

`data/countries.ts` remains the single place where bundled Country records receive their canonical IDs.

---

# 5. Geography

`geography/queries.ts` owns reusable Geography queries, including:

```text
getContinents
getCountriesForContinent
getCountriesForSubregion
getCountriesForSubregionId
getCountriesForSubregionInEffectiveOrder
getSubregionDefinitionsForContinent
getSubregionIdsForContinent
getSubregionsForContinent
```

`geography/subregionMetadata.ts` owns the metadata model, validation, canonical membership reconciliation, and effective Country order.

`geography/subregionMetadataStore.ts` owns storage for that metadata.

Canonical Subregion definitions remain under `data/subregions.ts`.

There is one shared Country order:

```text
canonical Subregion membership
             +
SubregionMetadata.countryOrder
             ↓
effective Country order
```

Memo may author the order. Other workflows may consume it. No workflow owns a duplicate order.

---

# 6. Learning

The ADR 0009 `learning/` subsystem is retained as a coherent capability.

This ownership does not depend on having multiple workflow consumers today. ADR 0009 already established these modules as learning concepts, and the final ADR 0010 explicitly preserves that subsystem as architectural foundation.

Therefore:

```text
locationRecallSession.ts
orderedRecallSession.ts
shuffleBag.ts
countryLearningFlow.ts
subregionLearningState.ts
subregionLearningStore.ts
```

belong in `learning/`, even while Memo is their only current production consumer. Moving the session engines into `memo/` would make reusable learning mechanics workflow-owned and would reverse the boundary established by ADR 0009.

Pure session and state modules remain React-independent and deterministically testable.

Maintain the boundary between:

```text
learning/countryLearningFlow.ts
```

which owns pure flow state and transitions, and:

```text
memo/subregion/CountryLearningFlow.tsx
```

which owns Memo UI orchestration.

Learning storage remains narrowly scoped to World Countries-owned keys. No broad storage clearing is introduced.

`subregionLearningState.ts` and `subregionLearningStore.ts` remain together under Learning. The state module is pure; the store may depend on storage APIs. A generic persistence layer is not needed to preserve this boundary.

---

# 7. Maps and workflows

The current `maps/` consolidation is retained.

Preserve the distinction:

```text
CountryId ≠ SVG ID
```

Canonical and workflow state uses `CountryId`. Translation to SVG identifiers remains in `maps/geographyMapAdapter.ts`.

`SvgMapController` remains imperative, framework-independent infrastructure. `SvgMapView.tsx` remains its React bridge.

Memo, Drill, Recite, and Maintenance remain sibling areas. They must not import one another's internal implementations.

Shared behavior moves to the owning capability:

```text
geography/
learning/
maps/
mnemonics/
```

`WorldCountries.tsx` owns only high-level navigation and workflow composition.

---

# 8. Public boundary

The root `index.ts` is an external boundary, not an internal dependency hub.

Required exports are expected to be:

```ts
export { WorldCountries } from './WorldCountries'
export { MapWorkarea } from './maps/workarea/MapWorkarea'
```

Canonical data or types may be exported only when a consumer outside World Countries demonstrably requires them.

Internal World Countries modules import directly from the owning capability.

The current root exports of Geography queries, answer matching, and Subregion helpers have no confirmed external consumer and must be removed during this correction.

---

# 9. Test ownership and scope

Tests move with the behavior they protect.

Retain:

```text
maps/geographyMapAdapter.test.ts
maps/mapDefinitions.test.ts
```

These tests cover promoted and consolidated map behavior. Their value does not depend on whether an earlier directory diagram enumerated every test filename.

Delete:

```text
domain/country.test.ts
```

because the duplicate Country-identity module it tests is being removed. Canonical Country identity and data invariants should instead be tested at their owner under `data/` where useful.

---

# 10. Implementation sequence

Apply the correction in this order:

```text
1. Restore learning/ from the currently moved modules and tests
2. Create geography/ from the current Geography and metadata modules and tests
3. Update all internal imports to the new owners
4. Make Country.id and Country.subregionId required
5. Replace getCountryId(...) usage with canonical identity
6. Delete domain/country.ts and its tests
7. Remove empty domain/ and persistence/ directories
8. Remove getSubregionGroups and confirmed dead MemoWorkspace/memoStore code and tests
9. Retain useful map tests and remove the obsolete domain/country test
10. Reduce index.ts to required external exports
11. Rewrite the World Countries AGENTS.md ownership guide
12. Correct ADR status and naming coherence
13. Run complete automated and manual validation
```

Temporary imports may exist between individual steps, but no compatibility wrappers or obsolete paths remain after validation.

---

# 11. Validation and acceptance criteria

Run at minimum:

```text
npx vitest run src/features/world-countries
npx tsc -b
npx vite build
```

The correction is complete when all of the following hold:

```text
World Countries opens through WorldCountries.tsx
world-countries mode key is unchanged
Memo navigation works
Memory Preview works
Country walkthrough works
Stage A location practice works
Stage B ordered recall works
learned state updates
Subregion ordering works
mnemonics work
map assets load
map click and highlight behavior works
Drill placeholder renders
Recite placeholder renders
Maintenance boundary remains separate
```

Architecture checks:

```text
learning/ contains the ADR 0009 learning subsystem
geography/ contains queries and Subregion metadata
no top-level domain/ directory
no top-level persistence/ directory
no imports from world-countries/quiz
no imports from world-countries/common
no root world-countries/learning.ts
no imports from memo/geographyMemo
no duplicate Country-code table
no fallback Country identity in normal runtime code
canonical Country.id and Country.subregionId are required
no getSubregionGroups helper without a concrete consumer
no SVG IDs used as Country IDs
no workflow-to-workflow internal imports
index.ts exposes only genuine external requirements
```

Persistence checks:

```text
Pi persistence unchanged
unrelated feature persistence unchanged
no broad localStorage clearing in production code
World Countries storage operations target World Countries-owned keys only
```

Backward compatibility with obsolete World Countries persisted state remains out of scope.

---

# Consequences

## Positive

The useful implementation work is retained rather than repeated.

The physical structure matches the product's actual capabilities.

ADR 0009's Learning foundation remains available to Memo, Drill, Recite, and Maintenance where semantics genuinely match.

Canonical Country identity has one authoritative source.

Geography metadata and its storage have one clear owner.

Pure and impure code remain distinguishable without introducing broad technical-layer directories.

Future work can locate shared behavior by capability instead of deciding between ambiguous `domain/`, `persistence/`, or workflow-local locations.

## Cost

The correction requires another substantial set of file moves and import changes.

Canonical identity tightening requires updates to fixtures and call sites.

Reviewers must distinguish structural moves from intentional deletions.

World Countries persisted state may reset as already permitted by ADR 0010.

---

# Non-goals

This ADR does not define:

```text
new Memo mechanics
Drill question mechanics
Recite scoring or scope mechanics
Maintenance scheduling
Capital-learning mechanics
new map behavior
new mnemonic behavior
cross-feature learning abstractions
persistence migrations for obsolete World Countries state
```

It does not modify Pi or unrelated feature persistence.

---

# Summary

The current implementation should be **changed in place**, not kept unchanged and not redone from scratch.

Keep:

```text
WorldCountries shell
workflow boundaries
maps consolidation
Quiz removal
application wiring
ADR 0009 Memo UI
```

Correct:

```text
domain/ + persistence/
→ geography/ + learning/
```

Remove:

```text
duplicate Country identity
fallback Country IDs
dead MemoWorkspace/memoStore architecture
unused getSubregionGroups helper
unnecessary public exports
```

The governing principle is:

> Organize World Countries by capability ownership, keep canonical identity authoritative, and preserve validated behavior while correcting the structure around it.

## Confirmation

Implemented and verified against the repository on 2026-08-09.
