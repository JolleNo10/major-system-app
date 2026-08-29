# Technical Review — Mnemonics (`major-system-app`)

**Review type:** Architecture & code-quality assessment (read-only). No files were modified.
**Date:** 2026-08-29 · **Commit state:** working tree as found · **Verification run:** `npx vitest run` → 135 files / 735 tests, all passing, 14.3s

**Measured facts used throughout this report**

| Metric | Value |
|---|---|
| TS/TSX files | 392 (257 source, 135 test) |
| Source lines | 28,210 |
| Test lines | 12,151 |
| Tests | 735 (135 files), 100% passing |
| Runtime dependencies | 4 (`react`, `react-dom`, `@dnd-kit/dom`, `@dnd-kit/react`) |
| Markdown docs | 100 files, 33,899 lines |
| `features/world-countries` share of all TS files | 233 / 392 = **59%** |
| ESLint / Prettier config | **none present** |
| CI configuration (`.github/`) | **none present** |

---

## Errata (rev. 2, 2026-08-29)

One finding was **retracted after team feedback and re-verification against `main`**:

| Item | Status | Reason |
|---|---|---|
| **WC-4 — "Silent failure on user-initiated saves"** | **Withdrawn** | False. Both `GeographyMnemonicEditor` and `InlineOrderEditor` retain the draft on failure and render a `role="alert"` error message. See §9.13. |
| `ui/SpellingPeek.tsx:75` cited as a swallowed error | **Corrected** | False. Those `catch` blocks are annotated pointer-capture guards for browsers/jsdom lacking the API. |
| F-08 | **Narrowed** | Now covers only the missing error boundary, which was re-verified as absent from `src/`. |
| §9.7 | **Rewritten** | World Countries has **four** error tiers, not three. The fourth (recoverable, rendered, draft-preserving UI errors) is a strength. |
| §9.12 risk 6, TD-10, Top-10 #8, §12 principle 8 | **Removed / updated** | Consequences of the retraction. |

**Root cause of the error:** the finding was derived from an automated inventory of `catch` block *locations* that did not record handler *contents*, and the handler bodies and render paths were not read before publishing. Findings that assert "an error is swallowed" require reading the handler and confirming there is no surfaced state.

Every other finding in this report was verified by reading the cited code directly. Conclusions and the overall assessment are unchanged; the app's error handling is somewhat **better** than rev. 1 described.

---

## 1. Executive Summary

This is a **client-only React 19 + Vite + TypeScript PWA** for mnemonic training, with four product features (Major System, Pi, Cards, World Countries) sharing a small `core/` layer and a thin `app/` composition shell. There is no server, no API client, no HTTP data layer, and no dependency injection container. Persistence is entirely local: `localStorage` for small hot state and a single IndexedDB database for append-heavy attempt history and user-authored mnemonic content.

**Overall architectural health: Good.** The package-by-feature layout is real and enforced in practice, not aspirational. Dependency direction is clean (`core` ← `features` ← `app` composition), `core/` genuinely contains zero imports from `app/` or `features/`, and there are effectively no cross-feature dependencies other than two documented, intentional data-seeding links. There are no circular dependencies inside features, no global mutable application state beyond a small number of deliberate module-level stores, and no god service layer.

**Overall code-quality health: Good, with localized hot spots.** Naming is consistent and domain-oriented, functions are generally small, pure domain logic is separated from React in the strongest features, and comments explain *why* rather than *what*. The weak spots are concentrated: four to five very large files, and a systemic split of business logic into `.tsx` in the two oldest features.

**Main strengths**

- Genuine feature isolation with a maintained `core/` boundary.
- A well-designed, feature-agnostic learning domain (`core/learning`) using opaque `RecallItemId`s.
- Single-owner IndexedDB connection with an explicitly documented rationale — a class of bug most codebases get wrong.
- 735 fast, mostly behavioral tests that run in 14 seconds.
- Strong, fail-fast data-integrity validation in World Countries.

**Main risks**

1. **Two coexisting spaced-repetition/mastery paradigms** (`core/scoring` stateful SM-2 vs `core/learning` + `world-countries/learning/reviewSchedule.ts` derived-from-evidence). Features are split across them with no stated convergence path.
2. **A module-graph cycle between `app/settings` and `features/world-countries`**, created by a monolithic global `Settings` object that carries feature-specific fields.
3. **World Countries is 59% of the codebase** and internally has 9 sibling directories, ~40 files in `learning/` alone, three different cache-invalidation mechanisms, and a 1,040-line imperative controller. It is past the point where "one feature folder" is a sufficient organizing idea.
4. **No linter, no formatter, no CI.** Seven files carry `// eslint-disable-next-line react-hooks/exhaustive-deps` for a rule that is not installed — meaning manual dependency arrays (including the `useRails`/`useLayoutHeader` layout contract) are unverified.

**Most important architectural concern:** the duplicated learning/scheduling paradigm. It is the one issue that will keep costing correctness reasoning, test effort, and onboarding time on every future learning feature.

**General assessment of World Countries:** It is the **most architecturally advanced** feature in the repository and, simultaneously, the one **exposing the limits of the current structure**. Its domain modeling, error policy, and test coverage are the best in the codebase and should be the template. Its size, internal layering, and state-refresh inconsistency are not yet a template.

**Recommended level of refactoring: Moderate.** No rewrite is warranted. Targeted convergence work (one scheduling paradigm, settings ownership, tooling) plus internal decomposition of World Countries' largest modules would resolve most of the identified risk.

---

## 2. Architecture Overview

### What actually exists

There is **no Clean Architecture, DDD, MVVM, or Hexagonal structure**, and the code does not pretend otherwise. What exists is:

- **Package-by-feature** with a shared kernel (`src/core`) and a composition shell (`src/app`).
- **React-idiomatic state**: `useState` + `useMemo` in components, React Context for cross-cutting values, and a handful of module-level singleton stores that read/write `localStorage` on demand.
- **Pure-function domain modules** (`.ts`) sitting beside React components (`.tsx`) inside each feature — a *lightweight* domain layer, not a formal one.
- **No routing library.** Navigation is a `useState<Mode>` in `src/app/App.tsx:16` resolved through a `Record<DrillMode, ModeDef>` registry in `src/app/modes.tsx:29`.
- **No DI, no service locator, no error boundaries, no logging framework.**

### Text architecture diagram (actual, not idealized)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  app/  (composition shell)                                              │
│    App.tsx ── mode: useState<Mode> ── MODES registry (modes.tsx)        │
│    layout/PageLayoutContext ── rails + header slot injection            │
│    settings/SettingsContext ── ONE global Settings object                │
│    overlays/  ModeSelector                                              │
└───────────┬──────────────────────────────────┬──────────────────────────┘
            │ renders MODES[mode].component    │ useSettings / useRails
            ▼                                  │ (features call UP into app)
┌─────────────────────────────────────────────┴──────────────────────────┐
│  features/                                                             │
│                                                                        │
│  major-system   pi              cards           world-countries        │
│  (flat, 21f)    (memo/recite/   (pao/themed/    (data/geography/       │
│                  maintain/       shared/)        learning/{flows}/     │
│                  shared/)                        drill/today/recite/   │
│                                                  maps/mnemonics/ui/)   │
│      │              │  ▲             │                  │              │
│      └──WORDS───────┘  │             └─seed Person──┐   │              │
│         (pi reads      │               (pao←themed) │   │              │
│          major-system) │                            │   │              │
└────────────────────────┼────────────────────────────┼───┼──────────────┘
                         │                            │   │
            ┌────────────┴────────────────────────────┴───┴─────────────┐
            │  core/  (feature-independent; imports nothing above)      │
            │                                                          │
            │  ── TWO PARALLEL LEARNING PARADIGMS ──                    │
            │  scoring/          │  learning/                           │
            │   itemStore (LS)   │   types (RecallItemId, Attempt)      │
            │   sm2 (stateful)   │   itemProgress (derived)             │
            │   roundScheduler   │   scheduler (selectNextItem)         │
            │   useStats         │   mastery, attempts, scopeProgress   │
            │   attemptStore(IDB)│                                      │
            │                                                          │
            │  ui/ (MultipleChoice, TypingInput, RangeSlider, …)        │
            │  mnemonics/ (opaque targetId store + backup)              │
            │  storage.ts (guarded localStorage)  answerMatch  cards    │
            └──────────────────────┬───────────────────────────────────┘
                                   ▼
            ┌──────────────────────────────────────────────────────────┐
            │  Browser storage (no server, no API)                     │
            │   localStorage  ── settings, word stores, prefs,          │
            │                    geography order, learning milestones   │
            │   IndexedDB 'major-system' v4 ── attempts, pi_stories,    │
            │                    mnemonics   (single owner:             │
            │                    core/scoring/attemptStore.ts)          │
            └──────────────────────────────────────────────────────────┘
```

### Data flow (typical drill answer)

```
user input (component)
  → pure classify/match  (core/answerMatch | wc/learning/recallAnswerMatching)
  → pure session state update  (wc/drill/drillSessionState | core/scoring/roundScheduler)
  → record evidence       (core/learning/recordAttempt → core/scoring/attemptStore → IndexedDB)
  → derive progress       (pure: recallProgress / recallMastery / reviewSchedule)
  → setState → re-render
```

Business decisions live in pure `.ts` modules in Pi and World Countries; in Major System and Cards they live substantially inside the `.tsx` drill components.

### Deviations and exception flows worth naming

- **`app` → `features` → `app` cycle.** `src/app/settings/settings.ts:4` imports `@/features/world-countries`; the barrel re-exports `WorldCountries.tsx`, which imports `@/app/settings/SettingsContext` (line 3).
- **Features reach *up* into `app`** for `useSettings` and `useRails`. This is a documented seam, but it means no feature is independently mountable without the `app` shell.
- **Three different refresh/invalidation mechanisms coexist inside World Countries** (see §9).

---

## 3. Architecture Scorecard

| Area | Rating | Notes |
|---|---|---|
| Separation of concerns | **Mixed–Good** | Excellent in Pi and World Countries `.ts` modules; weak in Major System / Cards drill components (400–600 line `.tsx` holding scheduling + stats + UI). |
| Feature isolation | **Good** | Only 2 cross-feature edges, both documented and one-directional. No feature reaches into another's persistence. |
| Dependency direction | **Good, with one cycle** | `core` is clean (verified: zero imports from `app`/`features`). The `app/settings ↔ world-countries` cycle is the only structural violation. |
| Domain modeling | **Mixed** | World Countries and Pi model IDs and states properly. Major System uses bare `"00"`–`"99"` strings and untyped composite keys like `"7:sounds"`. |
| Code structure | **Mixed** | Excellent at the top level; ambiguous *inside* World Countries where 9 sibling folders and ~40 `learning/` files make placement decisions non-obvious. |
| Code consistency | **Mixed** | Two learning paradigms, two store patterns, three refresh mechanisms, two feature-folder shapes (flat vs capability). |
| Testability | **Good** | Pure-function-first design in the newer features makes most logic trivially testable. Large `.tsx` drills are the untestable residue. |
| Error handling | **Mixed** | World Countries has a *deliberate, coherent* four-tier policy (fail-fast on data/config, escalate storage writes, degrade on geometry, recoverable UI errors on user writes). Elsewhere the default is silent swallow. No error boundaries anywhere. |
| Maintainability | **Mixed–Good** | Helped enormously by high test coverage and unusually good comments; hurt by file size concentration and absent tooling. |
| Extensibility | **Good** | `MODES` registry, `createWordStore` factory, `PageLayout` rail slots, and opaque-ID core abstractions all extend cleanly. |
| Reliability | **Good** | 735 green tests, guarded storage, careful IndexedDB lifecycle, verified listener/observer cleanup. |
| Tooling / process | **Poor** | No lint, no format, no CI. Disabled-rule comments for an uninstalled rule. |

---

## 4. What Is Working Well

These are the patterns the team should **preserve and standardize on**.

### 4.1 The `core/` boundary is real

`src/core/` contains **zero** imports from `src/app` or `src/features` (verified by search). This is rare and valuable: it means `core` can be reasoned about, tested, and changed without feature knowledge. `core/learning` and `core/mnemonics` treat feature IDs as **opaque strings** (`src/core/mnemonics/types.ts:4`, `src/core/learning/scheduler.ts:86`) with the rationale written into the code. **Preserve this. Make it a tested invariant.**

### 4.2 Single-owner IndexedDB connection

`src/core/scoring/attemptStore.ts:52` owns the one `major-system` DB connection, and the comment explains exactly why (*"a second open at a different version would block the upgrade (onblocked hang)"*). Upgrades are idempotent via `objectStoreNames.contains()`, and `pi_stories` correctly reuses `getDb()` instead of opening its own handle. This is the highest-quality infrastructure code in the repository.

### 4.3 The `MODES` registry

`src/app/modes.tsx:29` is `Record<DrillMode, ModeDef>`, so TypeScript forces title + component + selector card to be wired together. The comment documents the failure mode it replaced. This is the right amount of abstraction: one type, zero indirection, compile-time enforcement.

### 4.4 The `PageLayout` slot contract

`src/app/layout/PageLayoutContext.tsx:44` splits read and write contexts so publishing a rail cannot re-render the publisher. That is a subtle, correct piece of React design, and it is documented in-file.

### 4.5 `createWordStore` factory

`src/core/createWordStore.tsx` provides a generic three-layer store (shipped → saved → trial overrides) reused by Major System words, Sound Key, Themed Cards, and PAO. One abstraction, four real implementations, clear benefit. **This is the model for "when to abstract" in this codebase.**

### 4.6 World Countries fail-fast data integrity

`data/countryClassification.ts:100` throws at module load if any country lacks a geopolitical classification, rather than assigning a fallback. Similarly `maps/learningAnchors.ts:68` and `maps/syntheticDots.ts:89` throw on stale map-anchor references. **Data-authoring mistakes cannot silently ship.** Adopt this policy elsewhere.

### 4.7 Country-set policy registry

`geography/countrySet.ts:26` keeps the "what counts as a country" predicates in one registry and derives membership; the persisted setting stores only *policy IDs*, never resolved country IDs. This is a textbook-correct separation of policy from derived data, and it makes the setting migration-proof.

### 4.8 Test posture

735 tests in 14 seconds, mostly pure-function tests plus real-behavior integration tests. `maps/WorldCountriesMapClick.integration.test.tsx` exercises real bundled SVG assets through the full click → answer chain. Tests assert contracts and outcomes far more than DOM structure.

---

## 5. Key Findings

Ordered by impact.

---

### F-01 · Two parallel spaced-repetition / mastery paradigms in `core/`

**Severity:** High · **Scope:** Whole app · **Priority:** P1 · **Effort:** Large

**Location:** `src/core/scoring/sm2.ts`, `src/core/scoring/itemStore.ts`, `src/core/scoring/useStats.ts` vs `src/core/learning/`, `src/features/world-countries/learning/reviewSchedule.ts`

**Observation.** Two complete, independent models of "what should the learner see next and is it mastered" coexist:

| | `core/scoring` (SM-2) | `core/learning` (+ WC `reviewSchedule`) |
|---|---|---|
| Storage | Mutable `ItemRecord` in localStorage (`ease`, `intervalDays`, `dueAt`, `reps`) | Immutable append-only `Attempt` log in IndexedDB |
| Scheduling | Stateful SM-2 ease-factor algorithm (`sm2.ts:12`) | Derived fixed ladder `[1,3,7,14,30,60]` with local-date awareness (`reviewSchedule.ts:3`) |
| Mastery | Boolean from `reps`/`ease` | 5-state proficiency + "2 recall dates after latest failure" (`recallMastery.ts`) |
| Consumers | major-system, cards, pi/maintain | pi (partially), world-countries |

Pi straddles both: `pi/maintain/piMaintainStore.ts:2` uses `applySm2`, while `pi/shared/piLearning.ts:1` uses `core/learning`. World Countries uses `core/learning` for evidence and `core/scoring/roundScheduler` for in-session ordering (`learning/schedulerLearningSession.ts:9`).

**Problem.** There is no single answer to "is this item due?" or "is this item mastered?" A developer must first determine which paradigm a feature uses. The two models also disagree semantically: SM-2 mutates hidden per-item state; the derived model recomputes everything from evidence and is therefore replayable, migratable, and testable.

**Why it matters.** Every new learning feature forces an unowned architectural decision. Every cross-feature statistic (the Stats overlay, `getDueCount` in `app/ModeSelector.tsx:4`) can only report on one of the two. Bugs in one model do not transfer learning to the other. This is the largest source of conceptual load in the codebase.

**Recommendation.** Pick one as the strategic direction — the evidence-derived `core/learning` model is the stronger design (immutable log, derivable, no hidden state, already the most tested) — and declare `core/scoring/sm2` legacy. Do **not** migrate everything at once. Freeze SM-2 (no new consumers), and migrate feature-by-feature only when that feature is being worked on anyway. Consider hoisting World Countries' `reviewSchedule` into `core/learning` once a second feature needs it — **not before**.

---

### F-02 · Module cycle between `app/settings` and `features/world-countries`, via a monolithic global `Settings`

**Severity:** High · **Scope:** Whole app · **Priority:** P1 · **Effort:** Medium

**Location:** `src/app/settings/settings.ts:4-8`, `src/features/world-countries/index.ts`, `src/features/world-countries/WorldCountries.tsx:3`

**Observation.** `Settings` is one flat object holding 9 fields, 7 of which are feature-specific:

```ts
interface Settings {
  masteryLatencyFactor            // core/scoring
  maxPiDigits                     // pi
  piPairsPerAnswer                // pi
  piMaintainBatchSegs             // pi
  sessionUnmasteredShare          // core/scoring
  offlineMode                     // app
  worldCountriesFuzzyAnswerMatching        // world-countries
  worldCountriesNewItemsPerSet             // world-countries
  worldCountriesIncludedEntityGroups       // world-countries
}
```

To type the last two, `app/settings/settings.ts` imports `LearningSetMaximum` and `WorldCountriesEntityGroupId` **from the World Countries barrel**, which re-exports `WorldCountries.tsx`, which imports back into `app/settings`. A genuine import cycle.

**Problem.** The cycle is currently benign (bundlers tolerate it, and the type imports are erased) but it is fragile — adding a value import at the wrong place produces a TDZ crash at module-init time. More importantly it signals the underlying issue: **`app` owns feature configuration schema**. Every new feature setting widens a shared object and adds a new `app → feature` edge. `SettingsOverlay.tsx` at 527 lines is the visible symptom.

**Why it matters.** It blocks the otherwise-clean claim that features are independently removable. It concentrates unrelated churn in one file. It will only grow.

**Recommendation.** Move to **namespaced, feature-owned settings slices**. Conceptually:

```ts
// app owns the container and persistence, not the schema
interface Settings {
  app: AppSettings
  features: {
    'world-countries': WorldCountriesSettings   // type + defaults + normalize
    pi: PiSettings                              // owned in the feature
  }
}
```

Each feature exports `{ defaults, normalize, SettingsPanel }` from its barrel; `app` composes them without knowing the fields. This removes the cycle, shrinks `SettingsOverlay`, and makes settings additions a one-file change inside the feature.

---

### F-03 · World Countries dominates the codebase and has outgrown a single feature folder

**Severity:** High · **Scope:** World Countries · **Priority:** P1 · **Effort:** Medium (incremental)

**Location:** `src/features/world-countries/**` — 233 of 392 TS files

**Observation.** World Countries has 9 sibling directories (`data`, `geography`, `learning`, `drill`, `today`, `recite`, `maps`, `mnemonics`, `ui`), with `learning/` alone holding ~40 non-test files and a `flows/` sub-folder of 14 step components + 5 support modules. The other three features together are 82 files.

**Problem.** Placement decisions inside the feature are genuinely ambiguous. There is `learning/scopeProgress.ts`, `learning/learningProgress.ts`, `learning/learningPracticeProgress.ts`, `learning/recallProgress.ts`, `learning/progressPresentation.ts`, and `drill/drillProgressPresentation.ts` + `drill/drillSessionProgress.ts` + `recite/reciteProgress.ts`. Each is individually justified, but the set has no discoverable naming law. A newcomer cannot predict which one to open.

**Why it matters.** This is where the marginal cost of a change is highest, and it is the feature under most active development.

**Recommendation.** Do not restructure wholesale. Two low-risk moves:

1. Add a short `learning/README.md`-style index (or extend the existing `AGENTS.md`) that names, for each of the ~10 `*Progress*` / `*Recall*` modules, its **one sentence of ownership** — effectively the table in §9.4 of this report.
2. Where a folder exceeds ~20 files, introduce an internal barrel that defines the folder's *own* public surface, so sibling folders import `learning/` rather than `learning/recallMastery`. This makes future splits non-breaking.

---

### F-04 · No linter, no formatter, no CI — with disabled-rule comments for an uninstalled rule

**Severity:** High · **Scope:** Whole app · **Priority:** P1 · **Effort:** Small

**Location:** `package.json` (no lint dependency, no lint script); no `.github/`; `// eslint-disable-next-line react-hooks/exhaustive-deps` in 7 files including `app/layout/PageLayoutContext.tsx:105`, `world-countries/maps/SvgMapView.tsx:133`, `major-system/WordNumberDrill.tsx:132`, `cards/shared/DeckMemoDrill.tsx:152`

**Observation.** The codebase suppresses `react-hooks/exhaustive-deps` in exactly the places where it matters most, but the rule has never been installed. The `useRails(config, deps)` / `useLayoutHeader(node, deps)` contract in `PageLayoutContext.tsx:98` *requires* hand-written dependency arrays and is used by ~10 rail components with arrays up to 25 entries long (`learning/flows/GuidedLearningRails.tsx:179`, `drill/DrillSessionRails.tsx:83`).

**Problem.** A stale rail is a silent bug class: the UI keeps showing outdated content with no error and no failing test. Nothing mechanically checks these arrays.

**Why it matters.** This is the highest-value-per-hour fix in the report. `eslint` + `eslint-plugin-react-hooks` + `typescript-eslint` and a `lint` script would validate ~10 correctness-critical dependency arrays and make the existing suppression comments meaningful. Absence of CI means `npm test` and `npm run build` are only ever run at an author's discretion.

**Recommendation.** Add ESLint (flat config) with `react-hooks` + `typescript-eslint` recommended, add a `lint` script, and add a minimal CI workflow running `typecheck → lint → test → build`. Do **not** bulk-fix existing violations in the same change; land the tooling, record the baseline, and fix opportunistically.

---

### F-05 · Business logic embedded in large drill components (Major System, Cards)

**Severity:** Medium · **Scope:** major-system, cards · **Priority:** P2 · **Effort:** Medium

**Location:** `cards/pao/PaoCardsDrill.tsx` (593), `cards/shared/DeckMemoDrill.tsx` (449), `cards/shared/CardsDrill.tsx` (431), `cards/pao/PaoDeckMemoDrill.tsx` (424), `major-system/WordNumberDrill.tsx` (374)

**Observation.** These components each hold 10–15 `useState` calls plus question generation, pool filtering, streak/stats computation, run-history persistence, and personal-best calculation, interleaved with JSX.

**Problem.** The logic is only reachable through a rendered component, which is why **Major System has exactly one test file** (CSV parsing) and Cards has four (all data-layer). Contrast Pi, which delegates to `pi/shared/piStats.ts` / `pi/maintain/piMaintain.ts` and has 10 test files.

**Why it matters.** These are the *oldest* features and the ones with real user-facing scheduling behavior (`RepetitionDrill`, `SpeedRound`). They are effectively untested and effectively unchangeable without manual QA.

**Recommendation.** Extract the *decision* functions only — `makeQuestion`, pool selection, streak/best computation, run-history reducers — into sibling `.ts` modules, following the shape World Countries already uses (`drillSessionState.ts` + `DrillSession.tsx`). Leave timing, focus management, and JSX in the component. Do this **when touching a drill**, not as a campaign.

---

### F-06 · `SvgMapController.ts` is a 1,040-line god class

**Severity:** Medium · **Scope:** World Countries · **Priority:** P2 · **Effort:** Medium

**Location:** `src/features/world-countries/maps/SvgMapController.ts`

**Observation.** One class with ~17 mutable fields (`countries`, `highlighted`, `countryColors`, `mutedCountries`, `hiddenCountries`, `named`, `countryLabelOverrides`, `hoverGroups`, `groupOutlines`, `visibleGroupOutlines`, `hoveredCountryId`, `hoveredIds`, `listeners`, `taskAssistance`, `resizeObserver`, `abortController`, `discoveryCache`) and 40+ public methods spanning 11 distinct concerns: loading/parsing, country discovery, highlighting, colouring, muting, hiding, name toggling, label overrides, hover behaviour, group outlines, zoom/presentation, and task assistance.

**Problem.** Every one of those concerns is a reason for this file to change. There is no way to use, say, the hover-group logic without instantiating the entire controller against a real SVG.

**Why it matters (with an important caveat).** The mitigating facts are unusually strong: lifecycle hygiene is correct (ResizeObserver disconnected, listeners tracked and removed, `AbortController` aborted on destroy, `destroyed` guard on every method), and it is backed by 890 lines of behavioral tests plus a 586-line integration test using real bundled SVGs. **This is a well-tested god class, not a dangerous one.** The cost is comprehension and change friction, not defect rate.

**Recommendation.** Do **not** rewrite. Peel off cohesive slices behind the existing public API as they are touched — the group-outline/SVG-filter machinery and the label-override machinery are the two most separable. `svgTaskAssistance.ts` (857 lines) was already extracted this way per `docs/changes/0044`, which proves the approach works. Treat that as the established playbook.

---

### F-07 · Three different cache-invalidation mechanisms inside World Countries

**Severity:** Medium · **Scope:** World Countries · **Priority:** P2 · **Effort:** Small–Medium

**Location:**

1. `useSyncExternalStore` subscription — `geography/geographyRefresh.ts:23`, consumed by `drill/DrillSetup.tsx:62` and `recite/WorldCountriesRecite.tsx:91`
2. Local integer counters used as fake `useMemo` deps — `today/WorldCountriesToday.tsx:54` (`revision`), `drill/WorldCountriesDrill.tsx:71` (`geographyVersion`)
3. A `mnemonicVersion` / `refreshKey` prop threaded 4 levels deep — `drill/WorldCountriesDrill.tsx:72` → `drill/DrillSession.tsx:65` → `drill/DrillSessionRails.tsx:23` → mnemonic panel

**Observation.** All three exist to solve the same problem: *module-level `localStorage` stores are read during render, so React cannot know when they change.* For example:

```ts
// WorldCountriesDrill.tsx:74-77 — deps don't appear in the body; they exist only to bust the memo
const selectionMetadata = useMemo<DrillSelectionMetadata>(() => ({
  world: getWorldMetadata(),
  continents: getAllContinentMetadata(),
  subregions: getAllSubregionMetadata(),
}), [activeCountries, geographyVersion])
```

**Problem.** Mechanism (1) is correct and idiomatic React 19. Mechanisms (2) and (3) are manual re-implementations of it that are invisible to any tooling, cannot be verified, and silently break if a caller forgets to bump the counter. `getAllSubregionLearningStates(activeCountries)` is also called with `phase` as a dep in `WorldCountriesDrill.tsx:98` — a semantically unrelated trigger.

**Why it matters.** Failure mode is a stale UI with no error and no test failure. It is also the single clearest example of the same problem being solved three ways in one feature.

**Recommendation.** `geographyRefresh` already demonstrates the correct pattern. Extend the same subscribe/notify + `useSyncExternalStore` shape to `subregionLearningStore` and to the mnemonic store, then delete the manual counters and the `refreshKey` prop chain. This is a genuine simplification (removes props and state), not added abstraction.

---

### F-08 · No error boundary above the fail-fast data layer

**Severity:** Medium · **Scope:** Whole app · **Priority:** P2 · **Effort:** Small

> **Corrected 2026-08-29.** An earlier draft of this finding also claimed that user-initiated mnemonic and order saves failed silently. That was wrong — see the retracted WC-4 in §9.13. This finding is now narrowed to the error-boundary gap, which was re-verified.

**Location:** No `componentDidCatch` / `getDerivedStateFromError` / `ErrorBoundary` anywhere in `src/` (verified). Module-load throws at `data/countryClassification.ts:100`, `data/countries.ts:248`, `data/subregions.ts:78`, `maps/learningAnchors.ts:68-87`, `maps/syntheticDots.ts:89-108`.

**Observation.** World Countries has a **deliberate and coherent** policy: throw on data/config/programmer errors (16+ `throw new Error` sites with domain-specific messages), escalate storage-write failures as domain errors, degrade silently on geometry/presentation failures, and surface async and user-write failures as rendered UI state. Pi has a smaller version (reads swallowed, writes deliberately not caught so quota errors surface — `pi/shared/story/piStories.ts:125`). Major System and Cards default to swallow-everything via `core/storage.ts`.

**Problem.** The strong throws are the hazard: a data-authoring error in `data/countryClassification.ts:100` throws at *module evaluation*, and with no error boundary the result is a blank screen for the whole app, not a degraded World Countries tab.

**Why it matters.** Fail-fast is the right call for data integrity — but only if there is something to catch it. The blast radius of an authoring mistake is currently the entire application, including the three unrelated features.

**Recommendation.** Add one `ErrorBoundary` around the mode content area in `App.tsx:105` so a feature crash degrades to a message rather than a white screen. Do **not** add error handling to reads or geometry paths; the current degradation there is correct, and the user-write paths already surface errors properly.

---

### F-09 · `DeckMemoDrill` / `PaoDeckMemoDrill` fork (~80% overlap)

**Severity:** Low · **Scope:** cards · **Priority:** P3 · **Effort:** Small

**Location:** `cards/shared/DeckMemoDrill.tsx` (449) vs `cards/pao/PaoDeckMemoDrill.tsx` (424)

**Observation.** Both implement memo → recall → done phases, run-history persistence, personal-best calculation, and progress dots. The genuine difference is data shape (`Card[]` vs grouped `Card[][]` triples). The fork is **explicitly documented and justified** in `docs/architecture/features/CARDS.md`.

**Assessment.** This is a defensible decision, not a defect. The duplicated part is the *glue* (`rankKey`, `runPct`, `configHistory`, `isNewBest`, date/duration formatting), roughly 100–150 lines.

**Recommendation:** extract only the history/personal-best helpers into a shared `.ts` module when either drill is next modified. Leave the components forked. Do not build an inheritance hierarchy or a generic engine here.

---

### F-10 · Documentation volume exceeds source volume

**Severity:** Low · **Scope:** Repository process · **Priority:** P3 · **Effort:** Small

**Observation.** 33,899 lines of Markdown across 100 files (46 ADRs, ~45 change specs, 5+ architecture docs, per-feature `AGENTS.md`) versus 28,210 lines of source. Individual ADRs run to 1,651 lines (`docs/adr/0019-...`).

**Assessment — with balance.** Much of this is genuinely load-bearing: `docs/architecture/INVARIANTS.md` and the per-feature `AGENTS.md` files are exactly the routing documents this codebase needs, and the code comments are consistently excellent. The concern is narrower: **~46 ADRs and ~45 change specs of historical rationale carry a real risk of drifting out of sync** with a codebase this actively refactored, and `docs/adr/LEGACY_CLASSIFICATION.md` already exists because that drift was recognized.

**Recommendation:** keep the current-state architecture docs and invariants; treat the ADR/change-spec corpus as an append-only archive that is never consulted for implementation. This is already the stated policy — the finding is simply that the ratio is worth a conscious team decision rather than passive growth.

---

## 6. Cross-Feature Consistency Review

| Concern | major-system | pi | cards | world-countries | Assessment |
|---|---|---|---|---|---|
| **Folder shape** | Flat, 21 files | Capability (`memo`/`recite`/`maintain`/`shared`) | Variant (`pao`/`themed`/`shared`) | Capability, 9 dirs + `flows/` | **Converge on capability folders.** Flat is only viable below ~20 files. |
| **Barrel size** | 11 exports (components + `WORDS` data) | 4 exports | 4 exports | 7 exports (types + policy fns + backup) | Pi/Cards/WC are right. Major System leaks components. |
| **State** | Context (`createWordStore`) + component `useState` | Component `useState` + module fns | Context + component `useState` | Component `useState` + 3 Contexts + module singletons | Broadly consistent; no global store anywhere. Good. |
| **Persistence** | `createWordStore` → localStorage | localStorage + `attemptStore` + mnemonics | `createWordStore` → localStorage | 7 namespaced localStorage keys + `core/learning` | All go through `core/storage`. **Consistent and good.** |
| **Scheduling** | SM-2 (`useStats`) | SM-2 (`maintain`) *and* `core/learning` (`piLearning`) | `roundScheduler` only (session-scoped) | `core/learning` + derived `reviewSchedule` + `roundScheduler` | **Inconsistent — F-01.** |
| **Domain IDs** | Bare `"00"`–`"99"`, untyped composite keys `"7:sounds"` | `piPairItemId(pos)` → `"pi:pair:1"` | `Card` type from `core/cards` | `CountryId`, `SubregionId`, `ContinentId`, durable recall item IDs | **WC and Pi are the model.** Major System has real primitive obsession. |
| **Logic placement** | ~60% in `.tsx` | ~70% in pure `.ts` | ~60% in `.tsx` | ~75% in pure `.ts` | **WC/Pi pattern should be the convention.** |
| **Error policy** | Swallow (storage), throw at data build | Read-swallow / write-surface | Swallow | Throw on data, escalate storage writes, degrade on geometry, rendered error state on async + user writes | **WC policy is the most deliberate — adopt it app-wide.** |
| **Refresh/invalidation** | n/a | n/a | n/a | 3 mechanisms | **Inconsistent — F-07.** |
| **Tests** | 1 file | 10 files | 4 files (data only) | ~120 files | Coverage tracks logic placement exactly. |
| **Cross-feature coupling** | exports `WORDS` | imports `useWords` from major-system (4 files) | `pao` seeds Person from `themed` (1 file, write-isolated) | **zero** | All acceptable; WC is the cleanest. |

**Which patterns should become conventions:** World Countries' *domain/logic* patterns (typed IDs, pure `.ts` decisions, fail-fast data validation, evidence-derived progress) and Pi's *folder/barrel discipline*. World Countries' *size and refresh handling* should not be copied.

---

## 7. Code Structure & Standards Review

### Strengths

- **Naming is domain-first and consistent**: `resolveCountrySet`, `deriveWorldCountriesTodayPlan`, `reconcileSubregionLearningMembership`, `getCountriesForSubregionInEffectiveOrder`. Verbs are honest (`derive` = pure, `resolve` = pure with policy, `get*Store` = touches storage).
- **Comments explain rationale, not mechanics.** `attemptStore.ts:52`, `PageLayoutContext.tsx:44`, `vite.config.ts` `readGitCommit`, and the `DEV_PWA_CLEANUP_WORKER` block are all examples of comments that could not be inferred from the code. This is above average for a codebase of this size.
- **Immutability is the default** in domain modules — `readonly` arrays, `ReadonlyMap`, defensive copies on store reads (`subregionLearningStore.ts:82` returns `{ ...state }`).
- **Magic values are named**: `SUCCESS_FEEDBACK_DURATION_MS`, `WORLD_COUNTRIES_REVIEW_INTERVAL_DAYS`, `HISTORY_RETENTION_DAYS`, `MASTERY_FACTOR_MIN/MAX/STEP`.
- **TypeScript `strict: true`** with path aliases and `isolatedModules`.

### Weaknesses

- **File-size concentration.** 5 files ≥ 500 lines; ~15 ≥ 300. All are components or controllers, i.e. exactly the code that is hardest to test.
- **`noUnusedLocals: false` / `noUnusedParameters: false`** in `tsconfig.json` — dead locals will not be caught, and with no linter nothing else catches them either. (The codebase compensates with a `_prefix` convention, e.g. `answerMode: _answerMode`, but this is by discipline only.)
- **Prop-drilling depth.** `mnemonicVersion` and `onMnemonicChanged` are threaded through 4 component levels in the drill path.
- **Very long `useRails` dependency arrays** (up to 25 identifiers) that are unverifiable — see F-04.
- **`Country` carries display and learning concerns together** (`country`, `capital`, `subregion` label *and* `subregionId`, plus `countryAliases`/`capitalAliases` used only by answer matching). Pragmatic at this size, but it is the one place where a view concern and a domain concern share a type.

### Placement clarity test

Can a newcomer answer these?

| Question | Answerable? |
|---|---|
| Where should a new feature live? | **Yes** — `src/features/<name>/` + register in `MODES`. |
| Where should shared code go? | **Yes** — `core/`, and the no-upward-import rule is explicit. |
| Where should business logic go? | **Partially** — WC/Pi say "pure `.ts` module"; major-system/cards say "in the component". Contradictory. |
| Where does API integration live? | **N/A** — no API. Correctly reflected by the absence of any client layer. |
| Where does validation happen? | **Partially** — data validation at module load (WC), answer validation in `answerMatch`/`recallAnswerMatching`, settings normalization in `app/settings`. No stated rule. |
| Which scheduling model do I use? | **No** — see F-01. |
| Where do I put a new setting? | **No** — currently `app/settings/settings.ts`, which is the wrong owner. See F-02. |
| Inside World Countries, where does X go? | **No** — see F-03. |

---

## 8. Domain Model Review

There is **no DTO/API/persistence-model split, and correctly so** — there is no external API. The relevant question is whether persisted shapes leak into domain logic, and largely they do not.

### Modeled well

- **`Country`** (`data/countries.ts:26`) — stable ISO-like `id` explicitly documented as *"used by persisted learning and mnemonic records"*, separate `subregionId` (stable) from `subregion` (display label), and `unM49Subregion` retained when app geography diverges from the UN standard. This is careful, honest modeling.
- **`CountryClassification`** (`data/countryClassification.ts:15`) — a proper value object with a discriminated `relationship`, validated exhaustively at load.
- **`core/learning` types** — `RecallItemId` (opaque), `Attempt { at, ok, ms, evidenceKind, localDate }`, `ItemProgress` (derived, never stored). Persisting *evidence* and deriving *state* is the strongest single modeling decision in the codebase.
- **World Countries recall skills** — 4 atomic skills split into core (2) and additional (2) in `learning/recallTargets.ts`, with durable item-ID construction owned by the feature.
- **`WorldCountriesEntityGroupId`** — policy is modeled as an ID; membership is derived. Persisted state stays valid when the country list changes.

### Primitive obsession (real, localized)

- **Major System** keys everything by bare `"00"`–`"99"` strings and uses untyped composite keys such as `"7:sounds"` built by string concatenation in `createWordStore`. A typo produces a silent miss, not a type error.
- **Storage keys** are string literals spread across 7+ files in World Countries and more elsewhere. No central registry, which matters for reset/export correctness.

### Not over-engineered — deliberately

There are **no** value-object wrappers for `Capital`, `Population`, or `Continent`, and no repository interfaces. Given a single local data source and no alternate providers, that restraint is correct. The `docs/` corpus shows the team has repeatedly *removed* speculative layers (`quiz/`, `domain/`, `persistence/`) — the `AGENTS.md` even instructs against recreating them. **This judgment should be preserved.**

### Not modeled at all (correctly)

Currency, language, population, borders, and flags do not exist in the `Country` type. This is a memorization trainer, not a country encyclopedia. Do not add them speculatively.

---

## 9. World Countries Deep Dive

### 9.1 Current Structure

**Boundary.** `src/features/world-countries/` — 233 TS files (~130 non-test) + 10 bundled SVG map assets. Public surface is 7 exports from `index.ts`: the `WorldCountries` component, entity-group policy definitions + normalizer, `UN_MEMBER_COUNTRY_IDS`, two types, and the 4 order-backup functions. **Zero imports from other features.**

```
world-countries/
├── index.ts                 public surface (7 exports)
├── WorldCountries.tsx       shell: Today | Drill | Recite tabs
├── WorldCountriesPopulationContext.tsx   active country set
├── data/         countries (252 lines), classification, subregions   ← pure data + invariants
├── geography/    countrySet, subregionScope, effectiveOrder,
│                 {world,continent,subregion}Metadata + Store,
│                 orderAuthoring, orderBackup, geographyRefresh, queries
├── learning/     ~40 files: recall{Progress,Mastery,History,Targets,
│                 AnswerMatching}, reviewSchedule, scopeProgress,
│                 staged{Country,Capital}LearningFlow, subregionLearning*
│   └── flows/    14 step components + presentation/derivation helpers
├── drill/        29 files: setup → session → results, 4 drill modes
├── today/        todayPlan, reviewQueue, reviewInterleaving, reviewReason + UI
├── recite/       reciteSession, reciteProgress, recitePresentation + UI
├── maps/         SvgMapController (1040), svgTaskAssistance (857),
│                 adapters, geometry, anchors + 10 SVG assets
├── mnemonics/    geographyMnemonics, IDs, editor/view/panel
└── ui/           map surface, typed answer, order editor, rails, breadcrumbs
```

### 9.2 Dependency / Data Flow

**Internal dependency edges (verified, acyclic):**

```
data/  ──────────────────────────────────────►  (imported by everything, imports nothing)
  ▲
geography/  ──► data/
  ▲
learning/   ──► data/, geography/
  ▲     └─ flows/ ──► learning/, data/, geography/, maps/, ui/, mnemonics/
  │
maps/       ──► data/, geography/, ui/
mnemonics/  ──► data/, @/core/mnemonics
ui/         ──► data/, learning/
  ▲
drill/  today/  recite/  ──► data/, geography/, learning/, maps/, mnemonics/, ui/
```

`maps/` does **not** import `learning/`, `drill/`, or `today/` in production code — the coupling appears only in the integration test, which is correct. **No circular dependencies.** The one wrinkle is `ui/ → learning/` and `learning/flows/ → ui/`, which is acyclic at file level but blurs which of the two is lower.

**Runtime flow — a Today review answer:**

```
WorldCountries.tsx                 tab state, useLayoutHeader
  └─ WorldCountriesPopulationProvider   resolveCountrySet(settings.includedEntityGroups)
      └─ WorldCountriesToday.tsx
           ├─ useEffect → loadWorldCountriesRecallHistory()      [ASYNC BOUNDARY]
           │                └─ core/learning → attemptStore → IndexedDB
           │                   → EvidenceState: loading | ready | error
           ├─ useMemo → buildWorldCountriesTodayPlan({history, learningStates, order})
           │      └─ per country × core skill → deriveReviewSchedule()  [due? tier?]
           │      └─ reviewInterleaving  [block ≤12, vary country/skill/subregion]
           │      └─ next-learning recommendation
           ├─ createWorldCountriesTodayReviewQueue()   [retry insertion ≤3 ahead]
           └─ TodayReviewSession
                 └─ DrillSession / map surface
                      ├─ classifyRecallAnswer()  → 'none' | 'exact' | 'fuzzy'
                      ├─ recordWorldCountriesAttempt() → core/learning.recordAttempt
                      │                                → IndexedDB append
                      └─ setState → re-derive → render
```

**Where things live:**

| Step | Owner |
|---|---|
| Business decisions (due, mastered, next) | `learning/reviewSchedule.ts`, `learning/recallMastery.ts`, `today/todayPlan.ts` — all pure |
| Transformations | `learning/recallHistory.ts` (group), `recallProgress.ts` (derive), `*Presentation.ts` (format) |
| Validation | `data/*` at module load (throws); `learning/recallAnswerMatching.ts` for answers |
| State | Component `useState`; module singletons for geography order + learning milestones |
| Persistence | `geography/*Store.ts` (7 localStorage keys), `core/learning` → IndexedDB |
| Error translation | `WorldCountriesToday.tsx` async catch → `{status:'error'}`; stores rethrow domain-named errors |

### 9.3 Architecture Assessment

**Strong.** Feature boundary is genuinely closed (7 exports, zero cross-feature imports). Internal dependency direction is clean and acyclic. Business logic is overwhelmingly in pure, testable `.ts`. There is no repository abstraction and none is needed — data is bundled and static. No caching layer beyond the map discovery cache, which is appropriate.

**Weak.** The `learning/` folder has no internal public surface, so `drill/`, `today/`, and `recite/` each reach into ~10 individual modules. Combined with F-03 and F-07, the feature's *internal* architecture is less disciplined than its external boundary.

**One notable design tension.** `maps/SvgMapController.ts` imperatively owns a DOM subtree that React mounted (`mount.replaceChildren(imported)`), then mutates styles, attributes, text nodes, and SVG filter chains directly. This is a legitimate and common escape hatch for SVG at this scale, and the lifecycle discipline is correct — but it is the one place where React's model does not apply, and any future contributor must understand that before touching `SvgMapView.tsx`.

### 9.4 Domain Model Assessment

| Concept | Representation | Verdict |
|---|---|---|
| Country ID | `type CountryId = string` (ISO-like), stable, documented as persistence key | **Just right** |
| Country | Interface with id/name/capital/continent/subregionId/subregion/aliases | **Just right** (mild display+domain mixing) |
| Subregion | `SubregionId` + `SubregionDefinition` (label separate from identity) | **Just right** |
| Continent | String-union `Continent` + `ContinentId` + map-id table | **Just right** |
| Capital | `string` on `Country` | **Just right** — no behavior justifies a type |
| Classification | `CountryClassification` value object, exhaustively validated | **Just right** |
| Entity group | Policy registry + predicate; persists IDs only | **Just right** — best modeling in the repo |
| Recall skill | 4-member union, core/additional split | **Just right** |
| Recall item ID | Feature-constructed durable string over `core/learning`'s opaque ID | **Just right** |
| Review schedule | `WorldCountriesReviewSchedule` — 14 derived fields | **Slightly complex, but justified** — every field feeds UI or ordering |
| Proficiency | 5-state union vs `core/learning`'s boolean `mastered` | **Divergent — see F-01** |
| Country order | User-authored order in metadata stores, never mutates canonical membership | **Just right** — invariant is stated and tested |
| Population/currency/language/borders/flag | **Absent** | **Correct** — not needed |
| Search / filter / sort / favorites | **Absent** (drill selection ≈ filtering) | **Correct** for the product |

There are **no external API models**, so nothing can leak. Persistence shapes (`SubregionLearningState`, `PersistedMembership`) are parsed defensively at the store boundary and never flow into domain functions raw.

### 9.5 State Management Assessment

| Kind | Where | Assessment |
|---|---|---|
| Ephemeral session | `useState` in `WorldCountriesDrill`, `WorldCountriesToday`, flow components | Appropriate. `WorldCountriesDrill` at 16 `useState` calls is at the practical ceiling. |
| Contexts | `WorldCountriesPopulationContext`, `MapSurface`, `LearningMapSurface` | Appropriate — genuine cross-level values, not stores. |
| Module singletons | `subregionLearningStore`, 3 geography metadata stores, `geographyRefresh` | Read-through-to-localStorage on every call, no in-memory cache. Simple and correct, but requires the invalidation machinery in F-07. |
| Derived state | `useMemo` over pure derivations | Good — the dominant pattern. |
| Async | One `useEffect` → `loadWorldCountriesRecallHistory` with explicit `loading/ready/error` union | **Best async handling in the codebase.** Should be the app-wide convention. |

**The one real problem is F-07** — three invalidation mechanisms. Everything else is idiomatic.

### 9.6 Data Layer Assessment

- **7 namespaced localStorage keys**, all via `core/storage` guarded helpers. No direct `localStorage` access anywhere in the feature.
- **No direct `indexedDB.open()`** in the feature — all attempt evidence goes through `core/learning` → `core/scoring/attemptStore`. The single-owner invariant holds.
- **Migration strategy is unusual and clever.** Rather than schema versions, `subregionLearningPersistence.ts` uses a **membership fingerprint**: when the active country set changes, completion records are preserved under the old fingerprint and reconciled on read (`subregionLearningStore.ts:38`). This means a user toggling "include territories" does not lose learning history. Genuinely good.
- **Gap:** only `recite/reciteProgress.ts` carries an explicit `version: 1`. The geography metadata stores and subregion learning state rely on defensive parsing alone. For append-shaped data that has been fine; a future *shape* change would have no version to branch on.
- **Backup/export** exists for geography order (`geography/orderBackup.ts`) and mnemonics (`core/mnemonics/backup.ts`), but **not** for learning milestones or attempt history.

### 9.7 Error Handling Assessment

> **Corrected 2026-08-29.** An earlier draft described only three tiers and listed user-initiated saves as a gap. Re-verification against `main` showed a fourth, well-implemented tier. Corrected below.

The most deliberate policy in the codebase, with four explicit tiers:

1. **Throw** on data-authoring / programmer / config errors — 16+ sites with domain-specific messages (`Unknown Subregion ID`, `Stale task learning anchor source`, `Country ${id} has no geopolitical classification`). Fails at module load or immediately.
2. **Escalate** storage-write failures — stores swallow the raw storage error then throw a domain error (`'Continent geography order could not be saved'`), translating infrastructure failure into domain vocabulary. Textbook.
3. **Degrade silently** on geometry/presentation failures — `getBBox()` and transform inversion return `null`; the map renders without the enhancement.
4. **Surface as recoverable UI state** on async loads and user-initiated writes — the draft is retained, a `role="alert"` / `role="status"` message is rendered, and recovery actions are offered:
   - `mnemonics/GeographyMnemonicEditor.tsx:55` → `setError('Could not save this mnemonic.')`; `setEditing(false)` runs **only on success**, so the draft survives. Rendered at `:108` with `role="alert"`. A separate branch handles image-decode failure (`:67`).
   - `ui/InlineOrderEditor.tsx:133` → `setSaveError(true)`, rendered at `:273` as *"Could not save this order. Your draft is still available."* with `role="alert"`. Auto-order failure is tracked separately (`autoOrderError`, `:120`/`:210`) with run-ID guarding against stale async results.
   - `today/WorldCountriesToday.tsx:74` → `{ status: 'error' }`, consumed by `today/TodayRails.tsx:52-75` which renders the heading *"Review status unavailable"*, an explanation via `role="status" aria-live="polite"`, and enables secondary recovery actions.
   - `maps/SvgMapView.tsx:118-124` → explicit `loading | ready | error` transitions, correctly ignoring `AbortError` on cancellation.

**Remaining gap — one, not two:**

- Tier 1 throws with **no error boundary above them** (F-08) — a data-authoring error blanks the whole app rather than degrading one feature.

**Note on a mis-citation.** An earlier draft cited `ui/SpellingPeek.tsx:75` as a swallowed error. It is not: those two `catch` blocks guard `setPointerCapture` / `releasePointerCapture`, are annotated with the reason, and are correct defensive code for browsers and jsdom that lack pointer capture.

**This tier-4 handling is a strength and should be the app-wide convention**, particularly for Major System and Cards, which currently swallow storage failures unconditionally.

### 9.8 Testing Assessment

~120 test files, the large majority of the repository's 735 tests.

**Strong:**

- Pure-domain coverage is thorough: `reviewSchedule`, `recallProgress`, `recallMastery`, `scopeProgress`, `subregionLearningStore` (246 lines of tests for membership reconciliation), `todayPlan`, `reviewQueue`, `reviewInterleaving`.
- `maps/WorldCountriesMapClick.integration.test.tsx` (586 lines) drives **real bundled SVG assets** through the full learning → map → controller → drill → answer chain. High-value, low-brittleness.
- `maps/SvgMapController.test.ts` (890 lines) covers loading, malformed-SVG rejection, hit-testing, hover groups, tiny-country markers, reduced-motion.
- Tests use the **public API and result contracts** (`activeIds`, `unknownIds`) rather than internals.

**Gaps (highest-value first):**

1. **No test asserts the `learning/` → `drill/` → `today/` boundary**, nor that `core/` does not import upward. These invariants are documented but not mechanically enforced — a dependency-rule test would be cheap and would protect the codebase's best property.
2. **No test for the three refresh mechanisms** (F-07). A stale-rail regression would pass CI silently.
3. **No round-trip test for World Countries reset/export** covering "reset must not clear Pi persistence" — this is called out as a known trap in the feature's `AGENTS.md` but is not covered.
4. Some brittleness in map tests asserting `querySelectorAll('[data-svg-map-task-hit-target]').toHaveLength(N)`. Minor.

### 9.9 Maintainability Assessment

**Easy to understand:** the data layer, geography policy, review scheduling, Today orchestration. Names are precise; pure functions are small.

**Hard to understand:** `SvgMapController` + `svgTaskAssistance` (1,900 lines of imperative SVG/DOM/geometry); the ~10 `*Progress*` modules whose distinctions are real but undiscoverable; the version-counter threading.

**Easy to extend:** new country, new entity group, new subregion, new recall skill, new drill mode — all data or small-union changes.

**Hard to extend:** anything touching map interaction; anything needing a new refresh trigger.

**Easy to test:** everything in `.ts`. **Hard to test:** the ~400-line orchestrator components.

### 9.10 Future Change Stress Test

*Used as architectural probes only — none of these are recommended features.*

| Hypothetical change | Difficulty | Why |
|---|---|---|
| Country details panel | **Easy** | Extend `Country`; UI is componentized. |
| Text search over countries | **Easy** | Pure predicate over `countries`; `queries.ts` is the natural home. |
| Region / subregion filtering | **Already exists** | `drillSelection` + `subregionScope`. |
| Language / currency filtering | **Easy–Medium** | Add fields to `Country` + a predicate; but reveals that `Country` would start becoming an encyclopedia record. |
| Favorites | **Easy** | New namespaced localStorage key following the 7 existing ones. |
| Offline access | **Already works** | Client-only + PWA precache. |
| Caching layer | **N/A** | No remote source to cache. |
| Localization (i18n) | **Hard** | Country/capital display names are the *domain* values and are also the *answer* values matched by `recallAnswerMatching`. Aliases partially anticipate this, but the domain currently assumes English canonical names. This is the sharpest latent constraint. |
| Multiple data providers | **Medium** | `countries.ts` is a literal array consumed directly by ~30 modules. `queries.ts` and `resolveCountrySet` already form a de-facto seam, but there is no interface. Would need one — **do not build it until a second provider actually exists.** |
| Advanced sorting | **Easy** | `effectiveOrder`/`orderAuthoring` already generalize ordering. |
| Second map style / provider | **Hard** | `SvgMapController` assumes SVG DOM with `path` IDs. A raster or vector-tile map would need a new controller behind a new interface. |

**Conclusion from the stress test:** the architecture is well-suited to *domain* growth (more countries, more skills, more scopes) and poorly suited to *infrastructure* substitution (different map tech, different data source, different language). Given the product, that is the correct trade-off.

### 9.11 Strengths

1. Genuinely closed feature boundary — 7 exports, zero cross-feature imports.
2. Best domain modeling in the repository (stable IDs, policy-vs-derived-data separation).
3. Deliberate three-tier error policy.
4. Membership-fingerprint migration for learning state.
5. Evidence-derived progress (replayable, no hidden mutable scheduling state).
6. Acyclic internal dependency graph.
7. By far the strongest test coverage, including real-asset integration tests.
8. Clean async state modeling (`loading | ready | error` union), consistently surfaced in the UI with `role="alert"` / `role="status"` and draft retention on failed writes.

### 9.12 Risks

1. 59% of the codebase in one feature — change is concentrated here.
2. `SvgMapController` (1,040) + `svgTaskAssistance` (857) — 1,900 imperative lines, single-expert territory.
3. Three refresh mechanisms; two are unverifiable.
4. `learning/` has no internal public surface; ~40 modules addressed individually by three sibling folders.
5. Fail-fast throws with no error boundary above them.
6. No versioning on most persisted shapes.
7. Divergence from `core/learning`'s mastery semantics without a stated convergence plan.

### 9.13 Specific Findings (World Countries)

---

**WC-1 · Three cache-invalidation mechanisms**

**Severity:** Medium · **Scope:** Feature · **Priority:** P2 · **Effort:** Small–Medium
**Location:** `geography/geographyRefresh.ts:23` vs `today/WorldCountriesToday.tsx:54` vs the `mnemonicVersion` prop chain from `drill/WorldCountriesDrill.tsx:72`
**Observation:** Module singletons are read during render; three different mechanisms exist to force re-reads.
**Problem:** Two of the three are manual, unverifiable, and invisible to tooling.
**Why it matters:** Stale UI with no error and no failing test; also the clearest intra-feature inconsistency.
**Recommendation:** Extend the existing `useSyncExternalStore` pattern to the learning and mnemonic stores; delete the counters and the `refreshKey` prop chain. Net reduction in code.

---

**WC-2 · `SvgMapController` god class**

**Severity:** Medium · **Scope:** `maps/` · **Priority:** P2 · **Effort:** Medium
See F-06. Peel off cohesive slices opportunistically, following the precedent set by the `svgTaskAssistance` extraction. Do not rewrite.

---

**WC-3 · `learning/` has no internal public surface**

**Severity:** Medium · **Scope:** Feature · **Priority:** P2 · **Effort:** Small
**Location:** ~40 modules in `learning/`, imported individually by `drill/`, `today/`, `recite/`, `ui/`
**Observation:** No `learning/index.ts`; consumers import specific files (e.g. `today/WorldCountriesToday.tsx:7-12` imports from 6 distinct `learning/` modules).
**Problem:** Every internal reorganization is a breaking change across the feature; nothing signals which modules are meant for sibling use.
**Recommendation:** Add a `learning/index.ts` defining the ~15 symbols siblings may use, and migrate imports opportunistically. Same for `geography/` and `maps/`.

---

**WC-4 · ~~Silent failure on user-initiated saves~~ — RETRACTED**

> **This finding was incorrect and is withdrawn (2026-08-29).**
>
> **What it claimed:** that `mnemonics/GeographyMnemonicEditor.tsx` and `ui/InlineOrderEditor.tsx` caught and discarded save errors, closing the editor as if the save had succeeded and losing user-authored content.
>
> **What the code actually does on `main`:**
> - `GeographyMnemonicEditor.tsx:47-56` — `setEditing(false)` and `onChanged()` run **only on the success path**. The `catch` calls `setError('Could not save this mnemonic.')`; the editor stays open with the draft text and image intact, and the message renders at `:108` with `role="alert"`.
> - `InlineOrderEditor.tsx:128-135` — the `catch` calls `setSaveError(true)`, rendered at `:273` as *"Could not save this order. Your draft is still available."* with `role="alert"`. Auto-ordering has its own independent error state (`:120`, `:210`) with run-ID guarding against stale async results.
>
> Both editors therefore already implement exactly the behaviour the finding recommended. There is no data-loss path here.
>
> **Why the error occurred:** the finding was derived from an automated inventory of `catch` blocks that recorded their *locations* but not their *contents*, and I did not verify what each handler did or whether its state was rendered before publishing. Two `catch` sites were classified as "swallowed" purely because they existed. The lesson is that a catch-block census is evidence of nothing on its own — the recommendation should have required reading the handler body and confirming the render path.
>
> **Knock-on corrections:** F-08 narrowed to the error-boundary gap only; §9.7 rewritten with a fourth tier; §9.12 risk 6 removed; TD-10 removed from the debt register; Top-10 #8 narrowed; §12 principle 8 updated. A separate mis-citation of `ui/SpellingPeek.tsx:75` (legitimate pointer-capture guards, not swallowed errors) is corrected in §9.7.

---

**WC-5 · No versioning on most persisted shapes**

**Severity:** Low · **Scope:** Feature persistence · **Priority:** P3 · **Effort:** Small
**Location:** `learning/subregionLearningStore.ts:15`, 3 geography metadata stores. Contrast `recite/reciteProgress.ts:10` which has `version: 1`.
**Recommendation:** Add a `version` field to persisted envelopes when each store is next modified. Low urgency: defensive parsing plus membership fingerprinting has covered the cases seen so far.

---

**WC-6 · Storage keys are scattered literals**

**Severity:** Low · **Scope:** Feature · **Priority:** P3 · **Effort:** Small
**Location:** 7 keys across 6 files. The feature's own `AGENTS.md` flags *"World Countries resets must never clear Pi or unrelated feature persistence"* as a known trap, but the key set is not enumerated anywhere in code.
**Recommendation:** Export the key list from one module and have reset/export derive from it, so the invariant becomes structural rather than remembered.

---

### 9.14 Verdict on World Countries

> **Receive targeted improvements.** Not "remain as-is"; not "restructure"; definitely not "redesign."

**Why.** The feature's *external* architecture — boundary, domain model, error policy, evidence-derived progress, test coverage — is the best in the repository and should become the reference for domain and testing practice. The problems are *internal and localized*: three refresh mechanisms (WC-1), one oversized controller (WC-2), and a missing internal barrel (WC-3). All three are addressable incrementally, without touching the feature's shape. (A fourth finding, WC-4, was retracted after verification; the error handling it flagged is in fact correct.)

**Should it be the reference implementation for future features?** **Partially, and explicitly so.** Copy: typed stable IDs, pure `.ts` decisions, fail-fast data validation, the `loading | ready | error` async union, evidence-over-state persistence, and the test posture. Do **not** copy: 9 sibling folders, manual version counters, or 400-line orchestrator components. The team should write this split down rather than let "look at World Countries" be the whole answer.

---

## 10. Testing Assessment

**Strengths**

- 735 tests, 100% passing, 14.3s — fast enough for genuine inner-loop use.
- Test-to-source ratio of 12,151 : 28,210 lines is healthy.
- Predominantly pure-function tests, which is the right default for this design.
- Real-asset integration tests in `maps/` — high signal.
- The progressive verification policy in `AGENTS.md` (nearest test → capability → feature → full) is a good practice most teams lack.

**Weaknesses**

1. **Coverage is extremely uneven.** World Countries ≈ 120 test files; **Major System has 1** (CSV parsing) and Cards has 4 (all data-layer). Neither has a single test of drill or scheduling behavior. Coverage tracks logic placement exactly (F-05) — the untested code is precisely the code inside `.tsx`.
2. **No architectural boundary tests.** The codebase's single best property — `core/` importing nothing upward, features not importing each other — is documented in `INVARIANTS.md` but enforced only by review. A ~30-line dependency-rule test would make it structural.
3. **No CI.** Nothing runs the suite automatically (F-04).
4. **`environmentMatchGlobs` is redundant** with the 56 per-file `// @vitest-environment jsdom` pragmas (`vitest.config.ts`). Harmless but two mechanisms for one concern.
5. **Untested:** the refresh mechanisms (WC-1), reset/export isolation between features, the `useRails` dependency contract.

**Highest-value missing tests, in order**

1. Dependency-rule test: `core/` must not import `app/` or `features/`; no feature may import another feature (allowlist the 2 documented exceptions).
2. Reset/export isolation: World Countries reset must not clear Pi or Major System keys.
3. Rail/header staleness: publishing rails from a component whose data changed must update `PageLayout`.
4. Major System scheduling: extract `buildRepQueue` / question-selection decisions and test them (depends on F-05).
5. Cards deck-memo run history and personal-best computation.

---

## 11. Technical Debt Register

| ID | Area | Issue | Severity | Priority | Effort | Scope |
|---|---|---|---|---|---|---|
| TD-01 | Architectural | Two parallel spaced-repetition/mastery paradigms (`core/scoring` SM-2 vs `core/learning` derived) | High | P1 | Large | Whole app |
| TD-02 | Architectural | `app/settings ↔ world-countries` module cycle via monolithic global `Settings` | High | P1 | Medium | Whole app |
| TD-03 | Process | No ESLint / Prettier / CI; `eslint-disable` comments for an uninstalled rule | High | P1 | Small | Whole app |
| TD-04 | Structural | World Countries = 59% of files; `learning/` has ~40 modules and no internal barrel | High | P1 | Medium | World Countries |
| TD-05 | Testing | Major System (1 test file) and Cards (4, data-only) have no behavioral coverage | High | P1 | Medium | 2 features |
| TD-06 | Consistency | Three cache-invalidation mechanisms inside World Countries | Medium | P2 | Small–Med | World Countries |
| TD-07 | Maintainability | Business logic inside 400–600 line drill `.tsx` components | Medium | P2 | Medium | major-system, cards |
| TD-08 | Maintainability | `SvgMapController.ts` (1,040) — 11 concerns, 17 mutable fields | Medium | P2 | Medium | World Countries |
| TD-09 | Reliability | No error boundary; module-load `throw`s can blank the entire app | Medium | P2 | Small | Whole app |
| TD-11 | Testing | No mechanical enforcement of the `core`/feature dependency invariants | Medium | P2 | Small | Whole app |
| TD-12 | Domain model | Major System primitive obsession: bare `"00"`–`"99"`, untyped `"7:sounds"` keys | Medium | P3 | Medium | major-system |
| TD-13 | Structural | `noUnusedLocals`/`noUnusedParameters` disabled with no linter to compensate | Low | P3 | Small | Whole app |
| TD-14 | Persistence | No schema version on most persisted shapes; storage keys are scattered literals | Low | P3 | Small | World Countries |
| TD-15 | Consistency | `DeckMemoDrill` / `PaoDeckMemoDrill` share ~150 lines of duplicated glue | Low | P3 | Small | cards |
| TD-16 | Documentation | 33.9k doc lines vs 28.2k source lines; 46 ADRs + 45 change specs risk drift | Low | P3 | Small | Repository |
| TD-17 | Structural | `major-system` barrel exports 10 components (leaky public surface) | Low | P3 | Small | major-system |
| TD-18 | Consistency | `vitest.config.ts` `environmentMatchGlobs` duplicated by 56 per-file pragmas | Low | P3 | Small | Testing |

---

## 12. Recommended Architectural Principles

Derived from what this repository actually does well, and from the specific problems found.

1. **`core/` never imports `app/` or `features/`.** Already true. Make it a test, not a convention.
2. **One IndexedDB connection, one owner.** Already true and documented. Any new store is added to the existing upgrade path, never a second `indexedDB.open()`.
3. **Persist evidence; derive state.** Append immutable attempts; compute progress, mastery, and due-ness as pure functions. This is `core/learning`'s model and it should be the strategic default over stateful SM-2 records.
4. **Features own their domain IDs; shared infrastructure treats them as opaque.** Already true for `core/mnemonics` and `core/learning`. Extend to settings.
5. **Features own their own settings schema.** `app` composes and persists a container; it must not know a feature's fields. (Fixes TD-02.)
6. **Decisions in `.ts`, rendering in `.tsx`.** A component may hold view state, timing, and focus. It should not hold question selection, scheduling, scoring, or history reduction.
7. **Cross-render external state uses `useSyncExternalStore`.** Manual version counters and `refreshKey` props are not an approved alternative. (Fixes TD-06.)
8. **Four-tier error policy, app-wide:** throw on data/config/programmer errors; translate infrastructure failures into domain errors at the store boundary; degrade silently only for presentation enhancements; surface async and user-write failures as rendered, recoverable UI state that retains the draft. World Countries already implements all four tiers — Major System and Cards implement only the first two. Wrap the mode content area in one error boundary so tier-1 throws degrade a feature, not the app.
9. **Abstract on the second real implementation, not the first anticipated one.** `createWordStore` earned its abstraction (4 users). A `CountryRepository` has not. The repository has a good track record here — keep it.
10. **A folder over ~20 files gets an internal barrel** defining its public surface to sibling folders.
11. **Cross-feature imports are exceptional and must be documented at the import site**, one-directional, and never write to the other feature's persistence. (Both existing cases already satisfy this.)

---

## 13. Recommended Target Direction

**No restructuring of the top-level architecture is warranted.** Package-by-feature + shared kernel + composition shell is the right shape for a 28k-line client-only app with four features. Layered `presentation/application/domain/data` folders inside each feature would add ceremony without solving any observed problem — and the `docs/` record shows the team already tried and removed similar layers.

**What should change**

| | |
|---|---|
| **Change** | Settings ownership → feature-owned slices (removes the cycle). One scheduling paradigm declared strategic. Lint + CI added. |
| **Remain** | `core/` boundary and its no-upward-import rule. `MODES` registry. `PageLayout` slot contract. `createWordStore`. Single-owner IndexedDB. World Countries' domain modeling and error policy. |
| **Gradually converge** | Feature folder shape → capability sub-folders with an internal barrel. Business logic → pure `.ts`. Refresh → `useSyncExternalStore`. New learning work → `core/learning`. |
| **Do not abstract yet** | Country data provider interface. Map provider interface. Generic drill engine. i18n layer. Repository pattern. Any DI container. None have a second implementation. |

**Illustrative target shape for a feature (direction only, not a mandate):**

```
features/<feature>/
  index.ts              small public surface + settings slice export
  <Feature>.tsx         shell / tab routing
  data/                 static domain data + load-time invariants
  domain/ or learning/  pure decision modules  ← where business logic lives
    index.ts            internal public surface for sibling folders
  <capability>/         e.g. drill/ today/ recite/ — UI + capability state
  ui/                   feature-local presentational components
```

This is close to what World Countries already is. The delta is the internal barrels and the settings slice.

**One thing explicitly worth *not* doing:** unifying `DeckMemoDrill`/`PaoDeckMemoDrill`, or building a generic drill engine across all four features. The drills differ in genuinely different ways (SM-2 vs π-segment vs geography scope), and the existing shared pieces (`roundScheduler`, `answerMatch`, `core/ui`) already capture the parts that are actually common.

---

## 14. Prioritized Improvement Roadmap

### P0 — Immediate Risks

**None.** No critical correctness, security, or data-integrity failure was found. The suite is green, storage access is guarded, the IndexedDB lifecycle is correct, and there is no untrusted input, network surface, or authentication to compromise. The `app ↔ feature` cycle (TD-02) is the closest thing to a structural defect and is currently benign.

### P1 — High-Value Improvements

| Item | Why it matters | Effort | Dependencies | Scope |
|---|---|---|---|---|
| **Add ESLint + `react-hooks` + CI** (TD-03) | Highest value per hour. Validates ~10 correctness-critical `useRails`/`useLayoutHeader` dep arrays that are currently unchecked, and makes existing suppression comments meaningful. Land tooling first, baseline violations, fix opportunistically. | Small | None | App-wide |
| **Decide and record the scheduling paradigm** (TD-01) | Removes the largest source of conceptual load. The *decision* is small; the migration is large and should be lazy. Recommend: `core/learning` strategic, `core/scoring/sm2` frozen. | Small (decision) / Large (migration) | None | App-wide, then feature-by-feature |
| **Feature-owned settings slices** (TD-02) | Removes the module cycle, shrinks the 527-line `SettingsOverlay`, makes new settings a one-file change inside a feature. | Medium | None | App-wide |
| **Dependency-rule test** (TD-11) | Converts the codebase's single best property from a convention into an enforced invariant, before it can erode. | Small | Lint/CI (helpful, not required) | App-wide |
| **Internal barrel for `learning/`, `geography/`, `maps/`** (TD-04) | Makes World Countries' internals reorganizable without feature-wide churn. Prerequisite for any later decomposition. | Small–Medium | None | World Countries |
| **Extract + test Major System / Cards drill decisions** (TD-05, TD-07) | These are the oldest, least-tested, behaviorally richest components in the app. Extract decision functions only; leave JSX and timing. | Medium | None | Feature-by-feature, when touched |

### P2 — Planned Improvements

| Item | Why it matters | Effort | Dependencies | Scope |
|---|---|---|---|---|
| **Unify refresh on `useSyncExternalStore`** (TD-06) | Eliminates a silent stale-UI bug class and removes props and state. Net simplification. | Small–Medium | None | World Countries |
| **Add one error boundary around the mode content area** (TD-09) | Prevents a module-load data error from blanking the whole app instead of degrading one feature. | Small | None | App-wide |
| **Decompose `SvgMapController` opportunistically** (TD-08) | Reduces single-expert risk. Follow the `svgTaskAssistance` precedent — slice by slice, behind the existing API, never a rewrite. | Medium | Internal barrels help | World Countries |
| **Reset/export isolation test** | Covers a trap the feature's own `AGENTS.md` names but nothing verifies. | Small | None | World Countries |
| **Re-enable `noUnusedLocals` / `noUnusedParameters`** (TD-13) | Cheap once a linter exists to handle the `_`-prefix convention. | Small | Lint | App-wide |

### P3 — Opportunistic Cleanup

| Item | Why | Effort | Scope |
|---|---|---|---|
| Type Major System composite keys (TD-12) | Removes a silent-miss class from `"7:sounds"` string concatenation | Medium | major-system |
| Extract Deck Memo history/best helpers (TD-15) | ~150 lines of glue; do it when either drill is next modified | Small | cards |
| Centralize World Countries storage keys (TD-14) | Makes the reset-isolation invariant structural | Small | World Countries |
| Narrow the `major-system` barrel (TD-17) | Aligns with Pi/Cards/WC | Small | major-system |
| Remove redundant `environmentMatchGlobs` (TD-18) | One mechanism instead of two | Small | Testing |
| Consciously decide ADR/change-spec retention policy (TD-16) | Prevents passive growth and drift | Small | Repository |

---

## 15. Suggested Team Discussion Topics

1. **Do we commit to evidence-derived learning (`core/learning`) as the single paradigm, and formally freeze `core/scoring/sm2`?** If yes: do we migrate lazily (recommended) or plan a campaign? If no: what is the rule for choosing between them?
2. **Should `app` ever know a feature's settings fields?** If not, who owns rendering a feature's settings panel — the feature, or `app` given a descriptor?
3. **Is World Countries our reference implementation?** Specifically: which parts do we mandate copying (typed IDs, pure decisions, fail-fast data, `loading|ready|error`, test posture) and which do we explicitly *not* copy (9 sibling folders, version counters, 400-line orchestrators)?
4. **What is our minimum acceptable test posture for a feature with real scheduling behavior?** Major System currently ships user-facing spaced repetition with one CSV test — is that acceptable, and if not, what is the bar?
5. **Do we want lint and CI?** This is a deliberate choice, not an oversight — the repo has strong process docs and no tooling. If the answer is "the agent workflow replaces CI," that should be stated explicitly, because `react-hooks/exhaustive-deps` is not something review reliably catches.
6. **What is the rule for reading module singletons during render?** `useSyncExternalStore` for all of them, or is prop-threading acceptable in some cases?
7. **Are we comfortable that a data-authoring error throws at module load with no error boundary?** Fail-fast is right; the blast radius may not be.
8. **Is the documentation corpus (33.9k lines, 91 ADRs + change specs) still paying for itself,** and what is our retention/archival policy?
9. **What is our threshold for splitting a feature?** World Countries is 59% of the codebase. Is there a size at which `world-countries-geography` and `world-countries-learning` become separate features, or is the internal-barrel approach sufficient indefinitely?
10. **Which single inconsistency causes us the most day-to-day friction right now** — the two schedulers, the three refresh mechanisms, or the logic-in-`.tsx` split?

---

## 16. Top 10 Recommendations

| # | Recommendation | Reason | Priority | Scope | Effort |
|---|---|---|---|---|---|
| 1 | **Add ESLint (`react-hooks` + `typescript-eslint`) and a minimal CI workflow** (`typecheck → lint → test → build`) | ~10 correctness-critical manual dependency arrays are unverified, and 7 files suppress a rule that isn't installed. Highest value per hour in the report. | **P1** | App-wide | Small |
| 2 | **Declare `core/learning` the strategic learning paradigm and freeze `core/scoring/sm2`** (no new consumers; migrate lazily) | Two models of "due" and "mastered" is the largest conceptual-load source and blocks any cross-feature progress reporting. | **P1** | App-wide | Small decision / Large migration |
| 3 | **Move feature settings into feature-owned slices; `app` composes and persists only** | Removes the `app ↔ world-countries` module cycle, shrinks a 527-line overlay, and makes settings additions single-file. | **P1** | App-wide | Medium |
| 4 | **Add a dependency-rule test enforcing `core` ↛ `app`/`features` and no feature-to-feature imports** (allowlist the 2 documented exceptions) | Converts the codebase's best structural property from a convention into an enforced invariant before it erodes. | **P1** | App-wide | Small |
| 5 | **Introduce internal barrels for `learning/`, `geography/`, and `maps/` in World Countries** | ~40 `learning/` modules are addressed individually by three sibling folders; no internal reorganization is currently non-breaking. | **P1** | World Countries | Small–Medium |
| 6 | **Extract decision logic out of the Major System and Cards drill components, and test it** | Two features with real scheduling behavior have effectively zero behavioral coverage because the logic is only reachable through rendered `.tsx`. | **P1** | major-system, cards | Medium (incremental) |
| 7 | **Unify World Countries refresh on `useSyncExternalStore`; delete the version counters and `refreshKey` prop chain** | Three mechanisms for one problem; two are unverifiable and fail silently. This is a net code reduction. | **P2** | World Countries | Small–Medium |
| 8 | **Add one error boundary around the mode content area** | Module-load `throw`s from the data layer currently blank the whole app, taking down three unrelated features with World Countries. | **P2** | App-wide | Small |
| 9 | **Continue decomposing `SvgMapController` opportunistically, following the `svgTaskAssistance` precedent** | 1,040 lines / 11 concerns / 17 mutable fields is single-expert territory. Well-tested, so incremental peeling is low-risk and a rewrite is unjustified. | **P2** | World Countries | Medium |
| 10 | **Write down the "copy this / don't copy this" split for World Countries as the reference implementation** | "Look at World Countries" currently means both the best domain modeling in the repo *and* its 9-folder sprawl. The team needs the distinction recorded. | **P2** | Documentation | Small |

---

### Closing note on proportionality

This is a **28k-line, four-feature, client-only PWA with four runtime dependencies and no server**. Measured against that, the architecture is not under-engineered and — importantly — not over-engineered either. The repository shows repeated evidence of *removing* speculative layers rather than accumulating them, which is rarer and more valuable than any of the improvements listed above.

None of the recommendations here call for new frameworks, new patterns, or new abstraction layers. Seven of the top ten either **remove** code or **add tooling**. That is the appropriate shape of a remediation plan for a codebase in this condition.