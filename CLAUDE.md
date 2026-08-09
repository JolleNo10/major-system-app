# Mnemonics repository bootstrap

Mnemonics is a Vite, React 19, and TypeScript client-only training app. Its
top-level features are Major System, Pi, Cards, and World Countries.

Follow all applicable `AGENTS.md` instructions before changing code.

Architecture entry point: `docs/architecture/SYSTEM.md`.

Load only the architecture relevant to the task:

- feature task → its document under `docs/architecture/features/`;
- shared-core task → `docs/architecture/CORE.md`;
- persistence, schema, migration, reset, import/export, or stable-ID task →
  `docs/architecture/PERSISTENCE.md`;
- ownership, public boundary, or cross-feature task →
  `docs/architecture/SYSTEM.md` plus affected feature documents;
- invariant change → `docs/architecture/INVARIANTS.md`.

Do not load ADRs unless historical rationale is required. Do not scan sibling
features unless the task crosses feature boundaries. Start discovery from the
source anchors in the selected current-state document and stop when context is
sufficient.

## Global invariants

- `core/` contains feature-independent abstractions and must not import `app/`
  or feature modules.
- `app/` owns high-level composition. Feature-domain rules stay in their
  feature; existing settings/layout integration seams do not transfer
  ownership to `app/`.
- External consumers use feature root barrels where defined. Keep public
  surfaces small.
- Feature persistence must not modify unrelated feature state. The
  `major-system` IndexedDB connection/version has one owner:
  `src/core/scoring/attemptStore.ts`.
- Stable domain IDs are feature-owned; do not infer them from labels, array
  positions, or asset IDs.
- Shared mnemonic infrastructure treats feature-defined target IDs as opaque.
- When an architectural boundary or invariant changes, update the affected
  current-state architecture document in the same change.

`docs/architecture/INVARIANTS.md` is canonical and records clarifications and
current exceptions.
