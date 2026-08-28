# Change Spec 0042 - Refactor World Countries subregion learning store

- **Status:** Implemented
- **Date:** 2026-08-28
- **Issue:** None.
- **Related ADRs:** None. This is a behavior-preserving internal refactor of the existing World Countries learning persistence boundary.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Make `subregionLearningStore.ts` easier to reason about and test by separating storage parsing, Country-membership reconciliation, and persistence side effects.

The current behavior is intentionally retained, including restoration of historical completion when a previously learned Country membership becomes active again.

The refactor should reduce nested/branch-heavy persistence logic without changing storage keys, persisted data compatibility, completion semantics, or public APIs.

RepoWise health is a secondary validation signal. The implementation must improve responsibility boundaries and testability rather than shape code solely for a better numeric score.

## User-visible behavior

There is no intended user-visible behavior change.

Existing World Countries Learning completion behavior remains unchanged:

- Country and Capital completion are stored independently.
- Capitals may be completed before Countries.
- Clearing one completion dimension does not clear the other.
- Changing Country order does not invalidate completion.
- Changing the active Country membership invalidates completion for that membership.
- Completion for a previously used membership is retained in history and restored if that membership becomes active again.
- Invalid or legacy completion state that cannot be associated with a membership fingerprint is not trusted.

## Scope

### 1. Separate storage parsing from reconciliation

`src/features/world-countries/learning/subregionLearningStore.ts` currently mixes:

- reading JSON from storage;
- validating/normalizing persisted state rows;
- validating/normalizing membership records;
- calculating active Country-membership fingerprints;
- reconciling stored completion with the active Country membership;
- moving completion snapshots into/out of membership history;
- deciding whether storage must be rewritten;
- writing state and membership records.

Extract the parsing/normalization logic into pure helpers.

Conceptually:

```ts
parseStoredStates(raw: unknown): SubregionLearningState[]
parseMembershipRecords(raw: unknown): Record<string, PersistedMembership>
```

Exact names may vary.

These helpers must:

- perform no storage reads;
- perform no storage writes;
- preserve the current validation behavior;
- tolerate malformed persisted values the same way as today;
- continue deduplicating stored states by `subregionId`;
- continue rejecting invalid timestamps and invalid Subregion IDs.

### 2. Extract pure membership reconciliation

Move the core active-membership reconciliation into a pure function.

Conceptually:

```ts
reconcileSubregionLearningMembership({
  states,
  records,
  activeCountries,
}) => {
  states,
  records,
  statesChanged,
  recordsChanged,
}
```

Exact naming/shape may vary.

The reconciliation function must not call:

- `readJSON`;
- `safeSet`;
- `localStorage`;
- time APIs;
- React;
- unrelated World Countries workflow code.

It must preserve the existing semantics for:

- current membership fingerprints;
- legacy string membership records;
- history snapshots;
- restoration of historical completion;
- removal of restored history entries;
- compacting membership records back to a string when no history remains;
- dropping untrusted completion rows that have no associated membership record.

### 3. Keep persistence orchestration thin

After extraction, the storage-facing read path should become a small coordinator:

```text
read raw states
read raw membership records
parse both
reconcile against active Countries
persist only changed outputs
return reconciled states
```

The public store API remains responsible for persistence.

A function may still write during the public "read active state" path if reconciliation requires repairing persisted state. This change does **not** require changing that observable persistence behavior.

The important requirement is that the mutation decision comes from the pure reconciliation result rather than being entangled with the iteration that performs I/O.

### 4. Simplify completion updates without changing semantics

`updateCompletion(...)` should continue to own Country/Capital mark/clear behavior, but reuse the extracted normalization/reconciliation seams where appropriate.

Preserve:

- validation of `subregionId`;
- validation of finite timestamps;
- independent Country/Capital completion fields;
- deletion of an empty completion state;
- creation/update/removal of the active membership record;
- removal of the active fingerprint from historical snapshots when current completion is updated;
- retention of other historical membership snapshots.

Do not introduce a new storage format.

### 5. Preserve the public API

Do not change the signatures or behavior of:

```ts
getAllSubregionLearningStates(...)
getSubregionLearningState(...)
markSubregionCountriesLearned(...)
clearSubregionCountriesLearned(...)
markSubregionCapitalsLearned(...)
clearSubregionCapitalsLearned(...)
```

Preserve these exported storage keys:

```ts
SUBREGION_LEARNING_STORAGE_KEY
SUBREGION_LEARNING_MEMBERSHIP_KEY
```

Existing callers must not require migration.

### 6. Preserve storage compatibility

The refactor must continue to read the existing persisted shapes:

#### Completion state

```ts
{
  subregionId,
  countriesLearnedAt?,
  capitalsLearnedAt?
}
```

#### Membership record

Legacy compact form:

```ts
"<fingerprint>"
```

History-capable form:

```ts
{
  current: "<fingerprint>",
  history: {
    "<fingerprint>": {
      countriesLearnedAt?,
      capitalsLearnedAt?
    }
  }
}
```

Do not rename keys or eagerly migrate all persisted data to a new versioned schema.

### 7. Keep membership identity semantics unchanged

The membership fingerprint remains based on the sorted active Country IDs belonging to a Subregion.

Country ordering must remain irrelevant.

The refactor must not change:

- Country identity;
- Subregion membership definitions;
- filtering of active Countries;
- geographic ordering;
- user-authored Country order behavior.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- Stay inside World Countries except for direct existing storage helpers already used by the store.
- `subregionLearningStore.ts` remains the public persistence seam for Subregion learning completion.
- Do not introduce a repository-wide persistence framework.
- Do not create a broad `common/`, `domain/`, or migration layer.
- Pure reconciliation code may live in a focused World Countries Learning module if extraction materially clarifies the store.
- Keep storage ownership in the Learning area.
- Do not move this state into Drill, Today, Recite, settings, or React context.
- Do not change the storage keys or persisted format.
- Do not change completion/milestone semantics.
- Do not change Country population or membership semantics.
- Prefer pure functions with explicit input/output over classes or mutable service objects.
- Do not make changes solely to satisfy RepoWise markers.

No ADR is required.

## Existing capabilities to reuse

- `src/core/storage`
  - Existing `readJSON` and `safeSet` persistence utilities.
- `src/features/world-countries/data/countries`
  - Existing Country data and default active Country population.
- `src/features/world-countries/data/subregions`
  - Existing `SubregionId` validation.
- `src/features/world-countries/learning/subregionLearningState`
  - Existing persisted learning-state type.
- `src/features/world-countries/learning/subregionLearningStore.test.ts`
  - Existing behavioral regression coverage for completion and membership semantics.

## Edge cases

- Malformed top-level stored state that is not an array returns no valid states.
- Duplicate persisted rows for the same Subregion continue to keep only the first valid row.
- A completion row with neither Country nor Capital completion is ignored.
- Non-finite timestamps remain invalid.
- Invalid Subregion IDs remain ignored in persisted input and rejected in public mutation calls.
- Legacy membership strings remain readable.
- Malformed membership history entries remain ignored.
- A state with no membership record remains untrusted and is removed during reconciliation.
- A changed active membership archives the old completion snapshot under the old fingerprint.
- If the new active membership has a historical snapshot, that snapshot is restored.
- Restoring a historical snapshot removes that fingerprint from history and makes it current.
- If no historical snapshot exists for the new membership, the active completion remains absent.
- Membership history for other fingerprints must survive current completion changes.
- Country-order changes must not change the membership fingerprint.
- Re-enabling a previously removed Country must restore the matching historical completion.
- Clearing the final completion dimension removes the active state and removes the active membership record when no history remains.

## Out of scope

- Changing Learning completion rules.
- Changing when Country or Capital Learning is marked complete.
- Adding new completion dimensions.
- Changing Subregion definitions or active Country population.
- Changing Country ordering.
- Versioning or migrating the storage format.
- Moving persistence to IndexedDB, a server, or another store.
- Refactoring unrelated learning flows.
- Refactoring `SvgMapController.ts`.
- Refactoring `WorldCountriesDrill.tsx`.
- Refactoring `DrillSetup.tsx`.
- Chasing RepoWise score changes beyond the actual structural improvement.

## Acceptance criteria

### Parsing

- [x] Completion-state parsing is pure and independently testable.
- [x] Membership-record parsing is pure and independently testable.
- [x] Current validation behavior for malformed persisted values is preserved.
- [x] Duplicate Subregion completion rows remain handled as today.

### Reconciliation

- [x] Active-membership reconciliation is implemented as a pure function.
- [x] Reconciliation returns both reconciled data and explicit change information.
- [x] Reconciliation performs no storage I/O.
- [x] Legacy compact membership records remain supported.
- [x] Historical completion is archived/restored exactly as today.
- [x] Untrusted completion rows without membership records are still removed.
- [x] Country ordering has no effect on the membership fingerprint.

### Persistence

- [x] Public read APIs return the same values as before.
- [x] Public mark/clear APIs retain the same signatures.
- [x] Existing storage keys are unchanged.
- [x] Existing persisted data remains readable without migration.
- [x] Storage is only rewritten when reconciliation/update semantics require it.
- [x] Country and Capital completion remain independently mutable.

### Regression coverage

- [x] Existing `subregionLearningStore.test.ts` tests remain green.
- [x] Add direct tests for malformed state parsing.
- [x] Add direct tests for malformed membership parsing.
- [x] Add pure reconciliation tests for unchanged membership.
- [x] Add pure reconciliation tests for membership invalidation.
- [x] Add pure reconciliation tests for historical restoration.
- [x] Add regression coverage proving Country order does not affect the fingerprint.
- [x] Add regression coverage proving other historical snapshots survive updates.

## Source anchors

- `src/features/world-countries/learning/subregionLearningStore.ts`
- `src/features/world-countries/learning/subregionLearningStore.test.ts`
- `src/features/world-countries/learning/subregionLearningState.ts`
- `src/features/world-countries/data/countries.ts`
- `src/features/world-countries/data/subregions.ts`
- `src/core/storage.ts`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `src/features/world-countries/AGENTS.md`

## Documentation impact

No current-state architecture change is expected.

If the implementation changes the persistence ownership, storage format, membership identity rules, or migration policy, stop and evaluate that as a separate architectural change rather than including it in this refactor.

Do not rewrite historical Change Specs.

## Verification

Complete this section when setting the status to `Implemented`.

Verification completed on 2026-08-29. The Windows host uses `npx.cmd` and
`npm.cmd` equivalents because PowerShell blocks the corresponding `.ps1`
launchers.

```text
npx.cmd vitest run src/features/world-countries/learning/subregionLearningStore.test.ts
PASS — 1 test file, 14 tests

npx.cmd vitest run src/features/world-countries/learning
PASS — 35 test files, 158 tests

npx.cmd vitest run src/features/world-countries
PASS — 100 test files, 508 tests

npm.cmd run typecheck
PASS — tsc -b

npm.cmd test
PARTIAL — 132 test files passed, 708 tests passed; 1 unrelated
src/app/settings/SettingsOverlay.test.tsx assertion failed

repowise update
PASS — Already up to date.

repowise health
PASS — repository Healthy; subregionLearningStore.ts score 3.9, CCN 24,
Nest 4, NLOC 279.
```

The RepoWise result is informational; the pre-change baseline was score 3.9,
CCN 24, Nest 4, NLOC 227.

Minimum verification:

```bash
npx vitest run src/features/world-countries/learning/subregionLearningStore.test.ts
npx vitest run src/features/world-countries/learning
npx vitest run src/features/world-countries
npm run typecheck
```

Then rerun:

```bash
repowise health
```

Record the resulting `subregionLearningStore.ts` score/CCN/Nest/NLOC if useful.

Pre-change baseline:

```text
subregionLearningStore.ts
score 3.9
CCN 24
Nest 4
NLOC 227
```

RepoWise is informational. Do not make extra changes solely to cross a score threshold.
