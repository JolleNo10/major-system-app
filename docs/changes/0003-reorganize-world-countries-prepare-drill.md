# Change Spec 0003 - Reorganize World Countries into Prepare and Drill

* **Status:** Implemented
* **Date:** 2026-08-12
* **Related ADRs:** [ADR 0023 - Separate World Countries preparation from active-learning ownership](../adr/0023-world-countries-prepare-drill-workflow-ownership.md)
* **Current-state docs:** [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md), [System architecture](../architecture/SYSTEM.md)

## Goal

Replace the overlapping World Countries Memo/Drill user model with distinct **Prepare** and **Drill** activities.

Prepare is for constructing and inspecting the memory structure.

Drill is for active Country/Capital learning, review, and deliberate recall practice.

Preserve existing learning mechanics, readiness state, Drill modes, Drill evidence/proficiency, geography order, mnemonic persistence, Recite, and Due review behavior.

## User-visible behavior

### Top-level activities

World Countries exposes:

```text
Prepare | Drill | Recite                    Due review
```

Required changes:

* replace the top-level `Memo` activity with `Prepare`;
* Prepare becomes the default World Countries activity;
* Drill remains a top-level activity;
* active Country and Capital learning/review is launched from Drill;
* Recite is unchanged;
* Due review is unchanged.

Do not introduce a separate top-level `Learn` activity.

---

## Prepare

Prepare retains the map-centered World Countries hierarchy:

```text
World
→ Continent
→ Subregion
```

Prepare owns:

* editing World → Continent order;
* editing Continent → Subregion order;
* editing Subregion → Country order;
* creating/editing/deleting geography mnemonics;
* inspecting Countries, Capitals, learning order, maps, mnemonics, readiness and reference material.

Prepare must not start:

* Country learning;
* Capital learning;
* Country guided review;
* Capital guided review;
* location practice;
* ordered recall;
* Drill sessions.

Viewing or editing Prepare content must not create learning completion or Drill evidence.

### Prepare source disposition

The existing `memo/` ownership area is removed.

Preparation-owned code currently under `memo/` moves under `prepare/`, including the responsibilities currently represented by:

```text
memo/WorldCountriesMemo.tsx
memo/LearningOrderEditor.tsx
memo/world/*
memo/continent/*
memo/subregion/SubregionOrderEditor*
```

Preparation-specific map, rail, hierarchy, overlay, and authoring composition also moves under `prepare/`.

Do not preserve `memo/` compatibility wrappers.

---

## Guided learning ownership

Existing Country and Capital learning behavior moves out of the Memo workflow and becomes reusable guided-learning capability under:

```text
learning/flows/
```

This includes the presentation/orchestration corresponding to the current:

```text
CountryLearningFlow
CapitalLearningFlow
MemoryPreviewStep
CountryWalkthroughStep
LocationPracticeStep
OrderedRecallStep
CountryLearningComplete
CapitalWalkthroughStep
CapitalRecallStep
CapitalLearningComplete
```

Move associated tests with their owner.

Do not change the underlying learning state machines merely because their UI ownership changes.

### Mixed current components

Do not move `SubregionMemoScreen.tsx` wholesale.

It currently mixes:

* Subregion preparation/navigation;
* order editing;
* mnemonic authoring/presentation state;
* active Country learning;
* active Capital learning.

Decompose that responsibility.

Target ownership:

```text
Prepare Subregion composition
→ prepare/

guided Country/Capital session composition
→ learning/flows/

Drill launch/recommendation state
→ drill/
```

Apply the same ownership rule to other mixed Memo components rather than mechanically renaming paths.

---

## Mnemonic ownership

Existing mnemonic IDs, persistence and stale-order semantics remain unchanged.

Split the current combined Memo mnemonic presentation as required by ADR 0023.

### `mnemonics/`

Own workflow-neutral read/presentation capability required outside Prepare.

It must support displaying existing mnemonic content during guided learning without exposing authoring actions.

Existing stale-order detection must remain available where relevant.

### `prepare/`

Own mnemonic authoring controls:

* add;
* edit;
* save;
* replace/remove image;
* delete.

Drill and `learning/flows/` must not import Prepare mnemonic components.

---

## Readiness aggregation

Reusable readiness semantics and aggregation must not remain owned by Prepare solely because they were previously presented in Memo.

Existing Memo readiness semantics remain unchanged.

If current `memoProgress` behavior is required outside preparation-specific presentation, move it under the neutral `learning/` capability rather than recreating equivalent readiness logic in Prepare or Drill.

No persistence or readiness-state migration is required.

---

## Drill geography

Retain the current Drill geography model:

```text
World
→ Continent
→ one or more Subregions
```

Preserve:

* current Continent selection;
* Subregion multi-selection;
* Entire Continent selection;
* current Drill scope derivation;
* effective user-authored geography order;
* ordered/random Drill preference;
* current progress-map behavior.

---

## Single-Subregion Drill

When exactly one Subregion is selected, Drill exposes:

1. one state-driven primary action;
2. applicable guided review actions;
3. all existing manual Drill modes.

### Countries not learned

Primary action:

```text
Learn Countries
```

Launch the existing Country guided-learning flow.

### Countries learned, Capitals not learned

Primary action:

```text
Learn Capitals
```

Launch the existing Capital guided-learning flow.

### Countries and Capitals learned

Primary action:

```text
Drill Countries + Capitals
```

`Drill Countries + Capitals` is the prominent/recommended right-rail action.

Guided review actions remain secondary:

```text
Review Countries
Review Capitals
```

Do not make guided review compete visually with the primary recommended Drill action.

### Action hierarchy

The Drill right rail must communicate this priority:

```text
PRIMARY
state-driven recommended action

SECONDARY
guided review actions when applicable

DRILL CONTROLS
manual Drill modes and order controls
```

Do not add a nested Learn/Practice tab bar to solve layout density.

Compact/disclosure presentation may be used where necessary while preserving the hierarchy above.

---

## Multiple-Subregion / Entire-Continent Drill

When more than one Subregion is selected:

* do not expose `Learn Countries`;
* do not expose `Learn Capitals`;
* do not expose guided Country review;
* do not expose guided Capital review;
* retain all current deliberate Drill functionality.

Initial/guided learning remains a single-Subregion activity.

---

## Country guided learning

Preserve the existing Country flow exactly for this change:

```text
memory preview
→ walkthrough
→ location practice
→ ordered recall
→ complete
```

Do not change phase order or mnemonic methodology in Change Spec 0003.

Completion continues to use the existing Countries-learned contract.

Existing ordered-recall review entry behavior remains unchanged.

The guided flow itself must not create Drill proficiency unless current underlying behavior already records that evidence.

---

## Capital guided learning

Preserve the existing Capital flow exactly:

```text
walkthrough
→ recall
→ complete
```

Countries completion remains the prerequisite for Capital learning/review.

Completion continues to use the existing Capitals-learned contract.

Preserve existing behavior for legacy Capitals-complete/Countries-incomplete state.

---

## Existing Drill modes

Do not redefine mode identity or semantics.

### Countries

```text
Location → Country
```

Retain current evidence behavior.

### Countries + Capitals

```text
Location → Country
Country → Capital
```

Retain current evidence behavior.

### Capitals

```text
Country → Capital
```

Retain current practice-only/non-recording behavior.

### Countries from Capitals

```text
Capital → Country
```

Retain current evidence behavior.

Guided learning is not a new Drill mode and must not become part of Drill evidence identity.

---

## Readiness and proficiency

Preserve existing models.

Memo readiness remains:

```text
NOT_MEMOED
COUNTRIES_MEMOED
COUNTRIES_AND_CAPITALS_MEMOED
```

The internal/domain name `Memo readiness` may remain unchanged.

Drill proficiency remains based on existing atomic recall evidence.

Preserve existing Drill map precedence:

```text
relevant Drill evidence exists
→ Drill proficiency

no relevant Drill evidence
→ Memo readiness fallback
```

Guided-learning completion does not imply:

```text
Weak
Developing
Strong
Mastered
Complete
```

Preserve all current active-recall answer-reveal suppression.

---

## Interaction and states

### Single Subregion

```text
Countries not learned
→ primary: Learn Countries

Countries learned
Capitals not learned
→ primary: Learn Capitals

Countries + Capitals learned
→ primary: Drill Countries + Capitals
→ secondary: Review Countries / Review Capitals
```

All existing manual Drill modes remain available regardless of the recommended action unless already restricted by current behavior.

Do not introduce new readiness gates around existing Drill modes.

### Legacy Capitals-only completion

```text
Countries not learned
Capitals completion exists
→ preserve Capitals completion
→ primary: Learn Countries
→ preserve current Capital prerequisite behavior
```

### Multiple Subregions

```text
selected Subregions > 1
→ deliberate Drill controls only
→ no guided-learning/review actions
```

### Prepare

```text
World
→ inspect progress
→ edit Continent order

Continent
→ inspect Subregions
→ edit Subregion order

Subregion
→ inspect map/material
→ edit Country order
→ author mnemonics
```

No active recall begins from Prepare.

---

## Architecture constraints

Follow:

* [ADR 0023](../adr/0023-world-countries-prepare-drill-workflow-ownership.md)
* [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md)
* `src/features/world-countries/AGENTS.md`

Required boundaries:

* `memo/` must not remain an active ownership area after implementation.
* `prepare/` owns preparation and authoring.
* `learning/flows/` owns reusable guided-learning UI/orchestration.
* `drill/` orchestrates guided learning plus Drill-specific practice.
* `prepare/` and `drill/` must not import each other's internals.
* `learning/flows/` must not depend on either workflow folder.
* shared mnemonic read/presentation belongs under `mnemonics/`, not Prepare.
* mnemonic authoring remains Prepare-specific.
* reusable learning state/readiness behavior remains under `learning/`.
* existing geography stores remain authoritative.
* existing mnemonic IDs/storage remain authoritative.
* existing learning IDs/evidence/readiness remain authoritative.
* no compatibility wrappers for obsolete `memo/` internal paths.
* no new generic `common/`, broad `domain/`, or feature-local `persistence/` layer.
* do not rename durable persistence/domain concepts solely to mirror UI terminology.

---

## Existing capabilities to reuse

### Shell and workflows

* `WorldCountries.tsx`

  * existing workflow composition and active-population resolution.

* `drill/WorldCountriesDrill.tsx`

  * existing Drill coordinator.

* existing Drill rails/setup/session/results components

  * retain deliberate Drill behavior and extend the Drill surface with guided-learning launch.

### Geography

* `geography/queries.ts`
* `geography/worldMetadataStore.ts`
* `geography/continentMetadataStore.ts`
* `geography/subregionMetadataStore.ts`

Retain current effective-order and persistence behavior.

### Learning

* `learning/countryLearningFlow.ts`
* `learning/capitalLearningFlow.ts`
* `learning/subregionLearningStore.ts`
* `learning/subregionLearningState.ts`
* `learning/memoReadiness.ts`
* current recall/evidence/proficiency capability.

Do not duplicate these semantics in workflow folders.

### Drill

* `drill/drillModes.ts`
* `drill/drillSelection.ts`
* current Drill preferences/session/results capability;
* current Drill progress/readiness fallback presentation.

### Maps

Reuse current World Countries map infrastructure and map-centered PageLayout pattern.

Do not create Prepare-specific or Drill-specific copies of generic SVG/map behavior.

### Mnemonics

Reuse current:

```text
mnemonics/
core/mnemonics
```

IDs and storage.

Extract workflow-neutral mnemonic viewing as needed rather than letting Drill import Prepare authoring UI.

---

## Edge cases

* A scope with zero active Countries must not start guided learning or Drill.
* Active-country-set changes continue to follow existing membership compatibility behavior.
* Existing Subregion membership fingerprint behavior remains unchanged.
* Existing stale-mnemonic detection remains functional.
* Switching between Prepare and Drill creates no learning completion or Drill evidence by itself.
* Viewing material in Prepare never marks it learned.
* Editing an order never marks material learned.
* Guided-learning completion never fabricates Drill proficiency.
* Drill ordered/random preference must not redefine the effective order used by guided learning.
* Current active-recall safety must remain intact.
* Existing invalid/legacy Capitals completion must not be silently deleted.
* Reorganizing files must not affect Pi or unrelated feature state.

---

## Out of scope

* Reordering the Country learning phases.
* Changing mnemonic learning methodology.
* Changing Country completion rules.
* Changing Capital completion rules.
* Renaming or redesigning Memo readiness.
* Changing Drill proficiency/mastery algorithms.
* Changing Drill mode semantics.
* Changing the World Countries map palette.
* Redesigning Recite.
* Redesigning Due review.
* Adding spaced repetition or new review scheduling.
* Persistence migration.
* New mnemonic formats.
* Cleanup of unrelated local filesystem directories.
* Changes outside World Countries.

---

## Acceptance criteria

### Navigation and workflow

* [x] World Countries top-level user-directed activities are `Prepare`, `Drill`, and `Recite`.
* [x] `Memo` is no longer exposed as a top-level activity.
* [x] `Due review` remains separate and behaves as before.
* [x] Prepare is the default World Countries activity.
* [x] Recite behavior is unchanged.

### Prepare

* [x] Prepare retains World → Continent → Subregion map-centered navigation.
* [x] Prepare supports editing World → Continent order.
* [x] Prepare supports editing Continent → Subregion order.
* [x] Prepare supports editing Subregion → Country order.
* [x] Existing order persistence contracts and effective-order behavior remain unchanged.
* [x] Prepare supports existing mnemonic add/edit/delete/image behavior.
* [x] Existing mnemonic IDs and storage remain unchanged.
* [x] Prepare exposes no active Country/Capital learning or review session start.
* [x] Prepare exposes no deliberate Drill session start.
* [x] Viewing/editing Prepare content creates no learning completion or Drill evidence.

### Guided learning in Drill

* [x] Selecting exactly one Countries-unlearned Subregion exposes `Learn Countries` as the primary Drill action.
* [x] `Learn Countries` launches the existing Country learning flow.
* [x] Existing Country learning phase order remains unchanged.
* [x] Country completion uses the existing Countries-learned contract.
* [x] Selecting exactly one Countries-learned/Capitals-unlearned Subregion exposes `Learn Capitals` as the primary action.
* [x] `Learn Capitals` launches the existing Capital learning flow.
* [x] Existing Capital learning phase order remains unchanged.
* [x] Capital completion uses the existing Capitals-learned contract.
* [x] Existing Countries and Capitals guided review entry behavior remains available for a single Subregion.
* [x] When Countries and Capitals are learned, `Drill Countries + Capitals` is the prominent recommended action and guided reviews are secondary.
* [x] Multiple-Subregion and Entire-Continent scopes expose no guided-learning/review actions.

### Existing Drill behavior

* [x] `Countries` retains its current skill/evidence behavior.
* [x] `Countries + Capitals` retains its current skill/evidence behavior.
* [x] `Capitals` remains practice-only/non-recording.
* [x] `Countries from Capitals` retains its current skill/evidence behavior.
* [x] Existing ordered/random Drill behavior remains unchanged.
* [x] Existing Drill selection persistence remains unchanged.
* [x] Existing Drill result behavior remains unchanged.
* [x] No new readiness gate prevents access to an existing Drill mode.

### Learning state and progress

* [x] Memo readiness semantics and persistence remain unchanged.
* [x] Drill evidence IDs and persistence remain unchanged.
* [x] Drill proficiency semantics remain unchanged.
* [x] Guided-learning completion does not assign Drill proficiency.
* [x] Existing Drill map readiness/proficiency precedence remains unchanged.
* [x] Active recall continues to suppress answer-revealing map progress as currently required.

### Ownership

* [x] `src/features/world-countries/memo/` no longer exists as an active source ownership area.
* [x] Preparation-specific composition and order-authoring UI are under `prepare/`.
* [x] Reusable guided Country/Capital learning UI/orchestration is under `learning/flows/`.
* [x] `SubregionMemoScreen` responsibility is decomposed rather than moved intact.
* [x] Shared mnemonic read/presentation required by guided learning is under `mnemonics/`.
* [x] Mnemonic authoring controls remain under `prepare/`.
* [x] No `prepare/` → `drill/` internal dependency exists.
* [x] No `drill/` → `prepare/` internal dependency exists.
* [x] No `learning/flows/` → `prepare/` or `drill/` dependency exists.
* [x] No compatibility wrapper preserves obsolete `memo/` internal imports.
* [x] No duplicate learning/readiness/evidence state is introduced.
* [x] No new persistence key or migration is introduced.

### Documentation and verification

* [x] `docs/architecture/features/WORLD_COUNTRIES.md` describes Prepare, Drill, and `learning/flows/` as current state.
* [x] Its ownership section no longer assigns current responsibilities to `memo/`.
* [x] Its dependency diagram reflects `prepare/`, `drill/`, and neutral guided-learning ownership.
* [x] Current source anchors/invariants referring to active `memo/` paths are updated.
* [x] `PRODUCT.md` reflects the Prepare/Drill World Countries model where applicable.
* [x] Historical ADRs and implemented Change Specs are not rewritten solely for terminology.
* [x] `npx vitest run src/features/world-countries` passes.
* [x] `npx tsc -b` passes.
* [x] `npx vite build` passes.

---

## Source anchors

Current source to inspect/decompose:

```text
src/features/world-countries/WorldCountries.tsx

src/features/world-countries/memo/WorldCountriesMemo.tsx
src/features/world-countries/memo/WorldCountriesMemoRails.tsx
src/features/world-countries/memo/MemoMap.tsx
src/features/world-countries/memo/MemoMnemonicCard.tsx
src/features/world-countries/memo/LearningOrderEditor.tsx
src/features/world-countries/memo/memoProgress.ts

src/features/world-countries/memo/world/
src/features/world-countries/memo/continent/
src/features/world-countries/memo/subregion/

src/features/world-countries/drill/WorldCountriesDrill.tsx
src/features/world-countries/drill/DrillRails.tsx
src/features/world-countries/drill/drillModes.ts
src/features/world-countries/drill/drillSelection.ts

src/features/world-countries/learning/
src/features/world-countries/mnemonics/
src/features/world-countries/geography/
src/features/world-countries/maps/
```

Primary current mixed component:

```text
src/features/world-countries/memo/subregion/SubregionMemoScreen.tsx
```

Do not treat this source-anchor list as a requirement to modify every file. Follow semantic ownership and existing tests.

---

## Documentation impact

Implementation must update:

### `docs/architecture/features/WORLD_COUNTRIES.md`

Rewrite affected current-state sections, including:

* Purpose;
* Entry points;
* Ownership;
* Decision rules;
* Dependencies/Mermaid diagram;
* workflow-related source anchors;
* current invariants/rules referring to `memo/`.

After implementation, the document must not contain an active architecture rule assigning current workflow ownership to `memo/`.

Historical references describing prior architecture may remain when clearly historical.

### `PRODUCT.md`

Update World Countries capability wording from the old Memo/Drill split to the Prepare/Drill model.

### `src/features/world-countries/AGENTS.md`

Review after source movement.

Update only if its routing/start-point instructions are no longer accurate.

Do not rewrite historical ADRs or completed Change Specs to match current UI terminology.

---

## Verification

Complete when status changes to `Implemented`.

* Implemented and verified on 2026-08-12.
* Evidence:

  * `npx vitest run src/features/world-countries`
  * `npx tsc -b`
  * `npx vite build`
