# Room Data Auto Seam Workflow

This document explains the one-shot workflow that generates the tiny runtime compatibility seam PR without requiring a manual Actions click.

## Workflow

```text
Auto Apply Room Data Runtime Seam
```

It runs automatically only when `.github/workflows/auto-apply-room-data-runtime-seam.yml` is merged to `main`. It can also be run manually with `workflow_dispatch`.

## Idempotence

The workflow exits without changes when either condition is true:

- `summit-spark.js` already contains `createRoomDataRuntimeViewFromEmbeddedConstants()`.
- An open PR already exists from `room-data-runtime-seam-auto`.

## Generated PR boundary

The generated PR should only modify `summit-spark.js` by inserting `createRoomDataRuntimeViewFromEmbeddedConstants()` near the embedded room-data constants.

It must not:

- Replace gameplay reads.
- Switch the runtime data source.
- Change physics constants.
- Change save schema.
- Change HTML/CSS.
- Add module, bundler, or async loading behavior.

## Checks before PR creation

The workflow runs:

```bash
node tools/check-room-data-runtime-seam-patch-apply.js
node --check summit-spark.js
node tools/check-room-data-runtime-compat-seam.js
node tools/check-room-data-seam-preflight.js
node tools/check-room-data-p2-status.js
npm run check
```

## After the generated PR lands

Update `docs/ROOM_DATA_P2_STATUS.md` to record that the runtime compatibility seam has been inserted and reviewed. The actual runtime source switch remains blocked until manual playtest notes are recorded.
