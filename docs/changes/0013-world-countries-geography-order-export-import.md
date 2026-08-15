# Change Spec 0013 - World Countries geography order export and import

- **Status:** Implemented
- **Date:** 2026-08-16
- **Issue:** None.
- **Related ADRs:** None required.
- **Current-state docs:** [System](../architecture/SYSTEM.md), [Persistence](../architecture/PERSISTENCE.md), [World Countries](../architecture/features/WORLD_COUNTRIES.md)

## Goal

Allow the user to export and restore the complete saved World Countries
geography ordering from Settings.

The portable order contains all three authored hierarchy levels:

```text
World -> Continent order
Continent -> Subregion order
Subregion -> Country order
```

Use JSON and reuse the existing version-3 World Countries Geography envelope
rather than creating a CSV format or a second incompatible backup schema.

This capability transfers **ordering only**. It does not transfer learning,
Drill, Recite, settings, or mnemonic content.

## User-visible behavior

Add a new section at the bottom of the existing **World Countries** group in
Settings:

```text
Geography order

Back up or restore your custom Continent, Subregion and Country order.

[ Export order ]  [ Import order ]
```

### Export order

Selecting **Export order** downloads one JSON file containing the complete saved
World Countries ordering state.

Use a filename in this form:

```text
world-countries-order-YYYY-MM-DD.json
```

The exported file represents the saved ordering metadata, not only the currently
visible Country set.

An export therefore preserves Country IDs that may currently be hidden by the
user's World Countries entity-group settings.

The export does not contain:

- Geography mnemonic text;
- mnemonic images;
- Learning milestones;
- Drill attempts or preferences;
- Recite progress;
- Maintenance state;
- app settings.

### Import order

Selecting **Import order** opens a JSON file picker.

After a file is selected:

1. parse and validate the complete ordering payload before writing anything;
2. show a confirmation that the current saved geography order will be replaced;
3. on confirmation, replace the existing saved World, Continent, and Subregion
   ordering metadata with the imported ordering state;
4. report success or a recoverable error in Settings;
5. make the imported order visible to World Countries without requiring the
   user to manually refresh the browser.

Confirmation copy should communicate the boundary clearly, for example:

```text
Import geography order?

This replaces your current Continent, Subregion and Country ordering.
Learning progress, Drill progress, Recite results and mnemonics are not changed.

[ Cancel ] [ Import order ]
```

Cancel performs no writes.

### Restore semantics: replace, do not merge

Import is a restore operation.

The imported file becomes the complete saved geography-order state.

Example:

- device A has a custom Europe Subregion order but canonical/default Asia order;
- device B has custom Europe and custom Asia orders;
- export from A and import on B;
- B must end with A's custom Europe order and canonical/default Asia order.

Do not retain unrelated ordering rows from the destination device.

A missing saved row in the source backup means that hierarchy uses its canonical
default and must therefore clear any destination customization for that row.

## Export/import format

Use JSON.

Do not add a CSV representation.

Reuse the existing version-3 World Countries Geography envelope:

```json
{
  "version": 3,
  "feature": "world-countries",
  "mnemonics": [],
  "subregions": [
    {
      "subregionId": "stable-subregion-id",
      "countryOrder": ["stable-country-id", "stable-country-id"],
      "updatedAt": 1786832640000
    }
  ],
  "continents": [
    {
      "continentId": "stable-continent-id",
      "subregionOrder": ["stable-subregion-id", "stable-subregion-id"],
      "updatedAt": 1786832640000
    }
  ],
  "world": {
    "continentOrder": ["stable-continent-id", "stable-continent-id"],
    "updatedAt": 1786832640000
  }
}
```

### Order-only export

For a new order-only export:

```text
version = 3
feature = "world-countries"
mnemonics = []
world = current saved World metadata or null
continents = all currently saved Continent metadata rows
subregions = all currently saved Subregion metadata rows
```

Do not materialize canonical/default rows merely to make the file appear
complete.

The absence of saved metadata is meaningful: it means that hierarchy currently
uses canonical order.

### Compatible full Geography v3 import

**Import order** may also accept an existing valid version-3 World Countries
Geography backup whose `mnemonics` array contains entries.

When used through **Import order**:

- mnemonic entries are ignored;
- mnemonic entries are not written, replaced, or deleted;
- only `world`, `continents`, and `subregions` participate in the restore.

Require `mnemonics` to be an array to identify the existing v3 envelope, but do
not decode mnemonic images/text merely to restore order.

Do not accept mnemonic-only version 1 or partial version 2 as an exact
order-restore file. The new order restore requires version 3 because it is the
first existing envelope that can represent all three ordering levels.

### Stable identity

The portable format uses only existing stable persistence identities:

- `ContinentId`;
- `SubregionId`;
- `CountryId`.

Do not use display labels, array positions, SVG IDs, or currently visible list
indices as import identity.

## Scope

- Add the World Countries **Geography order** Settings section.
- Add order-only JSON download.
- Add JSON file selection for restore.
- Reuse the existing World Countries Geography v3 envelope.
- Export raw saved ordering metadata for World, Continents, and Subregions.
- Preserve currently hidden Country IDs contained in saved Subregion metadata.
- Validate the complete order payload before any restore writes.
- Confirm before replacing existing order.
- Replace all three ordering stores so destination-only custom order does not
  survive import.
- Accept a current full Geography v3 backup as an order source while ignoring
  mnemonic content.
- Refresh/invalidate mounted World Countries presentation after successful
  import so the restored order is observed without browser reload.
- Add focused tests for serialization, validation, exact replacement, Settings
  interaction, and feature refresh behavior.

## Interaction and states

### Export ready

Export is always available.

If there is no custom order anywhere, export a valid v3 envelope representing
that state:

```json
{
  "version": 3,
  "feature": "world-countries",
  "mnemonics": [],
  "subregions": [],
  "continents": [],
  "world": null
}
```

Importing that file resets all geography ordering to canonical/default order.

### File selection

The file picker should prefer `.json`.

Selecting no file or cancelling the native picker changes nothing.

After processing a selected file, clear the input value so the same file can be
selected again if needed.

### Invalid JSON

If JSON parsing fails:

- show a concise error;
- perform no writes;
- leave current order unchanged.

### Unsupported envelope

Reject when:

- `version !== 3`;
- `feature !== "world-countries"`;
- required v3 sections have invalid types.

Show a concise message that the file is not a supported World Countries order
backup.

### Invalid order metadata

Validate every imported World, Continent, and Subregion row using the existing
normalization/validation rules before the confirmation can perform writes.

If any ordering row is invalid:

- reject the entire import;
- perform no writes;
- identify the file as invalid rather than partially importing valid rows.

### Confirmation state

Do not write imported state before explicit confirmation.

The confirmation should summarize that order is replaced and unrelated progress
or mnemonics are unaffected.

### Successful restore

After confirmation and successful writes:

- show a brief success state such as `Geography order imported`;
- imported order is used the next time World Countries geography is rendered or
  resolved;
- a currently mounted World Countries workflow must not continue using stale
  setup ordering after Settings closes.

Do not require `window.location.reload()` as the normal success path.

### Storage failure

Use the existing persistence ownership and guarded storage conventions.

Where the owning store can report a write failure, keep Settings open and show a
recoverable error.

Do not claim transactional rollback across browser localStorage writes where the
existing storage architecture cannot guarantee it.

## Architecture constraints

Follow the current [System](../architecture/SYSTEM.md),
[Persistence](../architecture/PERSISTENCE.md), and
[World Countries](../architecture/features/WORLD_COUNTRIES.md) architecture.

No ADR is required because:

- JSON World Countries Geography backup/import ownership already exists;
- stable World Countries geography persistence IDs already exist;
- `app/` already owns Settings and may consume demonstrated feature capabilities
  through the World Countries public boundary;
- this change adds delivery behavior without changing the ownership or
  dependency direction.

Change-specific constraints:

- `src/app/settings/` owns the Settings presentation only.
- World Countries owns serialization, validation, and restore semantics for its
  geography order.
- App Settings must consume the capability through
  `@/features/world-countries`; do not import World Countries internal
  geography-store modules directly from `app/`.
- Add only the narrow feature-barrel exports demonstrated by this Settings
  consumer.
- `worldMetadataStore.ts`, `continentMetadataStore.ts`, and
  `subregionMetadataStore.ts` remain owners of their localStorage keys.
- A backup adapter must not write those keys directly around the owning stores.
- Existing metadata normalizers remain authoritative for imported IDs and row
  shape.
- Import must validate every ordering section before any write begins.
- Exact restore requires replacement seams from the owning metadata stores;
  do not use the existing merge-style `importContinentMetadata()` or
  `importSubregionMetadata()` unchanged if doing so retains destination-only
  rows.
- Do not reconstruct order from labels or from the active Country population.
- Do not filter stored Country order through the current entity-group selection
  when exporting.
- Do not modify the existing full Geography mnemonic backup/import behavior
  except for extracting/reusing order-format helpers when useful.
- Do not create a generic core backup framework for this feature-local
  capability.
- Do not create a new storage key for the export/import feature.

## Existing capabilities to reuse

### Existing Geography v3 envelope

`mnemonics/geographyMnemonics.ts`

The current `GeographyExportV3` already defines the compatible JSON family with:

- `version: 3`;
- `feature: "world-countries"`;
- World metadata;
- Continent metadata;
- Subregion metadata;
- mnemonic entries.

Reuse this contract or extract its structural parsing into a feature-owned seam
that both full Geography backup and order-only backup can consume.

Do not introduce an unrelated `version: 1` order schema.

### World order

`geography/worldMetadata.ts`

Reuse:

- `WorldMetadata`;
- `normalizeWorldMetadata()`.

`geography/worldMetadataStore.ts`

Reuse:

- `getWorldMetadata()`;
- the store-owned import/set/reset behavior.

The restore path must be able to represent `world: null` by clearing existing
saved World order.

### Continent/Subregion order

`geography/continentMetadata.ts`

Reuse:

- `ContinentMetadata`;
- `normalizeContinentMetadata()`.

`geography/subregionMetadata.ts`

Reuse:

- `SubregionMetadata`;
- `normalizeSubregionMetadata()`.

The existing array stores need an owner-controlled **replace complete
collection** seam for exact restore if one does not already exist.

Do not implement replacement by reaching around these modules and writing their
localStorage keys elsewhere.

### Public feature boundary

`src/features/world-countries/index.ts`

Expose only the narrow order backup/import capability required by
`SettingsOverlay`.

The app should not learn World Countries storage-key details.

### Settings

`src/app/settings/SettingsOverlay.tsx`

Add the user-facing controls to the existing World Countries Settings group.

Do not move World Countries order data into `major-settings`.

## Edge cases

- Export with no custom order creates a valid v3 file whose `world` is `null`
  and metadata arrays are empty.
- Importing that empty-order file clears all destination custom geography order.
- A saved Country ID hidden by the current Country-set configuration remains in
  the export and remains persisted after import.
- Importing order does not change which Country entity groups are enabled.
- Importing a v3 full Geography backup with mnemonic entries does not add,
  update, or delete any mnemonics.
- Importing order does not change Subregion Learning milestones.
- Importing order does not change Drill attempts or Drill preferences.
- Importing order does not change Recite outcomes.
- Importing order does not change Maintenance evidence.
- Duplicate IDs inside a valid metadata row follow the existing normalizer's
  deduplication semantics.
- Duplicate Continent or Subregion metadata rows in the envelope must resolve
  deterministically or be rejected; do not allow ambiguous destination state.
  Prefer rejecting duplicate owner rows for an order backup because the file is
  intended to represent one complete state.
- A Continent metadata row containing Subregion IDs that are not currently
  active still follows existing metadata validation/projection rules; do not
  silently translate labels.
- Country IDs not currently visible are retained according to existing
  Subregion-order persistence behavior.
- New Countries/Subregions/Continents introduced by a later app version continue
  to be appended by existing effective-order resolution when not represented in
  older saved metadata.
- Importing the same valid file repeatedly is idempotent with respect to
  effective saved order.
- Cancelling the confirmation after a valid file is parsed performs no writes.
- A malformed row anywhere prevents all order writes.
- The underlying active Drill/Recite session snapshot, if one is already
  running beneath Settings, must not be mutated mid-session. The imported order
  applies to subsequent setup/session construction according to existing
  workflow snapshot rules.

## Out of scope

- CSV import/export.
- Exporting Country/capital reference data.
- Exporting the current active Country-set selection.
- Exporting app settings.
- Exporting Learning milestones/readiness.
- Exporting Drill attempts, proficiency, preferences, or results.
- Exporting Recite progress.
- Exporting Maintenance state.
- Exporting or importing mnemonic content through the new order controls.
- Replacing or redesigning the existing full Geography mnemonic backup.
- A whole-application backup format.
- Cloud sync.
- Automatic scheduled backups.
- Drag-and-drop file import.
- Import preview/editing of individual hierarchy rows.
- Per-Continent or per-Subregion export buttons.
- Merge-mode import.
- Conflict resolution based on `updatedAt`.
- New canonical geography membership or ID definitions.
- Migration of existing metadata storage keys.

## Acceptance criteria

- [x] Settings -> World Countries contains a **Geography order** section with Export order and Import order controls.
- [x] Export order downloads one `.json` file named `world-countries-order-YYYY-MM-DD.json`.
- [x] Export uses `version: 3` and `feature: "world-countries"`.
- [x] Order-only export writes `mnemonics: []`.
- [x] Export includes the current raw saved World metadata or `world: null`.
- [x] Export includes every current saved Continent metadata row.
- [x] Export includes every current saved Subregion metadata row.
- [x] Export does not materialize unsaved canonical/default metadata rows.
- [x] Export preserves saved Country IDs that are hidden by the current active Country-set configuration.
- [x] Export contains no Learning, Drill, Recite, Maintenance, app-setting, or mnemonic content.
- [x] Export with no custom order produces a valid v3 empty-order envelope.
- [x] Import order accepts a valid order-only v3 World Countries envelope.
- [x] Import order also accepts a valid full Geography v3 envelope and ignores its mnemonic content.
- [x] Import order rejects version 1, version 2, non-World-Countries, malformed JSON, and invalid v3 ordering payloads.
- [x] Every imported World/Continent/Subregion ordering row is validated before any restore write occurs.
- [x] An invalid row anywhere causes zero order writes.
- [x] A valid file requires explicit replacement confirmation before any write occurs.
- [x] Cancelling confirmation performs zero writes.
- [x] Confirmed import replaces the entire saved World order state.
- [x] Confirmed import replaces the entire saved Continent metadata collection rather than merging destination-only rows.
- [x] Confirmed import replaces the entire saved Subregion metadata collection rather than merging destination-only rows.
- [x] `world: null` clears destination World custom order.
- [x] Missing Continent/Subregion rows in the imported complete state clear corresponding destination-only custom order.
- [x] Importing an empty-order envelope resets all World Countries geography ordering to canonical/default behavior.
- [x] Importing order does not modify Geography mnemonics even when the source v3 envelope contains them.
- [x] Importing order does not modify Country-set settings, Learning milestones, Drill evidence/preferences, Recite outcomes, or Maintenance state.
- [x] App Settings accesses order export/import through the World Countries public feature boundary rather than importing feature-internal stores.
- [x] Metadata storage keys remain owned and written by their existing geography store modules.
- [x] Existing effective-order projection continues to append future/new canonical members that are absent from older saved metadata.
- [x] A successful import is reflected by World Countries after Settings closes without requiring manual browser refresh.
- [x] An already-active Drill/Recite session remains on its start-time order snapshot; imported order affects subsequent setup/session construction.
- [x] Re-importing the same file produces the same effective saved order.
- [x] Existing full Geography mnemonic backup/import behavior remains compatible.
- [x] Focused serialization/validation/replacement tests pass.
- [x] Settings interaction tests cover export, invalid import, confirmation cancel, successful import, and success/error feedback.
- [x] World Countries feature tests and TypeScript typecheck pass.

## Source anchors

- `src/app/settings/SettingsOverlay.tsx`
- `src/features/world-countries/index.ts`
- `src/features/world-countries/mnemonics/geographyMnemonics.ts`
- `src/features/world-countries/geography/worldMetadata.ts`
- `src/features/world-countries/geography/worldMetadataStore.ts`
- `src/features/world-countries/geography/continentMetadata.ts`
- `src/features/world-countries/geography/continentMetadataStore.ts`
- `src/features/world-countries/geography/subregionMetadata.ts`
- `src/features/world-countries/geography/subregionMetadataStore.ts`
- `src/features/world-countries/geography/queries.ts`
- `src/features/world-countries/WorldCountries.tsx`
- `src/features/world-countries/AGENTS.md`

Expected new code may include a feature-owned Geography-order backup adapter and
focused tests. Exact internal file splitting remains implementation-owned.

## Documentation impact

After implementation, update current-state documentation only where the new
behavior changes the resolved system description.

### `docs/architecture/PERSISTENCE.md`

Record that:

- World Countries exposes an order-only Settings export/import using the
  existing version-3 Geography JSON family;
- order restore replaces the complete saved World/Continent/Subregion ordering
  state rather than merging destination metadata;
- order-only import never writes mnemonics, progress, attempts, or settings.

### `docs/architecture/features/WORLD_COUNTRIES.md`

Record the feature-owned order portability seam if needed to describe the
implemented World Countries geography ownership.

### `docs/architecture/SYSTEM.md`

No architecture change is expected.

Update only if implementation changes the documented public feature boundary in
a way that needs current-state enumeration. The existing `app -> feature`
dependency direction remains unchanged.

Do not create an ADR unless implementation discovers a genuinely new durable
architectural decision.

## Verification

Completed with progressive verification:

```text
src/features/world-countries/geography/
src/app/settings/
```

Focused verification:

```text
npx vitest run --no-cache src/features/world-countries src/app/settings
npm run typecheck
```

The focused run passed 69 World Countries/Settings test files with 276 tests.
The complete repository run passed 100 test files with 464 tests using
`npx vitest run --no-cache`. The plain `npm test` command also completed all
tests but returned a Vitest cache-file `EPERM` after the run because the host
`node_modules/.vite/vitest/results.json` path is read-only.

Settings interaction tests cover export, invalid import, confirmation cancel,
successful import, and storage error feedback. TypeScript typecheck passed.
