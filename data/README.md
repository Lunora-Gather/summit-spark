# data

This directory contains generated or extracted data snapshots during the P2 room-data extraction work.

`data/rooms.generated.json` is a generated snapshot exported from `summit-spark.js`. The current runtime still reads room data from `summit-spark.js`, but maintenance checks and reports prefer the generated snapshot when it exists.

## Current flow

1. Run `node tools/export-room-data.js --write` to refresh `data/rooms.generated.json` from `summit-spark.js`.
2. Review the generated snapshot diff.
3. Run `node tools/export-room-data.js --check` to confirm the snapshot is synchronized with `summit-spark.js`.
4. Run `node tools/check-data-contracts.js` to validate the preferred room-data source.
5. Run `node tools/report-room-data.js` when a readable summary is needed.

## Policy

- Do not edit `data/rooms.generated.json` by hand unless the extraction plan explicitly changes.
- Do not treat the snapshot as the runtime source of truth until a dedicated extraction PR changes the runtime path.
- Keep `summit-spark.js` and `data/rooms.generated.json` synchronized while the migration is in progress.
- Use `tools/lib/read-summit-data.js` for source loading, snapshot loading, and future source-of-truth transitions.
