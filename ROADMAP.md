# Summit Spark Roadmap

## North Star

Build an original precision platformer whose identity is not imitation, but mastery: instant controls, readable rooms, fast retry, and a signature movement language built around dash afterglow, spark hops, wall rhythm, and risky light relays.

Long-term optimization source: `LONG_TERM_OPTIMIZATION_OUTLINE.md`. Super-push execution source: `SUPER_PUSH_PLAN.md`. Development guardrails: `DEVELOPMENT_DIRECTION.md`.

## What We Must Beat

- Feel: every input should be immediate, legible, and recoverable.
- Teaching: rooms should introduce one idea safely, then ask for it under pressure.
- Practice: deaths should be fast and almost frictionless; detailed coaching belongs in opt-in training surfaces, not the default play flow.
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
- 2026-06-01: Made the primary Drill entry contract-aware: settings and finish-review "next Drill" actions resolve into Clean, Pace, Style, or Expert instead of using a loose auto clear.
- 2026-06-01: Added Style Drill contracts for difficulty-type variety: every room now has a bespoke challenge flavor such as precision, recovery, timing, chain, route choice, terrain risk, overdrive risk, echo reading, or finale endurance.
- 2026-06-01: Surfaced difficulty types during play: room intro cards now show Style objectives, active Drill HUDs show contract progress/time pressure, and summit review includes a direct Style challenge action.
- 2026-06-01: Added active requirement beacons: Style and Expert drills now highlight unfinished target actions in the room, making difficulty-type goals visible without opening settings.
- 2026-06-01: Tightened small-screen UX and practice guidance: compact HUD now prioritizes room, pace, death, and state bars; room intros are more readable under the HUD; settings now starts with a next-practice action card; death/retry feedback is consolidated into a single coach hint.
- 2026-06-02: Closed a strict UX audit pass: settings and real HUD counters are now reachable to assistive tech, the paused settings state dims the playfield, Focus reset requires expiring confirmation, first-input timing shows an on-canvas standby cue, and mobile practice lists are less crowded.
- 2026-06-02: Added a training-plan pass: settings now builds a three-step Drill ladder, death feedback prescribes the next action plus a concrete Drill, Drill failures explain the missing contract in action language, and active Drill HUDs show Clean/Pace/Style/Expert ladder status.
- 2026-06-02: Added a feel-trust pass: apex gravity shaping makes jump tops easier to steer, and successful buffer/coyote/wall-grace/Spark/aim-memory windows now produce short player-adjacent cues plus debug readouts.
- 2026-06-02: Added a route-clarity and mastery pass: room intros, in-run route cards, and a near-player compass now surface the current SAFE/FAST/EXPERT line, while room clears and Drill wins show immediate mastery progress.
- 2026-06-02: Added a mastery-roadmap pass: finish review now lists the next contract gaps as clickable Drill rows, settings mastery rows show Clean/Pace/Style/Expert pills, and Drill completion feedback names the next step.
- 2026-06-02: Added a failure-rehearsal pass: deaths, manual retries, room restarts, and failed Drill contracts now create in-world correction cards, rehearsal labels, and route arrows so the next attempt starts with a concrete action.
- 2026-06-02: Added a first-impression polish pass: the start overlay now exposes ready/continue state, basic controls, and a training-cockpit entry; settings now uses a wider two-column cockpit layout; canvas text overlays render without pixelated scaling.
- 2026-06-03: Added a first-room onboarding pass: new players get a crisp DOM tip strip for timing, landing, dash, and hazard reading; early deaths collapse into one next-action sentence; room intro, route focus, and death coach overlays now yield to high-priority beginner tips.
- 2026-06-03: Added a public-loading hardening pass: CSS/JS assets are versioned from HTML for Pages freshness, build version is visible in markup, and the start panel has delayed boot plus noscript fallbacks that disappear once JavaScript marks the app ready.
- 2026-06-03: Added a short-viewport start-screen pass: portrait/sidebar viewports use a full-viewport overlay and constrained start panel so the 16:9 stage cannot crop the title, controls, or start action; the start overlay now drops behind settings when training is opened.
- 2026-06-03: Added a control-accessibility pass: grab can now be held or toggled from settings, preserving the default feel while reducing sustained-button strain during long practice.
- 2026-06-03: Added a P2 long-term layer: settings now exposes chapter completion, challenge cards, and a persistent profile summary; summit review surfaces chapter grade and challenge progress, while clears record summit count, best death count, relay chain, and Flow peak.
- 2026-06-03: Added `DEVELOPMENT_DIRECTION.md` as the PR and product guardrail for future large pushes, keeping branch policy, P2 data rules, UI priority, and quality gates aligned.
- 2026-06-03: Contracted full-run challenges: first clear, no-death, and Flow cards now start from R1, expose an active in-run challenge HUD, and report the selected challenge result in the summit review.
- 2026-06-03: Added a broad next-step pass: synthesized action audio, Wall Spark and Prism Spark variants, failure ghost rehearsal lines, three-step route contracts, subtle chapter resonance, feel replay fixtures, and readable-landing map lint.
- 2026-06-03: Closed the route-and-feel loop: Feel Lab cards launch targeted calibration drills, route contracts now surface in active Drill HUD/review text and preserve interruption results, audio can be tested from settings, and build assets moved to p5.
- 2026-06-03: Added automated local HTTP smoke and Feel Lab result states: calibration cards now show active/recent/interrupted status, mobile cards collapse cleanly, and `npm run check` verifies current asset loading through a temporary local server.
- 2026-06-04: Added browser-level smoke and state hardening: headless Chrome verifies start/settings/Feel Lab/route/mobile/storage paths, route-contract auto-advance has a generation guard, Flow challenges use current-run Flow, storage normalizers reject Infinity/string booleans, and mobile panels use dynamic viewport/safe-area sizing.
- 2026-06-04: Added P10 usability gates: browser smoke now checks canvas pixels, keyboard movement, storage repair toast, and gamepad deadzone mock; `npm run route-audit` validates route readability/contracts/Feel Lab fixtures; Route cards show an explicit continue badge; finish review cards are prioritized for mobile reading; failure ghost lines now include a direction arrow.
- 2026-06-04: Added P11 real-use polish: start overlay can jump straight into the recommended Drill, settings include low-performance and touch-size controls, storage writes schema versions, `npm run state-check` guards transition semantics, and browser smoke covers schema migration plus mobile landscape review scroll.
- 2026-06-05: Added P12 verification polish: browser smoke now covers keyboard-only settings access plus Route/Feel interruption and recovery paths, while manual playtest and known-issues docs capture human/device checks that scripts cannot prove.
- 2026-06-05: Added P13 feedback loop: settings can copy a local diagnostics snapshot for playtest reports, and smoke/contract checks verify the snapshot path without adding telemetry or score changes.
- 2026-06-05: Added P14 feedback usability: diagnostics can include a short typed note and feedback type, and text-entry hotkeys are isolated so typing in the note field cannot close settings.
- 2026-06-05: Added P15 migration and visual guards: feedback templates, local save archive copy/download/import, non-sensitive gamepad status, browser save import/export checks, and mobile visual overflow guards.
- 2026-06-05: Added P16 import robustness: save archives now get a live import preview, invalid JSON and wrong archive kinds fail in place, and browser smoke covers invalid/valid import paths.
- 2026-06-05: Added P17 experience simplification: start copy and onboarding prompts are shorter, settings use grouped disclosure sections, and the visual system is quieter and less blue-heavy.
- 2026-06-05: Added P18 interface simplification: start guide blocks and automatic teaching toasts are removed, settings open as collapsed system-style groups, the large room-intro teaching card is compacted, and UI/canvas typography uses lighter system-font weights.
- 2026-06-05: Added P19 pure-play simplification: visible death/fall correction, failure rehearsal overlays, death replays, and first-input timing prompts are silent by default; settings now opens as a controls-first single-column system panel with separate audio and display groups.
- 2026-06-05: Added P20 real-use polish: mobile touch controls are split into direction/action clusters, controller status reports axis magnitude and near-deadzone risk, audio is quieter, late-room hazard visuals are less blue and more readable, and finish review detail is collapsible.
- 2026-06-06: Added P21 interface hierarchy polish: free play hides advanced training HUD by default, training contexts keep their meters, settings render as a calmer one-column system list, and browser smoke guards the quieter presentation.
- 2026-06-06: Added P22 real-play hardening: save imports preserve a local backup, the player silhouette better communicates dash/wall/air/run states, portrait touch controls detach below the playfield, mobile Room settings are clamped against cropping, and Pages opts into Node 24.

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
- Feel assists should expose trust: if a buffer, coyote, wall grace, Spark, or aim-memory window saves the player, the game should show that briefly.
- Practice data should help the player improve without adding menu friction.
- Review text should point to a concrete route line, not just a room number.
- End-of-run recommendations should be actionable without requiring the player to reopen settings.
- Drill completion should reflect the chosen training contract, not merely reaching the room exit.
- Expert completion should prove the authored high-skill line, not just a fast safe route.
- Failed practice contracts should restart the exact target quickly, without recording a false mastery win.
- Primary practice actions should launch a real contract, not a vague auto drill that can pass on any exit.
- Difficulty should diversify by play skill type: precision, rhythm, route reading, risk routing, recovery, and finale pressure should all be visible practice goals.
- Practice queues should turn review data into one-click next actions across clean, pace, style, and expert goals.
- Practice cards should show contract status, not just a destination room.
- Practice plans should chain the next three useful actions so the player can stay in flow without reading a full ledger.
- Death feedback should name a cause, prescribe one next input idea, and point to a Drill when practice is the right answer.
- Mastery tables should rank rooms by action priority, not by route order alone.
- First-input timing should require a neutral frame after spawn so held keys or controller drift cannot burn split time.
- Weak-room markers should point to action: current run mistakes use `!x`; persistent trouble uses `watch` plus the dominant failure reason.
- Practice recommendations should start with the first unplayed or non-S room, then move to persistent Focus pressure.
- Settings and practice controls must release held gameplay inputs before they take focus.
- Timers should reflect play, not menu reading time: idle starts and settings panels must not silently burn split seconds.
- Destructive practice actions need an undo-minded guard: data resets require confirmation and must announce the result.
- HUD decoration may be hidden from assistive tech, but real controls and counters inside the HUD must remain reachable and expose state.
- First-room onboarding must stay short, action-oriented, and mutually exclusive with other teaching cards.
- Assistive control options should improve access without silently changing PB, clean, or mastery rules.
- P2 challenge and profile UI must summarize existing PB/Clean/S/Style/Expert/Flow data; it must not create a parallel scoring system.
- Large development pushes should live on `codex/` branches and PRs so code, docs, checks, browser smoke, and release notes can be reviewed together.

## Precision Quality Gate

- Every room must pass automated size, tile, target, name, start, and summit-goal validation before publishing.
- Every practice feature must reduce uncertainty: show intent, show pace, or show route memory.
- New maps should add pressure gradually: safe intro, readable escalation, optional high-skill line, and a clean recovery path.
- Contract checks must guard room skill tags, Focus UI ids, touch directions, time-aware ghost data, HTML twin parity, and Pages pre-deploy checks.
- Online builds must be checked after push so the public URL is never treated as finished just because local checks pass.
- Public HTML must version CSS/JS assets whenever gameplay code changes, so a successful Pages deploy is actually visible to returning players.
- Feel Lab, route contracts, and audio controls must stay covered by DOM/helper/style contract checks so training entry points do not silently disappear.
- Local smoke should be runnable without the in-app Browser: it must boot the project server, load HTML/CSS/JS, and verify the current build version plus critical training markers.
- Browser smoke is the stronger local gate: keep it runnable through `npm run browser-smoke`, but do not make ordinary `npm run check` depend on a browser executable until CI/browser availability is controlled.
- Route audit is a lightweight substitute for non-human route review: keep `npm run route-audit` in the normal check path so map copy, route contracts, Feel Lab fixtures, transition guards, and route readability cannot silently drift.
- State check is the local guard for training semantics: keep `npm run state-check` in the normal check path whenever Drill, Route, Challenge, Feel, storage schema, or start-overlay resume behavior changes.
- Public demo readiness also needs the human layer: use `PLAYTEST_CHECKLIST.md` for first-run, ten-room, Route/Feel, mobile, and comfort passes, and keep `KNOWN_ISSUES.md` honest about remaining device or online checks.
- Feedback artifacts should be local and explicit: diagnostics snapshots, feedback templates, and save archives can support bug reports or browser migration, but they must not upload data, capture raw input history, collect controller IDs, store secrets, or refresh on invalid imports.

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
