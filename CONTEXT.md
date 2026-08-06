# Pi Application

The Pi drill: memorising and reciting the decimal digits of π using Major-System
words. π is worked in fixed segments; progress is tracked along three independent
axes — memorisation, live recitation competence, and flawless-recitation milestones.

**Code home.** Since the package-by-feature restructure (see ADR 0002, refined by ADR 0003),
`src/` is one folder per domain — `features/{major-system, pi, cards}` (with cards split
internally into `shared`/`card`/`themed`/`pao`) over a shared `core/`
(spaced-repetition engine + UI primitives) and an `app/` composition shell. This context
is `features/pi/`: a self-contained feature that exposes its drill entry-points through
`features/pi/index.ts` and keeps everything else internal. It depends on `core/` and reuses
the Major-System **Word** list via the `features/major-system` barrel (its one cross-feature
edge). Internally it's split by tab (see ADR 0004): `shared/` (`+story/`) holds code reached by
3+ tabs or the app; `memo/`, `recite/`, `anchors/` each own one tab (with `PiDrill` the
composition root at the root). The glossary below is the ubiquitous language for that feature.

## Language

### Units & structure

**Pair**:
Two consecutive decimal digits of π, encoded as one Major-System word. The atomic
unit of a π sequence.
_Avoid_: two-digit number, couple

**Position**:
The 1-indexed place of a pair within π (pair #1 = digits 1–2).
_Avoid_: index, slot

**Segment**:
A fixed block of 10 consecutive pairs (20 digits), 0-indexed. The unit of
memorisation, one story, and one status dot.
_Avoid_: block, chunk, group

**Anchor**:
The opening pair of a segment — the hook that tells you which segment comes next.
_Avoid_: first pair, head

**Boundary**:
The seam between one segment and the next, crossed when chaining.
_Avoid_: edge, join

### Activities

**Memo**:
Author a story for a segment and memorise its word-chain. No timing or stats.

**Recite**:
Number-quiz a chosen range of π; records a run. The scored activity. Weakness is
targeted here directly — the segment status dots show which ranges to pick.

**Anchors**:
Drill segment *order* by typing each segment's anchor in turn — trains the sequence
of segments, not any one segment.

**Chain**:
Recite a segment, then bridge across its boundary into the next — drilled by
selecting a Recite range that spans the boundary.

### Progress

**Memoed**:
A segment whose word-chain was recalled all-correct once in Memo. The first
milestone. Sticky.
_Avoid_: memorised, learned

**Practising**:
A segment that's been recited but isn't yet flawless — a live status that can
regress on a later miss.
_Avoid_: weak, weak spot

**Learned**:
The top live recitation status — every pair answered correctly with no recorded
misses. Regressable.
_Avoid_: mastered, recited

**Flawlessly recited**:
A permanent milestone — a whole segment recited with zero mistakes in one run.
Never regresses.
_Avoid_: learned, completed

**Next to memo**:
The first segment that is neither memoed nor recited — the suggested starting point.

### Metrics

**Reach**:
Consecutive correct pairs from the start of a run — the headline "= N digits of π"
number.
_Avoid_: score, streak

**Run**:
One completed Recite pass over a range, summarised and capped in history.
_Avoid_: session, attempt

### Content

**Story**:
The freeform text plus one optional picture a learner authors per segment.
_Avoid_: mnemonic, note

**Word**:
The Major-System word a pair encodes.
_Avoid_: mnemonic, peg
