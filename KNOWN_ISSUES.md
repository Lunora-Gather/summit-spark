# Known Issues

This file tracks real limits, not speculative wishlist items. Move an item here only when it affects public demo confidence or needs human/device verification beyond local scripts.

## Needs Human Or Device Verification

- Physical gamepad feel: browser smoke mocks a standard gamepad and deadzone logic, and the settings panel now reports non-sensitive connection status, but a real controller pass is still needed for stick drift, button layout comfort, and long-session grab fatigue.
- Real touch device feel: mobile smoke covers portrait/landscape fit, synthetic notch/home-indicator insets, keyboard-resized account input, contextual R9 recall and touch UI visibility; a physical phone or tablet pass is still needed for thumb reach, accidental presses, and vendor-specific browser chrome behavior.
- Full 10-room human pass: scripts verify maps, state, and UI surfaces, but at least one uninterrupted human playthrough is still required before treating difficulty and teaching order as public-test stable.
- Online Pages freshness: local HTML asset versioning and the SHA-pinned native Node 24 Pages chain are guarded, but after any push the public URL still needs one live check to confirm it serves the intended build.
- Audio perception: headless smoke can verify the audio test path updates status, but volume balance and fatigue need a real listening pass.
- Diagnostics, feedback templates and summit run reports are local-only: they can include the current feedback note, viewport/training/gamepad summary, or bounded run timing evidence as appropriate, but there is no automatic upload or issue tracker integration.

## Current Product Boundaries

- The demo is a 10-room vertical slice, not a complete chapter campaign.
- Route contracts and Feel Lab are local training tools; they do not yet produce exportable replay data.
- Progress remains local-first and intentionally lightweight; signed-in players also receive private Appwrite cloud sync whose conflict guard covers customized settings, profile/challenges, PBs, paths, every Focus/Drill/death counter, best time and Flow, while local JSON/cloud replacement writes a browser-side backup and atomically rolls all save keys back if any replacement write fails.
- Low-performance mode uses a 1x canvas buffer, fewer particles and no live compositor, filter, or canvas-shadow blur. If a low-end device still struggles, the next investigation should profile draw-call and update cost rather than simplify gameplay.

## Not Worth Fixing Right Now

- Adding more rooms before one human pass clears R1-R10 with useful feedback. More content would hide route readability problems.
- Adding a second achievement system. Chapter completion and long-term challenges already reuse PB/Clean/S/Style/Expert/Flow data.
- Making `npm run check` require a browser executable. Browser smoke remains available as a stronger local gate, but the default check should stay runnable in constrained CI.
