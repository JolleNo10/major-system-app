# Archive — frozen history

**Nothing in this directory is current.** It records how the system came to be,
never what is true now. Current architecture lives in `docs/architecture/`, and
the working agreement lives in `AGENTS.md`.

Do not load anything here during normal implementation work. Do not use it to
establish how the system behaves, to resolve a disagreement with source, or as
a template for new work. If an archived record and the current architecture
disagree, the current architecture is right and the record is simply old.

This tree is excluded from default search (`.ignore`), from editor search
(`.vscode/settings.json`), and from semantic indexing. Reaching it is
deliberate: `rg --no-ignore <pattern> docs/archive`.

## What is here

- `adr/` — 34 architecture decision records, 2026-07 to 2026-09. Enduring
  rules and the alternatives they rejected were folded into
  `docs/architecture/` before archival; what remains here is the deliberation
  that produced them. `0034` records the decision to retire this corpus.
- `changes/` — 69 Change Specs: per-change delivery contracts with scope and
  acceptance criteria, plus a few HTML visual references.

Files are frozen at their archived content. Their relative links were repaired
during the move so the tree stays browsable; nothing else was rewritten.

## Reading an archived ADR

Two kinds of record sit here under the same name, and the difference matters:

- **Architectural ADRs** state a durable decision, and their rationale was
  worth keeping. Any part still in force is already in `docs/architecture/`.
- **Archived legacy change records** — 0007, 0009, 0013, 0015, 0016, 0018, and
  0020 — mainly specify a feature or workflow. They were named and accepted as
  ADRs at the time, but they are delivery history, not decisions.

Records 0005, 0006, 0014, 0017, and 0019 use a long pre-migration format that
mixes decision, implementation, UX, and test plans. Only the decision part was
ever architecture.

Status fields are historical. The nine Change Specs closed on 2026-09-13 were
closed in bulk at archival and not individually re-verified — source and tests
are the evidence of what shipped, not these files.

## Why this exists

The corpus reached 53,000 lines against roughly 28,000 lines of source, and it
was growing faster than the code. Five separate files each carried an
instruction not to read it, which is good evidence that prose alone does not
keep history out of an agent's context. `adr/0034` has the full reasoning.
