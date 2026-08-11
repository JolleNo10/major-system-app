# ADR 0023 - Separate World Countries preparation from active-learning ownership

* **Status:** Accepted
* **Date:** 2026-08-12

## Context

World Countries currently groups two different responsibilities under the Memo workflow:

1. construction and inspection of the learner's memory structure;
2. active Country and Capital initial-learning/review sessions.

Drill separately owns deliberate recall practice.

The product workflow is changing to:

```text
Prepare
→ construct and inspect the memory structure

Drill
→ acquire, review, and practise memories
```

The current `memo/` package therefore no longer represents one coherent capability.

The implementation must not solve this by making reusable Country/Capital learning an implementation detail of `drill/`, and Prepare and Drill must remain sibling workflows without dependencies on each other's internals.

## Decision

World Countries will use three distinct ownership areas for this concern.

### `prepare/`

`prepare/` owns the Prepare workflow.

It owns user-facing composition for:

* World → Continent → Subregion preparation navigation;
* World, Continent, and Subregion learning-order authoring;
* mnemonic authoring;
* map/reference inspection;
* preparation-specific rails and overlays.

Prepare may read learning/readiness state for presentation.

Prepare does not own or orchestrate active learning or recall sessions.

### `learning/flows/`

Reusable guided Country and Capital learning UI and orchestration are owned by:

```text
learning/flows/
```

This includes the UI composition required to run the existing Country and Capital initial-learning/review flows.

`learning/flows/` composes existing owners such as:

```text
learning/
geography/
maps/
mnemonics/
```

It must not depend on `prepare/` or `drill/`.

The existing learning state machines, completion state, recall semantics, and evidence identity remain owned by `learning/`.

### `drill/`

`drill/` owns the active user-directed training workflow.

Drill may orchestrate both:

```text
learning/flows/     guided initial learning/review
drill/*             deliberate Drill modes and sessions
```

Drill continues to own:

* Drill geographic selection;
* Drill preferences;
* Drill mode definitions;
* Drill-specific order/scheduling;
* evidence-recording Drill sessions;
* Drill results and Drill-specific presentation.

Drill does not own reusable Country/Capital guided-learning capability.

### `memo/`

`memo/` is removed as an active World Countries ownership area.

Its current responsibilities must be redistributed according to semantic ownership rather than preserved behind compatibility wrappers.

No new code may depend on obsolete `memo/` paths after this change.

### Dependency direction

Prepare and Drill remain sibling workflows.

Forbidden:

```text
prepare/ → drill/ internals
drill/   → prepare/ internals
```

Shared functionality belongs to its semantic capability owner:

```text
guided learning          → learning/flows/
learning state/semantics → learning/
geography/order          → geography/
mnemonic semantics/read  → mnemonics/
map infrastructure       → maps/
```

### Mnemonic presentation

Mnemonic authoring controls are Prepare-specific.

Mnemonic content that must be displayed outside Prepare, including during guided learning, must use workflow-neutral read/presentation capability owned under `mnemonics/`.

A combined component that requires Prepare authoring capability must not become a dependency of Drill or `learning/flows/`.

### Domain identity is independent of workflow naming

Renaming the user-facing Memo workflow to Prepare does not rename or migrate durable domain concepts solely for terminology consistency.

Existing concepts such as Memo readiness may retain their current internal names when their semantics are unchanged.

This decision does not change:

* persisted learning facts;
* readiness semantics;
* Drill evidence IDs;
* Drill proficiency semantics;
* geography IDs/order persistence;
* mnemonic IDs/storage.

## Consequences

* Prepare becomes a narrow authoring/preparation workflow.
* Drill becomes the single user-facing entry for active Country/Capital learning, review, and deliberate Drill practice.
* Reusable guided learning is not coupled to Drill.
* `memo/` must be decomposed and removed rather than renamed wholesale.
* Components currently mixing preparation and active learning must be split by responsibility.
* Existing files may move substantially even though learning behavior remains largely unchanged.
* No persistence migration is required.
* Future active-learning flows shared across workflows belong in `learning/flows/`, not whichever workflow currently launches them.
* Current-state World Countries architecture must describe these ownership rules directly.

## Alternatives considered

### Keep active learning inside Prepare

Rejected.

This would preserve obsolete source ownership and require Drill either to depend on Prepare internals or to route through a workflow that no longer owns the user experience.

### Move all guided learning into `drill/`

Rejected.

This would make reusable learning capability a Drill implementation detail and couple learning UI to one workflow.

### Rename `memo/` to `prepare/` wholesale

Rejected.

The existing package mixes preparation, mnemonic authoring, readiness presentation, learning-flow UI, and active-learning orchestration. A wholesale rename would preserve the ownership problem under a different name.

### Keep `memo/` as a compatibility layer

Rejected.

Workflow-internal paths are private. Compatibility wrappers would preserve obsolete ownership and create multiple apparent owners for the same capability.

## Current-state documentation impact

When implemented, update:

* `docs/architecture/features/WORLD_COUNTRIES.md`

  * purpose and workflow model;
  * entry points;
  * ownership rules;
  * decision rules;
  * dependency diagram;
  * source anchors and invariants referring to current `memo/` ownership.

Review `docs/architecture/SYSTEM.md`; update only if implementation changes a system-level boundary.

Historical ADRs and implemented Change Specs are not rewritten to use Prepare terminology.

## Confirmation

Add after implementation verification:

Implemented and verified against the repository on 2026-08-12.
