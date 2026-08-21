# Change Spec 0019 - Unified World Countries overlay answer feedback

- **Status:** Implemented
- **Date:** 2026-08-21
- **Issue:** None.
- **Related ADRs:** None required.
- **Current-state docs:** [World Countries](../architecture/features/WORLD_COUNTRIES.md)
- **Related Change Specs:** [0010](0010-world-countries-map-centered-interaction-qol.md), [0017](0017-world-countries-uniform-typed-answer-interaction.md), [0018](0018-align-world-countries-today-with-drill-layout.md)
- **Supersedes in part:** Change Spec 0017 where its implementation placed shared typed-answer feedback inline in the task dock.
- **Supersedes in part:** Change Spec 0018 where it describes typed-answer feedback and fuzzy remediation as content of the Today answer dock.

## Goal

Give every primary typed World Countries recall flow one visually consistent answer-feedback system centered on the map.

The answer **overlay is the feedback surface**.

The task dock remains the answer-entry/control surface and must not repeat result text already shown in the overlay.

The target visual direction is the approved centered translucent-glass feedback treatment:

- centered over the map;
- strongly transparent rather than opaque/modal;
- softly blurred;
- compact;
- exact success should feel rewarding through restrained motion and green light;
- fuzzy accepted answers use the same feedback surface but become interactive for spelling remediation;
- incorrect answers use the same surface with calm corrective treatment rather than punitive presentation.

This change also fixes the regression introduced by Change Spec 0017: Drill was the intended behavioral/visual reference, but the shared implementation moved Drill feedback from the map into an inline task-dock message.

## User-visible behavior

### One feedback surface

For primary typed World Countries recall:

- exact-correct feedback appears in a centered overlay over the map;
- fuzzy-accepted feedback appears in the same centered overlay;
- incorrect feedback appears in the same centered overlay;
- Recite revealed-answer feedback appears in the same centered overlay;
- answer result copy is not repeated in the task dock;
- fuzzy spelling-remediation choices and mini spelling practice live inside the fuzzy overlay, not below the map and not in a second modal/portal.

The map remains visible through the feedback surface.

The overlay must read as a light glass layer attached to the map rather than as a blocking modal.

### Covered typed-recall surfaces

Apply the same feedback presentation to the primary typed-answer surfaces already unified by Change Spec 0017:

- Drill -> Drill typed recall;
- Drill -> Learn & Practise -> standalone typed Practice;
- Learn Countries -> Set Practice;
- Learn Countries -> Combined Practice;
- Learn Countries -> Final Recall;
- Learn Capitals -> Set Practice;
- Learn Capitals -> Combined Practice;
- Learn Capitals -> Final Recall;
- Today Review;
- Recite -> Countries;
- Recite -> Countries + Capitals;
- Recite -> Countries from Capitals.

Location-click and multiple-choice interactions are not part of this visual-feedback contract.

## Shared visual grammar

### Map overlay

The feedback overlay is centered within the map surface.

It must:

- sit visually above map geometry and labels;
- preserve enough transparency that map context remains visible;
- use blur/saturation to separate text from the map instead of an opaque backdrop;
- remain compact enough that the map still dominates the page;
- use the same geometry and material treatment across exact, fuzzy, incorrect, and revealed states;
- vary tone, icon/copy, and interactivity by result state rather than swapping to unrelated components.

### Task dock

The typed form dock below the map uses the same translucent-glass material family.

The dock contains:

- task/status label already appropriate for the owning workflow;
- the answer field and Check action while answerable;
- the submitted/disabled answer-field state while feedback is active;
- answerable-state workflow actions that already belong there, such as Today delayed-retry `Skip for now`, only while the prompt is answerable.

The dock must **not** contain:

- `Correct`;
- `Incorrect`;
- canonical-answer correction copy;
- fuzzy canonical-spelling copy;
- `Mini practise spelling`;
- fuzzy `Continue`;
- duplicate feedback text of any kind.

The field itself may retain its accepted/incorrect visual state because that is part of the submitted answer control, not duplicate feedback copy.

### Exact correct

An exact correct answer:

1. locks the submitted answer field in its existing accepted state;
2. shows the centered success overlay;
3. uses a green translucent-glass tone;
4. shows a positive check icon and `Correct`;
5. may show the canonical answer as the small secondary line;
6. uses a restrained entrance/icon-pop motion to make success feel rewarding;
7. remains passive/non-interactive;
8. preserves the existing **500 ms** success dwell;
9. automatically performs the owning workflow transition.

Example:

```text
            [ ✓ ]
           Correct
            Berlin
```

There is no Continue button.

The reward should feel like a brief confirmation, not a celebration screen. Do not add confetti, particles, large scaling, screen flashes, sound, or gamified score animation.

### Fuzzy accepted

A fuzzy answer remains **correct/accepted**, but explicitly teaches the canonical spelling.

Example:

```text
            [ ✓ ]
           Correct
     Spelling: Chișinău
      You typed: Chisinau

 [ Mini practise spelling ] [ Continue ]
```

Requirements:

- use the same centered glass overlay geometry as exact correct;
- use an amber/warm correction tone to distinguish accepted-with-correction from exact success;
- keep the positive check icon: fuzzy is accepted and must not visually read as incorrect;
- title remains `Correct`;
- canonical spelling is prominent: `Spelling: <canonical answer>`;
- submitted spelling may be shown beneath it as low-emphasis context: `You typed: <submitted answer>`;
- no automatic 500 ms transition while fuzzy remediation is active;
- `Mini practise spelling` and `Continue` are both inside the overlay;
- **Mini practise spelling is the initially focused action** when the fuzzy overlay appears;
- therefore pressing Enter immediately after a fuzzy result activates Mini practise spelling through native focused-button behavior;
- `Continue` remains available as the explicit choice to accept the correction without doing mini practice.

Do not autofocus Continue.

Do not implement a new global Enter shortcut for this state. Native focus and native button activation are the keyboard mechanism.

### Fuzzy mini spelling practice

Selecting `Mini practise spelling` expands the practice **inside the same overlay**.

Do not open `app/layout/Overlay`, a portal, modal, drawer, second card elsewhere on the page, or a separate screen.

The existing spelling-learning semantics remain:

- learner spells the canonical Country/Capital from memory;
- exact normalized canonical spelling is required;
- two correct spellings in a row complete mini practice;
- an incorrect spelling resets the consecutive count;
- while mini practice is open, hide the visible `Spelling` and `You typed` comparison lines;
- keep `Reveal spelling` available in their former position, revealing the canonical spelling there;
- do not render a second reveal control or a `Back to choices` action inside the practice body;
- the visible `Mini practise spelling` action toggles practice closed, returning to the base fuzzy overlay and restoring its focus;
- mini practice writes no Drill evidence, Learning milestone, Today evidence, or Recite outcome beyond the already-accepted original fuzzy answer.

Focus behavior:

1. fuzzy overlay appears;
2. focus moves to `Mini practise spelling`;
3. Enter activates it;
4. inline practice expands;
5. focus moves to the spelling input;
6. Enter submits the spelling form;
7. after the first correct spelling, clear the field and return focus to the spelling input for the second attempt;
8. after the second correct spelling, show completion inside the same overlay and move focus to `Continue`;
9. Enter on focused Continue performs the owning fuzzy transition.

If the learner backs out of mini practice before completion, return to the base fuzzy overlay and focus `Mini practise spelling` again.

The existing explicit fuzzy continuation remains authoritative: completing mini practice does not silently advance the underlying recall prompt unless implementation deliberately maps the final focused Continue activation to the existing `onContinue` action.

### Incorrect answers in Drill Learn & Practise

When the typed-answer surface was launched from Drill's **Learn & Practise** purpose, an incorrect answer may offer the same mini spelling game:

- the incorrect overlay remains open instead of auto-transitioning after the correction dwell;
- `Mini practise spelling` and `Continue` are offered as explicit choices;
- selecting mini practice uses the existing two-consecutive-correct spelling semantics and creates no additional evidence;
- `Continue` preserves the original incorrect result and performs the owning workflow transition;
- ordinary Drill, Today, and Recite incorrect answers retain their existing correction/retry lifecycle.

### Incorrect

An ordinary incorrect answer:

1. locks the submitted answer field in its incorrect state;
2. shows the centered feedback overlay;
3. uses a restrained rose/red translucent-glass tone;
4. shows `Incorrect`;
5. shows the canonical correction when the owning workflow permits disclosure;
6. preserves the existing **1800 ms** correction dwell;
7. remains passive/non-interactive;
8. automatically performs the owning workflow transition after the dwell.

Example where disclosure is allowed:

```text
            [ × ]
          Incorrect
   Correct answer: Berlin
```

Do not add a Continue button.

Do not make incorrect feedback visually punitive. The purpose is correction, not failure celebration in reverse.

The current input shake may remain if it does not visually compete with the overlay, but do not add stronger shake, flashing, or full-map red treatment.

### Recite incorrect retry

Recite retains its existing semantic exception:

- show the same incorrect overlay shell/tone;
- show concise `Incorrect`;
- **do not reveal the expected answer**;
- after the existing correction dwell, dismiss feedback;
- reset/focus the same answer field for another attempt.

Example:

```text
            [ × ]
          Incorrect
        Try again.
```

The shared overlay presentation must not infer disclosure from `incorrect`; the owning workflow remains responsible for whether canonical answer copy is supplied.

### Recite Reveal / Skip

Reveal / Skip remains an answerable-state action according to existing Recite semantics.

After Reveal / Skip:

- use the same centered feedback overlay geometry;
- show `Answer revealed`;
- show the canonical answer;
- use a warm correction/reveal tone rather than exact-success green;
- preserve the existing correction/reveal dwell;
- auto-advance according to existing Recite behavior.

Reveal is passive once selected; no generic Next/Continue button is added.

## Interaction and states

The common typed-answer presentation states become:

```text
ANSWERABLE
   |
   +-- exact ----------> EXACT_OVERLAY ----------> timed transition
   |
   +-- fuzzy ----------> FUZZY_OVERLAY
   |                        |
   |                        +-- Continue --------> transition
   |                        |
   |                        +-- Mini practise
   |                              |
   |                              +-- spelling input / feedback
   |                              +-- complete -> focus Continue
   |
   +-- incorrect ------> INCORRECT_OVERLAY -----> timed transition
   |
   +-- revealed -------> REVEALED_OVERLAY ------> timed transition
```

For Recite incorrect retry:

```text
ANSWERABLE
   |
incorrect
   |
INCORRECT_OVERLAY
   |
1800 ms
   |
ANSWERABLE same prompt + input focus
```

### Focus ownership

Focus is part of the behavior contract and must be tested.

- Answerable typed prompt: answer input owns focus as today.
- Exact overlay: do not steal focus for a 500 ms passive state.
- Ordinary incorrect/revealed overlay: do not move focus to a passive card.
- Fuzzy overlay base state: move focus to `Mini practise spelling`.
- Fuzzy mini practice open: move focus to spelling input.
- First correct mini-practice attempt: clear and refocus spelling input.
- Mini-practice completion: focus Continue.
- Returning from mini practice to fuzzy choices: focus Mini practise spelling.
- New prompt / Recite retry: restore answer-input focus through the shared typed-answer lifecycle.

During any feedback state, underlying answer submission remains locked and repeated Enter must not trigger duplicate workflow transitions.

### Native Enter behavior

Do not add fuzzy-specific `window.keydown` handling.

The intended Enter behavior is achieved by putting focus on the correct native control:

```text
fuzzy overlay appears
-> focus Mini practise spelling button
-> Enter clicks focused button
-> focus spelling input
-> Enter submits native form
-> after completion focus Continue
-> Enter clicks Continue
```

This avoids conflicts with existing safe-Enter behavior and keeps keyboard semantics accessible.

### Responsive behavior

The overlay remains centered in the visible map container at desktop and smaller widths.

- use map-relative positioning, not viewport positioning;
- keep horizontal map padding so the card does not touch map edges;
- allow the fuzzy overlay to grow vertically when mini practice expands;
- on constrained heights, the interactive fuzzy card may scroll internally if necessary rather than overflowing outside the map;
- do not change global rail/drawer breakpoints;
- the stacked answer dock remains below the map.

## Architecture constraints

Follow [World Countries architecture](../architecture/features/WORLD_COUNTRIES.md).

- `ui/WorldCountriesTypedAnswer` remains the authoritative feature-local typed-answer lifecycle seam.
- Workflow owners continue to provide classification, copy, disclosure policy, evidence semantics, queue/scheduler transitions, and Recite retry/reveal semantics.
- The shared UI layer may own common overlay presentation, feedback focus behavior, fuzzy local-practice state, and shared timing already assigned to it.
- `MapSurface` remains the feature-local map composition seam.
- Do not make Today, Learning, Recite, or Practice import Drill internals to reproduce the visual result.
- Do not move World Countries feedback semantics into generic app layout.
- Do not make `core/ui/TypingInput` aware of `fuzzy`, Recite, Today, Country, or Capital semantics.
- `core/ui/RecallFeedback` may remain unchanged if the new World Countries feedback surface is feature-specific. Prefer a World Countries-local presentation seam over broadening a core component solely to achieve this visual design.
- No persistence, evidence, scheduling, geography, mastery, or Learning ownership changes.

### No ADR

No ADR is required.

The change does not make a new durable decision about ownership, dependency direction, source of truth, persistence, stable identity, or public feature boundaries.

It refines the user-visible interaction and presentation contract inside the existing feature-local typed-answer/UI architecture. That belongs in this Change Spec.

## Existing capabilities to reuse

- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
  - keep prompt-key reset, deduplicated submit, result lifecycle, timing, and exactly-once transition ownership.
- `src/features/world-countries/ui/MiniSpellingPractice.tsx`
  - retain spelling normalization and two-correct-in-a-row practice semantics, but refactor presentation so fuzzy practice can render inline in the answer-feedback overlay rather than through a portal.
- `src/features/world-countries/ui/MapSurface.tsx`
  - use the relative map container as the placement boundary for centered answer feedback.
- `src/core/ui/TypingInput.tsx`
  - keep native form submit, input focus/reset, accepted/incorrect field state, and disabled feedback-state behavior.
- `src/core/ui/RecallFeedback.tsx`
  - existing behavior is a useful semantic reference, but do not force the approved World Countries glass/interactivity into Core if that would affect unrelated features.
- existing owner evaluation/copy callbacks
  - continue to determine exact/fuzzy/incorrect/revealed outcome and answer disclosure.

## Normative visual reference

The following styling examples are intentionally more concrete than a normal Change Spec.

They are **normative visual implementation references** because the approved feel depends on exact opacity, blur, geometry, shadow, and motion. An implementation may factor classes differently, but the rendered result should remain materially equivalent.

### 1. Map overlay host

Add or expose a feature-local map-overlay slot through `MapSurface` so callers do not each invent absolute positioning.

Reference markup/classes:

```tsx
<div className="relative">
  {map}

  {feedbackOverlay && (
    <div
      className="
        pointer-events-none absolute inset-0 z-20
        flex items-center justify-center
        p-5
      "
    >
      {feedbackOverlay}
    </div>
  )}
</div>
```

The feedback card itself opts back into pointer events only when interactive:

```tsx
const pointerClass = outcome === 'fuzzy'
  ? 'pointer-events-auto'
  : 'pointer-events-none'
```

Do not portal the primary answer-feedback card to `document.body`.

### 2. Shared glass feedback shell

Reference shell:

```tsx
const feedbackShellClass = `
  w-full max-w-[420px]
  rounded-[22px]
  border
  px-5 py-[18px]
  text-center
  backdrop-blur-[18px]
  backdrop-saturate-125
  shadow-[0_20px_75px_rgba(0,0,0,0.34)]
  animate-world-answer-feedback-in
`
```

Reference tone mapping:

```tsx
const feedbackToneClass = {
  exact: `
    border-green-300/30
    bg-[rgba(10,20,16,0.42)]
    shadow-[0_20px_75px_rgba(0,0,0,0.34),0_0_60px_rgba(74,222,128,0.10)]
  `,
  fuzzy: `
    border-amber-300/30
    bg-[rgba(24,18,10,0.46)]
    shadow-[0_20px_75px_rgba(0,0,0,0.34),0_0_60px_rgba(251,191,36,0.08)]
  `,
  incorrect: `
    border-rose-400/30
    bg-[rgba(26,14,18,0.46)]
    shadow-[0_20px_75px_rgba(0,0,0,0.34),0_0_60px_rgba(251,113,133,0.08)]
  `,
  revealed: `
    border-amber-300/25
    bg-[rgba(24,18,10,0.44)]
    shadow-[0_20px_75px_rgba(0,0,0,0.34),0_0_52px_rgba(251,191,36,0.06)]
  `,
}[outcome]
```

Do not replace these with opaque `bg-zinc-900/90` cards. Transparency is a core part of the approved direction.

### 3. Feedback icon

Reference base:

```tsx
const feedbackIconBase = `
  mx-auto mb-2
  grid size-12 place-items-center
  rounded-full border
  text-2xl font-black
  animate-world-answer-feedback-icon
`
```

Exact:

```tsx
className={`
  ${feedbackIconBase}
  border-green-300/35
  bg-green-500/15
  text-green-200
`}
```

Fuzzy:

```tsx
className={`
  ${feedbackIconBase}
  border-amber-300/30
  bg-amber-400/10
  text-amber-200
`}
```

Incorrect:

```tsx
className={`
  ${feedbackIconBase}
  border-rose-300/30
  bg-rose-400/10
  text-rose-200
`}
```

Use:

```text
exact      ✓
fuzzy      ✓
incorrect  ×
revealed   answer/reveal-appropriate simple glyph if one already exists
```

Do not use `~` for fuzzy in the final target. The answer is accepted; the amber tone and spelling copy carry the distinction.

### 4. Feedback typography

Reference exact:

```tsx
<div className="text-[18px] font-extrabold text-green-50">
  Correct
</div>
<div className="mt-0.5 text-[13px] text-green-200/80">
  {canonicalAnswer}
</div>
```

Reference fuzzy:

```tsx
<div className="text-[18px] font-extrabold text-amber-50">
  Correct
</div>

<div className="mt-0.5 text-[13px] text-amber-200">
  Spelling: <strong>{canonicalAnswer}</strong>
</div>

<div className="mt-1.5 text-xs text-zinc-300">
  <span className="text-zinc-500">You typed:</span>{' '}
  {submittedAnswer}
</div>
```

Reference ordinary incorrect when disclosure is permitted:

```tsx
<div className="text-[18px] font-extrabold text-rose-50">
  Incorrect
</div>

<div className="mt-0.5 text-[13px] text-rose-200">
  Correct answer: <strong>{canonicalAnswer}</strong>
</div>
```

Reference Recite incorrect retry:

```tsx
<div className="text-[18px] font-extrabold text-rose-50">
  Incorrect
</div>

<div className="mt-0.5 text-[13px] text-rose-200/80">
  Try again.
</div>
```

### 5. Fuzzy choice actions

Both actions are inside the overlay.

`Mini practise spelling` is the preferred/focused action.

Reference layout:

```tsx
<div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
  <button
    ref={practiceButtonRef}
    type="button"
    data-fuzzy-spelling-action="practice"
    onClick={openPractice}
    className="
      rounded-[11px]
      border border-amber-300/30
      bg-amber-400/15
      px-3 py-2.5
      text-sm font-semibold text-amber-50
      transition-colors
      hover:bg-amber-400/20
      focus:outline-none
      focus:ring-2 focus:ring-amber-300/50
      focus:ring-offset-2 focus:ring-offset-transparent
    "
  >
    Mini practise spelling
  </button>

  <button
    ref={continueButtonRef}
    type="button"
    data-fuzzy-spelling-action="continue"
    onClick={onContinue}
    className="
      rounded-[11px]
      border border-white/10
      bg-white/[0.05]
      px-3 py-2.5
      text-sm font-semibold text-zinc-100
      transition-colors
      hover:bg-white/[0.09]
      focus:outline-none
      focus:ring-2 focus:ring-zinc-300/40
      focus:ring-offset-2 focus:ring-offset-transparent
    "
  >
    Continue
  </button>
</div>
```

Do not use `autoFocus` on Continue.

### 6. Fuzzy focus reference

Reference behavior:

```tsx
const practiceButtonRef = useRef<HTMLButtonElement>(null)
const continueButtonRef = useRef<HTMLButtonElement>(null)
const spellingInputRef = useRef<HTMLInputElement>(null)

useLayoutEffect(() => {
  if (feedbackState !== 'fuzzy' || practiceOpen) return
  practiceButtonRef.current?.focus()
}, [feedbackState, practiceOpen])

useLayoutEffect(() => {
  if (!practiceOpen || practiceComplete) return
  spellingInputRef.current?.focus()
}, [practiceOpen, practiceRoundKey, practiceComplete])

useLayoutEffect(() => {
  if (!practiceComplete) return
  continueButtonRef.current?.focus()
}, [practiceComplete])
```

Equivalent focus logic is acceptable.

The important contract is the resulting focus behavior, not these exact state variable names.

### 7. Inline mini-practice styling

Expanded practice remains inside the fuzzy glass card.

Reference divider/container:

```tsx
<div
  className="
    mt-3
    border-t border-white/[0.09]
    pt-3
    text-left
    animate-fade-in
  "
>
```

Reference instruction:

```tsx
<p className="mb-2 text-xs text-zinc-300">
  Type the canonical spelling from memory.
  Get it right twice in a row.
</p>
```

Reference input/check form:

```tsx
<form
  onSubmit={handlePracticeSubmit}
  className="space-y-2"
>
  <div className="flex gap-2">
    <input
      ref={spellingInputRef}
      type="text"
      autoComplete="off"
      spellCheck={false}
      aria-label={`Spell the ${answerKind}`}
      className="
        min-w-0 flex-1
        rounded-[10px]
        border border-amber-300/20
        bg-black/20
        px-3 py-2.5
        text-center text-base font-medium text-amber-50
        outline-none
        transition-colors
        placeholder:text-zinc-600
        focus:border-amber-300/50
        focus:ring-1 focus:ring-amber-300/30
      "
    />

    <button
      type="submit"
      data-mini-spelling-action="check"
      className="
        rounded-[10px]
        border border-amber-300/20
        bg-amber-400/[0.08]
        px-3 py-2.5
        text-sm font-semibold text-amber-200
        transition-colors
        hover:bg-amber-400/[0.14]
        disabled:cursor-not-allowed
        disabled:opacity-40
      "
    >
      Check
    </button>
  </div>
</form>
```

Reference practice feedback:

```tsx
<p
  aria-live="polite"
  className="mt-2 min-h-5 text-xs text-amber-100/90"
>
  {feedback
    ? `${feedback} ${correctCount} / 2 correct`
    : `${correctCount} / 2 correct`}
</p>
```

Reference spelling reveal:

```tsx
<button
  type="button"
  onClick={() => setShowAnswer(true)}
  className="
    text-xs font-medium text-amber-200
    underline-offset-4
    hover:text-amber-100 hover:underline
  "
>
  Reveal spelling
</button>
```

When revealed:

```tsx
<p
  className="
    rounded-lg
    border border-amber-300/25
    bg-amber-400/[0.08]
    px-3 py-2
    text-center text-base font-bold text-amber-100
  "
>
  {canonicalAnswer}
</p>
```

Keep the overlay visually one card: do not nest a second heavy panel around the practice section.

### 8. Form dock glass styling

The typed `TaskDock` form variant should match the overlay material family without becoming as visually prominent as the overlay.

Reference replacement for the current `form` variant styling:

```tsx
form: `
  rounded-[18px]
  border border-white/[0.11]
  bg-[linear-gradient(180deg,rgba(20,22,28,0.54),rgba(11,12,16,0.72))]
  px-4 py-3.5
  shadow-[0_20px_60px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.04)]
  backdrop-blur-[18px]
  backdrop-saturate-125
`
```

Keep other `TaskDock` variants unchanged unless visual inspection shows they intentionally belong to the same immediate typed-form family.

The form dock should feel quieter than the feedback overlay.

### 9. Submitted answer-field states

Do not add feedback copy to the field/dock.

Keep visual state only.

Accepted exact/fuzzy can continue using the current positive field state:

```text
border-green-500
bg-green-500/10
text-green-300
✓
```

Incorrect can continue using the current negative field state:

```text
border-red-500
bg-red-500/10
text-red-300
×
```

Do not modify `TypingInput` solely to add a fuzzy-specific amber state unless implementation discovers that the approved overlay is insufficient to communicate fuzzy acceptance. The intended distinction is primarily in the overlay.

### 10. Motion utilities

Add a small feature-purpose motion, including reduced-motion fallback.

Reference CSS for `src/app/index.css`:

```css
@keyframes world-answer-feedback-in {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes world-answer-feedback-icon {
  0% {
    transform: scale(0.74);
  }
  55% {
    transform: scale(1.10);
  }
  100% {
    transform: scale(1);
  }
}

@utility animate-world-answer-feedback-in {
  animation: world-answer-feedback-in 0.18s ease-out;
}

@utility animate-world-answer-feedback-icon {
  animation: world-answer-feedback-icon 0.48s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .animate-world-answer-feedback-in,
  .animate-world-answer-feedback-icon {
    animation: none;
  }
}
```

Do not lengthen the shared answer dwell to accommodate animation.

The 500 ms exact dwell includes the motion; the animation must therefore complete quickly enough to leave a readable stable success moment.

## Shared component contract

The agent may choose the exact factoring, but the shared typed-answer API must make the map-overlay placement natural rather than requiring each workflow to reconstruct result presentation.

A suitable conceptual render state is:

```ts
export interface WorldCountriesTypedAnswerRenderState {
  input: ReactNode
  feedbackOverlay: ReactNode | null
  isAnswerable: boolean
  feedbackActive: boolean
  outcome: WorldCountriesTypedAnswerOutcome | null
  reveal: () => boolean
}
```

The existing separate `fuzzyControls` output should no longer be required by callers if fuzzy controls are owned by `feedbackOverlay`.

Do not retain a second inline fuzzy-control rendering path for compatibility.

A feature-local feedback component is preferred, for example conceptually:

```text
ui/
  WorldCountriesTypedAnswer.tsx
  WorldCountriesAnswerFeedback.tsx
  MiniSpellingPractice.tsx
  MapSurface.tsx
```

Exact file factoring is not an architectural requirement.

## Regression protection

The implementation must specifically prevent a repeat of the Change Spec 0017 regression.

Do not treat “shared component” as permission to move established feedback to an arbitrary shared placement.

Shared behavior and shared presentation are both required:

```text
shared result lifecycle
+ shared overlay component
+ shared map-relative placement
+ workflow-owned semantics
```

Drill must not be visually changed by a future consumer merely because Today, Learning, or Recite also uses the same seam.

## Edge cases

- Fuzzy accepted input with diacritics omitted still shows the canonical accented spelling.
- Fuzzy accepted input with casing/spacing differences uses existing classification semantics; do not invent new fuzzy matching in the feedback layer.
- Fuzzy practice must not create another evidence attempt.
- Repeated Enter while passive exact/incorrect feedback is active must not advance twice.
- Enter on initial fuzzy feedback must activate Mini practise spelling, not Continue.
- If focus restoration races with a prompt transition/unmount, stale focus work must be cancelled/ignored.
- Recite incorrect must not expose the canonical answer visually or through accessible text.
- Today delayed-retry `Skip for now` disappears once answer feedback owns the prompt.
- Exiting/unmounting during fuzzy practice must not fire the underlying continuation.
- Below narrow widths, fuzzy action buttons may stack vertically.
- Long Country/Capital names wrap inside the feedback card without widening beyond the map-safe maximum.
- Reduced-motion users receive the same state/copy without entrance/icon animation.
- Mini practice completion must not leave focus on a removed input.
- If the learner chooses Continue without mini practice, the existing accepted fuzzy outcome transitions exactly once.

## Out of scope

- New fuzzy-answer matching rules.
- Changing exact/fuzzy/incorrect scoring semantics.
- Changing Drill evidence.
- Changing Today scheduling or delayed retry.
- Changing Learning scheduler or repair behavior.
- Changing Recite outcome semantics.
- New sound/haptics/confetti/reward scoring.
- Redesigning multiple-choice feedback.
- Redesigning location-click feedback.
- Global redesign of `core/ui/RecallFeedback`.
- New persistence.
- Global PageLayout/rail changes.
- Changing the World Countries map palette/mastery colors.

## Acceptance criteria

### Uniform placement

- [x] Exact, fuzzy, incorrect, and revealed feedback for every primary typed World Countries flow is presented as a centered map-relative overlay.
- [x] Typed Drill no longer renders `Correct`/`Incorrect` feedback inline above the answer field.
- [x] Today, Learning, Practice, and Recite do not implement separate typed-feedback placements.
- [x] The overlay remains visibly translucent and map context is readable behind it.
- [x] The stacked typed form dock remains below the map.

### Dock behavior

- [x] The typed form dock uses the approved quieter glass styling.
- [x] No answer result text is duplicated in the task dock.
- [x] Exact/fuzzy submitted inputs retain accepted visual state; incorrect retains negative visual state.
- [x] Fuzzy Continue and Mini practise spelling do not render in the dock.

### Exact

- [x] Exact feedback shows green glass `✓ Correct` treatment.
- [x] Exact feedback remains passive.
- [x] Exact feedback preserves the existing 500 ms dwell.
- [x] Exact feedback auto-transitions exactly once.
- [x] The restrained success motion is present unless reduced motion is requested.

### Fuzzy

- [x] Fuzzy feedback uses the same centered glass geometry with an amber correction tone.
- [x] Fuzzy title is `Correct`, not `Incorrect` or `Almost`.
- [x] Fuzzy overlay shows the canonical spelling.
- [x] Fuzzy overlay may show the submitted spelling for comparison.
- [x] Fuzzy overlay contains both `Mini practise spelling` and `Continue`.
- [x] `Mini practise spelling` receives focus when the fuzzy overlay appears.
- [x] Pressing Enter immediately after fuzzy feedback activates Mini practise spelling through native focused-button behavior.
- [x] Continue does not autofocus.
- [x] Selecting Mini practise spelling expands practice inside the same overlay.
- [x] No portal/modal/second overlay is opened for fuzzy mini practice.
- [x] Spelling input receives focus when practice opens.
- [x] Enter submits the spelling form.
- [x] The existing two-correct-in-a-row mini-practice rule remains.
- [x] After the first correct spelling, the input is cleared and refocused.
- [x] After mini-practice completion, Continue receives focus.
- [x] The underlying accepted fuzzy answer produces no duplicate evidence from mini practice.
- [x] Choosing Continue without practice transitions exactly once.
- [x] While mini practice is open, the visible `Spelling` and `You typed` comparison lines are hidden.
- [x] `Reveal spelling` occupies that comparison area and reveals the canonical spelling there.
- [x] The practice body has no `Back to choices` action; the visible Mini practise spelling action toggles back to the fuzzy choices.

### Drill Learn & Practise incorrect answers

- [x] Drill-launched non-recording Practice offers Mini practise spelling after an incorrect typed answer.
- [x] Drill-launched Learning Practice and Final Recall can offer the same transient mini spelling game.
- [x] Eligible incorrect feedback stays open for an explicit Mini practise spelling or Continue choice.
- [x] Continue preserves the incorrect result and advances exactly once.
- [x] Ordinary Drill, Today, and Recite incorrect-answer behavior remains unchanged.

### Incorrect and Recite

- [x] Ordinary incorrect feedback uses the rose/red glass treatment and shows the canonical correction where disclosure is permitted.
- [x] Ordinary incorrect feedback preserves the existing 1800 ms dwell and automatic transition.
- [x] Recite incorrect uses the same shell/tone but does not reveal the expected answer.
- [x] Recite incorrect returns to the same answerable prompt with input focus after the dwell.
- [x] Recite Reveal / Skip uses the common centered overlay and existing reveal dwell/transition semantics.

### Keyboard/accessibility

- [x] No fuzzy-specific global Enter listener is introduced.
- [x] Passive overlays do not steal focus.
- [x] Interactive fuzzy feedback has an appropriate accessible region/label and does not place an `aria-live` region around the entire interactive subtree.
- [x] Result copy is announced through concise polite status semantics without duplicate competing live regions.
- [x] Mini-practice feedback is polite-live and does not repeatedly announce static overlay copy.
- [x] Reduced-motion preference disables new feedback animations.
- [x] Focus does not escape to disabled underlying input controls during fuzzy remediation.

### Regression/scope

- [x] Change Spec 0017 answer timing, matching, evidence ownership, prompt reset, and exactly-once transitions remain unchanged except for feedback placement/fuzzy-remediation presentation.
- [x] Change Spec 0018 Today layout remains intact except that typed feedback/remediation is moved from the dock to the map overlay.
- [x] No workflow imports Drill internals to achieve the result.
- [x] No persistence, scheduling, mastery, geography, or evidence changes are introduced.
- [x] Focused typed-answer tests and the full World Countries feature suite pass.

## Source anchors

- `src/features/world-countries/ui/WorldCountriesTypedAnswer.tsx`
- `src/features/world-countries/ui/MiniSpellingPractice.tsx`
- `src/features/world-countries/ui/MapSurface.tsx`
- `src/features/world-countries/drill/DrillSession.tsx`
- `src/features/world-countries/today/TodayReviewSession.tsx`
- `src/features/world-countries/learning/flows/SchedulerPracticeStep.tsx`
- `src/features/world-countries/learning/flows/StagedFinalRecallStep.tsx`
- `src/features/world-countries/recite/WorldCountriesRecite.tsx`
- `src/core/ui/TypingInput.tsx`
- `src/core/ui/RecallFeedback.tsx`
- `src/app/index.css`

## Documentation impact

After implementation, update `docs/architecture/features/WORLD_COUNTRIES.md` so the current-state typed-answer rule reflects the implemented presentation contract:

- primary typed answer feedback is map-relative overlay presentation;
- the form dock owns answer entry, not duplicate result copy;
- fuzzy is the interactive feedback exception;
- fuzzy overlay owns Continue and mini spelling remediation;
- initial fuzzy focus targets Mini practise spelling;
- mini spelling practice is feature-local/transient and does not create evidence;
- exact/incorrect/revealed dwell and workflow ownership remain as already documented.

Change Spec 0017 and 0018 remain historical delivery records. Do not rewrite them to look as if this later decision was known when they were authored.

No ADR is required.

## Verification

Implemented and verified on 2026-08-21.

During implementation, use focused tests around the shared typed-answer seam, fuzzy spelling controls, and representative workflow consumers.

At minimum verify meaningful keyboard/state behavior for:

- Drill exact;
- Drill fuzzy -> initial Enter opens Mini practise;
- fuzzy practice -> input Enter -> first correct -> refocus input;
- fuzzy practice -> second correct -> focus Continue;
- fuzzy Continue without practice;
- Drill incorrect;
- Today exact/fuzzy/incorrect;
- Learning Practice or Final Recall representative exact/fuzzy/incorrect;
- Recite incorrect retry without disclosure;
- Recite Reveal / Skip;
- stale timer/focus cleanup on prompt replacement/unmount.

Near feature completion:

```text
npx vitest run src/features/world-countries
npm run typecheck
```

Automated verification completed:

- `npx vitest run --no-cache --no-file-parallelism src/features/world-countries`: 78 files, 323 tests passed;
- focused typed-answer, Drill, and Learning flow tests: 24 tests passed;
- `npm test -- --no-cache --no-file-parallelism`: 111 files, 521 tests passed;
- `npm run typecheck`: passed;
- `git diff --check`: passed.

The in-app browser was unavailable for this run, so manual visual verification was not performed. The implemented visual contract was reviewed against the normative styling and the focused interaction coverage.

Manual visual verification:

- desktop and below `xl`;
- exact overlay translucency and 500 ms feel;
- fuzzy overlay base state;
- fuzzy overlay expanded mini practice;
- incorrect overlay;
- long canonical answer wrapping;
- map remains legible through glass;
- form dock visually belongs to the same material family without competing with overlay;
- prefers-reduced-motion behavior.
