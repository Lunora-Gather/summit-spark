#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { loadRoomDataSnapshot } = require("./lib/read-summit-data");
const { validateRoomDataSnapshot } = require("./lib/validate-room-data");
const { createRoomDataRuntimeView } = require("./lib/room-data-runtime-view");
const { createLegacyRoomDataConstants } = require("./lib/room-data-legacy-constants");

const root = path.resolve(__dirname, "..");
const errors = [];

const runtimeToLegacyPairs = [
  ["maps", "maps"],
  ["roomTargets", "ROOM_TARGETS"],
  ["roomNames", "ROOM_NAMES"],
  ["roomTiers", "ROOM_TIERS"],
  ["roomSkills", "ROOM_SKILLS"],
  ["skillLabels", "SKILL_LABELS"],
  ["roomGuides", "ROOM_GUIDES"],
  ["roomPurposes", "ROOM_PURPOSES"],
  ["roomRouteLines", "ROOM_ROUTE_LINES"],
  ["roomStyleTrials", "ROOM_STYLE_TRIALS"],
  ["expertRequirements", "EXPERT_REQUIREMENTS"],
  ["expertRequirementLabels", "EXPERT_REQUIREMENT_LABELS"],
  ["routeContracts", "ROUTE_CONTRACTS"],
  ["feelReplayFixtures", "FEEL_REPLAY_FIXTURES"]
];

function push(message) {
  errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireIncludes(relativePath, expected) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    push(`missing required file: ${relativePath}`);
    return "";
  }
  const content = read(relativePath);
  for (const item of expected) {
    if (!content.includes(item)) push(`${relativePath} should include: ${item}`);
  }
  return content;
}

const seamDoc = requireIncludes("docs/ROOM_DATA_RUNTIME_COMPAT_SEAM.md", [
  "Room Data Runtime Compatibility Seam",
  "Proposed seam fields",
  "Required behavior",
  "does not change the runtime data source",
  "one PR revert"
]);

requireIncludes("summit-spark.js", runtimeToLegacyPairs.map((pair) => {
  const legacyName = pair[1];
  return legacyName === "maps" ? "const maps = " : `const ${legacyName} = `;
}));

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

if (view && legacy) {
  if (view.roomCount !== view.maps.length) push("runtime view roomCount should match maps length");
  for (const [runtimeField, legacyName] of runtimeToLegacyPairs) {
    if (legacy[legacyName] !== view[runtimeField]) {
      push(`${legacyName} should preserve runtime field ${runtimeField}`);
    }
    if (!seamDoc.includes(runtimeField)) {
      push(`seam doc should include runtime field ${runtimeField}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Room data runtime compat seam check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Room data runtime compat seam check passed: ${runtimeToLegacyPairs.length} embedded constants mapped by fixture.`);
