# Release Checklist

Use this before publishing a public demo update.

1. Run `npm run check`.
2. Run `npm run state-check` if training state, resume, or storage schema changed.
3. Run `npm run browser-smoke` on a machine with Chrome or Edge.
4. Run `git diff --check`.
5. Confirm `index.html` and `summit-spark.html` are identical.
6. Confirm the build version in HTML and asset query strings matches the intended release.
7. Start `npm start` and open the local page once.
8. Verify the start button, direct resume button when progress exists, settings panel, practice panel, one Route contract, one Feel Lab card, audio test, keyboard `O/P/Escape`, and both panel close paths.
9. Create one custom keyboard binding, switch Windows/Linux → Mac → Windows/Linux, and confirm the custom preset and every binding remain unchanged; only Restore Layout may load platform defaults.
10. Send an email OTP, edit the email before submitting, and confirm the old code/token is cleared and no session request is made; repeat with an autofill-style value change or rely on `npm run browser-smoke` to verify the submit-time identity guard.
11. Inspect the account method switch with accessibility tooling or rely on `npm run browser-smoke`: it must be one labelled button group, expose only one pressed choice, update that state after switching, and give every account field a name, autocomplete purpose, and live-status description.
12. Seed local data separately with only a Focus/Drill counter, only a recorded room path, and only a customized setting, then restore a signed-in account with a different cloud save or rely on `npm run browser-smoke`; each case must stop at “待确认” without applying the remote save.
13. Confirm settings opens with only system groups visible: Controls, Audio, Display, and Feedback/Save. Confirm the practice panel owns Room, Route, Feel, Profile, Training, and Advanced.
14. Inspect every settings/practice disclosure with accessibility tooling or rely on `npm run browser-smoke`: its name must exclude the decorative chevron, hidden-mode groups must not leak anonymous arrow text, and `aria-expanded` must match the real open state after both clicking and programmatic mode changes.
15. Verify one Route interruption/resume and one Feel Lab interruption manually or through `npm run browser-smoke`.
16. Add a short feedback note, click the diagnostics copy button once, and confirm it produces a local feedback snapshot without uploading data.
17. Click feedback template copy once and confirm the template includes build, viewport, current training state, and blank reproduction fields.
18. Export a `summit-spark-save` archive, paste invalid JSON once to confirm the preview catches it without refreshing, then import a valid archive into a clean profile or rely on `npm run browser-smoke`; confirm settings/progress survive normalization, `summit-spark-save-backup` is written before overwrite, the Restore action can recover that backup, and a simulated mid-write storage rejection rolls every save key back without reloading.
19. Verify mobile viewport around 390x700 and 700x390 has no horizontal scroll or clipped controls in both the settings and practice panels, including the expanded Room group.
20. Verify touch controls use separate direction/action clusters, stay at least 44px, and sit below the portrait playfield on mobile; at the 64px setting, every button must remain inside 390px width with Jump/Dash paired.
21. On a notched-device emulator or through `npm run browser-smoke`, verify the entry chooser and settings/account drawer remain inside top, right, bottom, and left safe areas; shrink the portrait viewport to about 390x420 and confirm the focused email field remains reachable while the drawer body scrolls.
22. Verify a clean keyboard profile shows only the compact bottom Move → Jump → Dash strip, that it exits after real input, and that labelled touch controls suppress it.
23. Toggle the operating system's reduced-motion preference manually or through `npm run browser-smoke`; confirm UI/ambient motion quiets without hiding gameplay movement, hazards, or action confirmation. Confirm the entry and settings small-text contrast samples remain at or above 4.5:1.
24. Toggle low-performance mode and confirm the canvas switches to a 1x buffer, the canvas filter and gameplay overlay backdrop filters become `none`, canvas shadow blur is budgeted to zero, and HUD, tips, touch controls, hazards, and route guidance remain readable.
25. Verify corrupted storage recovery by relying on `npm run browser-smoke` or manually seeding bad localStorage.
26. Run the relevant parts of `PLAYTEST_CHECKLIST.md` for any public demo release.
27. Update `KNOWN_ISSUES.md` if a manual pass finds friction that is real but not fixed in this release.
28. Update `README.md`, `PLAYTEST_CHECKLIST.md`, `RELEASE_CHECKLIST.md`, `KNOWN_ISSUES.md`, and `CHANGELOG.md` when user-facing behavior changes.
29. Confirm the Pages workflow keeps `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` and `node-version: 24` unless GitHub's runner guidance changes.
