# Change Spec 0062 - World Countries guided UX hierarchy corrections

- **Status:** Implemented
- **Date:** 2026-09-10
- **Issue:** None.
- **Related ADRs:** None. This is a presentation and interaction refinement within the existing World Countries architecture.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Finish the learner-facing UX direction started by Change Spec 0061 by removing the remaining implementation-shaped learning language, simplifying the Home and Learning rails, and cleanly separating **what Today recommends now** from **where an inspected Subregion sits in its learning journey**. The learner should experience one coherent path—Meet, Find, Recall, Mix, Final recall—while the map and task dock remain dominant and all planner, learning, review, evidence, milestone, and persistence behavior stays unchanged.

Change Spec 0061 remains an implemented historical record. This Change Spec corrects the remaining UX hierarchy and mental-model gaps found in review of its implementation.

The accompanying `0062-world-countries-guided-ux-hierarchy-corrections-visual-reference.html` is the visual/hierarchy reference for this follow-up. Reproduce its hierarchy through existing production components; do not port its standalone HTML/CSS into the app.

## User-visible behavior

### 1. Learning uses learner concepts, not internal step numbering

Country Learning presents a simple learner-facing sequence:

```text
Meet the countries -> Find the countries -> Recall the countries -> Mix what you've learned -> Final recall
```

Capital Learning presents:

```text
Meet the capitals -> Recall the capitals -> Mix what you've learned -> Final recall
```

Internal phases, stage indexes, Set mechanics, scheduler mechanics, and state-machine names remain unchanged.

Do not present active learning as `Step 2`, `Step 3`, or similar numbered implementation steps. Set number remains useful secondary context when the plan contains multiple Sets, for example:

```text
Find the countries
Set 2 · 3 countries
```

rather than:

```text
Set 2 · Step 2 - Locate
```

The center task should use direct task language:

- Country walkthrough: `Meet the countries`;
- Country location recall: `Find the countries` / cue `Find Norway`;
- Country typed recall: `Recall the countries` / cue `Name the country`;
- Country Combined: `Mix what you've learned` / cue `Name the country`;
- Capital walkthrough: `Meet the capitals`;
- Capital typed recall: `Recall the capitals` / cue `Name the capital`;
- Capital Combined: `Mix what you've learned` / cue `Name the capital`;
- Final: `Final recall`.

Do not rename internal phase enums or persistence/state concepts merely to match learner copy.

### 2. Walkthrough rail becomes one coherent orientation surface

The walkthrough left rail keeps the capabilities already present—geography context, Set context, full Country order, Country-order authoring, and eligible mnemonic support—but removes the current stack of explanatory system cards.

The default hierarchy should read approximately:

```text
World / Europe / Northern Europe

Northern Europe
Set 1 of 3 · 3 countries

Learning order
1. Norway          Current
2. Sweden
3. Finland
4. Denmark         Later
...
```

The standalone bordered `Learning progress` card should not remain. The separate bordered stage card should not remain when its only purpose is to repeat information already communicated by the region, Set, task header, and learning order.

For one-Set scopes, avoid ceremony such as `Set 1 of 1` when it adds no orientation value. A compact count such as `3 countries` is enough.

Order editing remains available only in the existing eligible walkthrough context. Mnemonics remain in the existing right-rail context. Do not remove these capabilities.

### 3. Active recall rail stays compact and subordinate

During Find, Recall, Combined/Mix, and Final recall, preserve the compact Learning context rail required by current architecture, but keep it visually quiet.

It should answer only:

- which geography is active;
- which scope is active now;
- where the active Countries sit in the full Subregion order.

The rail must not repeat task progress already visible in the task/session surface. Do not add back mnemonic editing or order authoring outside walkthrough.

Set-local phases may identify `Set 2 of 3` as secondary context. Combined phases use cumulative introduced scope. Final recall uses the full Subregion scope and no current/previous/upcoming Set semantics.

### 4. Home separates Today's action from the inspected region's journey

The attached map `TaskDock` owns **what the learner should do now**. The compact journey owns **where the displayed Subregion is in its curriculum**. These are different concepts and must not share a single `Next:` label.

The compact journey must derive its own region-local next milestone/action from the journey it displays. Example:

```text
YOUR JOURNEY
Northern Europe

✓ Countries      Complete
● Capitals       Current
○ Mastery        Upcoming

Next in journey: Add the capitals
```

Do not pass the global Today primary-action label into the journey presenter.

Examples of Today dock actions remain:

- `Review 8 items`;
- `Learn 3 countries`;
- `Add the capitals`;
- `Strengthen 6 items`.

The dock may show a short context/status line above the action when needed to make scope obvious, for example:

```text
Northern Europe is next
[ Learn 3 countries ]
```

or:

```text
8 reviews are ready
[ Review 8 items ]
```

Reuse `TaskDock.status` rather than creating a new dock component if it fits the existing contract.

### 5. Inspecting another Subregion never makes the guided action ambiguous

On a Continent hub, clicking a different Subregion continues to be transient inspection only; it does not mutate planner state.

If Today is guiding Northern Europe while the learner inspects Southern Europe:

- the journey card shows **Southern Europe's** Countries / Capitals / Mastery state;
- any `Next in journey:` line refers only to **Southern Europe**;
- the UI clearly states that the guided next action remains in **Northern Europe**;
- the attached Today dock must remain unambiguous about the action/scope it will actually launch;
- a compact `Back to Northern Europe` / equivalent return control remains available;
- pressing the primary dock action still launches the planner-authoritative Northern Europe work.

The UI must never produce a composition equivalent to:

```text
Journey · Southern Europe
Next: Learn 3 countries
```

when those 3 Countries belong to Northern Europe.

### 6. Home right rail is supporting context, not a second command center

When evidence is ready and an actionable Today plan exists, remove the current prominent `Continue` section as a separate concept. The attached task dock already owns continuation.

The normal right-rail hierarchy should be approximately:

```text
YOUR JOURNEY
Northern Europe
✓ Countries
● Capitals
○ Mastery
Next in journey: Add the capitals

WHY REVIEW NOW          only when relevant
4 first reviews · 2 recent mistakes

Play        Progress
```

Do not preserve the current combination of a prominent `Continue` heading, status paragraph, multiple review statistic cards, `Why now`, journey block, and secondary actions all at equal weight.

Review information remains useful but compact:

- reason summary may be one concise line;
- total due count and next-block count remain truthful and distinct where needed;
- repeated-problem warning may remain when meaningful;
- avoid two boxed metric cards merely to show `Reviews` and `Countries` unless a state genuinely needs that level of detail.

Loading, error, no-country, caught-up, and complete states still need truthful status communication. The removal of the normal actionable `Continue` block must not hide those exceptional states.

### 7. Map copy reflects inspection, not false curriculum choice

Home/Continent map copy must not tell the learner they can choose the guided learning path by clicking geography when clicking only changes inspection.

Replace copy equivalent to:

```text
Explore the map to see your progress and choose where to learn.
```

with truthful inspection-oriented copy, for example:

```text
Explore the map to see what you've learned and what's still ahead.
```

The left geography rail may continue to invite selecting a Continent/Subregion to inspect its progress/journey.

### 8. Preserve the parts of 0061 that are already correct

Do not regress the successful 0061 implementation:

- action-specific Today CTAs;
- review CTA count derived from the actual bounded review queue;
- consolidation CTA count derived from the actual bounded consolidation queue;
- Country Learning count derived from the actual first staged Set, with truthful fallback;
- violet primary-action/focus styling;
- `Countries learned` / `Capitals learned` completion language;
- temporary-scope completion wording;
- planner-authoritative completion handoff;
- `Learn again` as secondary completion action;
- compact context through Final recall;
- checkpoint outcome wording and Final-recall gate wording;
- no new persisted journey or UI state.

## Scope

- Replace learner-visible `Step N` learning labels with the approved learner mental model across Country and Capital guided Learning presentation.
- Simplify the walkthrough rail into one coherent geography/Set/order hierarchy while preserving authoring and mnemonic capabilities.
- Keep active recall and Final recall rails compact and subordinate.
- Decouple the compact journey's region-local next step from the global Today primary action.
- Make inspected-Subregion vs guided-Subregion composition unambiguous, including the attached task dock.
- Reduce normal actionable Home/Continent right-rail density.
- Correct map explanatory copy that currently implies map inspection chooses the guided learning path.
- Update focused tests and current-state documentation for the corrected presentation contract.

## Interaction and states

### Home - guided Learning action

The map remains dominant. The dock presents the actual planner action and enough scope context to make the target clear. The journey rail presents the displayed Subregion's curriculum state independently.

### Home - review due

The dock owns `Review N items`. A compact supporting line may summarize why those items are ready. Do not duplicate the same action as a prominent rail command.

### Home - inspected Subregion differs from guided Subregion

Show inspected journey locally and guided action globally. Both regions must be explicitly attributable. The primary action remains planner-authoritative.

### Home - caught up / complete / loading / error

Use a compact status block when there is no normal actionable dock or when status itself is the important information. Do not remove necessary loading/error/caught-up/complete explanation in pursuit of minimalism.

### Country Learning

Learner-facing phase language follows Meet -> Find -> Recall -> Mix -> Final recall. Set identity is secondary orientation only.

### Capital Learning

Learner-facing phase language follows Meet the capitals -> Recall the capitals -> Mix -> Final recall. Set identity is secondary orientation only.

### Walkthrough

Rich rail capabilities remain, but region + Set + order read as one hierarchy rather than multiple stacked system cards.

### Active recall / Final recall

The task/map dominate. Rail context remains available but quiet. Final recall continues to show full-scope context without Set-local semantics.

### Responsive and accessibility

Preserve current `PageLayout`, rails, `MapSurface`, `TaskDock`, keyboard, focus, and responsive behavior. Do not introduce a parallel navigation/drawer/layout system.

Required scope and action meaning must be available in text and accessible names, not color alone. If scope context is added to the dock visually, ensure equivalent accessible context is present without making button labels excessively verbose.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- Work only on `world-countries-learning-journey`; do not switch or merge to `main`.
- Today remains the owner of guided action priority, candidates, recommendations, and completion handoff.
- Learning remains the owner of staged Country/Capital flow state, Set mechanics, checkpoints, Final recall, and milestone writes.
- The compact Home journey remains a derived presentation over existing journey/milestone/recall truth.
- Do not persist inspected/guided presentation state beyond the existing transient state.
- Do not change planner priority, review scheduling, consolidation selection, mastery, readiness, milestones, answer classification, typed-answer lifecycle, scheduler mechanics, dwell timing, or evidence writes.
- Do not change map geometry, camera intent, map-task answer semantics, SVG identity, or tiny-Country assistance.
- Preserve the session-context continuity required by Change Spec 0059/current architecture.
- Prefer refinement of existing presenters/components rather than new parallel systems.
- If a small presentation helper is needed for learner-facing phase labels or journey-local next labels, keep it derived/presentation-only and colocated with the existing owning presentation layer.
- `0062-world-countries-guided-ux-hierarchy-corrections-visual-reference.html` defines hierarchy and semantic separation, not literal production markup or pixel dimensions.

## Existing capabilities to reuse

- `src/features/world-countries/today/WorldCountriesToday.tsx` - Today composition, planner action launch, primary dock.
- `src/features/world-countries/today/GuidedHomeRails.tsx` - Home/Continent supporting rails and compact journey.
- `src/features/world-countries/today/journeyPresentation.ts` - region-local journey truth.
- `src/features/world-countries/today/todayPlan.ts` - authoritative Today action/candidate/recommendation truth.
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx` - Country learner-facing task/header composition.
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx` - Capital learner-facing task/header composition.
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx` - walkthrough and compact learning context.
- `src/features/world-countries/learning/stagedLearningPlan.ts` - existing staged Set/Combined/Final presentation truth.
- `src/features/world-countries/learning/flows/StagedLearningReadyStep.tsx` - existing checkpoint and Final gate presentation.
- `src/features/world-countries/ui/MapSurface.tsx` / `TaskDock.status` - existing map-relative status/action surface.
- Existing focused tests adjacent to these components.

## Edge cases

- **Inspected region differs from guided region:** journey-local next text must never inherit the guided/global action.
- **Review due while another region is inspected:** review remains the global Today action; inspected journey remains local context.
- **One-Set scope:** do not render `Set 1 of 1` unless necessary for an existing interaction; prefer simple count/context.
- **Combined after multiple Sets:** label as Mix/Mixed practice while retaining cumulative introduced scope.
- **Final repair traversal:** learner-facing phase remains Final recall; repair remains session detail where already useful.
- **No journey available:** do not fabricate a journey card or local next milestone.
- **Complete inspected Subregion while Today points elsewhere:** local journey may show complete while the dock points to different work; make the scopes explicit.
- **No actionable Today plan:** no empty primary dock solely for visual balance.
- **Evidence loading/error:** preserve stable map shell and truthful status.
- **Temporary proficiency Learning:** learner-facing phase simplification applies, but temporary completion semantics remain caller-owned and non-durable.
- **Direct Learn & Practise:** learner-facing phase simplification may be shared through the existing flow components, but do not give direct runs Today planner semantics.

## Out of scope

- Planner/curriculum changes.
- New learning activities or new journey stages.
- Changes to review, scheduler, mastery, milestones, evidence, or persistence.
- Play, Progress, Drill, Recite, Quiz, or Settings redesign beyond shared presentation text that necessarily comes from the touched Learning flow components.
- Search, goals, streaks, achievements, notifications, telemetry, account/backend work.
- New map behavior or broad palette changes.
- New responsive/navigation architecture.
- Reworking completion or checkpoint mechanics already corrected by 0061 unless needed to keep terminology consistent.
- Merging this branch to `main`.

## Acceptance criteria

- [ ] No active Country or Capital guided Learning header/task metadata exposes `Step 2`, `Step 3`, or equivalent numbered implementation-step language.
- [ ] Country learner-facing phases read as Meet / Find / Recall / Mix / Final recall while internal staged phases remain unchanged.
- [ ] Capital learner-facing phases read as Meet the capitals / Recall the capitals / Mix / Final recall while internal staged phases remain unchanged.
- [ ] Set number/count remains secondary context and remains truthful for variable and one-Set plans.
- [ ] Walkthrough left rail no longer renders a standalone `Learning progress` card plus a separate redundant stage card; geography/Set/order read as one coherent hierarchy.
- [ ] Country-order authoring remains available in its existing walkthrough context.
- [ ] Existing mnemonic support remains available in its existing walkthrough context.
- [ ] Active recall and Final recall retain compact orientation rail semantics required by current architecture.
- [ ] `CompactJourneyPath` or its replacement derives `Next in journey` only from the journey/Subregion it displays and does not consume the global Today primary-action label.
- [ ] The attached Today dock continues to use the planner-authoritative action and communicates enough scope context to remain unambiguous when another Subregion is inspected.
- [ ] An inspected Subregion can show its own journey while the real guided Subregion remains separately and clearly identified.
- [ ] Tests cover the inspected-Southern/guided-Northern case with a real non-null primary action so cross-scope label leakage cannot regress.
- [ ] Normal actionable Home/Continent right rail no longer presents `Continue` as a competing command section.
- [ ] Review reasons/counts remain available in a compact supporting presentation and preserve total-vs-bounded-count truth.
- [ ] Loading, error, caught-up, complete, and no-country states still communicate status clearly.
- [ ] Home/Continent map copy no longer claims that map inspection chooses the guided learning path.
- [ ] Existing action-specific CTA counts/labels from 0061 remain correct.
- [ ] Existing `Countries learned` / `Capitals learned`, temporary completion, planner handoff, `Learn again`, checkpoint, and Final-gate behavior from 0061 do not regress.
- [ ] No planner, scheduler, evidence, mastery, milestone, map, answer-lifecycle, or persistence behavior changes as a side effect.
- [ ] Focused tests cover phase presentation, walkthrough rail hierarchy, journey/action separation, inspected-region behavior, and Home hierarchy.

## Source anchors

- `PRODUCT.md`
- `src/features/world-countries/AGENTS.md`
- `docs/architecture/features/WORLD_COUNTRIES.md`
- `docs/changes/0061-world-countries-guided-learning-ux-refinement.md`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/WorldCountriesToday.test.tsx`
- `src/features/world-countries/today/GuidedHomeRails.tsx`
- `src/features/world-countries/today/GuidedHomeRails.test.tsx`
- `src/features/world-countries/today/journeyPresentation.ts`
- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.test.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.test.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
- `src/features/world-countries/learning/flows/GuidedLearningRails.test.tsx`
- `src/features/world-countries/learning/flows/StagedLearningReadyStep.tsx`
- `src/features/world-countries/learning/stagedLearningPlan.ts`
- `src/features/world-countries/ui/MapSurface.tsx`
- `docs/changes/0062-world-countries-guided-ux-hierarchy-corrections-visual-reference.html`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` only where needed to describe the implemented learner-facing contract:

- guided Learning uses simple learner-facing phase language while internal staged phases remain implementation detail;
- Home's Today action and inspected Subregion journey are separate presentation concepts;
- map selection inspects geography and does not rewrite the planner-authoritative guided path;
- walkthrough context retains authoring/mnemonics but uses a simplified hierarchy.

Do not document mockup dimensions or CSS details.

## Verification

Implemented on `world-countries-learning-journey`.

- Focused Vitest coverage passed for `GuidedHomeRails`, `WorldCountriesToday`,
  `GuidedLearningRails`, `CountryLearningFlow`, `CapitalLearningFlow`, staged
  learning derivations, staged plan derivations, and Final recall task
  presentation: 8 files, 96 tests.
- Regression coverage includes the real Europe/Northern Europe planner action
  while Southern Europe is inspected, including truthful dock scope context,
  local journey-next text, return-to-guided behavior, and planner-authoritative
  launch scope.
- `npx.cmd tsc --noEmit` reached only the unrelated existing
  `src/features/world-countries/drill/DrillSetup.test.tsx` generic `Map` error;
  no touched-file TypeScript errors remained.
- `git diff --check` passed.
- Browser/manual verification was not run, per the repository instructions and
  the Change Spec's risk-proportionate validation guidance.

Expected risk-proportionate evidence:

- focused `CountryLearningFlow` / `CapitalLearningFlow` tests for learner-facing phase labels and absence of `Step N` UI copy;
- focused `GuidedLearningRails` tests for simplified walkthrough hierarchy, one-Set handling, Combined scope, Final scope, and preserved authoring/mnemonic seams;
- focused `GuidedHomeRails` tests for journey-local next labeling and inspected-vs-guided separation, including a non-null real primary action label in the regression case;
- focused `WorldCountriesToday` tests for dock action/scope context and unchanged planner launch behavior;
- existing 0061 completion/checkpoint tests as regression coverage where touched.

Start with the smallest touched test set. Widen to the World Countries feature slice only if shared seams or failures justify it. Run `git diff --check`. Run lint/typecheck when materially relevant; report unrelated pre-existing failures rather than fixing them.

Browser/manual verification is not required by default and should not require starting or troubleshooting a dev server solely for this change.
