# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, load the relevant current context

- Start at **`docs/architecture/SYSTEM.md`** only when the task needs repository
  routing, ownership, or cross-feature context.
- For a feature task, read that feature's `AGENTS.md` and its document under
  **`docs/architecture/features/`**, then start at the listed source anchors.
- Load **`docs/architecture/CORE.md`** only for shared capability or placement
  decisions and **`docs/architecture/PERSISTENCE.md`** only for persistence.
- Read a specific file under **`docs/adr/`** only when historical rationale is
  needed or a current architecture document points to it.

Do not scan every architecture document, ADR, or sibling feature by default.
Stop loading context once the task can be handled safely.

## File structure

Current-state architecture:

```
docs/
  architecture/
    SYSTEM.md
    CORE.md
    PERSISTENCE.md
    INVARIANTS.md
    features/
  adr/
src/
  features/*/AGENTS.md
```

## Use the glossary's vocabulary

When your output names a domain concept, use the terminology in the relevant
feature architecture document and source. Do not drift to synonyms explicitly
discouraged there.

If a needed concept is not documented, first verify its use in the owning
feature. Add it to current-state architecture only when it affects agent
placement or structural correctness.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
