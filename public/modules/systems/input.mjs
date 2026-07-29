const GAMEPAD_ACTIONS = ["left", "right", "up", "down", "jump", "dash", "grab", "recall"];
const GAMEPAD_EDGE_ACTIONS = ["jump", "dash", "grab", "recall"];

function gamepadButtonPressed(pad, index, threshold = 0.5) {
  return Boolean(pad?.buttons?.[index]?.pressed || pad?.buttons?.[index]?.value > threshold);
}

export function resolveGamepadState(pads, { supported, deadzone }) {
  const connectedPads = Array.from(pads || []).filter(Boolean);
  const pad = connectedPads[0] || null;
  const input = Object.fromEntries(GAMEPAD_ACTIONS.map((action) => [action, false]));

  if (pad) {
    const rawX = pad.axes?.[0] || 0;
    const rawY = pad.axes?.[1] || 0;
    const axisX = Math.abs(rawX) > deadzone ? rawX : 0;
    const axisY = Math.abs(rawY) > deadzone ? rawY : 0;
    input.left = axisX < -deadzone || gamepadButtonPressed(pad, 14);
    input.right = axisX > deadzone || gamepadButtonPressed(pad, 15);
    input.up = axisY < -deadzone || gamepadButtonPressed(pad, 12);
    input.down = axisY > deadzone || gamepadButtonPressed(pad, 13);
    input.jump = gamepadButtonPressed(pad, 0);
    input.dash = gamepadButtonPressed(pad, 1)
      || gamepadButtonPressed(pad, 2)
      || gamepadButtonPressed(pad, 7, 0.35);
    input.grab = gamepadButtonPressed(pad, 4)
      || gamepadButtonPressed(pad, 5)
      || gamepadButtonPressed(pad, 6, 0.35);
    input.recall = gamepadButtonPressed(pad, 3) || gamepadButtonPressed(pad, 8);
  }

  const rawX = pad?.axes?.[0] || 0;
  const rawY = pad?.axes?.[1] || 0;
  const axisMagnitude = Math.hypot(rawX, rawY);
  return {
    input,
    heldActions: GAMEPAD_EDGE_ACTIONS.filter((action) => input[action]),
    status: {
      supported,
      connected: Boolean(pad),
      count: connectedPads.length,
      standardMapping: connectedPads.filter((item) => item.mapping === "standard").length,
      axisX: Math.round(rawX * 100) / 100,
      axisY: Math.round(rawY * 100) / 100,
      axisMagnitude: Math.round(axisMagnitude * 100) / 100,
      driftRisk: Boolean(pad) && axisMagnitude > deadzone * 0.72 && axisMagnitude <= deadzone,
      activeActions: GAMEPAD_ACTIONS.filter((action) => input[action])
    }
  };
}

export function newlyPressedActions(previousHeld, nextHeld) {
  const previous = previousHeld instanceof Set ? previousHeld : new Set(previousHeld || []);
  return Array.from(nextHeld || []).filter((action) => !previous.has(action));
}

export function resolveMovementInput({
  left,
  right,
  up,
  down,
  grab
}) {
  return {
    x: Number(Boolean(right)) - Number(Boolean(left)),
    y: Number(Boolean(down)) - Number(Boolean(up)),
    grab: Boolean(grab)
  };
}

export function defaultBindingsForLayoutData(layout, layoutDefaults) {
  return { ...layoutDefaults[layout === "mac" ? "mac" : "pc"] };
}

export function presetBindingsForData(preset, layout, controlPresets) {
  const presetName = typeof preset === "string" && Object.hasOwn(controlPresets, preset)
    ? preset
    : "comfort";
  const layoutName = layout === "mac" ? "mac" : "pc";
  return controlPresets[presetName][layoutName];
}

export function effectiveBindingsData(settings, controlPresets) {
  return settings.controlsPreset === "custom"
    ? settings.customBindings
    : presetBindingsForData(settings.controlsPreset, settings.keyboardLayout, controlPresets);
}

export function validBindingCodeData(code, reservedCodes) {
  return typeof code === "string"
    && code.length > 0
    && code.length <= 32
    && !reservedCodes.has(code);
}

export function keyCodeLabelData(code, layout = "pc") {
  const common = {
    Space: "Space",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ShiftLeft: "Shift",
    ShiftRight: "Shift",
    ControlLeft: layout === "mac" ? "⌃ Control" : "Ctrl",
    ControlRight: layout === "mac" ? "⌃ Control" : "Ctrl",
    AltLeft: layout === "mac" ? "⌥ Option" : "Alt",
    AltRight: layout === "mac" ? "⌥ Option" : "Alt",
    MetaLeft: layout === "mac" ? "⌘ Command" : "Win",
    MetaRight: layout === "mac" ? "⌘ Command" : "Win",
    Backspace: layout === "mac" ? "Delete" : "Backspace"
  };
  if (common[code]) return common[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return `Num ${code.slice(6)}`;
  return String(code || "").replace(/(Left|Right)$/, "");
}

export function rebindActionData(bindings, actions, action, code) {
  const next = { ...bindings };
  const previousCode = next[action];
  const occupiedAction = actions.find((candidate) => candidate !== action && next[candidate] === code) || "";
  if (occupiedAction && previousCode) next[occupiedAction] = previousCode;
  next[action] = code;
  return { bindings: next, occupiedAction };
}

export function shouldBlockKeyData(code, {
  blockedCodes,
  controlsPreset,
  bindingActions,
  customBindings
}) {
  return blockedCodes.has(code)
    || (controlsPreset === "custom"
      && bindingActions.some((action) => customBindings?.[action] === code));
}

export function isStartCodeData(code, bindings) {
  return code === "Enter"
    || ["jump", "dash", "grab"].some((action) => bindings?.[action] === code);
}
