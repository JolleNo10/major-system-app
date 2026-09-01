# Change Spec NNNN - Short delivery title

- **Status:** Draft
- **Date:** YYYY-MM-DD
- **Issue:** Optional GitHub issue link
- **Related ADRs:** Optional; link only decisions that constrain this change
- **Current-state docs:** Link the architecture documents this work relies on

## Goal

State the user or system outcome in one short paragraph.

## User-visible behavior

Describe the completed experience in observable terms. Include a short example
only when it removes ambiguity.

## Scope

- Required capability or workflow change.
- Required data or state behavior.
- Required integration with existing capabilities.

## Interaction and states

Describe meaningful states, transitions, loading/empty/error behavior, and
responsive or accessibility requirements. Remove this section when the change
has no interaction surface.

## Architecture constraints

- Link to current-state rules instead of restating them.
- State change-specific boundaries that an implementation could otherwise miss.
- Link a related ADR for any new durable architectural decision.

## Existing capabilities to reuse

- Name the relevant public seam or source anchor and why it is the right seam.
- Avoid prescribing an internal edit sequence unless sequencing is itself a
  requirement.

## Edge cases

- State behavior at important boundaries and failure conditions.

## Out of scope

- Name plausible adjacent work that is deliberately excluded.

## Acceptance criteria

- [ ] Each item is observable and can be verified by a test or direct check.
- [ ] Behavior, data, error, and regression expectations are covered as needed.
- [ ] No criterion depends on recovering intent from a chat transcript.

## Source anchors

- `path/to/entry.ts`

## Documentation impact

- Identify current-state architecture, product documentation, or agent routing
  that must change with the implementation.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented on YYYY-MM-DD based on sufficient, risk-proportionate evidence.
- Evidence: focused automated tests covering the changed behavior.
- Evidence: relevant broader tests when the change's scope or risk justifies
  them.
- Evidence: typecheck, lint, or build only when materially relevant to the
  change.
- Browser/manual verification: include this only when the user explicitly
  requested it for the current task and it was actually performed. It is not a
  routine requirement for UI changes.
- Do not leave the spec in `Ready` because an optional verification method was
  unavailable or unperformed; record any material residual risk instead.
