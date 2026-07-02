# Room Data Source Switch Playtest Template

Use this template in the pull request body or a PR comment before merging any PR that changes the gameplay runtime room-data source.

## Build and checks

- Commit under test:
- Browser and OS:
- `npm run check`:
- `node tools/check-room-data-source-switch-readiness.js`:
- `node tools/check-room-data-runtime-compat-seam.js`:
- `npm run browser-smoke` when a supported browser is available:

## R1-R10 route sanity

| Room | Result | Notes |
| --- | --- | --- |
| R1 | pass / fail |  |
| R2 | pass / fail |  |
| R3 | pass / fail |  |
| R4 | pass / fail |  |
| R5 | pass / fail |  |
| R6 | pass / fail |  |
| R7 | pass / fail |  |
| R8 | pass / fail |  |
| R9 | pass / fail |  |
| R10 | pass / fail |  |

## Input and UI coverage

- Keyboard clear or route sanity pass:
- Practice panel drills:
- Practice panel routes:
- Feel Lab fixtures:
- Settings open, edit, save, and reset:
- Save export and import round trip:
- Narrow viewport or touch-control pass:

## Regression notes

- Any timing changes noticed:
- Any room data mismatch noticed:
- Any UI or copy change noticed:
- Any save/profile issue noticed:

## Rollback notes

- One-revert rollback path confirmed:
- Reason to proceed despite any known risk:
- Follow-up issues needed:
