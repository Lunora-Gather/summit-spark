# Room Data Seam Insertion Guide

This guide defines the exact review procedure for the next PR that touches `summit-spark.js` to add the runtime compatibility seam.

## Purpose

The next runtime-facing PR should be tiny. It may add a compatibility helper near the embedded room-data constants, but it must not change gameplay reads, map content, save behavior, public HTML/CSS, or the runtime data source.

## Files expected in the seam PR

Allowed files:

- `summit-spark.js`
- `docs/ROOM_DATA_P2_STATUS.md`
- `docs/ROOM_DATA_RUNTIME_COMPAT_SEAM.md`
- `tools/check-room-data-runtime-compat-seam.js`
- `tools/check-room-data-p2-status.js`

Any other file should be justified in the PR body.

## Required PR body notes

The PR body must include:

- Room Data / Source Impact section from the PR template.
- Confirmation that runtime still reads embedded constants.
- Confirmation that the compatibility seam is not a source switch.
- Rollback note: one revert restores the previous runtime path.

## Required checks

Before merging the seam PR, run:

```bash
npm run check
node tools/check-room-data-p2-status.js
node tools/check-room-data-runtime-compat-seam.js
node tools/check-room-data-source-switch-readiness.js
node tools/check-room-data-tool-registry.js
```

## Review checklist

- [ ] The diff in `summit-spark.js` is small and localized near room-data constants.
- [ ] Existing embedded room-data constants remain in place.
- [ ] Existing gameplay reads are not replaced in the same PR.
- [ ] The helper exposes the normalized seam fields documented in `docs/ROOM_DATA_RUNTIME_COMPAT_SEAM.md`.
- [ ] No map strings, room metadata, physics constants, save keys, or public HTML/CSS changed.
- [ ] Source-switch playtest template is not required yet because the gameplay source is unchanged.

## After merge

After the seam PR lands, update `docs/ROOM_DATA_P2_STATUS.md` so the dashboard says the runtime compatibility seam is inserted and the next blocked step is the actual source switch.
