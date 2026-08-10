# Change Specifications

## Purpose

A Change Spec is the delivery contract for feature and functionality work. It
translates design discussion into the behavior an agent should build without
turning exploratory conversation into repository instructions.

```text
design discussion  ->  Change Spec  ->  implementation and tests
architectural choice  ->  ADR  ->  current-state architecture when implemented
```

Use a Change Spec for a substantial user-visible capability, workflow change,
or cross-cutting behavior that needs more precision than a GitHub issue. Small
fixes can remain fully specified in their issue.

A Change Spec answers **what must be delivered**. An ADR answers **which durable
architectural choice was made and why**. If a change needs both, the Change Spec
links the ADR and treats it as a constraint; it does not repeat the rationale.

## Authority and agent loading

- A `Ready` Change Spec is authoritative for the scope and acceptance of that
  change.
- `docs/architecture/` is authoritative for the system as it exists now.
- Source and tests are the final evidence that an `Implemented` Change Spec was
  delivered.
- Change Specs do not establish ownership, dependency direction, persistence
  identity, public boundaries, or global invariants. Those belong in current-
  state architecture and, when a durable choice needs rationale, an ADR.
- Load only the Change Spec named by the issue, user, or current task. Do not
  scan this directory during normal discovery.

When a Ready spec conflicts with current-state architecture, stop and resolve
the conflict. Create or amend an ADR when the intended change is architectural;
otherwise correct the spec.

## Status

Every Change Spec uses one of these values:

- `Draft` - design is still being compiled and is not ready to implement.
- `Ready` - scope and acceptance are approved for implementation.
- `Implemented` - the change and its required documentation were verified.
- `Withdrawn` - the change will not be delivered.
- `Superseded` - a later Change Spec replaces or materially changes it.

Status tracks delivery, unlike ADR status, which tracks the lifecycle of an
architectural decision.

## Naming and links

Use a repository-local sequence and descriptive slug:

```text
docs/changes/0001-world-countries-drill-map-progress.md
```

Refer to it as `Change Spec 0001`. Keep implemented, withdrawn, and superseded
specs at their original paths so issue, commit, and documentation links remain
valid. A superseded spec links its replacement in the metadata.

GitHub issues remain the work tracker. A substantial issue links its Change
Spec; the Change Spec links the issue when one exists. The issue owns assignment
and work state, while the spec owns the compiled delivery contract.

## Authoring workflow

1. Resolve enough design discussion to state observable behavior and boundaries.
2. Check [../architecture/SYSTEM.md](../architecture/SYSTEM.md) and the smallest
   relevant current-state document.
3. If the change makes a durable architectural choice, create or update the ADR
   first and link it as a constraint.
4. Copy [TEMPLATE.md](TEMPLATE.md), remove unused optional sections, and make
   every acceptance criterion observable.
5. Mark the spec `Ready` only when an agent can implement it without recovering
   missing decisions from chat history.
6. During implementation, update affected current-state architecture in the
   same change as the code. After verification, mark the spec `Implemented` and
   record the evidence.

The spec should be a compiled result, not a transcript, brainstorm, or detailed
sequence of edits. Prefer intent, constraints, boundaries, examples, and
acceptance criteria over line-by-line implementation instructions.

## Legacy records

Some existing files under `docs/adr/` predate this model and mix architecture,
feature behavior, implementation guidance, and test plans. Their classification
and current-state coverage are recorded in
[../adr/LEGACY_CLASSIFICATION.md](../adr/LEGACY_CLASSIFICATION.md). Keep their
original paths for history; do not copy them into this directory or use them as
templates.
