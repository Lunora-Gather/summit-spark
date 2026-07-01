# Maintenance Tools

This directory contains local and CI quality gates for Summit Spark.

## Core checks

| Tool | Purpose |
| --- | --- |
| `check-docs.js` | Verifies required documentation, templates, and process files. |
| `check-public-surface.js` | Verifies `index.html` / `summit-spark.html` consistency, build version, and public UI anchors. |
| `check-maintenance-tools.js` | Verifies maintenance tool syntax and prevents duplicated parsing/validation logic. |
| `check-data-contracts.js` | Verifies room metadata, route lines, Style/Expert contracts, Route contracts, and Feel fixtures from the preferred room-data source. |
| `check-maps.js` | Validates map shape, tile usage, room structure, and pre-release map quality from the preferred room-data source. |
| `export-room-data.js` | Exports the room/training data currently embedded in `summit-spark.js`. |
| `report-room-data.js` | Prints a human-readable room data summary and validation result from the preferred room-data source. |
| `check-route-audit.js` | Validates route and training semantics. |
| `check-training-state.js` | Validates training state transitions and persistence boundaries. |
| `check-browser-smoke.js` | Runs browser-level smoke coverage when Chrome/Edge is available. |

## Shared helpers

`tools/lib/read-summit-data.js` is the single shared reader for extracting room/training data from `summit-spark.js` during P2 migration.

It exposes two intentionally different paths:

- Source-only export path: `buildRoomDataSnapshot()` / `buildRoomDataSnapshotFromSource()` reads `summit-spark.js`. Use this for generating `data/rooms.generated.json`.
- Preferred read path: `loadRoomDataSnapshot()` reads `data/rooms.generated.json` when it exists, otherwise falls back to `summit-spark.js`. Use this for checks and reports.

`tools/lib/validate-room-data.js` is the shared validator for room/training data contracts. Use it from reporting, checking, and migration tools instead of duplicating validation rules.

Use these helpers instead of duplicating parsing or validation logic in new tools. Once the source of truth moves to `src/game` or `data`, update the shared helpers first, then keep the callers stable.

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

Print a readable room data report:

```bash
node tools/report-room-data.js
```

Check maintenance tool syntax and guardrails:

```bash
node tools/check-maintenance-tools.js
```

## CI

The `Maintenance Tools` workflow runs `node tools/check-maintenance-tools.js` on pull requests and manually via `workflow_dispatch`.

## Policy

- Do not add new parsing logic for `summit-spark.js` in multiple scripts.
- Do not duplicate room/training data validation rules across multiple scripts.
- Do not make checks and reports source-only once a generated snapshot exists; use the preferred read path.
- Do not make browser smoke part of the default gate unless CI browser availability is guaranteed.
- Do not silently skip failed map, data, storage, or public-surface checks.
