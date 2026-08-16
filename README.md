# Mnemonics

Mnemonics is an offline mnemonic training suite for building, practising, and
maintaining memory systems. It brings Major System drills, Pi memorisation,
card-deck associations, and World Countries practice into one installable app.

The app is client-only: no account, backend, telemetry, or runtime network
connection is required. Your word lists, associations, progress, and history
stay in your browser and remain available after installation, even without an
internet connection.

**Stack:** Vite + React 19 + TypeScript + Tailwind CSS v4

**Runtime:** host Node.js/npm preferred; Docker is supported as a fallback

## What you can practise

| Area | What it offers |
|------|----------------|
| **Major System** | Encode and decode 00–99 number/word pairs, learn the sound key, practise due items, target weak spots, train sequences, and test your speed. |
| **Pi** | Memorise and recite digits of π with Major System words using Memo, Recite, Anchors, and Maintain workflows. Track segment progress and create stories for difficult sections. |
| **Deck of Cards** | Practise a 52-card deck with two association systems: Themed Deck uses one person or word per card; PAO Deck uses a Person, Action, and Object for each card, with Encode, Decode, and Deck Memo practice. |
| **World Countries** | Learn country locations and capitals with map-based preparation, guided learning, deliberate Drill, ordered Recite, and Due review. |

Multiple-choice and typing answer modes are available where they fit the
exercise. Typing practice compensates for the expected time needed to type a
long answer, so recall speed is measured more fairly.

## The Major System

The Major System maps digits to consonant sounds. To memorise a number, choose
a word whose consonants match those sounds; vowels are ignored.

| Number | Sounds | Example word |
|--------|--------|--------------|
| 42 | r, n | **r**ai**n** |
| 07 | s, k | **s**o**ck** |
| 99 | p, p | **p**i**p**e |

Once you know a word for each pair from 00 to 99, you can turn long number
sequences into stories and image chains.

### Major System drills

| Mode | What it trains |
|------|---------------|
| **Encoding** | See a number and recall its word |
| **Decoding** | See a word and recall its number |
| **Repetition** | Review due items with SM-2 spaced repetition |
| **Sequences** | Encode or decode multi-pair number sequences |
| **Speed Round** | Encode as many numbers as possible in 60 seconds |
| **Weak Spots** | Focus on numbers with the most errors |
| **Sound Key** | Recall the consonant sounds for each digit |
| **Reverse Sound Key** | Recall the digit for each consonant sound |

Encoding and Decoding use weighted selection so difficult items appear more
often. The Set mastery meter tracks consecutive, unhinted answers within your
chosen speed limit and moves mastered items out of the way as you improve.

The Repetition mode uses SM-2 scheduling to set each item's next review. A
pause control stops the timer, and answers with unusually long idle time can be
discarded instead of distorting your statistics.

### Hints and statistics

In Encoding and Repetition, press `H` or use the hint button to reveal a vowel
skeleton for the answer. A hinted answer is capped at SM-2 grade 3 so it stays
in rotation longer.

The Encoding and Decoding statistics panel shows round-level correct and wrong
counts, median recall time, slow answers, hints, mastery, current streaks, and
the all-time score retained in local storage. Rows are sorted so the numbers
that need attention are easiest to find.

## Personal associations and progress

The Major System word list is editable from the **Reference** panel's **Word
List** tab. You can try changes, save them, reset individual entries, reset the
whole list, and import or export the same CSV format used by the shipped
defaults. The Themed and PAO decks also have their own editable association
lists.

Progress and review history are stored locally in `localStorage` and
IndexedDB. The feature areas keep their own learning semantics while sharing
the underlying mnemonic and scoring infrastructure where appropriate.

## Running locally

With Node.js and npm installed on the host:

```bash
npm ci
npm run dev             # start the development server
npm test                # run the test suite
npm run build           # type-check and create a production build
```

The development server is available at `http://localhost:5173` by default.

### Docker fallback

```bash
# Development with hot reload
docker compose up

# After changing package.json or package-lock.json
docker compose up --build

# Stop
docker compose down

# Production image
docker build -t mnemonics .
docker run -p 8080:80 mnemonics
```

## Repository map

| Path | Purpose |
|------|---------|
| `src/app/` | Application composition, mode registry, layout, and global settings |
| `src/core/` | Shared learning, mnemonic, scoring, storage, card, CSV, and UI primitives |
| `src/features/major-system/` | Major System words, sound key, and drills |
| `src/features/pi/` | Pi Memo, Recite, Anchors, Maintain, and story workflows |
| `src/features/cards/` | Themed and PAO card-deck workflows and editable associations |
| `src/features/world-countries/` | Geography data, maps, learning, Drill, Recite, and Due workflows |

### Useful source files

| File | Purpose |
|------|---------|
| `src/app/App.tsx` | Top-level application composition |
| `src/app/modes.tsx` | Registry of the app's practice modes |
| `src/features/major-system/words.csv` | Default Major System word list for 00–99 |
| `src/features/major-system/soundKey.csv` | Digit-to-consonant sound mappings |
| `src/core/scoring/itemStore.ts` | Persistent per-item scoring and latency data |
| `src/core/scoring/useStats.ts` | Scheduling and weak-spot statistics |
| `src/features/major-system/WordsContext.tsx` | Combines defaults with saved word-list changes |
