"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const rooms = require("../../public/modules/game/room-data.mjs");
const defaultRuntimeSourcePath = path.join(root, "public", "summit-spark.js");
const defaultSnapshotPath = path.join(root, "data", "rooms.generated.json");

function extractTrainingArray(source, name) {
  const needle = `const ${name} = `;
  const start = source.indexOf(needle);
  if (start === -1) throw new Error(`Missing ${name}`);
  const expressionStart = source.indexOf("[", start);
  if (expressionStart === -1) throw new Error(`Missing array for ${name}`);
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = expressionStart; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        const expression = source.slice(expressionStart, i + 1);
        return Function("\"use strict\"; return (" + expression + ");")();
      }
    }
  }
  throw new Error(`Unclosed ${name}`);
}

function buildRoomDataSnapshot() {
  const runtimeSource = fs.readFileSync(defaultRuntimeSourcePath, "utf8");
  const { maps } = rooms;
  return {
    generatedFrom: "public/modules/game/room-data.mjs + public/summit-spark.js",
    generatedBy: "tools/export-room-data.js",
    note: "Generated validation snapshot; canonical room content lives in room-data.mjs while training fixtures remain in summit-spark.js.",
    roomCount: maps.length,
    roomTargets: rooms.ROOM_TARGETS,
    roomNames: rooms.ROOM_NAMES,
    roomTiers: rooms.ROOM_TIERS,
    chapterSurfaceKinds: rooms.CHAPTER_SURFACE_KINDS,
    roomLandmarks: rooms.ROOM_LANDMARKS,
    roomSkills: rooms.ROOM_SKILLS,
    skillLabels: rooms.SKILL_LABELS,
    mechanicFirstTouchCues: rooms.MECHANIC_FIRST_TOUCH_CUES,
    roomLightSteps: rooms.ROOM_LIGHT_STEPS,
    roomGuides: rooms.ROOM_GUIDES,
    roomPurposes: rooms.ROOM_PURPOSES,
    roomRouteLines: rooms.ROOM_ROUTE_LINES,
    roomStyleTrials: rooms.ROOM_STYLE_TRIALS,
    expertRequirements: rooms.EXPERT_REQUIREMENTS,
    expertRequirementLabels: rooms.EXPERT_REQUIREMENT_LABELS,
    routeContracts: extractTrainingArray(runtimeSource, "ROUTE_CONTRACTS"),
    feelReplayFixtures: extractTrainingArray(runtimeSource, "FEEL_REPLAY_FIXTURES"),
    maps
  };
}

function loadRoomDataSnapshot() {
  return JSON.parse(fs.readFileSync(defaultSnapshotPath, "utf8"));
}

function normalizeSnapshot(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

module.exports = {
  root,
  defaultSnapshotPath,
  buildRoomDataSnapshot,
  loadRoomDataSnapshot,
  normalizeSnapshot
};
