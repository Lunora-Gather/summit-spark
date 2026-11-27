## Summary

-

## Change type

- [ ] Docs / process
- [ ] Content / room / training data
- [ ] UI / settings / practice
- [ ] Input / keyboard / touch / gamepad
- [ ] Storage / account / cloud sync
- [ ] Physics / collision / movement
- [ ] Rendering / Canvas / performance
- [ ] Release / workflow / quality gate

## Impact

- [ ] No gameplay judgment changes
- [ ] Gameplay judgment changes are explained below
- [ ] No save schema changes
- [ ] Save migration/compatibility is explained below
- [ ] No room-data source changes
- [ ] Room-data source/call-site changes include rollback and playtest notes

Explanation:

## Checks

- [ ] `npm run check`
- [ ] Background headless WebKit (`npm run test:webkit`)
- [ ] Native Safari (`npm run browser-smoke`, link the remote run or record the locally approved run)
- [ ] `git diff --check`
- [ ] Manual `npm start`
- [ ] Relevant room or R1–R10 playtest
- [ ] Real touch/gamepad/audio verification if applicable

## Documentation

- [ ] `README.md`
- [ ] `CHANGELOG.md`
- [ ] `RELEASE_CHECKLIST.md`
- [ ] `PLAYTEST_CHECKLIST.md`
- [ ] `KNOWN_ISSUES.md`
- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/DATA_CONTRACTS.md`
- [ ] Not needed

## Playtest notes

Rooms/devices:

Observed:

Decision:
