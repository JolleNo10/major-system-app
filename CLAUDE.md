# Mnemonics

**Mnemonics** — a mnemonic training tool. Currently implements the **Major System**
(mapping 2-digit numbers `00`–`99` to words) with dedicated **Applications** for Pi and Cards.
Built to expand to additional mnemonic systems over time.
Stack: **Vite + React 19 + TypeScript + Tailwind v4**, single-page, **no backend**,
**always dark** (zinc-950 base, violet-600 accent). Docker-only dev workflow.

> This file exists so a fresh context can understand the repo without reading every file.
> Keep it in sync when the architecture changes.

## Commands (Docker-only — no local node/npm)
```bash
docker compose up          # dev server → http://localhost:8080 (Vite on 5173)
docker compose up --build  # rebuild after package.json changes
docker compose down
# One-off verification (node isn't installed on the host):
docker run --rm -v "$(pwd)":/app -w /app node:20-alpine sh -c "npx tsc -b && npx vitest run && npx vite build"
```
`npm test` → `vitest run`. Tests are colocated `*.test.ts` next to the pure utils.

## Big picture
- **No router.** `App.tsx` holds `mode: Mode` (state machine) + three overlay booleans
  (`showReference`, `showSettings`, `showStats`). `mode === 'home'` renders `ModeSelector`;
  every other value renders a drill from `components/modes/`.
- **Answer modes.** A global `answerMode` (`'multiple-choice' | 'typing'`, `useAnswerMode`)
  is threaded to drills, which render `<MultipleChoice>` or `<TypingInput>`.
- **Number keys are zero-padded 2-digit strings** (`"00"`..`"99"`) everywhere. Direction is
  `'enc' | 'dec'`; store keys are `` `${dir}:${num}` `` (e.g. `enc:07`).

## Data model & persistence
| Store | Where | Contents |
|-------|-------|----------|
| `major-item-data` | localStorage | `Record<"enc:NN"\|"dec:NN", ItemRecord>` — per-number/direction SM-2 stats (correct/wrong, rolling `latencies` (last 10), `ease`, `intervalDays`, `dueAt`, `lastSeenAt`, `reps`, `hintCount`) |
| `major-system` (db) → `attempts` store | **IndexedDB** | Per-answer log `{id, key:"enc:07", at, ok, ms}`, pruned to 90 days / 200 per key. Written on every answer. Keys are usually `"enc:NN"`/`"dec:NN"` but the same store also holds Pi's `"pi:<position>"` per-position log and the Train tab's `"pi-chain:<segIdx>"` boundary-crossing log (`data/piStats.ts`). Read via `getAllAttempts` (Pi weak-spots + Train segment/boundary ranking); the number-drill read path is otherwise unconsumed (future age-decay) |
| `major-pi-sessions` | localStorage | Pi number-quiz run summaries (`PiSession[]`, capped 50) — reach, accuracy, pairs/sec per completed run (`data/piStats.ts`) |
| `major-word-saved` | localStorage | Committed custom words (layer 2) |
| `major-word-overrides` | localStorage | Trial/pending word edits (layer 3, shown yellow) |
| `major-settings` | localStorage | `{ masteryLatencyFactor, maxPiDigits, offlineMode }` |
| `major-typing-speed` / `-digit` | localStorage | Adaptive ms/char estimates, separate for word vs digit typing |
| `major-answer-mode`, `major-hide-options`, `major-seq-length`, `major-seq-studymode`, `major-speed-best`, `major-attempts-migrated` | localStorage | Small UI/prefs flags |

**Word list is 3 layered sources** (`WordsContext`); effective = `{...shipped, ...saved, ...overrides}`:
1. **shipped** — `src/data/words.csv` (`number,default,custom`), imported via `?raw` and parsed by
   `words.ts` → `WORDS`. **Edit this file to change the shipped defaults.**
2. **saved** (`major-word-saved`) — customizations committed in-app.
3. **overrides** (`major-word-overrides`) — pending trial edits.

`useWords()` exposes `{ words, shipped, saved, overrides, setOverride, resetOverride, resetTrials,
persist, resetFactory, importSaved }`; `persist()` folds trials→saved. Import/export use the same
CSV format (`wordsCsv.ts`, validated). The browser can't write the repo, so updating `words.csv`
for real = Export → replace the file → commit by hand.

**The 3-layer store is a factory** (`context/createWordStore.ts` → `{ Provider, useStore }`). Two
instances: `WordsContext` (major `WORDS`, keys `major-word-*`) and `CardWordsContext` (Themed Deck
`CARD_WORDS` from `cardWords.csv`, keys `major-cardword-*`, `useCardWords()`) — the Themed Deck word
list is fully separate from the major list. `WordListGrid` is prop-driven (`store`/`keys`/`renderLabel`/
`groups`/`showAccuracy`/`exportName`) so both lists reuse the same editor.

## Scoring & spaced repetition
- **`data/scoring.ts` is the single home for all scoring/latency config** (dependency-free): `FAST_MS`/`SLOW_MS`,
  `RECALL_FAST_MS`/`RECALL_SLOW_MS`, `OUTLIER_MS`/`STALE_MS`, `DEFAULT_EASE`/`MIN_EASE`, `MAX_LATENCIES`,
  `HISTORY_HALFLIFE_DAYS`. Every scorer imports from here; `itemStore` keeps only storage config.
- `sm2.ts` — `gradeAnswer(correct, ms, mode)` → 2 (wrong) / 3 (slow) / 4 / 5 (fast); `applySm2(item, grade)`
  updates ease/interval/due (SM-2). Grades use the **recall-adjusted** ms on the multiple-choice scale.
- `typingSpeed.ts` — `adjustLatency(raw, mode, chars)` subtracts estimated typing time (separate word vs
  digit track) so recall speed is judged on one scale. (`recallColor` is a UI helper in `utils/recallColor.ts`.)
- `roundMastery.ts` — per-round mastery: `isMastered` = last `MASTERY_REPS` (2) attempts all correct,
  un-hinted, and `recallMs <= masteryFastMs(settings.masteryLatencyFactor)`. Uses the **in-memory**
  `RoundStat.attempts` (defined in `utils/roundStats.ts`), not the IndexedDB log.
- `numberStats.ts` — **`itemWeakness(item)` is the one weakness score used everywhere** ("weak" is defined
  once): `0.55·easePenalty + 0.25·normLatency + 0.20·(wrongRate · 0.8^reps)` — recency-biased; the lifetime
  wrong-rate residual decays with the current correct streak. `rankByWeakness(dir, nums)` (Stats overlay,
  Weak Spots) sorts by it worst-first; `quiz.pickWeighted` draws with weight `1 + itemWeakness·4`.
- `useStats.recordFull` splits into `aggregateItem` (counts + rolling latency) and `scheduleItem`
  (grade + `applySm2`, incl. the hint→cap-at-3 rule); the due-count / rep-queue / next-due helpers share one
  `allItems()` traversal.

## Module map
- `src/App.tsx` — header (mode title, AnswerModeToggle, 📊/📚/⚙️ overlay triggers) + `<main>` that renders
  `MODES[mode].component`, + overlays. No per-mode render switch.
- **`src/modes.tsx` — the mode registry** (`Record<DrillMode, ModeDef>`): each non-home `Mode` maps to its
  header `title`, drill `component`, `group` (`'major-system' | 'application'`), `hideAnswerToggle`, and ModeSelector card
  metadata. Single source of truth — TypeScript enforces every mode is fully wired. **Add a mode = one entry here.**
  `HOME_TITLE` is `'Mnemonics'`.
- `src/main.tsx` — mounts `SettingsProvider > WordsProvider > CardWordsProvider > App`; calls `initAttempts()` (opens IndexedDB + one-time migration of any legacy in-blob attempts).
- `src/types.ts` — `Mode`, `AnswerMode`, `Direction`, `NumberStats`/`AllStats`.
- **`components/modes/`**: `WordNumberDrill` is the shared config-driven engine for both directions;
  `EncodingDrill`/`DecodingDrill` are ~25-line `DrillConfig` wrappers over it (direction, prompt styling,
  matcher, hint toggle). `SoundKeyDrill`, `ReverseSoundKeyDrill`, `SequenceDrill` (setup→study→recall→result),
  `SpeedRound`, `WeakSpots` (feeds a weak-number `pool` into `EncodingDrill`), `RepetitionDrill` (SM-2 due queue),
  `PiDrill` (three tabs: **Memo** / **Recite** / **Train**). `PiNumberQuiz` is the shared recite engine (fixed sequence + anchor →
  number-quiz + result; single-pair or 10-pair batch, MC or typing), used by both Recite and Train. It records per-position
  attempts under `pi:<position>` keys for every answered pair and (when `recordSession`) a `PiSession` summary per run.
  **Recite** = user-selected range → `PiNumberQuiz` (records a session; setup shows run-history/best-runs). **Train** (`PiTrainTab`)
  = weakness-targeted practice, two stats-driven sections each surfacing the worst 3 (worst-first, "new" for untested): weakest
  **segments** (`rankPiSegments` rolls up the `pi:` log per 10-pair block → one-tap Recite run for that segment, records a session)
  and weakest **chains** (`rankPiBoundaries` reads the `pi-chain:` log → recite a segment then bridge 20 pairs into the next;
  crossing the boundary records `pi-chain:<segIdx>` for the first pair of the next segment via `recordPiChain`; **no** `PiSession`).
  Word-chain (Memo) records nothing.
  **Cards:** `CardsDrill` is prop-driven (`words`/`drillTypes`/`onRecord`/`storagePrefix`/`onEditWords`)
  and hosts Card→Word / Card→Number / `DeckMemoDrill`; two thin wrappers select the word source —
  `MajorCardsDrill` (`cards` mode: `useWords` + records to global stats, all 3 drill types) and
  `ThemedCardsDrill` (`themed-cards` mode: `useCardWords`, Card→Word + Deck Memo only, no stats, opens `CardWordsOverlay`).
- **`components/`** — `ModeSelector` (home screen: **Systems** section for Major System drills, **Applications** section for Pi + Cards), `MultipleChoice`/`TypingInput` (answer inputs),
  `ScoreBar`, `RangeSlider` (dual-thumb number range, accessible), `RoundStatsPanel`, `HintButton` (vowel skeleton),
  `SoundKeyTable`/`SoundKeyPanel`, `AnswerModeToggle`, `Switch` (accessible on/off toggle). **Overlays share
  `Overlay` (`components/Overlay.tsx`)** — the `role="dialog"` shell, `useOverlay` wiring, header bar, close
  button, and scroll body; callers pass `ariaLabel`/`header`/`maxWidth`/children (`TabButton` is the shared
  header tab). Overlays: `ReferenceOverlay` (sound key + major `WordListGrid`), `CardWordsOverlay` (Themed Deck
  word list, suit-grouped), `SettingsOverlay` (mastery tolerance, max π digits, offline mode + version/update),
  `StatsOverlay` (worst-first ranking per direction, plus a **🥧 π tab** that async-loads Pi weak positions + run summary).
- **`hooks/`** — `useStats` (`recordFull` records item-data + attempts and returns its grade; `getStats`
  derives direction-less aggregates from item-data; `buildRepQueue`, `getDueCount`, `getNextDueMs`),
  `useAnswerMode`, `useAnswerTimer` (active-elapsed timer/pause/STALE-discard),
  `useOverlay` (focus trap/return + Escape + registers `overlayGuard`),
  `usePwaUpdate` (wraps `virtual:pwa-register/react`; gates SW update checks on `settings.offlineMode`,
  auto-applies updates from checks it initiates, exposes build version + manual check — called once in `App`).
- **`utils/`** — `quiz` (`shuffle`, `pickDistractors` same-decade-biased, `buildEncOptions`/`buildDecOptions`,
  `pickWeighted(dir,…)`), `roundStats` (`RoundStat`/`RoundAttempt` types + `applyRoundAttempt` reducer, shared
  by all drills), `answerMatch` (`matchesAnswer` word + `matchesNumber` digit), `recallColor` (UI latency color),
  `storage` (`safeSet`/`safeRemove` + guarded `readString`/`readJSON`), `overlayGuard` (`isOverlayOpen`),
  `roundMastery`, `numberStats`, `vowelSkeleton`.
- **`data/`** — `words.csv`+`words.ts`, `cardWords.csv`+`cardWords.ts` (Themed Deck, 52 cards; clubs 01–13 seed
  from the major defaults), `wordsCsv.ts` (shared CSV parse/serialize), `cards.ts` (52-card deck), `soundKey.ts`,
  `scoring.ts` (all scoring/latency constants), `itemStore.ts` (ItemRecord + load/save + storage config),
  `attemptStore.ts` (IndexedDB; `addAttempt`/`getAttempts` are item-keyed wrappers over the raw-key
  `addAttemptRaw`/`getAttemptsForKey` primitives), `piStats.ts` (Pi run summaries + per-position aggregation),
  `sm2.ts`, `typingSpeed.ts`, `settings.ts`.

## Conventions & gotchas
- **Read this file first in fresh contexts and keep it updated** when workflow, architecture, commands,
  or persistent repo expectations change.
- **Verify in Docker** (`tsc -b`, `vitest run`, `vite build`) — there is no host node toolchain.
- **Dev server runs through Docker/Vite on a Windows bind mount.** Vite uses slow polling in
  `vite.config.ts`; after watcher config changes, run `docker compose up -d --build` or restart `app`.
- **Commit + push each completed, verified change to `main`** (one logical change per commit). `.gitignore`
  covers `node_modules/`/`dist/`; keep build artifacts (`package-lock.json`, `tsconfig.tsbuildinfo`) out.
- **All localStorage access goes through `utils/storage`** (`safeSet`/`safeRemove` writes, `readString`/`readJSON`
  reads) — private-mode/quota safe.
- **Full-screen overlays must render inside `<Overlay>`** (which uses `useOverlay`) so the drills' global keydown
  handlers (which check `isOverlayOpen()`) don't fire behind them.
- **PWA / offline** (`vite.config.ts` `VitePWA`, generateSW, `registerType: 'prompt'`, `injectRegister: null`).
  The SW is registered in code by `usePwaUpdate` (not the plugin's auto-inject). The app has **zero runtime
  network calls** — once installed it runs fully from the precache; the only server contact is SW update checks,
  which `settings.offlineMode` gates. Build identity is baked at build time via `define` (`__BUILD_TIME__`,
  `__BUILD_COMMIT__` (git short SHA, best-effort — needs git in the build image; the prod `Dockerfile`'s
  `node:20` has it, but `node:20-alpine` does not → `unknown`), `__APP_VERSION__`), declared in `src/vite-env.d.ts`.
  Serve over HTTPS/localhost (secure context) or the SW won't register.
- **Known remaining work:** `PiDrill` (~640 lines) and `CardsDrill` still concentrate the complex nested
  conditionals and would benefit from extracting their phase/answer state into hooks; `RepetitionDrill`/`PiDrill`/
  `SpeedRound` still use their own timing instead of `useAnswerTimer`. Age-based decay in `numberStats` is not
  wired yet (`HISTORY_HALFLIFE_DAYS` is the intended knob); the number-drill `attempts` read path stays unconsumed
  (Pi's per-position log is the first consumer, via `getAllAttempts`).

## Ignore in context
`node_modules/` `dist/` `.vite/`

## Agent skills

### Issue tracker

Issues live in GitHub Issues for this repo (`github.com/JolleNo10/major-system-app`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` at the repo root + `docs/adr/`. See `docs/agents/domain.md`.
