# ADR 0010 — World Countries feature architecture and workflow structure

* **Status:** Implemented
* **Date:** 2026-08-09
* **Builds on:** ADR 0007 — World Countries Memo workflow
* **Builds on:** ADR 0008 — Subregion identity, metadata, and country order
* **Builds on:** ADR 0009 — Subregion Memo country-learning workflow
* **Feature:** `src/features/world-countries/`
* **Goal:** reset the World Countries feature structure before further Drill, Recite, and Maintenance development, remove the obsolete Quiz architecture, and establish clear domain and dependency boundaries for future work.

---

# Context

World Countries originally grew around a Country–Capital Quiz.

The feature has since evolved into a broader learning system with several distinct user intentions.

The emerging lifecycle is:

```text
Memo
  ↓
Drill
  ↓
Recite
  ↓
Maintenance
```

These terms do not all represent the same kind of concept.

They mean:

```text
Memo
Learn new material.

Drill
Deliberately practise material selected by the user.

Recite
Recall a complete learned scope selected by the user.

Maintenance
Let the system decide what learned material needs reinforcement.
```

The old `quiz/` architecture no longer represents this model.

Several shared World Countries concepts are also currently stored under feature-specific or ambiguous locations such as:

```text
quiz/
memo/
common/
subregions/
workarea/
```

Examples include:

* answer normalization inside Quiz;
* Geography queries under Memo;
* stable Country identity inside `learning.ts`;
* map infrastructure under `common/`;
* map assets at the World Countries root;
* Subregion domain state and persistence mixed together;
* the map workarea as a peer of user learning workflows.

Continuing to build on this structure would encourage dependencies such as:

```text
Recite → Memo
Memo → Quiz
Subregion domain → learning → Quiz
```

which do not reflect the intended architecture.

Before implementing substantial Drill, Recite, or Maintenance behavior, World Countries should therefore be reorganized around its actual domain.

---

# Decision

Perform a structural reset of the World Countries feature.

The refactor should:

1. remove the old World Countries Quiz completely;
2. introduce one World Countries application shell;
3. establish three primary user learning activities:

   * Memo
   * Drill
   * Recite;
4. establish Maintenance as a separate scheduling/selection capability;
5. separate canonical Geography data from domain behavior;
6. separate domain models from persistence implementations;
7. consolidate map infrastructure into a dedicated subsystem;
8. move shared Geography behavior out of Memo;
9. move stable Country identity out of learning-specific code;
10. remove obsolete World Countries learning adapters that only supported the old Quiz;
11. allow World Countries persisted state to be reset during the refactor;
12. explicitly preserve persistence belonging to Pi and unrelated features;
13. avoid compatibility wrappers for obsolete internal paths;
14. update the feature guide to enforce the new dependency boundaries.

This is intentionally a **large structural refactor with minimal new learning behavior**.

---

# 1. World Countries becomes one application

The application-level World Countries entry should no longer render a Quiz or Drill directly.

Introduce:

```text
WorldCountries.tsx
```

as the feature shell.

Conceptually:

```text
World Countries
│
├── Memo
├── Drill
├── Recite
│
└── Maintenance entry/status where appropriate
```

The exact UI placement of Maintenance is deliberately not fixed by this ADR.

`WorldCountries.tsx` owns only:

* area navigation;
* selected primary activity;
* high-level Maintenance status or entry point if required;
* rendering workflow entry components.

It must not own:

* Geography queries;
* answer checking;
* learning algorithms;
* scoring;
* mnemonic persistence;
* map-controller behavior;
* Subregion metadata;
* Maintenance scheduling rules.

---

# 2. Primary user activities

World Countries has three primary user-controlled learning activities.

## Memo

Purpose:

> Learn new World Countries material and create or use memory structures that support initial recall.

Responsibilities include:

* World → Continent → Subregion navigation;
* Subregion preparation;
* user-specific Country order;
* mnemonic story/image support;
* initial Country learning;
* later initial Capital learning.

Memo is instructional.

It may:

* reveal answers;
* provide walkthroughs;
* repeat material deliberately;
* use repair behavior;
* show memory aids.

---

## Drill

Purpose:

> Deliberately practise a user-selected set of World Countries knowledge.

Future Drill may support:

* selected Geography scope;
* country location questions;
* Country → Capital;
* Capital → Country;
* mixed modes;
* selected question count;
* targeted practice;
* random or weighted repetition.

Drill is user-directed practice.

The user decides:

```text
what to practise
```

This ADR does not define Drill mechanics.

For now, Drill is a structural workflow area with a lightweight landing screen describing its intent.

---

## Recite

Purpose:

> Recall a complete learned scope in its defined order.

Future Recite may support:

* Subregion recitation;
* Continent recitation;
* World recitation;
* ordered Country recall;
* ordered Capital recall;
* complete-run results.

Recite is user-directed complete recall.

The user selects a scope and attempts to reproduce it.

Unlike Memo, Recite should not primarily teach or repair mistakes during the run.

This ADR does not define Recite mechanics or scoring.

---

# 3. Maintenance is not simply another session type

Maintenance has a different responsibility from Memo, Drill, and Recite.

Memo, Drill, and Recite define activities.

Maintenance answers:

> What should the user review now?

Maintenance may later consider:

* attempt history;
* time since successful recall;
* weak items;
* failure history;
* mastery/proficiency;
* due dates;
* decay;
* learned scopes.

It may then launch or recommend an appropriate activity.

For example:

```text
Maintenance
    ↓
Northern Europe sequence is due
    ↓
launch Recite
```

or:

```text
Maintenance
    ↓
three capitals are weak
    ↓
launch targeted Drill
```

Therefore:

```text
Maintenance ≠ Recite
```

and:

```text
Maintenance ≠ Drill
```

Maintenance may orchestrate either.

---

# 4. Maintenance architecture vs UI placement

Keep Maintenance separate in the code architecture.

Target:

```text
maintenance/
```

as a sibling capability to:

```text
memo/
drill/
recite/
```

Do not physically nest:

```text
recite/maintenance/
```

because that would imply Maintenance can only use Recite.

However, this ADR does not require Maintenance to be a fourth equal navigation tab.

Possible future UI representations include:

```text
Memo | Drill | Recite
```

with:

```text
Due today
12 items need review
[ Start maintenance ]
```

or:

```text
Recite

Due review
[ Start ]

Free recitation
[ Choose scope ]
```

or a dedicated Maintenance area if later justified.

Architecture and navigation hierarchy do not need to be identical.

---

# 5. Remove the World Countries Quiz concept

Delete:

```text
src/features/world-countries/quiz/
```

including:

```text
CountryCapitalDrill.tsx
countryQuiz.ts
countryQuiz.test.ts
```

Do not retain `quiz/` as:

* a deprecated directory;
* an alias;
* a compatibility wrapper;
* an internal barrel.

The term `Quiz` should no longer represent a World Countries domain or workflow concept.

---

# 6. Preserve only genuinely reusable Quiz logic

The old Quiz mixes generic World Countries behavior with Quiz-specific behavior.

Move reusable behavior such as:

```text
normalizePlaceName(...)
matchesPlaceName(...)
```

to a shared World Countries domain module.

Delete Quiz-specific concepts such as:

```text
CountryQuizDirection
CountryQuestion
buildCountryQuestion(...)
pickCountry(...)
distractor construction
quiz-specific shuffle helpers
```

unless a current non-Quiz consumer demonstrably requires them.

Do not preserve old APIs merely because they may hypothetically become useful later.

Future Drill should be designed from Drill requirements.

---

# 7. Canonical reference data stays in `data/`

Target:

```text
data/
  countries.ts
  subregions.ts
```

This layer answers:

> What Geography entities and classifications exist?

It owns canonical reference information such as:

* Country records;
* `CountryId`;
* Country names;
* Capitals;
* Continent identities;
* Subregion identities;
* labels;
* canonical classifications.

It must not own:

* user-specific order;
* learning state;
* persistence;
* React state;
* map behavior;
* session state.

---

# 8. Introduce a World Countries `domain/` layer

Create:

```text
domain/
```

for pure World Countries concepts and rules shared across workflows.

Initial target:

```text
domain/
  country.ts
  geography.ts
  answerMatching.ts
  subregionMetadata.ts
```

Additional domain modules should only be introduced when concrete behavior justifies them.

---

# 9. Stable Country identity belongs to the domain

Stable Country identity must not depend on learning mechanics or Quiz concepts.

Move the existing Country identity behavior out of root `learning.ts`.

Target:

```text
domain/country.ts
```

Conceptually:

```ts
getCountryId(country)
getCountryById(id)
```

Preferred dependency:

```text
data/countries.ts
      ↓
domain/country.ts
      ↓
World Countries consumers
```

Avoid:

```text
Subregion metadata
      ↓
learning
      ↓
Quiz
```

merely to obtain Country identity.

---

# 10. Shared Geography queries belong to the domain

Move shared Geography behavior out of:

```text
memo/geographyMemo.ts
```

into:

```text
domain/geography.ts
```

This includes appropriate pure queries such as:

```ts
getContinents(...)
getCountriesForContinent(...)
getCountriesForSubregion(...)
getCountriesForSubregionId(...)
getSubregionsForContinent(...)
getSubregionDefinitionsForContinent(...)
```

and effective ordered Subregion queries where appropriate.

Desired dependency:

```text
Memo ────────┐
Drill ───────┤
Recite ──────┼──→ domain/geography
Maintenance ─┘
```

Avoid workflow ownership of generally useful Geography queries.

---

# 11. SubregionMetadata remains shared domain state

The user-specific Subregion order remains represented by:

```ts
interface SubregionMetadata {
  subregionId: SubregionId
  countryOrder: CountryId[]
  updatedAt: number
}
```

Its semantics remain:

> `countryOrder` is the user-specific order for that Subregion.

Memo may author it.

Recite may consume it.

Other areas may read it as needed.

Move the pure model and reconciliation logic to:

```text
domain/subregionMetadata.ts
```

including appropriate operations such as:

```ts
getCanonicalSubregionCountries(...)
resolveSubregionCountryOrder(...)
resolveSubregionCountryIds(...)
normalizeSubregionMetadata(...)
```

Canonical Country data remains authoritative for membership.

Metadata only overrides order.

---

# 12. Persistence is a separate layer

Create:

```text
persistence/
```

for World Countries storage implementations.

For example:

```text
persistence/
  subregionMetadataStore.ts
```

Persistence modules own:

* reading;
* writing;
* resetting;
* serialization;
* storage keys;
* localStorage/IndexedDB implementation.

The domain must not depend on persistence.

Correct:

```text
domain
  ↑
persistence
```

Incorrect:

```text
domain
  ↓
localStorage
```

---

# 13. World Countries persistence is disposable during this reset

Backward compatibility for existing World Countries user state is **not required**.

The refactor may:

* introduce new World Countries storage keys;
* change World Countries persistence schemas;
* discard old World Countries progress;
* remove old Quiz learning state;
* reset old Memo state;
* reset Subregion metadata if structurally convenient;
* replace World Countries mnemonic persistence where necessary.

Do not add migration code solely to preserve old World Countries state.

Prefer a clean new model over legacy compatibility.

This applies only to World Countries-owned persistence.

---

# 14. Pi persistence must remain untouched

Persistence belonging to Pi is explicitly outside the scope of this refactor.

The refactor must not:

* clear Pi storage;
* rename Pi storage keys;
* migrate Pi data;
* alter Pi schemas;
* alter Pi backup formats;
* reuse Pi-owned keys;
* introduce broad storage cleanup that could remove Pi data.

The same principle applies to unrelated features unless a separate change explicitly includes them.

The persistence boundary is:

```text
World Countries
  may reset/restructure its own persistence

Pi
  preserve exactly

Other features
  do not touch
```

Any storage-reset helper introduced for this refactor must be narrowly scoped to World Countries-owned keys.

Do not use broad operations such as:

```ts
localStorage.clear()
```

or equivalent whole-application cleanup.

---

# 15. Preserve canonical source data independently of persistence

Disposable World Countries persistence does not imply disposable canonical Geography data.

Do not casually alter:

* canonical Country records;
* Country classification;
* map SVG contents;
* Country/Capital spelling;
* Continent definitions;
* Subregion definitions;

as part of this structural refactor unless separately required.

Structural cleanup and Geography-content changes should remain separate concerns.

---

# 16. Consolidate map code under `maps/`

The existing `common/` folder primarily contains map infrastructure.

Replace it with:

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

The exact split between definition and adapter modules may be adjusted according to existing responsibilities.

---

# 17. Remove ambiguous `common/`

After the refactor, do not retain a World Countries:

```text
common/
```

folder as a generic dumping ground.

Place behavior according to ownership:

```text
map behavior       → maps/
domain behavior    → domain/
storage            → persistence/
mnemonics          → mnemonics/
Memo workflow      → memo/
Drill workflow     → drill/
Recite workflow    → recite/
Maintenance logic → maintenance/
```

---

# 18. Map assets belong to Maps

Move World Countries SVG map assets from:

```text
assets/
```

to:

```text
maps/assets/
```

Update asset imports as necessary.

The move must not itself modify SVG contents.

---

# 19. Rename map-definition files by responsibility

Rename ambiguous modules such as:

```text
worldMap.ts
```

to a broader name such as:

```text
mapDefinitions.ts
```

when they define both World and regional/continent maps.

Prefer names that describe actual responsibility.

---

# 20. Map workarea belongs under Maps

Move:

```text
workarea/
```

to:

```text
maps/workarea/
```

The workarea is map development/experimentation, not a learning workflow.

It should not be a peer of:

```text
memo/
drill/
recite/
maintenance/
```

---

# 21. Split generic map behavior from Memo-specific map behavior

Review existing Memo files such as:

```text
MemoMap.tsx
memoMapAdapter.ts
memoMaps.ts
```

Move genuinely reusable map behavior downward.

For example:

```text
memoMaps.ts
→ maps/mapDefinitions.ts
```

when it contains reusable map definitions.

```text
memoMapAdapter.ts
→ maps/geographyMapAdapter.ts
```

when it translates Geography identities into map/SVG identities.

Keep only Memo-specific interpretation in Memo.

For example:

```text
memo/navigation/MemoNavigationMap.tsx
```

may decide what selected or highlighted Geography means inside Memo.

---

# 22. Country identity and SVG identity remain separate

Preserve:

```text
CountryId
≠
SVG ID
```

Domain and workflow state operate on:

```text
CountryId
```

Map infrastructure may operate on SVG identifiers.

Translation belongs to a map adapter.

Correct:

```text
workflow
   ↓
CountryId
   ↓
geographyMapAdapter
   ↓
SVG ID
   ↓
SvgMapView
   ↓
SvgMapController
```

Do not persist SVG IDs as Geography identity.

---

# 23. `SvgMapController` remains imperative infrastructure

`SvgMapController` owns concerns such as:

* SVG loading;
* structural discovery;
* validation;
* DOM mutation;
* listeners;
* labels;
* highlights;
* colors;
* hover;
* muting;
* zoom;
* cleanup.

It must remain unaware of:

```text
Memo
Drill
Recite
Maintenance
learning state
correctness
mastery
country order
```

---

# 24. `SvgMapView` remains the React adapter

Retain/evolve:

```text
SvgMapView.tsx
```

as the declarative React wrapper around `SvgMapController`.

It may own:

* controller creation/destruction;
* loading/error state;
* applying declarative SVG state;
* click forwarding.

It must not become a World Countries domain component.

---

# 25. Mnemonics remain a first-class subsystem

Retain:

```text
mnemonics/
```

for Geography mnemonic concerns such as:

* mnemonic target IDs;
* Subregion mnemonic semantics;
* Country–Capital mnemonic semantics;
* story/image storage;
* stale-order handling;
* Geography mnemonic import/export;
* mnemonic-specific UI.

Mnemonic logic does not belong exclusively to Memo simply because Memo currently authors most mnemonic content.

---

# 26. Workflow folders remain siblings

Target:

```text
memo/
drill/
recite/
maintenance/
```

These folders represent use cases/workflows.

They share lower-level capabilities.

They should not import each other's internal code as an architectural shortcut.

Avoid:

```text
Drill → Memo
Recite → Memo
Maintenance → Drill internals
Maintenance → Recite internals
```

Instead, if shared session mechanics emerge later, extract them downward into an appropriate shared domain/learning module.

---

# 27. Maintenance may orchestrate activities without owning their internals

A future Maintenance subsystem may decide that a user needs:

```text
targeted practice
```

or:

```text
complete recitation
```

It may request that the application launch an appropriate activity.

However, Maintenance should not become tightly coupled to the internal React implementation of Drill or Recite.

Prefer concepts such as:

```text
Maintenance recommendation
    ↓
activity descriptor
    ↓
WorldCountries/application coordinator
    ↓
Drill or Recite
```

rather than:

```text
maintenance/
  import { InternalReciteSession } from '../recite/...'
```

The exact orchestration model is deferred until Maintenance is designed.

---

# 28. Keep Drill, Recite, and Maintenance minimal initially

Create only lightweight entry components such as:

```text
drill/
  WorldCountriesDrill.tsx

recite/
  WorldCountriesRecite.tsx

maintenance/
  WorldCountriesMaintenance.tsx
```

if a visible Maintenance screen is required initially.

Do not create speculative structures such as:

```text
drill/engine/
recite/session/
maintenance/scheduler/
```

until those areas are designed.

---

# 29. Memo remains functional during the structural reset

The refactor should preserve current working Memo behavior except where it directly depends on the removed Quiz model.

ADR 0009 will continue to drive the subsequent Memo Country-learning rework.

This ADR should not accidentally mix that behavioral implementation into unrelated structural moves unless doing so is required for a clean boundary.

---

# 30. Remove obsolete root World Countries `learning.ts`

Do not rename the current root:

```text
learning.ts
```

wholesale.

Disassemble it by responsibility.

Move stable Country identity to:

```text
domain/country.ts
```

Delete old Quiz-derived item/direction behavior if unused.

Potentially obsolete APIs include:

```text
countryRecallItemId(...)
countryToCapitalItemId(...)
capitalToCountryItemId(...)
getCountryPoolScope(...)
selectCountryEntry(...)
recordCountryAttempt(...)
old World Countries learning-progress adapters
```

Only retain an API if a current non-Quiz workflow actually requires it.

Do not keep speculative compatibility for future Drill/Maintenance.

---

# 31. Preserve shared application learning infrastructure

This ADR applies to World Countries.

Do not remove or restructure shared application infrastructure such as:

```text
src/core/learning/
```

merely because the current World Countries adapter is deleted.

Other features may depend on it.

Future World Countries Drill or Maintenance may integrate with shared learning infrastructure again after their real requirements are known.

---

# 32. Do not let old Quiz semantics shape future workflows

The previous Quiz represented Country/Capital practice using direction-specific questions and items.

Do not automatically reuse that design as the foundation for:

```text
Drill
Recite
Maintenance
```

Future ADRs should define the correct item/session model based on actual workflow requirements.

Starting clean is preferred.

---

# 33. Simplify the public feature API

`index.ts` should become a real external boundary.

Primary export:

```ts
export { WorldCountries } from './WorldCountries'
```

If the application still exposes the map workarea:

```ts
export { MapWorkarea } from './maps/workarea/MapWorkarea'
```

Expose data/types only where outside consumers genuinely require them.

Do not re-export internal stores, workflow helpers, adapters, and persistence modules merely for convenience.

Internal feature modules should import from their owning modules directly.

---

# 34. Application wiring

Replace:

```text
world-countries
→ old WorldCountriesDrill
```

with:

```text
world-countries
→ WorldCountries
```

The application card represents the full World Countries feature.

Conceptually:

```text
🌍 World Countries

Memo · Drill · Recite

Learn, practise and retain the world's countries and capitals.
```

Maintenance may be surfaced separately as due-review status/action.

The exact copy and navigation design are not architectural decisions.

---

# 35. Target directory structure

The intended post-refactor structure is approximately:

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
├── domain/
│   ├── country.ts
│   ├── geography.ts
│   ├── answerMatching.ts
│   └── subregionMetadata.ts
│
├── persistence/
│   └── subregionMetadataStore.ts
│
├── maps/
│   ├── SvgMapController.ts
│   ├── SvgMapController.test.ts
│   ├── SvgMapView.tsx
│   │
│   ├── countryMapIds.ts
│   ├── countryMapIds.test.ts
│   │
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
│   └── ...
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

Do not create files merely to satisfy the diagram.

The diagram defines ownership boundaries.

---

# 36. Directories intentionally removed

After the reset, do not retain top-level:

```text
quiz/
common/
workarea/
assets/
subregions/
```

when their responsibilities have moved.

Also remove:

```text
memo/geographyMemo.ts
```

after Geography behavior is relocated.

Remove root:

```text
learning.ts
```

once all required responsibilities have either moved or been deleted.

The final repository state should not contain duplicate transitional modules.

---

# 37. Dependency direction

High-level:

```text
                  data
                   │
                   ▼
                 domain
              ┌────┼─────┐
              ▼    ▼     ▼
       persistence maps mnemonics
              \    |     /
               \   |    /
                \  |   /
                workflows
         ┌───────┼─────────┐
         ▼       ▼         ▼
       Memo    Drill     Recite

                ▲
                │
          Maintenance
      selects/recommends
       future activity

                ↓
        WorldCountries.tsx
```

More specifically:

```text
data
  does not depend on workflows

domain
  may depend on data
  does not depend on React, maps or persistence

persistence
  may depend on domain

maps
  may depend on domain/data through adapters
  SvgMapController itself remains domain-independent

mnemonics
  may depend on domain/data and shared mnemonic infrastructure

Memo / Drill / Recite
  may depend on domain, persistence, maps and mnemonics

Maintenance
  may depend on domain and learning history/persistence
  may recommend future Drill or Recite activity

WorldCountries.tsx
  composes user-facing areas
```

---

# 38. No speculative generic framework

Do not introduce application-wide abstractions such as:

```text
GenericLearningFeature
UniversalWorkflowEngine
AbstractPracticeMode
GenericMaintenanceScheduler
```

without concrete need.

Generic low-level utilities may remain feature-local until another feature genuinely needs them.

---

# 39. Rename aggressively where ownership becomes clearer

Prefer moving/renaming now while the architecture is being reset.

Examples:

```text
common/
→ maps/

worldMap.ts
→ mapDefinitions.ts

geographyMemo.ts
→ domain/geography.ts

countryId(...)
→ getCountryId(...)
```

where those changes improve semantics.

Do not worry about preserving obsolete World Countries internal import paths.

Do not rename unrelated feature persistence or data.

---

# 40. Preserve behavior where useful; preserve unrelated data absolutely

For World Countries:

* behavior that still belongs in the new feature should continue working;
* persisted state may be reset;
* old internal APIs may be removed;
* old storage schemas may be discarded.

For Pi:

* preserve all existing persistence;
* do not change storage keys;
* do not change schemas;
* do not perform cleanup touching Pi data.

For unrelated features:

* leave persistence and behavior untouched.

---

# 41. Tests move with ownership

Move tests alongside their new owner.

Examples:

```text
common/SvgMapController.test.ts
→ maps/SvgMapController.test.ts

common/countryMapIds.test.ts
→ maps/countryMapIds.test.ts
```

Delete old Quiz tests.

Recreate reusable answer-normalization coverage under:

```text
domain/answerMatching.test.ts
```

Place SubregionMetadata tests with:

```text
domain/subregionMetadata.ts
```

Place persistence-specific tests under:

```text
persistence/
```

Tests should reflect architectural ownership, not historical filenames.

---

# 42. Update `AGENTS.md`

Update the feature guide to describe:

* `WorldCountries.tsx` as the feature shell;
* Memo, Drill and Recite as primary user activities;
* Maintenance as system-directed review selection/scheduling;
* `data/` as canonical reference data;
* `domain/` as pure feature rules;
* `persistence/` as World Countries-owned storage;
* `maps/` as the map subsystem;
* `mnemonics/` as a shared mnemonic subsystem;
* no Quiz concept;
* no workflow-to-workflow imports;
* Country ID vs SVG ID;
* World Countries persistence may reset;
* Pi and unrelated persistence must not be touched;
* public API expectations.

---

# 43. Validation

After the structural reset:

Run at minimum:

```text
World Countries tests
full TypeScript typecheck
production build
```

Verify:

* World Countries opens through `WorldCountries.tsx`;
* Memo remains usable;
* Memo/Drill/Recite navigation works;
* Maintenance entry/status renders if included;
* placeholder Drill/Recite screens render;
* map SVG assets still load;
* map highlighting/discovery still works;
* no imports reference `world-countries/quiz/...`;
* no imports reference removed `common/...`;
* no imports reference obsolete `memo/geographyMemo`;
* no workflow relies on another workflow's internals;
* no SVG ID is treated as a Country ID;
* Pi data/storage code is unchanged;
* no broad storage cleanup can clear unrelated application data.

World Countries persisted state does not need compatibility validation.

---

# Consequences

## Positive

The code structure reflects the new product model.

The old Quiz architecture no longer shapes future Drill, Recite, or Maintenance design.

Memo, Drill, and Recite become clear user activities.

Maintenance gains a cleaner role as system-directed selection/scheduling rather than being forced into Recite.

Shared Geography behavior becomes workflow-independent.

Stable Country identity moves to the domain.

Map infrastructure becomes a first-class subsystem.

World Countries persistence can be redesigned cleanly without migration burden.

Pi and unrelated application data have an explicit protection boundary.

Future work can start from clear ownership rather than historical coupling.

## Cost

The structural diff will be relatively large.

Many import paths will change.

Old World Countries state may be lost.

Some existing helper APIs will be intentionally deleted.

Future Maintenance orchestration still requires a separate design decision.

---

# Non-goals

This ADR does not define:

* Drill question mechanics;
* Drill weighting;
* Drill mastery criteria;
* Recite scope behavior;
* Recite scoring;
* Maintenance scheduling;
* Maintenance decay algorithms;
* Maintenance activity-selection rules;
* Capital-learning mechanics;
* new mastery algorithms;
* changes to shared core learning infrastructure;
* cloud synchronization;
* preservation of old World Countries persisted state;
* changes to Pi persistence;
* changes to canonical Geography content.

---

# Summary

World Countries becomes:

```text
                 WORLD COUNTRIES
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
        Memo         Drill        Recite
       Learn        Practise      Recall

                       ▲
                       │
                 Maintenance
              "What needs review?"
```

supported by:

```text
data/
domain/
persistence/
maps/
mnemonics/
```

The old Quiz is removed completely.

World Countries persistence may be reset as part of the cleanup.

Pi and unrelated persistence must remain untouched.

The governing principles are:

> **World Countries workflows share a domain, not each other's implementations.**

> **Memo, Drill, and Recite define activities; Maintenance decides what needs reinforcement.**

> **Prefer a clean World Countries model over preserving obsolete internal architecture or persisted state, while strictly preserving Pi and unrelated feature data.**
