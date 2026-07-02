# core

Target home for runtime-neutral helpers extracted from `summit-spark.js`.

Move code here only when it is pure or close to pure:

- dimensions and timing constants after a dedicated constants extraction PR
- `clamp`, `lerp`, vector helpers, rectangle helpers
- time formatting and split delta formatting
- small state transition helpers with no DOM, Canvas, localStorage, or audio side effects

Do not move physics or input behavior here unless the PR clearly documents the gameplay impact.
