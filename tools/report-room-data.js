#!/usr/bin/env node
"use strict";

const { loadRoomDataSnapshot } = require("./lib/read-summit-data");
const {
  validateRoomDataSnapshot,
  getRoomDataSummary
} = require("./lib/validate-room-data");

const snapshot = loadRoomDataSnapshot();
const summary = getRoomDataSummary(snapshot);
const errors = validateRoomDataSnapshot(snapshot);

function pressureWeight(tile) {
  if ("^v<>".includes(tile)) return 1;
  if (tile === "A" || tile === "U" || tile === "B" || tile === "C" || tile === "K") return 3;
  if (tile === "M" || tile === "T" || tile === "D" || tile === "E") return 2;
  return 0;
}

function longRoomBeatSummary(room) {
  const width = room[0]?.length || 1;
  const beats = [0, 0, 0];
  const lumens = [];
  room.forEach((row, y) => [...row].forEach((tile, x) => {
    beats[Math.min(2, Math.floor((x / width) * 3))] += pressureWeight(tile);
    if (tile === "L") lumens.push(`${x >= 30 ? "second" : "first"}@${x},${y}`);
  }));
  return `beats ${beats.join("/")} | L ${lumens.join("+") || "none"}`;
}

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
  const pacing = index >= 3 ? ` | ${longRoomBeatSummary(snapshot.maps[index])}` : "";
  console.log(`R${number} ${name} | target ${target}s | ${tier} | ${skills}${pacing}`);
});

console.log("");
if (errors.length > 0) {
  console.log(`Validation: failed (${errors.length} issue${errors.length === 1 ? "" : "s"})`);
  for (const error of errors) console.log(`- ${error}`);
  process.exit(1);
}

console.log("Validation: passed");
