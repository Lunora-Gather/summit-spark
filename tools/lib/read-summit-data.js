"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const defaultSourcePath = path.join(root, "summit-spark.js");
const defaultSnapshotPath = path.join(root, "data", "rooms.generated.json");

function readSource(sourcePath = defaultSourcePath) {
  return fs.readFileSync(sourcePath, "utf8");
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

function buildRoomDataSnapshot(source = readSource()) {
  const maps = extractConst(source, "maps", "[");
  return {
    generatedFrom: "summit-spark.js",
    generatedBy: "tools/export-room-data.js",
    note: "Do not edit by hand until the runtime source of truth moves out of summit-spark.js.",
    roomCount: maps.length,
    roomTargets: extractConst(source, "ROOM_TARGETS", "["),
    roomNames: extractConst(source, "ROOM_NAMES", "["),
    roomTiers: extractConst(source, "ROOM_TIERS", "["),
    roomSkills: extractConst(source, "ROOM_SKILLS", "["),
    skillLabels: extractConst(source, "SKILL_LABELS", "{"),
    roomGuides: extractConst(source, "ROOM_GUIDES", "["),
    roomPurposes: extractConst(source, "ROOM_PURPOSES", "["),
    roomRouteLines: extractConst(source, "ROOM_ROUTE_LINES", "["),
    roomStyleTrials: extractConst(source, "ROOM_STYLE_TRIALS", "["),
    expertRequirements: extractConst(source, "EXPERT_REQUIREMENTS", "["),
    expertRequirementLabels: extractConst(source, "EXPERT_REQUIREMENT_LABELS", "{"),
    routeContracts: extractConst(source, "ROUTE_CONTRACTS", "["),
    feelReplayFixtures: extractConst(source, "FEEL_REPLAY_FIXTURES", "["),
    maps
  };
}

function normalizeSnapshot(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

module.exports = {
  root,
  defaultSourcePath,
  defaultSnapshotPath,
  readSource,
  extractConst,
  buildRoomDataSnapshot,
  normalizeSnapshot
};
