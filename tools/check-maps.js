#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "summit-spark.js"), "utf8");
const errors = [];

function extractArray(name) {
  const needle = "const " + name + " = ";
  const start = source.indexOf(needle);
  if (start === -1) throw new Error("Missing " + name);
  const arrayStart = source.indexOf("[", start);
  if (arrayStart === -1) throw new Error("Missing array for " + name);
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (let i = arrayStart; i < source.length; i += 1) {
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
        return Function("\"use strict\"; return (" + source.slice(arrayStart, i + 1) + ");")();
      }
    }
  }
  throw new Error("Unclosed array for " + name);
}

const maps = extractArray("maps");
const targets = extractArray("ROOM_TARGETS");
const names = extractArray("ROOM_NAMES");
const expertRequirements = extractArray("EXPERT_REQUIREMENTS");
const styleTrials = extractArray("ROOM_STYLE_TRIALS");
const colsMatch = source.match(/const COLS = (\d+);/);
const rowsMatch = source.match(/const ROWS = (\d+);/);
const cols = colsMatch ? Number(colsMatch[1]) : 30;
const rows = rowsMatch ? Number(rowsMatch[1]) : 17;
const allowed = new Set(".#^v<>SLRAPTHUBMC".split(""));
let goalCount = 0;
let startCount = 0;
const pressureScores = [];
const crumbleRooms = [];

function isPassable(tile) {
  return tile !== "#" && tile !== "C" && tile !== "^" && tile !== "v" && tile !== "<" && tile !== ">";
}

function hasLeftGap(room) {
  return room.some((line) => isPassable(line[0]));
}

function hasRightGap(room) {
  return room.some((line) => isPassable(line[cols - 1]));
}

if (maps.length !== targets.length) errors.push("ROOM_TARGETS has " + targets.length + ", maps has " + maps.length);
if (maps.length !== names.length) errors.push("ROOM_NAMES has " + names.length + ", maps has " + maps.length);
if (maps.length !== expertRequirements.length) errors.push("EXPERT_REQUIREMENTS has " + expertRequirements.length + ", maps has " + maps.length);
if (maps.length !== styleTrials.length) errors.push("ROOM_STYLE_TRIALS has " + styleTrials.length + ", maps has " + maps.length);

maps.forEach((room, roomIndex) => {
  if (!Array.isArray(room)) {
    errors.push("room " + (roomIndex + 1) + " is not an array");
    return;
  }
  if (room.length !== rows) errors.push("room " + (roomIndex + 1) + " has " + room.length + " rows, expected " + rows);
  let pressure = 0;
  let crumbleCount = 0;
  if (roomIndex > 0 && !hasLeftGap(room)) errors.push("room " + (roomIndex + 1) + " has no left entry gap");
  if (roomIndex < maps.length - 1 && !hasRightGap(room)) errors.push("room " + (roomIndex + 1) + " has no right exit gap");
  room.forEach((line, y) => {
    if (typeof line !== "string") {
      errors.push("room " + (roomIndex + 1) + " row " + (y + 1) + " is not a string");
      return;
    }
    if (line.length !== cols) {
      errors.push("room " + (roomIndex + 1) + " row " + (y + 1) + " has " + line.length + " cols, expected " + cols);
    }
    [...line].forEach((tile, x) => {
      if (!allowed.has(tile)) errors.push("room " + (roomIndex + 1) + " has unknown tile \"" + tile + "\" at " + (x + 1) + "," + (y + 1));
      if ("^v<>".includes(tile)) pressure += 1;
      if (tile === "A") pressure += 3;
      if (tile === "U" || tile === "B" || tile === "C") pressure += 3;
      if (tile === "C") crumbleCount += 1;
      if (tile === "M" || tile === "T") pressure += 2;
      if (tile === "S") startCount += 1;
      if (tile === "H") goalCount += 1;
    });
  });
  pressureScores[roomIndex] = pressure;
  crumbleRooms[roomIndex] = crumbleCount;
});

if (startCount !== 1) errors.push("expected exactly one S start, found " + startCount);
if (goalCount !== 1) errors.push("expected exactly one H summit goal, found " + goalCount);
if (!maps[maps.length - 1]?.some((line) => line.includes("H"))) errors.push("summit goal H must be in the final room");

const earlyPressure = pressureScores.slice(0, 3).reduce((sum, value) => sum + value, 0) / 3;
const midPressure = pressureScores.slice(3, 6).reduce((sum, value) => sum + value, 0) / 3;
const latePressure = pressureScores.slice(-3).reduce((sum, value) => sum + value, 0) / 3;
if (!(midPressure >= earlyPressure + 2)) {
  errors.push("mid-room pressure should exceed early-room pressure through mechanic combinations");
}
if (!(latePressure >= midPressure + 20)) {
  errors.push("late-room pressure must clearly exceed mid-room pressure");
}
for (let i = 0; i < Math.min(6, maps.length); i += 1) {
  if (maps[i].some((line) => line.includes("C"))) errors.push("crumble C should not appear before room 7");
}
for (let i = 6; i < maps.length; i += 1) {
  if ((crumbleRooms[i] || 0) < 3) errors.push("late room " + (i + 1) + " should use at least 3 crumble tiles");
}
if (!(targets[targets.length - 1] >= targets[0] + 12)) {
  errors.push("final room target should be at least 12 seconds above room 1 target");
}
for (let i = 1; i < targets.length; i += 1) {
  if (targets[i] + 0.001 < targets[i - 1]) errors.push("room targets should not decrease at room " + (i + 1));
}

for (let i = 0; i < targets.length; i += 1) {
  if (!(targets[i] > 0)) errors.push("target " + (i + 1) + " must be positive");
  if (typeof names[i] !== "string" || names[i].length === 0) errors.push("room name " + (i + 1) + " is empty");
}

const requirementTiles = {
  relay: "A",
  relayChain: "A",
  spring: "T",
  updraft: "U",
  prism: "B",
  echo: "M",
  crumble: "C"
};
const allowedRequirements = new Set(["spark", "relay", "relayChain", "spring", "updraft", "prism", "echo", "recall", "crumble"]);
expertRequirements.forEach((requirements, roomIndex) => {
  if (!Array.isArray(requirements)) {
    errors.push("expert requirements for room " + (roomIndex + 1) + " must be an array");
    return;
  }
  if (requirements.length === 0) errors.push("expert requirements for room " + (roomIndex + 1) + " should not be empty");
  for (const requirement of requirements) {
    if (!allowedRequirements.has(requirement)) {
      errors.push("room " + (roomIndex + 1) + " has unknown expert requirement " + requirement);
      continue;
    }
    const tile = requirementTiles[requirement];
    if (tile && !maps[roomIndex].some((line) => line.includes(tile))) {
      errors.push("room " + (roomIndex + 1) + " requires " + requirement + " but has no " + tile + " tile");
    }
  }
});

const styleKinds = new Set();
styleTrials.forEach((trial, roomIndex) => {
  if (!trial || typeof trial !== "object") {
    errors.push("style trial for room " + (roomIndex + 1) + " must be an object");
    return;
  }
  if (typeof trial.kind !== "string" || trial.kind.length === 0) errors.push("room " + (roomIndex + 1) + " style trial needs a kind");
  else styleKinds.add(trial.kind);
  if (typeof trial.label !== "string" || trial.label.length === 0) errors.push("room " + (roomIndex + 1) + " style trial needs a label");
  if (typeof trial.goal !== "string" || trial.goal.length === 0) errors.push("room " + (roomIndex + 1) + " style trial needs a goal");
  if (!(Number(trial.timeScale) > 1)) errors.push("room " + (roomIndex + 1) + " style timeScale should exceed 1");
  const tech = Array.isArray(trial.tech) ? trial.tech : [];
  if (!Array.isArray(trial.tech)) errors.push("room " + (roomIndex + 1) + " style tech must be an array");
  for (const requirement of tech) {
    if (!allowedRequirements.has(requirement)) {
      errors.push("room " + (roomIndex + 1) + " has unknown style requirement " + requirement);
      continue;
    }
    const tile = requirementTiles[requirement];
    if (tile && !maps[roomIndex].some((line) => line.includes(tile))) {
      errors.push("room " + (roomIndex + 1) + " style requires " + requirement + " but has no " + tile + " tile");
    }
  }
});
if (styleKinds.size < 6) errors.push("ROOM_STYLE_TRIALS should contain at least six difficulty kinds");

if (errors.length > 0) {
  console.error("Map check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("Map check passed: " + maps.length + " rooms, " + cols + "x" + rows + ", " + targets.length + " targets, pressure " + pressureScores.join("/") + ", crumble " + crumbleRooms.join("/") + ".");
