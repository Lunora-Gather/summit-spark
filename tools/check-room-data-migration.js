#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];

function push(message) {
  errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function requireIncludes(relativePath, expected) {
  if (!exists(relativePath)) {
    push(`missing required file: ${relativePath}`);
    return "";
  }
  const content = read(relativePath);
  for (const item of expected) {
    if (!content.includes(item)) push(`${relativePath} should include: ${item}`);
  }
  return content;
}

const migrationDoc = requireIncludes("docs/ROOM_DATA_MIGRATION.md", [
  "Current source of truth",
  "Migration phases",
  "Phase 0: Snapshot staging",
  "Phase 1: Preferred-source checks",
  "Phase 2: Runtime adapter design",
  "issue #2"
]);

const source = requireIncludes("summit-spark.js", [
  "const maps = ",
  "const ROOM_TARGETS = ",
  "const ROOM_NAMES = ",
  "const ROOM_ROUTE_LINES = ",
  "const ROOM_STYLE_TRIALS = ",
  "const ROUTE_CONTRACTS = ",
  "const FEEL_REPLAY_FIXTURES = "
]);

const reader = requireIncludes("tools/lib/read-summit-data.js", [
  "buildRoomDataSnapshotFromSource",
  "loadRoomDataSnapshot",
  "hasGeneratedSnapshot",
  "readGeneratedSnapshot"
]);

const exporter = requireIncludes("tools/export-room-data.js", [
  "buildRoomDataSnapshot",
  "normalizeSnapshot",
  "--check",
  "--write"
]);
if (exporter.includes("loadRoomDataSnapshot")) {
  push("tools/export-room-data.js should remain source-only so snapshot drift can be detected");
}

for (const checker of [
  "tools/check-data-contracts.js",
  "tools/check-maps.js",
  "tools/check-route-audit.js",
  "tools/report-room-data.js"
]) {
  const content = requireIncludes(checker, ["loadRoomDataSnapshot"]);
  if (content.includes("buildRoomDataSnapshot(") && checker !== "tools/report-room-data.js") {
    push(`${checker} should use the preferred room-data loader instead of rebuilding from source`);
  }
}

if (exists("data/rooms.generated.json")) {
  let snapshot = null;
  try {
    snapshot = JSON.parse(read("data/rooms.generated.json"));
  } catch (error) {
    push(`data/rooms.generated.json is not valid JSON: ${error.message}`);
  }
  if (snapshot) {
    if (snapshot.generatedFrom !== "summit-spark.js") {
      push("data/rooms.generated.json should identify summit-spark.js as the staged source until the runtime source moves");
    }
    if (!Number.isInteger(snapshot.roomCount) || snapshot.roomCount <= 0) {
      push("data/rooms.generated.json should include a positive integer roomCount");
    }
    if (!Array.isArray(snapshot.maps) || snapshot.maps.length !== snapshot.roomCount) {
      push("data/rooms.generated.json maps length should match roomCount");
    }
  }
} else {
  push("missing generated staging snapshot: data/rooms.generated.json");
}

if (!migrationDoc.includes("Runtime still reads")) {
  push("docs/ROOM_DATA_MIGRATION.md should explicitly state the current runtime source");
}
if (!reader.includes("preferGenerated = true")) {
  push("tools/lib/read-summit-data.js should prefer generated snapshots for checks once present");
}
if (!source.includes("TRAINING_TRANSITIONS")) {
  push("summit-spark.js should keep runtime training transitions explicit during this migration");
}

if (errors.length > 0) {
  console.error("Room data migration check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Room data migration check passed: staged snapshot and runtime source guardrails verified.");
