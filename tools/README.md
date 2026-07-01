# Maintenance Tools

This directory contains local and CI quality gates for Summit Spark.

## Core checks

| Tool | Purpose |
| --- | --- |
| `check-docs.js` | Verifies required documentation, templates, and process files. |
| `check-public-surface.js` | Verifies `index.html` / `summit-spark.html` consistency, build version, and public UI anchors. |
| `check-data-contracts.js` | Verifies room metadata, route lines, Style/Expert contracts, Route contracts, and Feel fixtures. |
| `export-room-data.js` | Exports the room/training data currently embedded in `summit-spark.js`. |
| `check-maps.js` | Validates map shape, tile usage, room structure, and pre-release map quality. |
| `check-route-audit.js` | Validates route and training semantics. |
| `check-training-state.js` | Validates training state transitions and persistence boundaries. |
| `check-browser-smoke.js` | Runs browser-level smoke coverage when Chrome/Edge is available. |

## Shared helpers

`tools/lib/read-summit-data.js` is the single shared reader for extracting room/training data from `summit-spark.js` during P2 migration.

Use this helper instead of duplicating parsing logic in new tools. Once the source of truth moves to `src/game` or `data`, update this helper first, then keep the callers stable.

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

## Policy

- Do not add new parsing logic for `summit-spark.js` in multiple scripts.
- Do not make browser smoke part of the default gate unless CI browser availability is guaranteed.
- Do not silently skip failed map, data, storage, or public-surface checks.
