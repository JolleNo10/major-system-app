# Implementation Prompt — Change Spec 0030

Repository: `JolleNo10/major-system-app`

Start from the current `main` branch and create/use a dedicated implementation branch.

Implement:

`docs/changes/0030-make-country-identity-independent-of-canonical-order.md`

Read before changing code:

- `src/features/world-countries/AGENTS.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/architecture/PERSISTENCE.md`
- Change Spec 0030

Scope strictly to World Countries / Countries and direct dependencies required by the spec.

Key requirement:

**Eliminate positional Country identity coupling at the root.**

Do not merely reorder `COUNTRY_CODES`.

The delivered design must make it structurally impossible for moving a Country record to silently change Country IDs.

Expected direction:

- add stable `id` to every canonical `COUNTRY_RECORDS` entry;
- remove `id: COUNTRY_CODES[index]`;
- remove `COUNTRY_CODES` as an independently maintained source of truth;
- derive any needed ID list from canonical records;
- preserve `COUNTRY_RECORDS` array order as canonical order;
- preserve user-authored order as stable-ID metadata only;
- preserve every existing Country ID;
- audit World Countries for hidden index-based identity assumptions;
- keep identity tests separate from canonical-order tests;
- update current-state architecture docs.

Do not pull temporary `tool/capital-map-authoring` tooling into this main-derived change.

Do not migrate persistence unless concrete investigation proves that a migration is required. If historical corruption is discovered, report it separately.

Run the focused tests identified by the spec, then the scoped World Countries validation and typecheck required by `AGENTS.md`.

When complete:

1. update Change Spec 0030 status to `Implemented`;
2. record verification evidence in its `## Verification` section;
3. ensure `WORLD_COUNTRIES.md` reflects the corrected intrinsic-ID invariant;
4. keep the implementation narrowly scoped to the root identity/order issue.
