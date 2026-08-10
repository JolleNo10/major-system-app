# Domain Docs

How engineering skills consume this repository's domain and delivery
documentation when exploring the codebase.

## Before exploring, load the relevant current context

- Start at **`docs/architecture/SYSTEM.md`** only when the task needs repository
  routing, ownership, or cross-feature context.
- For a feature task, read that feature's `AGENTS.md` and its document under
  **`docs/architecture/features/`**, then start at the listed source anchors.
- Load **`docs/architecture/CORE.md`** only for shared capability or placement
  decisions and **`docs/architecture/PERSISTENCE.md`** only for persistence.
- Read a file under **`docs/changes/`** only when the task or issue names that
  Change Spec. It is delivery scope, not architecture context.
- Read a specific file under **`docs/adr/`** only when historical rationale is
  needed or a current architecture document points to it.

Do not scan every architecture document, Change Spec, ADR, or sibling feature
by default. Stop loading context once the task can be handled safely.

## File structure

```text
docs/
  architecture/
    SYSTEM.md
    CORE.md
    PERSISTENCE.md
    INVARIANTS.md
    features/
  changes/
    README.md
    TEMPLATE.md
  adr/
    README.md
    TEMPLATE.md
    LEGACY_CLASSIFICATION.md
src/
  features/*/AGENTS.md
```

## Use the glossary's vocabulary

When output names a domain concept, use the terminology in the relevant feature
architecture document and source. Do not drift to synonyms explicitly
discouraged there.

If a needed concept is not documented, first verify its use in the owning
feature. Add it to current-state architecture only when it affects agent
placement or structural correctness.

## Flag document conflicts

If a named Change Spec contradicts current-state architecture, surface it
before implementation. Resolve a new durable architectural choice through the
ADR convention; otherwise correct the spec.

If output contradicts an applicable architectural ADR, surface it explicitly
rather than silently overriding it.

Check `docs/adr/LEGACY_CLASSIFICATION.md` before treating a pre-migration ADR as
applicable. Archived legacy change records are historical only.
