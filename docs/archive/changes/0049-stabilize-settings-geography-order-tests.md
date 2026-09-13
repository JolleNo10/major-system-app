# Change Spec 0049 - Stabilize Settings Geography Order Tests

- **Status:** Implemented
- **Date:** 2026-08-29
- **Issue:** None.
- **Related ADRs:** None. This change corrects test synchronization and does not change architecture or product behavior.
- **Related changes:** Change Spec 0013 introduced World Countries geography-order backup/import/reset. Change Spec 0046 established repository CI guardrails. Change Spec 0047 consolidated World Countries refresh behavior.
- **Current-state docs:** `docs/architecture/SYSTEM.md`, `docs/architecture/PERSISTENCE.md`, `docs/architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — Settings integration test for World Countries geography order only

## Goal

Remove the intermittent CI failure in `SettingsOverlay.test.tsx` by synchronizing the test with the actual asynchronous file-read/UI transition instead of assuming that one zero-delay timer is enough for `FileReader.onload` and React state publication to finish.

The delivered change must make the test deterministic without changing Settings or World Countries production behavior, weakening assertions, retrying failures, or introducing a new test framework.

## User-visible behavior

No user-visible behavior changes.

The existing Settings geography-order workflow remains exactly the same:

- selecting a valid backup file reads and parses it before showing import confirmation;
- confirming import replaces the saved geography order;
- opening reset confirmation does not change saved order;
- confirming reset removes saved geography order;
- invalid input and storage failures remain recoverable and visible.

## Problem evidence

A CI run on commit `24d26a7` failed in:

`src/app/settings/SettingsOverlay.test.tsx`

Test:

`Settings World Countries geography order > resets all custom geography order after confirmation`

The first assertion after confirming import expected saved World order `europe` but observed `null`.

The same run also emitted React's warning that an update to `SettingsOverlay` was not wrapped in `act(...)`.

No Settings/geography production code had changed in the triggering commit, and the unchanged test passed again on the subsequent current-main CI run. This establishes an intermittent test race rather than a persistent product regression.

The race is in the test helper:

```ts
await act(async () => {
  input.dispatchEvent(new Event('change', { bubbles: true }))
  await new Promise(resolve => setTimeout(resolve, 0))
})
```

Production `SettingsOverlay` handles the selected file through asynchronous `FileReader` completion:

```text
change event
-> orderState = reading
-> FileReader.readAsText(file)
-> FileReader.onload
-> parse backup
-> orderState = confirm | error
```

A single `setTimeout(0)` is not a contract that `FileReader.onload` has run. When the helper returns early, the UI may still show `Reading backup…`; the outer `Import order` button remains disabled and the confirmation button does not yet exist. The test can therefore click the wrong/disabled button and then observe unchanged storage.

## Scope

### 1. Replace arbitrary-tick synchronization with observable-state synchronization

Update `src/app/settings/SettingsOverlay.test.tsx` so the file-selection helper does not treat one event-loop tick as proof that asynchronous file reading is complete.

After dispatching the file input `change` event, wait inside async `act(...)` until the UI reaches the expected post-read state.

For a valid backup, the observable ready state is the import-confirmation UI, for example the group/heading associated with:

`Import geography order?`

For invalid input, the observable ready state is the resulting alert.

The helper may accept an expected outcome or use another small deterministic mechanism that distinguishes:

- still reading;
- confirmation ready;
- error ready.

Use observable DOM state as the synchronization contract.

Do not use a fixed sleep as the success condition.

A bounded timeout may be used only to fail the helper with a useful diagnostic if the expected state never arrives.

### 2. Keep FileReader completion inside React `act(...)`

The asynchronous wait must keep `act(...)` pending through the `FileReader.onload`-driven state update and the resulting React render.

After the fix, the Settings geography-order tests must not emit:

`An update to SettingsOverlay inside a test was not wrapped in act(...)`

Do not suppress `console.error` or React warnings to achieve this.

### 3. Make confirmation-button selection explicit

Where the tests confirm import/reset, prefer selecting the button from the relevant confirmation group rather than relying on:

```ts
getButtons('Import order')[getButtons('Import order').length - 1]
```

or the equivalent reset expression when a more explicit scoped query is practical.

The test should encode the state it expects to interact with:

- outer Settings action;
- import confirmation action;
- reset confirmation action.

Do not change production labels or add production-only test IDs solely for this test unless existing accessible roles/labels are insufficient.

### 4. Preserve the existing behavioral assertions

Do not weaken or remove the current assertions proving that:

- an import is not applied before confirmation;
- cancel leaves current order untouched;
- confirmed import replaces order;
- reset confirmation alone leaves order untouched;
- confirmed reset clears World/Continent/Subregion ordering;
- invalid JSON does not alter saved order;
- storage failure remains visible and Settings stays open.

The fix is synchronization, not reduced coverage.

### 5. Verify stability, not just one green run

After the focused test passes once, run `SettingsOverlay.test.tsx` repeatedly enough to exercise the original race.

Use a shell loop or equivalent local repeated execution. Do not add Vitest retries, CI job retries, or permanent "retry until green" behavior.

The final repository verification remains:

```text
npm run lint
npm test
npm run build
```

## Architecture constraints

- Follow `CLAUDE.md` and `AGENTS.md`.
- Follow the existing app-owned Settings and World Countries persistence boundaries.
- Do not change `SettingsOverlay.tsx` merely to make the test easier unless investigation uncovers an independent production defect.
- Do not change World Countries order persistence, refresh, backup format, or Settings ownership.
- Do not add a new test library for this small synchronization fix.
- Do not add test retries or CI retries.
- Do not use arbitrary sleeps as the success condition.
- No ADR is required.

## Existing capabilities to reuse

- `src/app/settings/SettingsOverlay.test.tsx`
  - Existing integration-style Settings test and the flaky `chooseFile` helper.
- `src/app/settings/SettingsOverlay.tsx`
  - Existing asynchronous `FileReader` state machine; production behavior is the contract the test should await.
- `src/features/world-countries/geography/orderBackup.ts`
  - Existing synchronous order restore/reset behavior after confirmation.
- `src/features/world-countries/geography/orderBackup.test.ts`
  - Existing direct store-level coverage; this change should not duplicate those internals in the Settings UI test.

## Edge cases

- `FileReader.onload` may occur before or after a zero-delay timer; the test must work in either ordering.
- Valid and invalid files finish in different observable UI states.
- React may batch the initial `reading` state and the final state; the helper must not require observing every intermediate render.
- A synchronization failure should fail quickly with a diagnostic identifying the expected UI state instead of hanging indefinitely.
- The test must continue to work under CI scheduling/load where the original race surfaced.

## Out of scope

- Product changes to Settings geography import/reset.
- Reworking World Countries order persistence.
- Changes to Change Specs 0046/0047 implementation.
- Adding Testing Library or another UI-test framework.
- Repository-wide test-helper cleanup.
- Fixing unrelated React `act(...)` warnings elsewhere.
- CI retry configuration.

## Acceptance criteria

- [ ] `chooseFile` or its replacement no longer uses one `setTimeout(0)` as proof that file reading is complete.
- [ ] File selection waits for the actual import-confirmation or error UI state while async `act(...)` remains pending.
- [ ] The Settings geography-order tests emit no unwrapped-`act` warning.
- [ ] Import and reset confirmation actions are selected from the expected confirmation state rather than accidentally falling back to a disabled outer action.
- [ ] Existing import/cancel/reset/error behavioral assertions remain intact.
- [ ] The previously failing `resets all custom geography order after confirmation` test passes repeatedly without retries.
- [ ] The complete `SettingsOverlay.test.tsx` file passes repeatedly without retries.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] No production behavior, persistence contract, or architecture document changes are introduced.

## Source anchors

- `src/app/settings/SettingsOverlay.test.tsx`
- `src/app/settings/SettingsOverlay.tsx`
- `src/features/world-countries/geography/orderBackup.ts`
- `src/features/world-countries/geography/orderBackup.test.ts`
- `.github/workflows/ci.yml`

## Documentation impact

No current-state architecture documentation change is expected because production architecture and behavior do not change.

Do not create an ADR.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-29.
- Evidence: focused `SettingsOverlay.test.tsx` passed normally (6 tests), followed by 30 consecutive runs with no failures, retries, or unwrapped-`act` warnings. `npm run lint` passed. `npm test` passed with 142 test files and 762 tests. `npm run build` passed (`tsc -b` and Vite production build).
