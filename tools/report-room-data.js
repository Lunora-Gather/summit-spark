#!/usr/bin/env node
"use strict";

const { buildRoomDataSnapshot } = require("./lib/read-summit-data");
const {
  validateRoomDataSnapshot,
  getRoomDataSummary
} = require("./lib/validate-room-data");

const snapshot = buildRoomDataSnapshot();
const summary = getRoomDataSummary(snapshot);
const errors = validateRoomDataSnapshot(snapshot);

console.log("Room Data Report");
console.log("================");
console.log(`Source: ${snapshot.generatedFrom}`);
console.log(`Rooms: ${summary.rooms}`);
console.log(`Style trials: ${summary.styleTrials}`);
console.log(`Expert requirement sets: ${summary.expertRequirements}`);
console.log(`Route contracts: ${summary.routeContracts}`);
console.log(`Feel fixtures: ${summary.feelFixtures}`);
console.log("");

snapshot.roomNames.forEach((name, index) => {
  const number = String(index + 1).padStart(2, "0");
  const target = snapshot.roomTargets[index];
  const tier = snapshot.roomTiers[index];
  const skills = snapshot.roomSkills[index].join(", ");
  console.log(`R${number} ${name} | target ${target}s | ${tier} | ${skills}`);
});

console.log("");
if (errors.length > 0) {
  console.log(`Validation: failed (${errors.length} issue${errors.length === 1 ? "" : "s"})`);
  for (const error of errors) console.log(`- ${error}`);
  process.exit(1);
}

console.log("Validation: passed");
