# Known Issues

This file tracks real limits, not speculative wishlist items. Move an item here only when it affects public demo confidence or needs human/device verification beyond local scripts.

## Needs Human Or Device Verification

- Physical gamepad feel: automated gates cover movement, deadzone and the complete pause/retry/room-restart/recall mapping, and Settings reports non-sensitive connection status, but a real controller pass is still needed for stick drift, chord comfort and long-session grab fatigue.
- Real touch device feel: the iOS Safari simulator job checks entry layout, notch insets and the account field with the software keyboard. Use a physical phone or tablet to verify portrait and landscape play, thumb reach, accidental presses, retry, R9 recall and toolbar movement.
- Full 10-room human pass: Safari replays a continuous unassisted ten-room, all-Lumen climb. An uninterrupted first-time human playthrough is still needed before treating difficulty and teaching order as public-test stable.
- Audio perception: headless smoke can verify unavailable/recovered AudioContext paths, status updates and static checkpoint/wind-entry/two-stage crumble triggers, but their volume balance, separation and fatigue still need a real listening pass.
- Diagnostics, feedback templates and summit run reports are local-only: they can include the current feedback note, viewport/training/gamepad summary, or bounded run timing evidence as appropriate, but there is no automatic upload or issue tracker integration.

- Old open tabs from before p312 can still issue legacy last-write-wins uploads. Reload every device before using cloud sync concurrently. Current clients stage uploads in transactions, reject stale versions and concurrent commits, and ask which save to use; conflicts are not automatically merged.

## Current Product Boundaries

- Deployment freshness is a release gate rather than a human-play issue: `npm run live-check` compares every canonical online `public/` file with the local release and also verifies the build, CSP, pinned SDK and fixed-hair invariant.
- The demo is a 10-room vertical slice, not a complete chapter campaign.
- Route contracts and Feel Lab are local training tools; they do not yet produce exportable replay data.
- Progress remains local-first and intentionally lightweight; signed-in players also receive private Appwrite cloud sync whose conflict guard covers customized settings, profile/challenges, PBs, paths, every Focus/Drill/death counter, best time and Flow, while local JSON/cloud replacement writes a browser-side backup and atomically rolls all save keys back if any replacement write fails.
- Low-performance mode uses a 1x canvas buffer, fewer particles and no live compositor, filter, or canvas-shadow blur. If a low-end device still struggles, the next investigation should profile draw-call and update cost rather than simplify gameplay.
- During the first R7 to R8 playthrough, record whether the player can see stable rock beyond the crumbling ice before committing to the crossing. Record the room, input device and viewport for any missed landing.

## Not Worth Fixing Right Now

- Adding more rooms before one human pass clears R1-R10 with useful feedback. More content would hide route readability problems.
- Adding a second achievement system. Chapter completion and long-term challenges already reuse PB/Clean/S/Style/Expert/Flow data.
- Making `npm run check` itself require a browser executable. Pull-request and Pages workflows run `npm run browser-smoke` as a separate release job, while the default check stays usable in constrained local environments.
