# Known Issues

This file tracks real limits, not speculative wishlist items. Move an item here only when it affects public demo confidence or needs human/device verification beyond local scripts.

## Needs Human Or Device Verification

- Physical gamepad feel: automated gates cover movement, deadzone and the complete pause/retry/room-restart/recall mapping, and Settings reports non-sensitive connection status, but a real controller pass is still needed for stick drift, chord comfort and long-session grab fatigue.
- Real touch device feel: mobile smoke covers the larger portrait camera crop, portrait/landscape fit, synthetic notch/home-indicator insets, keyboard-resized account input, retry commands, contextual R9 recall and touch UI visibility; a physical phone or tablet pass is still needed for thumb reach, accidental presses, and vendor-specific browser chrome behavior.
- Full 10-room human pass: scripts verify maps, state, and UI surfaces, but at least one uninterrupted human playthrough is still required before treating difficulty and teaching order as public-test stable.
- Audio perception: headless smoke can verify the audio test path updates status and static gates cover checkpoint, wind-entry and two-stage crumble triggers, but their volume balance, separation and fatigue still need a real listening pass.
- Diagnostics, feedback templates and summit run reports are local-only: they can include the current feedback note, viewport/training/gamepad summary, or bounded run timing evidence as appropriate, but there is no automatic upload or issue tracker integration.

## Current Product Boundaries

- Deployment freshness is a release gate rather than a human-play issue: `npm run live-check` compares every canonical online `public/` file with the local release and also verifies the build, CSP, pinned SDK and fixed-hair invariant.
- The demo is a 10-room vertical slice, not a complete chapter campaign.
- Route contracts and Feel Lab are local training tools; they do not yet produce exportable replay data.
- Progress remains local-first and intentionally lightweight; signed-in players also receive private Appwrite cloud sync whose conflict guard covers customized settings, profile/challenges, PBs, paths, every Focus/Drill/death counter, best time and Flow, while local JSON/cloud replacement writes a browser-side backup and atomically rolls all save keys back if any replacement write fails.
- Low-performance mode uses a 1x canvas buffer, fewer particles and no live compositor, filter, or canvas-shadow blur. If a low-end device still struggles, the next investigation should profile draw-call and update cost rather than simplify gameplay.
- The R7→R8 pressure curve is intentionally demanding; p281–p288 add a longer mechanic read-in, explicit first-focus copy, spawn self-healing, runtime finite-state/collection recovery, bounded audio cleanup, a frame-loop recovery boundary and interrupted-touch release, but a full uninterrupted human route is still required before tuning authored geometry or targets. Do not treat a single death as evidence that the curve is unfair.

## Not Worth Fixing Right Now

- Adding more rooms before one human pass clears R1-R10 with useful feedback. More content would hide route readability problems.
- Adding a second achievement system. Chapter completion and long-term challenges already reuse PB/Clean/S/Style/Expert/Flow data.
- Making `npm run check` itself require a browser executable. Pull-request and Pages workflows run `npm run browser-smoke` as a separate release job, while the default check stays usable in constrained local environments.
