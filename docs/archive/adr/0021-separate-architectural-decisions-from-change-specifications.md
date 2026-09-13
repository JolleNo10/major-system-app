# ADR 0021 - Separate architectural decisions from Change Specifications

- **Status:** Accepted
- **Date:** 2026-08-10
- **Refines:** [ADR 0012](0012-agent-oriented-current-state-architecture-documentation.md)

## Context

ADR 0012 established compact current-state architecture as the normal context
for coding agents and made ADRs opt-in historical rationale. The repository's
earlier ADRs nevertheless served two different purposes:

1. recording durable architectural choices; and
2. specifying feature behavior, interaction, implementation phases, and
   acceptance tests.

The second purpose produced records up to several thousand lines long. Those
records were useful during design, but their accepted ADR status could make old
delivery detail look like current architecture or current feature requirements.
Moving or rewriting them would break links and erase useful decision history.

The repository also uses GitHub issues for work tracking. A documentation model
must distinguish tracked work, a compiled delivery contract, architectural
rationale, and the resolved current system.

## Decision

The repository uses four distinct layers:

| Layer | Authority |
| --- | --- |
| GitHub issue | Work tracking, assignment, triage, and discussion |
| Change Spec under `docs/changes/` | Approved scope, observable behavior, edge cases, and acceptance for a substantial change |
| ADR under `docs/adr/` | Durable architectural choice, alternatives, rationale, and consequences |
| Current-state docs under `docs/architecture/` | Authoritative resolved architecture of the implemented system |

A new ADR is created only for a durable architectural choice involving
ownership, dependency direction, source of truth, identity, persistence,
public boundaries, or important invariants. Feature and functionality work uses
a Change Spec when the issue alone is not a sufficient delivery contract.

When work needs both, the Change Spec links the ADR as a constraint. Neither
document duplicates the current-state architecture. Implementation updates the
affected current-state document in the same change as the code.

Agents load only the Change Spec named by the task or issue. They load an ADR
only for explicitly required historical rationale or to make/revisit an
architectural decision. Normal discovery does not scan either directory.

Legacy records retain their original paths, statuses, confirmations, and links.
Each mixed-purpose record is classified as either an architectural ADR in a
legacy expanded format or an archived legacy change record. Direct notices and
a central coverage ledger route agents from those files to current-state
architecture. Archived records are historical only.

## Consequences

- Design discussion can remain expansive while repository artifacts contain
  only compiled decisions or delivery requirements.
- ADR status no longer doubles as feature-delivery status.
- Current-state architecture remains the single normal source for placement,
  boundaries, identities, persistence, and invariants.
- GitHub issues remain the live tracker instead of being duplicated by file
  status.
- Historical links and confirmations remain intact.
- Authors must choose between an ADR, a Change Spec, both, or an issue-only
  change. The repository provides an explicit test and template for that choice.

## Alternatives considered

### Continue using ADRs for all substantial changes

Rejected because feature delivery detail obscures durable rationale and makes
accepted historical behavior look architectural.

### Store all specifications only in GitHub issues

Rejected for substantial work because a stable, reviewable repository artifact
is useful when chat and issue discussion must be compiled into precise agent
instructions. Issues remain sufficient for small changes.

### Move legacy feature records into `docs/changes/`

Rejected because existing links and section anchors would break, and a move
would falsely imply that old records conform to the new Change Spec model.
Classification and notices preserve both history and clarity.

### Rewrite legacy records into shorter ADRs and Change Specs

Rejected because rewriting accepted history risks changing rationale and loses
the exact context that historical readers may need. Current-state architecture
already captures the implemented enduring decisions.

## Current-state documentation impact

- `CLAUDE.md` and root/feature `AGENTS.md` route work to the named artifact.
- `docs/architecture/SYSTEM.md` and `INVARIANTS.md` preserve current-state
  authority.
- `docs/adr/README.md` and `docs/changes/README.md` own the two conventions.
- `docs/adr/LEGACY_CLASSIFICATION.md` records migration disposition and verifies
  coverage of enduring legacy decisions.

## Confirmation

Implemented and verified against the repository on 2026-08-10.
