# Summit Spark Masterplan

## Mission

Build an original precision platformer that beats the reference by being clearer, faster to practice, and more expressive in its own movement language. We are not copying room layouts, art, story, or exact mechanics. We are studying the product-level strengths: instant feel, readable difficulty, fast retry, optional mastery, and strong training feedback.

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
- Every large push ends with npm check, map check, local browser smoke, git review, push, Pages deploy, online verification.
- Worktree must stay clean after publishing.

## Practice And Feedback Plan

- Already shipped: split delta, PB/SPLIT result popup, best ghost, current trail, death replay, room select, current room restart.
- Next: room drill starts, mistake tags, per-room target medals, optional ghost opacity, and an end-screen route report.
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
- Rebuild rooms 7-10 around route commitment.
- Strengthen map lint so future edits cannot flatten the curve again.
- Verify locally and online before calling the push finished.

## One-Hour Work Queue

1. Stabilize current crumble ice implementation and pass all checks.
2. Tune rooms 7-10 so the difficulty difference is visible in tile pressure and gameplay structure.
3. Add validation for late-room pressure and early-room safety.
4. Browser-smoke the new route and room select.
5. Commit and push a coherent difficulty-ramp checkpoint.
6. Continue with a second pass if the route still reads too flat.
