# Room Data Runtime Seam Workflow

This document explains how to use the manual workflow that creates the tiny runtime compatibility seam PR.

## Workflow

Use GitHub Actions workflow:

```text
Apply Room Data Runtime Seam
```

The workflow is manual only. It runs on `workflow_dispatch` and does not execute automatically on pull requests or pushes.

## What it does

When triggered, the workflow:

1. Checks out the repository.
2. Verifies `patches/room-data-runtime-seam.patch` applies cleanly.
3. Applies the patch to `summit-spark.js`.
4. Runs `node --check summit-spark.js`.
5. Runs the room-data guard checks and `npm run check`.
6. Pushes a generated branch.
7. Opens a pull request that only contains the runtime seam insertion.

## Safety boundary

The generated PR should only insert `createRoomDataRuntimeViewFromEmbeddedConstants()` near the embedded room-data constants.

It must not:

- Replace existing gameplay reads.
- Switch the runtime room-data source.
- Change physics constants.
- Change save schema.
- Change HTML/CSS.
- Add module, bundler, or async loading behavior.

## After the generated PR lands

Update `docs/ROOM_DATA_P2_STATUS.md` to say that the runtime compatibility seam has been inserted and reviewed, while the actual runtime source switch remains blocked until manual playtest notes are recorded.
