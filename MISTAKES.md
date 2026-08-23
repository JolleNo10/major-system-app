# Map test fixtures

- Synthetic SVG map fixtures must wrap each Country path and its label in a separate parent element. `SvgMapController` deliberately ignores a wrapper containing multiple paths, so that markup cannot exercise Country interaction.

# Answer mode test fixtures

- Use the canonical `AnswerMode` values from `src/core/types.ts` (`multiple-choice` or `typing`) in component tests. A Today test initially used the informal value `typed`, which passed at runtime because that prop is currently unused there but failed repository typechecking.
