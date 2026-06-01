# Summit Spark Roadmap

## North Star

Build an original precision platformer whose identity is not imitation, but mastery: instant controls, readable rooms, fast retry, and a signature movement language built around dash afterglow, spark hops, wall rhythm, and risky light relays.

Long-term optimization source: `LONG_TERM_OPTIMIZATION_OUTLINE.md`. Super-push execution source: `SUPER_PUSH_PLAN.md`.

## What We Must Beat

- Feel: every input should be immediate, legible, and recoverable.
- Teaching: rooms should introduce one idea safely, then ask for it under pressure.
- Practice: deaths should be fast, informative, and almost frictionless.
- Identity: spark hop and light relay chains must become our own expressive mechanic.
- Presentation: effects should clarify player state without visual noise.

## Current Pillars

- Direction keys are direction only; jump, dash, and grab stay separate.
- Spark hop: a tiny post-dash jump window turns dash momentum into a learned technique.
- Wall rhythm: neutral wall jumps, away wall jumps, and grab wall jumps have distinct uses.
- Light trails are visual only; light relays provide limited, authored risk/reward extension.
- Wind updrafts, overdrive prisms, and echo anchors form the next original layer: route rhythm, skill ceiling, and fast practice.

## Progress Log

- 2026-05-29: Added death trajectory replays, relay-chain feedback, room split PBs, best-route ghosts, and current-room restart.
- 2026-05-29: Added wall coyote, fast fall, room target grades, persisted settings, comfort/classic key presets, and close-to-player input echo cues.
- 2026-05-29: Expanded the route to 10 rooms and added wind updrafts, overdrive prisms, echo anchors, Flow peak scoring, near-miss rewards, gamepad support, and final-run Flow reporting.
- 2026-05-30: Added room intro panels, dynamic best ghosts, current-route trails, practice-line settings, and summit mastery summary.
- 2026-05-30: Added split delta HUD, dash-aim preview, room-select practice, split result popups, crumble ice late-room pressure, death reason diagnostics, and automated map integrity checks.
- 2026-05-31: Added room focus profiling so each room records current-run mistakes, persistent fault reasons, clean clears, focus popups, debug details, and practice-directory weak-room markers.
- 2026-05-31: Added room skill tags, practice coach recommendations, Focus jump/reset controls, time-aware best ghosts, touch up/down input, stronger settings input isolation, Pages quality gates, and a 5/7/8/9/10 map-structure pass.
- 2026-05-31: Added Drill entry from the practice coach, persistent Drill HUD, Drill start/clear/clean stats, room purpose text, safe/fast/expert route lines, room detail brief, room medal/pace/clean badges in practice surfaces, settings practice report, ghost opacity, and stronger summit review with clean count, split-loss focus, and next drill suggestion.
- 2026-05-31: Added a design-readability pass: timer arms on first movement intent, settings pauses simulation, practice copy is localized, settings are grouped by task, compact HUD hides noisy counters on narrow screens, and touch controls depend on touch-capable pointers.
- 2026-06-01: Added an action-visual pass and richer practice review: the player now has readable pulses for jump, dash, Spark, wall jump, relay, prism, spring, recall, spawn, landing, and death; summit review now shows cards for next Drill, largest split loss, and weakest reason with concrete route advice.
- 2026-06-01: Added late-mechanic readability and low-friction finish practice: crumble ice shows a break meter and warning outline, updrafts expose their field boundary and lift arrows, relay/prism cooldown rings show readiness, echo anchors tether to the player when recall is available, and finish review buttons jump directly into next/slow-room Drill.
- 2026-06-01: Added Drill variants for mastery training: Clean targets no-mistake clears, Pace targets room target time, and Expert targets S pace plus no mistakes; finish review slow-room action now starts a Pace Drill.
- 2026-06-01: Added a practice queue and per-contract Drill stats: settings now exposes actionable Clean/Pace/Expert training cards with progress meters, and each room preserves mode-specific start/win counts for review.
- 2026-06-01: Added a room mastery ledger: settings review now sorts all rooms by training priority, shows mastery score plus pace/clean/contract status, and lets any row start the right Drill.
- 2026-06-01: Strengthened Expert Drill contracts: Expert clears now require S pace, no mistakes, and each room's authored high-skill tech such as Spark, relay chain, spring, wind, prism, echo, or crumble rhythm.
- 2026-06-01: Tightened Drill retry friction: failed Drill contracts restart the same room with the same target instead of leaking the player into the next room or finish screen.

## Next Milestones

1. Movement depth: tune spark hop, wall jump lock, wall coyote, fast fall, corner correction, input presets, gamepad feel, and grounded recovery.
2. Practice feedback: show run time, split time, room PBs, split grades, best-route ghosts, dynamic best ghosts, current-route trails, Flow peaks, deaths, room count, recent death marks, short death trajectory replays, input echo cues, and fast room restart.
3. Teaching vertical slice: refine the 10-room route so each mechanic has a safe intro, a pressured use, and an optional high-skill line.
4. Original mechanic pass: tune wind updrafts, overdrive prisms, echo anchors, light relays, and relay-chain feedback without enabling hovering.
5. Presentation pass: add action cues, better player states, successful-tech feedback, and clearer high-speed readability.
6. Public test loop: keep GitHub Pages updated, collect player feedback, and track known issues.

## Design Rules

- Never bind jump to up.
- Keep key presets explicit: comfort is C/X/Z, classic is Z/X/C, and neither uses up as jump.
- Never let visual particles become hidden platforms.
- Every new powerful mechanic needs a cooldown, cost, route constraint, or room-authored limit.
- Practice assists can reduce repetition, but they must not hide the timer or make mastery data meaningless.
- A room should be readable before it is difficult.
- Restart speed matters as much as spectacle.
- Practice data should help the player improve without adding menu friction.
- Review text should point to a concrete route line, not just a room number.
- End-of-run recommendations should be actionable without requiring the player to reopen settings.
- Drill completion should reflect the chosen training contract, not merely reaching the room exit.
- Expert completion should prove the authored high-skill line, not just a fast safe route.
- Failed practice contracts should restart the exact target quickly, without recording a false mastery win.
- Practice queues should turn review data into one-click next actions across clean, pace, and expert goals.
- Practice cards should show contract status, not just a destination room.
- Mastery tables should rank rooms by action priority, not by route order alone.
- First-input timing should require a neutral frame after spawn so held keys or controller drift cannot burn split time.
- Weak-room markers should point to action: current run mistakes use `!x`; persistent trouble uses `watch` plus the dominant failure reason.
- Practice recommendations should start with the first unplayed or non-S room, then move to persistent Focus pressure.
- Settings and practice controls must release held gameplay inputs before they take focus.
- Timers should reflect play, not menu reading time: idle starts and settings panels must not silently burn split seconds.

## Precision Quality Gate

- Every room must pass automated size, tile, target, name, start, and summit-goal validation before publishing.
- Every practice feature must reduce uncertainty: show intent, show pace, or show route memory.
- New maps should add pressure gradually: safe intro, readable escalation, optional high-skill line, and a clean recovery path.
- Contract checks must guard room skill tags, Focus UI ids, touch directions, time-aware ghost data, HTML twin parity, and Pages pre-deploy checks.
- Online builds must be checked after push so the public URL is never treated as finished just because local checks pass.

## Difficulty Curve

- Rooms 1-3 stay readable and forgiving enough to learn movement timing.
- Rooms 4-6 combine relays, springs, and tighter recovery without adding one-shot ambiguity; room 5 now carries the foldback/route-memory job instead of repeating room 4.
- Rooms 7-10 introduce crumble ice, wind, prisms, and echo anchors together so the finale has real route pressure; room 7 teaches wind+crumble, room 8 teaches prism choice, rooms 9-10 combine the full kit.
- Map checks now guard that late-room pressure stays meaningfully higher than the opening rooms.

## Super-Push Operating Plan

- First stabilize the route curve: early teaching, middle combination, late commitment.
- Then expand practice feedback only where it helps the player understand a mistake or compare pace.
- Every new late-game mechanic must have code simulation, rendering, map validation, and browser smoke coverage.
- If a quality gate catches a mistake, fix the content or the rule before adding more rooms.

## 2026-05-31 Immediate Execution Note

The next implementation pass is not a content expansion. It is a demo-quality pass on the existing 10-room slice:

- First: add drill-style practice entry from the coach so the recommended room becomes actionable.
- Second: expose room medals and clean-clear state in the practice directory and room intro.
- Third: strengthen summit review with weakest room, largest split loss, clean count, and the next practice target.
- Fourth: only then tune map/feel details found while testing the slice.

## Pressure Scoring Weights

- Hazards count as base threat.
- Relays count higher because they require route timing.
- Wind, prisms, and crumble ice count higher because they change commitment and recovery.
- Map checks require middle rooms to exceed early rooms and late rooms to exceed middle rooms by a wide margin.
