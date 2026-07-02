# Room Data Runtime Call-Site Plan

This document defines the final staging step before any PR changes the actual room-data source used by gameplay runtime.

## Goal

Prepare a tiny runtime-facing compatibility call site near the existing room-data constants while still preserving the current embedded `summit-spark.js` source of truth.

The call-site step should prove that runtime code can reference an adapter boundary without changing gameplay data, loading behavior, or public surface.

## Current boundary

Runtime still reads the embedded constants in `summit-spark.js`:

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

The staged helpers in `tools/lib/room-data-runtime-view.js` and `tools/lib/room-data-legacy-constants.js` are not currently imported or used by gameplay runtime.

## Allowed call-site PR

A future call-site PR may add a small compatibility block near the current runtime constants, but it must not switch the source of truth.

Allowed:

- A clearly named compatibility view around the current embedded constants.
- Comments that mark the adapter seam for the later source switch.
- Tooling that verifies legacy names still point to the same values.

Not allowed:

- Reading room data from `data/rooms.generated.json` in runtime.
- Adding async loading for room data.
- Introducing a bundler or module-system migration.
- Changing map data, room count, physics, collision, input, save schema, or public HTML/CSS.
- Removing embedded constants from `summit-spark.js`.

## Required checks before call-site PR merge

```bash
node tools/check-room-data-runtime-callsite-plan.js
node tools/check-room-data-source-switch-readiness.js
node tools/check-room-data-tool-registry.js
node tools/check-maintenance-tools.js
npm run check
```

Browser smoke and manual R1-R10 notes are still required before the actual source-switch PR, not necessarily for the call-site staging PR.

## Review checklist

- [ ] Runtime source still remains embedded `summit-spark.js` constants.
- [ ] Any runtime-facing seam preserves current constant values.
- [ ] No source switch is included.
- [ ] No unrelated gameplay/content/UI/save changes are included.
- [ ] Rollback remains one PR revert.
