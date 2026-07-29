# Playtest Checklist

This checklist is for one focused manual pass after `npm run check` and `npm run browser-smoke` pass. It catches real-use issues that scripts cannot prove: route readability, friction, input trust, and whether the training cockpit actually helps a player recover.

## Setup

1. Open the local page from `npm start`.
2. Inspect the page markup and confirm `meta build-version` matches the current CSS/JS asset version; `node tools/check-public-surface.js` should report the same build before manual play begins.
3. Use a clean browser profile for first-run checks, then repeat with an existing profile that has training progress.
4. Keep audio on for one pass and off for one pass. With audio on, each act boundary should first release the previous harmony and then introduce a recognizably different destination motif; no old-act pad should bleed across a room jump or summit reveal.
5. Test desktop keyboard first; test touch and a physical gamepad when devices are available.

## First Three Minutes

- Start from a clean profile and do not open settings first.
- Verify the first room starts without an automatic teaching toast or head-level coaching copy. On a clean desktop keyboard profile, only the compact bottom Move → Jump → Dash strip should appear; it must advance from real input and disappear after Dash. It must stay hidden when labelled touch controls are rendered.
- Confirm free play shows only core HUD status; split delta, Flow, and pace meter should stay out of the default view until training/challenge context needs them.
- Die once to spikes and once by falling; the game should not interrupt with explanatory coaching copy.
- Press `O`, open settings, press `Escape`, and return to play without stuck movement.
- Press `P`, open the practice panel, press `Escape`, and return to play without stuck movement.
- From the start menu, open Settings and click the visible Start region: the drawer must close without starting play. Reopen Settings, click a blank region to close it, then reopen it and click the visible Practice and Account regions in separate passes; each must switch directly instead of swallowing or passing through the pointer, and closing must return focus to the action just selected.
- From the entry chooser, open Email Login and immediately click outside; the drawer must stay closed/inert and focus must remain on the Email Login trigger after its delayed autofocus window.
- On a throttled connection, log out while the first cloud-save inspection is still pending; once the old request finishes, the account and cloud summaries must remain logged out instead of showing stale sync, conflict or corruption state.
- During that pending inspection, confirm the account summary says “检查中”, both cloud replacement actions are disabled, Logout remains available, and a valid conflict later enables both explicit choices.
- Confirm a cloud read failure keeps both replacement actions locked; if the remote response is present but its archive is corrupt, only Upload Local should unlock as an explicit repair path.
- While signed in, change a setting and verify “待同步” appears immediately; on a throttled upload, change another setting and leave the page, then confirm the latest archive eventually contains both changes instead of dropping the second.
- Clear a room once, improve its PB, then finish slower: the result line should name the actual room time and compare against the target or PB, while only one mastery card appears and no separate CLEAR/CLEAN focus line is stacked underneath.
- Cross R3→R4, R6→R7 and R8→R9: the outgoing act should retain its quiet resolve line while the small footer reports that act's current-run time and “无失误” or mistake count before the next act vow appears; direct Practice entry must not fabricate an outgoing-act result.
- Hold a password update or another account request open, close the drawer and change a setting; the change must sync after the account request clears. A failed upload must keep “同步失败” visible without repeatedly retrying until a deliberate retry trigger occurs.
- After one summit clear, activate “再来”; confirm the review disappears, keyboard focus returns to the game, movement starts immediately, and opening/closing settings in the second run does not revive or focus hidden review content.
- Confirm settings opens as a quiet system list with Controls, Audio, Display, and Feedback/Save only; Room, Route, Feel, Profile, Training, and Advanced should not crowd the settings view.
- Confirm the entry descriptions, collapsed setting labels, account status, key labels, placeholders, and training details remain crisp at normal viewing distance instead of fading into the pale panel.
- Confirm the compact “移动 / 动作” headings and every collapsed disclosure arrow remain visibly distinct from their local card backgrounds; on touch, tap the exposed blank margin beside an open Settings drawer and confirm it closes without activating anything behind it.
- Confirm the practice panel initially exposes only room selection and training history; Route, Feel, Profile, and long-term goals remain reachable one level deeper without hiding the close button.
- Start a recommended Drill from the practice panel and confirm the goal is clear before moving.
- In a room with a saved PB path, start a Drill and confirm the gold `PB 路线` and cyan `本次` line are immediately distinguishable; the PB line should use at most one static label for each Dash/Spark/Overdrive family while combined transitions retain distinct symbols, and the moving PB ghost should name only its current key action.

## Ten-Room Route Pass

For each room, record `pass`, `friction`, or `blocked`.

| Room | Must Be Readable | Manual Check |
| --- | --- | --- |
| R1 | basic jump, dash, safe landing | First clear should not require menu knowledge. |
| R2 | relay timing and recovery | Light relay should read as a reset, not a platform. |
| R3 | offset two-spring capstone and late dash | Both spring landings should be visible before committing. |
| R4 | relay chain under hazard pressure | Safe line and faster chain should both be understandable. |
| R5 | foldback route memory | Wall Spark line should look optional, not mandatory. |
| R6 | paired relays plus two-spring exit rhythm | The second relay/spring choice should complete the Old Peak sentence, not surprise the player. |
| R7 | wind plus crumble introduction | Crumble warning and wind lift must be readable together; with audio on, wind entry should sound once and ice should crack before it breaks. |
| R8 | prism/crumble route into a final updraft | Overdrive should not obscure hazards, and the late wind should feel like a deliberate Wind Gorge exam. |
| R9 | safe entry anchor, recall, wind, prism | The anchor should activate beside the checkpoint before pressure begins; leave it once and confirm recall returns cleanly. |
| R10 | full-kit finale | Finale should feel pressured but fair after R1-R9. |

## Training And Recovery

- Start one Route contract, interrupt it with a different Drill, reopen the practice panel, and resume from the visible interrupted card.
- Start one Feel Lab card, interrupt it with a different Drill, reopen the practice panel, and confirm the card says it was interrupted.
- Finish or fail at least one Clean/Pace/Style/Expert Drill and confirm retry/review text names the missing condition.
- Complete a full run, open “更多复盘” and “掌握路线图”, and confirm a screen reader announces only those names plus their collapsed/expanded state—not `+`, `-`, or arrow characters—while the visible chevron still rotates.
- In “更多复盘”, confirm “本轮分幕” lists all four acts, their current-run times and mistakes; the slowest act must match the room-by-room notes from this pass.
- Click “复制本轮” and confirm the pasted report matches the four-act/ten-room notes, stays under 4,000 characters, contains no identity, device name, raw input history or route coordinates, and does not make a network request.
- In the same summit-review modal, Tab forward from the last visible control and Shift+Tab backward from the first; both must wrap inside the review without moving focus to browser chrome or hidden gameplay controls.
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
- On a notched phone, confirm the entry chooser, close button, account fields, and practice launch action stay clear of the notch and Home indicator; open the keyboard on the email field and confirm it remains reachable by scrolling.
- Confirm settings opens with every group collapsed, the group labels remain easy to scan, and the separate practice entry keeps the primary Drill path obvious.
- With a screen reader or accessibility inspector, confirm disclosure names are just “账号与云存档 / 控制 / 声音 / 显示 / 反馈与存档” or the corresponding practice labels, without an announced arrow; verify collapsed/expanded state changes immediately and hidden settings/practice groups do not produce stray arrow text.
- Set one custom key, switch between Mac and Windows/Linux labels twice, and confirm the custom scheme and key remain unchanged until Restore Layout is explicitly pressed.
- Send a code to one email, edit the email before entering the code, and confirm the old code is cleared with a prompt to resend instead of attempting a mismatched login.
- With a screen reader or accessibility inspector, confirm “邮箱验证码 / 密码” is announced as one labelled button group with exactly one pressed option, the state changes after switching, and account inputs announce the live status/error text.
- With a screen reader or accessibility inspector, confirm Email, OTP, Login Password, New Password, and Current Password each announce a distinct purpose; New and Current Password must not depend on placeholder text alone.
- Before signing into an account with existing cloud progress, create only a local custom setting, path, or failed Drill; confirm the account drawer asks which version to use rather than silently replacing the local data.
- Confirm the hand-held/mobile view has no horizontal scroll after opening feedback, save import, backup restore status, Route cards, and Feel Lab sections.
- Increase touch size to 64 and confirm both clusters stay fully inside the viewport, remain separated, and keep Jump/Dash paired without covering critical HUD text or the playfield.
- Enter R9 on touch: `召` must be absent in R1-R8, appear dormant only until the entry anchor activates, then become usable without covering Jump/Dash. Move away, tap it once, confirm the player returns to the anchor and the button visibly enters cooldown.
- Enable low-performance mode and confirm the solid, non-blurred HUD, tips and touch controls remain crisp while hazards, route compass, and Drill guidance stay readable.
- Enable the operating system's reduced-motion preference and confirm UI transitions, ambient ribbons, snowfall, velocity wakes, and idle entity drift stop while player movement, hazards, and action confirmation remain visible.
- If a physical gamepad is available, verify the settings panel reports connected standard mapping, axis strength, and near-deadzone risk without exposing the controller name.

## Exit Criteria

The build is ready for a public demo only when:

- No room is `blocked`.
- Any `friction` note has a concrete follow-up in `KNOWN_ISSUES.md` or the next plan.
- Keyboard-only settings access works.
- One Route interruption/resume and one Feel interruption path work manually.
- Mobile portrait and landscape checks have no horizontal overflow.
