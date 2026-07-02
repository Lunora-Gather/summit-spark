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

const planDoc = requireIncludes("docs/ROOM_DATA_RUNTIME_CALLSITE_PLAN.md", [
  "Current boundary",
  "Allowed call-site PR",
  "Not allowed",
  "Required checks before call-site PR merge",
  "No source switch is included",
  "Rollback remains one PR revert"
]);

const source = requireIncludes("summit-spark.js", [
  "const maps = ",
  "const ROOM_TARGETS = ",
  "const ROOM_NAMES = ",
  "const ROOM_TIERS = ",
  "const ROOM_SKILLS = ",
  "const SKILL_LABELS = ",
  "const ROOM_GUIDES = ",
  "const ROOM_PURPOSES = ",
  "const ROOM_ROUTE_LINES = ",
  "const ROOM_STYLE_TRIALS = ",
  "const EXPERT_REQUIREMENTS = ",
  "const EXPERT_REQUIREMENT_LABELS = ",
  "const ROUTE_CONTRACTS = ",
  "const FEEL_REPLAY_FIXTURES = "
]);

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
  const pairs = [
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
  for (const [runtimeField, legacyName] of pairs) {
    if (legacy[legacyName] !== view[runtimeField]) {
      push(`${legacyName} should preserve runtime field ${runtimeField}`);
    }
  }
}

for (const forbidden of [
  "data/rooms.generated.json is the runtime source",
  "fetch(\"data/rooms.generated.json",
  "import ",
  "type=\"module\""
]) {
  if (source.includes(forbidden)) push(`runtime call-site plan should not already include source switch marker: ${forbidden}`);
}

if (!planDoc.includes("Reading room data from `data/rooms.generated.json` in runtime")) {
  push("call-site plan should forbid reading generated JSON in runtime during this staging step");
}
if (!planDoc.includes("Removing embedded constants from `summit-spark.js`")) {
  push("call-site plan should forbid removing embedded constants during the call-site step");
}

if (errors.length > 0) {
  console.error("Room data runtime call-site plan check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Room data runtime call-site plan check passed: call-site seam planned without source switch.");
