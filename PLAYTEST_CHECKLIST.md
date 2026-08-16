# Playtest Checklist

This checklist begins only after `npm run check` and `npm run browser-smoke` pass. Those commands already prove deterministic UI, save, input, map and state behavior. The human pass answers what scripts cannot: whether the route reads clearly, inputs feel trustworthy, audio remains comfortable and the ten-room difficulty curve teaches before it tests.

## Setup

1. Open the local page from `npm start` or the deployed page after `npm run live-check` passes.
2. Confirm `meta build-version` matches the intended release; `node tools/check-public-surface.js` should report the same local build before play begins.
3. Use a clean profile for first-run checks and an existing profile for training/recovery checks.
4. Record device, input type, viewport, build and whether Audio, Calm Effects, reduced motion, low performance or assist mode is active.
5. Do not tune physics, targets or maps from one failed attempt. Record the exact room, action and repeatability first.

## First Three Minutes

- Start from a clean profile without opening Settings or Practice first.
- Confirm the start choice and primary action are obvious at normal viewing distance.
- Verify the first room uses one short input line for a clean profile, including `R` quick retry and `T` room restart, then does not show a redundant Move → Jump → Dash strip or routine coaching cards; labelled touch controls remain the only persistent input labels during touch play.
- Confirm free play remains visually quiet: no training report, split analysis or extra cards compete with the route.
- Note the first death, the first point of uncertainty and any place where the player pauses for more than 20 seconds.
- Open and close Settings and Practice once. Judge discoverability and visual weight; deterministic focus and click-through behavior is already covered by browser smoke.

Pass when a new player can begin moving, jumping and dashing without README knowledge, and either clear R1 or accurately explain what they are trying to do.

## Ten-Room Route Pass

Complete one uninterrupted R1–R10 route. For each room record `pass`, `friction` or `blocked` plus the largest uncertainty.

| Room | Teaching / test sentence | Human question |
| --- | --- | --- |
| R1 | jump, dash, safe landing | Does the first route read before punishment arrives? |
| R2 | Relay timing and recovery | Does the Relay read as a reset rather than a platform? |
| R3 | refill, two-spring capstone, late dash | Are both spring landings readable before commitment? |
| R4 | Relay chain under hazard pressure | Are safe and fast lines both understandable? |
| R5 | foldback route memory | Does Wall Spark look optional rather than mandatory? |
| R6 | six Relay beats, three spring launches | Does the sequence feel deliberate rather than cluttered? |
| R7 | grounded Wind Gorge entry, wind and crumble | Can wind lift and crumble warning be read together? |
| R8 | prism/crumble route into final updraft | Does Overdrive preserve hazard readability? |
| R9 | safe Echo anchor, wind, recovery shelf, prism | Does recovery arrive before renewed pressure? |
| R10 | whole-run synthesis | Does the finale feel varied, fair and earned? |

During the route, judge these chapter-level questions:

- R1–R3: does each room establish one sentence and then combine it, without tutorial clutter?
- R4–R6: does the old-peak act deepen timing and memory without becoming repetitive?
- R7–R8: can the player distinguish wind, brittle ground and prism pressure at play speed?
- R9–R10: is Echo introduced safely, and does the summit synthesize rather than merely stack mechanics?
- Attempt the R4–R10 Lumen detours once: do low Relay, switchback, spring/Relay, updraft, Prism/crumble, Echo recall and finale callback feel like seven different risks rather than the same upper-right pickup?
- After collecting one current-room Lumen, die or retry before crossing the room boundary. Confirm the pickup returns and the unspent bonus dash is gone; then carry it across the boundary and confirm later retries preserve the banked count.
- From a later room, briefly walk back across a left boundary. Confirm the previous room opens a fresh Clean attempt, a prior room mistake does not leak into that attempt, and a Lumen already carried across the boundary remains after a subsequent death.
- Compare ordinary completion with the tighter Pace/Expert route. The safe line should remain readable, while the mastery line should demand cleaner execution without feeling like hidden timing.
- Do existing in-world landmarks, material particles, Relay threads, updraft wakes, Echo rings and the constellation clarify the route without becoming a second HUD?
- Does the classic small climber remain readable at desktop and portrait sizes, with the same fixed dark-blue hair throughout every state?
- Does the summit review identify a useful next practice step without feeling like a dashboard?

## Training And Recovery

- Start a recommended Drill and decide whether its goal is clear before moving.
- During a Drill, briefly walk left out of the room. Confirm the training HUD and old objective disappear, the status explains that the Drill was paused, and returning to the room does not silently resume the stale attempt.
- Run one Route interruption/resume path and judge whether returning to it feels obvious.
- Run one Feel interruption path and judge whether the interrupted state is understandable.
- Fail and finish at least one Drill; confirm the result helps the player change the next attempt rather than merely scoring it.
- Compare a saved PB route and the current route at normal play speed. Gold/cyan paths and action markers should be distinguishable without obscuring platforms.
- Complete a run, open the deeper review, and decide whether four-act evidence and the next Drill answer “where did I lose the run?” quickly.
- Click `诊断 / 复制` only when filing an issue; confirm the snapshot stays local. Use the feedback template for reproduction steps, not as another in-game task list.

## Touch, Gamepad And Audio

Physical hardware is required for these judgments.

- Phone/tablet: test portrait and landscape, browser chrome appearing/disappearing, thumb reach, accidental presses, two-finger overlap/release on a held direction or action, notch/Home-indicator clearance and the 64px touch setting.
- Touch Echo: in R9, activate the anchor, move away and recall once without covering Jump/Dash or losing track of the character.
- Gamepad: check stick drift, deadzone comfort, A/B/X/RT/shoulder intuition and long-session grab fatigue. Do not record the controller name.
- Audio: play once with sound and once muted. With sound on, judge mechanic separation, act-to-act identity, relative volume and fatigue; in R7, wind should read before the crumble cascade.
- Comfort: inspect Calm Effects, low performance and the operating system's reduced-motion preference. Motion may quiet, but hazards, route meaning and action confirmation must remain clear.

## Accessibility And Readability

- At normal viewing distance, entry copy, collapsed group labels, account status, key labels and training details must remain crisp.
- With a screen reader or accessibility inspector, sample the changed surface only. Names should describe the control without decorative arrows or symbols, and hidden panels should stay silent.
- Keyboard-only Settings access must remain understandable. Browser smoke owns exact focus trapping; the human check judges whether the order makes sense.
- At approximately 390x700 and 700x390, confirm no important control feels clipped or visually crowded even when automated overflow checks pass. On a comfortable-height portrait phone, the brief and playfield should sit in the upper half with a deliberate gap to the fixed thumb zone; on 320x480, the compact fallback should remain intact.
- After an automatic death, wait through the respawn and immediately press right, jump and dash once. Confirm the character responds, the status reads `已恢复`, and `R`/`T` remain discoverable without opening Settings.

## Evidence Record

Use `docs/PLAYTEST_PROTOCOL.md` or this compact record:

```text
Build:
Device / input / viewport:
Mode and room:
Result: pass / friction / blocked
What happened:
Expected:
Repeatable steps:
Deaths / retries:
Audio / comfort settings:
Screenshot or copied diagnostics:
```

## Exit Criteria

- No room is `blocked`.
- Every `friction` note has repeatable evidence and either a fix or a `KNOWN_ISSUES.md` entry.
- One uninterrupted keyboard route has been completed for difficulty/order evidence.
- Any release claiming touch, gamepad or audio improvement has corresponding real-device evidence.
- The default page remains quiet, the classic climber remains unchanged and no fix depends on speculative physics/map tuning.
