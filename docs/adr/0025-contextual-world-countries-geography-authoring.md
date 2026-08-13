# ADR 0025 - Contextual World Countries geography authoring

- **Status:** Accepted
- **Date:** 2026-08-13
- **Supersedes:** [ADR 0023 - Separate World Countries preparation from active-learning ownership](0023-world-countries-prepare-drill-workflow-ownership.md) only for the user-facing Prepare/Setup workflow and its exclusive authoring ownership. ADR 0023 remains authoritative for reusable Learning ownership and the prohibition on making `learning/flows/` a Drill implementation detail.

## Context

World Countries currently exposes **Setup** as a separate structural workspace for hierarchy-order authoring, mnemonic authoring, and map inspection. Drill and Learning reach the same geography through their normal left-rail/map experience, so moving into Setup duplicates navigation and removes the learner from the context in which the order or mnemonic is being used.

The underlying capabilities are already semantically owned outside Setup: effective hierarchy order and persistence belong to `geography/`; mnemonic identity/storage belongs to `mnemonics/`; map infrastructure belongs to `maps/`; reusable guided Learning belongs to `learning/flows/`.

A durable ownership decision is needed because removing Setup must not make these capabilities private implementation details of Drill or Learning.

## Decision

World Countries structural authoring is a **contextual Geography capability**, not a separate user-facing workflow.

There is no dedicated Setup navigation hierarchy or Setup workspace. Order and mnemonic authoring are surfaced directly from the existing geographic context in which the user is viewing or using them.

Ownership remains semantic:

- `geography/` owns effective World → Continent → Subregion → Country order, user-authored order metadata, order queries, and persistence contracts.
- `mnemonics/` owns mnemonic target identity, storage/adapters, reusable read presentation, and reusable authoring capability.
- `maps/` owns workflow-neutral map presentation and existing Country sequence annotations.
- `learning/flows/` continues to own reusable Country/Capital guided Learning UI and orchestration.
- `drill/` may surface World/Continent order authoring in its existing Geography rails, but does not add a Subregion detail view, expose Country-order authoring, or become the source of truth for order or mnemonic data.
- `ui/` may own workflow-neutral hierarchy/reordering presentation where that presentation contains no persistence or workflow policy.

The left rail is the canonical interaction surface for hierarchy-order authoring. At the hierarchy currently represented by the rail:

```text
World      -> edit Continent order
Continent  -> edit Subregion order
Subregion  -> edit Country order
```

In the current scope, World and Continent order editing is surfaced from the
existing Drill Geography rails. Country-order editing is surfaced from the
existing Learning Subregion rail. Drill navigation, map behavior, selection,
session rails, and active question queues are unchanged; Drill does not gain a
Subregion detail or Country-list authoring context.

Entering order-edit mode transforms the existing ordered rail list **in place**. A separate editor page, overlay, modal, drawer, or side panel is not part of the order-authoring model.

Country-order editing is exposed from the existing Learning Subregion context
for Learn Countries and Learn Capitals. Drill continues to consume the saved
effective Country order when constructing new sessions, but does not expose a
Country-order editor or add a Drill navigation level.

Mnemonic editing is likewise contextual. For this decision, the existing
Subregion mnemonic editor is entered from the stable Learning Subregion left
rail whenever that rail and its Country list are visible. Order and mnemonic
authoring are not exposed during ordered recall, active recall, or completion.
Mnemonic storage/identity remains independent of the workflow exposing the
action; new World/Continent targets and Country-capital authoring are not
introduced.

Sibling workflow internals remain private. In particular:

```text
learning/flows/ !-> drill/ internals
drill/          !-> learning/flows/ internals
```

Shared authoring behavior must be extracted/re-homed by semantic ownership rather than leaving reusable capability under obsolete `setup/` paths and importing those paths from Drill or Learning.

This decision does not change canonical geography membership, persisted geography IDs, order schemas, mnemonic IDs/storage, Drill evidence semantics, Learning milestones, Practice recording rules, or Recite behavior.

## Consequences

- The user edits order where the ordered hierarchy is already visible instead of navigating to Setup.
- The separate `setup/` workflow and shell-owned Setup navigation seam become obsolete and should be removed once no longer referenced.
- Existing Setup order-editor mechanics may be reused, but reusable drag/drop and authoring behavior must move to a semantic owner before Setup is removed.
- World, Continent, and Subregion left rails can share one consistent in-place ordering interaction while retaining their own workflow context.
- Existing Country sequence annotations remain available on Subregion learning
  maps; World and Continent overview maps do not render custom hierarchy names
  because the available map assets cannot place them reliably.
- Learning consumes saved Country order through `geography/`, and Drill
  consumes it when constructing new sessions; neither uses Setup state and
  Drill does not expose Country-order authoring.
- Drill can explain that Country order is edited from Learn Countries without
  adding a navigation shortcut or changing Drill behavior.
- Contextual authoring must not write or fabricate Drill evidence, Learning milestones, Practice progress, or other unrelated durable state.
- The architecture becomes less workflow-centric for structural authoring while preserving clear domain ownership.

## Alternatives considered

### Keep Setup as a separate workspace

Rejected. It duplicates geography navigation and forces the user out of the context where order and mnemonics are being used.

### Move Setup wholesale into `drill/`

Rejected. Order and mnemonic authoring are not Drill semantics, and this would make shared structural capability a Drill implementation detail.

### Keep a reusable editor under `setup/` and import it from other workflows

Rejected. That preserves obsolete ownership and creates sibling-workflow dependencies after the user-facing Setup workflow has been removed.

### Add a Drill Subregion/Country navigation layer

Rejected for this change. Learning already reaches the Subregion/Country
context in which Country order is authored. Adding a Drill detail view would
change Drill navigation and create another Country-order surface without being
necessary for contextual Learning authoring.

### Open an overlay or side panel from Edit order

Rejected. The ordered rail list is already the user's reference. Editing that same list in place preserves context and establishes one consistent interaction at all hierarchy levels.

## Current-state documentation impact

When implemented, update:

- `docs/architecture/features/WORLD_COUNTRIES.md`
  - remove Setup as an active workflow/owner and remove the shell-owned Setup navigation seam;
  - describe contextual order/mnemonic authoring and semantic ownership;
  - update ownership, dependency diagram, invariants, and source anchors;
  - retain the existing Learning-versus-Drill/Practice boundaries.

Review `docs/architecture/CORE.md` only if implementation introduces or changes a shared cross-feature UI/mnemonic contract. Review `docs/architecture/PERSISTENCE.md` only if implementation unexpectedly changes a persistence contract; no persistence change is intended by this ADR.

## Confirmation

Add only after implementation has been verified:

Implemented and verified against the repository on 2026-08-13.
