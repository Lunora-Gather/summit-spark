#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { loadRoomDataSnapshot } = require("./lib/read-summit-data");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "public", "summit-spark.js"), "utf8");
const snapshot = loadRoomDataSnapshot();
const errors = [];
const warnings = [];

function countTiles(room) {
  const counts = {};
  for (const row of room) {
    for (const tile of row) counts[tile] = (counts[tile] || 0) + 1;
  }
  return counts;
}

function pressure(counts) {
  return (counts["^"] || 0) + (counts.v || 0) + (counts["<"] || 0) + (counts[">"] || 0)
    + (counts.A || 0) * 3 + ((counts.U || 0) + (counts.B || 0) + (counts.C || 0)) * 3
    + ((counts.M || 0) + (counts.T || 0)) * 2;
}

function landingSegments(room) {
  let total = 0;
  for (let y = 1; y < room.length; y += 1) {
    let run = 0;
    for (let x = 0; x <= room[y].length; x += 1) {
      const solid = x < room[y].length && "#C".includes(room[y][x]) && room[y - 1][x] === ".";
      if (solid) {
        run += 1;
      } else {
        if (run >= 2) total += 1;
        run = 0;
      }
    }
  }
  return total;
}

function hasBadPlaceholder(text) {
  return /todo|tbd|placeholder|lorem|待定/i.test(String(text));
}

const maps = snapshot.maps;
const names = snapshot.roomNames;
const guides = snapshot.roomGuides;
const purposes = snapshot.roomPurposes;
const routeLines = snapshot.roomRouteLines;
const routeContracts = snapshot.routeContracts;
const feelFixtures = snapshot.feelReplayFixtures;
const expectedRouteLabels = ["安全线", "进阶线", "高手线"];
const allowedModes = new Set(["clean", "pace", "style", "expert"]);
const allowedFeelTech = new Set(["jump", "wall", "dash", "spark", "wallSpark", "prismSpark", "prism", "crumble"]);

if (maps.length !== 10) errors.push("route should keep the current ten-room campaign");
const width = maps[0]?.[0]?.length || 0;
const height = maps[0]?.length || 0;
const pressureByRoom = [];
let echoTeachingDistance = 0;

maps.forEach((room, index) => {
  if (!Array.isArray(room) || room.length !== height) errors.push("room " + (index + 1) + " height drifted");
  room.forEach((row, rowIndex) => {
    if (row.length !== width) errors.push("room " + (index + 1) + " row " + (rowIndex + 1) + " width drifted");
  });
  const counts = countTiles(room);
  const roomPressure = pressure(counts);
  const landings = landingSegments(room);
  pressureByRoom.push(roomPressure);
  if (!names[index] || hasBadPlaceholder(names[index])) errors.push("room " + (index + 1) + " name is not production copy");
  if (!guides[index] || hasBadPlaceholder(guides[index])) errors.push("room " + (index + 1) + " guide is not production copy");
  if (!purposes[index] || hasBadPlaceholder(purposes[index])) errors.push("room " + (index + 1) + " purpose is not production copy");
  if (landings < 4) errors.push("room " + (index + 1) + " has too few readable landing segments: " + landings);
  if (index >= 6 && roomPressure < 35) warnings.push("late room " + (index + 1) + " pressure is comparatively low: " + roomPressure);
});

const room5Relay = maps[4]?.[9]?.[6] === "A";
const room5Ridge = maps[4]?.[8]?.slice(14, 17) === "###"
  && maps[4]?.[9]?.[15] === "#"
  && maps[4]?.[10]?.[15] === "#";
if (!room5Relay || !room5Ridge) {
  errors.push("R5 should force a readable left relay switchback around a capped central ridge");
}
if (!String(guides[4] || "").includes("中棱") || !String(routeLines[4]?.[2] || "").includes("Wall Spark")) {
  errors.push("R5 guide and expert line should explain the central-ridge switchback and Wall Spark cut");
}
if (maps[1]?.[8]?.[2] !== "P" || maps[1]?.[8]?.[10] !== "A" || maps[1]?.[9]?.slice(8, 13) !== "#####") {
  errors.push("R2 should teach its first relay on a level checkpoint runway with a stable recovery landing");
}
if (maps[2]?.[10]?.[23] !== "T" || maps[2]?.[11]?.[23] !== "#") {
  errors.push("R3 should teach its first spring from stable ground before the route combines height decisions");
}
if (maps[6]?.[8]?.slice(5, 8) !== "CCC" || maps[6]?.[9]?.slice(5, 8) !== "###" || maps[6]?.[7]?.[7] !== "U") {
  errors.push("R7 should keep a low-risk first crumble and updraft teaching pocket");
}
if (maps[7]?.[3]?.[17] !== "B" || maps[7]?.[4]?.[17] !== "#") {
  errors.push("R8 should keep its first prism on stable ground before the exam combination");
}

const echoTeachingRoom = maps[8] || [];
const echoCheckpointRow = echoTeachingRoom.findIndex((row) => row.includes("P"));
const echoAnchorRow = echoTeachingRoom.findIndex((row) => row.includes("M"));
const echoCheckpointColumn = echoCheckpointRow >= 0 ? echoTeachingRoom[echoCheckpointRow].indexOf("P") : -1;
const echoAnchorColumn = echoAnchorRow >= 0 ? echoTeachingRoom[echoAnchorRow].indexOf("M") : -1;
echoTeachingDistance = echoCheckpointRow >= 0 && echoAnchorRow >= 0
  ? Math.abs(echoCheckpointRow - echoAnchorRow) + Math.abs(echoCheckpointColumn - echoAnchorColumn)
  : Infinity;
if (echoTeachingDistance > 3 || echoCheckpointRow !== echoAnchorRow) {
  errors.push("R9 should teach its first Echo anchor in a short low-risk checkpoint pocket before the combined route");
}
const finaleRoom = maps[9] || [];
const finaleCheckpointRow = finaleRoom.findIndex((row) => row.includes("P"));
const finaleAnchorRow = finaleRoom.findIndex((row) => row.includes("M"));
const finaleCheckpointColumn = finaleCheckpointRow >= 0 ? finaleRoom[finaleCheckpointRow].indexOf("P") : -1;
const finaleAnchorColumn = finaleAnchorRow >= 0 ? finaleRoom[finaleAnchorRow].indexOf("M") : -1;
const finaleEchoDistance = finaleCheckpointRow >= 0 && finaleAnchorRow >= 0
  ? Math.abs(finaleCheckpointRow - finaleAnchorRow) + Math.abs(finaleCheckpointColumn - finaleAnchorColumn)
  : Number.POSITIVE_INFINITY;
if (finaleEchoDistance !== 1 || finaleCheckpointRow !== finaleAnchorRow || finaleRoom[finaleAnchorRow + 1]?.[finaleAnchorColumn] !== "#") {
  errors.push("R10 should reuse Echo from a stable entry checkpoint pocket");
}
if (!snapshot.expertRequirements?.[9]?.includes("echo") || !snapshot.roomStyleTrials?.[9]?.tech?.includes("echo")) {
  errors.push("R10 Style and Expert routes should require establishing Echo without forcing recall");
}

routeLines.forEach((lines, index) => {
  if (!Array.isArray(lines) || lines.length !== 3) {
    errors.push("room " + (index + 1) + " must keep safe/fast/expert route lines");
    return;
  }
  lines.forEach((line, lineIndex) => {
    const label = expectedRouteLabels[lineIndex];
    if (!String(line).startsWith(label + "：")) errors.push("room " + (index + 1) + " route line " + label + " needs an explicit label");
    if (String(line).length > 40) warnings.push("room " + (index + 1) + " route line " + label + " may be too dense on mobile");
    if (hasBadPlaceholder(line)) errors.push("room " + (index + 1) + " route line " + label + " contains placeholder copy");
  });
});

const contractSteps = new Set();
routeContracts.forEach((contract) => {
  if (!contract.id || !contract.label || !contract.goal) errors.push("route contract is missing production copy");
  if (!Array.isArray(contract.steps) || contract.steps.length !== 3) errors.push("route contract " + contract.id + " must keep three steps");
  const seen = new Set();
  for (const step of Array.isArray(contract.steps) ? contract.steps : []) {
    const key = step.index + ":" + step.mode;
    if (!Number.isInteger(step.index) || step.index < 0 || step.index >= maps.length) errors.push("route contract " + contract.id + " references invalid room");
    if (!allowedModes.has(step.mode)) errors.push("route contract " + contract.id + " uses invalid mode " + step.mode);
    if (seen.has(key)) errors.push("route contract " + contract.id + " repeats step " + key);
    seen.add(key);
    contractSteps.add(key);
  }
});
if (contractSteps.size < 8) errors.push("route contracts should cover a broad set of room/mode pairs");

const feelIds = new Set();
feelFixtures.forEach((fixture) => {
  if (!fixture.id || feelIds.has(fixture.id)) errors.push("feel fixture ids must be unique and non-empty");
  feelIds.add(fixture.id);
  if (!Number.isInteger(fixture.room) || fixture.room < 1 || fixture.room > maps.length) errors.push("feel fixture " + fixture.id + " references invalid room");
  if (!(fixture.maxDelay > 0 && fixture.maxDelay < 0.15)) errors.push("feel fixture " + fixture.id + " delay window is outside the playable timing range");
  for (const tech of Array.isArray(fixture.expected) ? fixture.expected : []) {
    if (!allowedFeelTech.has(tech)) errors.push("feel fixture " + fixture.id + " uses unknown expected tech " + tech);
  }
});

if (!js.includes("TRAINING_TRANSITIONS")) errors.push("training state transitions must stay explicit");
if (!js.includes("gamepadDeadzone")) errors.push("gamepad deadzone setting must stay wired into runtime settings");
if (!js.includes("resumeRecommendedTraining")) errors.push("start overlay should keep a direct resume-training action");
if (!js.includes("SETTINGS_SCHEMA_VERSION") || !js.includes("ROOM_FOCUS_SCHEMA_VERSION")) errors.push("storage schema versions should stay explicit");
if (!js.includes("lowPerformance")) errors.push("low-performance mode should stay wired into settings and rendering");
if (!js.includes("triggerSparkVariantVisual")) errors.push("Spark variants should keep distinct visual pulses");

if (errors.length > 0) {
  console.error("Route audit failed:");
  for (const error of errors) console.error("- " + error);
  for (const warning of warnings) console.error("warn: " + warning);
  process.exit(1);
}

const summary = pressureByRoom.map((value, index) => "R" + (index + 1) + ":" + value).join(" ");
console.log("Route audit passed: ten-room readable route, R2/R3 safe opening mechanic pockets, R5 central-ridge switchback, R7/R8 safe mechanic pockets, R9 Echo teaching pocket (distance " + echoTeachingDistance + "), R10 Echo reuse pocket (distance " + finaleEchoDistance + "), contracts, Feel Lab fixtures, transition guards. Pressure " + summary + ".");
for (const warning of warnings) console.log("warn: " + warning);
