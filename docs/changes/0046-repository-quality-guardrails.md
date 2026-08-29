# Change Spec 0046 - Repository quality guardrails

- **Status:** Implemented
- **Date:** 2026-08-29
- **Issue:** None.
- **Related ADRs:** None. This change adds mechanical enforcement for existing repository rules and does not establish a new ownership or dependency direction.
- **Current-state docs:** `docs/architecture/SYSTEM.md`, `docs/architecture/INVARIANTS.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — repository-wide tooling and architecture enforcement only

## Goal

Establish a small, reliable repository quality baseline that catches TypeScript/React correctness issues and architectural dependency regressions automatically, without introducing a formatting campaign or broad code cleanup.

The delivered baseline must make React Hook dependency checking real, including the custom PageLayout publication contract, and must verify the repository's existing `core/` and cross-feature dependency invariants in normal test/CI execution.

## User-visible behavior

There is no intended product behavior or UI change.

Developer-visible behavior after this change:

- `npm run lint` exists and succeeds on the repository;
- React Hook correctness is mechanically checked rather than implied by inactive `eslint-disable` comments;
- the PageLayout rail/header/presentation publication contract cannot silently rely on an unverified hand-maintained dependency list;
- CI runs the repository's lint, test, and production verification on pull requests and the default branch;
- a dependency-rule regression causes a test or lint failure before merge.

## Scope

### 1. Add an intentional ESLint baseline

Add ESLint configuration suitable for the existing TypeScript + React 19 repository.

The baseline must include:

- TypeScript-aware lint support;
- `react-hooks/rules-of-hooks`;
- `react-hooks/exhaustive-deps`;
- a repository script named `lint`;
- generated/build/dependency paths excluded appropriately.

The configuration must be intentionally small enough to land cleanly in the current repository. Do not enable a broad set of unrelated stylistic or React-Compiler rules merely because a plugin preset contains them.

Existing `// eslint-disable-next-line react-hooks/exhaustive-deps` comments must no longer refer to a rule that is absent. Retain a suppression only where the implementation has a deliberate reason that cannot be expressed safely in code, and keep such suppressions narrow.

Do not add Prettier in this change.

### 2. Make the custom PageLayout dependency contract mechanically checkable

`useRails`, `useLayoutHeader`, and `usePageLayoutPresentation` currently accept a caller-supplied dependency array and internally suppress `react-hooks/exhaustive-deps`.

Installing `eslint-plugin-react-hooks` alone is not sufficient. The implementation must prove that stale-dependency mistakes in PageLayout publishers are actually detectable.

Acceptable implementation directions include:

- refactoring the PageLayout publication API/callers so dependency arrays live in standard lint-aware Hooks such as `useMemo`; or
- configuring custom Hook dependency linting only if the chosen configuration genuinely understands the hook signature and detects missing dependencies.

Do not keep the current API unchanged and assume that naming the hooks in an ESLint regex provides coverage without verifying it.

The PageLayout behavior must remain unchanged:

- publishers use the stable write-only context;
- publishing does not create a publisher render loop;
- rails/header/presentation still clear on unmount;
- callers can avoid unnecessary republishing when their inputs are unchanged.

During implementation verification, intentionally remove one real dependency from a representative rail/header publisher and confirm `npm run lint` fails. Restore the correct dependency before committing. A permanent deliberately failing fixture is not required.

### 3. Add minimal CI

Add a GitHub Actions workflow that runs for pull requests and updates to the default branch.

The workflow must:

1. check out the repository;
2. install dependencies from the lockfile;
3. run lint;
4. run the full Vitest suite;
5. perform production TypeScript/build verification.

Use the existing scripts where practical.

`npm run build` already runs `tsc -b` before Vite. Do not compile TypeScript twice merely to make the workflow visually contain separate `typecheck` and `build` labels. The CI result must cover type correctness and production build exactly once each.

Keep CI deliberately small. This change does not add:

- coverage thresholds;
- release/deploy automation;
- dependency-update bots;
- matrix testing across many Node versions;
- formatting checks.

### 4. Enforce architectural dependency invariants

Add a fast repository test or equivalent mechanical check covering the existing dependency rules from `docs/architecture/INVARIANTS.md` and `docs/architecture/SYSTEM.md`.

At minimum it must fail when:

- a file under `src/core/` imports from `src/app/`;
- a file under `src/core/` imports from `src/features/`;
- one top-level feature imports another top-level feature outside the documented exception.

The currently documented top-level feature exception is:

- Pi may consume Major System through the Major System public root boundary.

Cards PAO -> Themed is internal to the single `cards` feature and is not a top-level feature-to-feature exception.

The check must understand the repository's normal path-alias imports and should also catch equivalent relative imports where practical. It must not forbid the documented feature-to-app integration seams for settings, PageLayout, or overlays.

Do not introduce a large dependency-analysis framework solely for this check if a small deterministic repository test can enforce the current invariants.

### 5. Keep the change focused

If lint exposes existing correctness defects that must be fixed for a green baseline, fix the smallest affected code necessary.

Do not turn the change into:

- a broad refactor;
- a formatting rewrite;
- a naming/style cleanup;
- a `noUnusedLocals` / `noUnusedParameters` campaign;
- unrelated feature work.

## Architecture constraints

- Follow `CLAUDE.md` and `AGENTS.md`.
- `docs/architecture/SYSTEM.md` remains authoritative for top-level dependency direction.
- `docs/architecture/INVARIANTS.md` remains authoritative for global dependency invariants.
- This change enforces existing architecture; it does not redefine it.
- Do not add new feature-to-feature exceptions to make the dependency test pass. If the current source reveals an undocumented real dependency, stop and resolve that architectural discrepancy rather than silently allowlisting it.
- Do not add a generic DI/container/module-boundary framework.
- Do not add Prettier.
- Do not modify product behavior merely to satisfy stylistic lint rules.

No ADR is required.

## Existing capabilities to reuse

- `package.json`
  - Existing repository scripts and production `build` command.
- `src/app/layout/PageLayoutContext.tsx`
  - Existing PageLayout publication contract whose dependency correctness must become mechanically verifiable.
- `docs/architecture/SYSTEM.md`
  - Existing top-level dependency direction and documented cross-feature exception.
- `docs/architecture/INVARIANTS.md`
  - Canonical rules the dependency check must enforce.
- `AGENTS.md`
  - Existing progressive verification policy; update only where the new lint/CI workflow makes the current instructions incomplete.

## Edge cases

- ESLint must understand `.ts` and `.tsx` source without requiring emitted JavaScript.
- Test files may use test-only globals/configuration without forcing source-rule suppressions.
- Generated/build output and dependencies must not be linted.
- A valid Pi -> Major System public-boundary import must remain allowed.
- A World Countries -> Pi import must fail the dependency rule.
- `core/` importing a type from a feature is still an upward dependency and must fail even if TypeScript erases it at runtime.
- The PageLayout hook solution must not replace one stale-dependency risk with uncontrolled republishing or a render loop.

## Out of scope

- Prettier or any other formatter.
- Broad cleanup of existing code style.
- Re-enabling TypeScript `noUnusedLocals` or `noUnusedParameters`.
- Changes to application architecture or feature ownership.
- Changes to the learning/scoring paradigms.
- World Countries refresh/invalidation cleanup; that is Change Spec 0047.
- World Countries settings-cycle remediation; that is Change Spec 0047.

## Acceptance criteria

- [ ] `npm run lint` exists and passes on the completed repository.
- [ ] ESLint actively checks `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps`.
- [ ] Existing `eslint-disable-next-line react-hooks/exhaustive-deps` comments are either removed or remain only where they suppress a real installed rule for a documented reason.
- [ ] A deliberately omitted dependency in a representative PageLayout rail/header publisher is detected by lint during implementation verification.
- [ ] PageLayout rails, header, and presentation still publish and clear correctly without render loops.
- [ ] CI is present and runs on pull requests and the default branch.
- [ ] CI installs from the lockfile and covers lint, the full test suite, TypeScript correctness, and a production Vite build.
- [ ] CI does not redundantly run TypeScript compilation twice.
- [ ] A mechanical dependency check rejects `core -> app`, `core -> features`, and undocumented top-level feature-to-feature imports.
- [ ] The documented Pi -> Major System public-boundary dependency remains allowed.
- [ ] No new cross-feature exception is introduced merely to make the check pass.
- [ ] The full existing test suite remains green.
- [ ] The production build remains green.
- [ ] No Prettier configuration or formatting-only rewrite is introduced.

## Source anchors

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vitest.config.ts`
- `src/app/layout/PageLayoutContext.tsx`
- `docs/architecture/SYSTEM.md`
- `docs/architecture/INVARIANTS.md`
- `AGENTS.md`
- `.github/workflows/` (new)

## Documentation impact

Update `AGENTS.md` only as needed so the repository verification guidance acknowledges the new lint command and CI baseline.

No current-state architecture document should change unless implementation discovers that the source already violates a documented invariant. That situation is not authorization to rewrite the invariant.

Do not create an ADR.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-29.
- Evidence: `npm.cmd run lint` passed; `npm.cmd test` passed with 137 test files and 743 tests; `npm.cmd run build` passed with `tsc -b` and the production Vite build; `npx.cmd vitest run src/architecture/dependencyRules.test.ts` passed with 2 tests; and temporarily removing `area` from the real World Countries PageLayout header publisher made `npm.cmd run lint` fail with the expected missing-dependency error before the dependency was restored.
