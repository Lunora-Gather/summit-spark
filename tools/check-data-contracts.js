#!/usr/bin/env node
"use strict";

const { buildRoomDataSnapshot } = require("./lib/read-summit-data");
const {
  validateRoomDataSnapshot,
  getRoomDataSummary
} = require("./lib/validate-room-data");

const snapshot = buildRoomDataSnapshot();
const errors = validateRoomDataSnapshot(snapshot);
const summary = getRoomDataSummary(snapshot);

if (errors.length > 0) {
  console.error("Data contract check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Data contract check passed: ${summary.rooms} rooms, ` +
  `${summary.routeContracts} route contracts, ` +
  `${summary.feelFixtures} Feel fixtures.`
);
