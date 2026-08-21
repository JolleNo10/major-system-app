# Change Spec 0017 - Uniform World Countries typed-answer interaction

- **Status:** Implemented
- **Date:** 2026-08-21
- **Issue:** None.
- **Related ADRs:** [ADR 0026](../adr/0026-isolate-world-countries-recite-outcomes-from-drill-evidence.md), [ADR 0027](../adr/0027-world-countries-derived-review-and-today-orchestration.md)
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md), [Core](../architecture/CORE.md)
- **Supersedes in part:** Change Spec 0012 where it requires explicit Continue/Next after a resolved Recite prompt.
- **Clarifies in part:** Change Spec 0010's native-submit and keyboard/focus requirements remain in force for the unified seam.

## Goal

Give every primary keyboard-typed answer in World Countries one consistent interaction model, using typed **Drill -> Drill** as the behavioral reference.

The learner should not have to learn different submit, feedback, focus, or continuation behavior depending on whether the same typed recall occurs in Drill, Learn & Practise, Today, Learning, or Recite.

Workflow owners retain their distinct evidence, retry, scheduling, outcome, and completion semantics. Shared answer interaction must not turn the workflows into one shared domain workflow.

## User-visible behavior

The following primary typed-recall surfaces use the same answer presentation and keyboard conventions:

- Drill -> Drill typed recall;
- Drill -> Learn & Practise -> standalone typed Practice;
- Learn Countries -> Set Practice;
- Learn Countries -> Combined Practice;
- Learn Countries -> Final Recall;
- Learn Capitals -> Set Practice;
- Learn Capitals -> Combined Practice;
- Learn Capitals -> Final Recall;
- Today Review;
- Recite -> Countries;
- Recite -> Countries + Capitals;
- Recite -> Countries from Capitals.

Location-click and other non-typing interactions are not part of this contract.

Every active typed prompt presents the established Drill-style answer field:

```text
[ Type the country/capital...             ][ Check ↵ ]
```

`Enter` submits the active answer.

Blank answers do nothing.

A submitted answer cannot be submitted twice while feedback is active.

The next typed prompt receives focus automatically.

The shared interaction seam identifies each prompt with an owner-provided
`promptKey`. A new prompt always starts with an empty value and no prior
feedback, even when the underlying input component remains mounted. Returning
to the same Recite prompt after an incorrect answer is a state transition, not
a new prompt, but it still resets and focuses the answer field after the retry
dwell.

The shared seam must preserve native submit semantics. Enter and the Check
button use the same submission path, and a native form submit must not be
replaced by a workflow-specific keydown-only implementation. If
`core/ui/TypingInput` needs a generic compatibility extension to support this,
that extension must remain feature-independent.

### Exact correct

An exact correct answer:

1. enters the established positive answer-field state;
2. shows concise accessible correct feedback;
3. remains visible for the established Drill success dwell of **500 ms**;
4. automatically performs the owning workflow's next transition.

There is no generic **Continue** button and no second Enter press.

Examples:

```text
Drill:
answer -> Correct -> 500 ms -> next Drill prompt

Today:
answer -> Correct -> 500 ms -> next Today queue prompt

Countries + Capitals Recite:
Country correct -> 500 ms -> Capital prompt

Recite:
last required answer correct -> 500 ms -> Recite completion
```

### Incorrect - Drill, Today and Learning

For Drill, Today Review, standalone typed Practice, Learning Set/Combined Practice, and Learning Final Recall, an incorrect answer follows the established Drill behavior:

1. enter the established negative answer-field state;
2. expose the canonical correction through the normal feedback presentation;
3. hold corrective feedback for **1800 ms**;
4. automatically perform the owning workflow's incorrect-answer transition.

There is no generic Continue button.

The owning workflow still decides what the incorrect result means.

Examples:

- Drill advances its session according to existing Drill mechanics;
- Today advances its queue and may schedule its existing delayed retry;
- Learning Practice advances its existing scheduler;
- Final Recall applies its existing repair/rewind semantics.

### Incorrect - Recite retry

Recite intentionally retains different incorrect-answer semantics.

An incorrect Recite answer:

1. enters the same negative answer-field presentation used elsewhere;
2. shows concise incorrect feedback;
3. **does not reveal the expected answer**;
4. does not resolve or advance the prompt;
5. retains the existing incorrect-attempt/recovery state;
6. after the feedback dwell, resets and focuses the same prompt for another attempt.

The learner does not press Continue to retry.

Repeated incorrect attempts remain allowed.

A later correct answer without Reveal/Skip resolves the prompt as `recovered`.

This is an intentional Recite workflow-semantic exception. It must not result in a separate bespoke input, Enter, focus, or generic post-answer continuation implementation.

### Fuzzy accepted answer

All primary typed World Countries recall uses the same exact / fuzzy / incorrect distinction.

A fuzzy accepted answer follows the existing Drill behavior:

1. count the answer according to the owning workflow's existing accepted-answer semantics;
2. show the canonical spelling;
3. expose the existing spelling-remediation controls;
4. do not run the ordinary 500 ms automatic transition while spelling remediation is active;
5. continue through the existing fuzzy-remediation action.

Today and Recite must not silently collapse a fuzzy match into indistinguishable exact-correct feedback.

Fuzzy spelling remediation is the deliberate exception to automatic correct-answer advancement.

For Recite, showing the canonical spelling during fuzzy remediation is allowed
because the answer is accepted and the learner is being shown the spelling
correction. This does not change the rule that ordinary incorrect Recite
feedback never reveals the expected answer.

### Today delayed retry Skip

For a Today `retry` prompt, **Skip for now** remains available as a secondary action while the prompt is answerable.

Selecting it:

- records no fabricated answer attempt;
- leaves the target unresolved;
- advances the Today queue.

After the learner submits an answer, ordinary answer feedback owns the transition; do not show post-answer Continue or Skip controls.

Initial Today prompts do not gain a new pre-answer Skip action.

### Recite Reveal / Skip

Reveal / Skip remains available while a Recite prompt is answerable.

Selecting it:

1. resolves the prompt as `revealed`;
2. displays the expected answer;
3. applies existing Reveal-as-you-go map behavior where applicable;
4. holds the revealed answer for the corrective-feedback dwell;
5. automatically advances.

Do not show a separate **Next** button.

### Feedback-owned state

While an automatic feedback dwell is active:

- answer input is disabled;
- repeated Enter cannot advance early;
- repeated clicks cannot submit again;
- global safe-Enter handling must not trigger another action.

The dwell owns the transition.

When the transition reaches another typed prompt, that prompt receives focus.

## Shared interaction seam

Create one feature-local, workflow-neutral typed-answer seam under the World
Countries feature UI boundary. It may wrap `core/ui/TypingInput`, but it owns
the shared typed-answer lifecycle rather than merely duplicating markup.

The seam uses explicit conceptual states:

```text
ANSWERABLE
  -> EXACT_FEEDBACK
  -> INCORRECT_FEEDBACK
  -> FUZZY_REMEDIATION
  -> REVEALED_FEEDBACK
```

Only the states valid for the owning workflow are reachable. In particular,
Recite transitions from `INCORRECT_FEEDBACK` back to `ANSWERABLE` for the same
prompt, while Drill, Today, Learning, and Final Recall transition out of
incorrect feedback after the correction dwell.

The seam owns:

- editable value and blank-answer prevention;
- Enter, Check, and native-submit deduplication;
- positive/negative field state and accessible `RecallFeedback` presentation;
- the shared 500 ms and 1800 ms lifecycle;
- prompt-key reset and focus restoration;
- timer cleanup, stale-transition invalidation, and exactly-once transition
  callbacks.

The seam receives an explicit accessible answer label from the workflow. The
placeholder is visual guidance and is not the only accessible name.

The initial answer callback receives the trimmed answer and measured latency so
owners can immediately record evidence or update scheduler state. A separate
transition callback fires once, after the appropriate dwell or explicit fuzzy
remediation action. It must not fire after unmount, prompt replacement, exit,
or another invalidating owner transition.

Workflow-specific answerable actions may be supplied through the seam for
Today delayed-retry Skip and Recite Reveal/Skip. They are hidden during
ordinary feedback. The seam must not expose a generic post-answer Continue or
Next action.

The seam accepts a purpose-neutral result model that distinguishes `exact`,
`fuzzy`, `incorrect`, and `revealed` outcomes. Workflow owners remain
responsible for producing the result, canonical answer, feedback copy,
disclosure policy, and transition meaning. In particular, owners explicitly
control whether the expected answer may be shown; the seam must not infer
answer disclosure from the result alone.

## Scope

- Establish one primary typed-answer interaction contract across World Countries.
- Model that contract on current typed Drill -> Drill behavior.
- Consolidate duplicated answer entry, Enter handling, feedback state, focus behavior, and common feedback timing.
- Include typed answer flows under both Drill purposes: Drill and Learn & Practise.
- Preserve each workflow's existing answer classification and domain outcome semantics unless explicitly changed by this spec.
- Remove generic post-answer Continue/Next interaction from Today and Recite.
- Bring Today and Recite fuzzy-answer presentation into line with Drill.
- Preserve Recite same-prompt recovery.
- Preserve Today delayed-retry scheduling.
- Preserve Learning scheduler and Final Recall repair behavior.
- Add keyboard-focused regression coverage for every primary typed workflow.

## Interaction and states

The common interaction model has these conceptual states:

```text
ANSWERABLE
   |
   +-- exact correct --> CORRECT FEEDBACK --> automatic workflow transition
   |
   +-- fuzzy correct --> FUZZY REMEDIATION --> explicit remediation completion
   |
   +-- incorrect ----->
          |
          +-- Drill / Today / Learning --> CORRECTION --> automatic workflow transition
          |
          +-- Recite -------------------> RETRY FEEDBACK --> ANSWERABLE same prompt
```

Recite Reveal adds:

```text
ANSWERABLE
   |
 Reveal / Skip
   |
REVEALED FEEDBACK
   |
automatic workflow transition
```

Generic Continue/Next is not an answer-feedback state.

### Timing

Use one World Countries definition of the established Drill feedback timing:

- exact success: **500 ms**
- correction/reveal: **1800 ms**

Do not maintain separate copies of these constants in Drill, Learning Practice, Final Recall, Today, and Recite.

The Recite retry reset must use the shared feedback lifecycle rather than a separate form-remount keyboard implementation.

## Architecture constraints

Follow the current World Countries and Core architecture plus ADR 0026 and ADR 0027.

- `drill/`, `today/`, `learning/flows/`, and `recite/` remain separate workflow owners.
- Do not solve consistency by importing `DrillSession` or other `drill/` implementation into sibling workflows.
- Workflow-specific evidence recording, queue mutation, Recite outcomes, Learning scheduler progression, and milestone behavior remain with their existing owners.
- Reuse `core/ui/TypingInput` as the generic typed-answer input seam rather than maintaining feature-specific `<input>` / `<form>` / Enter implementations for primary typed recall.
- `core/ui/TypingInput` must remain feature-independent and must not learn Country, Today, Drill, Learning, or Recite semantics.
- `core/ui/TypingInput` must remain backward-compatible. Generic additions are
  allowed only when needed to preserve native form submission, explicit
  accessible labeling, or another cross-feature input capability; it must not
  learn World Countries outcome or workflow semantics.
- Reuse `learning/recallAnswerMatching.ts` for exact/fuzzy/incorrect classification.
- Shared World Countries feedback timing and purpose-neutral typed-recall presentation/lifecycle must have one feature-local implementation where consolidation is required.
- The feature-local seam must be the single owner of typed-answer feedback state,
  reset, focus, timing, and stale-transition cancellation. Workflow owners must
  not retain parallel timer/focus/Enter state machines after migration.
- A shared interaction seam receives workflow transitions through data/callbacks; it must not own evidence, scheduling, Recite outcome, Today queue, or Learning milestone policy.
- Do not duplicate the same timer/focus/Enter state machine independently across workflows.
- Preserve Practice's non-recording behavior.
- Preserve Today's ordinary `recall` evidence writes.
- Preserve Recite's isolation from Drill evidence and Learning milestones.
- No persistence schema or storage-key change.
- No new generic cross-feature learning/SRS abstraction.

## Existing capabilities to reuse

### Generic input

`src/core/ui/TypingInput.tsx`

This is the established Drill answer-entry control and already owns:

- editable value;
- blank-answer prevention;
- Enter submission;
- Check button;
- active/correct/incorrect field presentation;
- disabling after resolution;
- focus when returning to an answerable state.

Extend it only if a genuinely generic UI capability is missing.

### Answer classification

`src/features/world-countries/learning/recallAnswerMatching.ts`

Remain authoritative for Country/Capital exact, fuzzy, alias, normalization, and diacritic behavior.

### Feedback

`src/core/ui/RecallFeedback.tsx`

Reuse the established accessible recall-feedback presentation.

### Fuzzy remediation

`src/features/world-countries/ui/MiniSpellingPractice.tsx`

Reuse the existing spelling-remediation controls; do not invent Today- or Recite-specific fuzzy behavior.

### Behavioral reference

`src/features/world-countries/drill/DrillSession.tsx`

Typed Drill -> Drill is the reference for:

- submit behavior;
- success dwell;
- correction dwell;
- fuzzy remediation;
- automatic progression;
- field feedback.

Reuse its behavior through purpose-neutral seams rather than creating dependencies on `drill/`.

### Workflow transitions

Keep domain transitions with their current owners:

- Today: `today/reviewQueue.ts`
- Drill and standalone Practice: existing Drill session state/mechanics
- Learning Set/Combined Practice: existing scheduler session
- Learning Final Recall: existing ordered recall session
- Recite: `recite/reciteSession.ts`

## Edge cases

- Blank input does not submit.
- Enter and Check produce identical results.
- Multiple Enter presses cannot double-record an answer.
- Leaving/unmounting during feedback cancels pending UI transition work; already committed evidence follows the owning workflow's existing persistence semantics.
- A new prompt never inherits the prior text value or feedback state.
- Fuzzy matching disabled means only exact/normal accepted matching takes the normal accepted path.
- Fuzzy matching enabled gives the same remediation behavior in Today, Drill, Learning, Practice, and Recite.
- Recite may receive unlimited incorrect retries.
- Recite incorrect feedback never exposes the correct answer.
- Recite Reveal after any number of incorrect attempts yields `revealed`.
- Recite correct after one or more incorrect attempts yields `recovered`.
- Recite first-attempt correct remains `recalled`.
- In Countries + Capitals Recite, Country success automatically reaches the Capital prompt after feedback; Capital success automatically reaches the next Country.
- Last Recite answer automatically reaches completion and persists the completed run exactly once.
- Reveal on the final Recite prompt automatically reaches completion after the reveal dwell.
- Today initial incorrect still participates in existing delayed-retry insertion rules.
- Today delayed-retry Skip records no answer.
- Today delayed-retry incorrect does not create another retry.
- Learning Final Recall retains existing repair traversal behavior after an incorrect answer.
- Timer-owned feedback does not respond to global safe Enter.
- Fuzzy remediation/overlay retains keyboard precedence over global shortcuts.
- Location-click Practice remains unchanged and outside this typed-answer contract.

## Out of scope

- Multiple-choice answer interaction.
- Map-click Practice.
- Mini spelling exercise internals.
- Geography/order/mnemonic editing inputs.
- Changing the global answer-mode setting.
- Changing answer normalization or fuzzy thresholds.
- Changing Today scheduling or interval policy.
- Changing Drill evidence semantics or proficiency.
- Changing Learning milestones or scheduler policy.
- Removing Recite retries.
- Changing Recite `recalled / recovered / revealed` outcome meanings.
- Changing Recite persistence.
- Map palette/status changes.
- Layout, rail, or map geometry changes.

## Acceptance criteria

- [ ] Every primary World Countries typed-recall surface uses the established shared typed-answer presentation.
- [ ] Coverage includes Drill -> Drill, Drill -> Learn & Practise typed Practice, Learning Set/Combined Practice, Learning Final Recall, Today Review, and all three Recite modes.
- [ ] Enter submits the active answer in every primary typed-recall surface.
- [ ] Check and Enter have identical submission semantics.
- [ ] Native form submission remains supported through the shared generic seam; no workflow replaces it with a keydown-only implementation.
- [ ] Each input has an explicit accessible answer label independent of its placeholder.
- [ ] A new owner-provided prompt key clears prior text and feedback; Recite same-prompt retry also clears and refocuses after its dwell.
- [ ] Exact correct answers show positive feedback and automatically transition after the shared 500 ms dwell.
- [ ] No ordinary exact-correct typed answer renders a generic Continue button.
- [ ] No ordinary exact-correct typed answer requires a second Enter press.
- [ ] Drill/Today/Learning consuming incorrect answers show corrective feedback and automatically transition after the shared 1800 ms dwell.
- [ ] Recite incorrect answers do not advance or reveal the answer.
- [ ] Recite automatically returns the same prompt to an answerable/focused state after incorrect feedback.
- [ ] Recite recovery and reveal outcome semantics remain unchanged.
- [ ] Recite correct answers automatically transition after feedback.
- [ ] Recite Reveal/Skip automatically transitions after revealed-answer feedback and renders no Next button.
- [ ] Countries + Capitals Recite automatically moves Country -> Capital -> next Country without generic continuation actions.
- [ ] The final Recite prompt automatically reaches completion after feedback.
- [ ] Today correct answers automatically advance.
- [ ] Today incorrect answers automatically invoke the existing incorrect queue transition.
- [ ] Today delayed-retry Skip is available before answering and records no fabricated attempt.
- [ ] Today does not render post-answer Continue/Skip controls.
- [ ] Fuzzy accepted answers use the established Drill spelling-remediation behavior in Today, Drill, Learning, Practice, and Recite.
- [ ] Fuzzy remediation remains the only accepted-answer path requiring an explicit remediation continuation.
- [ ] The shared seam represents exact, fuzzy, incorrect, and revealed outcomes explicitly and applies the owner-provided disclosure policy.
- [ ] Practice remains non-recording.
- [ ] Today evidence semantics remain unchanged.
- [ ] Recite remains isolated from Drill evidence and Learning milestones.
- [ ] Shared success/correction timing is defined once rather than duplicated by workflow.
- [ ] The shared seam owns feedback state, timing, reset, focus, and stale-transition cancellation; workflow owners do not retain parallel lifecycle state machines.
- [ ] Primary typed-answer workflows do not maintain separate bespoke Enter/form/focus implementations where the shared seam provides them.
- [ ] Repeated Enter cannot double-submit or bypass feedback dwell.
- [ ] A transition callback fires at most once and never fires after unmount, exit, prompt replacement, or timer cancellation.
- [ ] Focus moves automatically to the next answerable typed prompt.
- [ ] Existing alias, normalization, fuzzy-setting, queue, scheduler, repair, and Recite-outcome tests continue to pass except where interaction expectations are explicitly changed here.
- [ ] Focused tests cover keyboard submission and automatic transition for Today, Drill, standalone typed Practice, Learning Practice, Final Recall, and all three Recite modes.
- [ ] World Countries feature tests and typecheck pass.

## Source anchors

- `src/core/ui/TypingInput.tsx`
- `src/core/ui/RecallFeedback.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/today/reviewQueue.ts`
- `src/features/world-countries/learning/recallAnswerMatching.ts`
- `src/features/world-countries/learning/flows/SchedulerPracticeStep.tsx`
- `src/features/world-countries/learning/flows/StagedFinalRecallStep.tsx`
- `src/features/world-countries/ui/MiniSpellingPractice.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
- `src/features/world-countries/recite/reciteSession.ts`
- the new feature-local typed-answer lifecycle seam under
  `src/features/world-countries/ui/`

## Documentation impact

When implemented:

- update `docs/architecture/features/WORLD_COUNTRIES.md` with the unified primary typed-answer contract;
- state that workflow-specific progression/evidence remains workflow-owned;
- state the Recite incorrect same-prompt retry exception;
- state that resolved typed prompts normally transition automatically after feedback;
- state that the unified seam preserves native submit semantics and explicit
  accessible answer labels;
- note that Change Spec 0017 supersedes Change Spec 0012's explicit Recite Continue/Next requirements.

No persistence documentation change is expected.

No `CORE.md` change is required unless implementation materially changes the generic `TypingInput` public contract.

No new ADR is required.

## Verification

Complete when implemented:

```text
focused shared-lifecycle tests for exact, incorrect, fuzzy, reveal, retry,
prompt reset, focus, duplicate submission, native submit, and cancellation
focused typed-answer/keyboard tests
npx vitest run src/features/world-countries
npm run typecheck

manual keyboard pass across:
  Today Review
  Drill -> Drill typed recall
  Drill -> Learn & Practise -> standalone typed Practice
  Learn Countries -> Set Practice / Combined Practice / Final Recall
  Learn Capitals -> Set Practice / Combined Practice / Final Recall
  Recite -> Countries
  Recite -> Countries + Capitals
  Recite -> Countries from Capitals
```

Implementation evidence: the feature-local `WorldCountriesTypedAnswer` seam
now owns native-submit deduplication, prompt reset/focus, feedback timing,
fuzzy remediation, reveal/retry lifecycle, and stale-transition cancellation.
All primary typed World Countries owners delegate to it, while workflow
evidence and progression remain owner-controlled. Verified with:

- `npx vitest run --no-cache --no-file-parallelism src/features/world-countries`
  (78 files, 320 tests passing)
- `npm run typecheck`
