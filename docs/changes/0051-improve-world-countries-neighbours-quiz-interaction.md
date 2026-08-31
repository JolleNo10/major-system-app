# Change Spec 0051 - Improve World Countries Neighbours Quiz Interaction

- **Status:** Implemented
- **Date:** 2026-08-31
- **Issue:** None.
- **Related ADRs:** `../adr/0032-model-world-countries-quiz-as-practice.md`
- **Related changes:** Change Spec 0050 added the World Countries Neighbours Quiz and defines its land-border/run-snapshot semantics.
- **Current-state docs:** `../architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Make the Neighbours Quiz easier to follow and more deliberate during recall. Correctly named neighbours must remain identifiable, secondary hint/reveal controls must move out of the answer dock, every target must end at an explicit review checkpoint instead of auto-advancing, and the implementation must tighten the existing coordinator/session/derived-state boundaries without creating a new Quiz architecture.

The completed experience should make the map and typed answer the primary recall surface while using the existing PageLayout right rail and expanded-map companion presentation for persistent progress and secondary actions.

## User-visible behavior

### Active target

The existing question remains the primary cue, for example:

```text
Name the countries that border Germany
```

The target Country remains highlighted on the world map. Because the target identity is already disclosed by the prompt, the target Country name may also be visible on the map.

The answer dock is reduced to the primary recall interaction:

```text
[ Type a neighbouring Country...             ] [ Check ]
```

Transient answer feedback such as `Correct.`, `Already found.`, invalid/ambiguous feedback, and controlled-fuzzy canonical-name feedback remains available, but hint/reveal controls no longer compete with the answer input in this dock.

### Persistent found-neighbour feedback

When an entered Country resolves to an unrecalled required neighbour:

- keep the target active until it is resolved;
- keep the existing found-neighbour map treatment;
- immediately show that Country's canonical name on the map;
- add the canonical Country name to a persistent `Found` list in the session tools;
- clear/refocus the answer input as today; and
- retain all previously found neighbours in both the map and the `Found` list.

A duplicate submission of an already-found neighbour remains non-penalizing and must not duplicate the Country in the list.

The persistent list is intended to remove the memory burden of remembering which already-correct green shapes have been submitted while reinforcing the Country-to-location association.

### Session tools in the right rail

During a standard desktop Neighbours session, the PageLayout right rail becomes the session-tools surface.

It contains at least:

- the persistent `Found` neighbour list;
- compact found progress;
- `Show number`;
- `Show map` (renamed from `Reveal map`);
- `Reveal remaining`; and
- compact incorrect-guess status.

`Reveal remaining` must remain visually distinct from ordinary hints because it discloses unanswered identities and resolves the target.

Before `Show number` is used, progress is expressed without revealing the total, for example:

```text
3 found
```

After `Show number` is used:

```text
3 / 9 found
```

Do not repeat unnecessary explanatory copy when the state is already obvious from the control/progress presentation.

### Expanded map presentation

The normal PageLayout rails are intentionally unavailable in expanded-center map presentation. Expanding the map must therefore not remove access to Neighbours session tools.

Reuse the existing MapSurface expanded-companion capability, extending the existing World Countries map-activity wrapper only as necessary. In expanded presentation, expose the same Neighbours session state/actions in a compact companion surface next to the answer dock.

The standard rail and expanded companion must represent the same underlying session controls, not independent implementations with duplicated state or action semantics.

### Show number

`Show number` keeps Change Spec 0050's target-local hint state, but the revealed count now changes the persistent progress presentation from `N found` to `N / total found`.

The hint never reveals neighbour identities by itself.

### Show map

Rename the current `Reveal map` action to `Show map` throughout the Neighbours user-facing interaction and tests.

Its semantics remain contextual geography assistance rather than answer disclosure:

- expose the surrounding run-valid geographic context in the current fitted viewport;
- keep Country names hidden unless they are already disclosed by the task, found by the learner, or shown in a resolved checkpoint;
- keep hover names disabled;
- keep map interaction disabled;
- preserve target/found/revealed semantic map treatments; and
- do not specially identify unresolved required neighbours.

If the map is loading or unavailable, `Show map` remains disabled/unavailable while typed recall and the other non-map actions continue to work.

### Reveal remaining

`Reveal remaining` resolves every still-missing required neighbour using the existing revealed/missed state semantics.

It no longer leads to a materially different review concept from naturally completing the target. Both routes end at the same explicit per-target checkpoint presentation, with found and revealed outcomes distinguished.

### No automatic target advance

Naming the final required neighbour must **not** auto-advance after a dwell or timeout.

When the target becomes resolved, stop accepting new answers and keep the current target/map mounted until the learner explicitly continues.

No completion timer may move the Neighbours session to the next target or overall results.

### Per-target checkpoint

Every resolved target ends at an explicit checkpoint, regardless of whether it was resolved entirely by recall or via `Reveal remaining`.

The checkpoint presents the complete resolved answer set for the target, not only revealed neighbours.

For each required neighbour, distinguish at least:

- named by the learner; or
- revealed/missed.

The map must label all resolved required neighbours during this checkpoint while preserving the existing visual distinction between found and revealed Countries.

The checkpoint also shows compact target-level status such as:

- target Country;
- `named / required` count;
- wrong-guess count or list where useful; and
- hints used, if any.

A clean completion should clearly communicate that all neighbours were found. A reveal completion should clearly communicate which entries were revealed.

For a non-final target, the checkpoint exposes an explicit action equivalent to:

```text
Next Country →
```

For the final target:

```text
See results →
```

The exact layout/copy may adapt to the existing design system, but the explicit checkpoint and explicit continuation are required.

### Perfect Country semantics

Because this activity is explicitly a Quiz, `Perfect Countries` becomes an unaided, error-free metric.

A target is perfect only when all of the following are true:

- every required neighbour was named by the learner;
- no required neighbour was revealed;
- no incorrect guesses were made;
- `Show number` was not used; and
- `Show map` was not used.

Duplicate submissions of an already-found neighbour remain neutral.

A controlled-fuzzy accepted Country name remains a named/correct answer.

The aggregate results may continue using the label `Perfect Countries` after this stricter definition.

If it can be derived cleanly from the existing target-local state, results should also surface a compact aggregate hint-use count. Do not introduce a new weighted score, percentage formula, or persistent score history.

## Scope

- Improve active Neighbours Quiz map feedback so found Country names remain visible.
- Add persistent found/progress/hint presentation to the active session tools.
- Move hint/reveal actions out of the answer dock.
- Rename `Reveal map` to `Show map` in the Neighbours UX.
- Preserve session tools in expanded map presentation through the existing map companion seam.
- Replace completion auto-advance with a shared explicit per-target checkpoint.
- Tighten `Perfect Countries` to unaided/error-free semantics.
- Keep active map presentation consistent with the Neighbours run snapshot.
- Consolidate repeated Neighbours target-derived sets/counts into a small pure Neighbours-specific derivation where useful.
- Make target advancement have one coordinator-owned transition path.
- Clarify rail publishing so each Quiz phase has one effective PageLayout rail owner.
- Update focused tests and regression coverage.

## Interaction and states

### Active / unresolved

The answer input is enabled. The current target remains active while required neighbours remain unresolved.

Found neighbour names accumulate persistently. Hints are target-local. Incorrect guesses remain target-local. Duplicate correct guesses do not mutate score state.

### Resolved by recall

After the final required neighbour is named:

- the target becomes resolved;
- the answer input becomes unavailable;
- all required neighbours are labelled on the map;
- the explicit target checkpoint is shown; and
- no timed advancement occurs.

### Resolved by reveal

After `Reveal remaining`:

- unresolved required neighbours become revealed/missed;
- the answer input becomes unavailable;
- all required neighbours are labelled on the map;
- found and revealed entries remain visually/status-distinct; and
- the same target checkpoint/explicit continuation model is used.

### Explicit continuation

The checkpoint's primary continuation requests target advancement through the top-level Quiz coordination path.

Advancing the final target completes the transient Neighbours session and allows the existing Quiz coordinator to enter results.

### Loading and map failure

While the map is loading, `Show map` remains unavailable. Other recall/hint/reveal behavior remains usable.

If the map fails:

- typed recall remains usable;
- persistent Found names remain usable;
- `Show number` remains usable;
- `Reveal remaining` remains usable;
- the checkpoint remains usable;
- explicit continuation remains usable; and
- `Show map` remains disabled/unavailable.

The map error must never trap the learner.

### Narrow screens

Reuse PageLayout's existing rail drawer behavior below the desktop rail breakpoint. Do not introduce a second mobile side-panel architecture.

The answer input remains available without opening the drawer. Found Country names also remain visible on the map so progress is understandable when the tools drawer is closed.

### Accessibility

Preserve or improve the existing:

- labelled answer input;
- status/live feedback;
- keyboard operability of actions;
- focus return after normal answer submission; and
- accessible non-map fallback.

The checkpoint continuation must be keyboard reachable and have clear accessible text.

## Architecture constraints

- Follow `../architecture/features/WORLD_COUNTRIES.md` and the feature `AGENTS.md`.
- Quiz remains non-recording Practice. Do not introduce Assessment semantics, Drill evidence, Learning milestones, Today state, Recite state, Quiz history, or any new persistence.
- Keep Neighbours under `src/features/world-countries/practice/`; do not create a `quiz/` package.
- `WorldCountriesQuiz` remains the top-level Quiz run/phase coordinator.
- Neighbours' multi-answer run/session mechanics remain Practice-owned and separate from the single-answer Capitals recall cursor.
- Maps remain responsible for Country-to-SVG translation and workflow-neutral Country visibility/naming/color/zoom capabilities.
- PageLayout remains the single app-wide rail host. Do not create a parallel rail or fullscreen-control system.
- `MapSurface` / `WorldCountriesMapActivitySurface` remain the shared map-task presentation seam. Extend the wrapper when necessary rather than bypassing it.
- Temporary Neighbours workflow state remains transient.
- The active Neighbours run snapshot remains authoritative for target membership, required neighbour IDs, answer candidates, and map-relevant active Country population throughout the mounted run.
- Do not add a generic `QuizProgress`, `MultiAnswerEngine`, generic common package, or similar abstraction for this one workflow.
- No new ADR is required unless implementation discovers that the requested behavior cannot be delivered without changing an existing durable architecture boundary. If that occurs, report the conflict instead of silently inventing a different design.

## Existing capabilities to reuse

- `practice/neighboursRun.ts` — existing Neighbours run/session state, target hint flags, reveal state, advancement, retry and summary semantics.
- `practice/WorldCountriesQuiz.tsx` — existing Quiz setup/run/results coordinator and active-run snapshot ownership.
- `practice/NeighboursQuizSession.tsx` — current Neighbours typed interaction and map orchestration.
- `practice/NeighboursQuizResults.tsx` — existing aggregate result/retry presentation.
- `maps/GeographyOverviewMap.tsx` — caller-controlled Country colors, labels, hiding, zoom, run population and map load state.
- `ui/MapSurface.tsx` — standard/expanded presentation, task dock and existing `expandedCompanion` capability.
- `ui/WorldCountriesActivity.tsx` — shared active World Countries map-task wrapper; extend it narrowly if `expandedCompanion` pass-through is required.
- `app/layout/PageLayoutContext.tsx` and PageLayout — existing rail registration/drawer behavior.
- existing Country-name matching responsibility — preserve exact/controlled-fuzzy/ambiguous/unrecognized semantics from Change Spec 0050.

## Edge cases

- A target with one required neighbour must still stop at the checkpoint after that one correct answer.
- The final target must not enter results until the explicit `See results` continuation is activated.
- Duplicate correct answers must not duplicate Found entries or invalidate perfection.
- A valid Country that is not a required neighbour remains an incorrect guess and must not become visible as a found answer.
- Ambiguous/unrecognized answers remain incorrect according to existing matching semantics.
- `Show number` and `Show map` reset for each target as today.
- If `Show map` is used and the target is otherwise solved cleanly, the target is not perfect under the new semantics.
- If `Show number` is used and the target is otherwise solved cleanly, the target is not perfect under the new semantics.
- `Reveal remaining` always makes the target imperfect.
- A map failure must not prevent explicit completion/continuation.
- Later Settings or geography changes must not alter the active run's answer domain or cause extra live/global Countries to appear as plausible run answers.
- Retry missed must continue to retry each imperfect target once, using the stricter perfect definition.
- `New quiz` continues to resolve a fresh run from current live setup/population.
- `Change setup` retains the existing transient setup behavior.

## Out of scope

- A new Quiz package or generic multi-answer framework.
- Persistent Quiz history, achievements, streaks, XP, mastery evidence or scheduling.
- Changing canonical land-border data or the filter-not-transfer semantics established by Change Spec 0050.
- Changing Capitals Quiz interaction.
- New map interaction such as clicking neighbour answers.
- Animating or highlighting a valid-but-wrong Country guess on the map; this may be considered separately.
- Broad restructuring of `practice/` or splitting `neighboursRun.ts` merely for file-size reasons.
- General PageLayout redesign.
- A new mobile navigation/drawer system.

## Acceptance criteria

- [x] A correctly named neighbour remains visibly found on the map and its canonical Country name becomes visible immediately.
- [x] Correctly named neighbours accumulate in a persistent `Found` list without duplicates.
- [x] The target Country may be labelled because its name is already disclosed by the prompt.
- [x] The primary answer dock no longer contains `Show number`, map-show, or `Reveal remaining` actions.
- [x] Standard desktop Neighbours sessions expose those secondary actions through the PageLayout right rail.
- [x] The map hint is labelled `Show map`, not `Reveal map`, throughout the Neighbours UI.
- [x] Before `Show number`, persistent progress exposes only the found count; after use it exposes `found / required`.
- [x] `Reveal remaining` is visually distinct from ordinary hints and resolves unanswered neighbours.
- [x] Expanding the map does not make Neighbours session controls inaccessible.
- [x] Expanded presentation reuses the existing map-surface companion seam and the same underlying session state/actions as the standard tools presentation.
- [x] Naming the last required neighbour never auto-advances after a timer/dwell.
- [x] A naturally completed target remains mounted at an explicit checkpoint until the learner continues.
- [x] `Reveal remaining` ends at the same checkpoint concept rather than a separate review flow.
- [x] The checkpoint presents the complete required-neighbour set and distinguishes learner-named from revealed/missed entries.
- [x] All resolved required neighbours are labelled on the map during the checkpoint.
- [x] Non-final checkpoints provide an explicit next-target action.
- [x] The final checkpoint provides an explicit results action and results do not appear before that action.
- [x] `Perfect Countries` requires all neighbours named, zero reveals, zero incorrect guesses, no `Show number`, and no `Show map`.
- [x] Duplicate already-found answers do not invalidate perfection.
- [x] Retry missed uses the stricter perfect-target semantics without changing its one-target-once retry behavior.
- [x] Active Neighbours map population/visibility is derived consistently from the run snapshot and does not expose later-live/global Country membership as valid run context.
- [x] Map failure leaves typed recall, non-map hints/reveal, checkpoint review and explicit continuation functional.
- [x] Target advancement is requested by the session UI but applied through one top-level Quiz coordinator transition path.
- [x] Repeated found/revealed/remaining/resolved target derivation is centralized in a small pure Neighbours-specific helper where this avoids duplication across active tools/checkpoint/results.
- [x] Each visible Quiz phase has one effective PageLayout rail publisher; setup and active-session rail registrations do not compete by effect order.
- [x] No new persistence, evidence, Quiz package, Assessment semantic, or broad generic abstraction is introduced.
- [x] Capitals Quiz behavior remains unchanged.

## Source anchors

- `src/features/world-countries/practice/WorldCountriesQuiz.tsx`
- `src/features/world-countries/practice/NeighboursQuizSession.tsx`
- `src/features/world-countries/practice/NeighboursQuizResults.tsx`
- `src/features/world-countries/practice/neighboursRun.ts`
- `src/features/world-countries/practice/NeighboursQuizSession.test.tsx`
- `src/features/world-countries/practice/NeighboursQuizResults.test.tsx`
- `src/features/world-countries/practice/neighboursRun.test.ts`
- `src/features/world-countries/practice/WorldCountriesQuiz.test.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/ui/WorldCountriesActivity.tsx`
- `src/app/layout/PageLayoutContext.tsx`
- `src/app/layout/PageLayout.tsx`

## Documentation impact

No new ADR is expected.

The implementation must keep `docs/architecture/features/WORLD_COUNTRIES.md` accurate. Update it only where the completed implementation changes a current-state statement that agents need to understand, such as Neighbours target completion semantics or a lasting session-presentation responsibility. Do not copy detailed UX acceptance criteria into the architecture document.

When implementation is verified, mark this Change Spec `Implemented` and complete the verification section.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-31.
- Evidence: focused Neighbours run/session/results/coordinator plus map adapter/presentation tests passed (60 tests across 6 files); the full `src/features/world-countries` Vitest run passed 112 files and 598 tests, and `npm run typecheck` passed. Expanded companion and setup/session rail ownership are covered by component/coordinator tests.
