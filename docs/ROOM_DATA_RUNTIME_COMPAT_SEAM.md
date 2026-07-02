# Room Data Runtime Compatibility Seam

This document defines the compatibility seam shape that can be inserted near the current room-data constants in a later PR.

## Goal

Prepare a runtime-facing seam that keeps the existing embedded `summit-spark.js` constants as the source of truth while exposing the normalized room-data view shape used by the staging tools.

This PR does not insert the seam into `summit-spark.js`. It only documents and verifies the seam fixture.

## Proposed seam fields

The later runtime PR should expose these normalized fields from the current embedded constants:

- `roomCount`
- `maps`
- `roomTargets`
- `roomNames`
- `roomTiers`
- `roomSkills`
- `skillLabels`
- `roomGuides`
- `roomPurposes`
- `roomRouteLines`
- `roomStyleTrials`
- `expertRequirements`
- `expertRequirementLabels`
- `routeContracts`
- `feelReplayFixtures`

The seam should map those fields back to the current constant names documented in `docs/ROOM_DATA_RUNTIME_ADAPTER.md`.

## Required behavior

- The seam reads from existing embedded constants only.
- The seam does not change the runtime data source.
- The seam does not change maps, room count, physics, collision, input, save schema, or public HTML/CSS.
- The seam should be easy to revert with one PR revert.

## Validation

The seam fixture is validated by:

```bash
node tools/check-room-data-runtime-compat-seam.js
```

That check verifies the documented field mapping against the current preferred snapshot and legacy constant compatibility helpers.

## Next step

After this fixture lands, the next PR can add a tiny compatibility helper near the current room-data constants in `summit-spark.js`, still without switching to a new data source.
