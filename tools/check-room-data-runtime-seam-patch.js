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
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    push(`missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

const patch = read("patches/room-data-runtime-seam.patch");
const insertionTool = read("tools/insert-room-data-runtime-seam.js");
const compatDoc = read("docs/ROOM_DATA_RUNTIME_COMPAT_SEAM.md");

for (const expected of [
  "diff --git a/summit-spark.js b/summit-spark.js",
  "createRoomDataRuntimeViewFromEmbeddedConstants",
  "roomCount: maps.length",
  "roomTargets: ROOM_TARGETS",
  "roomNames: ROOM_NAMES",
  "roomTiers: ROOM_TIERS",
  "roomSkills: ROOM_SKILLS",
  "skillLabels: SKILL_LABELS",
  "roomGuides: ROOM_GUIDES",
  "roomPurposes: ROOM_PURPOSES",
  "roomRouteLines: ROOM_ROUTE_LINES",
  "roomStyleTrials: ROOM_STYLE_TRIALS",
  "expertRequirements: EXPERT_REQUIREMENTS",
  "expertRequirementLabels: EXPERT_REQUIREMENT_LABELS",
  "routeContracts: ROUTE_CONTRACTS",
  "feelReplayFixtures: FEEL_REPLAY_FIXTURES",
  "const maps = ["
]) {
  if (!patch.includes(expected)) push(`runtime seam patch should include: ${expected}`);
}

for (const normalizedField of [
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
  if (!patch.includes(normalizedField)) push(`runtime seam patch should include normalized field: ${normalizedField}`);
  if (!compatDoc.includes(normalizedField)) push(`compat seam doc should include normalized field: ${normalizedField}`);
}

if (!insertionTool.includes("createRoomDataRuntimeViewFromEmbeddedConstants")) {
  push("insertion tool should still insert the same seam function name");
}
if (!insertionTool.includes("roomCount: maps.length")) {
  push("insertion tool should still derive roomCount from embedded maps");
}
if (!patch.includes("+  function createRoomDataRuntimeViewFromEmbeddedConstants()")) {
  push("runtime seam patch should add, not remove, the seam function");
}

if (errors.length > 0) {
  console.error("Room data runtime seam patch check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Room data runtime seam patch check passed: patch, insertion tool, and fixture fields are aligned.");
