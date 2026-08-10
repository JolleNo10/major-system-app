# ADR 0019: World Countries Recall Mastery, Core Completion, and Progress

## Status

Accepted

## Date

2026-08-10

## Builds on

* ADR 0017 — World Countries Drill Scope and Recall Modes
* ADR 0018 — Map-Centered World Countries Drill Presentation

---

## Context

ADR 0017 established the reusable World Countries recall model.

The currently defined atomic recall skills are:

```text
location → country
country → capital
capital → country
```

Each learning target has the stable identity:

```text
CountryId
+
recall skill
```

The four user-facing Drill modes are workflow compositions over these skills:

```text
Countries
    location → country

Countries + Capitals
    location → country
    country → capital

Capitals
    country → capital

Countries from Capitals
    capital → country
```

`Countries + Capitals` therefore has no independent learning-evidence identity.

ADR 0018 established the map-centered Drill presentation and explicitly left detailed learning-progress, mastery, scoring, aggregation, and progress-visualization semantics outside its scope.

This ADR defines those semantics.

It additionally introduces two concepts not previously defined by ADR 0017 or ADR 0018:

* the distinction between free-recall and recognition evidence;
* the distinction between core and additional Country skills.

Where ADR 0018 used terms such as `mastery` or `proficiency` generically when discussing future progress visualization, this ADR establishes the more precise vocabulary:

```text
atomic skill → mastery
Country → core completeness
scope → progress
```

This refines terminology without changing ADR 0018's map-centered presentation decision.

---

# Existing implementation

World Countries already records independent atomic evidence for:

```text
location → country
country → capital
capital → country
```

The shared learning infrastructure currently records attempts conceptually as:

```ts
interface Attempt {
  at: number
  ok: boolean
  ms: number
}
```

Generic item progress currently derives information including:

```text
attempts
correct
wrong
recent correct
consecutive correct
last attempt
median response time
mastered
```

The current generic mastery policy is:

```text
2 consecutive correct attempts
→ mastered
```

World Countries currently also aggregates requested Country skills using values equivalent to:

```text
masteredSkills
masteryRatio
mastered
```

with every supplied skill treated equally.

This ADR replaces that World Countries interpretation with explicit:

```text
core skills
additional skills
mode-specific skills
```

semantics.

The generic shared mastery policy remains valid for its existing consumers but is no longer authoritative for World Countries.

The application already distinguishes the answer interactions:

```text
typing
multiple-choice
```

This ADR requires that distinction to be translated into durable learning-evidence semantics:

```text
typing
→ recall

multiple-choice
→ recognition
```

The existing shared attempt store also prunes ordinary attempt history by age and count.

That behavior is incompatible with a World Countries model in which durable mastery is always derived from historical atomic evidence.

World Countries atomic learning evidence therefore requires different retention semantics.

---

# Decision

## 1. Atomic recall skills remain the authoritative learning units

ADR 0017's atomic learning identities remain unchanged.

The currently defined World Countries recall skills are:

```ts
type WorldCountriesRecallSkill =
  | 'location-to-country'
  | 'country-to-capital'
  | 'capital-to-country'
```

Durable learning evidence is associated with:

```text
CountryId
+
WorldCountriesRecallSkill
```

No persistent mastery identity is introduced for:

```text
Countries
Countries + Capitals
Capitals
Countries from Capitals
```

because these are user-facing workflows rather than knowledge identities.

Likewise, no attempt evidence is recorded directly against:

```text
Subregion
Continent
World
```

Higher-level progress is derived from atomic Country + skill evidence.

---

# Core and additional knowledge

## 2. World Countries distinguishes core and additional skills

Not every recall relationship contributes equally to the primary World Countries learning goal.

Recall skills are therefore classified as either:

```text
core
additional
```

The initial **core skills** are:

```text
location → country
country → capital
```

These represent the primary World Countries goal:

> Know where a Country is and know its Capital.

The initial **additional skill** is:

```text
capital → country
```

This is useful knowledge and is tracked independently, but it is not required for primary Country completion.

Future Country knowledge may introduce additional skills such as:

```text
flag recognition
country → flag
flag → country
currency
language
other Country facts
```

Unless the primary World Countries learning goal is deliberately changed, new knowledge dimensions should normally be classified as additional skills.

Adding an additional skill must not make previously complete Countries incomplete.

Changing which skills are considered **core** is therefore a deliberate change to the primary World Countries learning goal.

---

# Learning terminology

## 3. Evidence, proficiency, mastery, completeness, and session results are distinct

The model distinguishes the following concepts.

### Attempt evidence

A historical observation of one atomic recall attempt.

Example:

```text
country-to-capital:NO
correct
2026-08-10
```

### Skill proficiency

A qualitative state derived from atomic evidence.

Example:

```text
Norway → Oslo
STRONG
```

### Skill mastery

A boolean decision indicating that one atomic recall skill satisfies the World Countries mastery policy.

Example:

```text
Norway
country → capital
MASTERED
```

### Country completeness

A derived statement indicating that all **core** Country skills are mastered.

### Additional mastery

Progress associated with additional Country skills.

### Scope progress

Derived progress across:

```text
Subregion
Continent
World
```

### Session result

Temporary performance information from one Drill run.

These concepts must not be treated as interchangeable.

---

## 4. `Mastery` applies to atomic skills

The term:

```text
MASTERED
```

refers to an atomic recall skill.

For aggregated states, preferred terminology is:

```text
Skill mastery
Country completeness
Additional skill progress
Scope progress
Session accuracy
```

The application should not create persistent learning identities such as:

```text
Norway mastered
Europe mastered
```

when those statements are actually aggregations over atomic skills.

---

# Evidence quality

## 5. Attempts distinguish recall from recognition

Correctness alone does not completely describe the strength of an observed learning attempt.

The domain-neutral learning-evidence contract must support a concept equivalent to:

```ts
type AttemptEvidenceKind =
  | 'recall'
  | 'recognition'
```

The exact field name is an implementation detail.

The semantics are:

```text
recall
    learner generates the answer without candidate answers

recognition
    learner selects the answer from presented candidates
```

For the current World Countries Drill interactions:

```text
typing
→ recall

multiple choice
→ recognition
```

The persisted abstraction describes the cognitive interaction rather than the UI control.

A future voice or other free-response input can therefore also generate:

```text
recall
```

evidence.

---

## 6. Legacy attempts remain valid but have unknown evidence quality

Attempts created before this ADR do not contain enough information to determine whether they were recall or recognition.

They must not be guessed from:

* response time;
* timestamp;
* Drill mode;
* Country;
* application settings at read time;
* other indirect information.

They are treated as:

```text
legacy / unknown
```

for evidence-quality purposes.

Legacy successful attempts behave like recognition evidence for proficiency:

* they can contribute to `DEVELOPING`;
* repeated success can contribute to `STRONG`;
* they cannot qualify as explicit free-recall evidence for `MASTERED`.

A legacy incorrect attempt remains full negative evidence.

Like any other failure it:

```text
sets the atomic skill to WEAK
and
starts a new mastery-evidence boundary
```

---

# Mastery

## 7. World Countries owns its mastery policy

The generic shared policy:

```text
2 consecutive correct
```

remains available for existing consumers.

This ADR does not redefine that policy globally.

World Countries owns its own feature-specific mastery derivation under:

```text
src/features/world-countries/learning/
```

Shared core provides domain-neutral evidence and persistence mechanics.

It must not understand:

```text
Country
Capital
Subregion
World Countries Drill modes
core Country skills
```

---

## 8. Mastery requires successful free recall on different calendar dates

An atomic World Countries skill becomes mastered when, **after the most recent incorrect attempt**:

> successful explicit free recall has been demonstrated on at least two different recorded local calendar dates.

Example:

```text
2026-08-10 18:00
Norway → Oslo ✓ recall

2026-08-11 09:00
Norway → Oslo ✓ recall

→ MASTERED
```

The rule uses **calendar dates**, not a minimum elapsed duration such as 24 hours.

Therefore this also qualifies:

```text
2026-08-10 23:59 ✓ recall
2026-08-11 00:01 ✓ recall

→ MASTERED
```

This is intentional.

The mastery rule expresses the human learning requirement:

> Successfully recall it again on a later day.

Detailed scheduling is responsible for deciding whether such close repetition should actually be presented to the learner.

---

## 9. The attempt records the local calendar date at answer time

A qualifying attempt must preserve the learner's local calendar date when that attempt occurred.

Conceptually:

```ts
{
  at: 1786388400000,
  ok: true,
  ms: 2400,
  evidenceKind: 'recall',
  localDate: '2026-08-10'
}
```

The exact contract may differ.

The architectural requirement is that later timezone changes must not change which historical calendar day an attempt belongs to.

Mastery therefore interprets the date recorded at attempt time rather than re-deriving historical dates from the user's current timezone.

---

## 10. Qualifying successful attempts do not need to be consecutive

Successful attempts between qualifying recall dates do not interfere with mastery.

For example:

```text
August 10 09:00 ✓ recall
August 10 12:00 ✓ recall
August 11 10:00 ✓ recall

→ MASTERED
```

Likewise:

```text
August 10 ✓
August 11 ✓
August 12 ✓

→ MASTERED
```

and:

```text
August 10 ✓
August 12 ✓

→ MASTERED
```

The implementation must not consider only the latest two successful attempts.

Conceptually:

```text
after most recent incorrect attempt

collect successful explicit recall attempts
group by recorded local calendar date

successful recalls on >= 2 distinct dates
→ MASTERED
```

---

## 11. Additional successful attempts can never reduce learning state

Successful evidence must not make the learner worse off merely because another successful attempt occurred.

For example:

```text
August 10 ✓ recall
August 11 ✓ recall

→ MASTERED
```

followed by:

```text
August 11 ✓ recall
August 11 ✓ recognition
August 12 ✓ recall
```

must remain:

```text
MASTERED
```

This establishes the invariant:

> In the absence of a new incorrect attempt, adding successful evidence may preserve or improve World Countries learning state but must never reduce it.

---

## 12. Recognition contributes proficiency but does not independently establish mastery

Successful recognition is valid positive learning evidence.

For example:

```text
What is the capital of Norway?

Oslo
Stockholm
Copenhagen
Helsinki

Oslo ✓
```

improves proficiency.

However:

```text
recognition ✓
recognition ✓
recognition ✓
```

does not independently establish free-recall mastery.

Recognition-only practice may reach:

```text
STRONG
```

but not:

```text
MASTERED
```

under the initial World Countries policy.

---

## 13. Any incorrect attempt invalidates current mastery

Any incorrect attempt is direct negative evidence regardless of interaction type.

This includes:

```text
incorrect recall
incorrect recognition
incorrect legacy / unknown attempt
```

Therefore:

```text
MASTERED
+
incorrect recognition

→ WEAK
→ not MASTERED
```

and:

```text
MASTERED
+
incorrect recall

→ WEAK
→ not MASTERED
```

The failure becomes the new mastery-evidence boundary.

Successful evidence before that boundary cannot be combined with later evidence to re-establish mastery.

Example:

```text
August 10 ✓ recall
August 12 ✓ recall
→ MASTERED

August 15 ✗
→ WEAK

August 16 ✓ recall
→ not mastered

August 17 ✓ recall
→ MASTERED
```

provided August 16 and August 17 are distinct recorded calendar dates.

---

## 14. Time alone does not remove mastery

Time passing without new evidence does not alter mastery.

For example:

```text
MASTERED
+
30 days without practice

→ MASTERED
```

and:

```text
MASTERED
+
180 days without practice

→ MASTERED
```

A future scheduling or Maintenance policy may introduce separate concepts such as:

```text
due
stale
review recommended
```

Those states represent the desirability of reviewing the skill.

They do not retroactively erase earlier mastery evidence.

---

## 15. Response time does not affect mastery

Attempt latency continues to be recorded.

However:

```text
1 second correct recall
5 second correct recall
12 second correct recall
```

all qualify equally under this mastery policy.

Response time is excluded because it can be affected by:

* answer length;
* typing speed;
* spelling;
* device;
* interaction method;
* motor latency.

Future scheduling or fluency analysis may use latency independently.

---

# Proficiency

## 16. Atomic skills expose qualitative proficiency bands

World Countries uses semantic proficiency states rather than presenting an artificially precise 0–100 knowledge score.

The initial states are:

```text
UNPRACTISED
WEAK
DEVELOPING
STRONG
MASTERED
```

These are derived from retained learning evidence.

They are not independently authored persistent states.

---

## 17. `UNPRACTISED`

An atomic skill is:

```text
UNPRACTISED
```

when no attempt evidence exists for the skill.

`Unpractised` is preferred over `Unseen`.

The learner may already know the Country through Memo while having no measurable evidence for that specific recall direction.

---

## 18. `WEAK`

If the most recent attempt is incorrect:

```text
→ WEAK
```

regardless of earlier successful history.

---

## 19. `DEVELOPING`

An atomic skill is:

```text
DEVELOPING
```

when:

* it is not mastered;
* its most recent attempt is successful; and
* it has not yet accumulated the successful evidence required for `STRONG`.

A single successful attempt after the most recent failure is sufficient to leave `WEAK`.

---

## 20. `STRONG`

An atomic skill is:

```text
STRONG
```

when:

* it is not mastered;
* its latest attempt is successful; and
* at least two successful attempts exist after the most recent incorrect attempt.

The successes may consist of:

```text
recall
recognition
legacy / unknown
```

or a mixture.

Examples include:

```text
same-day recall ✓
same-day recall ✓
→ STRONG
```

```text
recognition ✓
recognition ✓
→ STRONG
```

```text
legacy success ✓
legacy success ✓
→ STRONG
```

Only successful explicit `recall` evidence on at least two different recorded calendar dates can produce:

```text
MASTERED
```

---

## 21. `MASTERED`

When the World Countries mastery rule is satisfied:

```text
proficiency = MASTERED
mastered = true
```

This is the highest atomic proficiency state.

---

# Country progress

## 22. Country progress separates core and additional skills

Conceptually:

```text
Norway

CORE
location → country      MASTERED
country → capital       MASTERED

ADDITIONAL
capital → country       DEVELOPING
```

The Country does not accumulate a fourth attempt history or mastery identity.

Its state is derived from its atomic skill states.

---

## 23. Country completeness requires all core skills

A Country is:

```text
COMPLETE
```

when all current core skills are mastered.

Initially:

```text
location → country      MASTERED
AND
country → capital       MASTERED

→ Country complete
```

Conceptually:

```ts
countryComplete =
  coreSkills.every(skill => skill.mastered)
```

The additional:

```text
capital → country
```

skill does not affect core Country completeness.

For example:

```text
Norway

location → country      MASTERED
country → capital       MASTERED
capital → country       WEAK

→ Country complete
```

This is intentional.

---

## 24. Additional mastery is represented separately

Additional skills enrich the learner's Country knowledge without changing core completion.

For example:

```text
Norway

Core            2 / 2
Additional      0 / 1

Complete
```

or:

```text
Norway

Core            2 / 2
Additional      1 / 1

Complete+
```

The UI may use:

```text
Complete+
```

as compact presentation shorthand for:

```text
core complete
+
additional mastered knowledge exists
```

`Complete+` is not a separate persistent learning state.

If several additional skills exist, the exact additional progress should remain available:

```text
Additional skills
3 / 5 mastered
```

---

## 25. Adding additional skills does not move the primary finish line

Suppose future Country knowledge becomes:

```text
CORE
location → country
country → capital

ADDITIONAL
capital → country
flag → country
country → flag
currency
```

A Country with:

```text
Core        2 / 2
Additional  1 / 4
```

is still:

```text
Country complete
```

It must not become:

```text
50% complete
```

because new optional knowledge was added.

---

## 26. Drill-mode progress remains contextual

Each Drill mode uses the skills exercised by that mode:

```text
Countries
    location → country

Countries + Capitals
    location → country
    country → capital

Capitals
    country → capital

Countries from Capitals
    capital → country
```

Therefore a Country may simultaneously be:

```text
Country core COMPLETE
```

and:

```text
Countries from Capitals
WEAK
```

if `capital → country` is weak.

The two states answer different questions.

---

## 27. Country core state has its own aggregate vocabulary

General Country progress uses:

```text
UNPRACTISED
WEAK
DEVELOPING
STRONG
COMPLETE
```

Atomic skill progress uses:

```text
UNPRACTISED
WEAK
DEVELOPING
STRONG
MASTERED
```

The distinction is deliberate:

```text
MASTERED
→ atomic skill

COMPLETE
→ all core Country skills mastered
```

Country core state derives as follows:

```text
COMPLETE
    all core skills are MASTERED

WEAK
    at least one core skill is WEAK

STRONG
    every core skill is at least STRONG
    and at least one is not MASTERED

DEVELOPING
    some positive core evidence exists,
    the requirements for STRONG are not met,
    and no core skill is WEAK

UNPRACTISED
    all core skills are UNPRACTISED
```

Therefore:

```text
location → country      STRONG
country → capital       UNPRACTISED

→ Country core state = DEVELOPING
```

This is intentional.

One unpractised core dimension means the learner has not demonstrated broadly strong core Country knowledge.

Additional skills do not reduce the core Country state.

---

# Scope progress

## 28. Scope progress is derived from current canonical Countries

Progress for:

```text
Subregion
Continent
World
```

is derived from the Countries currently belonging to that scope in canonical Geography.

No scope attempt history is introduced.

Conceptually:

```text
atomic skill evidence
        ↓
Country state
        ↓
Subregion progress
        ↓
Continent progress
        ↓
World progress
```

---

## 29. Default scope completion uses core Country completion

Unless a view explicitly concerns an additional skill:

```text
7 / 10 Countries complete
```

means:

> Seven of the ten Countries have mastered all current core Country skills.

Additional skill progress does not change the core completion denominator.

---

## 30. Scope aggregation operates directly over Countries

Higher scopes must not recursively average child percentages.

For example:

```text
Subregion A
2 Countries
2 complete

Subregion B
20 Countries
10 complete
```

The Continent result is:

```text
12 / 22 Countries complete
```

not:

```text
average(100%, 50%)
= 75%
```

The same rule applies when aggregating to World level.

---

## 31. Scope summaries prefer interpretable counts

Useful scope information includes:

```text
Northern Europe

Countries complete     7 / 10

Complete               7
Strong                 1
Developing             1
Weak                   1
Unpractised            0
```

Additional progress may be shown separately:

```text
Additional skills

Capital → Country
Mastered               6 / 10
```

Normalized ratios may still be used internally for progress-bar geometry.

The UI should avoid implying a calibrated knowledge probability such as:

```text
Europe mastery: 73.4%
```

when no calibrated statistical model exists.

---

# Session scoring

## 32. Session results are separate from durable learning state

A Drill result describes one run.

It may include:

```text
attempts
correct
incorrect
accuracy
Countries encountered
```

For example:

```text
18 / 20 correct
90% accuracy
10 Countries
```

These values are session-local.

A Drill session does not receive:

```text
persistent mastery
persistent proficiency
persistent Drill-mode score
```

Instead:

```text
session
→ atomic evidence
→ durable learning state is derived
```

---

## 33. Multi-skill Drill modes expose skill-specific results

`Countries + Capitals` produces attempts for two distinct core skills.

Results should therefore be able to show:

```text
Country identification     10 / 10
Capital recall              8 / 10
```

rather than relying solely on:

```text
18 / 20
90%
```

The aggregate result may still be displayed.

Skill-specific results provide more useful diagnostic information.

---

## 34. Session accuracy and Country completeness remain distinct

The following statements answer different questions:

```text
90% session accuracy
```

and:

```text
8 / 10 Countries complete
```

A learner may achieve 100% in one session without having successful recall evidence on two different calendar dates.

Likewise, a learner may have many complete Countries and still make mistakes during a later Drill.

Neither measurement replaces the other.

---

# Progress visualization

> **Refined by ADR 0020.** Memo overview maps present coarse Subregion Memo
> readiness rather than the evidence-derived progress states below. Drill setup
> and results use Memo readiness only as a fallback while the selected Drill
> perspective has no relevant attempt evidence.

## 35. Map progress always answers a defined learning question

The progress interpretation depends on the current view.

### Countries

```text
location → country proficiency
```

### Capitals

```text
country → capital proficiency
```

### Countries from Capitals

```text
capital → country proficiency
```

### Countries + Capitals

```text
combined core state across:

location → country
country → capital
```

### General World Countries overview

```text
core Country state
```

The default overview therefore answers:

> How well does the learner know the primary Country knowledge?

---

## 36. Additional skills do not silently alter the default progress map

The general map's primary Country treatment reflects core Country knowledge.

Additional skills may instead be represented using:

* a secondary marker;
* a `+` indicator;
* an optional skill layer;
* a dedicated progress view;
* another non-conflicting presentation.

For example:

```text
Norway

core = COMPLETE
capital → country = MASTERED
```

may conceptually appear as:

```text
Complete+
```

The exact visual treatment remains a presentation decision.

---

## 37. Progress states are semantic rather than fixed colors

The learning layer exposes semantic states.

For atomic skill views:

```text
unpractised
weak
developing
strong
mastered
```

For Country core views:

```text
unpractised
weak
developing
strong
complete
```

The exact:

* colors;
* opacity;
* patterns;
* outlines;
* animations;

remain presentation decisions.

The map should expose a clear legend for the current interpretation.

Progress must not rely exclusively on color where an accessible alternative is required.

---

## 38. Geographic selection and learning progress remain separate map concerns

ADR 0018's selection rule remains authoritative.

Conceptually:

```text
Country progress treatment
    = learning state

outline / emphasis / scope muting
    = geographic Drill selection
```

Selecting Northern Europe must not make its Countries appear better learned.

A mastered or complete Country must not automatically appear selected.

---

## 39. Progress visualization must not reveal active recall answers

During active recall, progress presentation must not expose the answer.

This is especially important for:

```text
capital → country
```

Before submission, the target Country must not be identifiable through:

* progress coloring;
* a unique proficiency marker;
* labels;
* progress-driven zoom;
* another target-specific progress treatment.

The active-recall map may therefore suppress or neutralize the progress layer where required.

Progress visualization is primarily appropriate during:

```text
setup
overview
results
```

where it does not reveal an active answer.

---

## 40. Results may show updated durable progress

The map retained on the ADR 0018 results screen may display the post-session learning state relevant to the completed Drill.

For example:

```text
Capitals Drill
→ country → capital progress
```

or:

```text
Countries + Capitals
→ core Country progress
```

This must remain visually and semantically separate from session accuracy.

---

# Memo relationship

## 41. Memo completion is not automatically atomic mastery

Existing Subregion Memo records include coarse instructional milestones such as:

```text
countriesLearnedAt
capitalsLearnedAt
```

These do not imply:

```text
every Country skill is MASTERED
```

A Subregion-level completion timestamp does not contain sufficient atomic evidence to establish that result.

Memo completion remains an instructional workflow milestone.

Atomic World Countries mastery remains evidence-based.

Future Memo recall interactions may contribute atomic evidence when they represent an equivalent measurable recall operation.

When they do, they should reuse the same:

```text
CountryId + recall skill
```

identity.

---

# Persistence

## 42. World Countries attempts preserve evidence metadata

World Countries learning evidence requires more information than the current:

```text
at
ok
ms
```

record.

New World Countries attempts must preserve information conceptually equivalent to:

```ts
interface WorldCountriesLearningAttempt {
  at: number
  ok: boolean
  ms: number
  evidenceKind: 'recall' | 'recognition'
  localDate: string
}
```

where:

```text
localDate
```

is the learner's recorded local calendar date when the attempt occurred, for example:

```text
2026-08-10
```

The exact shared type structure is an implementation detail.

The architecture requires that:

* `core/learning` expose suitable domain-neutral evidence metadata;
* the persistence adapter preserve that metadata;
* World Countries interpret it;
* core persistence remains unaware of Country or mastery semantics.

Existing attempts without the additional fields remain valid legacy evidence.

---

## 43. World Countries atomic attempts are retained indefinitely

World Countries mastery is derived from atomic evidence.

To preserve that model, World Countries atomic attempt records are exempt from the generic attempt garbage-collection policy.

Keys in the namespace:

```text
world-countries:<skill>:<CountryId>
```

must not currently be deleted because of:

```text
HISTORY_RETENTION_DAYS
```

or:

```text
HISTORY_MAX
```

Therefore World Countries atomic learning evidence currently has:

```text
no age-based pruning
no per-target attempt-count pruning
```

This exemption applies only to World Countries atomic learning evidence.

Existing retention behavior for Major System, Pi, and other attempt namespaces remains unchanged.

This decision deliberately favors semantic correctness and implementation simplicity over database compaction.

The retained atomic evidence remains the authoritative source of truth.

No separate persisted:

```text
mastery flag
proficiency state
Country completion state
scope progress state
```

is introduced.

This preserves the invariant:

```text
learning state
= derived from evidence
```

rather than creating a second persistent source of truth.

Database-size management may be reconsidered later.

Any future compaction or summarization scheme must preserve enough evidence semantics that compaction cannot alter the derived learning state.

Until such a decision exists:

> World Countries atomic learning evidence is not pruned.

---

# Learning ownership

## 44. World Countries mastery derives directly from raw atomic evidence

The current generic interface conceptually equivalent to:

```text
MasteryPolicy.isMastered(ItemProgress)
```

receives aggregate progress.

That is insufficient to express this ADR because World Countries mastery requires:

* individual attempt outcomes;
* explicit recall/recognition evidence kind;
* recorded local calendar dates;
* the most recent failure boundary.

World Countries therefore does not use the generic aggregate `ItemProgress.mastered` value as its authoritative mastery result.

World Countries mastery and proficiency are derived feature-locally from the retained raw attempt sequence under:

```text
src/features/world-countries/learning/
```

The generic shared mastery policy remains unchanged for existing consumers.

This avoids widening the generic mastery-policy abstraction merely to accommodate feature-specific World Countries semantics.

---

## 45. World Countries `learning/` owns progress semantics

Reusable World Countries learning policy belongs under:

```text
src/features/world-countries/learning/
```

This includes:

* core/additional skill classification;
* atomic proficiency derivation;
* World Countries mastery derivation;
* Country core completeness;
* additional skill progress;
* Country-state aggregation;
* scope-progress aggregation;
* progress semantics consumed by workflows and maps.

Suitable conceptual modules may include:

```text
learning/recallProgress.ts
learning/recallMastery.ts
learning/proficiency.ts
learning/scopeProgress.ts
```

Exact filenames are implementation details.

---

## 46. `drill/` owns session behavior and presentation

`drill/` continues to own:

* Drill setup;
* session orchestration;
* temporary answer records;
* session scoring;
* per-skill result summaries;
* choosing the progress perspective appropriate to a Drill mode.

It does not define:

* mastery;
* proficiency;
* core/additional skill classification;
* Country completeness.

---

## 47. `maps/` remains learning-policy neutral

Map infrastructure may render caller-provided semantic states.

It must not decide:

```text
this Country is complete
this skill is mastered
this Country is weak
```

Those decisions belong to the World Countries learning layer.

`maps/` continues to own:

* SVG behavior;
* Geography translation;
* highlighting;
* grouped interaction;
* selection rendering;
* reusable Country presentation mechanics.

---

## 48. Shared core remains domain-neutral

`core/learning` must be extended as required to preserve generic evidence metadata such as:

```text
recall / recognition
local attempt date
```

but must not acquire concepts such as:

```text
CountryId
Capital
Subregion
WorldCountriesRecallSkill
core Country skill
```

The generic mastery policy remains available and unchanged for its existing consumers.

Feature-specific mastery may derive from raw shared learning evidence where aggregate generic progress is insufficient.

---

# Scheduling

## 49. Calendar-day mastery is not the spaced-repetition scheduler

The different-calendar-date rule defines a minimum mastery requirement.

It does not define when the learner should next see the Country.

For example:

```text
August 10 ✓
August 11 ✓
→ MASTERED
```

does not imply:

```text
ask again on August 12
```

A later scheduling policy may deliberately expand review intervals:

```text
Day 1
Day 2
Day 5
Day 12
...
```

Additional successful attempts may influence future scheduling.

They must not reduce mastery.

---

## 50. Detailed Drill scheduling remains outside this ADR

This ADR does not define:

* flat Country exposure;
* weak-item weighting;
* anti-repeat policy;
* recent-Country suppression;
* mastered-Country frequency;
* end-of-batch behavior;
* session length;
* expanding review intervals;
* Maintenance due dates.

Those concerns should be defined separately, for example:

```text
Future ADR
World Countries Drill Scheduling and Exposure Policy
```

The future scheduler should consume the learning state defined by this ADR rather than defining its own meaning of `weak`, `strong`, or `mastered`.

---

# QA and testing requirements

Implementation must cover at least the following behavior.

## Atomic skill independence

Progress for:

```text
location → country
```

must not automatically alter:

```text
country → capital
capital → country
```

for the same Country.

---

## Core Country completion

Given:

```text
location → country      MASTERED
country → capital       MASTERED
capital → country       UNPRACTISED
```

expected:

```text
Country = COMPLETE
```

---

## Additional weakness does not reduce core completion

Given:

```text
location → country      MASTERED
country → capital       MASTERED
capital → country       WEAK
```

expected:

```text
Country core state = COMPLETE
capital → country = WEAK
```

---

## Additional mastery

Given:

```text
location → country      MASTERED
country → capital       MASTERED
capital → country       MASTERED
```

expected:

```text
Country core state = COMPLETE
Additional mastered = 1 / 1
```

The UI may display:

```text
Complete+
```

---

## New additional knowledge does not invalidate completion

Given an already complete Country, adding a future additional skill such as:

```text
flag → country
```

with no evidence must not cause the Country to become incomplete.

---

## Same-day free recall

```text
2026-08-10 09:00 ✓ recall
2026-08-10 09:05 ✓ recall
```

expected:

```text
STRONG
not MASTERED
```

---

## Different-calendar-date mastery

```text
2026-08-10 10:00 ✓ recall
2026-08-11 09:00 ✓ recall
```

expected:

```text
MASTERED
```

---

## Calendar-boundary mastery

```text
2026-08-10 23:59 ✓ recall
2026-08-11 00:01 ✓ recall
```

expected:

```text
MASTERED
```

This verifies that mastery uses recorded calendar dates rather than elapsed 24-hour duration.

---

## Successful attempts between qualifying dates

```text
2026-08-10 09:00 ✓ recall
2026-08-10 12:00 ✓ recall
2026-08-11 10:00 ✓ recall
```

expected:

```text
MASTERED
```

---

## Successful attempt after mastery cannot remove mastery

```text
2026-08-10 ✓ recall
2026-08-11 ✓ recall
→ MASTERED

2026-08-11 ✓ recall
```

expected:

```text
MASTERED
```

---

## Recognition success cannot reduce mastery

```text
2026-08-10 ✓ recall
2026-08-11 ✓ recall
→ MASTERED

recognition ✓
```

expected:

```text
MASTERED
```

---

## Recognition-only practice

```text
recognition ✓
recognition ✓
recognition ✓
```

may produce:

```text
STRONG
```

but must not produce:

```text
MASTERED
```

---

## Legacy successful evidence

```text
legacy ✓
legacy ✓
```

may produce:

```text
STRONG
```

but must not independently produce:

```text
MASTERED
```

---

## Incorrect recall invalidates mastery

```text
MASTERED
+
incorrect recall
```

expected:

```text
WEAK
not MASTERED
```

---

## Incorrect recognition invalidates mastery

```text
MASTERED
+
incorrect recognition
```

expected:

```text
WEAK
not MASTERED
```

---

## Legacy incorrect evidence invalidates mastery

```text
MASTERED
+
legacy incorrect attempt
```

expected:

```text
WEAK
not MASTERED
```

---

## Evidence cannot cross a failure boundary

```text
2026-08-10 ✓ recall
2026-08-12 ✓ recall
→ MASTERED

2026-08-15 ✗

2026-08-16 ✓ recall
```

expected:

```text
not MASTERED
```

The August 16 success must not combine with the August 12 success across the failure.

---

## Mastery recovery

```text
2026-08-15 ✗
2026-08-16 ✓ recall
2026-08-17 ✓ recall
```

expected:

```text
MASTERED
```

---

## Time alone does not alter state

A mastered skill with no new attempts for more than 180 days must remain:

```text
MASTERED
```

---

## World Countries attempt history is not age-pruned

A World Countries attempt older than the generic retention window must remain retrievable.

---

## World Countries attempt history is not count-pruned

A World Countries target with more than the generic per-key history cap must retain its earlier evidence.

For example, after a 201st World Countries attempt, the first attempt must not be removed solely because the generic hard cap was exceeded.

---

## Other namespace retention remains unchanged

The World Countries retention exemption must not alter existing Major System, Pi, or other namespace retention behavior.

---

## Country aggregation

Given:

```text
location → country      STRONG
country → capital       UNPRACTISED
```

expected:

```text
Country = DEVELOPING
```

This is intentional.

---

## Scope completion ignores additional skills

A Country whose core skills are mastered counts as complete in normal Subregion, Continent, and World progress even when additional skills are weak or unpractised.

---

## Scope aggregation uses Country population

Subregion, Continent, and World progress derive from current canonical Country membership.

Child-scope percentages must not be recursively averaged.

---

## Session isolation

A Drill session result such as:

```text
100% accuracy
```

must not itself create a persistent Drill-mode mastery record.

---

## Multi-skill result reporting

`Countries + Capitals` results must be able to distinguish:

```text
location → country
```

performance from:

```text
country → capital
```

performance.

---

## Map semantics

The default World Countries overview map reflects:

```text
core Country state
```

A `Countries from Capitals` progress view may instead reflect:

```text
capital → country
```

atomic proficiency.

---

## Scope-selection independence

Changing selected Drill Geography must not modify persisted or derived learning evidence.

---

## Recall safety

Before submission in:

```text
capital → country
```

the target Country must not be identifiable through learning-progress presentation.

---

# Consequences

## Positive

* The primary World Countries goal has a stable definition.
* Knowing Country location and Capital is sufficient for Country completion.
* Reverse Capital → Country recall remains valuable without moving the core finish line.
* Future Country facts can be added as additional knowledge without invalidating existing completion.
* Mastery requires successful recall on more than one human calendar day.
* Extra successful attempts can never reduce learning state.
* Free recall and recognition are represented as different evidence strengths.
* Recognition remains useful without overstating what it demonstrates.
* Failures have an explicit and predictable effect on mastery.
* Country, Subregion, Continent, and World progress derive from the same atomic evidence model.
* Session performance remains distinct from durable learning state.
* Default map progress has a clear semantic meaning.
* Retaining World Countries evidence avoids a competing persisted mastery cache.
* The future scheduler and Maintenance workflow can consume the same learning model.

## Negative

* Mastery cannot normally be established during one same-day Drill session.
* A learner using only multiple choice cannot establish free-recall mastery.
* Existing historical attempts cannot be classified perfectly.
* Learning attempts require additional metadata.
* World Countries can no longer rely on the generic `ItemProgress.mastered` result.
* World Countries progress derivation becomes more sophisticated.
* World Countries attempt history can grow indefinitely until a future compaction decision is made.
* The shared attempt persistence path needs namespace-specific retention behavior.
* Core and additional progress require richer presentation than a single percentage.

---

# Documentation impact

Implementation of this ADR requires updates to the current-state architecture documentation.

## `docs/architecture/features/WORLD_COUNTRIES.md`

Document:

* core and additional skill classification;
* World Countries feature-local mastery derivation;
* calendar-date mastery semantics;
* atomic proficiency states;
* Country core completeness;
* additional skill progress;
* Country aggregation;
* scope progress;
* progress-map interpretation;
* session-result separation;
* the fact that `recallProgress.ts` no longer treats all Country skills as equally contributing to overall Country completion.

## `docs/architecture/CORE.md`

Document:

* the enriched domain-neutral learning-evidence contract;
* recall/recognition evidence metadata;
* recorded local calendar-date metadata;
* that feature-specific mastery may derive from raw atomic evidence when aggregate `ItemProgress` is insufficient;
* that the generic mastery policy remains available but is not authoritative for World Countries.

## `docs/architecture/PERSISTENCE.md`

Document:

* the enriched learning-attempt record;
* legacy evidence handling;
* recorded local calendar-date semantics;
* the `world-countries:` retention exemption;
* no age-based pruning of World Countries atomic learning evidence;
* no per-target count pruning of World Countries atomic learning evidence;
* unchanged retention behavior for Major System, Pi, and other existing namespaces.

No persistent mastery checkpoint is introduced.

Raw World Countries atomic evidence remains the authoritative source of truth.

---

## Confirmation

Implemented in the World Countries learning evidence, progress, Drill result,
map presentation, and shared attempt-retention changes accompanying this ADR.
