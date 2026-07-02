# Maintenance Tools

This directory contains local and CI quality gates for Summit Spark.

## Core checks

| Tool | Purpose |
| --- | --- |
| `check-docs.js` | Verifies required documentation, templates, and process files. |
| `check-public-surface.js` | Verifies `index.html` / `summit-spark.html` consistency, build version, and public UI anchors. |
| `check-maintenance-tools.js` | Verifies maintenance tool syntax, prevents duplicated parsing/validation logic, and delegates to the room-data tool registry. |
| `check-room-data-migration.js` | Verifies the staged room-data migration plan, generated snapshot, and current runtime source boundary. |
| `check-room-data-adapter-plan.js` | Verifies the documented runtime-adapter boundary stays explicit before implementation. |
| `check-room-data-runtime-view.js` | Verifies the pure room-data runtime view helper preserves all adapter fields without side effects. |
| `check-room-data-legacy-constants.js` | Verifies the legacy runtime constant mapping preserves current names without switching data source. |
| `check-room-data-source-switch-readiness.js` | Verifies the source-switch gate, manual test requirements, rollback path, and unchanged current runtime source. |
| `check-room-data-source-switch-playtest-template.js` | Verifies the source-switch manual playtest template covers R1-R10, UI, save, and rollback notes. |
| `check-room-data-runtime-callsite-plan.js` | Verifies the runtime-facing call-site staging plan without switching the data source. |
| `check-room-data-runtime-compat-seam.js` | Verifies the runtime compatibility seam fixture against embedded constants and adapter helpers. |
| `check-room-data-seam-insertion-guide.js` | Verifies the review procedure for the future runtime seam insertion PR. |
| `check-room-data-seam-preflight.js` | Verifies stable runtime anchors before attempting the seam insertion. |
| `insert-room-data-runtime-seam.js` | Dry-runs or applies the tiny embedded runtime seam insertion. |
| `check-room-data-p2-status.js` | Verifies the P2 migration status dashboard and next-step boundaries stay aligned. |
| `check-room-data-tool-registry.js` | Verifies room-data tools and helpers are registered in CI and this README. |
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

Verify source-switch readiness before a runtime-source PR:

```bash
node tools/check-room-data-source-switch-readiness.js
```

Verify source-switch manual playtest template:

```bash
node tools/check-room-data-source-switch-playtest-template.js
```

Verify runtime call-site staging plan:

```bash
node tools/check-room-data-runtime-callsite-plan.js
```

Verify runtime compatibility seam fixture:

```bash
node tools/check-room-data-runtime-compat-seam.js
```

Verify runtime seam insertion guide:

```bash
node tools/check-room-data-seam-insertion-guide.js
```

Verify runtime seam preflight:

```bash
node tools/check-room-data-seam-preflight.js
```

Dry-run runtime seam insertion:

```bash
node tools/insert-room-data-runtime-seam.js --check
```

Apply runtime seam insertion locally:

```bash
node tools/insert-room-data-runtime-seam.js --write
```

Verify P2 migration status:

```bash
node tools/check-room-data-p2-status.js
```

Verify room-data tool registration:

```bash
node tools/check-room-data-tool-registry.js
```

Print a readable room data report:

```bash
node tools/report-room-data.js
```

Check maintenance tool syntax and guardrails:

```bash
node tools/check-maintenance-tools.js
```

`check-maintenance-tools.js` also delegates to `check-room-data-tool-registry.js`, so the umbrella check fails if room-data tools fall out of CI or documentation registration.

## CI

The `Maintenance Tools` workflow runs room-data migration, adapter-plan, runtime-view, legacy-constants, source-switch-readiness, source-switch-playtest-template, runtime-callsite-plan, runtime-compat-seam, seam-insertion-guide, seam-preflight, seam-insertion-dry-run, P2-status, tool-registry, and maintenance-tool checks on pull requests and manually via `workflow_dispatch`.

## Policy

- Do not add new parsing logic for `summit-spark.js` in multiple scripts.
- Do not duplicate room/training data validation rules across multiple scripts.
- Do not duplicate the room-data runtime adapter field list across unrelated tools.
- Do not duplicate legacy constant mapping logic outside `tools/lib/room-data-legacy-constants.js`.
- Do not add room-data migration tools without registering them in `tools/check-room-data-tool-registry.js`, this README, and the Maintenance Tools workflow.
- Do not switch the runtime source until source-switch readiness and manual R1-R10 checks are recorded.
- Do not add a runtime-facing call site until the call-site staging plan is documented and passing.
- Do not add the runtime compatibility seam until its fixture check, seam insertion guide, seam preflight, and insertion dry run are passing.
- Do not merge a runtime source-switch PR without filling `docs/ROOM_DATA_SOURCE_SWITCH_PLAYTEST.md` in the PR body or comments.
- Keep `docs/ROOM_DATA_P2_STATUS.md` aligned with the current migration state before starting source-switch work.
- Do not make checks and reports source-only once a generated snapshot exists; use the preferred read path.
- Keep runtime hook guards explicit when a tool still needs to verify `summit-spark.js` wiring.
- Do not make browser smoke part of the default gate unless CI browser availability is guaranteed.
- Do not silently skip failed map, data, storage, or public-surface checks.
