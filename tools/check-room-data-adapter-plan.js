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

const adapterDoc = requireIncludes("docs/ROOM_DATA_RUNTIME_ADAPTER.md", [
  "Current runtime contract",
  "Proposed adapter shape",
  "createRoomDataRuntimeView",
  "No gameplay tuning",
  "Runtime still reads the old embedded constants"
]);

const migrationDoc = requireIncludes("docs/ROOM_DATA_MIGRATION.md", [
  "Phase 2: Runtime adapter design",
  "Phase 3: Runtime source switch"
]);

const source = requireIncludes("summit-spark.js", [
  "const maps = ",
  "const ROOM_TARGETS = ",
  "const ROOM_NAMES = ",
  "const ROUTE_CONTRACTS = ",
  "const FEEL_REPLAY_FIXTURES = "
]);

for (const field of [
  "roomCount",
  "maps",
  "roomTargets",
  "roomNames",
  "roomTiers",
  "roomSkills",
  "skillLabels",
  "roomGuides",
  "roomPurposes",
  "roomRouteLines",
  "roomStyleTrials",
  "expertRequirements",
  "expertRequirementLabels",
  "routeContracts",
  "feelReplayFixtures"
]) {
  if (!adapterDoc.includes(field)) push(`docs/ROOM_DATA_RUNTIME_ADAPTER.md should document adapter field: ${field}`);
}

if (!adapterDoc.includes("No module or bundler migration")) {
  push("docs/ROOM_DATA_RUNTIME_ADAPTER.md should forbid bundler/module migration in the adapter step");
}
if (!adapterDoc.includes("No async loading path")) {
  push("docs/ROOM_DATA_RUNTIME_ADAPTER.md should keep the first adapter synchronous");
}
if (!migrationDoc.includes("Status: planned")) {
  push("docs/ROOM_DATA_MIGRATION.md should keep later phases planned until implementation PRs land");
}
if (!source.includes("TRAINING_TRANSITIONS")) {
  push("summit-spark.js should keep runtime training transitions explicit while adapter design is staged");
}

if (errors.length > 0) {
  console.error("Room data adapter plan check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Room data adapter plan check passed: runtime adapter boundary documented without source switch.");
