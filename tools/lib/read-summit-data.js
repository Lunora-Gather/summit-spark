"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const defaultRoomDataSourcePath = path.join(root, "public", "modules", "game", "room-data.mjs");
const defaultRuntimeSourcePath = path.join(root, "public", "summit-spark.js");
const defaultSnapshotPath = path.join(root, "data", "rooms.generated.json");

function readSource(sourcePath = defaultRoomDataSourcePath) {
  return fs.readFileSync(sourcePath, "utf8");
}

function hasGeneratedSnapshot(snapshotPath = defaultSnapshotPath) {
  return fs.existsSync(snapshotPath);
}

function readGeneratedSnapshot(snapshotPath = defaultSnapshotPath) {
  return JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
}

function extractConst(source, name, expectedStart) {
  const needle = `const ${name} = `;
  const start = source.indexOf(needle);
  if (start === -1) throw new Error(`Missing ${name}`);
  const expressionStart = source.indexOf(expectedStart, start);
  if (expressionStart === -1) throw new Error(`Missing ${expectedStart} for ${name}`);
  const open = source[expressionStart];
  const close = open === "[" ? "]" : "}";
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
    if (ch === open) depth += 1;
    if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        const expression = source.slice(expressionStart, i + 1);
        return Function("\"use strict\"; return (" + expression + ");")();
      }
    }
  }
  throw new Error(`Unclosed ${name}`);
}

function buildRoomDataSnapshotFromSources(
  roomDataSource = readSource(defaultRoomDataSourcePath),
  runtimeSource = readSource(defaultRuntimeSourcePath)
) {
  const maps = extractConst(roomDataSource, "maps", "[");
  return {
    generatedFrom: "public/modules/game/room-data.mjs + public/summit-spark.js",
    generatedBy: "tools/export-room-data.js",
    note: "Generated validation snapshot; canonical room content lives in room-data.mjs while training fixtures remain in summit-spark.js.",
    roomCount: maps.length,
    roomTargets: extractConst(roomDataSource, "ROOM_TARGETS", "["),
    roomNames: extractConst(roomDataSource, "ROOM_NAMES", "["),
    roomTiers: extractConst(roomDataSource, "ROOM_TIERS", "["),
    roomLandmarks: extractConst(roomDataSource, "ROOM_LANDMARKS", "["),
    roomSkills: extractConst(roomDataSource, "ROOM_SKILLS", "["),
    skillLabels: extractConst(roomDataSource, "SKILL_LABELS", "{"),
    roomGuides: extractConst(roomDataSource, "ROOM_GUIDES", "["),
    roomPurposes: extractConst(roomDataSource, "ROOM_PURPOSES", "["),
    roomRouteLines: extractConst(roomDataSource, "ROOM_ROUTE_LINES", "["),
    roomStyleTrials: extractConst(roomDataSource, "ROOM_STYLE_TRIALS", "["),
    expertRequirements: extractConst(roomDataSource, "EXPERT_REQUIREMENTS", "["),
    expertRequirementLabels: extractConst(roomDataSource, "EXPERT_REQUIREMENT_LABELS", "{"),
    routeContracts: extractConst(runtimeSource, "ROUTE_CONTRACTS", "["),
    feelReplayFixtures: extractConst(runtimeSource, "FEEL_REPLAY_FIXTURES", "["),
    maps
  };
}

function loadRoomDataSnapshot(options = {}) {
  const {
    preferGenerated = true,
    snapshotPath = defaultSnapshotPath,
    sourcePath = defaultRoomDataSourcePath,
    runtimeSourcePath = defaultRuntimeSourcePath
  } = options;

  if (preferGenerated && hasGeneratedSnapshot(snapshotPath)) {
    return readGeneratedSnapshot(snapshotPath);
  }

  return buildRoomDataSnapshotFromSources(readSource(sourcePath), readSource(runtimeSourcePath));
}

function buildRoomDataSnapshot(
  roomDataSource = readSource(defaultRoomDataSourcePath),
  runtimeSource = readSource(defaultRuntimeSourcePath)
) {
  return buildRoomDataSnapshotFromSources(roomDataSource, runtimeSource);
}

function normalizeSnapshot(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

module.exports = {
  root,
  defaultRoomDataSourcePath,
  defaultRuntimeSourcePath,
  defaultSnapshotPath,
  readSource,
  hasGeneratedSnapshot,
  readGeneratedSnapshot,
  extractConst,
  buildRoomDataSnapshot,
  buildRoomDataSnapshotFromSources,
  loadRoomDataSnapshot,
  normalizeSnapshot
};
