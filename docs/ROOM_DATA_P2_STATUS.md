# Room Data P2 Migration Status

This document summarizes the current state of issue #2 after the staged room-data migration guardrails landed.

## Current runtime source

Runtime still reads room maps, room metadata, route contracts, Style trials, Expert requirements, and Feel Lab fixtures from embedded constants in `summit-spark.js`.

`data/rooms.generated.json` remains a generated staging snapshot and validation input. It is not the gameplay runtime source yet.

## Completed staging gates

- Migration plan and guard: `docs/ROOM_DATA_MIGRATION.md`, `tools/check-room-data-migration.js`.
- Runtime adapter boundary: `docs/ROOM_DATA_RUNTIME_ADAPTER.md`, `tools/check-room-data-adapter-plan.js`.
- Pure runtime view helper: `tools/lib/room-data-runtime-view.js`, `tools/check-room-data-runtime-view.js`.
- Legacy constants compatibility helper: `tools/lib/room-data-legacy-constants.js`, `tools/check-room-data-legacy-constants.js`.
- Source-switch readiness gate: `docs/ROOM_DATA_SOURCE_SWITCH_READINESS.md`, `tools/check-room-data-source-switch-readiness.js`.
- Runtime call-site staging plan: `docs/ROOM_DATA_RUNTIME_CALLSITE_PLAN.md`, `tools/check-room-data-runtime-callsite-plan.js`.
- Runtime compatibility seam fixture: `docs/ROOM_DATA_RUNTIME_COMPAT_SEAM.md`, `tools/check-room-data-runtime-compat-seam.js`.
- Seam insertion guide and preflight: `docs/ROOM_DATA_SEAM_INSERTION_GUIDE.md`, `tools/check-room-data-seam-insertion-guide.js`, `tools/check-room-data-seam-preflight.js`.
- Controlled seam insertion tool: `tools/insert-room-data-runtime-seam.js`.
- Checked runtime seam patch and apply gate: `patches/room-data-runtime-seam.patch`, `tools/check-room-data-runtime-seam-patch.js`, `tools/check-room-data-runtime-seam-patch-apply.js`.
- Manual runtime seam PR workflow: `.github/workflows/apply-room-data-runtime-seam.yml`, `docs/ROOM_DATA_RUNTIME_SEAM_WORKFLOW.md`.
- Source-switch playtest template: `docs/ROOM_DATA_SOURCE_SWITCH_PLAYTEST.md`, `tools/check-room-data-source-switch-playtest-template.js`.
- Tool registry and umbrella guard: `tools/check-room-data-tool-registry.js`, `tools/check-maintenance-tools.js`.

## Required gates before source switch

- `node tools/export-room-data.js --check`
- `node tools/check-data-contracts.js`
- `node tools/check-maps.js`
- `node tools/check-route-audit.js`
- `node tools/check-room-data-migration.js`
- `node tools/check-room-data-adapter-plan.js`
- `node tools/check-room-data-runtime-view.js`
- `node tools/check-room-data-legacy-constants.js`
- `node tools/check-room-data-source-switch-readiness.js`
- `node tools/check-room-data-source-switch-playtest-template.js`
- `node tools/check-room-data-runtime-callsite-plan.js`
- `node tools/check-room-data-runtime-compat-seam.js`
- `node tools/check-room-data-seam-insertion-guide.js`
- `node tools/check-room-data-seam-preflight.js`
- `node tools/insert-room-data-runtime-seam.js --check`
- `node tools/check-room-data-runtime-seam-patch.js`
- `node tools/check-room-data-runtime-seam-patch-apply.js`
- `node tools/check-room-data-tool-registry.js`
- `node tools/check-maintenance-tools.js`
- `npm run check`

## Next safe implementation step

Run the manual GitHub Actions workflow:

```text
Apply Room Data Runtime Seam
```

That workflow applies `patches/room-data-runtime-seam.patch`, runs the required syntax and room-data checks, then opens a generated PR that should only modify `summit-spark.js` by inserting `createRoomDataRuntimeViewFromEmbeddedConstants()` near the embedded room-data constants.

The generated PR must keep existing gameplay reads unchanged and preserve the embedded source of truth.

## Still blocked

A runtime source switch is still blocked until:

- The runtime compatibility seam is inserted and reviewed.
- The source-switch playtest template is filled in a PR body or comment.
- R1-R10 route sanity and UI/save checks are recorded.
- Rollback notes are recorded.
- Public surface and save schema changes remain intentionally reviewed or unchanged.

## Status summary

P2 is ready for a generated tiny runtime compatibility seam insertion PR via the manual workflow. It is not ready for the actual runtime source switch yet.
