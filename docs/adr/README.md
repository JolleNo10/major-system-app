# Architecture Decision Records

## Purpose

An ADR records **why** an architectural decision was made and the context that
justified it. ADRs are historical rationale, not a description of how the system
works today.

```text
docs/adr/          → why architectural decisions were made
docs/architecture/ → how the architecture is considered to work now
```

Agents doing normal implementation work use `docs/architecture/` and should not
replay ADR history. Agents creating, reviewing, modifying, or interpreting an
ADR use this file as the ADR convention.

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

Do not add a custom implementation-progress field (for example
`Implementation: Not Started / Partial / Complete`). Implementation state is
recorded in `## Confirmation`, not in `Status`.

## Confirmation

A `## Confirmation` section records whether an accepted decision has been
verified against the repository, and when.

```md
## Confirmation

Implemented and verified against the repository on YYYY-MM-DD.
```

Confirmation records a historical fact: the decision was implemented and
verified at that point in time. Do not change an ADR's `Status` merely because
implementation is complete — completion is captured by Confirmation, while
`Status` continues to describe the decision's authority.

If an ADR is later superseded, its earlier Confirmation remains valid historical
information about the state at that date.

## Superseding decisions

When a later ADR replaces or materially changes an earlier one:

- set the earlier ADR's `Status` to `Superseded` and link the superseding ADR;
- have the new ADR reference the decision it supersedes.

The superseded ADR is kept for history; its existing Confirmation is left
intact.

## Relationship to current-state architecture

ADRs do not describe current architecture. When a decision changes how the
system works, update the affected current-state document under
`docs/architecture/` in the same change (see
[../architecture/INVARIANTS.md](../architecture/INVARIANTS.md)). An agent that
needs the current structure reads `docs/architecture/`; an agent that needs the
reasoning behind a rule reads the specific ADR.
