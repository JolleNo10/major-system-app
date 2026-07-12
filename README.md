# Major System Practice

A drill app for the [Major System](https://en.wikipedia.org/wiki/Mnemonic_major_system) — a phonetic mnemonic that encodes numbers into words, making long digit sequences easier to memorize.

**Stack:** Vite + React + TypeScript + Tailwind CSS v4 · **Runtime:** Docker only

---

## What is the Major System?

Each digit 0–9 maps to one or more consonant sounds. To memorize a number, you pick a word whose consonants match those sounds — vowels are ignored. For example:

| Number | Sounds | Example word |
|--------|--------|--------------|
| 42 | r, n | **r**ai**n** |
| 07 | s, k | **s**o**ck** |
| 99 | p, p | **p**i**p**e |

Once you know a word for each two-digit pair 00–99, you can encode any number sequence as a story or image chain.

---

## Running

```bash
# Development (hot reload → http://localhost:8080)
docker compose up

# After changing package.json
docker compose up --build

# Stop
docker compose down

# Production build
docker build -t major-system . && docker run -p 8080:80 major-system
```

---

## Drill modes

| Mode | What it trains |
|------|---------------|
| **Encoding** | See a number → recall its word |
| **Decoding** | See a word → recall its number |
| **Repetition** | SM-2 spaced repetition queue across both directions |
| **Sequences** | Encode/decode multi-pair sequences with optional delay or distraction |
| **Speed Round** | Encode as many numbers as possible in 60 seconds |
| **Weak Spots** | Automatically focuses on your worst-performing numbers |
| **Sound Key** | Digit → consonant sounds |
| **Reverse Sound Key** | Consonant sound → digit |

### Answer modes

All drills support **Multiple choice** and **Typing** input, toggled via the button in the top-right corner.

### Hints (Encoding / Repetition)

Press **H** or click 💡 to reveal a vowel skeleton of the correct word (e.g. `_ a _` for "mat"). Using a hint caps the SM-2 grade at 3 so the item stays in rotation longer.

---

## Spaced repetition

The Repetition mode uses the **SM-2 algorithm**. Each answer updates the item's ease factor and next review date. The review queue shows the most overdue items first, followed by up to 10 new items per session.

The Encoding and Decoding drills use **weighted random selection** — items with high error rates or low SM-2 ease factors appear more often, while well-known items are shown less frequently.

### Typing-speed compensation

In typing mode a slow time can just mean a long word. The app measures your typing speed
(ms per character, learned from your correct word answers) and subtracts the expected typing
time, judging fast/slow on the remaining **recall time**. So a long word typed at your normal
speed is treated the same as a short one — length is factored out. Multiple choice has no typing
and is never adjusted.

### Set mastery

While practising a round, a **Set mastery** meter shows how much of the whole selected range you
know well. A number counts as *mastered* once you answer it correctly, un-hinted, and within the
mastery speed limit **twice in a row** (recall time, typing already discounted). Selection never
repeats a number back-to-back, so those answers always have another question in between. A wrong
or too-slow answer resets it. Mastered numbers appear less often so the round converges on what
you still need. When the whole set is mastered, a banner offers **Next set**, which advances the
range window by its width (e.g. 00–09 → 10–19) and starts a fresh round.

The mastery **speed limit is adjustable** in Settings (⚙️ in the header) — raise it so answers
that aren't slow still count as mastered, or lower it to require fast/green recall.

### Pause & idle answers

Press **⏸** (or the `p` key) to pause — the timer stops so a break never skews your times.
If you *don't* pause and an answer's active time is unreasonably high (you walked away / got
distracted), that answer is discarded and not counted toward any stats.

---

## Statistics panel (📊)

Available in Encoding and Decoding. A **round** is the current from–to range segment; it resets
when you change the range, leave and re-enter the mode, or click **↺ Restart round**. Rows are
sorted worst-first:

- **✓N / ✗N** — correct and wrong counts *this round*
- **Xs** — median recall time this round (typing time removed; green < 1.2s, yellow, red > 2s)
- **🐢** — answered correctly but slowly (by recall time)
- **💡** — a hint was used for this number *this round*
- **✅** — mastered this round (correct + within the speed limit, twice in a row)
- **∞ c/total** — dimmed all-time score from the persistent store (survives resets)
- **🔥N** — current streak; **best N** shows the round's best when the streak is broken

---

## Customising the word list

Open the **Reference** panel (top-right) → **Word List** tab. Click any word to edit it. Changed words are highlighted in yellow; click **Reset to default** on any entry or **↺ Reset all** to restore defaults.

Custom words are stored in `localStorage` under `major-word-overrides` and take precedence over the defaults in `src/data/words.ts`.

---

## Key files

| File | Purpose |
|------|---------|
| `src/data/words.ts` | Default word list (00–99) |
| `src/data/soundKey.ts` | Digit → consonant sound mappings |
| `src/data/itemStore.ts` | Per-item SM-2 + latency store (localStorage) |
| `src/context/WordsContext.tsx` | Merges default words with user overrides |
| `src/hooks/useStats.ts` | SM-2 scheduling, weak-spot detection |
| `src/App.tsx` | Top-level mode state machine |
| `src/components/modes/` | One file per drill mode |
