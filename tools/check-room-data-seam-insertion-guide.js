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

const guide = requireIncludes("docs/ROOM_DATA_SEAM_INSERTION_GUIDE.md", [
  "Purpose",
  "Files expected in the seam PR",
  "Required PR body notes",
  "Required checks",
  "Review checklist",
  "After merge"
]);

for (const required of [
  "summit-spark.js",
  "docs/ROOM_DATA_P2_STATUS.md",
  "docs/ROOM_DATA_RUNTIME_COMPAT_SEAM.md",
  "tools/check-room-data-runtime-compat-seam.js",
  "tools/check-room-data-p2-status.js",
  "npm run check"
]) {
  if (!guide.includes(required)) push(`seam insertion guide should mention: ${required}`);
}

requireIncludes("docs/ROOM_DATA_P2_STATUS.md", [
  "P2 is ready for a small runtime compatibility seam PR"
]);

requireIncludes(".github/pull_request_template.md", [
  "Room Data / Source Impact"
]);

if (errors.length > 0) {
  console.error("Room data seam insertion guide check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Room data seam insertion guide check passed: runtime seam PR review procedure is documented.");
