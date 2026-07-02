#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { loadRoomDataSnapshot } = require("./lib/read-summit-data");
const { validateRoomDataSnapshot } = require("./lib/validate-room-data");
const {
  runtimeRoomDataFields,
  createRoomDataRuntimeView
} = require("./lib/room-data-runtime-view");

const root = path.resolve(__dirname, "..");
const errors = [];

function push(message) {
  errors.push(message);
}

const snapshot = loadRoomDataSnapshot();
const validationErrors = validateRoomDataSnapshot(snapshot);
for (const error of validationErrors) push(error);

let view = null;
try {
  view = createRoomDataRuntimeView(snapshot);
} catch (error) {
  push(error.message);
}

if (view) {
  for (const field of runtimeRoomDataFields) {
    if (!(field in view)) push(`runtime view is missing field: ${field}`);
    if (view[field] !== snapshot[field]) push(`runtime view should preserve snapshot reference for field: ${field}`);
  }
  if (Object.keys(view).length !== runtimeRoomDataFields.length) {
    push("runtime view should expose only the documented room-data fields");
  }
  if (view.roomCount !== view.maps.length) {
    push("runtime view roomCount should match maps length");
  }
}

for (const field of runtimeRoomDataFields) {
  const broken = { ...snapshot };
  delete broken[field];
  try {
    createRoomDataRuntimeView(broken);
    push(`createRoomDataRuntimeView should reject missing field: ${field}`);
  } catch (error) {
    if (!String(error.message).includes(field)) {
      push(`missing field error should mention: ${field}`);
    }
  }
}

const helperSource = fs.readFileSync(path.join(root, "tools", "lib", "room-data-runtime-view.js"), "utf8");
for (const forbidden of [
  "document",
  "window",
  "localStorage",
  "sessionStorage",
  "canvas",
  "Audio",
  "requestAnimationFrame",
  "setTimeout",
  "setInterval",
  "fetch("
]) {
  if (helperSource.includes(forbidden)) {
    push(`runtime view helper should stay pure and not reference ${forbidden}`);
  }
}

if (!helperSource.includes("runtimeRoomDataFields") || !helperSource.includes("createRoomDataRuntimeView")) {
  push("runtime view helper should export the field list and createRoomDataRuntimeView");
}

if (errors.length > 0) {
  console.error("Room data runtime view check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Room data runtime view check passed: ${runtimeRoomDataFields.length} fields preserved without runtime side effects.`);
