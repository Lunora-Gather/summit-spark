# Room Data Runtime Adapter Design

This document defines the Phase 2 adapter boundary for moving room data out of `summit-spark.js` without changing runtime behavior in the same step.

## Goal

Create a compatibility boundary before any runtime source switch. The first adapter PR should make the intended interface obvious, reviewable, and testable while keeping the current game behavior unchanged.

## Current runtime contract

The game currently expects room data through embedded constants in `summit-spark.js`:

- `maps`
- `ROOM_TARGETS`
- `ROOM_NAMES`
- `ROOM_TIERS`
- `ROOM_SKILLS`
- `SKILL_LABELS`
- `ROOM_GUIDES`
- `ROOM_PURPOSES`
- `ROOM_ROUTE_LINES`
- `ROOM_STYLE_TRIALS`
- `EXPERT_REQUIREMENTS`
- `EXPERT_REQUIREMENT_LABELS`
- `ROUTE_CONTRACTS`
- `FEEL_REPLAY_FIXTURES`

The adapter must preserve those meanings exactly until the runtime source switch is deliberately reviewed.

## Proposed adapter shape

A future runtime adapter should expose one normalized room-data object with these fields:

- `roomCount`
- `maps`
- `roomTargets`
- `roomNames`
- `roomTiers`
- `roomSkills`
- `skillLabels`
- `roomGuides`
- `roomPurposes`
- `roomRouteLines`
- `roomStyleTrials`
- `expertRequirements`
- `expertRequirementLabels`
- `routeContracts`
- `feelReplayFixtures`

For compatibility, runtime code can then map those normalized names back to the current constant names or read them through a small accessor layer.

## Staged helpers

`tools/lib/room-data-runtime-view.js` provides a pure, unused helper for the planned adapter shape:

```js
createRoomDataRuntimeView(snapshot)
```

The helper only projects a validated room-data snapshot into the documented runtime-view fields. It does not read DOM state, localStorage, canvas, audio, timers, input state, or `summit-spark.js` directly.

`tools/lib/room-data-legacy-constants.js` provides a pure legacy compatibility mapping:

```js
createLegacyRoomDataConstants(snapshotOrView)
```

This maps the normalized runtime-view fields back to the current runtime constant names such as `ROOM_TARGETS`, `ROOM_NAMES`, `ROUTE_CONTRACTS`, and `FEEL_REPLAY_FIXTURES`. It is still not wired into gameplay runtime.

The helpers are validated by:

```bash
node tools/check-room-data-runtime-view.js
node tools/check-room-data-legacy-constants.js
```

## Constraints

- No module or bundler migration in the same PR as the adapter.
- No async loading path for the first adapter.
- No gameplay tuning, map edits, or physics changes.
- No save schema changes.
- No public HTML/CSS changes unless a later runtime-source PR explicitly requires it.
- Keep rollback simple: one revert should restore the old embedded-source path.

## Next implementation step

The next code PR may introduce a tiny runtime-facing compatibility call site near the existing constants, but it should still avoid switching the actual source of truth until checks and review are in place.

## Review checklist

- [ ] The adapter keeps every current room-data field available.
- [ ] Legacy constants are mapped from the normalized runtime view without duplicating parsing logic.
- [ ] Existing checks continue to validate the generated snapshot and preferred loader path.
- [ ] Runtime still reads the old embedded constants until a separate source-switch PR.
- [ ] No gameplay, physics, save, or public-surface behavior changes are included.
- [ ] A manual R1-R10 sanity pass is planned before new content work.
