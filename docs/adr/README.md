# Architecture Decision Records

## Purpose

An ADR records **which durable architectural decision was made, why it was
chosen, and what it constrains**. Use an ADR for ownership, dependency
direction, source of truth, stable identity, persistence contracts, public
boundaries, or important invariants where alternatives and rationale matter.

Feature behavior, interaction details, edge cases, delivery scope, and
acceptance criteria belong in a
[Change Spec](../changes/README.md). Small work may remain fully specified in a
GitHub issue. When a change needs both documents, the Change Spec links the ADR
as an architectural constraint.

An ADR is not a transcript, feature brief, implementation plan, test plan, or
place to collect every detail discussed before a decision. Use
[TEMPLATE.md](TEMPLATE.md) for new ADRs.

```text
docs/adr/          -> architectural decisions, context, and rationale
docs/changes/      -> feature/functionality delivery contracts
docs/architecture/ -> authoritative resolved current-state architecture
```

Agents doing normal implementation work use `docs/architecture/` as the
resolved current-state representation and the named Change Spec or issue as
delivery scope. They do not reconstruct current architecture or current feature
requirements from ADR history. Agents creating, reviewing, modifying, or
interpreting an ADR use this file as the ADR convention.

Before opening an old ADR, check
[LEGACY_CLASSIFICATION.md](LEGACY_CLASSIFICATION.md). Some pre-migration files
are archived legacy change records or use a legacy expanded ADR format.

## ADR test

Create an ADR only when all of these are true:

1. a durable architectural choice is being made;
2. at least one credible alternative exists;
3. the choice constrains future implementation beyond the current feature
   delivery;
4. its rationale will remain useful after the current code change is complete.

If the document mainly answers what the user experiences, which states and edge
cases exist, or how delivery is accepted, create a Change Spec instead.

## Status

Every ADR has a `Status` using one of these standard values:

- `Proposed` - the decision is under consideration and is not authoritative.
- `Accepted` - the architectural decision has been approved.
- `Rejected` - the proposed decision was considered but not adopted.
- `Deprecated` - the decision is no longer recommended for new development but
  may still describe existing or transitional behavior.
- `Superseded` - the decision was previously authoritative but has been replaced
  or materially changed by a later ADR.

ADR status describes the lifecycle of the architectural decision, not feature
delivery or implementation progress.

Specifically:

> `Accepted` means the decision is authoritative. It does not, by itself, mean
> that implementation has been completed.

ADRs do not use `Status` to track implementation progress and do not add an
implementation-lifecycle field. Delivery state belongs in the issue or Change
Spec. When an accepted decision has been implemented and verified, a
`Confirmation` section records that evidence and date.

## Confirmation

A `## Confirmation` section records evidence that an accepted decision was
implemented and verified, and when that verification occurred.

```md
## Confirmation

Implemented and verified against the repository on YYYY-MM-DD.
```

Confirmation is positive evidence captured at a point in time, not an
implementation-state field. Its absence does not imply `Not Started`, `Partial`,
or any other delivery state.

Do not change an ADR's `Status` merely because implementation is complete:
confirmation records verification, while `Status` continues to describe the
decision's lifecycle. If an ADR is later superseded, its earlier confirmation
remains valid historical information about the state at that date.

## Superseding decisions

When a later ADR replaces or materially changes an earlier one:

- set the earlier ADR's `Status` to `Superseded` and link the superseding ADR;
- have the new ADR reference the decision it supersedes;
- keep the earlier record at its original path for history and stable links.

## Relationship to current-state architecture

ADRs are not the authoritative source for current-state architecture. An ADR may
be accepted before it is implemented; do not describe its target state as the
current system merely because the decision is accepted.

When implementation changes how the system works, update the affected document
under `docs/architecture/` in the same change (see
[../architecture/INVARIANTS.md](../architecture/INVARIANTS.md)). If the ADR and
implementation land together, the architecture update lands with both. An agent
that needs the current structure reads `docs/architecture/`; an agent that needs
the reasoning behind a current rule reads the specifically linked ADR.

## Legacy records

The pre-migration ADR set contains both genuine architectural decisions written
in an expanded format and feature-delivery documents written under the ADR
label. Their original paths, status, and confirmation are preserved. The
[classification ledger](LEGACY_CLASSIFICATION.md) defines their present use:

- archived legacy change records are historical only;
- legacy expanded ADRs retain decision rationale, while their implementation,
  UX, validation, and acceptance sections are historical delivery detail.

Do not rename or move those files solely to match the new model; stable links
are more valuable than directory purity. Do not use a legacy record as a
template for new work.
