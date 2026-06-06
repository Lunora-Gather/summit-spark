# Release Checklist

Use this before publishing a public demo update.

1. Run `npm run check`.
2. Run `npm run state-check` if training state, resume, or storage schema changed.
3. Run `npm run browser-smoke` on a machine with Chrome or Edge.
4. Run `git diff --check`.
5. Confirm `index.html` and `summit-spark.html` are identical.
6. Confirm the build version in HTML and asset query strings matches the intended release.
7. Start `npm start` and open the local page once.
8. Verify the start button, direct resume button when progress exists, settings panel, one Route contract, one Feel Lab card, audio test, keyboard `O/Escape`, and settings close path.
9. Confirm settings opens with only Controls expanded by default; Audio, Display, Room, Feedback/Save, Profile, Training, and Advanced remain reachable.
10. Verify one Route interruption/resume and one Feel Lab interruption manually or through `npm run browser-smoke`.
11. Add a short feedback note, click the diagnostics copy button once, and confirm it produces a local feedback snapshot without uploading data.
12. Click feedback template copy once and confirm the template includes build, viewport, current training state, and blank reproduction fields.
13. Export a `summit-spark-save` archive, paste invalid JSON once to confirm the preview catches it without refreshing, then import a valid archive into a clean profile or rely on `npm run browser-smoke`; confirm settings/progress survive normalization and `summit-spark-save-backup` is written before overwrite.
14. Verify mobile viewport around 390x700 and 700x390 has no horizontal scroll or clipped settings controls, including the expanded Room settings group.
15. Verify touch controls use separate direction/action clusters, stay at least 44px, and sit below the portrait playfield on mobile.
16. Verify corrupted storage recovery by relying on `npm run browser-smoke` or manually seeding bad localStorage.
17. Run the relevant parts of `PLAYTEST_CHECKLIST.md` for any public demo release.
18. Update `KNOWN_ISSUES.md` if a manual pass finds friction that is real but not fixed in this release.
19. Update `README.md`, `ROADMAP.md`, `SUPER_PUSH_PLAN.md`, `PLAYTEST_CHECKLIST.md`, and `CHANGELOG.md` when user-facing behavior changes.
20. Confirm the Pages workflow keeps `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` and `node-version: 24` unless GitHub's runner guidance changes.
