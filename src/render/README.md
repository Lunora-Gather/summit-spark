# render

Target home for Canvas drawing code after data, pure helpers, and UI boundaries are stable.

Potential future modules:

- `canvas.js`: logical size, scale, viewport setup
- `draw-world.js`: tiles, hazards, relay, wind, prism, echo, crumble
- `draw-player.js`: player body, direction, state pulse, action readability
- `draw-feedback.js`: ghost, route lines, particles, split and mastery visual feedback

Rendering extraction is high risk because it can hide route information even when physics still works. Use browser smoke plus targeted manual room checks for changes here.
