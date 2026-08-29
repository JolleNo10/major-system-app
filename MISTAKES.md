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
- Treat the workspace structure listing as truncated. Counting `docs/adr/` entries from that elided tree gave 46 ADRs; there are 31. Count with `Get-ChildItem docs/adr -File -Filter '0*.md'`.
- A `catch` block's location is not evidence that an error is swallowed. Read the handler body and confirm whether its state reaches the DOM. `GeographyMnemonicEditor` and `InlineOrderEditor` both keep the draft and render `role="alert"`, and were wrongly reported as failing silently.
- `grep_search` can miss matches that exist on disk. When a negative result is load-bearing, confirm with `Select-String` against the files themselves.
- Negative and counting claims need exhaustive evidence, not a sample. State the command that establishes such a claim; if there is none, the claim is not established.
- Findings from a subagent are leads, not evidence. Re-verify first-hand before any of it is reported.
- Evidence has a short shelf life here. Other agents and RepoWise edit the worktree mid-session, so re-check load-bearing claims against the current worktree before reporting, and check `git status` and file mtimes before trusting a test failure.
- `Test-Path 'src/features/*/index.ts'` returns `True` through glob expansion and cannot show that a literal path exists. Use it only on concrete paths.
- Prefer encoding a checkable claim as a test over asserting it in prose. `src/architecture/docCitations.test.ts` re-verifies every source path cited by current-state documentation on every run.
