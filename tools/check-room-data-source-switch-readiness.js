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

const readinessDoc = requireIncludes("docs/ROOM_DATA_SOURCE_SWITCH_READINESS.md", [
  "Current state",
  "Required automated checks",
  "Required manual checks",
  "Source-switch PR boundaries",
  "Rollback plan",
  "Merge readiness checklist",
  "R1-R10 route sanity pass",
  "Save export/import round trip",
  "npm run browser-smoke"
]);

const migrationDoc = requireIncludes("docs/ROOM_DATA_MIGRATION.md", [
  "Phase 2: Runtime adapter design",
  "Phase 3: Runtime source switch",
  "Runtime adapter helpers are staged"
]);

const source = requireIncludes("summit-spark.js", [
  "const maps = ",
  "const ROOM_TARGETS = ",
  "const ROOM_NAMES = ",
  "const ROUTE_CONTRACTS = ",
  "const FEEL_REPLAY_FIXTURES = ",
  "TRAINING_TRANSITIONS",
  "SETTINGS_SCHEMA_VERSION",
  "ROOM_FOCUS_SCHEMA_VERSION"
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
  if (legacy.maps !== view.maps) push("legacy maps should preserve runtime-view maps reference");
  if (legacy.ROOM_TARGETS !== view.roomTargets) push("legacy ROOM_TARGETS should preserve runtime-view roomTargets reference");
  if (legacy.ROOM_NAMES !== view.roomNames) push("legacy ROOM_NAMES should preserve runtime-view roomNames reference");
  if (legacy.ROUTE_CONTRACTS !== view.routeContracts) push("legacy ROUTE_CONTRACTS should preserve runtime-view routeContracts reference");
  if (legacy.FEEL_REPLAY_FIXTURES !== view.feelReplayFixtures) push("legacy FEEL_REPLAY_FIXTURES should preserve runtime-view feelReplayFixtures reference");
}

if (!readinessDoc.includes("source-switch PR must not include unrelated gameplay")) {
  push("readiness doc should forbid unrelated gameplay/content changes in the source-switch PR");
}
if (!readinessDoc.includes("Revert the source-switch PR")) {
  push("readiness doc should include a concrete rollback path");
}
if (!source.includes("const maps = ")) {
  push("runtime should still expose embedded maps until the source-switch PR lands");
}

if (errors.length > 0) {
  console.error("Room data source-switch readiness check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Room data source-switch readiness check passed: switch gate documented and current runtime source remains unchanged.");
