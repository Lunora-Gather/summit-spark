# Room Data Migration Plan

This document tracks the P2 migration from embedded room data in `summit-spark.js` toward a clearer room-data source. It is intentionally staged so gameplay behavior stays stable.

## Current source of truth

Runtime still reads room maps, room metadata, route contracts, Style trials, Expert requirements, and Feel Lab fixtures from `summit-spark.js`.

`data/rooms.generated.json` is a generated staging snapshot. It is useful for validation and future extraction work, but it is not yet the runtime source of truth.

## Guardrails

- Do not change physics, collision, input, save schema, room count, map layout, or public HTML/CSS while moving the data boundary.
- Keep `node tools/export-room-data.js --check` passing so the generated snapshot stays synchronized with `summit-spark.js`.
- Keep `node tools/check-data-contracts.js`, `node tools/check-maps.js`, and `node tools/check-route-audit.js` passing against the preferred room-data source.
- Keep `tools/lib/read-summit-data.js` as the only script that parses embedded data from `summit-spark.js`.
- Keep `tools/lib/validate-room-data.js` as the shared validator instead of duplicating validation rules.

## Migration phases

### Phase 0: Snapshot staging

Status: active.

- Generate `data/rooms.generated.json` from `summit-spark.js`.
- Validate the generated snapshot through existing data, map, and route checks.
- Document that runtime behavior remains unchanged.

### Phase 1: Preferred-source checks

Status: active.

- Checks and reports use `loadRoomDataSnapshot()` so they can read the generated snapshot when present.
- Export still uses the source-only path so it can verify snapshot drift against `summit-spark.js`.
- `tools/check-room-data-migration.js` verifies this split stays intentional.

### Phase 2: Runtime adapter design

Status: planned.

- Design a tiny runtime adapter before changing how the game loads data.
- Keep all existing constant names or provide a compatibility layer.
- Avoid module/bundler migration in the same PR.

### Phase 3: Runtime source switch

Status: planned.

- Switch runtime data loading only after Phase 2 has a reviewed adapter.
- Preserve `index.html` and `summit-spark.html` public surface.
- Run smoke, route audit, state check, and manual R1-R10 playtest notes.

### Phase 4: Cleanup

Status: planned.

- Remove duplicate embedded data only after runtime and checks are stable.
- Update docs, issue checklists, and release notes.
- Keep the rollback path simple: restoring `summit-spark.js` as source must be possible from one revert.

## Acceptance checklist for issue #2

- [ ] Canonical room-data source is documented.
- [ ] Generated snapshot is synchronized with `summit-spark.js` or intentionally replaced.
- [ ] Existing room-data checks pass.
- [ ] Runtime smoke checks pass.
- [ ] Manual R1-R10 route sanity pass is recorded before new content work.
