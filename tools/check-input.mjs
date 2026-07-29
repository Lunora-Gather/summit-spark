#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import {
  defaultBindingsForLayoutData,
  effectiveBindingsData,
  clearInputEdges,
  clearInputBuffers,
  consumeInputBuffer,
  hasInputBuffer,
  inputHeldAny,
  inputPressedAny,
  isStartCodeData,
  keyCodeLabelData,
  newlyPressedActions,
  pressInput,
  presetBindingsForData,
  rebindActionData,
  releaseInput,
  releaseInputState,
  resolveGamepadState,
  resolveMovementInput,
  shouldBlockKeyData,
  setInputBuffer,
  syncInputHeld,
  tickInputBuffers,
  transitionDigitalInput,
  validBindingCodeData
} from "../public/modules/systems/input.mjs";

function button({ pressed = false, value = 0 } = {}) {
  return { pressed, value };
}

function pad({
  axes = [0, 0],
  mapping = "standard",
  buttons = {}
} = {}) {
  const values = Array.from({ length: 16 }, () => button());
  Object.entries(buttons).forEach(([index, value]) => {
    values[Number(index)] = button(value);
  });
  return { axes, mapping, buttons: values };
}

const idle = resolveGamepadState([], { supported: true, deadzone: 0.28 });
assert.equal(idle.status.supported, true);
assert.equal(idle.status.connected, false);
assert.deepEqual(idle.heldActions, []);
assert.ok(Object.values(idle.input).every((value) => value === false));

const axes = resolveGamepadState([
  pad({ axes: [-0.6, 0.7] }),
  pad({ mapping: "xinput" })
], { supported: true, deadzone: 0.28 });
assert.equal(axes.input.left, true);
assert.equal(axes.input.down, true);
assert.equal(axes.input.right, false);
assert.equal(axes.status.count, 2);
assert.equal(axes.status.standardMapping, 1);
assert.equal(axes.status.axisX, -0.6);
assert.equal(axes.status.axisY, 0.7);
assert.deepEqual(axes.status.activeActions, ["left", "down"]);

const buttons = resolveGamepadState([
  pad({
    axes: [0.2, 0],
    buttons: {
      0: { pressed: true },
      7: { value: 0.36 },
      6: { value: 0.36 },
      8: { pressed: true },
      15: { pressed: true }
    }
  })
], { supported: true, deadzone: 0.28 });
assert.equal(buttons.input.right, true);
assert.equal(buttons.input.jump, true);
assert.equal(buttons.input.dash, true);
assert.equal(buttons.input.grab, true);
assert.equal(buttons.input.recall, true);
assert.deepEqual(buttons.heldActions, ["jump", "dash", "grab", "recall"]);
assert.equal(buttons.status.driftRisk, false, "D-pad use should not create an axis drift warning");

const threshold = resolveGamepadState([
  pad({ buttons: { 7: { value: 0.35 }, 6: { value: 0.35 } } })
], { supported: true, deadzone: 0.28 });
assert.equal(threshold.input.dash, false, "trigger threshold remains strict");
assert.equal(threshold.input.grab, false, "trigger threshold remains strict");

const drift = resolveGamepadState([
  pad({ axes: [0.24, 0] })
], { supported: true, deadzone: 0.28 });
assert.equal(drift.input.right, false);
assert.equal(drift.status.driftRisk, true);

assert.deepEqual(
  newlyPressedActions(new Set(["jump", "grab"]), new Set(["jump", "dash", "recall"])),
  ["dash", "recall"]
);

const keyboardHeld = new Set();
const keyboardPressed = new Set();
assert.equal(pressInput(keyboardHeld, keyboardPressed, "Space"), true);
assert.equal(pressInput(keyboardHeld, keyboardPressed, "Space"), false, "key repeat must not create another edge");
assert.equal(inputHeldAny(keyboardHeld, ["KeyX", "Space"]), true);
assert.equal(inputPressedAny(keyboardPressed, ["Space"]), true);
clearInputEdges(keyboardPressed);
assert.equal(inputPressedAny(keyboardPressed, ["Space"]), false);
assert.equal(inputHeldAny(keyboardHeld, ["Space"]), true, "frame edge clearing must preserve held state");
assert.equal(releaseInput(keyboardHeld, "Space"), true);
assert.equal(releaseInput(keyboardHeld, "Space"), false);
assert.equal(pressInput(keyboardHeld, keyboardPressed, "Space"), true, "release must allow a fresh edge");

const touchInput = { jump: false, dash: false };
const touchEdges = new Set();
assert.deepEqual(transitionDigitalInput(touchInput, touchEdges, "jump", true), {
  pressed: true,
  released: false
});
assert.deepEqual(transitionDigitalInput(touchInput, touchEdges, "jump", true), {
  pressed: false,
  released: false
});
assert.deepEqual(transitionDigitalInput(touchInput, touchEdges, "jump", false), {
  pressed: false,
  released: true
});

const gamepadHeld = new Set(["jump", "grab"]);
const gamepadEdges = new Set();
assert.deepEqual(syncInputHeld(gamepadHeld, gamepadEdges, ["jump", "dash"]), ["dash"]);
assert.deepEqual(Array.from(gamepadHeld), ["jump", "dash"]);
assert.deepEqual(Array.from(gamepadEdges), ["dash"]);
assert.deepEqual(syncInputHeld(gamepadHeld, gamepadEdges, ["jump", "dash"]), []);

releaseInputState({
  heldSets: [keyboardHeld, gamepadHeld],
  pressedSets: [keyboardPressed, touchEdges, gamepadEdges],
  digitalStates: [touchInput]
});
assert.equal(keyboardHeld.size, 0);
assert.equal(gamepadHeld.size, 0);
assert.equal(keyboardPressed.size, 0);
assert.equal(touchEdges.size, 0);
assert.equal(gamepadEdges.size, 0);
assert.deepEqual(touchInput, { jump: false, dash: false }, "focus release must neutralize digital device state");

const buffers = { jumpBuffer: 0, dashBuffer: 0 };
assert.equal(setInputBuffer(buffers, "jump", 0.13), true);
assert.equal(setInputBuffer(buffers, "dash", 0.13), true);
assert.deepEqual(buffers, { jumpBuffer: 0.13, dashBuffer: 0.13 });
tickInputBuffers(buffers, 0.03);
assert.ok(Math.abs(buffers.jumpBuffer - 0.1) < 1e-10);
assert.ok(Math.abs(buffers.dashBuffer - 0.1) < 1e-10);
assert.equal(hasInputBuffer(buffers, "jump"), true);
assert.equal(consumeInputBuffer(buffers, "jump"), true);
assert.equal(hasInputBuffer(buffers, "jump"), false);
assert.equal(hasInputBuffer(buffers, "dash"), true, "consuming jump must preserve dash");
tickInputBuffers(buffers, 0.2);
assert.equal(buffers.dashBuffer, 0, "buffer countdown must clamp at zero");
assert.equal(setInputBuffer(buffers, "__proto__", 1), false, "unknown action names must not mutate state");
assert.equal(setInputBuffer(buffers, "jump", Number.NaN), true);
assert.equal(buffers.jumpBuffer, 0, "invalid duration must fail closed");
setInputBuffer(buffers, "jump", 0.13);
setInputBuffer(buffers, "dash", 0.13);
tickInputBuffers(buffers, -1);
assert.deepEqual(buffers, { jumpBuffer: 0.13, dashBuffer: 0.13 }, "negative frame time must not extend buffers");
clearInputBuffers(buffers);
assert.deepEqual(buffers, { jumpBuffer: 0, dashBuffer: 0 });

assert.deepEqual(resolveMovementInput({
  left: true,
  right: true,
  up: false,
  down: true,
  grab: "held"
}), { x: 0, y: 1, grab: true });

const layoutDefaults = {
  pc: { jump: "Space", dash: "ShiftLeft", grab: "KeyJ" },
  mac: { jump: "Space", dash: "KeyK", grab: "KeyJ" }
};
const presets = {
  comfort: { pc: layoutDefaults.pc, mac: layoutDefaults.mac },
  classic: {
    pc: { jump: "KeyC", dash: "KeyX", grab: "KeyZ" },
    mac: { jump: "KeyC", dash: "KeyX", grab: "KeyZ" }
  }
};
assert.deepEqual(defaultBindingsForLayoutData("unknown", layoutDefaults), layoutDefaults.pc);
assert.notEqual(defaultBindingsForLayoutData("pc", layoutDefaults), layoutDefaults.pc);
assert.equal(presetBindingsForData("classic", "mac", presets).jump, "KeyC");
assert.equal(
  presetBindingsForData("__proto__", "pc", presets).jump,
  "Space",
  "prototype names must not select inherited presets"
);
assert.equal(effectiveBindingsData({
  controlsPreset: "custom",
  keyboardLayout: "pc",
  customBindings: { jump: "KeyV" }
}, presets).jump, "KeyV");

const reserved = new Set(["Escape", "Tab"]);
assert.equal(validBindingCodeData("KeyV", reserved), true);
assert.equal(validBindingCodeData("Escape", reserved), false);
assert.equal(validBindingCodeData("", reserved), false);
assert.equal(validBindingCodeData("x".repeat(33), reserved), false);
assert.equal(keyCodeLabelData("MetaLeft", "mac"), "⌘ Command");
assert.equal(keyCodeLabelData("MetaLeft", "pc"), "Win");
assert.equal(keyCodeLabelData("KeyQ"), "Q");
assert.equal(keyCodeLabelData("Digit7"), "7");
assert.equal(keyCodeLabelData("Numpad4"), "Num 4");
assert.equal(keyCodeLabelData("ShiftRight"), "Shift");

const rebound = rebindActionData(
  { jump: "Space", dash: "KeyK", grab: "KeyJ" },
  ["jump", "dash", "grab"],
  "jump",
  "KeyK"
);
assert.deepEqual(rebound, {
  bindings: { jump: "KeyK", dash: "Space", grab: "KeyJ" },
  occupiedAction: "dash"
});
assert.equal(shouldBlockKeyData("KeyV", {
  blockedCodes: new Set(["Enter"]),
  controlsPreset: "custom",
  bindingActions: ["jump"],
  customBindings: { jump: "KeyV" }
}), true);
assert.equal(shouldBlockKeyData("KeyV", {
  blockedCodes: new Set(["Enter"]),
  controlsPreset: "comfort",
  bindingActions: ["jump"],
  customBindings: { jump: "KeyV" }
}), false);
assert.equal(isStartCodeData("Enter", {}), true);
assert.equal(isStartCodeData("Space", { jump: "Space" }), true);
assert.equal(isStartCodeData("KeyQ", { recall: "KeyQ" }), false);

console.log("Input module check passed: state edges/releases, action buffers, gamepad thresholds, drift, movement, presets and rebinding.");
