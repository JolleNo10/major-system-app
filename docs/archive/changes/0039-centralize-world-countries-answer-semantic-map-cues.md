# Change Spec 0039 - Centralize World Countries answer-semantic map cues

- **Status:** Implemented
- **Date:** 2026-08-26
- **Issue:** None.
- **Related ADRs:** None. This change completes existing World Countries UI ownership and active-task semantics; it does not introduce a new durable ownership, persistence, identity, public-boundary, or dependency-direction decision.
- **Related changes:** Change Spec 0034 introduced Country-answer cyan / Capital-answer violet active-task map cues and removed answer-kind badges; Change Spec 0036 unified active map-session presentation across workflows.
- **Current-state docs:** `docs/architecture/features/WORLD_COUNTRIES.md`
- **Repository / feature scope:** `JolleNo10/major-system-app` — World Countries / Countries only

## Goal

Make the expected answer domain a single reusable World Countries task semantic and apply its map cue consistently across every active map-backed question workflow.

For an active question whose required answer is a **Country**, the active/revealed Country map highlight uses the established cyan task cue. For an active question whose required answer is a **Capital**, it uses the established violet task cue.

The map color is supplemental orientation only. Task direction, cue text, typed placeholder, and accessible answer labels remain authoritative.

Do **not** reintroduce `ANSWER · COUNTRY`, `ANSWER · CAPITAL`, or any equivalent answer-kind badge.

## User-visible behavior

The same answer-domain cue works independently of which World Countries workflow owns the question.

| Active question semantics | Required answer | Active task highlight |
| --- | --- | --- |
| Location → Country | Country | cyan `#0891b2` |
| Country → Capital | Capital | violet `#8b5cf6` |
| Capital → Country | Country | cyan `#0891b2` when a task/result target highlight is visible |
| Shape → Country | Country | cyan `#0891b2` when the Country is highlighted/revealed |

This behavior applies to active question maps in:

- Drill;
- non-recording Practice;
- Today Review;
- guided Country / Capital Learning active task phases;
- Recite active sessions.

Examples:

- Today Review: `COUNTRY → CAPITAL` / `Capital of Myanmar` highlights Myanmar in violet, not cyan.
- Recite `Countries + Capitals`: the Country-name prompt uses cyan; when the same Country advances to its Capital prompt, the active highlight changes to violet.
- Learn Capitals Practice / Combined Practice / Final Recall uses violet while the user is answering a Capital.
- Locate Capitals remains cyan because the user is selecting the **Country/location** whose Capital is shown.

The following maps are **not** answer-domain maps and retain their current independent palettes:

- setup and scope-selection maps;
- world mastery/proficiency maps;
- Drill/Practice results maps;
- Learning readiness/completion maps;
- Recite setup status and completed/current-run outcome colors;
- geography selection, hover, muting, and contextual colors.

## Scope

### 1. One answer-kind semantic

Consolidate the feature's duplicate Country/Capital answer-kind representations into one reusable feature-local type and derivation seam.

The resulting semantic must support at least:

```ts
type WorldCountriesAnswerKind = 'country' | 'capital'
```

and a single skill-to-answer-kind derivation equivalent to:

```ts
getWorldCountriesAnswerKind(skill)
```

where `country-to-capital` resolves to `capital` and the current Country-answer recall skills resolve to `country`.

The semantic seam must not be owned by, or named after, an answer-kind badge component.

Prefer a small neutral feature-local UI semantic module under `src/features/world-countries/ui/` because current architecture already assigns reusable answer-kind semantics to `ui/`.

### 2. One answer-kind-to-task-color mapping

Own the active task color mapping in one place next to the shared answer semantic:

```text
country -> #0891b2
capital -> #8b5cf6
```

Do not scatter these two raw task colors across Drill, Today, Learning, Recite, or map components.

The semantic mapping expresses **expected answer domain**, not correctness, mastery, result status, Recite outcome, or learning readiness.

### 3. Shared active task model carries answer kind

Extend the existing `WorldCountriesActivityTask` semantic model so active map-backed workflows can state their expected answer domain once, for example:

```ts
interface WorldCountriesActivityTask {
  // existing direction/cue/context/progress
  answerKind?: WorldCountriesAnswerKind
}
```

Exact naming may vary, but do not create separate workflow-specific `isCapitalQuestion`, `highlightTone`, or color contracts when the shared task already knows the answer domain.

The activity task remains presentation data only. It must not acquire scoring, matching, scheduling, evidence, persistence, or transition logic.

### 4. Map components remain workflow-neutral

Do not teach `SvgMapController` about Country answers, Capital answers, Drill, Today, Learning, or Recite.

Do not create map-level scoring/status semantics.

Map presentation components may accept a generic concrete active-highlight fill/color from their caller when needed. The World Countries answer-semantic layer resolves `answerKind -> color`; generic map code applies the resulting color.

Prefer eliminating the current separate semantic type:

```ts
'country-answer' | 'capital-answer'
```

if it exists only as a second encoding of `country | capital`.

`CountryLearningMap` should not own an independent Country-vs-Capital color table after this change.

`GeographyOverviewMap` must gain only the generic highlight-color capability required for Recite active-task highlights. Existing setup/status color ownership remains untouched.

### 5. Remove badge coupling, not answer semantics

`WorldCountriesAnswerKindCue.tsx` currently mixes a useful answer-kind helper with an obsolete visual badge concern.

Move reusable answer-kind semantics out of that component/file.

Search references before deleting anything:

- If the badge component has no intentional remaining renderer after semantic extraction, remove the component and its tests.
- If a legitimate non-active-task caller still uses it, keep only that UI component while the answer semantics live in the neutral shared module.

Under no circumstance re-add the badge to active Drill, Practice, Today, Recite, or Learning tasks.

### 6. Apply the semantic consistently by workflow

#### Drill and non-recording Practice

Preserve `deriveDrillTaskPresentation(...)` as the Drill task-copy seam, but stop returning a second `highlightTone` semantic if `answerKind` fully determines it.

Drill/Practice active maps derive their concrete task highlight from the shared task answer kind.

Preserve existing reveal/visibility behavior. This change changes **color selection**, not when a Country is highlighted or named.

Required results:

- `location-to-country` -> Country / cyan;
- `country-to-capital` -> Capital / violet;
- `capital-to-country` -> Country / cyan when visible/revealed;
- `shape-to-country` -> Country / cyan when visible/revealed;
- Locate Countries -> Country / cyan;
- Locate Capitals -> Country / cyan;
- Capitals Practice -> Capital / violet.

#### Today Review

`TodayReviewSession` already derives the typed answer kind. Use the same semantic in its shared activity task and map highlight.

Do not implement a Today-only color branch.

Required result:

- Location review remains cyan.
- Country → Capital review becomes violet.
- Queue/retry/Skip/evidence behavior is unchanged.

#### Guided Learning

Use the stable `LearningMapSurface` seam rather than adding per-step map color plumbing throughout every stage component.

When `LearningMapSurface` receives an active task with an answer kind, it should apply the resolved task color to the mounted `CountryLearningMap` automatically unless an explicit non-task presentation legitimately overrides it.

Required result:

- Country-answer active Learning tasks use cyan.
- Capital-answer Practice, Combined Practice, and Final Recall use violet.
- Walkthrough/review phases that are not answer tasks do not gain artificial answer semantics merely to force a color.
- Existing order-authoring, hover, reveal, scheduler, repair traversal, tiny-country assistance, and mounted-map behavior remain unchanged.

#### Recite

Derive answer kind from the current prompt semantics and put it on the shared activity task.

The active Recite `GeographyOverviewMap` must receive the corresponding concrete task highlight color without changing Recite's setup/status/outcome palette.

Required result:

- Countries mode Country prompts -> cyan.
- Countries + Capitals Country prompt -> cyan.
- Countries + Capitals Capital prompt -> violet.
- Countries from Capitals -> Country / cyan.
- Retry of the same prompt keeps the same answer-domain color.
- Reveal/advance changes color only when the next prompt's answer domain changes.

### 7. Documentation correction

Update `docs/architecture/features/WORLD_COUNTRIES.md` so current-state architecture states that Country-answer cyan / Capital-answer violet is a **shared active-task semantic across World Countries map-backed workflows**, not Drill-specific behavior.

Document the separation between:

- active answer-domain task highlight colors; and
- setup/progress/status/result palettes.

Retain the rule that active tasks do not render redundant answer-kind badges.

Do not rewrite historical Change Specs 0034 or 0036.

## Interaction and states

Answer-domain color follows the **currently answerable task**, not the previous answer, current correctness, or workflow mode name.

For a multi-step sequence such as Countries + Capitals:

1. Country-answer prompt is cyan.
2. After its existing transition, Capital-answer prompt is violet.
3. Feedback/retry/reveal behavior remains owned by the existing workflow.
4. The next Country-answer prompt returns to cyan.

If a workflow intentionally has no active highlighted Country before answer/reveal, answer kind must not force a new highlight into existence. It only controls the color of an existing task/reveal highlight.

If feedback temporarily reveals a target that was hidden while answering, use the current task's answer-domain color.

Expanded/fullscreen mode must show the same color as standard mode because the map remains the same mounted task surface.

Color remains a redundant cue. Existing textual task direction and accessible labels must remain sufficient without it.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md` and `src/features/world-countries/AGENTS.md`.
- Keep work inside World Countries except for a direct existing dependency genuinely required by the change.
- `ui/` continues to own reusable feature-local answer-kind/task presentation semantics.
- Workflow owners provide the expected answer kind; shared UI owns the answer-kind-to-task-color mapping.
- `maps/` remains workflow-neutral and accepts generic presentation inputs rather than importing Drill/Today/Recite/Learning semantics.
- `SvgMapController` remains generic and must not learn World Countries answer-domain rules.
- `learning/flows/` must not import Drill internals.
- Today and Recite must not import Drill internals to obtain answer semantics.
- Do not create persistence or settings for these task colors.
- Do not change recall evidence, scoring, scheduling, Learning milestones, Recite outcomes, or mastery derivation.
- Do not restore answer-kind badges.

No new ADR is required because these ownership and dependency rules already exist in current-state architecture. This change removes drift and duplicate representation inside those boundaries.

## Existing capabilities to reuse

- `src/features/world-countries/ui/WorldCountriesActivity.tsx`
  - Shared active task model and presentation seam used by Drill, Practice, Recite, Today Review, and map-backed Learning.
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
  - Existing typed-answer answer-kind/result lifecycle; reuse the consolidated `WorldCountriesAnswerKind` type rather than retaining a duplicate union.
- `src/features/world-countries/ui/WorldCountriesAnswerKindCue.tsx`
  - Current location of `getWorldCountriesAnswerKind(...)`; extract the semantic from the obsolete badge concern.
- `src/features/world-countries/drill/drillTaskPresentation.ts`
  - Existing Drill skill-to-task copy and answer-kind projection.
- `src/features/world-countries/learning/CountryLearningMap.tsx`
  - Existing active highlight presentation; remove duplicate answer-tone semantics/color ownership.
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
  - Existing Recite active map; add only a generic caller-controlled highlight fill capability.
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
  - Shared mounted Learning map host; use it to propagate active task color once for Country and Capital Learning.
- `src/features/world-countries/today/TodayReviewSession.tsx`
  - Existing Today answer-kind derivation and missing map-color wiring.
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
  - Existing Recite prompt semantics and active map ownership.

## Edge cases

- A Capital question can highlight the same Country geometry as the preceding Country question; only the task color changes.
- `Capital → Country` has a Capital cue but a Country **answer**; it must remain cyan.
- Locate Capitals has a Capital cue but a Country/location **answer**; it must remain cyan.
- Shape → Country may intentionally have no highlighted Country before feedback. Do not reveal the target merely to display cyan.
- Recite status colors such as unrecited/revealed/recovered/recalled must not be replaced by task colors outside the active highlighted target treatment.
- Country-specific result/proficiency colors must not be overwritten by a global answer-kind fill.
- Hidden/tiny/multipart/synthetic-dot task assistance keeps its current visibility and interaction rules; answer semantics affect only the intended active highlight color.
- Standard and expanded presentation must not diverge.
- Fuzzy/incorrect/revealed feedback must retain current lifecycle and disclosure behavior.
- If a current map has no semantic active task, omission of an answer kind must preserve current generic/default map behavior.

## Out of scope

- Reintroducing or redesigning answer-kind badges.
- Changing Country-answer or Capital-answer color values beyond the established `#0891b2` and `#8b5cf6` contract.
- Redesigning task header, answer dock, rails, fullscreen layout, or progress UI.
- Changing setup/status/proficiency/result/mastery/Recite-outcome palettes.
- Changing when targets are revealed, highlighted, hidden, named, clickable, or fitted.
- Changing the SVG camera, zoom, synthetic dots, anchors, or pointer-intent algorithms.
- Changing recall skill definitions, scoring, answer aliases/fuzzy matching, evidence, persistence, or scheduling.
- Creating a repository-wide generic answer semantic outside World Countries.

## Acceptance criteria

### Central semantic contract

- [x] World Countries has one reusable `country | capital` answer-kind type used by shared typed-answer/task presentation and workflow projections.
- [x] Skill-to-answer-kind derivation is defined once and is not owned by an answer-kind badge component.
- [x] Country-answer cyan `#0891b2` and Capital-answer violet `#8b5cf6` are mapped in one feature-local semantic/presentation location.
- [x] Drill no longer needs an independent `'country-answer' | 'capital-answer'` semantic if it only duplicates answer kind.
- [x] `CountryLearningMap` no longer owns a duplicate Country-vs-Capital color table.
- [x] Generic map mechanics do not contain World Countries workflow/scoring semantics.

### No badge regression

- [x] No active Drill, Practice, Today Review, Recite, or Learning task renders `ANSWER · COUNTRY`, `ANSWER · CAPITAL`, or an equivalent answer-kind badge.
- [x] If `WorldCountriesAnswerKindCue` becomes unused after semantic extraction, it and obsolete tests are removed; otherwise its remaining use is explicitly intentional and outside active task presentation.

### Drill / Practice

- [x] Location → Country task/reveal highlights use cyan.
- [x] Country → Capital task highlights use violet.
- [x] Capital → Country task/reveal highlights use cyan.
- [x] Shape → Country reveal/result highlights use cyan without revealing the shape target earlier than today.
- [x] Locate Countries uses cyan.
- [x] Locate Capitals uses cyan because the required answer is a Country/location.
- [x] Capitals Practice uses violet.
- [x] Existing answer/reveal/visibility behavior is otherwise unchanged.

### Today Review

- [x] Location review highlight remains cyan.
- [x] Country → Capital review highlight is violet, including the Myanmar-style case that currently falls back to cyan.
- [x] Today queue, retries, Skip, evidence, feedback, and transition behavior are unchanged.

### Learning

- [x] Active Country-answer Learning tasks use cyan.
- [x] Learn Capitals Practice and Combined Practice active highlights use violet.
- [x] Learn Capitals Final Recall/repair active highlights use violet.
- [x] Shared `LearningMapSurface` carries the task semantic instead of per-stage duplicate color branches.
- [x] Non-answer walkthrough/readiness/completion states do not gain inappropriate answer-domain coloring.
- [x] Existing scheduler, order-authoring, tiny-country, reveal, mounted-map, and milestone behavior remains green.

### Recite

- [x] Countries mode active Country prompt highlight is cyan.
- [x] Countries + Capitals switches cyan for Country-answer prompt -> violet for Capital-answer prompt for the same Country.
- [x] Countries from Capitals remains cyan because the answer is a Country.
- [x] Retry/reveal behavior does not change answer-domain color until the semantic prompt changes.
- [x] Recite setup/status/current-run outcome colors remain unchanged outside the active task highlight.

### Regression / accessibility

- [x] Standard and expanded/fullscreen task maps use the same answer-domain color.
- [x] Color remains supplemental; existing direction/cue/placeholder/accessible answer labels remain sufficient without color.
- [x] Setup/proficiency/result/status maps retain their existing palettes.
- [x] No new persistence, settings, evidence, scheduling, or cross-feature dependency is introduced.

## Source anchors

- `docs/architecture/features/WORLD_COUNTRIES.md`
- `src/features/world-countries/AGENTS.md`
- `src/features/world-countries/ui/WorldCountriesActivity.tsx`
- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
- `src/features/world-countries/ui/WorldCountriesAnswerKindCue.tsx`
- `src/features/world-countries/drill/drillTaskPresentation.ts`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/learning/CountryLearningMap.tsx`
- `src/features/world-countries/learning/flows/LearningMapSurface.tsx`
- `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
- `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` in the implementation commit to describe the resolved current state:

- reusable answer-kind semantics are shared across World Countries workflows;
- active answer-domain map cue is Country/cyan vs Capital/violet across active map-backed tasks;
- status/progress/result palettes remain separate;
- no answer-kind badge is part of active task presentation.

Do not alter historical Change Specs 0034/0036 to make them read as current-state documentation.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-26.
- Evidence: focused semantic, map, Today, Learning, Drill, and Recite tests passed; the full World Countries suite passed (`98` files, `468` tests) with `npx vitest run src/features/world-countries`; `npm run typecheck` passed. Browser/manual verification was not available because no connected browser instance was present; the standard/expanded shared-surface behavior and the Today/Recite/Learning transitions are covered by the feature's jsdom integration tests.
