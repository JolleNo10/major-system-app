# Issue tracker: GitHub

GitHub issues own work tracking, assignment, triage, and discussion. A
substantial feature or functionality change may link a repository Change Spec
under `docs/changes/`; that spec is the compiled delivery contract, while the
issue remains the live work item. Small fixes can remain fully specified in the
issue. Follow `docs/changes/README.md` when a Change Spec is needed.

Use the `gh` CLI for issue operations.

## How bugs and small fixes are registered

**During any conversation** (with Claude Code or another LLM): when the user says "file an issue for this", "register this bug", or similar, immediately create a GitHub issue. Use `bug` + `needs-triage` labels for bugs; use `quick-fix` + `needs-triage` for clearly small/contained code fixes. Do **not** ask for more info first — capture what you have and let the label drive triage.

```bash
# Bug (something broken)
gh issue create \
  --title "<short description>" \
  --body "<what you observed, steps, expected vs actual>" \
  --label "bug,needs-triage"

# Quick fix (small, well-scoped code change)
gh issue create \
  --title "<short description>" \
  --body "<what and why>" \
  --label "quick-fix,needs-triage"
```

The user also has a shell alias `bug "title" ["body"]` for quick capture without opening a chat:
```bash
bug "WordListGrid crashes when CSV has BOM"
```

**Labels in use:**
| Label | Meaning |
|-------|---------|
| `bug` | Something is broken |
| `quick-fix` | Small, well-scoped fix |
| `needs-triage` | Default on creation — needs evaluation |
| `ready-for-agent` | Fully specified, an AFK agent can implement it |
| `ready-for-human` | Requires human implementation |
| `wontfix` | Will not be actioned |

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Link a Change Spec**: add its repository path to the issue body and add the
  issue URL to the Change Spec metadata. A `ready-for-agent` issue with a Change
  Spec must link a spec whose status is `Ready`.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
