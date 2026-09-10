# Change Spec 0061 - World Countries guided learning UX refinement

- **Status:** Implemented
- **Date:** 2026-09-10
- **Issue:** None.
- **Related ADRs:** None. This change refines learner-facing presentation and interaction within the existing World Countries ownership and state model.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Make the existing World Countries guided path feel like one coherent learner journey from Home through staged Country/Capital Learning, checkpoints, Final recall, and completion. The learner should see a simple next action, stay focused on the map and current recall task, understand meaningful progress without reading implementation terminology, and flow naturally into the next planner-authoritative step.

This change refines presentation only. It builds on the implemented guided-planner, staged-learning, persistent-session-context, and completion-handoff behavior already present on `world-countries-learning-journey`; it does not redesign their mechanics or ownership.

The accompanying `0061-world-countries-guided-learning-ux-refinement-visual-reference.html` is the approved visual/hierarchy reference for this change. Reproduce its information hierarchy and interaction emphasis through the existing application components rather than porting the standalone HTML/CSS.

Where earlier Change Specs contain learner-facing copy examples that conflict with this Change Spec, this Change Spec controls the new presentation. Their architecture, state, evidence, scheduling, and ownership contracts remain unchanged.

## User-visible behavior

### Home makes the next useful action unmistakable

Home and the Continent hub remain map-centered. The center map is the dominant surface and the attached `TaskDock` remains the single primary action surface.

The primary action must describe the actual work the learner is about to do rather than use a generic `Continue` label. Examples of the intended direction are:

- due review: **Review 8 items**;
- Country Learning: **Learn 3 countries** when the upcoming Set size can be derived from existing authoritative staged-plan truth, otherwise a truthful non-count label such as **Learn the countries**;
- Capital Learning: **Add the capitals**;
- consolidation: **Strengthen 6 items**;
- caught-up or complete states: do not manufacture work solely to keep a primary CTA visible.

The surrounding status copy should reinforce the same action rather than repeat it in multiple equally prominent cards. Useful review reasons may remain visible in compact form, for example `4 first reviews · 2 recent mistakes`, but counts and explanatory blocks must not compete with the map or primary action.

A total due count and the bounded next review-block size are different concepts. If more items are due than the current block contains, the status may truthfully describe total due work while the CTA must describe the work that will actually start next.

### Home shows a compact learner journey

The existing six-stage derived journey remains the authoritative detailed presentation model. Do not replace, persist, or reinterpret it.

On the default Home/Continent supporting rail, present a compact three-milestone summary that answers where the learner is without showing the whole curriculum syllabus at all times:

```text
Northern Europe

✓ Countries
● Capitals
○ Mastery

Next: Add the capitals
```

The three milestones are a projection over existing journey/milestone/recall truth:

- **Countries** reflects the established/learned Country layer without implying long-term mastery;
- **Capitals** reflects the established/learned Capital layer without implying core mastery;
- **Mastery** reflects the existing core recall completion/mastery truth already used by the feature.

Use text/icon/state treatment in addition to color. Current/complete/upcoming states must remain understandable without relying on cyan/green/violet alone.

The detailed six-stage journey may remain available through progressive disclosure or in the existing Progress surface if useful, but it should no longer dominate the default Home rail. Do not add a new persisted expansion preference for this change.

### Guided Learning feels like one continuous activity

Keep the existing staged mechanics and phase ownership. The learner-facing mental model should be simpler than the internal phase machine:

Country Learning:

```text
Meet -> Find -> Recall -> Mix -> Final recall
```

Capital Learning:

```text
Meet the capitals -> Recall -> Mix -> Final recall
```

This is presentation language only. Do not rename internal state-machine phases merely to match these labels.

The center task and map should always outrank explanatory UI. The learner should not need to read several cards to know what to do next.

### Walkthrough keeps rich learning context

During Country `Meet the countries` and Capital `Add the capitals` walkthroughs, preserve the useful rich context established by the branch:

- geography/Subregion context;
- current Set identity and progress;
- full ordered Country list for orientation;
- previous/current/upcoming Set presentation when applicable;
- existing Country-order authoring where supported;
- existing mnemonic support in its current eligible walkthrough context.

Refine the hierarchy so this reads as one coherent context rail rather than a stack of system cards. Avoid prominent learner-facing headings such as `Learning context`, `Learning scope`, or other implementation-oriented labels when the actual geography, Set, and task already communicate the meaning.

### Active recall uses compact orientation, not system narration

Once the learner begins Location, typed Country/Capital practice, Combined practice, or Final recall, retain the persistent compact Learning rail required by current architecture, but visually quiet it.

The compact rail should answer only what is useful for orientation:

- what geography am I learning;
- what staged scope is active now (current Set, cumulative introduced scope, or full Final-recall scope);
- where those Countries sit in the full ordered Subregion.

Do not reintroduce order editing or mnemonic editing outside walkthrough. Do not duplicate task progress already owned by the task dock/session surface.

Set-local phases should make current Countries easy to identify and later Countries quieter. Combined phases should show cumulative introduced scope rather than a false current Set. Final-recall phases should show the full scope without previous/current/upcoming Set semantics.

### Checkpoints report what the learner just achieved

Replace vague checkpoint language such as `Set 1 ready` with outcome-based language. A checkpoint should answer:

1. what did I just complete;
2. what does that mean in this run;
3. why is the next step useful;
4. what happens if I press the primary action.

Conceptual Country example:

```text
✓ Set 1 complete

You recalled all 3 countries in this practice.
Next, mix them with the countries you've already learned.

[ Practise all 6 together ]
[ Practise this set again ]
```

Use the exact next action derived from the staged plan rather than hard-coding a count or next phase that is not true for one-Set, variable-Set, or Final-recall transitions.

`Complete` at a Set checkpoint means the current practice checkpoint completed. It must not imply that the Subregion is mastered or that its durable Learning milestone has already been written.

Combined checkpoints should use the same pattern, with learner-facing wording such as `Mixed practice complete` when that is truthful for the current plan stage.

### Final recall is a focused, distinct moment

Final recall should feel visually quieter and more consequential than ordinary Set practice without introducing gamification.

The center surface should emphasize:

- **Final recall**;
- the Subregion/scope;
- whole-scope traversal progress;
- the map;
- the current recall task/answer entry.

The persistent left Learning context required by current architecture remains present, but in its quietest full-scope form. It must not show mnemonic editing, Country-order authoring, current-Set semantics, or other walkthrough controls. Do not remove the rail solely because the visual reference minimizes it; the reference is expressing focus and hierarchy, while the current architecture requires lightweight orientation to persist.

The Final-recall gate should communicate the purpose in plain language, for example `One last pass through everything you've been learning`, with a primary action such as **Start final recall** and a secondary option to practise more when the existing flow allows it.

No confetti, XP, streak, badge animation, artificial suspense, or celebratory interruption is added.

### Completion uses learner language and preserves planner truth

For a durable Subregion Country Learning completion, use learner-facing achievement language such as:

```text
Countries learned
Northern Europe

You can now locate and recall all 12 countries.
We'll bring them back later so they stick.
```

For a durable Subregion Capital Learning completion, use learner-facing wording such as:

```text
Capitals learned
Northern Europe

You've connected each country with its capital.
We'll bring them back later so the links get stronger.
```

`Countries learned` and `Capitals learned` are presentation labels for the existing durable Learning milestones. Do not rename internal `countriesEstablished` / `capitalsEstablished` concepts or change readiness semantics. Do not say `mastered` merely because a Learning flow completed.

Remove generic interface narration such as `The map remains available for context while you choose what to do next.` when the interface itself already communicates that fact.

The primary completion action continues to come from the latest Today plan when the flow was launched by guided Home/Continent. The completion component does not become a planner. Review still outranks new Learning when planner truth says review is due; consolidation and later Learning likewise follow the existing Today action.

The common Country -> same-Subregion Capital handoff may present **Add the capitals** directly when that is the planner-authoritative next action.

`Learn again` remains available as the secondary restart action for the just-completed flow.

Direct Learn & Practise continues its existing same-mode/multi-Subregion run contract and must not inherit Today-planner behavior.

### Temporary Learning scopes stay truthful without architecture jargon

Temporary proficiency Learning remains non-durable and must not claim a Subregion milestone.

However, do not require the learner to understand implementation language such as `Subregion Learning milestone`. Prefer plain wording equivalent to:

```text
Learning complete

You finished this practice scope.
This run doesn't change your guided region progress.
```

The caller-owned primary action remains unchanged, and no Today recommendation is fabricated.

### Visual semantics become consistent in the touched guided path

`PRODUCT.md` defines violet as the product's permanent accent. This change should move the touched guided-path interaction hierarchy back toward that commitment without performing a broad palette rewrite.

For the surfaces changed by this spec:

- **violet** is the primary interaction/focus/current-action accent;
- **cyan** may remain for geography, map-target context, and informational map semantics where already meaningful;
- **green** indicates correct/achieved/completed state;
- **amber** indicates attention/difficulty/warning;
- **red** remains error/incorrect where already established.

Primary guided CTA buttons and focus/current-action treatment should not default to cyan merely because existing components do. Reuse or extend existing styles/tokens where possible rather than creating a second theme system.

Do not change SVG geography colors, answer-feedback semantics, map selection semantics, or unrelated World Countries/other-feature palettes as part of this work.

## Scope

- Refine Home/Continent guided information hierarchy around one planner-authoritative next action.
- Replace generic guided CTA wording with action-specific labels and truthful counts where authoritative counts already exist.
- Add a compact three-milestone Home journey projection while retaining the existing six-stage derived model.
- Simplify guided Learning rail hierarchy while preserving the rich walkthrough and compact in-session contracts already implemented.
- Refine Set/Combined checkpoints to report achieved outcome and explain the next staged action.
- Give Final recall a quieter, full-scope visual hierarchy without removing the required compact context rail.
- Replace learner-facing `Countries established` / `Capitals added` completion wording with `Countries learned` / `Capitals learned` while preserving internal milestone/readiness semantics.
- Remove low-value interface narration and implementation terminology from the touched guided path.
- Align touched primary-action/focus styling with the product's violet accent commitment.
- Add/update focused presentation and interaction tests.
- Update current-state World Countries documentation where the learner-facing composition contract changes.

## Interaction and states

### Home / Continent - review due

- The map remains the primary center surface.
- The dock names the actual next review block, for example `Review 8 items`.
- If useful, supporting copy can explain total due work and compact reason categories.
- Review reason and due metrics remain secondary to the primary action.
- Journey summary remains visible but does not compete with review urgency.

### Home / Continent - Country Learning next

- The recommendation names the actual Subregion.
- CTA is specific (`Learn 3 countries`) only when the upcoming Set size is derived from existing staged-plan truth. Do not infer the Set size from unrelated settings or approximate it from remaining Country count.
- A truthful `Learn the countries` fallback is preferable to a wrong count.

### Home / Continent - Capital Learning next

- Make the layer transition explicit: Countries are learned/established enough to add Capitals.
- Primary CTA uses **Add the capitals**.
- Do not imply the Subregion is mastered.

### Home / Continent - consolidation

- Present unfinished recall as strengthening work, not failure or punishment.
- CTA may use `Strengthen N items`, where N is the actual bounded consolidation candidate count that starts next.
- Preserve Today consolidation evidence/review behavior unchanged.

### Home / Continent - caught up but unfinished

- Keep `caught up for today` distinct from complete/mastered.
- Do not manufacture a due review.
- If the existing Today plan exposes consolidation as the next action, present that action truthfully; otherwise do not force a primary CTA just to fill the dock.

### Home / Continent - complete

- Clearly communicate that the guided core work for the scope is complete only when existing plan/progress truth supports it.
- Play and Progress remain available as secondary paths.
- Do not add new goals, streaks, achievements, or continuation work.

### Learning - walkthrough

- Keep the rich rail, order authoring, and mnemonic support.
- Use journey/task language (`Meet the countries`, `Add the capitals`) rather than system labels.
- Current Set and full Subregion remain understandable.

### Learning - Set recall

- Keep compact geography/staged-scope/full-order context.
- Current task, map, and answer dock dominate.
- No authoring/mnemonic controls.

### Learning - Combined

- Present cumulative introduced scope.
- Do not label an individual Set as current.
- Checkpoint language explains the transition to the next truthful plan stage.

### Learning - Final gate / Final recall

- Full scope is active.
- No Set-local state distinctions.
- Compact context rail remains but is visually subordinate.
- Existing repair traversal remains a session detail; it does not change the displayed geography scope.

### Learning - completion

- Achievement copy uses learner language without claiming long-term mastery.
- Guided primary action follows the latest Today plan.
- `Learn again` remains secondary.
- Direct Learn & Practise and temporary-scope completion keep their caller-owned behavior.

### Responsive and accessibility

Preserve the existing `PageLayout`, rail, `MapSurface`, and task-dock responsive behavior. Do not introduce a parallel drawer/overlay/navigation system solely for this refinement.

Required state, task, and next-action meaning must not depend on hover or color. Preserve meaningful headings/accessible names and existing keyboard behavior. Where `TaskDock` supports Enter-to-primary behavior, the visually primary action and keyboard primary action must remain the same action.

Do not reduce map usability or create avoidable scrolling just to fit explanatory copy.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- Work only on the `world-countries-learning-journey` branch for this change. Do not merge or switch this work to `main`.
- `today/` remains the owner of guided action priority, due counts, consolidation, and post-Learning completion handoff.
- `learning/` / `learning/flows/` remain the owners of staged Country/Capital Learning, checkpoints, session state, and milestone writes.
- Keep the existing six-stage journey derivation and durable milestone/readiness model. A compact Home journey is a projection/presentation, not a replacement state machine.
- Do not persist compact-journey state, current UI phase, recommended action, current Set presentation, or completion handoff.
- Do not change Today action priority, review spacing, scheduler behavior, mastery rules, Learning readiness, milestone semantics, evidence writes, answer classification, typed-answer lifecycle, or dwell timing.
- Do not change map geometry, camera intent, SVG identity, tiny-Country assistance, answer-semantic map cues, or map ownership.
- Preserve the session-context continuity established by current architecture: compact Learning context remains through Final recall.
- Preserve direct Learn & Practise semantics and temporary proficiency semantics.
- Prefer reuse/refinement of `GuidedHomeRails`, `GuidedLearningRails`, `TaskDock`, `LearningMapSurface`, staged-plan presentation helpers, and completion components over new parallel components.
- If a small shared derived presenter/helper is needed for Home journey or CTA presentation, derive it from existing plan/journey truth and keep it presentation-only.
- The visual reference defines hierarchy, density, prominence, and copy direction. It is not production HTML/CSS and must not be copied wholesale into React.

## Existing capabilities to reuse

- `src/features/world-countries/today/WorldCountriesToday.tsx` - authoritative Home/Continent plan composition, primary action launcher, and guided completion handoff.
- `src/features/world-countries/today/GuidedHomeRails.tsx` - current Home/Continent rail composition to simplify.
- `src/features/world-countries/today/journeyPresentation.ts` - authoritative six-stage derived journey and milestone/recall truth for the compact projection.
- `src/features/world-countries/today/todayPlan.ts` - authoritative action/candidate/recommendation truth; do not duplicate planner logic in presentation code.
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx` - canonical rich/compact guided Learning context rail.
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx` and `CapitalLearningFlow.tsx` - staged phase/task composition and authoritative current plan stage.
- `src/features/world-countries/learning/flows/StagedLearningReadyStep.tsx` - shared Set/Combined/Final-gate checkpoint presentation to refine.
- `src/features/world-countries/learning/flows/StagedFinalRecallStep.tsx` - existing Final-recall answer/session behavior.
- `src/features/world-countries/learning/flows/CountryLearningComplete.tsx`, `CapitalLearningComplete.tsx`, and `LearningComplete.tsx` - completion presentation and restart/handoff actions.
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx` and `LearningMapMetadata.tsx` - canonical Learning map composition/context.
- `src/features/world-countries/ui/MapSurface.tsx` / `TaskDock` - existing primary map-relative interaction surface.
- Existing focused tests alongside the components above.

## Edge cases

- **More due than the next block:** total due count and CTA block count must remain individually truthful.
- **One-Set Subregion:** avoid fake `Set 1 of 1` ceremony and do not promise Combined work that the staged plan does not contain.
- **Variable Set sizes:** derive any learner-visible item count from actual staged membership, not only the configured maximum.
- **Set size equals full scope:** do not manufacture a current-Set/full-Subregion distinction that adds no information.
- **Combined stage contains all Countries:** it is still Combined until the flow reaches Final recall; label the phase truthfully.
- **Final repair traversal:** compact rail still presents the full Learning scope; repair mode remains task/session detail.
- **Inspected Subregion differs from guided Subregion:** preserve existing transient inspection semantics and make the real guided next action clear without mutating planner state.
- **Evidence loading/error:** keep the map/shell stable and use truthful loading/error copy; do not fabricate journey or CTA counts.
- **No active Countries:** retain the existing no-scope behavior and do not show a learning CTA.
- **Guided Country completion followed by review rather than Capitals:** planner priority wins. Do not hard-code the visual-reference happy path.
- **Guided Country completion followed by same-Subregion Capitals:** use the direct `Add the capitals` handoff when planner truth supports it.
- **Temporary proficiency scope:** use non-milestone learner copy and preserve caller-owned navigation.
- **Direct multi-Subregion Learn & Practise:** continue the chosen Learning mode according to its existing run coordinator rather than switching layers based on Home journey presentation.
- **Already-mastered fallback:** compact journey/CTA must reflect existing planner/readiness truth rather than requiring a missing durable milestone solely for presentation.

## Out of scope

- Planner or curriculum redesign.
- Changing the six-stage journey's underlying derivation/state semantics.
- New Learning activities, review algorithms, evidence types, scheduler rules, mastery thresholds, or persistence.
- Broad Play, Progress, Drill, Recite, Quiz, or Settings redesign.
- Search, goals, streaks, achievements, XP, notifications, social features, or account/backend work.
- Broad map palette/geometry/camera/label behavior changes.
- New mobile navigation or responsive architecture.
- Removing Country-order authoring or mnemonic functionality.
- Adding telemetry; the product remains no-telemetry.
- Merging `world-countries-learning-journey` to `main`.

## Acceptance criteria

- [x] Home/Continent keeps the map dominant and the attached task dock as the single primary action surface.
- [x] Review, Learning, and consolidation primary CTAs describe the actual action that starts next rather than generic `Continue review` / `Continue learning` wording.
- [x] Any learner-visible item count is derived from authoritative actual candidates/staged membership; the UI uses a non-count fallback when a count cannot be derived truthfully.
- [x] Home/Continent default journey presentation is reduced to a clear Countries / Capitals / Mastery summary derived from existing journey/milestone/recall truth.
- [x] The compact journey does not add persisted journey state or replace the existing six-stage journey derivation.
- [x] Review-due reasons/counts remain useful but visually secondary to the map and primary action.
- [x] Walkthrough retains rich geography, Set/order, authoring, and mnemonic context while reducing redundant system-oriented labels/cards.
- [x] Non-walkthrough Learning retains the existing compact context rail and truthful Set/combined/final scope semantics.
- [x] Final recall retains a quiet full-scope context rail and does not expose Set-local, mnemonic, or authoring controls.
- [x] Set checkpoints use outcome-based learner wording and clearly explain the next staged action without overclaiming mastery.
- [x] Combined checkpoints use truthful cumulative-practice wording and staged-plan next actions.
- [x] Final-recall gate copy clearly communicates the purpose and primary start action without adding gamification.
- [x] Durable Country completion is learner-facing `Countries learned` (or equivalent approved learner wording) while internal Country-establishment/readiness semantics remain unchanged.
- [x] Durable Capital completion is learner-facing `Capitals learned` (or equivalent approved learner wording) without implying core mastery.
- [x] Temporary Learning completion avoids architecture jargon and still clearly states that the run does not change guided region progress.
- [x] Guided completion continues to follow the latest Today plan; direct Learn & Practise and temporary Learning keep their existing caller-owned behavior.
- [x] `Learn again` remains available as the secondary restart action on Learning completion.
- [x] Generic explanatory interface narration such as the existing map-availability sentence is removed where redundant.
- [x] Touched guided-path primary-action/focus styling follows the product's violet accent commitment while existing semantic map/feedback colors retain their meanings.
- [x] Required meaning is not conveyed by color alone, and existing keyboard/focus/accessible-name behavior is preserved.
- [x] No planner, scheduler, evidence, mastery, milestone, answer-lifecycle, map, or persistence behavior changes as a side effect of the UX refinement.
- [x] Focused automated tests cover the changed Home CTA/journey projection, guided Learning rail semantics, checkpoint copy/actions, Final-recall presentation contract, and completion copy/handoff regressions.

## Source anchors

- `PRODUCT.md`
- `src/features/world-countries/AGENTS.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/WorldCountriesToday.test.tsx`
- `src/features/world-countries/today/GuidedHomeRails.tsx`
- `src/features/world-countries/today/GuidedHomeRails.test.tsx`
- `src/features/world-countries/today/journeyPresentation.ts`
- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.test.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.test.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.test.tsx`
- `src/features/world-countries/learning/flows/StagedLearningReadyStep.tsx`
- `src/features/world-countries/learning/flows/StagedLearningReadyStep.test.tsx`
- `src/features/world-countries/learning/flows/StagedFinalRecallStep.tsx`
- `src/features/world-countries/learning/flows/StagedFinalRecallStep.test.tsx`
- `src/features/world-countries/learning/flows/CountryLearningComplete.tsx`
- `src/features/world-countries/learning/flows/CountryLearningComplete.test.ts`
- `src/features/world-countries/learning/flows/CapitalLearningComplete.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningComplete.test.tsx`
- `src/features/world-countries/learning/flows/LearningComplete.tsx`
- `src/features/world-countries/learning/flows/LearningComplete.test.tsx`
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `docs/changes/0061-world-countries-guided-learning-ux-refinement-visual-reference.html`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` only where necessary to describe the current-state learner-facing composition after implementation:

- Home's default journey support is a compact projection over the existing six-stage journey rather than the full six-stage list always being prominent;
- guided primary actions use action-specific learner labels while Today remains authoritative for their meaning;
- guided Learning retains rich walkthrough context and compact recall/final context with reduced visual hierarchy;
- durable Learning completion may be presented as `Countries learned` / `Capitals learned` while internal establishment/readiness semantics remain unchanged.

Do not copy detailed visual styling, mockup dimensions, or Change Spec rationale into architecture documentation.

## Verification

Complete this section when setting the status to `Implemented`.

Expected risk-proportionate evidence:

- focused `GuidedHomeRails` and `WorldCountriesToday` tests for specific CTA labels/count truth, review-due/caught-up/complete states, and compact journey projection;
- focused `GuidedLearningRails` and Country/Capital flow tests for retained rich walkthrough context, compact active context, Combined scope, and quiet full-scope Final recall;
- focused `StagedLearningReadyStep` tests for outcome-based Set/Combined checkpoint copy and next-action behavior;
- focused Country/Capital/Learning completion tests for `learned` learner copy, temporary-scope wording, `Learn again`, and unchanged Today/direct-run handoff behavior;
- nearest map/task-dock tests only when their props/contracts are actually changed.

Start with the focused touched tests. Widen to the World Countries feature slice only if shared presentation seams or failures justify it. Run `git diff --check`. Run lint/typecheck when materially relevant to the changed contracts; report unrelated pre-existing failures rather than fixing them.

Browser/manual verification is not required by default. Do not start or troubleshoot a dev server solely for optional verification.

Recorded verification:

- Focused touched tests: 11 files, 88 tests passed.
- World Countries feature slice: `npx.cmd vitest run src/features/world-countries` — 115 files, 812 tests passed.
- Repository suite: `npm.cmd test` — 150 files, 1,023 tests passed.
- `npm.cmd run lint` — passed.
- `npm.cmd run typecheck` — the repository baseline still reports an unrelated existing error in `src/features/world-countries/drill/DrillSetup.test.tsx` (`Map<any, any>` is not assignable to `Map<string, never>`); no touched guided-learning file is implicated.
- `git diff --check` — passed.
- Browser/manual verification was not run, as permitted by this spec and repository instructions.
