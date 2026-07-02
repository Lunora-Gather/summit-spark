#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "summit-spark.js");
const patchPath = path.join(root, "patches", "room-data-runtime-seam.patch");
const seamName = "createRoomDataRuntimeViewFromEmbeddedConstants";
const errors = [];

function push(message) {
  errors.push(message);
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: "utf8"
  });
}

if (!fs.existsSync(sourcePath)) push("summit-spark.js is missing");
if (!fs.existsSync(patchPath)) push("runtime seam patch is missing");

let originalSource = "";
if (errors.length === 0) {
  originalSource = fs.readFileSync(sourcePath, "utf8");
  if (originalSource.includes(`function ${seamName}()`)) {
    push("runtime seam is already present; remove this patch-apply gate after seam insertion lands");
  }
}

if (errors.length === 0) {
  const checkResult = run("git", ["apply", "--check", "patches/room-data-runtime-seam.patch"]);
  if (checkResult.status !== 0) {
    push(`git apply --check failed:\n${checkResult.stderr || checkResult.stdout}`);
  }
}

if (errors.length === 0) {
  const applyResult = run("git", ["apply", "patches/room-data-runtime-seam.patch"]);
  if (applyResult.status !== 0) {
    push(`git apply failed:\n${applyResult.stderr || applyResult.stdout}`);
  } else {
    try {
      const patchedSource = fs.readFileSync(sourcePath, "utf8");
      if (!patchedSource.includes(`function ${seamName}()`)) {
        push("patched source should contain the runtime seam function");
      }
      if (!patchedSource.includes("roomCount: maps.length")) {
        push("patched source should derive roomCount from embedded maps");
      }
      if (!patchedSource.includes("feelReplayFixtures: FEEL_REPLAY_FIXTURES")) {
        push("patched source should preserve Feel fixture mapping");
      }
      const syntaxResult = run(process.execPath, ["--check", "summit-spark.js"]);
      if (syntaxResult.status !== 0) {
        push(`patched summit-spark.js failed syntax check:\n${syntaxResult.stderr || syntaxResult.stdout}`);
      }
    } finally {
      fs.writeFileSync(sourcePath, originalSource);
    }
  }
}

if (errors.length > 0) {
  console.error("Room data runtime seam patch apply check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Room data runtime seam patch apply check passed: patch applies cleanly and patched runtime syntax is valid.");
