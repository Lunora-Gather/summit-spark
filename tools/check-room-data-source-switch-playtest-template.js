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

const template = requireIncludes("docs/ROOM_DATA_SOURCE_SWITCH_PLAYTEST.md", [
  "Room Data Source Switch Playtest Template",
  "Build and checks",
  "R1-R10 route sanity",
  "Input and UI coverage",
  "Regression notes",
  "Rollback notes",
  "npm run check",
  "browser-smoke",
  "Save export and import round trip",
  "One-revert rollback path confirmed"
]);

for (let room = 1; room <= 10; room += 1) {
  if (!template.includes(`R${room}`)) push(`playtest template should include R${room}`);
}

for (const required of [
  "Keyboard clear or route sanity pass",
  "Practice panel drills",
  "Practice panel routes",
  "Feel Lab fixtures",
  "Settings open, edit, save, and reset",
  "Narrow viewport or touch-control pass"
]) {
  if (!template.includes(required)) push(`playtest template should include: ${required}`);
}

const readiness = requireIncludes("docs/ROOM_DATA_SOURCE_SWITCH_READINESS.md", [
  "Required manual checks",
  "R1-R10 route sanity pass",
  "Save export/import round trip"
]);

if (!readiness.includes("docs/ROOM_DATA_SOURCE_SWITCH_PLAYTEST.md") && !readiness.includes("manual checks")) {
  push("source-switch readiness doc should point reviewers toward manual playtest notes");
}

if (errors.length > 0) {
  console.error("Room data source-switch playtest template check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Room data source-switch playtest template check passed: R1-R10 and UI/save coverage recorded.");
