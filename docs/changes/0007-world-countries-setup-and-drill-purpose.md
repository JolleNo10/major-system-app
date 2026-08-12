# Change Spec 0007 - World Countries Setup and Drill purpose

* **Status:** Implemented
* **Date:** 2026-08-12
* **Issue:** None.
* **Related ADRs:** [ADR 0024 - World Countries Learning and Practice boundary](../adr/0024-world-countries-learning-practice-boundary.md)
* **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md), [Shared core architecture](../architecture/CORE.md)

## Goal

Clarify the World Countries mental model by separating **configuration**, **learning**, **practice**, **drilling**, and **recitation**.

The resulting model is:

* **Setup** configures and inspects the geographic memory structure.
* **Drill** is the main recall-strengthening activity.

  * **Drill** tests and strengthens recall.
  * **Learn & Practise** contains distinct Learning and Practice modes.
  * **Learning** acquires knowledge and records defined learning milestones.
  * **Practice** rehearses skills without recording durable progress.
* **Recite** performs complete ordered recall.
* **Due review** remains system-directed maintenance.

The UI and implementation should reflect these boundaries consistently rather than retaining terminology and ownership from previous versions of the feature.

## User-visible behavior

### Primary activities

The World Countries header presents only the primary activities:

```text
[ Drill ] [ Recite ]                        [ Due review ]
```

`Prepare` is removed from the primary activity selector.

World Countries opens to **Drill** by default.

### Setup belongs with Geography

The current Prepare workflow is renamed **Setup**.

Setup is accessed from the **left Geography rail**, visually separated from geographic scope/navigation but clearly associated with it.

At World level:

```text
WORLD
Geography

Africa
Asia
Europe
North America
South America
Oceania

────────────────────────

⚙ Setup
Order, mnemonics & structure
```

At Continent level:

```text
EUROPE
Drill scope

Entire Continent
Northern Europe
Western Europe
Southern Europe
Eastern Europe

────────────────────────

⚙ Setup Europe
Order, mnemonics & structure
```

Setup is contextual:

* from World geography → open World Setup;
* from a Continent → open that Continent's Setup context;
* where a Subregion context is available → Setup may enter that Subregion directly.

Setup provides an explicit **Back to Drill** action. Returning to Drill reloads
the persisted Drill preferences and selects the Drill purpose.

The Setup entry must not look like another geography selection row.

It is a secondary structural action associated with the current geographic context.

### Setup purpose

Setup owns configuration and inspection of the memory structure:

* World → Continent → Subregion structure;
* Continent order;
* Subregion order;
* Country learning order;
* Subregion mnemonic/story/image authoring;
* Country ↔ Capital mnemonic authoring;
* map-centered inspection.

Setup does not initiate learning, practice, Drill sessions, or Recite.

### Prepare terminology

Replace active user-facing and implementation terminology that describes the former workflow:

* `Prepare` → `Setup`;
* `Prepare tools` → `Setup tools`;
* `Prepare context` → `Setup context`;
* corresponding component/file names → Setup terminology.

Do not mechanically rename domain concepts such as:

* learning order;
* learned;
* proficiency;
* mastery;
* Country;
* Capital;
* Continent;
* Subregion.

Historical Change Specs and ADRs remain historical records and are not rewritten solely to replace old terminology.

### Remove Prepare progression

The current Setup area should not direct the learner through a pseudo-learning progression.

Remove UI and supporting logic whose sole purpose is:

* `Prepare next`;
* `Unprepared subregion`;
* `All subregions prepared`;
* `No other subregions to prepare`;
* next-to-prepare navigation.

Setup navigation remains geography-driven:

```text
World
→ Continent
→ Subregion
```

Learning Readiness may remain visible as contextual information.

Learning progression belongs under **Drill → Learn & Practise**.

---

## Drill setup

### Purpose selector

The Drill right rail currently exposes Drill and Learn & Practise simultaneously.

Replace that with one mutually exclusive purpose selector:

```text
PURPOSE

[ Drill ] [ Learn & Practise ]
```

Only the selected purpose's controls are visible.

The selected purpose defaults to **Drill**.

Purpose selection is transient UI/workflow state and is not persisted.

### Drill purpose

When Drill is selected:

```text
PURPOSE
[ Drill ] [ Learn & Practise ]

DRILL

Countries
Countries + Capitals
Countries from Capitals

Drill order
[ In order | Random ]

[ Start Drill ]
```

Existing Drill behavior remains unchanged.

The Drill purpose contains exactly these modes:

* Countries;
* Countries + Capitals;
* Countries from Capitals.

### Learn & Practise purpose

When Learn & Practise is selected:

```text
PURPOSE
[ Drill ] [ Learn & Practise ]

LEARN & PRACTISE

LEARN
Learn Countries
Learn Capitals

PRACTISE
Locate Countries
Capitals

[ Start ]
```

Keep Learn and Practise together as one purpose, with Learning and Practice
presented as explicit categories inside it.

Do not introduce separate Learn and Practice navigation in this change.

The four modes are:

* **Learn Countries** — guided Country learning;
* **Learn Capitals** — guided Capital learning;
* **Locate Countries** — map-location practice;
* **Capitals** — Country → Capital practice.

Learning modes establish durable Learning Readiness milestones. Practice modes
are repeatable and non-recording.

The initial Learn & Practise selection is **Learn Countries**. During the
lifetime of the mounted Drill setup, switching away and back preserves the
last selected Learn & Practise mode.

---

## Learn & Practise ownership cleanup

The Learn & Practise modes have previously moved from other parts of the application and still retain implementation and presentation ties to Drill.

This change must complete that move.

### Mode ownership

`WorldCountriesDrillMode` must represent only actual Drill modes.

It must no longer contain a hidden/special `capitals` mode that exists only to support Learn & Practise.

Introduce an explicit Learn & Practise mode model.

Conceptually:

```text
DrillMode
├── countries
├── countries-capitals
└── countries-from-capitals

LearnPracticePurpose
├── LearningMode
│   ├── learn-countries
│   └── learn-capitals
└── PracticeMode
    ├── locate-countries
    └── capitals
```

Exact internal identifiers may differ.

The invariant is:

> A mode that can only be selected under Learn & Practise must not exist as a hidden Drill mode.

Learning and Practice mode identities must also remain distinct. Follow
[ADR 0024](../adr/0024-world-countries-learning-practice-boundary.md): Learning
modes may write only their defined learning milestone, while every Practice
mode is non-recording.

### Shared mechanics versus shared presentation

Learn & Practise may reuse genuinely shared mechanics:

* atomic recall skills;
* answer evaluation;
* Country scheduling primitives;
* Country map presentation;
* shared learning-flow mechanics;
* low-level session progression;
* result calculations where semantics are identical.

It must not depend on Drill-specific presentation merely to reuse those mechanics.

Specifically, Learn & Practise should not inherit user-facing Drill semantics from:

* Drill session rails;
* Drill headings;
* Drill completion screens;
* Drill result actions;
* Drill accessibility labels.

If necessary, extract purpose-neutral mechanics or presentation seams rather than duplicating behavior.

Do not create two independent implementations of the same learning logic solely to achieve different labels.

### Learning and Practice effects

Learning modes may write only their defined Subregion learning milestone:

* **Learn Countries** records `countriesLearnedAt` when its completion rule is met;
* **Learn Capitals** records `capitalsLearnedAt` when its completion rule is met.

Neither Learning mode writes Drill attempt evidence or changes Drill
proficiency.

Every Practice mode is non-recording. Practice may show transient answers,
accuracy, progress, and results during the active session, but it must not:

* write atomic learning attempts;
* update Learning Readiness milestones;
* update Drill proficiency;
* write Drill preferences;
* create any other durable completion state.

### Learning Readiness

Rename the derived `MemoReadiness` concept and active implementation
terminology to **Learning Readiness**.

Learning Readiness has exactly three cumulative states:

```text
Not learned
Countries learned
Countries + Capitals learned
```

Keep the existing `countriesLearnedAt` and `capitalsLearnedAt` storage fields.
Do not introduce a migration or a fourth state.

Learn Capitals may run before Learn Countries. When Countries have not yet
been learned, show an inline recommendation to learn Countries first, but keep
the Learn Capitals start action enabled. If Capitals are completed first,
persist `capitalsLearnedAt`; Learning Readiness remains **Not learned** until
`countriesLearnedAt` is also present, then derives **Countries + Capitals
learned**.

Learning Readiness is visible as contextual information for all four Learn &
Practise modes. Practice presentation must explain that Practice does not
change Learning Readiness.

### Full Learn & Practise copy audit

Audit every screen reachable from:

* Learn Countries;
* Learn Capitals;
* Locate Countries;
* Capitals.

Remove inherited Drill terminology where the user is not performing a Drill.

Examples that must not appear in Learn & Practise flows include:

* `Drill context`;
* `Drill guided learning`;
* `Drill progress`;
* `Exit Drill`;
* `End Drill`;
* `Drill complete`;
* `Run Drill again`;
* Drill-specific map accessibility descriptions.

Use language appropriate to the current activity.

Examples:

```text
Learn Countries
Learning context
Exit learning
Countries learned

Learn Capitals
Learning context
Exit learning
Capitals learned

Locate Countries
Practice
Practice progress
Exit practice
Practice complete

Capitals
Practice
Practice progress
Exit practice
Practice complete
```

Exact wording may be refined during implementation, but it must accurately describe the active purpose.

### Completion and exit behavior

Learn & Practise completion screens return to the owning Learn & Practise purpose rather than pretending the user was in Drill.

Examples:

```text
[ Back to Learn & Practise ]
[ Practise again ]
```

or for guided learning:

```text
[ Back to Learn & Practise ]
[ Learn again ]
```

Avoid `Back to Subregion` where the actual owning navigation is now Learn & Practise unless returning directly to a geographic selection is intentionally the correct action.

Learning modes support one or more selected Subregions. A multi-Subregion
Learning run:

* processes selected Subregions in their effective geographic order;
* runs each Subregion as its own learning flow using that Subregion's effective
  Country order;
* writes the completed milestone for each Subregion independently;
* pauses after each non-final Subregion completion with an explicit action to
  continue to the next Subregion;
* returns to Learn & Practise after the final Subregion; and
* includes already-completed Subregions when the learner explicitly selected
  them, allowing intentional repetition.

The UI should recommend learning one Subregion at a time when multiple are
selected, but the recommendation must not disable or narrow the run.

### Avoid ambiguous "Setup"

Once Setup becomes the name of the structural configuration workflow, Drill UI must not use `setup` to mean ordinary Drill configuration.

Existing actions such as:

```text
Change Drill
```

must be renamed according to what they actually do, for example:

```text
Change scope
Back to Drill
```

Do not use **Setup** for both:

1. the geography/order/mnemonic workspace; and
2. Drill's pre-session configuration screen.

---

## Scope

### World Countries shell

Update the World Countries shell so:

* primary activity navigation contains Drill and Recite;
* Drill is the default area;
* Due review remains separate;
* the former Prepare workflow becomes Setup;
* Setup navigation is no longer a header activity tab.

The shell continues to own the active World Countries area.

### Contextual Setup navigation

Provide a narrow World Countries navigation seam allowing geography rails to request Setup for their current geographic context.

The implementation must avoid making Drill, Recite, or shared geography components own World Countries shell state.

A suitable contract is conceptually:

```text
openSetup(context)
```

where context may identify:

* World;
* Continent;
* Subregion.

The exact implementation is not prescribed.

The seam must remain World Countries-specific and must not require changes to generic PageLayout behavior.

Setup uses the requested World, Continent, or Subregion context as its initial
structural location. Its explicit Back to Drill action returns through the
shell-owned seam rather than importing Drill internals.

### Setup rename

Rename the active workflow and canonical implementation paths from Prepare to Setup.

Expected targets include the current:

* `prepare/` capability;
* `WorldCountriesPrepare`;
* World/Continent/Subregion Prepare screens;
* Prepare rails;
* Prepare map wrapper;
* Prepare mnemonic editor;
* Prepare-specific identifiers and accessibility labels.

Do not retain compatibility wrappers for removed internal paths.

### Drill purpose state

Add transient state for:

* `drill`;
* `learn-practise`.

Switching purpose must not alter:

* selected geography;
* selected Subregions;
* Drill mode;
* Drill order;
* persisted Drill preferences.

Within the mounted Drill setup, switching away and back should preserve each purpose's existing selection.

Learn & Practise initially selects Learn Countries and thereafter preserves its
last selected Learning or Practice mode for that mounted setup.

Purpose itself is not persisted.

---

## Interaction and states

### Header

Drill and Recite remain visually grouped as peer activities.

Due review remains visually distinct.

Setup does not appear in this primary activity group.

### Geography rail Setup action

Setup is visually separated from the geography list.

It should communicate:

* secondary action;
* structural/configuration purpose;
* current geographic context.

It must be:

* keyboard accessible;
* focus-visible;
* available without disturbing map hover behavior;
* available in responsive rail/drawer presentation.

### Drill purpose selector

Use a segmented/tab-like mutually exclusive control.

Requirements:

* clear selected state;
* accessible selected semantics;
* keyboard navigation;
* visible focus;
* switching purpose does not trigger an activity;
* only selected-purpose content is shown.

### Scope eligibility

Existing geographic restrictions remain.

Examples:

* at World level, actions requiring a Continent remain unavailable;
* Drill requires valid selected Subregions;
* Learn Countries and Learn Capitals require at least one selected Subregion;
* Learning supports multiple selected Subregions as a sequential run;
* practice modes retain their existing valid scopes.

Selecting multiple Subregions does not flatten their learning milestones into
one scope. Each Subregion retains its own flow, effective order, and completion
write.

### Purpose transitions

Example:

```text
Drill
Countries + Capitals
Random

→ Learn & Practise
Locate Countries

→ Drill
```

Returning to Drill retains:

```text
Countries + Capitals
Random
```

Returning again to Learn & Practise retains:

```text
Locate Countries
```

for the lifetime of the mounted Drill setup.

---

## Architecture constraints

Follow [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md).

### Shell ownership

`WorldCountries.tsx` remains the owner of top-level World Countries area selection.

Do not move area state into:

* PageLayout;
* Drill;
* Recite;
* GeographyOverviewMap;
* generic shared UI.

### Geography and Setup navigation

Geography presentation may expose a callback/action for opening Setup.

It must not directly import or manipulate Setup workflow internals.

The relationship is:

```text
Geography UI
→ request Setup(context)
→ World Countries shell changes active area
```

not:

```text
Drill
→ imports Setup implementation
```

### Setup ownership

The renamed Setup capability owns the same structural responsibilities previously assigned to Prepare:

* map-centered inspection;
* order authoring;
* mnemonic authoring;
* Setup-specific rails;
* Setup hierarchy navigation.

Underlying capability ownership does not move:

* canonical geography stays in `data/` / `geography/`;
* reusable learning semantics stay in `learning/`;
* map infrastructure stays in `maps/`;
* mnemonic identity/storage stays in `mnemonics/`;
* shared World Countries presentation stays in `ui/`.

### Learn & Practise ownership

Learn & Practise is a purpose within the Drill activity from the user's perspective.

Its reusable learning flows may remain in `learning/flows/`.

Do not move reusable Country or Capital learning mechanics into `drill/` solely because Drill launches them.

Conversely, Practice-specific presentation must not masquerade as Drill presentation merely because it reuses session mechanics.

Learning, Practice, and Drill have separate mode identities and durable effects.
Purpose-neutral answer evaluation, map interaction, session progression, and
transient result calculation may be reused without transferring presentation
or persistence ownership.

### Shared UI

Continue using the feature-local `ui/` capability established by Change Spec 0006.

Do not recreate duplicated panels, hierarchy rows, breadcrumbs, or generic feature-local `common/` abstractions.

### PageLayout

Do not change:

* PageLayout geometry;
* center-column width;
* rail widths;
* breakpoints;
* drawer model;
* `useRails`;
* `useLayoutHeader`.

Contextual Setup navigation must work through existing rail composition.

### Persistence

Do not change or migrate:

* Country IDs;
* Subregion IDs;
* mnemonic IDs;
* geography metadata schemas;
* learning evidence IDs;
* Drill attempt storage;
* the existing `countriesLearnedAt` and `capitalsLearnedAt` storage fields;
* country-set settings.

The Drill preference schema should continue persisting actual Drill preferences.

Do not add Learn & Practise purpose state to it.

The obsolete persisted Drill mode value `capitals` is not migrated. Treat it as
an invalid Drill mode on load and fall back to the normal default Drill mode,
`countries`.

### ADR 0024

Follow
[ADR 0024 - World Countries Learning and Practice boundary](../adr/0024-world-countries-learning-practice-boundary.md)
for mode identity, allowed durable writes, the non-recording Practice invariant,
and purpose-neutral mechanics reuse.

---

## Existing capabilities to reuse

* `WorldCountries.tsx` — application-area composition.
* PageLayout rail integration through `useRails`.
* `WorldCountriesPanel`.
* `GeographyBreadcrumbs`.
* `GeographyHierarchyRow`.
* `GeographyOverviewMap`.
* `CountryLearningMap`.
* existing World/Continent/Subregion order editors.
* existing mnemonic authoring and read-only mnemonic capabilities.
* existing Drill geographic selection.
* existing Drill modes that remain true Drill modes.
* existing atomic recall skills and answer matching.
* existing Country learning flow.
* existing session mechanics where they can be reused without importing Drill semantics into Practice.

---

## Edge cases

* Setup from World opens World Setup.
* Setup from a selected Continent opens that Continent's Setup context.
* Setup must remain reachable when no Subregions are selected for Drill.
* Back to Drill from Setup reloads persisted Drill preferences, selects the Drill purpose, and does not corrupt those preferences.
* Switching Drill purpose must not clear geographic scope.
* Practice must not persist its mode as the user's selected Drill mode.
* A Practice run must not write durable Drill evidence, Learning Readiness milestones, Drill proficiency, or preferences.
* Real Drill evidence behavior must remain unchanged.
* Learn Countries records only `countriesLearnedAt`; Learn Capitals records only `capitalsLearnedAt`.
* Learn Capitals remains runnable before Countries learning and displays its inline recommendation.
* A Capitals-first completion remains Not learned until Countries learning completes, without losing the Capitals milestone.
* A multi-Subregion Learning run writes each completed Subregion independently and does not lose earlier completion if the learner exits before later Subregions.
* Already-completed selected Subregions remain in a Learning run.
* A legacy persisted Drill `capitals` mode falls back to `countries` without migration.
* Removing next-to-prepare UI must not remove order or mnemonic authoring.
* Renaming Prepare implementation paths must update tests and architecture source anchors.
* Historical documentation remains historical.
* `Setup` must never ambiguously mean Drill's ordinary pre-session configuration.
* Learn & Practise flows must not expose stale Drill actions or terminology through responsive rails, results, accessibility labels, or completion states.

---

## Out of scope

* Changing Drill scoring.
* Changing proficiency or mastery rules.
* Adding a fourth Learning Readiness state.
* Migrating or renaming persisted Subregion learning fields.
* Changing atomic recall evidence identity.
* Changing Country-set membership.
* Changing map status colors.
* Redesigning map geometry.
* Learning or Practice modes beyond the four named in this spec.
* Splitting Learn and Practise into separate top-level purposes.
* Implementing Recite functionality beyond its current scope.
* Changing Due review behavior.
* Changing PageLayout architecture.
* Creating a repository-wide design system.
* Modifying unrelated features.

---

## Acceptance criteria

### Navigation and Setup

* [ ] The World Countries primary activity selector contains only Drill and Recite.
* [ ] World Countries defaults to Drill.
* [ ] Due review remains a separate Maintenance action.
* [ ] Prepare is renamed Setup in current user-facing UI.
* [ ] Setup is accessible from the Geography left rail rather than the primary activity header.
* [ ] Setup is visually separated from geography selection rows.
* [ ] World geography can open World Setup.
* [ ] Continent geography can open Setup for the current Continent.
* [ ] Setup preserves the World, Continent, or Subregion context requested by the Geography rail.
* [ ] Setup exposes Back to Drill, which returns through the shell and reloads persisted Drill preferences with Drill selected as the purpose.
* [ ] Setup navigation uses a World Countries-specific navigation seam without making workflow folders depend on sibling workflow internals.
* [ ] Active `prepare/` implementation paths and component names are renamed to Setup terminology.
* [ ] No internal compatibility wrappers remain solely for obsolete Prepare paths.
* [ ] `Prepare next` / next-to-prepare progression UI and supporting Setup-only logic are removed.
* [ ] Setup continues to support order and mnemonic authoring.
* [ ] Current-state World Countries architecture is updated to describe Setup rather than Prepare.

### Drill purpose

* [ ] Drill setup exposes one mutually exclusive Purpose selector: Drill or Learn & Practise.
* [ ] Only the selected purpose's controls are visible.
* [ ] Purpose defaults to Drill.
* [ ] Purpose state is not persisted.
* [ ] Switching purpose preserves geographic selection.
* [ ] Switching purpose preserves Drill mode and Drill order.
* [ ] Switching purpose preserves the current Learn & Practise selection during the mounted setup.
* [ ] Learn & Practise initially selects Learn Countries.
* [ ] Drill contains only Countries, Countries + Capitals, and Countries from Capitals.
* [ ] Learn & Practise contains Learning and Practice categories.
* [ ] Learning contains Learn Countries and Learn Capitals.
* [ ] Practice contains Locate Countries and Capitals.

### Learn & Practise cleanup

* [ ] `WorldCountriesDrillMode` contains only modes available under the Drill purpose.
* [ ] Capitals practice is not represented as a hidden Drill mode.
* [ ] Learn & Practise has explicit Learning and Practice mode models independent of Drill mode identity and each other.
* [ ] Learn & Practise may reuse purpose-neutral mechanics but does not rely on Drill-specific presentation as its UI contract.
* [ ] Every UI surface reachable from Learn Countries, Learn Capitals, Locate Countries, and Capitals is audited for inherited Drill copy and actions.
* [ ] Learn & Practise flows do not display `Drill context`, `Drill guided learning`, `Exit Drill`, `End Drill`, `Drill complete`, or equivalent Drill-specific wording.
* [ ] Practice accessibility labels describe Practice rather than Drill.
* [ ] Guided Country learning is described as learning rather than `Drill guided learning`.
* [ ] Guided Capital learning is described as learning rather than Drill or Practice.
* [ ] Learn & Practise completion/results actions clearly return to Learn & Practise or repeat the current activity.
* [ ] Drill result actions do not use `Change setup` to mean Drill configuration after Setup becomes the structural workflow name.
* [ ] Shared learning/session mechanics are not unnecessarily duplicated.

### Learning Readiness and durable effects

* [ ] Active implementation and user-facing terminology use Learning Readiness rather than Memo readiness.
* [ ] Learning Readiness contains exactly Not learned, Countries learned, and Countries + Capitals learned.
* [ ] Learn Countries completion writes `countriesLearnedAt` and no Drill evidence.
* [ ] Learn Capitals completion writes `capitalsLearnedAt` and no Drill evidence.
* [ ] Learn Capitals can start before Countries are learned and shows an inline recommendation to learn Countries first.
* [ ] A Capitals-first milestone is preserved while readiness remains Not learned until Countries are learned.
* [ ] Learning Readiness is shown contextually for every Learn & Practise mode.
* [ ] Practice explains that it does not change Learning Readiness.
* [ ] Locate Countries and Capitals write no durable attempts, milestones, proficiency, preferences, or completion state.

### Multi-Subregion Learning

* [ ] Learn Countries and Learn Capitals can start with one or more selected Subregions.
* [ ] Multiple selected Subregions run sequentially in effective geographic order.
* [ ] Each Subregion uses its own effective Country order and writes its milestone independently.
* [ ] Each non-final Subregion completion pauses for an explicit Continue to the next Subregion action.
* [ ] The final Subregion completion returns to Learn & Practise.
* [ ] Already-completed selected Subregions remain eligible for intentional repetition.
* [ ] Multiple selection shows a one-at-a-time recommendation without disabling or narrowing the run.

### Regression

* [ ] Existing Drill evidence recording remains unchanged.
* [ ] Existing Learn Countries completion rule remains unchanged within each Subregion.
* [ ] Learn Capitals retains its full clean-round completion rule within each Subregion.
* [ ] Every Practice mode remains non-recording.
* [ ] Existing Drill selection and ordering behavior remains unchanged.
* [ ] No persistence migration is introduced.
* [ ] Persisted legacy Drill mode `capitals` falls back to `countries` without migration.
* [ ] PageLayout geometry and rail behavior remain unchanged.
* [ ] World Countries feature tests pass.
* [ ] TypeScript compilation passes.
* [ ] Production build passes.

---

## Source anchors

* `src/features/world-countries/WorldCountries.tsx`
* `src/features/world-countries/drill/WorldCountriesDrill.tsx`
* `src/features/world-countries/drill/DrillSetup.tsx`
* `src/features/world-countries/drill/DrillSetupRails.tsx`
* `src/features/world-countries/drill/DrillSession.tsx`
* `src/features/world-countries/drill/DrillSessionRails.tsx`
* `src/features/world-countries/drill/DrillResults.tsx`
* `src/features/world-countries/drill/DrillResultsRails.tsx`
* `src/features/world-countries/drill/drillModes.ts`
* `src/features/world-countries/drill/drillPreferences.ts`
* `src/features/world-countries/learning/learningReadiness.ts`
* `src/features/world-countries/learning/learningProgress.ts`
* `src/features/world-countries/learning/learnPracticeModes.ts`
* `src/features/world-countries/learning/flows/CountryLearningFlow.tsx`
* `src/features/world-countries/learning/flows/CapitalLearningFlow.tsx`
* `src/features/world-countries/learning/flows/GuidedLearningRails.tsx`
* `src/features/world-countries/learning/flows/LearningComplete.tsx`
* `src/features/world-countries/setup/`
* `src/features/world-countries/ui/`
* `src/features/world-countries/maps/GeographyOverviewMap.tsx`
* `src/app/layout/PageLayoutContext.tsx`

---

## Documentation impact

Update `docs/architecture/features/WORLD_COUNTRIES.md` to reflect the resulting current state:

* World Countries user-directed activities are Drill and Recite.
* Setup is the structural configuration capability associated with Geography rather than a learning activity.
* `prepare/` becomes `setup/`.
* Setup owns order/mnemonic authoring and structural inspection.
* Drill has the explicit purposes Drill and Learn & Practise.
* Learn & Practise contains separate Learning and Practice mode identities, both separate from Drill mode identity.
* Learning modes own defined milestone writes and Practice is non-recording.
* Learning Readiness replaces Memo readiness terminology while retaining the existing persisted milestone fields.
* Sequential multi-Subregion Learning records completion per Subregion.
* Reusable guided learning remains under `learning/flows/`.
* Geography rails may request contextual Setup navigation through a shell-owned World Countries seam.
* Setup must not be confused with Drill's pre-session configuration.

Update source anchors and dependency diagrams where the Prepare → Setup rename changes canonical paths.

Record the durable Learning-versus-Practice boundary in
[ADR 0024](../adr/0024-world-countries-learning-practice-boundary.md).

## Verification

Complete when the status becomes `Implemented`.

Implementation evidence: the renamed Setup workflow, separate Drill and
Learn & Practise mode wiring, non-recording Practice boundary, Learning
Readiness derivation, and current-state architecture update are implemented
in the source anchors above. Verification is recorded by the passing commands
below.

Required:

```text
npx vitest run src/features/world-countries
npx tsc -b
npx vite build
```

Manual verification:

* World Countries opens to Drill.
* Header shows Drill and Recite as primary activities.
* Setup is available from World Geography.
* Setup is available contextually from a Continent.
* Back to Drill returns from Setup with persisted Drill preferences intact and the Drill purpose selected.
* Setup order and mnemonic editing still work.
* Drill purpose switch works in both directions without losing scope or selections.
* Drill starts each true Drill mode correctly.
* Learn Countries contains no stale Drill terminology.
* Learn Capitals contains no stale Drill terminology.
* Locate Countries contains no stale Drill terminology.
* Capitals practice contains no stale Drill terminology.
* Learn Capitals can run before Countries learning and shows the recommendation.
* Capitals-first completion is preserved and derives the expected three-state Learning Readiness.
* Learn Countries and Learn Capitals process multiple selected Subregions in order with explicit Continue transitions.
* Learning writes only its Subregion milestone and Practice writes no durable state.
* Learning Readiness appears for all four Learn & Practise modes.
* Practice exit and completion return to the correct Learn & Practise context.
* Real Drill exit/results continue to use Drill terminology.
* No UI uses `Change setup` ambiguously for Drill configuration.
* Responsive rail drawers expose the Setup action and purpose selector correctly.
