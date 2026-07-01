# data

This directory is reserved for generated or extracted data snapshots during the P2 room-data extraction work.

The current runtime still reads room data from `summit-spark.js`. Do not edit generated data by hand unless the extraction plan explicitly changes.

Planned flow:

1. Run `node tools/export-room-data.js --write` to export a snapshot from `summit-spark.js`.
2. Review the generated `data/rooms.generated.json` diff.
3. Keep `tools/check-data-contracts.js` passing.
4. In a later PR, update checks and runtime code to prefer the extracted source.

Generated snapshots are useful for review and migration, but the source of truth remains `summit-spark.js` until a dedicated extraction PR changes it.
