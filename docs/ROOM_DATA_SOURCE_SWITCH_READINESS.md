# Room Data Source Switch Readiness

This document defines the gate that must pass before any PR changes gameplay runtime to read room data from a source other than the embedded constants in `summit-spark.js`.

## Current state

Runtime still reads room data from `summit-spark.js`.

The generated snapshot, runtime-view helper, and legacy-constants helper are staging tools. They are not a runtime source switch.

## Required automated checks

Before a source-switch PR is opened, these checks must pass:

```bash
node tools/export-room-data.js --check
node tools/check-data-contracts.js
node tools/check-maps.js
node tools/check-route-audit.js
node tools/check-room-data-migration.js
node tools/check-room-data-adapter-plan.js
node tools/check-room-data-runtime-view.js
node tools/check-room-data-legacy-constants.js
node tools/check-room-data-source-switch-readiness.js
node tools/check-room-data-source-switch-playtest-template.js
npm run check
```

`npm run browser-smoke` should be run locally when Chrome or Edge is available. It should not become a hard CI gate unless CI browser availability is guaranteed.

## Required manual checks

A runtime source-switch PR must record the manual notes from `docs/ROOM_DATA_SOURCE_SWITCH_PLAYTEST.md`:

- R1-R10 route sanity pass.
- At least one keyboard pass.
- Practice panel pass covering drills, routes, and Feel Lab.
- Settings open/save/reset pass.
- Save export/import round trip.
- Narrow viewport or mobile-control pass.

## Source-switch PR boundaries

The source-switch PR must not include unrelated gameplay or content changes.

Allowed:

- Runtime call site changes needed to read the staged room-data source.
- Compatibility glue that preserves current constant meanings.
- Docs and checks that prove the switch is intentional.

Not allowed in the same PR:

- Physics tuning.
- Map layout changes.
- New rooms or mechanics.
- Save schema migration.
- UI redesign.
- Bundler or module-system migration.
- Async loading path unless separately designed and reviewed.

## Rollback plan

The source-switch PR must keep rollback simple:

1. Revert the source-switch PR.
2. Confirm runtime again reads embedded `summit-spark.js` constants.
3. Run data, map, route, state, and smoke checks.
4. Record the rollback reason in the PR or follow-up issue.

## Merge readiness checklist

- [ ] Generated snapshot is synchronized with `summit-spark.js` or intentionally replaced.
- [ ] Runtime adapter helpers are already merged.
- [ ] Legacy constant compatibility mapping is already merged.
- [ ] Public surface is unchanged unless explicitly reviewed.
- [ ] Save schema is unchanged unless separately reviewed.
- [ ] Automated checks listed above pass.
- [ ] Manual R1-R10 and UI checks are recorded using `docs/ROOM_DATA_SOURCE_SWITCH_PLAYTEST.md`.
- [ ] Rollback path is documented in the PR body.
