# Repository instructions

## Required architecture bootstrap

Before normal code modification, read `CLAUDE.md`. It is the canonical Tier-0
source for architecture context routing and the compact global invariant set.
Do not duplicate that content here.

Follow the applicable nested `AGENTS.md` before modifying a feature.

## Runtime and verification

- Detect whether the developer machine has Node.js and npm available. If it
  does, prefer the host toolchain for faster development and verification.
- If Node.js/npm are unavailable, use Docker instead. For normal verification,
  use the Compose-built image so dependencies are cached:

  ```powershell
  docker compose run --rm app sh -c "npx tsc -b && npx vitest run && npx vite build"
  ```

- The anonymous `/app/node_modules` volume keeps Linux container dependencies
  separate from host files. Do not use the repository's host `node_modules`
  from inside the container.
- After `package.json` or `package-lock.json` changes, rebuild once with
  `docker compose build app` before verifying.
- Without a host toolchain, use `docker compose up`; with one, `npm run dev` is
  also supported.

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
