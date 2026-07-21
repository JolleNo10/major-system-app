# Majorsystemet

Norwegian **Major System** mnemonic trainer. You practise mapping 2-digit numbers
`00`–`99` to words (encoding) and back (decoding), plus sound-key and sequence drills.
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
| `major-system` (db) → `attempts` store | **IndexedDB** | Per-answer log `{id, key:"enc:07", at, ok, ms}`, pruned to 90 days / 200 per item. Written on every answer; read API exists but is not consumed yet (future age-decay/analytics) |
| `major-word-saved` | localStorage | Committed custom words (layer 2) |
| `major-word-overrides` | localStorage | Trial/pending word edits (layer 3, shown yellow) |
| `major-settings` | localStorage | `{ masteryLatencyFactor }` |
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

## Scoring & spaced repetition
- `sm2.ts` — `gradeAnswer(correct, ms, mode)` → 2 (wrong) / 3 (slow) / 4 / 5 (fast); `applySm2(item, grade)`
  updates ease/interval/due (SM-2). Grades use the **recall-adjusted** ms on the multiple-choice scale.
- `typingSpeed.ts` — `adjustLatency(raw, mode, chars)` subtracts estimated typing time (separate word vs
  digit track) so recall speed is judged on one scale; `RECALL_FAST_MS`/`RECALL_SLOW_MS`, `recallColor`.
- `roundMastery.ts` — per-round mastery: `isMastered` = last `MASTERY_REPS` (2) attempts all correct,
  un-hinted, and `recallMs <= masteryFastMs(settings.masteryLatencyFactor)`. Uses the **in-memory**
  `RoundStat.attempts` held in the drill, not the IndexedDB log.
- `numberStats.ts` — `rankByWeakness(dir, nums)` for the Stats overlay: weakness =
  `0.55·easePenalty + 0.25·normLatency + 0.20·(wrongRate · 0.8^reps)` — recency-biased; the lifetime
  wrong-rate residual decays with the current correct streak. Sorted worst-first, untested last.

## Module map
- `src/App.tsx` — header (mode title, AnswerModeToggle, 📊/📚/⚙️ overlay triggers) + `<main>` mode switch + overlays.
- `src/main.tsx` — mounts `SettingsProvider > WordsProvider > App`; calls `initAttempts()` (opens IndexedDB + one-time migration of any legacy in-blob attempts).
- `src/types.ts` — `Mode`, `AnswerMode`, `Direction`, `NumberStats`/`AllStats`.
- **`components/modes/`** (8 drills): `EncodingDrill`, `DecodingDrill` (share `useAnswerTimer` + `utils/quiz`),
  `SoundKeyDrill`, `ReverseSoundKeyDrill`, `SequenceDrill` (setup→study→recall→result),
  `SpeedRound`, `WeakSpots` (feeds a weak-number `pool` into `EncodingDrill`), `RepetitionDrill` (SM-2 due queue).
- **`components/`** — `ModeSelector` (home cards), `MultipleChoice`/`TypingInput` (answer inputs),
  `ScoreBar`, `RangeSlider` (dual-thumb number range, accessible), `RoundStatsPanel`, `HintButton` (vowel skeleton),
  `SoundKeyTable`/`SoundKeyPanel`, `AnswerModeToggle`, and the 3 overlays: `ReferenceOverlay` (sound key +
  `WordListGrid`), `SettingsOverlay` (mastery tolerance), `StatsOverlay` (worst-first ranking per direction).
- **`hooks/`** — `useStats` (`recordFull` records item-data + attempts and returns its grade; `getStats`
  derives direction-less aggregates from item-data; `getWeakNumbers`, `buildRepQueue`, `getDueCount`,
  `getNextDueMs`), `useAnswerMode`, `useAnswerTimer` (active-elapsed timer/pause/STALE-discard),
  `useOverlay` (focus trap/return + Escape + registers `overlayGuard`).
- **`utils/`** — `quiz` (`shuffle`, `pickDistractors` same-decade-biased, `pickWeighted(dir,…)`),
  `storage` (`safeSet`/`safeRemove`), `overlayGuard` (`isOverlayOpen`), `roundMastery`, `numberStats`, `vowelSkeleton`.
- **`data/`** — `words.csv`+`words.ts`, `wordsCsv.ts`, `soundKey.ts`, `itemStore.ts` (ItemRecord + load/save +
  thresholds `FAST_MS`/`SLOW_MS`), `attemptStore.ts` (IndexedDB), `sm2.ts`, `typingSpeed.ts`, `settings.ts`.

## Conventions & gotchas
- **Read this file first in fresh contexts and keep it updated** when workflow, architecture, commands,
  or persistent repo expectations change.
- **Verify in Docker** (`tsc -b`, `vitest run`, `vite build`) — there is no host node toolchain.
- **Commit + push each completed, verified change to `main`** (one logical change per commit). `.gitignore`
  covers `node_modules/`/`dist/`; keep build artifacts (`package-lock.json`, `tsconfig.tsbuildinfo`) out.
- **All localStorage writes go through `utils/storage`** (`safeSet`/`safeRemove`) — private-mode/quota safe.
- **Full-screen overlays must use `useOverlay`** so the drills' global keydown handlers (which check
  `isOverlayOpen()`) don't fire behind them.
- **Known remaining work:** `EncodingDrill`/`DecodingDrill` are still ~90% duplicated (shared logic lives in
  `useAnswerTimer` + `utils/quiz`, but the JSX/component isn't merged); the IndexedDB `attempts` log is
  write-only (age-based decay in `numberStats` not wired yet — `HISTORY_HALFLIFE_DAYS` is the intended knob).

## Ignore in context
`node_modules/` `dist/` `.vite/`
