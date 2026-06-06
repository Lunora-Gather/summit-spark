# Changelog

## 2026-06-06 - p22

- Bumped public build assets to `20260606-p22`.
- Save import now writes a local `summit-spark-save-backup` before replacing settings, profile, room times, paths, and Focus data.
- Added clearer player state framing for dash direction, wall contact, airborne posture, and running foot motion without changing physics.
- Moved portrait touch controls below the playfield and added browser smoke coverage so mobile thumbs do not cover the 16:9 stage.
- Clamped mobile Room settings, route notes, and coach rows so narrow portrait settings do not crop text or controls.
- Opted the Pages workflow into Node 24 for both project runtime and GitHub JavaScript action compatibility.

## 2026-06-06 - p21

- Bumped public build assets to `20260606-p21`.
- Added stage play-mode classes so free play can use a quieter HUD while Drill, Route, Feel, and challenge runs keep advanced training meters.
- Reworked settings into a calmer one-column system list with lighter system typography, clearer rows, and toggle-style switches.
- Simplified the start overlay presentation so the first screen feels like a game entry point instead of a boxed instruction panel.
- Added smoke/contract/browser guards for the quiet HUD and one-column settings surface.

## 2026-06-05 - p20

- Bumped public build assets to `20260605-p20`.
- Split mobile touch controls into direction and action clusters with safer hit targets.
- Added non-sensitive gamepad axis magnitude and near-deadzone status for real controller tuning.
- Reduced default audio gains so movement and death feedback are less fatiguing.
- Improved late-room wind, crumble, and prism readability without adding default tutorial copy.
- Simplified the finish review surface: primary cards stay visible, extra review detail and the mastery roadmap are collapsible.

## 2026-06-05 - p19

- Bumped public build assets to `20260605-p19`.
- Quieted normal gameplay by removing visible fall/death correction cards, route arrows, death marks, death replays, and first-input timing prompts.
- Reworked settings into a controls-first system panel: Controls is the only default-open group, with Audio and Display split into separate groups.
- Updated smoke, contract, route, and Feel checks so quality gates preserve the quiet play mode instead of requiring old coaching overlays.
- Refined settings typography, spacing, and button weights toward a cleaner single-column options surface.

## 2026-06-05 - p18

- Bumped public build assets to `20260605-p18`.
- Removed explanatory start-screen copy and the visible control guide.
- Defaulted all settings groups to collapsed so the panel opens as a cleaner system-style index.
- Suppressed automatic beginner/death coaching toasts; necessary storage, diagnostics, and error feedback remains.
- Lightened UI typography and canvas HUD text from heavy 800/900 weights toward a calmer system-font hierarchy.
- Replaced the large room-intro teaching card with a compact room/target chip that does not render behind the start screen.

## 2026-06-05 - p17

- Bumped public build assets to `20260605-p17`.
- Reduced start-screen copy and first-room onboarding prompts.
- Reworked settings into grouped disclosure sections so only Training and Room are open by default.
- Toned down the blue/glow-heavy visual treatment toward a calmer graphite and warm-neutral hierarchy.
- Browser smoke now opens collapsed groups before testing controls, feedback, save import/export, Route, and Feel paths.

## 2026-06-05 - p16

- Bumped public build assets to `20260605-p16`.
- Added live save-import preview status for pasted `summit-spark-save` JSON.
- Save import preview summarizes source build, summit clears, room PB count, Flow, and touch size before import.
- Invalid JSON and wrong archive kinds now fail in place without refreshing the page.
- Browser smoke now verifies invalid import guards, wrong-kind errors, useful valid previews, and normalized import.

## 2026-06-05 - p15

- Bumped public build assets to `20260605-p15`.
- Added a feedback-template copy button that turns the current diagnostics context into a paste-ready report outline.
- Added local save archive copy/download/import for `summit-spark-save` JSON with schema normalization on import.
- Added non-sensitive gamepad status and gamepad diagnostics summary without collecting controller IDs.
- Browser smoke now verifies save export/import, feedback templates, mobile visual overflow guards, and gamepad diagnostics.

## 2026-06-05 - p14

- Bumped public build assets to `20260605-p14`.
- Added feedback type and a short feedback note field to the review section.
- Diagnostics snapshots now include the current feedback type and sanitized note.
- Fixed settings hotkey isolation so typing `O` in the feedback note stays inside the textarea instead of toggling the settings panel.
- Browser smoke now verifies feedback note hotkey isolation and diagnostics note capture.

## 2026-06-05 - p13

- Bumped public build assets to `20260605-p13`.
- Added a settings-panel diagnostics copy button for local playtest feedback.
- Diagnostics snapshots include build, settings, viewport, storage presence, current run state, Route/Feel/Challenge summary, and progress counts.
- Diagnostics intentionally exclude user identity, user agent, raw input history, replay paths, and secrets.
- Browser smoke now clicks the diagnostics button and verifies the generated snapshot shape.
- HTTP smoke and contract checks now require diagnostics UI and helpers.

## 2026-06-05 - p12

- Bumped public build assets to `20260605-p12`.
- Extended browser smoke to verify keyboard-only settings access through `O` and `Escape`.
- Extended browser smoke to verify Route contract interruption, visible "继续上次" recovery, and resumed contract launch.
- Extended browser smoke to verify Feel Lab interruption remains visible after switching to another Drill.
- Added `PLAYTEST_CHECKLIST.md` for first-three-minutes, ten-room, Route/Feel, mobile, and comfort manual passes.
- Added `KNOWN_ISSUES.md` for real human/device verification limits and low-value next steps to avoid.
- Contract check now requires the manual playtest and known-issues docs to stay linked from release surfaces.

## 2026-06-04 - p11

- Added direct "继续 Rn Drill" resume action on the start overlay.
- Added settings schema versions and migrated room Focus storage to a versioned envelope while keeping old arrays readable.
- Added low-performance mode that reduces visual particle/background budget without changing gameplay rules.
- Added touch button size setting.
- Added `npm run state-check` for Drill/Route/Challenge/Feel transition semantics.
- Extended browser smoke to cover direct resume, schema migration, mobile landscape settings, and finish review scroll safety.

## 2026-06-04 - p10

- Added route audit gate: `npm run route-audit` checks ten-room route readability, route contracts, Feel Lab fixtures, transition guards, and key visual helpers.
- Extended browser smoke to verify canvas pixels, keyboard movement, corrupted-storage toast, mobile settings fit, and gamepad deadzone mock.
- Added gamepad deadzone setting in the training cockpit.
- Made interrupted Route contracts show an explicit "继续上次" badge.
- Added one-shot storage repair toast while preserving non-blocking play.
- Moved training cleanup into a small `TRAINING_TRANSITIONS` table.
- Prioritized finish review cards for mobile readability.
- Added directional arrows to failure ghost lines.
- Strengthened Wall Spark and Prism Spark visual pulses.

## 2026-06-04 - p9

- Added headless browser smoke for start/settings/Feel Lab/route/mobile/storage paths.
- Hardened Route contract generation guards and Flow challenge state.
- Normalized corrupted storage inputs and improved mobile viewport handling.

## 2026-06-03 - p5-p8

- Added Feel Lab, route contracts, audio test, HTTP smoke, storage recovery, and mobile-safe settings cards.
- Added action audio, Spark variants, failure rehearsal ghost lines, chapter resonance, and landing/platform quality checks.
