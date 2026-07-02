#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { loadRoomDataSnapshot } = require("./lib/read-summit-data");
const { validateRoomDataSnapshot } = require("./lib/validate-room-data");
const { createRoomDataRuntimeView } = require("./lib/room-data-runtime-view");
const {
  legacyRoomDataConstantMap,
  legacyRoomDataConstantNames,
  createLegacyRoomDataConstants
} = require("./lib/room-data-legacy-constants");

const root = path.resolve(__dirname, "..");
const errors = [];

function push(message) {
  errors.push(message);
}

const snapshot = loadRoomDataSnapshot();
const validationErrors = validateRoomDataSnapshot(snapshot);
for (const error of validationErrors) push(error);

let view = null;
let legacy = null;
try {
  view = createRoomDataRuntimeView(snapshot);
  legacy = createLegacyRoomDataConstants(view);
} catch (error) {
  push(error.message);
}

const expectedLegacyNames = [
  "maps",
  "ROOM_TARGETS",
  "ROOM_NAMES",
  "ROOM_TIERS",
  "ROOM_SKILLS",
  "SKILL_LABELS",
  "ROOM_GUIDES",
  "ROOM_PURPOSES",
  "ROOM_ROUTE_LINES",
  "ROOM_STYLE_TRIALS",
  "EXPERT_REQUIREMENTS",
  "EXPERT_REQUIREMENT_LABELS",
  "ROUTE_CONTRACTS",
  "FEEL_REPLAY_FIXTURES"
];

if (legacy) {
  for (const legacyName of expectedLegacyNames) {
    if (!(legacyName in legacy)) push(`legacy constants are missing: ${legacyName}`);
  }

  if (Object.keys(legacy).length !== expectedLegacyNames.length) {
    push("legacy constants should expose only the current runtime room-data constants");
  }

  for (const [runtimeField, legacyName] of Object.entries(legacyRoomDataConstantMap)) {
    if (legacy[legacyName] !== view[runtimeField]) {
      push(`${legacyName} should preserve the reference from runtime field ${runtimeField}`);
    }
  }

  if (!Object.isFrozen(legacy)) push("legacy constants object should be frozen to avoid accidental mutation");
}

for (const legacyName of expectedLegacyNames) {
  if (!legacyRoomDataConstantNames.includes(legacyName)) {
    push(`legacyRoomDataConstantNames should include ${legacyName}`);
  }
}

const helperSource = fs.readFileSync(path.join(root, "tools", "lib", "room-data-legacy-constants.js"), "utf8");
for (const forbidden of [
  "document",
  "window",
  "localStorage",
  "sessionStorage",
  "canvas",
  "Audio",
  "requestAnimationFrame",
  "setTimeout",
  "setInterval",
  "fetch("
]) {
  if (helperSource.includes(forbidden)) {
    push(`legacy constants helper should stay pure and not reference ${forbidden}`);
  }
}

if (!helperSource.includes("createLegacyRoomDataConstants") || !helperSource.includes("legacyRoomDataConstantMap")) {
  push("legacy constants helper should export createLegacyRoomDataConstants and legacyRoomDataConstantMap");
}

if (!helperSource.includes("createRoomDataRuntimeView")) {
  push("legacy constants helper should build on the runtime view helper instead of duplicating adapter validation");
}

if (errors.length > 0) {
  console.error("Room data legacy constants check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Room data legacy constants check passed: ${expectedLegacyNames.length} runtime constants mapped without source switch.`);
