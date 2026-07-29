#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const errors = [];
const requiredTools = [
  "tools/check-appwrite-contract.js",
  "tools/check-browser-smoke.js",
  "tools/check-core-format.mjs",
  "tools/check-core-math.mjs",
  "tools/check-room-data.mjs",
  "tools/check-effect-budget.mjs",
  "tools/check-audio-cues.mjs",
  "tools/check-storage.mjs",
  "tools/check-input.mjs",
  "tools/check-training.mjs",
  "tools/check-ui-presentation.mjs",
  "tools/check-contracts.js",
  "tools/check-data-contracts.js",
  "tools/check-docs.js",
  "tools/check-feel-replays.js",
  "tools/check-maintenance-tools.js",
  "tools/check-maps.js",
  "tools/check-public-surface.js",
  "tools/check-route-audit.js",
  "tools/check-smoke.js",
  "tools/check-training-state.js",
  "tools/export-room-data.js",
  "tools/report-room-data.js",
  "tools/lib/read-summit-data.js",
  "tools/lib/validate-room-data.js"
];

for (const relativePath of requiredTools) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`missing required tool: ${relativePath}`);
    continue;
  }
  const result = spawnSync(process.execPath, ["--check", absolutePath], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    errors.push(`${relativePath} failed syntax check:\n${result.stderr || result.stdout}`);
  }
}

for (const removedPath of ["src", "patches", "summit-spark.html"]) {
  if (fs.existsSync(path.join(root, removedPath))) {
    errors.push(`obsolete scaffold must not return: ${removedPath}`);
  }
}

const workflowsDir = path.join(root, ".github", "workflows");
for (const entry of fs.readdirSync(workflowsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;
  const relativePath = path.join(".github", "workflows", entry.name);
  const workflow = fs.readFileSync(path.join(root, relativePath), "utf8");
  const actionUses = workflow.match(/^\s*uses:\s*[^#\s]+/gm) || [];
  for (const actionUse of actionUses) {
    const reference = actionUse.replace(/^\s*uses:\s*/, "");
    if (/^\.\//.test(reference) || /^docker:\/\//.test(reference)) continue;
    if (!/@[0-9a-f]{40}$/i.test(reference)) {
      errors.push(`${relativePath} must pin ${reference} to a full commit SHA`);
    }
  }
}

if (errors.length > 0) {
  console.error("Maintenance tool check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Maintenance tool check passed: ${requiredTools.length} focused tools and immutable workflows verified.`);
