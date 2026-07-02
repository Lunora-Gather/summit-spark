#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const errors = [];

const roomDataTools = [
  "tools/check-room-data-migration.js",
  "tools/check-room-data-adapter-plan.js",
  "tools/check-room-data-runtime-view.js",
  "tools/check-room-data-legacy-constants.js",
  "tools/check-room-data-source-switch-readiness.js",
  "tools/check-room-data-source-switch-playtest-template.js",
  "tools/check-room-data-runtime-callsite-plan.js",
  "tools/check-room-data-runtime-compat-seam.js",
  "tools/check-room-data-p2-status.js"
];

const roomDataHelperFiles = [
  "tools/lib/read-summit-data.js",
  "tools/lib/validate-room-data.js",
  "tools/lib/room-data-runtime-view.js",
  "tools/lib/room-data-legacy-constants.js"
];

function push(message) {
  errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    push(`missing required file: ${relativePath}`);
    return false;
  }
  return true;
}

for (const file of [...roomDataTools, ...roomDataHelperFiles]) {
  if (!requireFile(file)) continue;
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    push(`${file} failed syntax check:\n${result.stderr || result.stdout}`);
  }
}

const workflow = requireFile(".github/workflows/maintenance-tools.yml")
  ? read(".github/workflows/maintenance-tools.yml")
  : "";
const toolsReadme = requireFile("tools/README.md") ? read("tools/README.md") : "";

for (const tool of roomDataTools) {
  const command = `node ${tool}`;
  if (!workflow.includes(command)) push(`Maintenance Tools workflow should run: ${command}`);
  if (!toolsReadme.includes(path.basename(tool))) push(`tools/README.md should document: ${path.basename(tool)}`);
}

for (const helper of roomDataHelperFiles) {
  if (!toolsReadme.includes(helper)) push(`tools/README.md should document helper: ${helper}`);
}

if (!workflow.includes("Check room data migration")) push("workflow should keep the migration gate step named explicitly");
if (!workflow.includes("Check room data P2 status")) push("workflow should keep the P2 status step named explicitly");
if (!workflow.includes("Check room data source switch playtest template")) push("workflow should keep the source-switch playtest template step named explicitly");
if (!workflow.includes("Check room data runtime call-site plan")) push("workflow should keep the runtime call-site plan step named explicitly");
if (!workflow.includes("Check room data runtime compat seam")) push("workflow should keep the runtime compat seam step named explicitly");
if (!workflow.includes("Check room data source switch readiness")) push("workflow should keep the source-switch readiness step named explicitly");
if (!toolsReadme.includes("Do not switch the runtime source")) {
  push("tools/README.md should preserve the runtime-source switch policy");
}
if (!toolsReadme.includes("Do not duplicate legacy constant mapping logic")) {
  push("tools/README.md should preserve the legacy mapping ownership policy");
}

if (errors.length > 0) {
  console.error("Room data tool registry check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Room data tool registry check passed: ${roomDataTools.length} tools and ${roomDataHelperFiles.length} helpers registered.`);
