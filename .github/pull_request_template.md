## Summary

- 

## Change Type

- [ ] Docs / process
- [ ] Content / room / training text
- [ ] Data / metadata
- [ ] UI / settings / practice panel
- [ ] Input / keyboard / touch / gamepad
- [ ] Storage / save import-export / schema
- [ ] Physics / collision / movement
- [ ] Rendering / canvas / visual feedback
- [ ] Release / workflow / quality gate

## Risk

- [ ] Low: documentation or templates only
- [ ] Medium: content or data, no gameplay rule changes
- [ ] High: input, storage, UI state, mobile layout, Route/Feel/Drill
- [ ] Critical: physics, collision, map layout, render loop

## Gameplay Impact

- [ ] No gameplay judgment changes
- [ ] Changes gameplay judgment; explain below

Explanation:

## Save / Schema Impact

- [ ] No localStorage schema changes
- [ ] Changes schema or import/export behavior; explain migration below

Migration notes:

## Checks Run

- [ ] `npm run check`
- [ ] `npm run browser-smoke`
- [ ] `npm run route-audit`
- [ ] `npm run state-check`
- [ ] `git diff --check`
- [ ] Manual local launch with `npm start`
- [ ] Manual R1-R10 playtest or relevant room coverage
- [ ] Mobile viewport check: 390x700 and 700x390
- [ ] Real gamepad or touch-device pass

## Documentation Updated

- [ ] `README.md`
- [ ] `CHANGELOG.md`
- [ ] `RELEASE_CHECKLIST.md`
- [ ] `PLAYTEST_CHECKLIST.md`
- [ ] `KNOWN_ISSUES.md`
- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/CONTENT_BIBLE.md`
- [ ] `docs/OPTIMIZATION_ROADMAP.md`
- [ ] Not needed

## Playtest Notes

Room(s):

Observed friction:

Decision:
