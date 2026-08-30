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

<!-- REPOWISE_AGENTS:START — Do not edit below this line. Auto-generated by Repowise. -->
## Codebase Intelligence for major-system-app (Repowise)

Indexed by [Repowise](https://repowise.dev). Last indexed: 2026-08-29 (commit 6a0ba0c). Confidence: 99%.
### How to work in this repo

- **Trust the index.** `verified: true` means the bytes were checked against the live tree, so never re-read those lines. Re-read only on `bounds: "approximate"`, `_meta.stale_warning`, `search_method: "bm25"` or `confidence: "low"`; `index_behind: true` alone is informational.
- **Pre-edit, not instead-of-edit.** These tools decide *which* files to read and edit. Reading a file before you edit it is correct and expected.
- **Noisy commands** (tests, builds, `git log`/`diff`, searches, listings): prefer `repowise distill <cmd>`, the same command with its exit code preserved and errors-first output. A `[repowise#<ref>: N lines omitted]` marker is recoverable via `repowise expand <ref>` (add `-q <regex>` to filter); never re-run the command to see omitted output.
- **Recording a decision** you had to reason out: `repowise decision add --title T --decision D` records it without prompting and prints the id (`--format json` to parse it back). It lands `proposed`, for a person to confirm.

### Tools

| Tool | When and why |
|------|--------------|
| `get_answer(question)` | First call for any how/where/why question. Cite `confidence: "high"` or `grounding: "extracted"` directly; `degraded` means judge by `retrieval_quality`. `symbol_bodies` has live bodies. |
| `get_context(targets=[...])` | Triage card for files/modules/symbols: docs, signatures, hotspot, fix history. No source bytes — `include=["skeleton"]` for the whole file verified, `["callers"|"decisions"]` for depth. Batch targets. |
| `get_symbol(id, depth?)` | **Follow-up, not an entry point** — one verified body for an id a prior response named (`path.py::Name`, `path.py:140-180`, `repowise#<hex>`). Never walk a file symbol by symbol; Read it. |
| `search_codebase(query)` | Hybrid search, auto-routed by query shape; force with `mode=symbol|path|concept|hybrid`. A hit whose `sources` are `[fts]` only has no semantic agreement, so verify it. |
| `get_why(query, targets?)` | Why the code is shaped this way: decision records, git archaeology, rationale comments. Call before a refactor or a pattern divergence. |
| `get_risk(targets, changed_files?, include?)` | File history and structural reach. PR mode leads with `directive`; its 0-10 structural heuristic is uncalibrated, not a probability. Read typed test recommendations and coverage state first. |
| `get_change_risk(revspec?, extensions?, exclude_patterns?)` | Deterministic live-diff review signal for a commit or range. Lead with benchmarked percentile/classification; the 0-10 diff-shape score is supporting, not a probability. `get_risk` scores paths. |
| `get_health(targets?, include?)` | Defect / maintainability / performance scores and findings. Self-check the files you touched before finishing. |
| `get_dead_code(tier?, min_confidence?, safe_only?)` | Confidence-tiered unreachable files / unused exports / zombie packages. For cleanup sweeps, not targeted fixes. |
| `get_overview()` | Architecture map. Call once, first, in an unfamiliar repo; skip it after that. |

### Architecture
major-system-app is a spaced-repetition memorization engine: consumes static datasets (countries.ts, subregions.ts) & user drill inputs -> transforms via scoring.ts (item/attempt stores, round scheduler) & mastery.ts (learning progress) -> outputs interactive React drill UIs (DrillSession.tsx, RepetitionDrill.tsx, PaoCardsDrill.tsx) & SVG map surfaces (MapSurface.tsx). **Core Modules**
**Features**
**Health Signals**
**Execution Flows**

### Key modules
- `src` — What the prose above calls things, the identifier to search for, and where it lives
- `src/features/world-countries/data` — What the prose above calls things, the identifier to search for, and where it lives
- `src/core` — What the prose above calls things, the identifier to search for, and where it lives
- `src/features/world-countries/learning` — What the prose above calls things, the identifier to search for, and where it lives
- `src/core/scoring` — Total: 81 public syms / 108 total
- `src/features/major-system` — What the prose above calls things, the identifier to search for, and where it lives
- `src/features/world-countries/drill` — What the prose above calls things, the identifier to search for, and where it lives
- `src/app` — What the prose above calls things, the identifier to search for, and where it lives
- `src/features/pi/shared` — What the prose above calls things, the identifier to search for, and where it lives
- `src/features/world-countries/geography` — What the prose above calls things, the identifier to search for, and where it lives

### Entry points
- `src/app/App.tsx`
- `src/app/main.tsx`

### Files that need care (bug-fix history first, then churn — check `get_risk` before editing)
- `src/features/world-countries/maps/GeographyOverviewMap.test.tsx` — 7 bug fixes, last fix 7 days ago (bug magnet); 26 commits/90d
- `src/features/world-countries/drill/DrillSession.test.tsx` — 6 bug fixes, last fix 5 days ago (bug magnet); 34 commits/90d
- `src/features/world-countries/maps/SvgMapController.test.ts` — 5 bug fixes, last fix 7 days ago (bug magnet); 18 commits/90d
- `src/features/world-countries/drill/WorldCountriesDrill.tsx` — 5 bug fixes, last fix today (bug magnet); 34 commits/90d
- `src/features/world-countries/drill/DrillSetup.tsx` — 5 bug fixes, last fix today (bug magnet); 28 commits/90d

### Code health
Three co-equal signals: defect risk 8.87/10 avg, hotspot health 8.07/10 (stable), worst `src/features/world-countries/maps/SvgMapController.ts` at 2.35/10 · maintainability 9.61/10 · performance risk 10 open static I/O-in-loop / N+1 findings. Detail: `get_health()`.

Critical files:
- `src/features/pi/recite/PiReciteTab.tsx` — churn risk — impact −2.4
- `src/features/world-countries/learning/subregionLearningStore.ts` — churn risk — impact −1.7
- `src/features/world-countries/maps/GeographyOverviewMap.test.tsx` — prior defect — impact −1.7
- `src/features/world-countries/data/countries.ts` — change entropy — impact −1.6
- `src/features/world-countries/learning/CountryLearningMap.tsx` — change entropy — impact −1.5

### Standing decisions (ask `get_why` before diverging)
- ADR NNNN - Short architectural decision title
- Contextual World Countries geography authoring
- Derive World Countries learning sets from entity classification

### Commands
- Build: `npm run build`
- Test: `npm run test`
- Lint: `npm run lint`
- Dev: `npm run dev`
- Typecheck: `npm run typecheck`

<!-- REPOWISE_AGENTS:END -->
