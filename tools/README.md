# Maintenance Tools

This directory contains local and CI quality gates for Summit Spark.

## Core checks

| Tool | Purpose |
| --- | --- |
| `check-docs.js` | Verifies required documentation, templates, and process files. |
| `check-public-surface.js` | Verifies `index.html` / `summit-spark.html` consistency, build version, and public UI anchors. |
| `check-maintenance-tools.js` | Verifies maintenance tool syntax and prevents duplicated parsing/validation logic. |
| `check-room-data-migration.js` | Verifies the staged room-data migration plan, generated snapshot, and current runtime source boundary. |
| `check-room-data-adapter-plan.js` | Verifies the documented runtime-adapter boundary stays explicit before implementation. |
| `check-room-data-runtime-view.js` | Verifies the pure room-data runtime view helper preserves all adapter fields without side effects. |
| `check-room-data-legacy-constants.js` | Verifies the legacy runtime constant mapping preserves current names without switching data source. |
| `check-data-contracts.js` | Verifies room metadata, route lines, Style/Expert contracts, Route contracts, and Feel fixtures from the preferred room-data source. |
| `check-maps.js` | Validates map shape, tile usage, room structure, and pre-release map quality from the preferred room-data source. |
| `check-route-audit.js` | Validates route/training semantics from the preferred room-data source while keeping runtime hook guards against `summit-spark.js`. |
| `export-room-data.js` | Exports the room/training data currently embedded in `summit-spark.js`. |
| `report-room-data.js` | Prints a human-readable room data summary and validation result from the preferred room-data source. |
| `check-training-state.js` | Validates training state transitions and persistence boundaries. |
| `check-browser-smoke.js` | Runs browser-level smoke coverage when Chrome/Edge is available. |

## Shared helpers

`tools/lib/read-summit-data.js` is the single shared reader for extracting room/training data from `summit-spark.js` during P2 migration.

It exposes two intentionally different paths:

- Source-only export path: `buildRoomDataSnapshot()` / `buildRoomDataSnapshotFromSource()` reads `summit-spark.js`. Use this for generating `data/rooms.generated.json`.
- Preferred read path: `loadRoomDataSnapshot()` reads `data/rooms.generated.json` when it exists, otherwise falls back to `summit-spark.js`. Use this for checks and reports.

`tools/lib/validate-room-data.js` is the shared validator for room/training data contracts. Use it from reporting, checking, and migration tools instead of duplicating validation rules.

`tools/lib/room-data-runtime-view.js` is a pure helper that converts a validated snapshot into the planned runtime adapter shape. It is intentionally not wired into gameplay runtime yet.

`tools/lib/room-data-legacy-constants.js` maps the normalized runtime view back to the current legacy constant names used by `summit-spark.js`. It is also a staging helper and should remain side-effect free.

Use these helpers instead of duplicating parsing, validation, adapter-shape, or legacy-constant mapping logic in new tools. Once the source of truth moves to `src/game` or `data`, update the shared helpers first, then keep the callers stable.

## Data migration commands

Preview generated JSON:

```bash
node tools/export-room-data.js
```

Write generated snapshot:

```bash
node tools/export-room-data.js --write
```

Check generated snapshot or export path:

```bash
node tools/export-room-data.js --check
```

Validate data contracts:

```bash
node tools/check-data-contracts.js
```

Validate maps from the preferred source:

```bash
node tools/check-maps.js
```

Audit route/training semantics from the preferred source:

```bash
node tools/check-route-audit.js
```

Verify room-data migration guardrails:

```bash
node tools/check-room-data-migration.js
```

Verify runtime-adapter plan:

```bash
node tools/check-room-data-adapter-plan.js
```

Verify pure runtime-view helper:

```bash
node tools/check-room-data-runtime-view.js
```

Verify legacy constants compatibility:

```bash
node tools/check-room-data-legacy-constants.js
```

Print a readable room data report:

```bash
node tools/report-room-data.js
```

Check maintenance tool syntax and guardrails:

```bash
node tools/check-maintenance-tools.js
```

## CI

The `Maintenance Tools` workflow runs room-data migration, adapter-plan, runtime-view, legacy-constants, and maintenance-tool checks on pull requests and manually via `workflow_dispatch`.

## Policy

- Do not add new parsing logic for `summit-spark.js` in multiple scripts.
- Do not duplicate room/training data validation rules across multiple scripts.
- Do not duplicate the room-data runtime adapter field list across unrelated tools.
- Do not duplicate legacy constant mapping logic outside `tools/lib/room-data-legacy-constants.js`.
- Do not make checks and reports source-only once a generated snapshot exists; use the preferred read path.
- Keep runtime hook guards explicit when a tool still needs to verify `summit-spark.js` wiring.
- Do not make browser smoke part of the default gate unless CI browser availability is guaranteed.
- Do not silently skip failed map, data, storage, or public-surface checks.
