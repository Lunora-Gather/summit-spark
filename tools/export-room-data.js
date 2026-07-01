#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "summit-spark.js");
const outputPath = path.join(root, "data", "rooms.generated.json");
const source = fs.readFileSync(sourcePath, "utf8");

function extractConst(name, expectedStart) {
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

function buildSnapshot() {
  const maps = extractConst("maps", "[");
  const snapshot = {
    generatedFrom: "summit-spark.js",
    generatedBy: "tools/export-room-data.js",
    note: "Do not edit by hand until the runtime source of truth moves out of summit-spark.js.",
    roomCount: maps.length,
    roomTargets: extractConst("ROOM_TARGETS", "["),
    roomNames: extractConst("ROOM_NAMES", "["),
    roomTiers: extractConst("ROOM_TIERS", "["),
    roomSkills: extractConst("ROOM_SKILLS", "["),
    skillLabels: extractConst("SKILL_LABELS", "{"),
    roomGuides: extractConst("ROOM_GUIDES", "["),
    roomPurposes: extractConst("ROOM_PURPOSES", "["),
    roomRouteLines: extractConst("ROOM_ROUTE_LINES", "["),
    roomStyleTrials: extractConst("ROOM_STYLE_TRIALS", "["),
    expertRequirements: extractConst("EXPERT_REQUIREMENTS", "["),
    expertRequirementLabels: extractConst("EXPERT_REQUIREMENT_LABELS", "{"),
    routeContracts: extractConst("ROUTE_CONTRACTS", "["),
    feelReplayFixtures: extractConst("FEEL_REPLAY_FIXTURES", "["),
    maps
  };
  return snapshot;
}

function normalize(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

function main() {
  const args = new Set(process.argv.slice(2));
  const snapshot = buildSnapshot();
  const json = normalize(snapshot);

  if (args.has("--write")) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, json);
    console.log(`Wrote ${path.relative(root, outputPath)} with ${snapshot.roomCount} rooms.`);
    return;
  }

  if (args.has("--check")) {
    if (fs.existsSync(outputPath)) {
      const current = fs.readFileSync(outputPath, "utf8").replace(/\r\n/g, "\n");
      if (current !== json) {
        console.error("Room data snapshot is out of date. Run: node tools/export-room-data.js --write");
        process.exit(1);
      }
      console.log(`Room data snapshot check passed: ${snapshot.roomCount} rooms.`);
      return;
    }
    console.log(`Room data export check passed: ${snapshot.roomCount} rooms. No snapshot committed yet.`);
    return;
  }

  process.stdout.write(json);
}

main();
