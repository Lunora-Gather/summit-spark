#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { loadRoomDataSnapshot } = require("./lib/read-summit-data");
const { validateRoomDataSnapshot } = require("./lib/validate-room-data");

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

const status = requireIncludes("docs/ROOM_DATA_P2_STATUS.md", [
  "Current runtime source",
  "Completed staging gates",
  "Required gates before source switch",
  "Next safe implementation step",
  "Still blocked",
  "Status summary",
  "tiny runtime compatibility seam insertion PR",
  "not ready for the actual runtime source switch yet"
]);

requireIncludes("docs/ROOM_DATA_MIGRATION.md", [
  "Phase 2: Runtime adapter design",
  "Phase 3: Runtime source switch"
]);

requireIncludes("docs/ROOM_DATA_SOURCE_SWITCH_READINESS.md", [
  "Required automated checks",
  "Required manual checks",
  "docs/ROOM_DATA_SOURCE_SWITCH_PLAYTEST.md"
]);

requireIncludes("docs/ROOM_DATA_SOURCE_SWITCH_PLAYTEST.md", [
  "R1-R10 route sanity",
  "Rollback notes"
]);

const requiredFiles = [
  "tools/check-room-data-migration.js",
  "tools/check-room-data-adapter-plan.js",
  "tools/check-room-data-runtime-view.js",
  "tools/check-room-data-legacy-constants.js",
  "tools/check-room-data-source-switch-readiness.js",
  "tools/check-room-data-source-switch-playtest-template.js",
  "tools/check-room-data-runtime-callsite-plan.js",
  "tools/check-room-data-runtime-compat-seam.js",
  "tools/check-room-data-seam-insertion-guide.js",
  "tools/check-room-data-seam-preflight.js",
  "tools/insert-room-data-runtime-seam.js",
  "tools/check-room-data-tool-registry.js",
  "tools/check-maintenance-tools.js",
  "tools/lib/room-data-runtime-view.js",
  "tools/lib/room-data-legacy-constants.js"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) push(`missing required P2 status file: ${file}`);
  if (!status.includes(file)) push(`P2 status should mention: ${file}`);
}

const insertionTool = requireIncludes("tools/insert-room-data-runtime-seam.js", [
  "--check",
  "--write",
  "createRoomDataRuntimeViewFromEmbeddedConstants",
  "const insertionAnchor = \"  const maps = [\""
]);

if (!insertionTool.includes("Object.freeze")) {
  push("seam insertion tool should preserve the frozen runtime-view shape");
}

const source = requireIncludes("summit-spark.js", [
  "const maps = ",
  "const ROOM_TARGETS = ",
  "const ROUTE_CONTRACTS = ",
  "const FEEL_REPLAY_FIXTURES = "
]);
if (!source.includes("const maps = ")) push("runtime still should keep embedded maps before source switch");

const snapshot = loadRoomDataSnapshot();
const validationErrors = validateRoomDataSnapshot(snapshot);
for (const error of validationErrors) push(error);

if (!Number.isInteger(snapshot.roomCount) || snapshot.roomCount !== snapshot.maps.length) {
  push("snapshot roomCount should match maps length");
}

if (errors.length > 0) {
  console.error("Room data P2 status check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Room data P2 status check passed: ${snapshot.roomCount} rooms, seam insertion tool documented, source switch still blocked.`);
