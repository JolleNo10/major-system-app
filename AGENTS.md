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

## ADR implementation commits

- When a commit implements an ADR, identify the ADR in the commit message by
  its number (for example, `ADR 0014`). If the ADR has no number, use a clear
  title or slug reference instead. Mention every ADR when a commit implements
  more than one.
