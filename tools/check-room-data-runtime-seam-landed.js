#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "summit-spark.js");
const seamName = "createRoomDataRuntimeViewFromEmbeddedConstants";
const errors = [];

function push(message) {
  errors.push(message);
}

function countOccurrences(content, needle) {
  return content.split(needle).length - 1;
}

if (!fs.existsSync(sourcePath)) {
  push("summit-spark.js is missing");
} else {
  const source = fs.readFileSync(sourcePath, "utf8");
  if (countOccurrences(source, `function ${seamName}()`) !== 1) {
    push(`expected exactly one ${seamName} function after seam insertion`);
  }
  for (const expected of [
    "roomCount: maps.length",
    "maps,",
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
    "feelReplayFixtures: FEEL_REPLAY_FIXTURES"
  ]) {
    if (!source.includes(expected)) push(`landed seam should include: ${expected}`);
  }
  if (!source.includes("const maps = [")) {
    push("embedded maps should remain present after seam insertion");
  }
  if (source.includes("data/rooms.generated.json")) {
    push("landed seam should not switch runtime to generated JSON");
  }
  if (source.includes("fetch(\"data/rooms.generated.json\")") || source.includes("fetch('data/rooms.generated.json')")) {
    push("landed seam should not introduce runtime fetch for room data");
  }
}

if (errors.length > 0) {
  console.error("Room data runtime seam landed check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Room data runtime seam landed check passed: seam is present and runtime source remains embedded.");
