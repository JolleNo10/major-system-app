# Map test fixtures

- Synthetic SVG map fixtures must wrap each Country path and its label in a separate parent element. `SvgMapController` deliberately ignores a wrapper containing multiple paths, so that markup cannot exercise Country interaction.
