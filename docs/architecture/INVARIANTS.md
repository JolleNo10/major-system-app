# Global architecture invariants

These are repository-wide rules that must hold even when a change compiles and
passes tests. Feature-specific invariants live in the corresponding feature
architecture document.

## Dependency and ownership

- `src/core/` contains feature-independent abstractions. It must not import
  `src/app/` or `src/features/`.
- `src/app/` owns application composition: provider assembly, mode
  registration, global overlays, settings, and page layout.
- Feature-domain semantics stay with their feature. Concepts such as Country,
  Subregion, Pi pair/segment, and PAO role do not belong in generic core code.
- A feature may depend on `core/`. Existing app-owned settings/layout contracts
  used by features are explicit integration seams, not permission to move
  feature rules into `app/` or add arbitrary feature-to-app dependencies.
- External consumers use a feature's root `index.ts` public boundary where one
  exists. Feature internals do not become public without a concrete external
  consumer.

## Identity and persistence

- `src/core/scoring/attemptStore.ts` is the single owner of the
  `major-system` IndexedDB connection and version. Capabilities using that
  database reuse `getDb()`; they never open or version it independently.
- A feature may read, write, migrate, reset, import, or export only persistence
  it owns unless a shared persistence contract explicitly delegates otherwise.
  Production code must not broadly clear browser storage.
- Stable domain IDs are defined and interpreted by their feature owner.
  Adapters translate external or presentation IDs; persistence must not infer
  identity from labels, array positions, or asset IDs.
- Shared mnemonic infrastructure treats `MnemonicTargetId` as opaque. Feature
  adapters construct, validate, and interpret target namespaces.

## Architecture maintenance

- When a change moves ownership, changes a dependency or public boundary,
  changes persistent-state ownership/schema, or changes an invariant, update
  the affected document under `docs/architecture/` in the same change.
- `docs/architecture/` is the authoritative description of the system as it
  exists now. Do not reconstruct current architecture from decision history:
  a decision record states what was chosen at a point in time, not what is
  true today, and the two diverge as the code moves.
- Durable architectural rules belong in the relevant current-state architecture
  document; repository-wide invariants belong here. Ordinary implementation
  choices do not require architecture documentation. A durable rule that lives
  only in an issue, chat, or historical record will be lost to future agents.

## Clarifications

The repository currently has intentional feature-to-feature dependencies:
Pi consumes the Major System word provider through its public barrel. Cards
also has an internal PAO-to-Themed seeding edge. These are listed in
[SYSTEM.md](SYSTEM.md) and the affected feature documents.

The current feature-to-app integration seams are settings, page-layout rail or
header publication, and shared overlay presentation. Changes to those seams
require [SYSTEM.md](SYSTEM.md) plus the affected feature architecture; they are
not candidates for generic `core/` merely because several features use them.

## Historical rationale

This invariant set grew out of ADR 0012 and its refinements ADR 0021 and
ADR 0034, archived under `docs/archive/adr/`. This document is canonical; the
records are history.
