# Change Spec 0047 - Simplify World Countries refresh and settings integration

- **Status:** Implemented
- **Date:** 2026-08-29
- **Issue:** None.
- **Related ADRs:** None. This change preserves app-owned global settings, feature-owned World Countries state, the existing World Countries public boundary, and existing persistence identities.
- **Related changes:** Change Spec 0046 establishes lint/CI/dependency guardrails and should be implemented first when both changes are delivered together.
- **Current-state docs:** `docs/architecture/SYSTEM.md`, `docs/architecture/PERSISTENCE.md`, `docs/architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries plus the existing `app/settings` integration seam only

## Goal

Remove redundant/manual World Countries refresh plumbing and break the runtime cycle between app settings persistence and the World Countries feature without changing user-visible learning behavior, settings semantics, persistence keys, or feature ownership.

External feature state that React cannot observe directly must use explicit feature-owned subscription signals instead of unrelated phase changes, integer counters, or refresh props.

## User-visible behavior

The product should behave the same except that state changes are reflected reliably without requiring unrelated navigation or phase changes.

### Geography order changes

After a successful World Countries order save, reset, or restore:

- every mounted World Countries view that derives geography metadata/order reflects the new order immediately;
- no tab switch, phase transition, or manual refresh is required;
- one semantic geography change must not require multiple nested version counters to become visible.

### Learning milestone changes

After a Subregion's Countries or Capitals learning milestone is marked or cleared:

- mounted World Countries readiness/progress consumers re-read the durable learning state;
- Today and Drill setup do not depend on an unrelated `phase` change or generic revision counter to discover the update.

### Mnemonic changes

After a World Countries mnemonic is saved or deleted:

- mounted World Countries mnemonic views/panels can display the new value without a parent-maintained `mnemonicVersion`;
- this works in Drill-launched Learning, Drill sessions, and Today-launched Learning;
- save failures keep the existing visible error behavior and must not publish a successful refresh.

### Settings

Existing settings remain behaviorally and persistently compatible:

- `major-settings` remains the settings key;
- World Countries included entity groups retain the same meaning;
- World Countries new-items-per-set retains the same meaning and values;
- existing stored settings continue to load safely;
- settings UI continues to expose the same World Countries controls.

The runtime module cycle through:

```text
app/settings/settings.ts
  -> @/features/world-countries
  -> WorldCountries.tsx
  -> app/settings/SettingsContext.tsx
```

must no longer exist.

## Scope

### 1. Keep one authoritative geography refresh signal

Reuse the existing feature-owned geography subscription seam in:

`src/features/world-countries/geography/geographyRefresh.ts`

Geography metadata stores already publish semantic change notifications. Consumers that read geography metadata/order during render or memoization must subscribe to that signal rather than relying on local counters or callbacks whose only purpose is invalidation.

Remove refresh-only state/callback plumbing made redundant by the subscription, including where applicable:

- `geographyVersion` in `WorldCountriesDrill`;
- `orderVersion` in `DrillSetup`;
- Today's generic `revision` when it is being used only to force geography reads;
- `onGeographyChanged` props/callbacks whose sole purpose is to bump one of those counters.

Do not remove callbacks that have a real workflow meaning.

In particular, Learning Country-order authoring may still need a semantic `onOrderSaved` callback to rebuild the current staged learning plan after the authored order changes. That is workflow behavior, not cache invalidation.

A semantic geography write should publish through the owning store, not require every editor to remember to notify a distant coordinator.

### 2. Give Subregion learning state an observable revision

`subregionLearningStore.ts` is a module-level durable store read during React render/memoization. Add a small feature-local subscribe/getSnapshot Hook pattern equivalent in intent to the existing geography refresh seam.

The learning signal must update after semantic milestone mutations such as:

- mark Countries learned;
- clear Countries learned;
- mark Capitals learned;
- clear Capitals learned.

Consumers must subscribe directly rather than using unrelated state as a fake dependency.

Replace patterns such as:

```ts
useMemo(
  () => getAllSubregionLearningStates(activeCountries),
  [activeCountries, phase],
)
```

and Today's generic revision invalidation with the learning-store revision.

Preserve:

- the current membership-fingerprint reconciliation behavior;
- the current localStorage keys and stored shapes;
- current best-effort localStorage failure semantics;
- returned defensive copies.

Do not introduce a global application store.

### 3. Give World Countries mnemonics a feature-local refresh signal

World Countries uses shared `core/mnemonics` persistence, but World Countries owns its geography mnemonic targets and editors.

Add a feature-local mnemonic change signal under the World Countries mnemonic capability. Successful World Countries mnemonic put/delete operations must publish the signal after the underlying async write completes.

World Countries mnemonic readers/editors should subscribe locally so callers no longer need to thread refresh versions through the workflow tree.

Remove refresh-only plumbing where it becomes unnecessary, including where applicable:

- `mnemonicVersion` state in `WorldCountriesDrill`;
- `mnemonicVersion` props through Learning/Drill rails;
- `refreshKey` props that exist only to carry the parent version;
- `onMnemonicChanged` callbacks whose only effect is incrementing a version.

Do not change the shared IndexedDB connection/version owner.

Do not require a cross-feature mnemonic event bus.

Prefer keeping the existing generic `core/mnemonics` API stable. If a core change becomes genuinely necessary, stop and load `docs/architecture/CORE.md` before modifying it; do not broaden this feature cleanup into a generic mnemonic redesign.

### 4. Break the app-settings / World Countries runtime cycle

Preserve the current architecture:

- `app/` owns the global Settings container and persistence;
- World Countries owns World Countries domain rules and interpretation;
- external consumers use the World Countries root public boundary.

Remove the runtime dependency from the low-level settings persistence module to the World Countries root barrel.

`src/app/settings/settings.ts` must be importable without evaluating the World Countries UI tree.

Do not "fix" the cycle by importing private World Countries implementation modules directly from `app/settings/settings.ts`.

Feature-domain normalization should occur at the World Countries boundary/consumer where practical. App-owned settings persistence may perform generic structural/default normalization required to safely load the settings record, but it must not need to evaluate `WorldCountries.tsx` or reach into private World Countries internals.

The implementation may adjust app-owned settings types to represent persisted option IDs structurally where needed, provided:

- stored JSON remains compatible;
- existing valid values retain their meaning;
- World Countries narrows/normalizes values before domain use;
- settings UI remains typed enough to avoid arbitrary invalid writes.

Do not introduce a namespaced feature-settings framework in this change.

Do not move Settings persistence into World Countries.

### 5. Add regression coverage for refresh behavior

Add meaningful tests that protect the bug class being removed.

Coverage must prove, at an appropriate level, that:

- a geography metadata/order mutation changes the subscribed snapshot and mounted consumers can observe it;
- Subregion learning milestone mutations publish the learning revision;
- a World Countries mnemonic save/delete can refresh another mounted mnemonic consumer without a parent-maintained version counter;
- the settings persistence module no longer imports/evaluates the World Countries runtime tree.

Prefer store/subscription and focused component behavior tests over brittle DOM structure assertions.

### 6. Add World Countries persistence-isolation regression coverage

The current architecture states that World Countries reset/import/export work must never clear or modify unrelated feature persistence.

Add a regression test around World Countries order backup/reset/restore behavior that seeds unrelated browser-storage sentinel values and verifies they remain byte-for-byte unchanged across:

- export;
- restore/import;
- reset.

The test should catch broad operations such as `localStorage.clear()` without importing or modifying sibling feature internals.

Also verify that these operations do not mutate:

- `major-settings`;
- World Countries learning milestones;
- World Countries Recite progress;

because the order backup contract owns geography ordering metadata only.

Do not change the backup format or persistence schema as part of adding this test.

## Interaction and states

### Geography save

Given a mounted setup/learning view and an authored geography order:

```text
save order
-> owning geography store persists
-> geography revision changes
-> subscribed consumers derive current metadata/order
```

No parent counter is required.

### Learning completion

Given a mounted Today or Drill setup consumer:

```text
mark Subregion Countries learned
-> learning store persists the milestone
-> learning revision changes
-> subscribed consumer re-derives readiness/state
```

The consumer must not rely on moving from `learning` to `setup` merely to see the update.

### Mnemonic save

Given two mounted/readable World Countries mnemonic consumers for the same target:

```text
edit + save in consumer A
-> shared mnemonic write succeeds
-> World Countries mnemonic revision changes
-> consumer B re-reads and shows the saved content
```

If the write rejects:

- the existing editor error is shown;
- no successful-change notification is emitted;
- existing persisted content remains the source of truth.

### Settings load

Given an existing `major-settings` payload:

- valid World Countries values remain effective;
- malformed/unknown World Countries values fall back or normalize safely before domain behavior uses them;
- loading the persistence module does not evaluate the World Countries component tree.

## Architecture constraints

- Follow `CLAUDE.md`, `AGENTS.md`, and `src/features/world-countries/AGENTS.md`.
- Follow `docs/architecture/SYSTEM.md`.
- Follow `docs/architecture/PERSISTENCE.md`.
- Follow `docs/architecture/features/WORLD_COUNTRIES.md`.
- Stay inside World Countries plus the existing `app/settings` integration seam.
- Do not scan or refactor sibling features.
- `app/` continues to own the Settings container and `major-settings` persistence.
- World Countries continues to own Country/Subregion/entity-group semantics.
- The World Countries root `index.ts` remains the public feature boundary for app/external consumers.
- Do not create a second World Countries public subpath solely to route around the cycle.
- Do not import World Countries private modules directly from the low-level app settings persistence module.
- Geography, Subregion learning, and World Countries mnemonic refresh signals remain feature-local.
- Do not introduce Redux, Zustand, another state library, or a generic event bus.
- Do not change `core/scoring/attemptStore.ts` ownership of the `major-system` IndexedDB connection/version.
- Do not change World Countries stable IDs, evidence semantics, review scheduling, Recite progress semantics, or learning-milestone meaning.
- Do not change persistence keys or backup format.
- Remove only refresh plumbing that is redundant. Preserve semantic workflow callbacks such as rebuilding a staged plan after an authored order changes.

No ADR is required because the change removes accidental/redundant coupling while conforming to the existing ownership model.

## Existing capabilities to reuse

- `src/features/world-countries/geography/geographyRefresh.ts`
  - Existing `useSyncExternalStore`-based feature signal and the model for other World Countries external-state subscriptions.
- `src/features/world-countries/geography/worldMetadataStore.ts`
- `src/features/world-countries/geography/continentMetadataStore.ts`
- `src/features/world-countries/geography/subregionMetadataStore.ts`
  - Existing geography persistence owners that publish geography changes.
- `src/features/world-countries/learning/subregionLearningStore.ts`
  - Durable Subregion learning-state owner that needs a subscriber-visible revision.
- `src/features/world-countries/mnemonics/GeographyMnemonicEditor.tsx`
  - World Countries authored mnemonic write surface.
- `src/features/world-countries/mnemonics/GeographyMnemonicView.tsx`
- `src/features/world-countries/mnemonics/CountryCapitalMnemonicPanel.tsx`
  - World Countries mnemonic consumers that should refresh without parent version plumbing.
- `src/core/mnemonics/useMnemonic.ts`
  - Existing generic read hook; keep its shared contract stable if possible.
- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
  - Current manual invalidation consumers.
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
  - Existing example of consuming the geography revision directly.
- `src/app/settings/settings.ts`
- `src/app/settings/SettingsContext.tsx`
- `src/app/settings/SettingsOverlay.tsx`
  - Existing app-owned settings persistence/context/UI seam.
- `src/features/world-countries/geography/orderBackup.ts`
  - Geography-order-only backup/reset/restore contract for persistence-isolation regression coverage.

## Edge cases

- Multiple geography writes within one logical restore should leave consumers at the final restored snapshot; avoid requiring callers to manually bump additional counters.
- Active-country population changes still participate in derived state independently of external-store revisions.
- Learning membership reconciliation during reads must not cause render loops.
- A failed mnemonic write must not publish a successful revision.
- A successful mnemonic delete must refresh consumers to the empty state.
- Two different World Countries mnemonic targets may share the same feature revision; consumers must still read only their own target.
- Removing a refresh prop must not remove a callback that also changes current workflow state.
- Settings with legacy or malformed World Countries values must not crash app startup.
- The settings-cycle fix must not bypass the documented public feature boundary with a private-module import.
- World Countries order reset/restore/export must leave unrelated localStorage sentinels and non-order World Countries state unchanged.

## Out of scope

- Feature-owned/namespaced global settings slices.
- New settings UI.
- Settings key/schema migration.
- Generic cross-feature external-store framework.
- Generic mnemonic event bus.
- Changes to Pi, Major System, or Cards.
- Changes to SM-2, `core/learning`, review scheduling, or mastery semantics.
- Internal `learning/`, `geography/`, or `maps/` barrels.
- Storage-key registry refactor.
- `SvgMapController` decomposition.
- Error-boundary work.
- Prettier/tooling work from Change Spec 0046.

## Acceptance criteria

- [ ] Geography order save/reset/restore updates subscribed World Countries consumers without parent-maintained geography version counters.
- [ ] `WorldCountriesDrill` no longer owns a `geographyVersion` whose only purpose is cache invalidation.
- [ ] `DrillSetup` no longer owns an `orderVersion` whose only purpose is cache invalidation.
- [ ] Geography editors no longer call refresh-only parent callbacks when the owning geography store already publishes the change.
- [ ] Subregion learning milestone mark/clear operations publish a feature-local revision.
- [ ] Today and Drill derive Subregion learning state from the learning revision rather than unrelated phase/generic counters.
- [ ] World Countries mnemonic save/delete publishes a feature-local mnemonic revision only after successful persistence.
- [ ] Drill/Today/Learning mnemonic consumers refresh without a coordinator-owned `mnemonicVersion`.
- [ ] Refresh-only `mnemonicVersion`, `refreshKey`, and `onMnemonicChanged` prop plumbing is removed where it has no other semantic responsibility.
- [ ] Existing mnemonic save errors remain visible and failed writes do not publish a success revision.
- [ ] `src/app/settings/settings.ts` no longer has a runtime import path through the World Countries root barrel/UI tree.
- [ ] The settings-cycle fix does not introduce a direct private-module import from `app/settings/settings.ts` into `src/features/world-countries/**`.
- [ ] `major-settings` key and existing World Countries settings behavior remain compatible.
- [ ] World Countries order export/restore/reset leaves unrelated storage sentinels unchanged.
- [ ] World Countries order export/restore/reset leaves `major-settings`, learning milestones, and Recite progress unchanged.
- [ ] No World Countries persistence key, stable ID, order-backup version, attempt semantics, learning milestone semantics, or Recite progress semantics changes.
- [ ] Targeted refresh/settings/persistence-isolation tests pass.
- [ ] `npx vitest run src/features/world-countries` passes.
- [ ] Repository lint passes when Change Spec 0046 is present.
- [ ] Full repository tests and production build pass because this change crosses the World Countries/app settings integration boundary.

## Source anchors

- `src/features/world-countries/geography/geographyRefresh.ts`
- `src/features/world-countries/geography/worldMetadataStore.ts`
- `src/features/world-countries/geography/continentMetadataStore.ts`
- `src/features/world-countries/geography/subregionMetadataStore.ts`
- `src/features/world-countries/geography/orderBackup.ts`
- `src/features/world-countries/learning/subregionLearningStore.ts`
- `src/features/world-countries/mnemonics/GeographyMnemonicEditor.tsx`
- `src/features/world-countries/mnemonics/GeographyMnemonicView.tsx`
- `src/features/world-countries/mnemonics/CountryCapitalMnemonicPanel.tsx`
- `src/features/world-countries/drill/WorldCountriesDrill.tsx`
- `src/features/world-countries/drill/DrillSetup.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/drill/DrillSessionRails.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
- `src/app/settings/settings.ts`
- `src/app/settings/SettingsContext.tsx`
- `src/app/settings/SettingsOverlay.tsx`
- `src/features/world-countries/index.ts`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` so it describes the implemented refresh model accurately:

- geography metadata uses the feature-owned geography subscription signal;
- durable Subregion learning state exposes a feature-local subscription signal;
- World Countries mnemonic authoring/read presentation uses a feature-local mnemonic change signal over shared mnemonic persistence;
- workflow coordinators do not own generic version counters solely to re-read module stores.

Update the current description of `WorldCountriesDrill.tsx` if it still says the coordinator owns a generic contextual-authoring refresh boundary after that responsibility is removed.

Update `docs/architecture/SYSTEM.md` only if needed to clarify the existing settings integration seam after the runtime cycle is removed. Do not change its ownership model.

No persistence-document update is required unless implementation unexpectedly changes a persistence contract, which this spec does not authorize.

Do not create an ADR.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-29.
- Evidence: focused refresh/store/settings/persistence tests passed (35 tests); `npx.cmd vitest run src/features/world-countries` passed (including the full World Countries feature suite); `npm.cmd run lint` passed; `npm.cmd test` passed with 137 test files and 743 tests; and `npm.cmd run build` passed with TypeScript and the production Vite build.
