#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "summit-spark.js");
const errors = [];

const beforeAnchor = "  const TRAINING_TRANSITIONS = Object.freeze({";
const afterAnchor = "  const maps = [";

const requiredRuntimeFields = [
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
];

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
  if (countOccurrences(source, beforeAnchor) !== 1) {
    push("expected exactly one training transition anchor before maps");
  }
  if (countOccurrences(source, afterAnchor) !== 1) {
    push("expected exactly one maps anchor after room-data constants");
  }
  const beforeIndex = source.indexOf(beforeAnchor);
  const afterIndex = source.indexOf(afterAnchor);
  if (beforeIndex < 0 || afterIndex < 0 || beforeIndex >= afterIndex) {
    push("expected training transition anchor to appear before maps anchor");
  }
  for (const constantName of [
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
  ]) {
    if (!source.includes(`const ${constantName} = `)) push(`missing embedded constant: ${constantName}`);
  }
}

const fixture = fs.readFileSync(path.join(root, "docs", "ROOM_DATA_RUNTIME_COMPAT_SEAM.md"), "utf8");
for (const field of requiredRuntimeFields) {
  if (!fixture.includes(field)) push(`compat seam fixture should include field: ${field}`);
}

const insertionGuide = fs.readFileSync(path.join(root, "docs", "ROOM_DATA_SEAM_INSERTION_GUIDE.md"), "utf8");
if (!insertionGuide.includes("small and localized near room-data constants")) {
  push("seam insertion guide should keep the future runtime diff small and localized");
}

if (errors.length > 0) {
  console.error("Room data seam preflight failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Room data seam preflight passed: stable anchors and fixture fields are ready for insertion.");
