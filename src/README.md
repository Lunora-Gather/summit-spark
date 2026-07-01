# Source Module Scaffold

This directory is the target home for incremental extraction from `summit-spark.js`.

The runtime still uses the existing static HTML/CSS/JS surface. Files in this directory are introduced as a scaffold and migration target first, so extraction can happen in small, testable PRs.

## Rules

- Do not move gameplay logic here without a focused PR and matching quality gates.
- Keep `index.html` and `summit-spark.html` runnable during every step.
- Prefer data and pure functions before input, storage, UI, physics, or rendering.
- Do not introduce a bundler until an architecture decision explicitly approves it.

## Planned layout

```text
src/
├─ core/       # constants, pure math, format helpers, loop utilities
├─ game/       # rooms, player state, progression, physics boundaries
├─ systems/    # input, storage, audio, diagnostics
├─ training/   # Focus, Drill, Route, Feel Lab
├─ ui/         # DOM, HUD, settings panel, practice panel
└─ render/     # canvas drawing and visual feedback
```

See `docs/ARCHITECTURE.md` and `docs/REFACTORING_GUIDE.md` before moving code.
