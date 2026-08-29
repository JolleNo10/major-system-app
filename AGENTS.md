# Repository instructions

## Required architecture bootstrap

Before normal code modification, read `CLAUDE.md`. It is the canonical Tier-0
source for architecture context routing and the compact global invariant set.
Do not duplicate that content here.

Follow the applicable nested `AGENTS.md` before modifying a feature.

## Runtime and verification

Use progressive verification:

- Test the smallest affected slice while iterating.
- Widen verification as the change stabilizes.
- Run full repository verification only at integration boundaries.

Prefer the host Node.js/npm toolchain when available. If Docker is required,
mirror the same progressive scope inside the Compose-built image; do not turn
every Docker check into a full test and production-build run.

### Level A - inner loop

For an individual edit or small coherent behavior, usually do not verify after
every individual edit. When useful, run the nearest relevant test file(s):

```text
npx vitest run path/to/test.test.ts
npx vitest run path/to/test.test.tsx
```

Several related edits may be completed before verification. Do not
automatically run a complete feature suite, global TypeScript check, or Vite
production build after each edit.

### Level B - changed / capability

After several related edits, prefer either:

```text
npm run test:changed
npx vitest run src/features/<feature>/<capability>
```

If the worktree contains unrelated changes, `test:changed` may include them;
use explicit feature, capability, or test paths to avoid widening scope by
accident. Scoped watch mode is also acceptable during active implementation:

```text
npm run test:watch -- <path>
```

### Level C - feature completion

For substantial feature-local work, once stable or near completion, run the
feature suite and typecheck once:

```text
npx vitest run src/features/<feature>
npm run typecheck
```

For trivial cosmetic or presentational changes, narrower verification is
appropriate when feature-wide tests and typecheck add little value.

### Level D - full repository / production

Run the full suite and production build only when justified, such as:

- shared `src/core` behavior;
- shared `src/app` behavior or composition;
- cross-feature contracts;
- dependency, package, TypeScript, Vite, Vitest, or build configuration changes;
- PWA/build behavior;
- broad refactors; or
- release/final integration verification, or a narrower failure that warrants
  wider investigation.

```text
npm test
npm run build
```

For repository integration/configuration changes, include the lint baseline in
the final verification: `npm run lint`, then `npm test` and `npm run build`.
The CI workflow mirrors this sequence; the build supplies the TypeScript check.

A normal feature-local implementation must not automatically run the entire
repository suite or production build. `npm run build` already runs TypeScript,
so do not run a separate typecheck immediately before a full production build.

### Reuse and Docker fallback

A successful wider verification remains useful until subsequent edits affect
that verification scope. Do not reflexively repeat a feature suite, full suite,
or build after every small follow-up edit. Before final handoff, widen only as
justified by the accumulated changes.

The anonymous `/app/node_modules` volume keeps Linux container dependencies
separate from host files; never use the repository's host `node_modules` inside
the container. Use the equivalent scoped command with `docker compose run
--rm app sh -c "..."`. After `package.json` or `package-lock.json` changes,
rebuild once with `docker compose build app` before verifying. Without a host
toolchain, `docker compose up` remains supported; with one, `npm run dev` is
also supported.

## Repository workflow

### RepoWise hooks

`.codex/hooks.json` is the active lean RepoWise configuration. The previous
full-refresh configuration is saved in `.codex/hooks.repowise-full.json`.
Restore full behavior by replacing `hooks.json` with the contents of
`hooks.repowise-full.json`. The RepoWise MCP configuration remains enabled.

### Unrelated failures

Do not investigate or fix unrelated failures, warnings, formatting issues, or
other feature problems merely because verification finds them. If a failure is
demonstrably unrelated, report it briefly, leave it unchanged, and continue
the requested scope when possible. Do not call something "pre-existing"
unless that can actually be established. A feature-local task must not become
sibling-feature discovery or refactoring just because broader verification
found an unrelated issue.

### Test creation

Tests should protect meaningful behavior rather than freeze presentation.
Strong candidates include domain calculations, mastery/progress, scheduling,
ordering, persistence, geography membership/invariants, map ID mappings and
adapters, state transitions, meaningful keyboard behavior, user workflows, and
previously observed regressions.

Do not automatically add or expand tests solely for spacing, panel width, icon
placement, rail changes, CSS classes, visual hierarchy, wording, or other
presentation-only adjustments. Keep existing meaningful-behavior tests valid,
and avoid brittle assertions of exact presentational structure.

### Discovery and documentation

- Do not read SVG contents unless the task requires SVG/map asset inspection or
  modification.
- Do not load large generated, static, or data files merely for discovery.
- Prefer controllers, adapters, stores, components, and relevant tests as
  discovery anchors.
- Do not scan sibling features for examples unless the task crosses feature
  boundaries.
- Stop discovery once enough context exists to implement the requested change.
- Keep historical ADRs and change records outside normal implementation
  context unless specifically required.
- For map work, inspect adapters/controllers first; inspect bundled SVG source
  only when the actual asset is relevant.

Implementation does not automatically require architecture documentation:

- implementation conforms to existing architecture -> code only;
- documented current-state architecture becomes incorrect -> update the
  current architecture documentation;
- new architectural decision -> ADR; and
- new or revised implementation contract requiring a Change Spec -> Change
  Spec.

Do not update architecture docs merely because implementation details moved,
were renamed, or presentation changed when the documented architecture
remains true.

## Git and GitHub authentication

- For normal `git fetch`, `git pull`, and `git push` operations, use Git
  directly. Do not use `gh auth status` as an authentication prerequisite:
  Git uses the host's configured credential helper, while GitHub CLI
  authentication is a separate credential path.
- If a GitHub network operation is blocked in the sandbox, retry the same Git
  command in the host/escalated context. Do not ask the user to reauthenticate
  unless the host Git command returns an actual authentication or authorization
  error.
- Use `gh auth status` only when an operation itself requires GitHub CLI, such
  as creating a pull request or querying issues.

## Decision and delivery documents

- When the task names a Change Spec, read that one spec as the delivery
  contract. Do not scan `docs/changes/` for normal implementation discovery.
- For a new or revised feature/functionality specification, follow
  `docs/changes/README.md`. For an architectural decision, follow
  `docs/adr/README.md`.
- When a commit implements a Change Spec or ADR, identify each applicable
  document by number in the commit message (for example, `Change Spec 0003` or
  `ADR 0014`).
