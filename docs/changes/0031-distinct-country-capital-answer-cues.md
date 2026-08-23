# Change Spec 0031 - Distinct Country and Capital answer cues

- **Status:** Implemented
- **Date:** 2026-08-23
- **Issue:** None.
- **Related ADRs:** None. This change extends the existing World Countries feature-local UI ownership and typed-answer presentation contract; it does not introduce a new durable architectural decision.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)
- **Related changes:** [Change Spec 0017](0017-world-countries-uniform-typed-answer-interaction.md), [Change Spec 0019](0019-world-countries-overlay-answer-feedback.md)

## Goal

Make it immediately obvious whether the learner is expected to answer with a **Country** or a **Capital**, especially in mixed sessions where consecutive prompts can switch answer type.

The learner should not lose an answer because they correctly recalled the relationship but answered the wrong side after overlooking small prompt text.

## User-visible behavior

Every World Countries question surface that expects a Country or Capital answer exposes a strong, consistent pre-answer cue for the **expected answer type**.

The primary cue is semantic text, reinforced by a stable color family:

- **ANSWER · COUNTRY** — blue/sky treatment.
- **ANSWER · CAPITAL** — violet/purple treatment.

The cue is placed in a consistent, high-salience position in the question context, above or immediately adjacent to the main stimulus/prompt. It must be visible before the learner starts answering.

Examples:

```text
[ ANSWER · CAPITAL ]     <- violet treatment
Norway
What is the capital?
```

```text
[ ANSWER · COUNTRY ]     <- blue/sky treatment
Oslo
Which country has this capital?
```

The cue describes **what to answer**, not the transformation direction. Existing secondary labels such as `Country -> Capital`, `Capital -> Country`, `Location -> Country`, or `Shape -> Country` may remain where useful, but they are not the primary discriminator.

### Color semantics

Country/Capital answer-type colors are task-orientation colors only.

They must not replace or compete with existing correctness semantics:

- green/success remains positive-answer feedback;
- red/error remains incorrect-answer feedback;
- map proficiency/status colors retain their existing meanings.

Do not recolor the Country map by answer type.

Do not turn the entire page or map surface into a saturated Country/Capital color. Use a compact badge/accent and, where useful, a restrained matching task-dock/input accent.

### Do not rely on color alone

The visible words `COUNTRY` and `CAPITAL` are required. Color is reinforcement.

The distinction must remain understandable for users who cannot distinguish the two color families or are using reduced-color/high-contrast presentation.

## Scope

- Add one feature-local Country/Capital answer-kind presentation contract under World Countries `ui/`.
- Present the answer-kind cue before answering on relevant Drill question surfaces.
- Present the same answer-kind cue on Today Review.
- Present the same answer-kind cue on Recite typed-recall prompts.
- Present the same answer-kind cue on Learning / Learn & Practise typed Country and Capital practice/recall surfaces where an answer kind is known.
- Cover both typing and multiple-choice Drill presentation when they share the same question context.
- Keep location-click interactions semantically Country-answer tasks where a visible answer-kind cue is useful without obscuring the map task.
- Preserve all existing answer matching, feedback timing, evidence, scheduling, retry, proficiency, and completion semantics.

No persisted user preference is required.

## Interaction and states

### Before answer

The expected answer kind is derived from the active task/skill, not from the displayed stimulus string.

At minimum:

- `location-to-country` -> Country
- `shape-to-country` -> Country
- `capital-to-country` -> Country
- `country-to-capital` -> Capital

The cue remains stable for the lifetime of that prompt.

### During answer

The cue remains visible while the input, multiple-choice control, or map-click task is answerable.

If a restrained matching accent is applied to the task dock/input container, it must not reduce text/input contrast or override native focus indication.

### Feedback

Correct/incorrect/fuzzy/revealed feedback retains the existing feedback presentation and semantic colors.

The answer-kind cue may remain visible during feedback for context, but it must not change to green/red and must not become the primary feedback signal.

### Prompt transition

When the next prompt changes answer kind, the cue updates with that prompt.

A mixed session should therefore make a Country -> Capital transition visually obvious even when the learner is answering quickly.

### Accessibility

- Visible semantic text is mandatory; color is supplementary.
- The cue must meet the application's normal contrast expectations.
- Screen readers must receive an understandable label such as `Answer type: Country` or equivalent.
- Do not duplicate the same phrase redundantly in accessible output if the surrounding prompt already exposes it; one clear accessible answer-type announcement is sufficient per prompt.
- Existing keyboard/focus behavior from the shared typed-answer lifecycle remains unchanged.

## Architecture constraints

Follow [World Countries](../architecture/features/WORLD_COUNTRIES.md).

- `ui/` remains the owner of feature-local task/answer presentation.
- Workflow owners (`drill/`, `today/`, `learning/flows/`, `recite/`) determine the active recall skill/task and therefore the semantic answer kind.
- Do not import Drill presentation internals into Today, Learning, or Recite.
- Do not create separate Country/Capital color logic independently in each workflow.
- Establish one feature-local semantic mapping/presentation seam for `country | capital`.
- Reuse the existing World Countries answer-kind vocabulary where possible. `WorldCountriesTypedAnswer` already uses `country | capital` for resolved answer feedback; do not invent parallel names such as `nation`, `city`, or workflow-specific variants.
- The pre-answer cue must not depend on a submitted `WorldCountriesTypedAnswerResult`; answer kind is known from the active prompt before submission.
- Do not move Country/Capital semantics into `core/ui/TypingInput`; the generic core input remains feature-independent.
- Do not alter map status/proficiency palette semantics.
- Do not change persistence or storage.
- Do not change recall target identity or evidence semantics.
- No new cross-feature generic design system abstraction is required.

## Existing capabilities to reuse

### Shared World Countries typed-answer lifecycle

`src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`

Already defines the feature-local answer-kind vocabulary:

```text
country | capital
```

and owns shared typed-answer lifecycle/feedback integration.

Reuse that vocabulary, but expose the expected answer kind in presentation before submission through an appropriate feature-local UI seam rather than waiting for a result.

### Drill skill model

`src/features/world-countries/drill/drillModes.ts`

Already maps the active session to explicit recall skills:

- Location -> Country
- Shape -> Country
- Country -> Capital
- Capital -> Country

Use the skill/task identity as the source of truth for expected answer kind.

### Drill question context

`src/features/world-countries/drill/DrillSession.tsx`

Owns active Drill question context across typed, multiple-choice, location, shape, and capital-direction prompts.

Integrate the cue in the shared question context rather than duplicating it separately in each Drill answer control.

### Today Review

`src/features/world-countries/today/TodayReviewSession.tsx`

Already distinguishes `location-to-country` from `country-to-capital`. Present that distinction through the same shared answer-kind cue.

### Existing map/task presentation

`src/features/world-countries/ui/MapSurface.tsx`

Keep map/task layout semantics intact. A small task-context accent may integrate with the existing surface/dock presentation when this can be done without creating a second answer lifecycle or obscuring map content.

## Edge cases

- Rapid alternation from Country answer to Capital answer is visually distinct without requiring the learner to parse arrow notation.
- Capital -> Country and Location/Shape -> Country use the same Country answer-kind treatment even though their stimuli differ.
- Country -> Capital always uses the Capital treatment.
- A Country name that is also a Capital-like proper noun does not affect the answer-kind selection; task skill is authoritative.
- Multiple-choice and typing variants for the same skill show the same answer-kind cue.
- Correct/incorrect feedback colors remain semantically unambiguous.
- Fuzzy spelling remediation remains unchanged.
- Recite retry/reveal semantics remain unchanged.
- Today delayed retry remains unchanged.
- Learning scheduler/final recall behavior remains unchanged.
- Expanded map presentation retains the cue wherever the owning task context remains visible.
- Small-screen layouts must not hide the semantic text and leave only color.

## Out of scope

- Changing which Drill modes exist.
- Changing Drill mode labels or setup selection beyond any minimal wording needed to avoid duplication.
- Changing question order or randomization.
- Changing Country/Capital answer matching.
- Changing fuzzy thresholds or spelling remediation.
- Changing evidence, mastery, Today scheduling, Learning milestones, or Recite outcomes.
- Changing map proficiency/status colors.
- Coloring Countries on the map by whether the answer is a Country or Capital.
- Adding flags, icons, animations, sounds, or haptics as required cues.
- User-configurable answer-kind colors.
- A repository-wide or cross-feature semantic-color system.

## Acceptance criteria

- [ ] A learner can identify whether the required answer is a Country or Capital from a prominent semantic cue without reading small secondary prompt text.
- [ ] Country-answer prompts visibly show `ANSWER · COUNTRY` or an equivalent approved wording.
- [ ] Capital-answer prompts visibly show `ANSWER · CAPITAL` or an equivalent approved wording.
- [ ] Country and Capital cues use distinct stable color families, with Country in blue/sky and Capital in violet/purple.
- [ ] The distinction does not rely on color alone.
- [ ] `location-to-country`, `shape-to-country`, and `capital-to-country` resolve to the Country cue.
- [ ] `country-to-capital` resolves to the Capital cue.
- [ ] Drill uses the cue consistently for typing and multiple-choice presentation, and for map-based Country-answer tasks where the question context is shown.
- [ ] Today Review uses the same semantic mapping and presentation rather than a Today-specific color implementation.
- [ ] Recite Country/Capital prompts use the same semantic mapping and presentation.
- [ ] Learning / Learn & Practise Country/Capital typed practice and recall surfaces use the same semantic mapping and presentation where applicable.
- [ ] Correct, incorrect, fuzzy, and revealed feedback behavior remains unchanged.
- [ ] Success/error feedback colors remain distinct from Country/Capital task-orientation colors.
- [ ] Map proficiency/status colors and Country geometry rendering are unchanged.
- [ ] Existing answer timing, keyboard, focus, retry, evidence, scheduling, and completion behavior is unchanged.
- [ ] The shared answer-kind presentation has focused tests for semantic mapping and accessible Country/Capital labeling.
- [ ] Representative Drill, Today, Recite, and Learning tests protect integration without requiring duplicate presentation logic.

## Source anchors

- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/drill/drillModes.ts`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
- `src/features/world-countries/learning/flows/`
- `docs/architecture/features/WORLD_COUNTRIES.md`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` only as needed to describe the resulting current-state UI ownership:

- World Countries `ui/` owns the shared semantic Country/Capital answer-kind presentation;
- workflow owners supply the expected answer kind from their active task/skill;
- correctness feedback and map status palettes remain separate semantics.

Do not create an ADR unless implementation discovers a genuinely new durable architecture decision beyond this existing ownership model.

## Verification

Complete this section when setting the status to `Implemented`.

- Implemented and verified on 2026-08-23.
- Evidence: focused answer-kind presentation and workflow tests passed (6 test files, 37 tests); `npx vitest run src/features/world-countries` passed (88 test files, 395 tests); `npm run typecheck` passed. Existing typed-answer feedback/lifecycle and map presentation tests also passed. Manual browser verification was attempted against the local Vite app, but no browser connection was available in this environment.
