#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "summit-spark.js");
const write = process.argv.includes("--write");
const check = process.argv.includes("--check");
const errors = [];

const insertionAnchor = "  const maps = [";
const seamName = "createRoomDataRuntimeViewFromEmbeddedConstants";
const seamBlock = `
  function createRoomDataRuntimeViewFromEmbeddedConstants() {
    return Object.freeze({
      roomCount: maps.length,
      maps,
      roomTargets: ROOM_TARGETS,
      roomNames: ROOM_NAMES,
      roomTiers: ROOM_TIERS,
      roomSkills: ROOM_SKILLS,
      skillLabels: SKILL_LABELS,
      roomGuides: ROOM_GUIDES,
      roomPurposes: ROOM_PURPOSES,
      roomRouteLines: ROOM_ROUTE_LINES,
      roomStyleTrials: ROOM_STYLE_TRIALS,
      expertRequirements: EXPERT_REQUIREMENTS,
      expertRequirementLabels: EXPERT_REQUIREMENT_LABELS,
      routeContracts: ROUTE_CONTRACTS,
      feelReplayFixtures: FEEL_REPLAY_FIXTURES
    });
  }
`;

function push(message) {
  errors.push(message);
}

function countOccurrences(content, needle) {
  return content.split(needle).length - 1;
}

function applySeam(source) {
  if (source.includes(`function ${seamName}()`)) {
    return { source, inserted: false, alreadyPresent: true };
  }
  if (countOccurrences(source, insertionAnchor) !== 1) {
    push("expected exactly one maps anchor for seam insertion");
    return { source, inserted: false, alreadyPresent: false };
  }
  return {
    source: source.replace(insertionAnchor, `${seamBlock}\n${insertionAnchor}`),
    inserted: true,
    alreadyPresent: false
  };
}

if (!fs.existsSync(sourcePath)) {
  push("summit-spark.js is missing");
} else {
  const source = fs.readFileSync(sourcePath, "utf8");
  const result = applySeam(source);

  if (check) {
    if (result.alreadyPresent) {
      push("runtime seam is already present; use normal checks instead of insertion preflight");
    }
    if (!result.inserted) {
      push("runtime seam could not be inserted cleanly");
    }
  }

  if (write) {
    if (!result.inserted) {
      push("no seam was inserted; refusing to write");
    } else {
      fs.writeFileSync(sourcePath, result.source);
      console.log(`Inserted ${seamName} into summit-spark.js.`);
    }
  } else if (!check && result.inserted) {
    console.log(`Dry run passed: ${seamName} can be inserted into summit-spark.js. Run with --write to apply.`);
  }
}

if (errors.length > 0) {
  console.error("Room data runtime seam insertion tool failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (check) {
  console.log("Room data runtime seam insertion check passed: seam can be inserted cleanly.");
}
