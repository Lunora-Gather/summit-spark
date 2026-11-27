# Release Checklist

Use this before publishing a public demo update. Deterministic behavior belongs to automation; manual checks are reserved for perception, comfort and real-device evidence.

## Automated Gate

1. Run `npm run check`.
2. For daily debugging, use background, headless WebKit with `npm run test:webkit`. See the [README](README.md#质量检查) for the first-time install.
   Verify the candidate commit in native Safari on a remote Mac or on the user's Mac with their consent for this run. Before launching, activating or controlling their Safari, ask and wait for explicit consent. Then append `-- --allow-local-safari` to the local native test command. Record the commit, host and result. If neither host has completed verification, report “原生 Safari 验证仍待完成”.
   The PR runs `npm run test:safari` and `npm run browser-smoke` on GitHub-hosted macOS. The Pages workflow also requires its own remote `npm run browser-smoke` to pass before packaging.
3. Run `git diff --check`.
4. Confirm `public/index.html` is the only HTML entry and its build meta, CSS query, main-script query and all runtime module queries use the intended release version.
5. If Appwrite configuration changed, verify the live project and private save table against `appwrite.config.json` before pushing.

The two automated gates already own deterministic coverage for controls, hidden-panel stability, account recovery, cloud conflicts, large archives, atomic save rollback, mobile safe areas, keyboard-resized forms, focus traps, disclosure semantics, real keyboard movement, mocked gamepad deadzones, reduced-motion preference, low-performance rendering, Route interruption/resume, Feel interruption, R1–R10 authored state transitions and the fixed climber-hair invariant. Do not repeat those cases manually unless the related implementation changed or automation reports a failure.

## Focused Human Gate

1. Start locally and complete the three-minute first-run check in `PLAYTEST_CHECKLIST.md`. Confirm a clean keyboard profile does not show a redundant Move → Jump → Dash strip, while labelled touch controls remain the only persistent input labels on touch.
2. For gameplay, room, effect or audio changes, run the relevant ten-room route section. Record real friction instead of adjusting physics or geometry from speculation.
3. For UI changes, inspect only the affected desktop and mobile surfaces. At the 64px setting, touch controls must remain reachable and separated.
4. For motion or visual-effect changes, inspect the operating system's reduced-motion preference, Calm Effects and low-performance mode without accepting hidden hazards or lost action confirmation.
5. For account changes, complete one real email flow. Browser mocks are sufficient for unchanged account code.
6. For feedback/save changes, use the diagnostics copy button, feedback template, one invalid import preview and one backup restore. Confirm nothing uploads automatically.
7. Listen to changed cues on real speakers or headphones; automation proves trigger order, not balance or fatigue.
8. Use a physical phone/tablet or gamepad when the release claims improved device feel. Emulation and mocked gamepads are not evidence for thumb reach, drift or long-session comfort.

## Deploy And Verify

1. Update `README.md`, `PLAYTEST_CHECKLIST.md`, `KNOWN_ISSUES.md` and `CHANGELOG.md` when their user-facing facts changed.
2. Push `main` and wait for the Pages workflow to succeed without Node compatibility warnings.
3. Run `npm run live-check`. It must match every canonical file in local `public/`, the build version, CSP, pinned Appwrite SDK and fixed `#294657` hair invariant.
4. Set `SUMMIT_SPARK_URL` to the deployed Pages URL and run `npm run test:webkit` to exercise the public guest entry and summit route in the background. Repeat the real Appwrite email flow only when auth or deployment configuration changed.
5. Run the relevant parts of `PLAYTEST_CHECKLIST.md` for a public demo release and move reproducible unresolved friction to `KNOWN_ISSUES.md`.

Do not bypass a failed gate by weakening assertions, deleting coverage or silently accepting an older online build.
