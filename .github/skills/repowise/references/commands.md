# RepoWise command reference

Installed: v0.47.0. Upstream: <https://github.com/repowise-dev/repowise>.
Flags below were verified against this install's `--help`.

## Retrieval

| Need | Command |
| --- | --- |
| Find code by symbol, path, or concept | `repowise search "<q>"` |
| Force a retrieval mode | `repowise search "<q>" --mode auto\|symbol\|path\|concept\|hybrid\|fulltext\|semantic` |
| Synthesized answer with citations (LLM) | `repowise ask "<q>" [--scope <prefix>]` |
| Triage card: layer, hotspot, fix history, freshness | `repowise context <files>` |
| One symbol body with verified line bounds | `repowise symbol <path::Name>` |
| Rationale, decisions, git archaeology | `repowise why "<q>"` |

`search` and `ask` default to the primary repo in workspace mode; `--repo
<alias>` or `--all` widen it.

## Change intelligence

| Need | Command |
| --- | --- |
| Score uncommitted work | `repowise risk` |
| Score a branch or PR range | `repowise risk main..HEAD` |
| Limit which suffixes count | `repowise risk main..HEAD --ext .ts,.tsx` |
| Exclude paths (also from the baseline) | `repowise risk -x <glob>` |
| What history says about touching files | `repowise risk -t <file> [-t <file2>]` |
| PR directive: review candidates, missing co-changes and tests | `repowise risk -t <file> --changed-file <file>` |
| Tests a diff actually exercises | `repowise impacted-tests main..HEAD` |
| Ingest a coverage report | `repowise coverage` |

`risk -t` reads the index, so the repo must be indexed. Without `-t` it scores
the diff itself. `--baseline 0` disables ranking against recent commits.

## Code health

| Need | Command |
| --- | --- |
| KPIs and lowest-scoring files | `repowise health` |
| Deep-dive one file | `repowise health --file <path>` |
| Restrict to a path prefix | `repowise health --module src/features/<name>` |
| Ranked, concrete refactoring plans | `repowise health --refactoring-targets` |
| Last 10 snapshots, declining-health alerts | `repowise health --trend` |
| Markdown output | `repowise health --format md` |
| Generate refactored code for one plan (LLM) | `repowise health --generate-code <rank>` |
| Unreachable files, unused exports | `repowise dead-code` |
| Secret and security scan | `repowise security` |

Health splits into three co-equal lenses — defect risk, maintainability and
performance. They are never averaged into one verdict. Only 26 of the 49
detectors move the defect number.

## Decisions and knowledge

| Need | Command |
| --- | --- |
| List architectural decisions | `repowise decision list` |
| Record one you had to reason out | `repowise decision add --title T --decision D` |
| Recurring command fumbles from local transcripts | `repowise corrections` |

`decision add` lands the record as `proposed` for a human to confirm, and
prints the id (`--format json` to parse it back).

## Output compression

| Need | Command |
| --- | --- |
| Compact, errors-first, reversible run | `repowise distill <cmd>` |
| Recover omitted lines | `repowise expand <ref>` |
| Recover only matching lines | `repowise expand <ref> -q <regex>` |
| Tokens and dollars saved | `repowise saved` |

## Index maintenance

| Need | Command |
| --- | --- |
| Sync state and page stats | `repowise status` |
| Setup, keys, index drift | `repowise doctor` |
| Incremental update for changed files | `repowise update` |
| Architecture as Structurizr DSL | `repowise export --format structurizr` |
| Agent wiring for this repo | `repowise agents --format json` |

## Conventions

- `--format json` is available on most commands; `--full` emits the complete
  tool payload as JSON and implies `--format json`.
- Commands are built around tasks, not entities — pass several targets in one
  call instead of chaining per-file calls.
- Symbol ids take the form `path/to/file.ts::Name`, `path/to/file.ts:140-180`,
  or `repowise#<hex>`. Only use an id a previous response named; never walk a
  file symbol by symbol.
