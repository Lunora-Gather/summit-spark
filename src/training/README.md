# training

Target home for training-domain logic after the data contract layer is stable.

Potential future modules:

- `focus.js`: room Focus profile, weak-room recommendation, mastery summary
- `drills.js`: Clean, Pace, Style, Expert contract resolution
- `routes.js`: Route contract queue, interruption, resume state
- `feel-lab.js`: Feel Lab cards and replay fixture semantics

Training extraction must keep Practice separate from quiet free-play HUD. Do not move UI rendering and state mutation in the same PR unless the diff is small and browser smoke coverage is clear.
