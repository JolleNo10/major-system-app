---
name: repowise
description: 'Query the RepoWise index instead of grepping. Use when locating code, answering how/where/why questions about this codebase, tracing callers or blast radius, checking change risk before a commit or PR, finding which tests a diff exercises, assessing code health or refactoring targets, detecting dead code, recovering the rationale or decision behind existing code, or compressing noisy command output from tests, builds, and git log. Trigger words: repowise, codebase intelligence, code health, hotspot, bug magnet, change risk, blast radius, impacted tests, dead code, why is this code like this, distill output.'
argument-hint: 'What you want to know, or the command to distill'
---

# RepoWise

RepoWise keeps a local index of this repo's graph, git history, tests,
decisions and docs. Query it rather than rediscovering the same facts with
`grep` + `read` on every task.

## When to use

- Before editing an unfamiliar file — check its hotspot and fix history.
- Any "where is X", "who calls Y", "why is Z written this way" question.
- Before finishing a change — risk, impacted tests, health of what you touched.
- Whenever a command will spew hundreds of lines.

Skip it for trivial single-file edits where you already know the target.

## Pick the cheapest surface

Three surfaces read the same index. Prefer the highest one that answers the
question.

1. **AGENTS.md block** — already in context. Architecture, key modules,
   bug-magnet list, standing decisions. Check here first; it may already
   answer you.
2. **MCP tools** — structured, no shell. Use for search, file docs, file
   health, symbol info, branch risk, refactoring plans.
3. **CLI** — for what MCP does not expose: `ask`, `why`, `context`,
   `dead-code`, `impacted-tests`, `security`, `decision`, `status`, and
   `distill`.

Do not shell out to `repowise search` when `repowise_searchCodebase` is
loaded, and do not run both for the same question.

## Core moves

```powershell
repowise context <file> [<file2> ...]   # triage: layer, hotspot, fix history
repowise why "<question>"               # decisions, rationale, git archaeology
repowise ask "<question>"               # synthesized answer + citations (LLM)
repowise risk -t <file>                 # what history says about touching it
repowise risk                           # score uncommitted work
repowise impacted-tests                 # only the tests this diff exercises
repowise dead-code                      # unreachable files, unused exports
```

Batch targets into one call rather than looping per file. Add `--format json`
when parsing. Full flags and the rest of the surface:
[references/commands.md](./references/commands.md).

## Distill noisy commands

Wrap anything verbose. Errors come first, the exit code is preserved, and small
outputs pass through untouched.

```powershell
repowise distill npm test
repowise distill npm run build
repowise distill git log --oneline -50
```

A `[repowise#<ref>: N lines omitted]` marker is fully reversible with
`repowise expand <ref>` (add `-q <regex>` to filter). **Never re-run a command
to see omitted output.**

## Trust the results

Responses carry an `_meta` envelope with `index_age_days`, `indexed_commit` and
`stale_warning`.

- `verified: true` bounds are checked against the live tree — do not re-read
  those lines.
- Re-read the source on `bounds: "approximate"`, a `stale_warning`,
  `search_method: "bm25"`, or `confidence: "low"`.
- `index_behind: true` alone is informational.
- A hit whose `sources` are `[fts]` only has no semantic agreement — verify it.
- Health and risk scores are calibrated associations, not predictions. Report
  the number with its basis, never as a probability of failure.

RepoWise decides *which* files to open. Still read a file before editing it.

## Cost

Graph, git, risk, health, tests, dead-code and search make **zero LLM calls**.
Only `ask`, `init`, `generate`, `restyle` and `health --generate-code` hit a
model — of those, only `ask` is routine.

## Guardrails

- Never run `init`, `generate`, `restyle`, `reindex` or `delete` unless asked;
  they are expensive or destructive.
- `update`, `generate` and `reindex` need a model. This repo points at one
  local llama.cpp endpoint that cannot hold the chat and embedding model at
  once, so run them through
  [repowise-local-workflow.ps1](../../../repowise-local-workflow.ps1), not
  directly.
- `serve` and `watch` are long-running — explicit request only, async mode.
- Report findings as workspace-relative file links.
