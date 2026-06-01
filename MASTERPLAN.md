# Summit Spark Masterplan

## Mission

Build an original precision platformer that beats the reference by being clearer, faster to practice, and more expressive in its own movement language. We are not copying room layouts, art, story, or exact mechanics. We are studying the product-level strengths: instant feel, readable difficulty, fast retry, optional mastery, and strong training feedback.

The long-term optimization source lives in `LONG_TERM_OPTIMIZATION_OUTLINE.md`; future super-pushes should align with that outline and `SUPER_PUSH_PLAN.md` before expanding scope.

## Reference Lessons To Beat

- Input feel: the player must trust jump, dash, wall contact, buffering, coyote time, and corner correction.
- Room readability: a hard room should still communicate the intended first route in the first few seconds.
- Difficulty ramp: early rooms teach, middle rooms combine, late rooms force commitment and recovery.
- Practice speed: death, room restart, split reading, and retry must be almost frictionless.
- Mastery layers: there should be a safe clear path, a faster expressive path, and a high-risk route for experts.
- Assist philosophy: training tools may reduce repetition, but they should preserve timing truth and mastery data.
- Presentation: effects must clarify state, not hide hazards or become fake platforms.

## Our Original Identity

- Spark hop: converts dash aftermath into a learned vertical/horizontal extension.
- Light relay chains: authored risk/reward extensions, never infinite hovering.
- Overdrive prisms: temporary speed and dash power for aggressive route planning.
- Wind updrafts: change air rhythm and fast-fall decisions.
- Echo anchors: reduce practice friction without erasing the cost of mistakes.
- Crumble ice: late-game route commitment, forcing the player to move instead of camping.
- Flow score: rewards clean, fast, near-risk movement and gives a separate mastery axis.

## Difficulty Architecture

1. Rooms 1-3: onboarding and trust.
   - Teach jump, dash, refill, spikes, spring, basic relay.
   - No crumble ice, no dense multi-mechanic chain.
   - Player should understand why they died.

2. Rooms 4-6: combination and recovery.
   - Relay plus spring, tighter platforms, early optional fast lines.
   - Mistakes should be recoverable but slower.
   - Targets start to matter.

3. Rooms 7-8: new pressure.
   - Introduce wind plus crumble ice.
   - Add prism routes where speed creates a better line.
   - Practice selection becomes useful.

4. Rooms 9-10: commitment finale.
   - Echo anchor, wind, prism, relay, crumble ice in authored sequences.
   - Safe route remains possible, but S/A route demands route memory.
   - Finale should feel mechanically distinct from the opener.

## Engineering Pillars

- One mechanic per clear code path: parse, simulate, draw, validate.
- Every new tile must be included in map lint before it ships.
- Every route expansion needs target times and pressure scoring.
- Every large push ends with npm check, contract check, map check, local browser smoke, git review, push, Pages deploy, online verification.
- Worktree must stay clean after publishing.

## Practice And Feedback Plan

- Already shipped: split delta, PB/SPLIT result popup, time-aware best ghost, current trail, death replay, death reason diagnostics, room select, current room restart, Focus profiling, room skill tags, room purpose text, safe/fast/expert route lines, practice coach drill starts, contract-aware primary Drill entry, Clean/Pace/Style/Expert Drill variants, Style difficulty-type contracts, in-play Style objective and Drill progress feedback, failed-Drill auto retry, per-contract Drill stats, Expert high-skill action requirements, actionable practice queue cards with progress meters, room mastery ledger, persistent Drill HUD, room detail brief, room medal/pace/clean badges, settings practice report, ghost opacity, first-input timer arming, settings pause, localized practice copy, grouped settings, compact narrow HUD, action-state player pulses, late-mechanic readability cues, and an end-screen card review with direct Drill actions.
- Next: tune the 10-room route against the new review data, then strengthen challenge variants and expert lines.
- Later: challenge variants, expert lines, and a compact level select with mastery status.

## Map Production Rules

- Every room has a visible route, an optional faster route, and a recovery story.
- Hazards should punish a route decision, not unclear visuals.
- Late rooms may use crumble ice, but early rooms must not.
- Pressure score should climb meaningfully from early to late rooms.
- A new mechanic appears first in a readable situation, then in a pressured sequence.

## Current Super-Push

- Fix the flattened difficulty curve.
- Add crumble ice as a late-room pressure mechanic.
- Rebuild room 5 around foldback route memory and rooms 7-10 around staged route commitment.
- Strengthen map and contract lint so future edits cannot flatten the curve or silently break practice UI.
- Verify locally and online before calling the push finished.

## 2026-05-31 Execution Record

To beat the reference, do not chase difficulty for its own sake. The next push should make the 10-room slice clearer to read, faster to practice, and more expressive through Summit Spark's own movement language.

Immediate direction:

- Polish the current 10 rooms before expanding the route count.
- Treat input trust, restart speed, and readable deaths as higher priority than spectacle.
- Make practice feedback the signature advantage: drill starts, medals, clean clears, split loss, Focus reasons, and next-room recommendations.
- Keep visual identity tied to readable state: player status, hazards, relays, wind, prisms, echo, and crumble must be distinct at speed.
- Ship in complete small pushes with `npm run check` as the non-negotiable gate.
- Treat UX timing as part of fairness: reading settings or waiting at spawn must not degrade split data.
- Treat action visuals as gameplay language: each pulse must answer “what state am I in?” before it tries to look flashy.
- Treat finish screens as practice surfaces: the player should be able to act on a recommendation immediately.
- Treat training variants as contracts: Clean, Pace, and Expert should succeed only when their stated goal is met.
- Treat Expert as authored mastery: each Expert contract should require the room's signature technique.
- Treat failed Drill exits as retry moments, not as permission to drift into unrelated rooms.
- Treat primary Drill buttons as contract launchers: the most obvious action should resolve to Clean, Pace, Style, or Expert before play begins.
- Treat difficulty as a spectrum of skills: Style contracts should surface precision, rhythm, route reading, risk, recovery, and endurance without pretending they are all just speed.
- Treat the settings panel as a training cockpit: review data should always produce a next action.
- Treat practice cards as status surfaces: each card should expose both the next action and the contract result so far.
- Treat room mastery as a sortable worklist: the weakest useful action should rise to the top automatically.

## One-Hour Work Queue

1. Stabilize current crumble ice implementation and pass all checks.
2. Tune rooms 7-10 so the difficulty difference is visible in tile pressure and gameplay structure.
3. Add validation for late-room pressure and early-room safety.
4. Browser-smoke the new route and room select.
5. Commit and push a coherent difficulty-ramp checkpoint.
6. Continue with a second pass if the route still reads too flat.
