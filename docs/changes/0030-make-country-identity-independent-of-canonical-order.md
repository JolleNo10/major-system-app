# Change Spec 0030 - Make Country identity independent of canonical order

- **Status:** Implemented
- **Date:** 2026-08-23
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`, `docs/architecture/PERSISTENCE.md`
- **Implementation prompt:** `docs/implementations/IMPLEMENT_0030_COUNTRY_IDENTITY.md`
- **Related ADRs:** None required

## Goal

Remove positional coupling between canonical Country data and stable Country IDs in World Countries.

`COUNTRY_RECORDS` must become the single canonical source for both Country identity and canonical Country order. Every Country record owns its stable `CountryId`; moving a record changes canonical order only and can never change Country identity.

User-authored ordering remains a separate metadata layer expressed as stable IDs.

## Problem

The current canonical dataset maintains Country data and Country IDs in two independently ordered arrays:

```ts
const COUNTRY_CODES = [...]
const COUNTRY_RECORDS = [...]
```

Country identity is assigned by index:

```ts
COUNTRY_RECORDS.map((entry, index) => ({
  ...entry,
  id: COUNTRY_CODES[index],
}))
```

This creates a hidden invariant:

> `COUNTRY_CODES[index]` must always identify `COUNTRY_RECORDS[index]`.

A real regression demonstrated the failure mode. A Country record was moved in `COUNTRY_RECORDS` without the matching change in `COUNTRY_CODES`, causing subsequent records to receive the wrong stable IDs. Reordering `COUNTRY_CODES` restores the current alignment but does not remove the underlying failure mode.

Stable entity identity must not depend on order.

## Required behavior

### Canonical Country records own identity

Every canonical Country record must contain its own stable `id`.

Example:

```ts
{
  id: 'MV',
  country: 'Maldives',
  capital: 'Malé',
  continent: 'Asia',
  subregion: 'South Asia',
}
```

The record itself is authoritative for stable Country ID and all canonical Country attributes.

### Canonical order

The array order of `COUNTRY_RECORDS` is the canonical Country order.

Moving a record changes only canonical order. It must never change the record's `id`.

### User-authored order

Existing user-authored order remains an overlay using stable IDs:

```ts
countryOrder: CountryId[]
```

Effective order remains:

```text
canonical COUNTRY_RECORDS order
        +
optional persisted user order
        ↓
effective order
```

Existing resolver behavior remains: ignore unknown IDs, deduplicate stored IDs, and append current members missing from stored order using current canonical order.

Existing Continent- and Subregion-order metadata remains unchanged.

## Scope

- Move each stable Country ID into its matching canonical Country record.
- Remove Country ID assignment by array index.
- Remove `COUNTRY_CODES` as an independently maintained source of truth.
- Derive any required list of Country IDs from canonical Country records.
- Audit World Countries for positional Country-identity assumptions.
- Preserve existing stable IDs and persisted ID-based data.
- Strengthen Country identity and canonical-order regression coverage.
- Update current-state architecture documentation with the corrected invariant.

## Architecture constraints

- `src/features/world-countries/data/` continues to own canonical Country/Capital data.
- Country identity is intrinsic canonical data.
- Country identity must never be derived from array index, canonical position, sorted position, user-order position, or a parallel independently maintained array.
- `COUNTRY_RECORDS` owns both canonical Country data and canonical Country order.
- User-authored order changes ordering only; it must never alter identity.
- Stable Country IDs remain the persistence and cross-module identity seam.
- Do not create a second canonical Country-order or Country-ID registry.
- If a consumer needs all Country IDs, derive them from canonical records.
- No ADR is required because this corrects an unsafe implementation invariant within existing documented ownership.

## Data-model change

Change the canonical Country record input model so `id` is mandatory.

If `subregionId` remains derived from the canonical Subregion label, a shape equivalent to this is appropriate:

```ts
type CountryRecordInput = Omit<Country, 'subregionId'>
```

Construction may continue to derive and validate `subregionId`:

```ts
export const countries: Country[] = COUNTRY_RECORDS.map(entry => {
  const subregionId = ...
  return { ...entry, subregionId }
})
```

Deriving classification/lookup data such as `subregionId` is allowed. Deriving stable entity identity is not.

## Stable-ID compatibility

This change must not rename or migrate Country IDs.

Examples that must remain true:

```text
Pakistan  -> PK
India     -> IN
Maldives  -> MV
Myanmar   -> MM
```

Existing persisted data keyed by Country ID must continue to resolve to the same Country.

Do not reset, rewrite, or version persisted user data merely because of this refactor.

If implementation discovers persisted data already written with incorrect semantic associations during the prior bug window, report that separately. Do not silently rewrite it as part of this Change Spec.

## Consumer audit

Within World Countries and its direct dependencies, inspect for:

- `COUNTRY_CODES`;
- `COUNTRY_RECORDS[index]`;
- Country identity derived from numeric/index position;
- zipping of separate Country ID and Country data arrays;
- persistence keyed by Country array position;
- map metadata tied to Country index instead of stable ID.

At minimum verify directly relevant usage in:

- `data/`;
- `geography/`;
- `learning/`;
- `drill/`;
- `recite/`;
- `maps/`;
- `mnemonics/`;
- World Countries import/export and persistence paths.

Do not redesign consumers already using stable IDs correctly.

## Map and metadata compatibility

Verify map-related metadata continues to resolve by stable Country identity.

In particular:

- Country-to-SVG mapping must still resolve the intended Country;
- synthetic-dot metadata keyed by Country ID must still resolve correctly;
- map behavior must not depend on canonical Country array position.

Branch-only capital-authoring code is not part of the main-branch implementation unless it already exists on the implementation base. Do not pull temporary branch tooling into `main` to satisfy this Change Spec.

## Canonical-order compatibility

Keep the intended canonical Country order represented by `COUNTRY_RECORDS`.

For the known South Asia regression area, the intended sequence is:

```text
Afghanistan
Pakistan
India
Nepal
Bhutan
Bangladesh
Sri Lanka
Maldives
```

The broader invariant is:

> The `COUNTRY_RECORDS` array itself defines canonical Country order. No second array must be synchronized with it.

## Validation and tests

### Country identity integrity

Add tests that verify identity independently of order.

At minimum assert:

```text
Pakistan  -> PK
India     -> IN
Maldives  -> MV
Myanmar   -> MM
```

Add full-dataset invariants:

- every Country has a non-empty stable ID;
- Country IDs are unique;
- canonical records do not accidentally share identity;
- expected canonical population remains intact.

Prefer a maintainable expected identity mapping keyed by stable ID or Country name.

Do not recreate the production failure mode in tests by maintaining two parallel ordered arrays and zipping them by index.

### Canonical order

Keep the existing canonical-order tests.

Identity and order are separate invariants:

```text
Identity: MV means Maldives.
Order:    Maldives appears at the intended canonical position.
```

Both must be tested.

### Regression for positional coupling

Add explicit coverage proving that Country identity is attached to the Country record rather than its position.

The implementation should make the original bug class structurally impossible, not merely detected by a test comparing two ordered lists.

### Existing behavior

Run focused tests for directly affected World Countries seams, including geography/order resolution, persistence metadata using `CountryId`, synthetic dots / map identity mapping, and Drill/Recite/learning consumers as indicated by the audit.

Then run the scoped World Countries suite and typecheck required by `src/features/world-countries/AGENTS.md`.

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` with this invariant:

> Country IDs are intrinsic canonical record data. Country identity must never be inferred from array position. `COUNTRY_RECORDS` owns canonical Country data and canonical Country order; user-order metadata may reorder stable IDs without changing identity.

Update `docs/architecture/PERSISTENCE.md` only if needed to clarify that persisted World Countries records reference stable `CountryId`s independent of canonical order.

No ADR is expected.

## Out of scope

- Changing ISO-like Country IDs.
- Changing Country membership.
- Changing canonical geography merely as part of the refactor.
- Redesigning user-order UI.
- Redesigning Continent/Subregion ordering.
- Redesigning learning algorithms.
- Redesigning Drill or Recite.
- Redesigning map rendering.
- Migrating persistence without evidence that migration is required.
- Pulling temporary capital-authoring branch tooling into `main`.
- General data-layer refactors outside World Countries.

## Acceptance criteria

- [ ] Every canonical Country record contains its own stable `id`.
- [ ] No production code assigns Country ID by array position.
- [ ] `COUNTRY_CODES` is removed as an independently maintained source of truth.
- [ ] Any Country-ID list still required by consumers is derived from canonical Country records.
- [ ] `COUNTRY_RECORDS` is the sole canonical source for Country identity and canonical Country order.
- [ ] Moving a Country record can change canonical order without changing that Country's identity.
- [ ] Existing stable Country IDs are unchanged.
- [ ] Existing user Country-order metadata remains an ID-based override and preserves current resolver semantics.
- [ ] Existing Continent/Subregion user-order semantics remain unchanged.
- [ ] World Countries contains no remaining positional Country-identity dependency discovered by the scoped audit.
- [ ] Pakistan resolves to `PK`.
- [ ] India resolves to `IN`.
- [ ] Maldives resolves to `MV`.
- [ ] Myanmar resolves to `MM`.
- [ ] Canonical South Asia order remains the intended order.
- [ ] Full canonical Country IDs are non-empty and unique.
- [ ] Canonical identity tests are independent of canonical-order tests.
- [ ] Existing canonical-order tests continue to pass.
- [ ] Directly relevant map/synthetic-dot identity tests pass.
- [ ] Existing persisted ID contracts require no migration unless separately documented from concrete findings.
- [ ] `docs/architecture/features/WORLD_COUNTRIES.md` documents the intrinsic-ID invariant.
- [ ] Scoped World Countries tests pass.
- [ ] `npm run typecheck` passes.

## Source anchors

Primary:

- `src/features/world-countries/data/countries.ts`
- `src/features/world-countries/geography/canonicalOrder.test.ts`
- `src/features/world-countries/geography/subregionMetadata.ts`
- `src/features/world-countries/geography/queries.ts`
- `src/features/world-countries/geography/effectiveOrder.ts`

Audit directly relevant stable-ID consumers under:

- `src/features/world-countries/geography/`
- `src/features/world-countries/learning/`
- `src/features/world-countries/drill/`
- `src/features/world-countries/recite/`
- `src/features/world-countries/maps/`
- `src/features/world-countries/mnemonics/`

## Verification

- `npx.cmd vitest run src/features/world-countries/data src/features/world-countries/geography src/features/world-countries/maps/countryMapIds.test.ts src/features/world-countries/maps/geographyMapAdapter.test.ts src/features/world-countries/maps/syntheticDots.test.ts src/features/world-countries/learning/recallTargets.test.ts src/features/world-countries/recite/reciteScope.test.ts src/features/world-countries/drill/drillOrder.test.ts` — 18 files, 54 tests passed.
- `npx.cmd vitest run src/features/world-countries` — 85 files, 381 tests passed.
- `npm.cmd run typecheck` — passed (`tsc -b`).
- Audited World Countries consumers for `COUNTRY_CODES`, positional Country identity, and parallel ID/data arrays; no production positional identity dependency remains. Remaining numeric indices are session/order presentation mechanics.
- No persistence migration was added: persisted metadata and learning records continue to use stable `CountryId` values.
