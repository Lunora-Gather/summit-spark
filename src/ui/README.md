# ui

Target home for DOM and panel update logic after lower-risk data extraction is stable.

Potential future modules:

- `dom.js`: required element lookup and DOM references
- `hud.js`: run HUD, split, meters, Flow, death count
- `settings-panel.js`: controls, audio, display, feedback, save management
- `practice-panel.js`: room picker, Drill, Route, Feel, profile, training, advanced
- `responsive.js`: touch sizing, viewport guards, mobile panel fit

UI extraction must preserve the current product boundary: free play stays quiet, Practice owns training detail.
