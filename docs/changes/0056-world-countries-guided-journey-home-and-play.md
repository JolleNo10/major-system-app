# Change Spec 0056 - World Countries Guided Journey Home and Play

- **Status:** Implemented
- **Date:** 2026-09-08
- **Issue:** None.
- **Related ADRs:** None. This change recomposes existing World Countries capabilities and does not intentionally introduce a new durable architecture decision.
- **Current-state docs:** [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md)
- **Visual reference:** `0056-world-countries-guided-journey-home-and-play-visual-reference.html`

## Goal

Reframe World Countries from a set of equal activity tabs into a map-centered learning product with one obvious guided continuation path, geographic exploration, and optional freeform play.

The user should not need to understand the distinction between Today, Drill, Recite, Quiz, Learning, and Practice before they can make progress. Existing workflow semantics remain available, but the feature home answers the more useful questions first: **where am I, what should I do next, and what can I choose to practise freely?**

This work is intentionally developed and evaluated on a dedicated feature branch before any merge to `main`.

## User-visible behavior

### World Countries opens on a feature home

Entering World Countries opens a World-level home instead of an equal `[Today] [Drill] [Recite] [Quiz]` activity selector.

The home is map-centered and uses the existing World Countries visual language and PageLayout composition:

- the center column presents World mastery/progress and the World map;
- the primary attached map action is **Continue learning** or **Continue review**, derived from the existing guided plan;
- the left rail provides geographic context and region exploration;
- the right rail explains the current guided action and provides secondary Play/progress entry points.

The World map is an interaction/navigation surface, not decorative artwork. Selecting a Continent opens that Continent's learning hub without automatically starting a session.

### Continue is the default path

The strongest action on the World home is the existing derived guided recommendation:

- if core review is due, Continue starts the existing bounded Today review behavior;
- otherwise, if guided Learning remains, Continue starts the existing Country or Capital Learning flow recommended by the plan;
- if neither is available, the home presents the caught-up/mastered state and freeform activities remain available.

The user does not choose Drill/Recite/Quiz before using Continue.

The implementation must reuse the current Today planning/review/Learning ownership rather than duplicating scheduling logic in a new home component.

### Continent hub

Selecting a Continent from the World map or geographic rail opens a map-centered Continent hub.

The hub:

- shows the Continent map as the dominant center surface;
- shows progress derived from the active Country population, retained recall evidence, and existing Subregion Learning state;
- identifies the next relevant guided Subregion/action within that Continent;
- offers a primary Continue action for that Continent;
- lets the user return to World without losing evidence or changing configured geography;
- does not start a session merely because the Continent was selected.

The Continent hub may derive a Continent-scoped Today-style plan by using the existing planning primitives over the Continent's active Country population. Do not create a second scheduler or persisted curriculum coordinator.

### Learning journey presentation

The guided experience is presented to the learner as an additive journey:

1. **Meet the countries**
2. **Practice the countries**
3. **Master the countries**
4. **Add the capitals**
5. **Put it all together**
6. **Master the region**

These labels describe the learner-facing journey. They are **not six new persisted domain states**.

The implementation derives the visible position/status from existing durable Subregion Learning milestones and retained recall/proficiency evidence. Existing Learning flows remain authoritative for their own internal Review/Practice/Combined/Final phases.

The current whole-Subregion Learning model remains the guided learning unit. Do not add a new hard rule that every Country in an entire Continent or World must be mastered before any Capital can be learned. The Continent hub summarizes Subregion progress and points to the next Subregion/action.

When a Subregion is the current guided unit, the UI may show the six-stage journey as a conceptual path while grouping transient internal Learning phases beneath those labels. The UI must not pretend a transient flow phase is durably persisted when it is not.

### Capitals extend Country knowledge

Country and Capital learning are presented as one accumulating journey rather than two unrelated courses.

When a Subregion has established Country learning, Capital learning is described as adding Country -> Capital associations onto known geography. Existing Country mastery/evidence is retained and reused; starting Capital learning does not reset Country progress.

### Play is freeform and does not replace the learning path

The home and Continent hub expose a secondary **Play** area for intentional freeform activity.

Initial Play destinations should primarily expose existing capabilities rather than create replacement engines:

- **Recite** — existing Recite setup/session, including one or multiple Continents/Subregions and its existing three modes;
- **Quiz** — existing Practice-owned Quiz capabilities;
- **Map / Practice** — reuse existing non-recording map-backed Practice activities where they fit;
- **Custom practice** — use the existing Drill/setup capabilities where advanced scope/mode configuration is still required.

Labels may be made more learner-facing at the entry surface while internal workflow names and ownership remain unchanged unless a later cleanup proves a rename worthwhile.

Completing or exiting Play returns to the feature home or an appropriate prior hub. Freeform activity does not arbitrarily change the guided curriculum position. Existing evidence semantics remain authoritative: activities that currently record evidence continue to do so; non-recording Practice and Recite remain non-recording.

### Progress is supporting, not a competing mode

The home exposes concise World/Continent progress and an entry to a fuller progress view when useful.

Progress must be derived from existing recall/proficiency/Learning data. Do not introduce a new progress store merely for this information architecture.

A minimal first progress view may consist of:

- World mastery summary;
- Continent progress rows/cards;
- current guided Subregion/action;
- weak/due knowledge already derivable from existing evidence.

It does not need to become a new analytics subsystem.

### Existing workflows remain usable during branch development

Implement this redesign incrementally on the feature branch.

Until a new entry path demonstrably covers an existing workflow, keep the existing workflow reachable. Remove the equal top-level Today/Drill/Recite/Quiz selector only after the new home and Play/navigation routes cover the required use cases.

Internal `today/`, `drill/`, `recite/`, `practice/`, and `learning/flows/` packages do not need to be renamed merely because their user-facing entry hierarchy changes.

## Visual contract

The companion HTML file is the primary implementation reference for hierarchy and composition:

`0056-world-countries-guided-journey-home-and-play-visual-reference.html`

It contains reference views for:

- World Countries home;
- Continent learning hub;
- Play/freeform activity entry.

The HTML is a **design reference, not runtime implementation source**.

Do not port its HTML or CSS into React. Recreate its intent using the current World Countries composition seams, especially PageLayout, rails, WorldCountriesPanel, MapSurface/TaskDock, GeographyOverviewMap, and existing progress presentation.

Exact pixels, prototype-only icons, fake progress values, and schematic map geometry are not normative. The normative aspects are:

- map dominance;
- one clear Continue action;
- geographic exploration separated from starting a session;
- guided journey context in a supporting rail/panel;
- Play as a secondary escape hatch rather than an equal primary mode;
- existing zinc/cyan World Countries visual language;
- existing 42rem center / symmetric desktop rail layout rather than a new dashboard grid.

If the prototype and existing component architecture conflict, preserve the existing architecture and reproduce the visual/interaction intent through composition. Material deviations should be reported rather than hidden behind a parallel UI system.

## Scope

- Replace the equal World Countries activity-tab landing model with a World-level home/orchestration view.
- Reuse the current Today plan as the default Continue source.
- Add Continent-hub navigation and Continent-scoped guided/progress presentation.
- Add learner-facing journey presentation derived from existing Learning milestones and recall/proficiency evidence.
- Add a Play entry surface that routes into existing Recite, Quiz, Practice, and configurable Drill capabilities.
- Add or refine a lightweight progress view if needed to complete the home information architecture.
- Preserve existing activity evidence/persistence semantics.
- Preserve existing World Countries map-centered visual system and shared UI ownership.
- Update current-state World Countries architecture when the new entry hierarchy is implemented.

## Interaction and states

### Initial/loading

While retained recall evidence is loading:

- keep the home/map shell stable;
- show existing loading semantics for mastery/guided status;
- do not flash an incorrect journey step or start action.

### Review due

When review is due:

- Continue is review-first, consistent with current Today semantics;
- the right rail explains that review is due and, when known, what Learning comes next;
- selecting a Continent remains navigation and does not consume/change the review queue.

A Continent hub may prioritize review due within that Continent before introducing new material in that scoped hub.

### Guided Learning available

When no blocking due review exists and Learning remains:

- Continue starts the current recommended Learning flow;
- the home/hub names the learner-facing action and geographic unit;
- after completion, derived evidence/state refreshes and the home/hub updates without manual reload.

### Caught up / fully learned

When no due review and no new guided Learning remain:

- do not leave a disabled primary CTA that looks actionable;
- present a clear caught-up/mastered state;
- Play and Progress remain available.

### No active Countries

Retain a usable empty state consistent with existing Today behavior. Do not crash map/progress derivation.

### Evidence load failure

Retain a usable feature shell and allow freeform workflows that do not depend on the failed derived home evidence, consistent with current fallback behavior. Explain that guided status is unavailable rather than fabricating a journey position.

### World -> Continent -> World

Navigating into and out of a Continent is transient presentation/navigation state. It must not mutate Country membership, authored geography order, Learning milestones, or configured Drill/Recite scope.

### Play -> session -> return

Starting a Play workflow snapshots scope according to that workflow's existing rules. Exiting/completing returns to the new information architecture and refreshes any derived evidence affected by the activity.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- `WorldCountries.tsx` remains the feature composition boundary unless repository inspection identifies an existing narrower seam that is more appropriate.
- `today/` remains the owner of Today planning, bounded due-review behavior, and delegation into existing Learning flows. The home may reuse/refactor this ownership; it must not copy its scheduler logic.
- `learning/flows/` remains the owner of guided Country/Capital Learning UI and milestone writes.
- `recite/` remains the owner of Recite setup/session/outcomes and its transient multi-Continent selection.
- `practice/` remains the owner of non-recording Practice and Quiz behavior.
- `drill/` remains the owner of recorded Drill behavior and advanced Drill setup while those capabilities are still used.
- `maps/` and `ui/` retain their current map/presentation boundaries.
- Do not introduce a broad new `journey/`, `domain/`, `common/`, or persistence layer merely to support navigation/presentation.
- Do not persist a current journey step unless repository inspection proves an independent durable user intent that cannot be correctly derived from existing state. This Change Spec does not require such persistence.
- Do not introduce React Router or another navigation framework solely for this feature if the current local orchestration pattern is sufficient.
- Keep unrelated World Countries behavior unchanged.

## Existing capabilities to reuse

- `WorldCountries.tsx` — current feature shell/composition and active population provider.
- `today/WorldCountriesToday.tsx`, `today/todayPlan.ts`, `today/TodayReviewSession.tsx` — current derived guided plan/review behavior to reuse rather than duplicate.
- `learning/flows/CountryLearningFlow.tsx` and `CapitalLearningFlow.tsx` — guided Learning execution.
- `learning/subregionLearningStore.ts` and recall/proficiency derivation — existing durable/derived learning evidence.
- `maps/GeographyOverviewMap.tsx` — interactive World/Continent maps and Country callbacks.
- `ui/MapSurface.tsx` / `TaskDock` — map-centered center surface and attached primary action.
- `ui/WorldCountriesPanel.tsx` — canonical rail/panel surface.
- `ui/WorldMasterySummary.tsx` and existing scope/progress presentation — derived progress display.
- existing geography queries/effective order — Continent/Subregion membership and ordering.
- `recite/` — freeform ordered recall including multi-Continent scope.
- `practice/` — non-recording Practice and Quiz experiences.
- `drill/` — recorded/custom practice capabilities that remain needed behind Play.

## Edge cases

- **Review is due while a different Continent is explored:** World Continue remains review-first; a scoped Continent Continue must not silently include Countries outside the selected Continent.
- **Mixed learning state within one Continent:** the hub summarizes Subregion states and identifies the next guided Subregion/action; it does not force one fake Continent-wide persisted stage.
- **Country Learning complete but recall not yet mastered:** journey presentation can distinguish guided completion from stronger recall mastery using existing evidence rather than rewriting the Learning milestone.
- **Capital Learning begins before Country Learning by intentional existing workflow:** do not corrupt or backfill fake journey state. Presentation must truthfully reflect existing milestones/evidence.
- **Recite across several Continents:** remains supported through its existing scope model and is reachable from Play.
- **Play records evidence in a recorded Drill:** refreshed home/progress may improve afterward, but Play completion does not directly set a journey step.
- **Non-recording Practice/Recite:** does not fabricate mastery/evidence after return.
- **Settings change active Country population:** home, Continent hubs, progress denominators, and maps update from the resolved active population.
- **Responsive layout:** retain the existing PageLayout rail-to-drawer behavior below `xl`; do not create a separate mobile page architecture.
- **Expanded map:** retain existing MapSurface expanded behavior; home/hub navigation should not create a second fullscreen mechanism.

## Out of scope

- Rewriting the learning scheduler, spaced-review ladder, answer lifecycle, or round scheduler.
- Creating six persisted journey-state fields.
- Requiring all Countries in the World or a Continent to be mastered before any Capital can be learned.
- Replacing Recite, Quiz, Practice, or Drill engines with new implementations.
- Broadly renaming source directories solely to match new user-facing labels.
- Reworking Country/Capital data, geography membership/order, map assets, tiny-Country interaction, or camera behavior unrelated to the new information architecture.
- New gamification, achievements, streaks, XP, social features, or multiplayer.
- A general analytics/reporting subsystem.
- Merging the experimental branch to `main` as part of implementation.

## Acceptance criteria

- [ ] World Countries opens on a map-centered home rather than an equal Today/Drill/Recite/Quiz tab selector.
- [ ] The home uses the existing PageLayout visual system and does not introduce a parallel dashboard/layout framework.
- [ ] World mastery/progress and the interactive World map are visible on the home.
- [ ] The primary home action is derived from the existing guided plan and starts due review before new Learning when current Today semantics require it.
- [ ] Guided Continue reuses existing Today review and Country/Capital Learning flows rather than duplicating their scheduling or milestone behavior.
- [ ] Selecting a Continent from the home navigates to a Continent hub without starting a session.
- [ ] The Continent hub is map-centered, derives its progress from existing state, identifies a next guided Subregion/action, and can start that scoped action.
- [ ] Returning from a Continent hub to World does not mutate geography configuration, Learning milestones, or workflow scope.
- [ ] The learner-facing journey communicates Countries -> Capitals -> combined mastery without introducing six new persisted states.
- [ ] Journey status is derived from existing Subregion Learning milestones plus retained recall/proficiency evidence and remains truthful for mixed/partial states.
- [ ] Existing whole-Subregion Learning semantics remain valid; no new Continent/World-wide hard Capital gate is introduced.
- [ ] Play exposes the existing Recite capability, including multi-Continent scope.
- [ ] Play exposes existing Quiz/Practice and configurable recorded Drill capabilities through learner-facing entry points where appropriate.
- [ ] Existing evidence semantics remain unchanged: Recite/non-recording Practice remain non-recording and recorded Drill continues to write only its existing evidence.
- [ ] Completing or exiting a workflow returns to the new home/hub model and refreshes affected derived progress.
- [ ] A caught-up/fully learned user receives a clear non-error completion state and can still access Play/Progress.
- [ ] Evidence-loading, evidence-error, and zero-active-Country states remain usable.
- [ ] Existing responsive rail/drawer behavior and MapSurface expanded behavior remain intact.
- [ ] The old equal activity tabs are removed from the primary feature shell only after all required workflows remain reachable from the new information architecture.
- [ ] Focused automated tests cover home routing, Continue behavior, Continent navigation/scoping, journey derivation, and Play routing without requiring browser/manual verification.
- [ ] Current-state World Countries architecture is updated to describe the implemented home/guided/Play entry hierarchy and retained workflow ownership.
- [ ] All implementation remains on the dedicated feature branch; no merge to `main` is performed by this task.

## Source anchors

- `src/features/world-countries/WorldCountries.tsx`
- `src/features/world-countries/WorldCountries.test.tsx`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/TodayRails.tsx`
- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/subregionLearningStore.ts`
- `src/features/world-countries/learning/recallProgress.ts`
- `src/features/world-countries/learning/scopeProgress.ts`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/WorldCountriesPanel.tsx`
- `src/features/world-countries/ui/WorldMasterySummary.tsx`
- `src/features/world-countries/recite/`
- `src/features/world-countries/practice/`
- `src/features/world-countries/drill/`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

When implemented:

- update `docs/architecture/features/WORLD_COUNTRIES.md` so the user-facing entry model describes Home/guided continuation, Continent exploration, Play, and Progress rather than equal Today/Drill/Recite/Quiz tabs;
- preserve the documented internal ownership of Today planning, Learning flows, Practice/Quiz, Drill, Recite, maps, and UI unless implementation uncovers a real architectural reason to change it;
- document that learner-facing journey stages are derived presentation over existing milestones/evidence, not new persistence identities;
- set this Change Spec to `Implemented` only after sufficient risk-proportionate evidence is recorded.

## Verification

Implement in stages and validate each stage with the smallest relevant automated evidence.

Expected focused evidence includes:

- `WorldCountries` shell/home tests proving default home and routing to existing workflows;
- Today-plan/review tests proving Continue remains review-first and delegates to existing flows;
- Continent-hub tests for World -> Continent -> World navigation and scoped Country membership;
- journey-presentation derivation tests for representative states: not learned, Country learning in progress, Countries learned, Capitals learning, mixed recall, and complete/mastered;
- Play routing tests proving Recite multi-Continent and existing Quiz/Practice/Drill entry paths remain reachable;
- focused map/UI tests only where shared presentation seams are changed.

Because this change spans the feature shell and several workflow entry points, widen to the relevant World Countries feature slice if focused tests are insufficient. Run typecheck/lint/build only when materially required by the changed boundaries. Run `git diff --check`.

Browser/manual verification is not required by default. Do not start or troubleshoot a dev server solely for it. If the user later chooses to visually inspect the experimental branch, that is a separate evaluation step and must not block automated implementation evidence.

## Implementation evidence

- Focused World Countries checks: `npx.cmd vitest run src/features/world-countries/WorldCountries.test.tsx src/features/world-countries/today/WorldCountriesToday.test.tsx src/features/world-countries/today/GuidedHomeRails.test.tsx src/features/world-countries/today/todayPlan.test.ts src/features/world-countries/today/journeyPresentation.test.ts src/features/world-countries/recite/WorldCountriesRecite.test.tsx src/features/world-countries/practice/WorldCountriesQuiz.test.tsx src/features/world-countries/drill/WorldCountriesDrill.test.tsx` — 8 files, 77 tests passed.
- World Countries feature slice: `npx.cmd vitest run src/features/world-countries` — 114 files, 737 tests passed.
- Repository suite: `npm.cmd test` — 149 files, 948 tests passed.
- `npm.cmd run lint` passed.
- `npm.cmd run typecheck` and `npm.cmd run build` stop at the existing unrelated `src/features/world-countries/drill/DrillSetup.test.tsx:301` `Map<any, any>` inference error; the Vite production build is not reached.
- Covered behaviors include default Home and Play routing, transient World -> Continent navigation, scoped Today plan membership, review-first Continue behavior, loading/error/empty/caught-up rail states, representative derived journey states, and preserved Recite/Quiz/Drill workflow entry points.
- `git diff --check` passed.
- Browser/manual verification was intentionally not run, per the Change Spec and repository instructions.
- Residual risk: repository typecheck currently reports an existing unrelated `Map<any, any>` inference error at `src/features/world-countries/drill/DrillSetup.test.tsx:301`; the changed implementation files themselves typecheck through the same compiler run, but the repository-wide typecheck/build baseline remains subject to that pre-existing test error.
- The visual reference was followed for hierarchy and interaction intent through existing `PageLayout`, rails, `MapSurface`/`TaskDock`, `GeographyOverviewMap`, `WorldCountriesPanel`, and mastery/progress seams. Prototype HTML/CSS, fake values, icons, and schematic map geometry were not ported.
