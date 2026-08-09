# Architecture Decision Records

## Purpose

An ADR records **why** an architectural decision was made and the context that
justified it. An accepted ADR may describe decisions that are part of the
current architecture, but ADRs are not the authoritative source for current-state
architecture.

```text
docs/adr/          → architectural decisions, context, and rationale
docs/architecture/ → authoritative resolved current-state architecture
```

Agents doing normal implementation work use `docs/architecture/` as the resolved
current-state representation and should not reconstruct current architecture from
ADR history. Agents creating, reviewing, modifying, or interpreting an ADR use
this file as the ADR convention.

## Status

Every ADR has a `Status` line using one of these standard values:

- `Proposed` — the decision is under consideration and is not authoritative.
- `Accepted` — the decision has been approved and is authoritative.
- `Rejected` — the proposed decision was considered but not adopted.
- `Deprecated` — the decision is no longer recommended for new development but
  may still describe existing or transitional behavior.
- `Superseded` — the decision was previously authoritative but has been replaced
  or materially changed by a later ADR.

ADR status describes the lifecycle and authority of the architectural decision,
not implementation progress.

Specifically:

> `Accepted` means the decision is authoritative. It does not, by itself, mean
> that implementation has been completed.

ADRs do not use `Status` to track implementation progress, and they do not add a
separate implementation-lifecycle field (for example
`Implementation: Not Started / Partial / Complete`). When an accepted decision
has been implemented and verified, a `Confirmation` section records that
verification and its date.

## Confirmation

A `## Confirmation` section records evidence that an accepted decision was
implemented and verified, and when that verification occurred.

```md
## Confirmation

Implemented and verified against the repository on YYYY-MM-DD.
```

Confirmation is positive evidence captured at a point in time, not an
implementation-state field. Absence of a Confirmation section does not by itself
mean `Not Started`, `Partial`, or any other implementation state — the
repository deliberately does not track a separate implementation lifecycle.

Do not change an ADR's `Status` merely because implementation is complete: the
verification is captured by Confirmation, while `Status` continues to describe
the decision's lifecycle and authority.

If an ADR is later superseded, its earlier Confirmation remains valid historical
information about the state at that date.

## Superseding decisions

When a later ADR replaces or materially changes an earlier one:

- set the earlier ADR's `Status` to `Superseded` and link the superseding ADR;
- have the new ADR reference the decision it supersedes.

The superseded ADR is kept for history; its existing Confirmation is left
intact.

## Relationship to current-state architecture

ADRs are not the authoritative source for current-state architecture. When a
decision changes how the system works, update the affected current-state document
under `docs/architecture/` in the same change (see
[../architecture/INVARIANTS.md](../architecture/INVARIANTS.md)). An agent that
needs the current structure reads `docs/architecture/` as the resolved
current-state representation; an agent that needs the reasoning behind a rule
reads the specific ADR.
