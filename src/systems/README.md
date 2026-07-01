# systems

Target home for side-effect systems once low-risk data extraction is complete.

Potential future modules:

- `input.js`: keyboard, touch, gamepad, hotkey guards, buffers
- `storage.js`: localStorage schema, save archive import/export, backup restore
- `audio.js`: audio enablement, volume, test path, feedback sounds
- `diagnostics.js`: local diagnostics and feedback templates

These areas are high risk. Any extraction here must preserve browser smoke coverage and all existing storage/input boundaries.
