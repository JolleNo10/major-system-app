# Change Spec 0067 - World Countries single active learning focus

- **Status:** Ready
- **Date:** 2026-09-10
- **Issue:** None.
- **Related ADRs:** None. This change refines transient guided Home focus and presentation inside the existing World Countries `today/` ownership model. It introduces no new persistence, ownership boundary, or cross-subsystem contract.
- **Current-state docs:** `docs/architecture/SYSTEM.md`, `docs/architecture/features/WORLD_COUNTRIES.md`

## Goal

Make World Countries Home and Continent hubs behave as one coherent learning surface: there is exactly one active Subregion focus at a time. The planner supplies the default focus, but the learner can override it directly by selecting another Subregion. The map, geography rail, Journey panel, and primary Learning action must all follow that same active focus.

This removes the current learner-facing split between a planner-owned “Journey focus” and a separately inspected/viewed Subregion. The planner remains the source of the sensible default and of later fallback recommendations; the user remains free to learn out of sequence without entering a separate mode.

## User-visible behavior

### 1. One active Subregion, not “Journey target” plus “viewed region”

At any guided Home/Continent surface, resolve one active Subregion:

```text
active Subregion = explicit transient user selection
                   otherwise planner-derived default focus
```

The learner must never be shown two simultaneous Subregions that compete for ownership of the same Home surface.

Remove learner-facing states/copy that communicate a split such as:

```text
Journey focus
You're viewing this region
You're viewing Central Europe
Your journey is still focused on Northern Europe
Back to Northern Europe
```

Those distinctions are no longer part of the product model.

The explicit user selection is transient only. Do not persist a current-region cursor or user override. Normal scope/navigation changes may reset the transient selection so the planner-derived default becomes active again.

### 2. Planner recommendation is the default, not a lock

When no user override exists, Home resolves the active Subregion from the existing planner-derived focus.

Example in Europe:

```text
Northern Europe   [selected]

YOUR JOURNEY · NORTHERN EUROPE
Countries   Complete
Capitals    Current
Region learned   Upcoming

CONTINUE YOUR JOURNEY
Add the capitals · Northern Europe
[ Add the capitals ]
```

All visible surfaces agree on Northern Europe.

The learner does not need to choose a region before continuing normal guided learning; the app still picks a sensible default.

### 3. Selecting another Subregion changes the active learning focus

Inside a Continent hub, clicking a Subregion in the geography rail or clicking a Country on the map selects that Country's Subregion as the active focus.

This is not an inspection-only state. It is an intentional override of the default for the current guided surface.

Example: the planner default is Northern Europe, but the learner selects Central Europe. The whole guided surface changes to Central Europe:

```text
Central Europe   [selected]

YOUR JOURNEY · CENTRAL EUROPE
Countries   Current
Capitals    Upcoming
Region learned   Upcoming

CONTINUE YOUR JOURNEY
Learn 3 countries · Central Europe
[ Learn 3 countries ]
```

The primary CTA must launch Learning for Central Europe, not silently launch Northern Europe.

This is the supported “out-of-band” path: users may learn Subregions in a different order simply by selecting them.

### 4. Derive the selected Subregion's truthful next Learning action

When a user explicitly selects a Subregion, derive its next curriculum action from the same existing Learning readiness/milestone/recall truth used by the Today planner.

The selected Subregion must not get a parallel or simplified definition of readiness.

Conceptually:

```text
Country layer not established
→ Learn Countries

Country layer established, Capital layer not established
→ Add the capitals

Country + Capital layers established
→ Region learned; no curriculum Learning CTA for that Subregion
```

Preserve the existing complete-recall fallbacks and milestone semantics. Do not create synthetic milestones merely because a user selects a Subregion.

Prefer reuse/refactor of the existing recommendation derivation over duplicating the Country/Capital readiness rules in `WorldCountriesToday.tsx`.

### 5. Same-focus continuation takes precedence during Learning

The user-selected active Subregion must remain authoritative through its own Country → Capital progression, even when the global planner would recommend a different earlier Subregion.

Example:

- Global planner default: Northern Europe.
- User selects Central Europe.
- Central Europe needs Country Learning.
- Learner completes Central Europe Countries.

The completion handoff must be:

```text
Next: add the capitals to these countries.
[ Add the capitals ]
```

for **Central Europe**.

It must not jump back to Northern Europe merely because Northern Europe remains first in global curriculum order.

Only once the active Subregion has no remaining curriculum Learning action may a later continuation/fallback use the planner's normal recommendation outside that Subregion.

If the learner explicitly chooses a next-region handoff, the resulting active focus should become that chosen Subregion (or the explicit override may be cleared when that yields the same planner default). Do not introduce a second visible focus state during the transition.

### 6. A learned selected Subregion remains a valid focus

If the learner selects a Subregion whose Country and Capital layers are already established, keep it selected and show its truthful completed Journey state:

```text
YOUR JOURNEY · CENTRAL EUROPE
✓ Countries
✓ Capitals
✓ Region learned

MASTERY
Building through Review
```

or `Mastered` when existing recall evidence supports it.

Do not fabricate a curriculum CTA for a learned Subregion. Review remains independent and available according to its existing scheduler/scope semantics.

Do not automatically snap a user-selected learned Subregion back to the planner default merely because it has no Learning action. The explicit transient selection remains valid until the learner chooses another region or leaves/resets the scope.

### 7. Continent geography rail has one clear selected state

The active Subregion row in the left geography rail must have an obvious selected treatment, not only a small secondary text label.

Use the existing geography visual language (cyan) for the selection treatment. The exact styling should fit the current `WorldCountriesPanel`/rail design, for example a restrained cyan border/background/accent with sufficient contrast.

Do not use a second row state for “Journey focus” versus “Viewing”. There is one active row.

The row may show the Subregion's truthful current curriculum state/action as concise supporting text, but it must not reintroduce two competing focus concepts.

Keyboard focus and selected state must remain distinguishable. Expose the selected state semantically (`aria-current`, `aria-selected`, or the most appropriate existing pattern) rather than relying only on color.

### 8. Map selection follows the same active Subregion and preserves mastery fills

The active Subregion must be visually identifiable on the map.

Do **not** use Home's current `highlightedCountryIds` treatment to turn the selected Subregion into a solid cyan block. That overrides the meaningful per-Country mastery/progress fill and makes selection compete with progress semantics.

Use/extend the existing geographic selection-outline capability instead:

- Country fill continues to mean `Unpractised / Weak / Developing / Strong / Complete`.
- active Subregion selection is expressed through outline/emphasis, not replacement fill.
- selecting a Subregion must not prevent the learner from clicking another Subregion on the same Continent map.

`GeographyOverviewMap` already has a `selectedSubregionIds` seam and group-outline presentation for Continent selection. Reuse or cleanly extend that seam rather than inventing a Home-only highlight system.

If the current `selectedSubregionIds` contract is documented as general but is implemented only for Continent-level selection, extend it carefully so the World Home can also identify the active planner Subregion without changing World hover semantics or replacing progress colors.

### 9. World Home makes the active Subregion discoverable

The World Home only lists Continents in its geography rail, but guided Learning still targets a Subregion. The active Subregion therefore needs explicit learner-facing context on World Home.

At minimum:

- prominently name the active Subregion in the center/Journey context, not only in a small CTA detail line;
- make the containing Continent row clearly associated with that focus, using concise text such as `Focus · Northern Europe` or an equivalent treatment that fits the rail;
- where the existing map selection seam can support it cleanly, outline/emphasize the active Subregion on the World map while preserving Country mastery fills.

Do not create a second World-level selection model. The named/outlined Subregion is the same active focus used by the Journey action.

Clicking a Continent from World retains the existing navigation behavior. Once inside that Continent, the Continent-scoped planner supplies the default active Subregion unless the user selects another one there.

### 10. Right rail and map dock always follow the active focus

The compact Journey panel must derive from the active Subregion, not from a separate `displaySubregionId` that can diverge from the CTA.

The map dock's label, CTA, and launched Learning run must use the active Subregion's derived recommendation.

It must be impossible to produce a state like:

```text
Right rail: YOUR JOURNEY · CENTRAL EUROPE
Map selection: Central Europe
CTA: Add the capitals · Northern Europe
```

If the active Subregion has no curriculum action, omit the Journey Learning CTA rather than falling back behind the learner's selection to another region.

Review remains separately actionable in the right rail exactly as today.

## Scope

- Replace the current guided-vs-inspected Home model with one transient active Subregion focus.
- Default that active focus from the existing planner-derived focus when there is no explicit user selection.
- Allow Continent rail/map selection to override the active focus for the current guided surface.
- Derive the selected Subregion's next Learning recommendation using existing Today/Learning readiness truth.
- Keep same-Subregion Country → Capital continuation authoritative when the learner intentionally selected an out-of-order Subregion.
- Make the active Subregion visually selected in the Continent rail.
- Make map selection use geographic outline/emphasis while preserving mastery/progress fills.
- Improve World Home context so the active Subregion and containing Continent are discoverable.
- Remove old inspected-vs-guided warning/copy and return-to-guided control.
- Update focused tests and current-state World Countries architecture documentation.

## Interaction and states

### World Home, no explicit selection

- Planner-derived active Subregion is named in the guided context.
- The containing Continent is identifiable in the geography rail.
- Map progress fills remain authoritative; the active focus gets non-fill geographic emphasis when supported by the map seam.
- CTA launches the planner-derived active Subregion recommendation.

### Enter Continent hub

- Continent-scoped planner-derived Subregion is active by default.
- Its rail row is visibly selected.
- Map selection, Journey panel, and CTA all match it.

### Select another incomplete Subregion

- Selection changes immediately.
- Rail selected state moves to the new Subregion.
- Map outline/emphasis moves to the new Subregion.
- Journey panel derives from that Subregion.
- CTA derives and launches that Subregion's next truthful Learning action.
- No warning about being “away from” the recommended Journey appears.

### Select another learned Subregion

- Selection changes immediately.
- Journey panel shows Region learned + existing Mastery truth.
- No curriculum Learning CTA is fabricated.
- Review remains independent.

### Country Learning completes in an out-of-order selected Subregion

- Active focus stays on that Subregion.
- If Capitals remain, completion handoff continues to Capitals in that same Subregion.
- Global planner order does not steal the handoff.

### Region Learning completes in an out-of-order selected Subregion

- Completion truth remains about the just-completed Subregion.
- If a next-region handoff is offered, use the appropriate planner-derived recommendation after the active Subregion has no remaining curriculum action.
- Returning to the hub may keep the explicit selected Subregion active and show it as learned; do not silently move the Home focus unless the user chooses the next region or the transient selection is reset by normal scope/navigation behavior.

### Scope changes / invalid selection

- A transient selection that is not part of the new active Country population/Continent must not survive as an invalid focus.
- Fall back to the new scope's planner-derived focus.
- Do not persist or migrate anything.

### Evidence loading/error/empty scope

Preserve existing behavior. Do not expose a stale active Learning CTA when the evidence required to derive it is unavailable.

### Accessibility / responsive behavior

- Active Subregion is communicated by text/semantics as well as color/outline.
- Rail selection remains keyboard navigable with visible focus.
- The map's accessible description must not claim progress is represented by a selection fill when the fill remains mastery/progress.
- Responsive rail/drawer behavior remains owned by `PageLayout`; do not add a desktop-only focus model.

## Architecture constraints

- Follow `docs/architecture/features/WORLD_COUNTRIES.md`, `docs/architecture/SYSTEM.md`, and `src/features/world-countries/AGENTS.md`.
- Work only on `world-countries-learning-journey`; do not switch or merge to `main`.
- `today/` remains owner of guided planning, transient Home focus, and delegation into existing Learning flows.
- The existing Today planner remains the source of the default curriculum recommendation/order. User selection overrides the active Home focus; it does not rewrite curriculum order.
- Reuse the existing Country/Capital establishment logic and complete-recall fallbacks. Do not duplicate readiness semantics in the coordinator.
- Prefer extracting/extending the existing recommendation derivation in `todayPlan.ts` over creating a second selected-region planner.
- `learning/flows/` remains owner of active Learning sessions and milestone writes.
- `maps/` remains owner of Country/Subregion-to-SVG translation and selection outline presentation. Home passes semantic selection; it does not manipulate raw SVG IDs.
- Country mastery/progress fill remains derived from existing recall progress and must not be replaced by geographic selection fill.
- Review remains independent from Learning focus. Selecting a Subregion must not rewrite, filter, or reprioritize Review unless existing scope behavior already does so.
- Do not add persisted current-Subregion, preferred-Subregion, override, or Journey cursor state.
- Do not add a second learner-facing concept equivalent to `viewedSubregion` versus `journeySubregion`.
- No new backend/network behavior or cross-feature dependency.

## Existing capabilities to reuse

- `src/features/world-countries/today/todayPlan.ts` — existing curriculum recommendation, ordering, introductions, readiness, and planner-derived default focus. Refactor/extend this logic rather than copying its rules.
- `src/features/world-countries/today/WorldCountriesToday.tsx` — current transient `focusedSubregionId`, guided Home composition, Learning launch/handoff, and scope transitions.
- `src/features/world-countries/today/journeyPresentation.ts` — existing derived Journey presentation for any Subregion.
- `src/features/world-countries/today/GuidedHomeRails.tsx` — geography rows and compact Journey presentation.
- `src/features/world-countries/learning/learningReadiness.ts` — authoritative Country/Capital established-layer logic and recall fallbacks.
- `src/features/world-countries/maps/GeographyOverviewMap.tsx` — semantic geography selection, Country progress colors, group outlines, and map interaction.
- `src/features/world-countries/learning/progressPresentation.ts` / `scopeProgress.ts` — existing progress/mastery color and aggregate semantics.
- Existing focused Today, GuidedHomeRails, Today-plan, Journey-presentation, and GeographyOverviewMap tests.

## Edge cases

- User selects the same Subregion already active: remain on the same focus; do not toggle to “no selection”.
- User selects a Subregion before Country Learning: derive Country Learning using current configured set size.
- User selects a Subregion with Countries established but Capitals not established: derive Capital Learning.
- User selects a fully learned but not mastered Subregion: show Region learned + Mastery Building, no Learning CTA.
- User selects a fully mastered Subregion: show Region learned + Mastered, no Learning CTA.
- User selects an out-of-order Subregion while an earlier one remains globally recommended: selected Subregion owns Home presentation and Learning launch until the learner changes focus or normal scope reset occurs.
- Out-of-order Country completion: same selected Subregion Capital handoff wins over global planner recommendation.
- Out-of-order region completion: do not fabricate more work in the completed region; a later next-region continuation may use planner order.
- Review due for another Subregion: Review card remains independent; it does not change active Learning focus.
- Changing Continent: clear/ignore any Subregion selection not in the new Continent and use that Continent's derived default.
- Returning from Continent to World: World resolves its own planner-derived default; do not leak a Continent-only override into World.
- Active Country population changes via Settings: invalid selected Subregion falls back safely to planner default; no stale Country IDs or action.
- All curriculum regions learned but recall incomplete: planner may supply recall orientation, but selecting a learned region must not fabricate curriculum Learning. Review/Mastery remain the retention path.
- Empty active scope or evidence failure: no stale active Learning action.

## Out of scope

- Persisting the active Subregion or user override across reloads/sessions.
- Changing effective geography order or adding adaptive region recommendation algorithms.
- Changing Country/Capital Learning pedagogy, Set sizing, milestone writes, Final recall, or completion definitions.
- Changing Review scheduling, Review scope, block size, interleaving, retries, or evidence writes.
- Redesigning Review, Playground, Progress, onboarding, Drill, Recite, Quiz, Settings, or global navigation.
- New gamification, streaks, goals, badges, XP, or notifications.
- Broad map geometry/camera redesign unrelated to expressing the single active selection.
- Introducing a second progress or Journey state model.
- Merging the feature branch to `main`.

## Acceptance criteria

- [ ] Guided Home/Continent exposes exactly one active Subregion focus at a time.
- [ ] With no user override, the active Subregion defaults from the existing planner-derived focus.
- [ ] Selecting another Subregion in a Continent changes the rail selection, map selection, Journey panel, action label, and launched Learning run to that same Subregion.
- [ ] The UI no longer presents a simultaneous `Journey focus` versus `You're viewing` distinction or the current warning/return-to-guided treatment.
- [ ] Selecting an out-of-order Subregion derives Country/Capital Learning from the same readiness/milestone/recall semantics used by the Today planner; no parallel readiness rules are introduced.
- [ ] Completing Country Learning in an out-of-order selected Subregion continues to Capitals in that same Subregion when Capitals remain, even if the global planner recommends another Subregion.
- [ ] A selected learned Subregion remains selectable and truthfully shows Region learned/Mastery without a fabricated curriculum CTA.
- [ ] The active Continent Subregion row has a visually and semantically clear selected state; keyboard focus remains separately visible.
- [ ] Map selection no longer replaces the active Subregion's mastery/progress fills with a cyan block.
- [ ] Country fill continues to encode the existing core progress states while geographic selection is communicated through outline/emphasis.
- [ ] Selecting one Subregion does not prevent selecting another Subregion from the same Continent map.
- [ ] World Home prominently names the active Subregion and makes its containing Continent/focus discoverable without introducing another focus model.
- [ ] The Journey panel and map dock cannot refer to different Subregions in the same rendered state.
- [ ] Review availability, launch, evidence behavior, and focus restoration remain independent and unchanged.
- [ ] No new persisted focus/cursor/override state is added.
- [ ] Existing World → Continent navigation, scope reset behavior, Progress view, and Learning completion semantics remain intact except where explicitly changed above.
- [ ] `docs/architecture/features/WORLD_COUNTRIES.md` is updated to describe the implemented single-active-focus behavior and no longer documents inspected-vs-guided divergence as current behavior.
- [ ] Focused automated tests cover default focus, user override, out-of-order Country → Capital continuation, learned selected regions, selected rail styling/semantics, preserved map progress fill, and regression of Review/Journey independence.

## Source anchors

- `src/features/world-countries/today/todayPlan.ts`
- `src/features/world-countries/today/WorldCountriesToday.tsx`
- `src/features/world-countries/today/GuidedHomeRails.tsx`
- `src/features/world-countries/today/journeyPresentation.ts`
- `src/features/world-countries/maps/GeographyOverviewMap.tsx`
- `src/features/world-countries/learning/learningReadiness.ts`
- `src/features/world-countries/today/WorldCountriesToday.test.tsx`
- `src/features/world-countries/today/GuidedHomeRails.test.tsx`
- `src/features/world-countries/today/todayPlan.test.ts`
- `src/features/world-countries/maps/GeographyOverviewMap.test.tsx`

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` in the same implementation so current-state documentation reflects the delivered interaction model:

- Today still owns planner-derived default guidance and transient Home focus.
- Home/Continent resolves one active Subregion.
- an explicit Subregion selection transiently overrides the planner default for Home presentation and Learning launch;
- selected-region Learning uses the same readiness/recommendation semantics as normal guided curriculum;
- Review remains independent;
- no focus cursor is persisted;
- remove or revise statements that inspection never changes guided focus.

No SYSTEM-level ownership change is expected unless implementation reveals a real boundary change.

## Verification

Complete this section when setting the status to `Implemented`.

Use risk-proportionate automated evidence. At minimum, run the focused tests that cover the Today planner/recommendation seam, `WorldCountriesToday`, `GuidedHomeRails`, and any `GeographyOverviewMap` selection behavior changed by the implementation.

Widen to the relevant World Countries slice only if the recommendation refactor or map selection extension has a materially broader blast radius or focused evidence is insufficient. Typecheck/lint/build are not automatic gates for this feature-local change.

Do not start a dev server or perform browser/manual verification unless the user explicitly requests it for this task.
