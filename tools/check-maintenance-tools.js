#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const errors = [];

const requiredToolFiles = [
  "tools/check-docs.js",
  "tools/check-public-surface.js",
  "tools/check-data-contracts.js",
  "tools/check-maps.js",
  "tools/export-room-data.js",
  "tools/report-room-data.js",
  "tools/lib/read-summit-data.js",
  "tools/lib/validate-room-data.js"
];

function push(message) {
  errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

for (const file of requiredToolFiles) {
  const absolutePath = path.join(root, file);
  if (!fs.existsSync(absolutePath)) {
    push(`missing required tool file: ${file}`);
    continue;
  }
  const result = spawnSync(process.execPath, ["--check", absolutePath], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    push(`${file} failed syntax check:\n${result.stderr || result.stdout}`);
  }
}

const sourceReader = "tools/lib/read-summit-data.js";
const sharedValidator = "tools/lib/validate-room-data.js";

for (const file of requiredToolFiles) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const content = read(file);

  if (file !== sourceReader && /function\s+extractConst\s*\(/.test(content)) {
    push(`${file} should not define extractConst; use ${sourceReader}`);
  }

  if (file !== sourceReader && /function\s+extractArray\s*\(/.test(content)) {
    push(`${file} should not define extractArray; use ${sourceReader}`);
  }

  if (file !== sourceReader && content.includes('Function("\\"use strict\\"; return ("')) {
    push(`${file} should not eval summit-spark.js constants directly; use ${sourceReader}`);
  }

  if (file !== sharedValidator && file.includes("check-data-contracts") && content.includes("ROOM_STYLE_TRIALS")) {
    push(`${file} should delegate detailed validation to ${sharedValidator}`);
  }
}

const reader = read("tools/lib/read-summit-data.js");
for (const required of [
  "hasGeneratedSnapshot",
  "readGeneratedSnapshot",
  "buildRoomDataSnapshotFromSource",
  "loadRoomDataSnapshot"
]) {
  if (!reader.includes(required)) {
    push(`tools/lib/read-summit-data.js should export ${required}`);
  }
}

const report = read("tools/report-room-data.js");
if (!report.includes("loadRoomDataSnapshot")) {
  push("tools/report-room-data.js should use loadRoomDataSnapshot so it can read generated snapshots");
}
if (!report.includes("validateRoomDataSnapshot") || !report.includes("getRoomDataSummary")) {
  push("tools/report-room-data.js should use the shared validator and summary helper");
}

const dataCheck = read("tools/check-data-contracts.js");
if (!dataCheck.includes("loadRoomDataSnapshot")) {
  push("tools/check-data-contracts.js should use loadRoomDataSnapshot so it can validate generated snapshots");
}
if (!dataCheck.includes("validateRoomDataSnapshot") || !dataCheck.includes("getRoomDataSummary")) {
  push("tools/check-data-contracts.js should use the shared validator and summary helper");
}

const mapCheck = read("tools/check-maps.js");
if (!mapCheck.includes("loadRoomDataSnapshot")) {
  push("tools/check-maps.js should use loadRoomDataSnapshot so it can validate generated snapshots");
}
if (mapCheck.includes("summit-spark.js")) {
  push("tools/check-maps.js should not read summit-spark.js directly; use the preferred loader");
}

const exporter = read("tools/export-room-data.js");
if (!exporter.includes("buildRoomDataSnapshot") || !exporter.includes("normalizeSnapshot")) {
  push("tools/export-room-data.js should use the shared reader and snapshot normalizer");
}
if (exporter.includes("loadRoomDataSnapshot")) {
  push("tools/export-room-data.js should generate from source, not from the preferred snapshot loader");
}

if (errors.length > 0) {
  console.error("Maintenance tool check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Maintenance tool check passed: ${requiredToolFiles.length} tool files verified.`);
