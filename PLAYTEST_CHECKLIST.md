# Playtest Checklist

This checklist is for one focused manual pass after `npm run check` and `npm run browser-smoke` pass. It catches real-use issues that scripts cannot prove: route readability, friction, input trust, and whether the training cockpit actually helps a player recover.

## Setup

1. Open the local page from `npm start`.
2. Confirm the start screen shows build `20260608-p23` in page markup if inspected.
3. Use a clean browser profile for first-run checks, then repeat with an existing profile that has training progress.
4. Keep audio on for one pass and off for one pass.
5. Test desktop keyboard first; test touch and a physical gamepad when devices are available.

## First Three Minutes

- Start from a clean profile and do not open settings first.
- Verify the first-room flow starts without automatic teaching toast or visible control guide.
- Confirm free play shows only core HUD status; split delta, Flow, and pace meter should stay out of the default view until training/challenge context needs them.
- Die once to spikes and once by falling; the game should not interrupt with explanatory coaching copy.
- Press `O`, open settings, press `Escape`, and return to play without stuck movement.
- Press `P`, open the practice panel, press `Escape`, and return to play without stuck movement.
- Confirm settings opens as a quiet system list with Controls, Audio, Display, and Feedback/Save only; Room, Route, Feel, Profile, Training, and Advanced should not crowd the settings view.
- Confirm the practice panel exposes the recommended Drill, Room, Route contracts, Feel Lab, Profile, Training, and Advanced sections without hiding the close button.
- Start a recommended Drill from the practice panel and confirm the goal is clear before moving.

## Ten-Room Route Pass

For each room, record `pass`, `friction`, or `blocked`.

| Room | Must Be Readable | Manual Check |
| --- | --- | --- |
| R1 | basic jump, dash, safe landing | First clear should not require menu knowledge. |
| R2 | relay timing and recovery | Light relay should read as a reset, not a platform. |
| R3 | spring height and late dash | Spring route should be visible before committing. |
| R4 | relay chain under hazard pressure | Safe line and faster chain should both be understandable. |
| R5 | foldback route memory | Wall Spark line should look optional, not mandatory. |
| R6 | spring plus relay exit rhythm | Exit should feel like a rhythm reset, not a surprise. |
| R7 | wind plus crumble introduction | Crumble warning and wind lift must be readable together. |
| R8 | prism route choice | Overdrive route should not obscure crumble hazards. |
| R9 | echo anchor, wind, prism | Recall route should reduce practice friction. |
| R10 | full-kit finale | Finale should feel pressured but fair after R1-R9. |

## Training And Recovery

- Start one Route contract, interrupt it with a different Drill, reopen the practice panel, and resume from the visible interrupted card.
- Start one Feel Lab card, interrupt it with a different Drill, reopen the practice panel, and confirm the card says it was interrupted.
- Finish or fail at least one Clean/Pace/Style/Expert Drill and confirm retry/review text names the missing condition.
- Use the direct resume button from the start screen after creating progress; it should enter a useful recommended Drill.
- Choose a feedback type, write a short note, then click `诊断 / 复制`; keep the local snapshot with the note. It should not upload anything by itself.
- Click `反馈模板 / 复制` and confirm the pasted text has enough context for a tester to file a useful issue without copying raw input history.
- Export a `summit-spark-save` JSON, paste a broken JSON once and confirm the preview reports an error without refreshing, then import it in another profile and confirm low-performance, touch size, Focus stats, best flow, and room bests survive.
- After one valid import, confirm the browser has a `summit-spark-save-backup` entry for the prior local archive, then use the settings Restore action once and confirm the pre-import settings/progress return.
- Corrupt or clear storage only after saving a copy of the browser profile; the app should keep running and explain repair once.

## Mobile And Comfort

- At around 390x700, the start screen must show title, start, resume when present, practice, and settings entries without horizontal scroll.
- In 390x700 portrait play, touch controls should sit below the playfield instead of covering the character, spikes, or bottom landings.
- In 390x700 portrait practice, expand Room and confirm the room select, room brief, Drill variant buttons, and coach row stay inside the panel.
- At around 700x390, settings must scroll vertically and keep audio, low performance, touch size, gamepad deadzone, save import, and restore reachable.
- At around 700x390, practice must scroll vertically and keep Route, Feel, Room, and Profile reachable.
- Confirm the controls-first settings groups are easy to scan and the separate practice entry keeps the primary Drill path obvious.
- Confirm the hand-held/mobile view has no horizontal scroll after opening feedback, save import, backup restore status, Route cards, and Feel Lab sections.
- Increase touch size to 64 and confirm direction/action touch clusters grow without covering critical HUD text.
- Enable low-performance mode and confirm hazards, route compass, and Drill HUD remain readable.
- If a physical gamepad is available, verify the settings panel reports connected standard mapping, axis strength, and near-deadzone risk without exposing the controller name.

## Exit Criteria

The build is ready for a public demo only when:

- No room is `blocked`.
- Any `friction` note has a concrete follow-up in `KNOWN_ISSUES.md` or the next plan.
- Keyboard-only settings access works.
- One Route interruption/resume and one Feel interruption path work manually.
- Mobile portrait and landscape checks have no horizontal overflow.
