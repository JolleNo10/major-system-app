# Async UI test synchronization

- A single event-loop tick is not evidence that an asynchronous `FileReader` operation and its React state update have rendered. Synchronize test helpers with the expected observable DOM state, keep the asynchronous yielding inside `act(...)`, and use a timeout only as a failure guard.

# Recite map source ownership

- A performance optimization forced multi-continent Random Recite onto the World SVG, which dropped regional microstate geometry and task assistance. Map asset selection must follow the active target Country's Continent; optimize source switching separately from target framing.

# Adaptive target framing

- The adaptive regional scale check used the full Country bounding box even when target-centric selection had chosen a representative task component. Keep legibility checks aligned with `TargetComponentSelection`, while retaining full geometry only as the fallback for ordinary targets without a semantic selection.

# Map test fixtures

- Synthetic SVG map fixtures must wrap each Country path and its label in a separate parent element. `SvgMapController` deliberately ignores a wrapper containing multiple paths, so that markup cannot exercise Country interaction.

# Answer mode test fixtures

- Use the canonical `AnswerMode` values from `src/core/types.ts` (`multiple-choice` or `typing`) in component tests. A Today test initially used the informal value `typed`, which passed at runtime because that prop is currently unused there but failed repository typechecking.

# Verifying claims about the codebase

A review of this repository asserted four things that were false. All four came
from the same error: treating the limit of a query as the limit of reality. Tools
return exactly what is asked for, so a complete-looking result proves nothing
about what was outside the request.

- Never infer a file's length from a ranged read. A read of the first 101 lines of `src/architecture/dependencyRules.ts` was mistaken for the whole file, producing a false report that an exported function was missing; the file is 135 lines and exports it. Get the line count first, or read the file whole.
- Treat the workspace structure listing as truncated. Counting `docs/archive/adr/` entries from that elided tree gave 46 ADRs; there are 31. Count with `Get-ChildItem docs/archive/adr -File -Filter '0*.md'`.
- A `catch` block's location is not evidence that an error is swallowed. Read the handler body and confirm whether its state reaches the DOM. `GeographyMnemonicEditor` and `InlineOrderEditor` both keep the draft and render `role="alert"`, and were wrongly reported as failing silently.
- `grep_search` can miss matches that exist on disk. When a negative result is load-bearing, confirm with `Select-String` against the files themselves.
- Negative and counting claims need exhaustive evidence, not a sample. State the command that establishes such a claim; if there is none, the claim is not established.
- Findings from a subagent are leads, not evidence. Re-verify first-hand before any of it is reported.
- Evidence has a short shelf life here. Other agents and RepoWise edit the worktree mid-session, so re-check load-bearing claims against the current worktree before reporting, and check `git status` and file mtimes before trusting a test failure.
- `Test-Path 'src/features/*/index.ts'` returns `True` through glob expansion and cannot show that a literal path exists. Use it only on concrete paths.
- Prefer encoding a checkable claim as a test over asserting it in prose. `src/architecture/docCitations.test.ts` re-verifies every source path cited by current-state documentation on every run.
- Do not recursively list `.repowise/` during configuration discovery; it contains large generated databases and vector-index trees. Read known small configuration files such as `.repowise/config.yaml`, or list only the directory's immediate children.

# Current mastery is not historical Learning

- A World Countries fallback initially used current post-failure mastery to decide whether a learner had already established a Learning layer, so a later mistake reopened the Journey. The root cause was conflating a current proficiency boundary with the historical fact that the two-date explicit free-recall requirement had been met before.
- Keep cumulative Learning/Journey evidence and current Mastery/Review evidence as separate derived facts. Test both sides of every failure transition, including the recognition-only and same-day exclusions.

# Expanded map layout: five fixes that each missed the cause

Expanding the World Countries map left the map as a short band with the dock
ballooned below it. Five consecutive commits reshaped the flex chain from
`[data-map-surface-presentation="expanded"]` down to the `<svg>` without fixing
it, because each assumed the map was sized wrongly. The map was sized correctly
and starved by a sibling: `[data-map-surface-dock-row] > [data-map-surface-dock]`
(specificity 0,3,0) beat `[data-map-surface-dock]` (0,2,0), so the dock carried
`flex: 1 1 auto` and split the free space with the map.

- `display: contents` removes an element's box but not its place in the DOM tree. Selectors still match through it, so a rule written for a wrapper's layout keeps applying after that wrapper stops generating a box. Two rules that "obviously" cannot both apply is the shape of this bug.
- A feature no caller uses still runs. `expandedCompanion` was dead in production, which is exactly why its CSS was never exercised and never noticed as wrong. Deleting the dead branch removed the bug; scoping the selectors around it would have preserved the trap.
- `src/app/index.css` is imported by no test, and jsdom computes no heights. Every one of the five attempts shipped a green suite against a visibly broken screen. For a layout defect, assert the structural contract (what is a child of what) in jsdom and confirm the pixels in a browser; a passing suite is not evidence either way.
- Sizing a descendant through a chain of `flex: 1 1 0%` wrappers encodes an exact DOM depth. `GeographyOverviewMap` nests one level, `DrillSession` and `PracticeSession` two, so the same CSS collapsed the map to zero height on those screens. Absolute positioning alone does not fix it either: a `position: relative` wrapper captures the box as its containing block. Take the wrapper chain out of box generation (`*:has(.world-map-svg) { display: contents }`) so depth cannot matter.
- Before re-adding a mechanism, check whether it was already removed. The slot-measuring camera fit proposed for this bug was `getMapSlotAspect()`, deleted hours earlier in `ba1d314`; it also would not have enlarged the map, because `fitViewBoxToAspect` only expands the viewBox and `preserveAspectRatio="meet"` renders the result at the same scale. Size the box to the camera, not the camera to the box.

# Shared feedback contracts

- A reverse Quiz reveal test initially expected a session-specific sentence,
  but the shared typed-answer overlay renders the canonical answer with its
  generic `Answer revealed` status. The test was corrected to assert the
  stable semantic output instead; reuse shared feedback components by testing
  their established contract rather than inventing workflow-specific copy.

# Windows npm command entry points

- PowerShell blocked the first focused verification command because `npx` resolved to the disabled `npx.ps1` shim. Use the host `npx.cmd` entry point for npm-backed commands when the repository is run under this execution policy.

# PowerShell command separators

- An amend command was rejected before execution because PowerShell does not
  support `&&` as a statement separator in this session. Run sequential Git
  operations as separate tool calls, or use PowerShell-compatible control flow.

# Celebration wiring tests

- A first pass used the unavailable `toHaveAttribute` matcher and one repeated
  patch context placed the combined-ready assertion in a Set-ready test. Use
  the repository's native DOM assertions and anchor repeated edits on the
  enclosing test name or a unique nearby assertion.

# Positional proxies for state predicates

- The Continent completion badge did not re-fire when a learner relearned a
  Subregion of an already-complete Continent. The Relearn path asked "is this
  the last Subregion in the effective Continent order?"
  (`completedRunIsFinalContinentSubregion`) instead of "is this Continent fully
  learned?", even though the curriculum path next to it already used the real
  readiness predicate. A positional proxy is wrong in both directions: no
  celebration for any other Subregion of a complete Continent, and the big
  Continent celebration for the last Subregion of an incomplete one. Derive
  milestone semantics from the state they describe; authored order carries no
  completion meaning.
- Two fix attempts failed because the tests encoded the proxy. `'uses the
  Subregion celebration for a non-final Relearn in a fully learned Continent'`
  asserted the defect as intended behaviour, so every correct fix turned it red
  and every green fix preserved the bug. When a test names a proxy
  (`non-final`, `last`, `first`) rather than the condition it stands for,
  re-express the test before changing the code, and confirm a new regression
  test fails against the unfixed source.
