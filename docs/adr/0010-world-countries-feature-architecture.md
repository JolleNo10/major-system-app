# ADR 0010 — World Countries feature architecture and structural reset

* **Status:** Accepted
* **Date:** 2026-08-09
* **Builds on:** ADR 0007 — World Countries Memo workflow
* **Builds on:** ADR 0008 — Subregion identity, metadata, and country order
* **Builds on:** ADR 0009 — Subregion Memo country-learning workflow
* **Feature:** `src/features/world-countries/`
* **Goal:** reorganize World Countries around clear capabilities and user workflows, remove the obsolete Quiz architecture, and establish a clean foundation for Drill, Recite, Maintenance, and later Capital learning.

---

# Context

World Countries originally grew around a Country–Capital Quiz.

ADR 0007 introduced the Memo concept.

ADR 0008 introduced stable Subregion identity and user-specific Country ordering.

ADR 0009 introduced the focused Subregion Country-learning workflow and has now been implemented.

As a result, World Countries already contains a meaningful new:

```text
learning/
```

capability containing:

```text
answer matching
shuffle-bag randomization
location-recall session
ordered-recall session
Country-learning flow state
Subregion learning state
Subregion learning storage
```

Memo also now contains the focused:

```text
memo/subregion/
```

workflow introduced by ADR 0009.

At the same time, older architecture remains alongside it:

```text
quiz/
root learning.ts
root learning.test.ts
common/
assets/
workarea/
subregions/
memo/geographyMemo.ts
memoMapAdapter.ts
memoMaps.ts
```

This leaves the feature with two architectural generations:

```text
old Quiz/practice architecture
            +
new Memo/learning architecture
```

Before substantial Drill, Recite, Maintenance, or Capital-learning work begins, the old structure should be removed and shared responsibilities placed under clear owners.

---

# Decision

Perform a structural reset of the World Countries feature around these capabilities:

```text
data/
geography/
learning/
maps/
mnemonics/
```

and these user-facing workflows:

```text
memo/
drill/
recite/
```

with:

```text
maintenance/
```

as a separate system-directed review capability.

Introduce:

```text
WorldCountries.tsx
```

as the single application-level World Countries shell.

The refactor will:

1. remove the World Countries Quiz concept completely;
2. preserve the `learning/` subsystem established by ADR 0009;
3. delete the obsolete root `learning.ts` architecture;
4. move shared Geography behavior out of Memo;
5. consolidate map infrastructure under `maps/`;
6. dissolve misplaced top-level folders such as `common/`, `assets/`, `workarea/`, and `subregions/`;
7. establish Memo, Drill, and Recite as sibling user activities;
8. establish Maintenance as a separate capability that may later recommend or launch Drill or Recite;
9. simplify `index.ts`;
10. rewire the existing `world-countries` application mode to the new shell;
11. allow World Countries persisted state to reset;
12. strictly preserve Pi and unrelated feature persistence;
13. aggressively remove obsolete internal APIs and transitional compatibility code.

This is intentionally a **large structural refactor with minimal new learning behavior**.

---

# 1. ADR status coherence

ADR 0007, ADR 0008, and ADR 0009 have corresponding implemented behavior in the repository.

Their statuses should therefore be updated from:

```text
Proposed
```

to:

```text
Accepted
```

ADR 0010 remains:

```text
Proposed
```

until this structural reset is implemented and validated.

A later ADR refining an earlier Accepted ADR does not invalidate the earlier decision.

---

# 2. Architectural model

World Countries should primarily be organized by **capability ownership**, not generic technical layers.

Target:

```text
                       World Countries
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
      data                geography              learning
       │                      │                      │
       └───────────────┬──────┴──────────────┬───────┘
                       │                     │
                     maps                mnemonics
                       │                     │
                       └──────────┬──────────┘
                                  │
                   ┌──────────────┼──────────────┐
                   ▼              ▼              ▼
                 Memo           Drill          Recite
                                                  ▲
                                                  │
                                            Maintenance
                                      selects what needs review
```

Avoid creating broad feature-local buckets such as:

```text
domain/
persistence/
services/
utils/
```

when a more specific capability owns the behavior.

For example:

```text
learning/subregionLearningState.ts
learning/subregionLearningStore.ts
```

belong together as part of the Learning capability.

Likewise:

```text
geography/subregionMetadata.ts
geography/subregionMetadataStore.ts
```

belong together as part of Geography.

---

# 3. `data/` owns canonical Geography reference data

Retain:

```text
data/
  countries.ts
  subregions.ts
```

This layer owns canonical bundled data and identity.

It includes:

```text
Country
CountryId
Country records
Capital names
aliases
Continent identity
Subregion identity
Subregion definitions
canonical classifications
```

It must not own:

```text
learning sessions
user-specific order
attempt history
map interaction
mnemonics
React state
```

---

# 4. Canonical Country identity is authoritative

Canonical Country records already receive stable IDs.

Prefer the normal runtime model:

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

Normal application code should use:

```ts
country.id
country.subregionId
```

rather than reconstructing identity from:

```text
Country name
dataset index
fallback slug
legacy fixture behavior
```

If incomplete fixture/import data is required, define an explicit separate type rather than weakening canonical runtime identity.

---

# 5. Remove duplicate Country-ID construction

The old root:

```text
learning.ts
```

contains a second Country-code table and fallback identity logic.

This is redundant with canonical Country IDs already assigned in:

```text
data/countries.ts
```

The authoritative model becomes:

```text
data/countries.ts
        ↓
Country.id
```

Do not maintain multiple Country identity systems.

---

# 6. Introduce `geography/`

Create:

```text
geography/
```

for shared behavior describing World Countries Geography and user-specific Geography metadata.

Initial target:

```text
geography/
  queries.ts
  subregionMetadata.ts
  subregionMetadata.test.ts
  subregionMetadataStore.ts
  subregionMetadataStore.test.ts
```

---

# 7. Move `geographyMemo.ts` to shared Geography ownership

The current:

```text
memo/geographyMemo.ts
```

is no longer a Memo-local helper.

It is already consumed across multiple World Countries areas including:

```text
Memo navigation
Memo progress
Subregion screens
mnemonics
map adapters
other Geography helpers
```

Its move is therefore a significant **internal dependency migration**, not a simple filename cleanup.

Move:

```text
memo/geographyMemo.ts
→ geography/queries.ts
```

Preserve the useful Geography-query behavior.

Examples include:

```ts
getContinents()
getCountriesForContinent()
getCountriesForSubregion()
getCountriesForSubregionId()
getCountriesForSubregionInEffectiveOrder()
getSubregionDefinitionsForContinent()
getSubregionIdsForContinent()
getSubregionsForContinent()
```

Future dependency:

```text
Memo ──────────┐
Drill ─────────┤
Recite ────────┼──→ geography/queries
Maintenance ───┘
```

Never:

```text
Recite → memo/geographyMemo
```

After migration, no surviving code should import:

```text
memo/geographyMemo
```

---

# 8. Subregion metadata belongs to Geography

ADR 0008 established:

```ts
interface SubregionMetadata {
  subregionId: SubregionId
  countryOrder: CountryId[]
  updatedAt: number
}
```

Its purpose remains:

> Store user-specific metadata about a Subregion, currently primarily the user's Country order.

Canonical Subregion definitions remain:

```text
data/subregions.ts
```

Move:

```text
subregions/subregionMetadata.ts
→ geography/subregionMetadata.ts
```

and:

```text
subregions/subregionMetadataStore.ts
→ geography/subregionMetadataStore.ts
```

Move associated tests with them.

The old top-level:

```text
subregions/
```

folder is dissolved.

---

# 9. Country order remains shared Geography state

The model established by ADR 0008 remains:

```text
canonical Subregion membership
             +
SubregionMetadata.countryOrder
             ↓
effective Country order
```

Memo may author the order.

Recite will later consume it.

Drill and Maintenance may read it if their future design requires it.

No workflow owns a duplicate order.

---

# 10. Preserve the `learning/` subsystem established by ADR 0009

The current:

```text
learning/
```

directory is intentional architecture.

Retain it as a first-class World Countries capability.

Current responsibilities include:

```text
answerMatching.ts
shuffleBag.ts
locationRecallSession.ts
orderedRecallSession.ts
countryLearningFlow.ts
subregionLearningState.ts
subregionLearningStore.ts
```

These are learning-domain concepts rather than Memo UI implementation.

They may later be reused by:

```text
Memo
Drill
Recite
Maintenance
```

where their semantics genuinely match.

---

# 11. `learning/` ownership rules

A module belongs in `learning/` when it describes:

```text
answer evaluation
learning state
recall mechanics
practice mechanics
session transitions
shared learning primitives
```

It does not own:

```text
canonical Geography queries
map infrastructure
React screens
mnemonic domain logic
application navigation
```

Examples:

```text
shuffleBag.ts
→ learning/
```

```text
getCountriesForContinent()
→ geography/
```

```text
SvgMapController
→ maps/
```

```text
CountryLearningFlow.tsx
→ memo/
```

---

# 12. Keep answer matching under Learning

The reusable World Countries answer-matching implementation already lives in:

```text
learning/answerMatching.ts
```

with colocated tests.

The old:

```text
quiz/countryQuiz.ts
```

only re-exports part of this behavior.

Therefore there is **no answer-matching extraction from Quiz required**.

When Quiz is removed:

```text
delete Quiz re-export
        ↓
remaining consumers import learning/answerMatching directly
```

Retain:

```text
learning/answerMatching.ts
learning/answerMatching.test.ts
```

Answer matching belongs to Learning because it evaluates learner responses rather than describing canonical Geography.

---

# 13. Preserve Stage A/B session engines

Retain:

```text
learning/shuffleBag.ts
learning/locationRecallSession.ts
learning/orderedRecallSession.ts
```

and their tests.

They remain:

```text
pure
React-independent
map-independent
deterministically testable
```

Do not move these rules into React components.

---

# 14. Preserve the Country-learning flow boundary

Maintain the distinction between:

```text
learning/countryLearningFlow.ts
```

and:

```text
memo/subregion/CountryLearningFlow.tsx
```

The first owns pure learning-flow state and transitions.

The second owns Memo UI orchestration.

If clearer naming is desired during implementation:

```text
learning/countryLearningFlow.ts
→ learning/countryLearningFlowState.ts
```

is acceptable.

Do not merge the pure and React layers.

---

# 15. Learning persistence stays with Learning

Retain:

```text
learning/subregionLearningState.ts
learning/subregionLearningStore.ts
```

together.

Do not move the store into a generic top-level persistence layer.

The state module remains pure.

The store may depend on storage APIs.

The pure state must not depend on storage.

---

# 16. Delete root `learning.ts` definitively

The old:

```text
src/features/world-countries/learning.ts
src/features/world-countries/learning.test.ts
```

belong to the old Quiz/practice architecture.

Its APIs are consumed only by the old Quiz flow.

Removing Quiz therefore makes this module dead code.

Delete it rather than migrating its model into the new `learning/` capability.

Delete concepts such as:

```text
CountryQuizDirection coupling
countryToCapitalItemId()
capitalToCountryItemId()
countryRecallItemId()
getCountryScope()
getSubregionScope()
getContinentScope()
getWorldScope()
getCountryPoolScope()
loadCountryLearningProgress()
recordCountryAttempt()
selectCountryEntry()
```

Future Drill, Recite, and Maintenance item models must be designed from their actual requirements.

Do not allow the old Quiz item model to become the default simply because it already exists.

---

# 17. Remove the World Countries Quiz completely

Delete:

```text
quiz/
  CountryCapitalDrill.tsx
  countryQuiz.ts
  countryQuiz.test.ts
```

No:

```text
quiz/
```

folder remains.

No compatibility proxy remains.

No deprecated export remains.

No `CountryQuizDirection` remains.

No distractor builder or Quiz-specific random Country picker is retained speculatively.

Future Drill gets a clean design.

---

# 18. Consolidate map infrastructure under `maps/`

Replace:

```text
common/
assets/
workarea/
```

with:

```text
maps/
```

Target:

```text
maps/
  SvgMapController.ts
  SvgMapController.test.ts
  SvgMapView.tsx

  countryMapIds.ts
  countryMapIds.test.ts

  mapDefinitions.ts
  geographyMapAdapter.ts

  assets/
    *.svg

  workarea/
    MapWorkarea.tsx
    MapWorkarea.test.ts
```

---

# 19. Remove `common/`

Move:

```text
common/SvgMapController.ts
→ maps/SvgMapController.ts

common/SvgMapController.test.ts
→ maps/SvgMapController.test.ts

common/SvgMapView.tsx
→ maps/SvgMapView.tsx

common/countryMapIds.ts
→ maps/countryMapIds.ts

common/countryMapIds.test.ts
→ maps/countryMapIds.test.ts

common/worldMap.ts
→ maps/mapDefinitions.ts
```

Do not retain:

```text
common/
```

as a generic helper bucket.

---

# 20. Map assets belong under Maps

Move:

```text
assets/*.svg
```

to:

```text
maps/assets/*.svg
```

Update:

```text
?url
?raw
```

imports as required.

Do not modify SVG contents merely because they move.

---

# 21. Map workarea belongs under Maps

Move:

```text
workarea/
```

to:

```text
maps/workarea/
```

The workarea is a map-development and experimental surface.

It is not a learning workflow.

---

# 22. Promote Memo-owned shared map code to Maps

Existing Memo map infrastructure includes:

```text
memoMapAdapter.ts
memoMaps.ts
```

Move generally reusable responsibilities downward.

Target:

```text
memoMapAdapter.ts
→ maps/geographyMapAdapter.ts

memoMaps.ts
→ maps/mapDefinitions.ts
```

where responsibilities overlap appropriately.

The intended distinction is:

```text
maps/
  knows how World Countries Geography maps to SVG

memo/
  decides what map state means inside Memo
```

---

# 23. Keep workflow-specific map components inside workflows

Components such as:

```text
memo/subregion/CountryLearningMap.tsx
```

remain inside Memo because they express Memo-specific behavior.

For example:

```text
highlight current learning target
mute Countries outside the Subregion
turn map click into CountryId answer
```

But their dependencies should come from:

```text
maps/
geography/
learning/
data/
```

not from:

```text
common/
root learning.ts
memoMapAdapter.ts
memoMaps.ts
```

---

# 24. Country IDs and SVG IDs remain separate

Preserve the invariant:

```text
CountryId ≠ SVG ID
```

World Countries domain/learning/workflow state uses:

```text
CountryId
```

Map controller infrastructure may use:

```text
SVG ID
```

Translation belongs in:

```text
maps/geographyMapAdapter.ts
```

Never persist SVG IDs as canonical Country identity.

---

# 25. `SvgMapController` remains imperative infrastructure

`SvgMapController` remains a class because it owns mutable external resources:

```text
SVG DOM
listeners
styles
hover state
zoom state
cleanup
```

It must remain unaware of:

```text
Memo
Drill
Recite
Maintenance
learning progress
correct answers
Country order
Subregion mastery
```

---

# 26. `SvgMapView` remains the React bridge

Retain:

```text
maps/SvgMapView.tsx
```

as the declarative React wrapper around `SvgMapController`.

It owns appropriate concerns such as:

```text
controller lifecycle
SVG loading/error state
declarative SVG-ID updates
click forwarding
```

It does not own learning rules.

---

# 27. Mnemonics remain a first-class capability

Retain:

```text
mnemonics/
```

for shared Geography mnemonic concerns including:

```text
mnemonic target IDs
Subregion mnemonic content
Country–Capital mnemonic content
story/image persistence
stale-order detection
import/export
mnemonic-specific UI
```

Mnemonic concepts are not owned exclusively by Memo.

---

# 28. Establish `WorldCountries.tsx`

Create:

```text
WorldCountries.tsx
```

as the single application-level World Countries shell.

It composes the primary activity areas.

Conceptually:

```text
World Countries
│
├── Memo
├── Drill
└── Recite
```

Maintenance may appear as a review entry/status but is not required to be a fourth equal tab.

`WorldCountries.tsx` should own only high-level navigation and composition.

It must not own:

```text
learning rules
Geography queries
map mechanics
answer matching
mnemonic persistence
maintenance scheduling
```

---

# 29. Memo

Memo means:

> Teach me material I do not yet know.

It is the initial-learning workflow.

ADR 0009 defines the current Country-learning mechanics.

Memo may:

```text
show material
show memory aids
walk through Countries
repair mistakes
require a final clean recall
```

---

# 30. Drill

Drill means:

> Let me deliberately practise material I choose.

Future Drill may allow the user to select:

```text
scope
Country/location practice
Country → Capital
Capital → Country
question count
practice mode
```

This ADR does not define Drill mechanics.

Initially:

```text
drill/WorldCountriesDrill.tsx
```

may be a lightweight landing/intent component.

---

# 31. Recite

Recite means:

> Let me reproduce a complete learned scope.

Future Recite may support:

```text
Subregion
Continent
World
Country sequence
Capital sequence
complete-run results
```

Recite is user-directed complete recall rather than instructional repair.

This ADR does not define Recite mechanics.

Initially:

```text
recite/WorldCountriesRecite.tsx
```

may remain lightweight.

---

# 32. Maintenance is separate from Recite

Maintenance answers:

> What learned material needs reinforcement now?

It is not inherently a recall-session UI.

Maintenance may later decide:

```text
Northern Europe sequence is due
→ Recite
```

or:

```text
three Capitals are weak
→ Drill
```

Therefore retain a separate:

```text
maintenance/
```

capability.

Do not physically nest Maintenance inside:

```text
recite/
```

---

# 33. Maintenance need not be an equal navigation tab

Architecture and UI hierarchy are separate.

The user interface may eventually show:

```text
Memo | Drill | Recite
```

with an additional:

```text
8 reviews due
[ Review ]
```

entry elsewhere.

Maintenance may also be surfaced from Recite for convenience.

This ADR deliberately leaves the final UI placement open.

---

# 34. Workflow dependency rule

Target:

```text
memo/
drill/
recite/
maintenance/
```

as sibling workflow/capability areas.

Avoid:

```text
Drill → Memo internals
Recite → Memo internals
Maintenance → Drill internals
Maintenance → Recite internals
```

If two workflows need the same behavior, move it to an appropriate shared capability:

```text
learning/
geography/
maps/
mnemonics/
```

---

# 35. Preserve the ADR 0009 Memo structure

Retain:

```text
memo/subregion/
```

and its focused components such as:

```text
SubregionMemoScreen
SubregionOverview
CountryLearningFlow
MemoryPreviewStep
CountryWalkthroughStep
LocationPracticeStep
OrderedRecallStep
CountryLearningComplete
CountryLearningMap
SubregionOrderEditor
```

ADR 0010 should clean their dependencies, not flatten the workflow back into one component.

---

# 36. Audit pre-ADR-0009 Memo code aggressively

Older Memo files still exist alongside the new Subregion workflow.

Audit files such as:

```text
MemoWorkspace.tsx
MemoMnemonicCard.tsx
memoStore.ts
memoProgress.ts
```

For each:

```text
still actively required?
       │
   yes │ no
       │
       ▼
keep / rename / move
           or
         delete
```

Do not preserve superseded architecture merely because it predates ADR 0009.

Associated dead tests should also be removed.

---

# 37. `memoProgress` may remain Memo-specific

If the current progress helpers are still useful solely for presenting initial-learning completion at:

```text
World
Continent
Subregion
```

they may remain under:

```text
memo/
```

Their meaning must remain:

> Aggregate durable initial-learning state for Memo presentation.

They must not evolve into the general long-term mastery model.

---

# 38. World Countries persistence may reset

Existing World Countries persisted state does not require backward compatibility during this refactor.

It is acceptable to:

```text
change World Countries storage keys
change World Countries storage schema
discard old Quiz history
discard old Memo state
discard Subregion-learning state
discard old mnemonic data
discard old Subregion metadata
```

if doing so produces a cleaner architecture.

Do not build migration layers solely to preserve old World Countries data.

---

# 39. Stable runtime identities still matter

Disposable persisted state does not mean domain identity is disposable.

Continue using:

```text
CountryId
SubregionId
ContinentId
```

consistently.

Do not replace them with:

```text
display labels
array indexes
SVG IDs
```

as runtime identity.

---

# 40. Pi persistence is protected

This refactor must not modify Pi persistence.

Do not:

```text
change Pi storage keys
change Pi schemas
clear Pi data
migrate Pi data
rename Pi persistence APIs
change Pi backup formats
```

Never use broad cleanup such as:

```ts
localStorage.clear()
```

World Countries storage cleanup must target only World Countries-owned keys.

Unrelated feature persistence is also out of scope.

---

# 41. Simplify `index.ts`

The current World Countries `index.ts` is a large kitchen-sink barrel exposing internal implementation details.

Reduce it substantially.

Primary external export:

```ts
export { WorldCountries } from './WorldCountries'
```

If still externally required:

```ts
export { MapWorkarea } from './maps/workarea/MapWorkarea'
```

Canonical data/types may remain public only if external code genuinely needs them.

Do not publicly export every:

```text
store
session reducer
Geography helper
mnemonic implementation helper
map adapter
learning primitive
```

for internal convenience.

---

# 42. Internal imports should bypass the root barrel

Outside World Countries:

```text
@/features/world-countries
```

is the public boundary.

Inside World Countries, import directly from the owning capability.

Examples:

```ts
@/features/world-countries/learning/answerMatching
@/features/world-countries/geography/queries
@/features/world-countries/maps/SvgMapView
```

Do not use `index.ts` as an internal dependency hub.

---

# 43. Application mode key remains stable

The existing application mode key:

```text
world-countries
```

remains unchanged.

This refactor is **not** a mode-identity migration.

Change only the component wiring.

Before:

```text
world-countries
→ WorldCountriesDrill
```

After:

```text
world-countries
→ WorldCountries
```

`src/app/modes.tsx` must therefore replace the `WorldCountriesDrill` import with `WorldCountries`.

The existing:

```text
world-countries-workarea
```

mode may remain unchanged as a mode key while its `MapWorkarea` import moves to the new map path/public export.

---

# 44. World Countries application presentation

Conceptually the application card becomes:

```text
🌍 World Countries

Memo · Drill · Recite

Learn, practise, recall and retain
the world's countries and capitals.
```

The exact copy is a UI detail.

Maintenance may surface separately as due-review status/action.

---

# 45. Classify refactor operations explicitly

Implementation should distinguish three kinds of structural change.

## Delete

Old architecture with no surviving responsibility:

```text
quiz/
root learning.ts
root learning.test.ts
dead pre-ADR-0009 Memo code
```

## Move

Same responsibility, better physical ownership:

```text
common/*
→ maps/*

assets/*
→ maps/assets/*

workarea/*
→ maps/workarea/*

subregions/subregionMetadata*
→ geography/*
```

## Promote to shared capability

Code that remains valid but is no longer workflow-local:

```text
memo/geographyMemo.ts
→ geography/queries.ts

memoMapAdapter.ts
→ maps/geographyMapAdapter.ts

memoMaps.ts
→ maps/mapDefinitions.ts
```

Do not treat all structural changes as equivalent.

---

# 46. Target directory structure

Target:

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
│   ├── mapDefinitions.ts
│   ├── geographyMapAdapter.ts
│   │
│   ├── assets/
│   │   └── *.svg
│   │
│   └── workarea/
│       ├── MapWorkarea.tsx
│       └── MapWorkarea.test.ts
│
├── mnemonics/
│   └── ...
│
├── memo/
│   ├── WorldCountriesMemo.tsx
│   ├── navigation/
│   │   └── MemoNavigationMap.tsx
│   └── subregion/
│       └── ...
│
├── drill/
│   └── WorldCountriesDrill.tsx
│
├── recite/
│   └── WorldCountriesRecite.tsx
│
└── maintenance/
    └── ...
```

This diagram defines ownership.

Do not create empty files merely to satisfy it.

---

# 47. Top-level structures intentionally removed

After the refactor, remove:

```text
quiz/
common/
assets/
workarea/
subregions/
root learning.ts
root learning.test.ts
memo/geographyMemo.ts
```

Also remove obsolete pre-ADR-0009 Memo files once confirmed unused.

Do not leave compatibility proxy modules after imports have been migrated.

---

# 48. Desired dependency direction

```text
                     data
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
      geography                learning
          │                       │
          ├──────────┬────────────┤
          ▼          ▼            ▼
        maps      mnemonics   learning state
          \          |            /
           \         |           /
            └────────┼───────────┘
                     ▼
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
     Memo          Drill         Recite
                                     ▲
                                     │
                                Maintenance
                          selects/recommends review

                     ▼
             WorldCountries.tsx
```

Not every arrow is mandatory.

The governing dependency rule is:

> Higher-level workflows may consume shared capabilities. Shared capabilities must not depend on workflow implementations.

---

# 49. Avoid speculative framework design

Do not introduce:

```text
GenericLearningFeature
UniversalRecallEngine
AbstractPracticeWorkflow
GenericGeographyApplication
UniversalMaintenanceScheduler
```

without a concrete requirement.

Low-level implementations may still be internally generic.

For example:

```text
ShuffleBag<T>
OrderedRecallSession<TId>
```

can remain generic while still being owned by World Countries until another feature genuinely needs them.

---

# 50. Implementation sequence

Recommended order:

```text
1. Mark ADR 0007, 0008, and 0009 Accepted

2. Add WorldCountries.tsx
   Add Drill and Recite structural entry components
   Establish Maintenance boundary if needed

3. Rewire app/modes.tsx
   Keep mode key "world-countries"
   Replace WorldCountriesDrill with WorldCountries

4. Move Subregion metadata into geography/
   Move geographyMemo.ts into geography/queries.ts
   Update all consumers

5. Create maps/
   Move common/
   Move assets/
   Move workarea/
   Promote memo map adapters/definitions

6. Update ADR-0009 Memo components to new Geography/Maps imports

7. Delete quiz/

8. Delete root learning.ts and learning.test.ts

9. Audit and remove superseded pre-ADR-0009 Memo code

10. Simplify index.ts

11. Rewrite World Countries AGENTS.md

12. Run complete validation
```

Temporary transitional imports may exist during individual implementation steps.

They must not remain in the final state.

---

# 51. Update `AGENTS.md`

The current World Countries guide still describes Quiz as the primary feature architecture and is stale after ADR 0009.

Rewrite it to describe:

```text
data/
geography/
learning/
maps/
mnemonics/
memo/
drill/
recite/
maintenance/
WorldCountries.tsx
```

It must explicitly record:

* no World Countries Quiz concept;
* canonical Country/Subregion identity belongs to `data/`;
* `geography/` owns shared Geography queries and user-specific Subregion metadata;
* `learning/` owns answer evaluation and reusable learning mechanics;
* `maps/` owns SVG/map infrastructure;
* `mnemonics/` remains shared;
* no workflow-to-workflow imports;
* Country IDs and SVG IDs are distinct;
* Memo is initial learning;
* Drill is user-selected practice;
* Recite is complete user-selected recall;
* Maintenance decides what needs reinforcement;
* World Countries persistence may reset;
* Pi and unrelated feature persistence must not be touched.

---

# 52. Validation

Run at minimum:

```text
npx vitest run src/features/world-countries
npx tsc -b
npx vite build
```

Validate:

```text
World Countries opens through WorldCountries.tsx
world-countries mode key remains unchanged
Memo opens and works
ADR 0009 Country learning still works
Memory Preview works
Country walkthrough works
Stage A works
Stage B works
learned state updates
Drill placeholder renders
Recite placeholder renders
map assets load
map click/highlight behavior works
Subregion ordering works
mnemonics still function in the new runtime
```

Architecture checks:

```text
no imports from world-countries/quiz
no imports from world-countries/common
no import of root world-countries/learning.ts
no imports from memo/geographyMemo
no top-level subregions/ metadata folder
no duplicate Country-code identity table
no SVG IDs used as Country IDs
index.ts is no longer a kitchen-sink internal barrel
```

Persistence checks:

```text
Pi persistence unchanged
no broad localStorage clearing
unrelated feature persistence unchanged
```

Backward compatibility with old World Countries persisted state is not required.

---

# Consequences

## Positive

The feature structure reflects the product architecture that now actually exists.

ADR 0009's Learning subsystem remains intact rather than being immediately reorganized again.

Old Quiz assumptions are removed before Drill, Recite, and Maintenance are designed.

Canonical Country identity has one owner.

Shared Geography behavior no longer belongs to Memo.

Map infrastructure has one clear subsystem.

Subregion definitions and user Subregion metadata become clearly separated.

Memo, Drill, and Recite become independent user workflows.

Maintenance remains flexible enough to direct future review into either Drill or Recite.

The World Countries public API becomes smaller.

Future agents can reason about the feature from ownership rather than historical folder names.

## Cost

The refactor produces a relatively large structural diff.

Many internal imports change.

World Countries persisted state may be lost.

Several old files and tests are intentionally deleted.

The large `geographyMemo.ts` dependency migration requires careful typecheck/test coverage.

ADR 0009 Memo code needs map/identity dependency cleanup during the move.

---

# Non-goals

This ADR does not define:

```text
Drill question mechanics
Drill weighting
Drill mastery criteria
Recite scoring
Recite scope mechanics
Maintenance scheduling
Maintenance decay algorithms
Maintenance due-item selection
Capital-learning mechanics
Capital completion criteria
```

It also does not change:

```text
src/core/learning
canonical Geography content
Pi persistence
unrelated feature persistence
```

---

# Summary

ADR 0009 established the new World Countries learning foundation.

ADR 0010 cleans up the architecture around it.

Delete:

```text
quiz/
root learning.ts
root learning.test.ts
dead superseded Memo code
```

Move:

```text
common/      → maps/
assets/      → maps/assets/
workarea/    → maps/workarea/
subregions/* → geography/
```

Promote shared behavior:

```text
memo/geographyMemo.ts
→ geography/queries.ts

memoMapAdapter.ts
→ maps/geographyMapAdapter.ts

memoMaps.ts
→ maps/mapDefinitions.ts
```

Final capability structure:

```text
data/
geography/
learning/
maps/
mnemonics/

memo/
drill/
recite/
maintenance/

WorldCountries.tsx
```

The governing principles are:

> **World Countries workflows share capabilities and domain state, not each other's implementations.**

> **ADR 0009's Learning subsystem is the foundation for reusable World Countries learning mechanics and should remain intact.**

> **Memo, Drill, and Recite define user activities; Maintenance determines what learned material needs reinforcement.**

> **Canonical Geography identity belongs to canonical data, not learning or map infrastructure.**

> **Prefer a clean World Countries architecture over migration compatibility, while strictly preserving Pi and unrelated feature persistence.**

## Confirmation

Implemented and verified against the repository on 2026-08-09.
