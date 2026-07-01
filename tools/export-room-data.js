#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  root,
  defaultSnapshotPath,
  buildRoomDataSnapshot,
  normalizeSnapshot
} = require("./lib/read-summit-data");

function main() {
  const args = new Set(process.argv.slice(2));
  const snapshot = buildRoomDataSnapshot();
  const json = normalizeSnapshot(snapshot);

  if (args.has("--write")) {
    fs.mkdirSync(path.dirname(defaultSnapshotPath), { recursive: true });
    fs.writeFileSync(defaultSnapshotPath, json);
    console.log(`Wrote ${path.relative(root, defaultSnapshotPath)} with ${snapshot.roomCount} rooms.`);
    return;
  }

  if (args.has("--check")) {
    if (fs.existsSync(defaultSnapshotPath)) {
      const current = fs.readFileSync(defaultSnapshotPath, "utf8").replace(/\r\n/g, "\n");
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
