# ADR 0034 - Retire decision records into a frozen archive

- **Status:** Accepted
- **Date:** 2026-09-13
- **Supersedes:** [ADR 0021](0021-separate-architectural-decisions-from-change-specifications.md) for the directory model and the keep-original-paths rule. ADR 0021 remains the origin of the decision-versus-delivery distinction.

## Context

This repository carries 55,657 lines of documentation against roughly 28,000
lines of source: 33 ADRs, 69 Change Specs, and 1,802 lines of current-state
architecture. `TECHNICAL_REVIEW_2026-08-29.md` raised this as TD-16 and
measured 33,899 doc lines; two weeks later the figure had grown 64%.

The routing already says ADRs and Change Specs are not consulted during normal
implementation. That instruction is correct and has been restated in five
separate files — `CLAUDE.md`, `AGENTS.md`, `docs/agents/domain.md`,
`docs/adr/README.md`, and `docs/changes/README.md`. Restating it five times is
the evidence that prose alone does not enforce it. `.vscode/settings.json`
already excluded `docs/adr/**` and `docs/changes/**` from editor search, which
is the same intent expressed as configuration.

Two rules block acting on this. `docs/adr/README.md` says to keep records at
their original path because "stable links are more valuable than directory
purity", and `docs/changes/README.md` repeats it. Both were written when the
records were still a live tier that agents might be routed to.

## Decision

Decision records and Change Specs move to `docs/archive/`, which is frozen
history: never authoritative, never loaded during normal work, and excluded
from default search and semantic indexing.

Enduring rationale does not move with them. Before a record is archived, the
rule it established and the alternative it rejected are folded into the
affected document under `docs/architecture/`, which is the single current
truth. Reasoning that only explains how the system came to be stays behind.

New durable architectural choices are recorded as a rule plus its rejected
alternative in the affected current-state document, in the same change as the
code. The repository stops producing standalone decision records; this is the
last one.

The keep-original-paths rule is repealed. Whole directories move together, so
links between archived records continue to resolve, and `git mv` preserves
history and `--follow`.

## Consequences

- `docs/architecture/` becomes the only tier an implementing agent loads.
- The "do not read history" rule becomes enforceable by structure — an
  `.ignore` entry, an editor exclusion, an index exclusion, and a test
  asserting no current-state document links into the archive — rather than by
  five copies of an instruction.
- Links from outside the repository to `docs/adr/...` break. This is accepted;
  the records are internal, and git preserves the move.
- Rationale that was not harvested is effectively retired. This is intended:
  the harvest is a judgement about what still constrains work.

## Alternatives considered

### Keep the corpus in place and rely on the existing routing rules

Rejected. That is the current state, and it produced 64% growth in two weeks
plus five copies of the instruction not to read it.

### Delete the records and rely on git history

Rejected. History becomes unbrowsable and unlinkable, and commit messages
referencing "ADR 0014" become dead ends. The cost of keeping the files is a
directory that tooling already ignores.

### Rewrite the legacy records into shorter modern ADRs

Rejected, as it was under ADR 0021. Rewriting accepted history risks silently
changing what was decided, and the value of an archived record is that it is
what was actually written at the time.

### Harvest nothing and archive immediately

Rejected. Several records hold the only written statement of a constraint —
why camera frames are not derived from geometry, why assistance is never
scoped to the correct answer. Archiving those unharvested loses them silently.

## Current-state documentation impact

Already applied in the changes leading to this record:

- `docs/architecture/features/WORLD_COUNTRIES.md` — restructured, de-duplicated,
  and given the Recite outcome contract, the learning-frame quality bar, three
  harvested invariants, and a Historical rationale section.
- `docs/architecture/SYSTEM.md`, `CORE.md`, `INVARIANTS.md` — expanded-center
  rationale, the shared-SRS prohibition, and the rule that current architecture
  is never reconstructed from decision history.
- `AGENTS.md` — canonical working agreement; `CLAUDE.md` reduced to a pointer.
- `docs/agents/domain.md` — retired.

Remaining, with this record: move both directories to `docs/archive/`, add
`docs/archive/README.md`, add `.ignore`, repoint `.vscode/settings.json`, and
repair the architecture links.

## Confirmation

Implemented and verified against the repository on 2026-09-13.
