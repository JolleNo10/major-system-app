# Repository instructions

This file is the canonical working agreement for every agent in this
repository, whichever tool loads it. Codex loads it directly; Claude Code
reaches it through `CLAUDE.md`, which does nothing but point here. Keep it
tool-neutral, and keep each rule in exactly one place.

Follow the applicable nested `AGENTS.md` before modifying a feature.

## Architecture context

`docs/architecture/` is the authoritative description of the system as it
exists now. Start at `docs/architecture/SYSTEM.md`: its **Agent loading**
section routes each kind of task to the smallest relevant document, and every
architecture document repeats that routing for its own area. The routing table
is deliberately not copied here — one copy cannot drift.

Load only what the task needs and stop once the change can be made safely. Do
not scan sibling features unless the task crosses a feature boundary.

Record mistakes in `MISTAKES.md`: what happened, the root cause, and the
prevention.

### Global invariants

- `src/core/` contains feature-independent abstractions and must not import
  `src/app/` or `src/features/`.
- `src/app/` owns high-level composition. Feature-domain rules stay in their
  feature; existing settings/layout integration seams do not transfer
  ownership to `app/`.
- External consumers use feature root barrels where defined. Keep public
  surfaces small.
- Feature persistence must not modify unrelated feature state. The
  `major-system` IndexedDB connection and version have one owner:
  `src/core/scoring/attemptStore.ts`.
- Stable domain IDs are feature-owned; never infer them from labels, array
  positions, or asset IDs.
- Shared mnemonic infrastructure treats feature-defined target IDs as opaque.
- When an architectural boundary or invariant changes, update the affected
  current-state architecture document in the same change.

`docs/architecture/INVARIANTS.md` is canonical and records the clarifications
and current exceptions.

## Runtime and verification

Use risk-proportionate progressive verification:

- Start with focused automated tests that cover the changed behavior.
- Widen to capability, feature, or repository checks only when the change
  spans that scope, changes a shared/configuration/build contract, or focused
  evidence is insufficient.
- Include code inspection in the completion check and stop widening once there
  is reasonable evidence that the requested behavior works and important
  regressions are covered.
- Residual verification risk is acceptable for localized changes. Report it
  when the available evidence cannot fully establish behavior rather than
  escalating automatically to broader or environmental verification.

Prefer the host Node.js/npm toolchain when available. If Docker is required,
mirror the same progressive scope inside the Compose-built image; do not turn
every Docker check into a full test and production-build run.

### Quick fixes

When the user explicitly asks for a **quick fix**, **small fix**, or similarly
minimal handling, keep the implementation and verification process proportional
if the change is confirmed to be narrow and low risk.

A quick fix is appropriate for a localized change with no meaningful impact on
architecture, persistence, shared contracts, public boundaries, or
cross-feature behavior.

For a confirmed quick fix:

- make the smallest safe change and avoid unrelated refactoring, cleanup, or
  abstraction work;
- investigate only enough to establish the cause, affected code, and exact edit
  safely;
- use code inspection and the narrowest useful existing test when appropriate;
- do not add tests solely for a trivial change unless they protect meaningful
  behavior or a demonstrated regression;
- do not automatically widen verification to feature suites, full repository
  tests, typecheck, lint, production build, browser/manual verification, or
  additional review agents;
- do not turn a few-line low-risk fix into a broader validation or refactoring
  exercise without a concrete reason.

A quick-fix request reduces process breadth, not correctness. If investigation
shows that the change has broader risk or crosses an architectural or shared
contract boundary, use the normal risk-proportionate verification policy
instead and explain why the quick-fix path was not sufficient.

### Focused verification

For an individual edit or small coherent behavior, usually do not verify after
every individual edit. When useful, run the nearest relevant test file(s):

```text
npx vitest run path/to/test.test.ts
npx vitest run path/to/test.test.tsx
```

Several related edits may be completed before verification. Do not
automatically run a complete feature suite, global TypeScript check, or Vite
production build after each edit.

After several related edits, use the nearest changed capability or explicit
test path, or use `npm run test:changed` when its scope is appropriate:

```text
npm run test:changed
npx vitest run src/features/<feature>/<capability>
```

If the worktree contains unrelated changes, `test:changed` may include them;
use explicit feature, capability, or test paths to avoid widening scope by
accident. Do not automatically run a complete feature suite, global typecheck,
lint, or Vite production build for a localized change.

### Broader verification when justified

Use a feature suite and/or typecheck when the change spans a feature-wide
contract, has a wider blast radius, or focused evidence is insufficient:

```text
npx vitest run src/features/<feature>
npm run typecheck
```

Localized UI, styling, keyboard, or interaction changes normally need focused
tests and code inspection only.

### Full repository / production verification when justified

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
The CI workflow may mirror this broad baseline for integration, but CI breadth
does not make the same full sequence expected local verification for every
implementation task; the build supplies the TypeScript check.

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
toolchain, use the equivalent scoped Docker command; do not start a development
server as a substitute for automated verification.

## Browser / Interactive Verification

Use code inspection and risk-proportionate automated tests as the default
completion evidence. Do not perform browser, interactive, or manual UI
verification during implementation tasks unless the user explicitly requests
it for the current task.

Agents must not:

- start a development server solely for verification;
- discover, initialize, recover, or retry browser or interactive tooling for
  verification;
- inspect or troubleshoot ports, processes, permissions, sessions,
  connectivity, or environment state to enable browser verification;
- perform environment recovery merely to make browser/manual verification
  possible;
- leave background development servers or verification processes running;
- keep an implementation incomplete solely because
  browser/manual verification was unavailable or unperformed, unless the user
  explicitly required that check for the current task;
- make browser/manual verification a completion gate unless the user
  explicitly requested it for the current task.

When browser/manual verification was not explicitly requested, report any
residual verification risk and complete the task once the available evidence is
sufficient. If the user explicitly requests that verification, perform only
the bounded requested check, record only evidence that was actually obtained,
and stop every process started for it before completing the task.


## Repository workflow

### File editing

On Windows hosts, never use `apply_patch` for repository file edits.

Do not:

- invoke `apply_patch`;
- retry `apply_patch` after a failure;
- construct unified patch text for `apply_patch`;
- create temporary patch files such as `.codex-patch.tmp` as a workaround;
- spend time troubleshooting or recovering `apply_patch`.

Use deterministic direct file editing instead:

- use a small Python script for multiline or structured edits;
- use PowerShell/.NET direct file operations for simple, exact replacements;
- use an existing formatter, generator, or repository tool when that tool owns
  the file being changed.

Prefer targeted replacements over rewriting an entire file. Preserve the
existing encoding and line endings and do not modify unrelated content.

After editing, inspect the resulting diff before verification:

```text
git diff -- <changed-files>
```

If a direct replacement cannot be performed safely, read the complete current
file and deliberately rewrite it with the intended result rather than falling
back to `apply_patch`.

### Implementation delivery

For a completed implementation or change task, verification is followed by
the repository handoff by default:

- commit all in-scope changes on the current branch;
- push the current branch to its configured upstream;
- run state-changing Git commands (`git add`, `git commit`, and `git push`)
  directly in the host/escalated context; do not first attempt them in the
  sandbox, where the repository's Git metadata is read-only;
- report the commit SHA, push result, and any residual verification failure.

Do not stop at an uncommitted worktree or local-only commit, and do not ask
whether to commit or push unless the user explicitly opts out or the required
Git operation encounters an actual authentication or authorization failure.

### RepoWise hooks (Codex-specific)

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
- `docs/archive/` stays out of implementation context. It is frozen history,
  excluded from default search, and never a current-state authority.
- For map work, inspect adapters/controllers first; inspect bundled SVG source
  only when the actual asset is relevant.

Implementation does not automatically require architecture documentation:

- implementation conforms to existing architecture -> code only;
- documented current-state architecture becomes incorrect -> update the
  current architecture documentation;
- a durable architectural choice is made -> record the rule and its rejected
  alternative in the affected architecture document, in the same change.

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

## Recording decisions

GitHub issues track work; see `docs/agents/issue-tracker.md`. Architecture
lives in `docs/architecture/` and nowhere else.

When a change makes a durable architectural choice, write the rule into the
affected current-state architecture document **in the same change**, together
with the alternative that was rejected and why. A decision is architectural
when it settles ownership, dependency direction, source of truth, stable
identity, a persistence contract, a public boundary, or an invariant — and
when it constrains work beyond the change delivering it.

Prefer a rule plus its rejected alternative in one or two sentences over a
separate record. A future agent needs to know what not to do and why the
obvious-looking simplification was already tried; it does not need the
deliberation that produced the answer.

If a document mainly answers what the learner experiences, which states and
edge cases exist, or how delivery is accepted, it is scope, not architecture.
Keep it in the issue.

Do not reconstruct current architecture from historical records. `docs/archive/`
is frozen: it explains how the system came to be, never what is true now.

<!-- REPOWISE_AGENTS:START — Do not edit below this line. Auto-generated by Repowise. -->
## Codebase Intelligence for major-system-app (Repowise)

Indexed by [Repowise](https://repowise.dev). Last indexed: 2026-09-13 (commit 845fb7a). Confidence: 99%.
### How to work in this repo

- **Trust the index.** `verified: true` and `_meta.complete` mean the bytes were checked against the live tree, so never re-read them. Re-read only what `bounds: "approximate"` or `_meta.stale_warning` names. `confidence` rates the prose, not the evidence: on `low` read the `fallback_targets` or `best_guesses` the reply names, and run `repowise update` and ask again if `_meta.hint` says the index is behind HEAD. `index_behind: true` alone is informational.
- **A zero carries its basis.** An empty `callers`/`callees`/`used_by` comes with a `*_basis` saying how much of that language's calls the graph resolved, so read it before concluding nothing calls a symbol. `_meta.scope_hint` names the areas the answer did not touch.
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
major-system-app consumes shipped mnemonic datasets and learner answers, routes them through feature drills, scoring, scheduling, mastery, and offline persistence, and produces interactive recall practice, progress statistics, and map-based study surfaces. Offline learners practise Major System drills, Pi memorisation, card-deck associations, and World Countries through multiple-choice/typing modes, editable word lists, and personal associations.

### Key modules
- `src` — What the prose above calls things, the identifier to search for, and where it lives
- `src/core` — src/core/learning/index.ts joins src/core/learning/types.ts with src/core/scoring
- `src/features/world-countries/learning` — What the prose above calls things, the identifier to search for, and where it lives
- `src/core/scoring` — Review-state service consumes AttemptRecord history + item progress, produces quiz scores, recall colors, number weakness, usage/due…
- `src/features/major-system` — What the prose above calls things, the identifier to search for, and where it lives
- `src/features/world-countries/drill` — What the prose above calls things, the identifier to search for, and where it lives
- `src/app` — Feature consumers include src/features/pi/*, src/features/world-countries/*, and card/major-system drills requiring shared rails, overlays…
- `src/features/pi/shared` — What the prose above calls things, the identifier to search for, and where it lives
- `src/features/world-countries/geography` — src/features/world-countries/geography provides World Overview’s geography application boundary: consumes canonical country…
- `src/core/ui` — src/core/ui supplies reusable controls; src/features/* owns drill, memo, practice, and workflow orchestration

### Entry points
- `src/app/App.tsx`
- `src/app/main.tsx`

### Files that need care (bug-fix history first, then churn — check `get_risk` before editing)
- `src/features/world-countries/maps/SvgMapController.test.ts` — 18 bug fixes, last fix today (bug magnet); 41 commits/90d
- `src/features/world-countries/maps/SvgMapController.ts` — 17 bug fixes, last fix today (bug magnet); 43 commits/90d
- `src/features/world-countries/maps/GeographyOverviewMap.test.tsx` — 14 bug fixes, last fix 2 days ago (bug magnet); 43 commits/90d
- `src/features/world-countries/today/WorldCountriesToday.tsx` — 8 bug fixes, last fix 2 days ago (bug magnet); 37 commits/90d
- `src/features/world-countries/maps/GeographyOverviewMap.tsx` — 10 bug fixes, last fix today (bug magnet); 35 commits/90d

### Code health
Three co-equal signals: code health 6.94/10 avg (Fair), hotspot health 5.42/10 (stable), worst `src/features/world-countries/maps/svgTaskAssistance.ts` at 2.2/10 · maintainability 8.59/10 · performance risk 10 open static I/O-in-loop / N+1 findings. Detail: `get_health()`.

Critical files:
- `src/features/world-countries/ui/MapSurface.test.tsx` — prior defect — impact −2.0
- `src/features/world-countries/drill/DrillSetupRails.tsx` — untested hotspot — impact −2.0
- `src/features/world-countries/today/TodayRails.tsx` — untested hotspot — impact −2.0
- `src/features/world-countries/index.ts` — untested hotspot — impact −2.0
- `src/features/pi/recite/PiReciteTab.tsx` — churn risk — impact −1.8

### Standing decisions (ask `get_why` before diverging)
- Derive World Countries learning sets from entity classification
- Derive unambiguous tiny-Country anchors from map geometry
- Separate answer-selection interaction points from representative learning anchors

### Commands
- Build: `npm run build`
- Test: `npm run test`
- Lint: `npm run lint`
- Dev: `npm run dev`
- Typecheck: `npm run typecheck`

<!-- REPOWISE_AGENTS:END -->