#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "summit-spark.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const standaloneHtml = fs.readFileSync(path.join(root, "summit-spark.html"), "utf8");
const workflowPath = path.join(root, ".github", "workflows", "pages.yml");
const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, "utf8") : "";
const errors = [];

function extractArray(name) {
  return extractLiteral(name, "[");
}

function extractObject(name) {
  return extractLiteral(name, "{");
}

function extractLiteral(name, opener) {
  const needle = "const " + name + " = ";
  const start = js.indexOf(needle);
  if (start === -1) throw new Error("Missing " + name);
  const literalStart = js.indexOf(opener, start);
  if (literalStart === -1) throw new Error("Missing literal for " + name);
  const close = opener === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (let i = literalStart; i < js.length; i += 1) {
    const ch = js[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === opener) depth += 1;
    if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        return Function("\"use strict\"; return (" + js.slice(literalStart, i + 1) + ");")();
      }
    }
  }
  throw new Error("Unclosed literal for " + name);
}

function hasId(html, id) {
  return new RegExp("id=[\\\"']" + id + "[\\\"']").test(html);
}

function countTiles(room) {
  const counts = {};
  for (const tile of room.join("")) counts[tile] = (counts[tile] || 0) + 1;
  return counts;
}

function pressure(counts) {
  return (counts["^"] || 0) + (counts.v || 0) + (counts["<"] || 0) + (counts[">"] || 0)
    + (counts.A || 0) * 3 + ((counts.U || 0) + (counts.B || 0) + (counts.C || 0)) * 3
    + ((counts.M || 0) + (counts.T || 0)) * 2;
}

const maps = extractArray("maps");
const targets = extractArray("ROOM_TARGETS");
const names = extractArray("ROOM_NAMES");
const tiers = extractArray("ROOM_TIERS");
const skills = extractArray("ROOM_SKILLS");
const guides = extractArray("ROOM_GUIDES");
const deathKeys = extractArray("DEATH_REASON_KEYS");
const deathLabels = extractObject("DEATH_REASON_LABELS");

for (const [label, array] of [["ROOM_TARGETS", targets], ["ROOM_NAMES", names], ["ROOM_TIERS", tiers], ["ROOM_SKILLS", skills], ["ROOM_GUIDES", guides]]) {
  if (array.length !== maps.length) errors.push(label + " has " + array.length + ", maps has " + maps.length);
}

const expectedTiers = ["learn", "learn", "learn", "combine", "combine", "combine", "pressure", "pressure", "finale", "finale"];
expectedTiers.forEach((tier, index) => {
  if (tiers[index] !== tier) errors.push("room " + (index + 1) + " tier should be " + tier + ", found " + tiers[index]);
});

skills.forEach((roomSkills, index) => {
  if (!Array.isArray(roomSkills) || roomSkills.length < 2) errors.push("room " + (index + 1) + " needs at least two skill tags");
  const unique = new Set(roomSkills);
  if (unique.size !== roomSkills.length) errors.push("room " + (index + 1) + " has duplicate skill tags");
});

guides.forEach((guide, index) => {
  if (typeof guide !== "string" || guide.length < 18) errors.push("room " + (index + 1) + " guide is too short");
});

deathKeys.forEach((key) => {
  if (!deathLabels[key]) errors.push("DEATH_REASON_LABELS missing " + key);
  if (!js.includes("entry[key] = 0") && !js.includes("entry[" + JSON.stringify(key) + "] = 0")) {
    errors.push("createRoomFocusEntry must initialize death reason " + key);
  }
});
for (const key of Object.keys(deathLabels)) {
  if (!deathKeys.includes(key)) errors.push("DEATH_REASON_LABELS has extra key " + key);
}

if (indexHtml !== standaloneHtml) errors.push("index.html and summit-spark.html must stay identical");
const requiredIds = [
  "game", "startButton", "overlay", "lumenCount", "roomCount", "splitTime", "splitDelta",
  "flowCount", "runTime", "deathCount", "debugPanel", "settingsButton", "settingsPanel",
  "settingsClose", "shakeSlider", "debugToggle", "calmEffectsToggle", "practiceLinesToggle",
  "controlPreset", "roomSelect", "focusRoomButton", "focusResetButton", "coachSummary"
];
for (const id of requiredIds) {
  if (!hasId(indexHtml, id)) errors.push("index.html missing #" + id);
  if (!js.includes("getElementById(" + JSON.stringify(id) + ")") && id !== "game") {
    errors.push("summit-spark.js does not bind #" + id);
  }
}

if (!js.includes(" / !${current}")) errors.push("roomSelectFocusLabel must expose current-run !x markers");
if (!js.includes(" / watch ")) errors.push("roomSelectFocusLabel must expose persistent watch markers");
if (!js.includes("roomCoachHint")) errors.push("practice coach hint helper is missing");
if (!js.includes("recommendedPracticeRoom")) errors.push("recommended practice room helper is missing");
if (!js.includes("resetFocusStats")) errors.push("focus reset helper is missing");
if (!js.includes("releaseAllInputs")) errors.push("settings input release helper is missing");

const counts = maps.map(countTiles);
const pressures = counts.map(pressure);
const earlyAvg = pressures.slice(0, 3).reduce((sum, value) => sum + value, 0) / 3;
const midMax = Math.max(...pressures.slice(3, 6));
pressures.slice(3, 6).forEach((value, offset) => {
  if (value < earlyAvg + 3) errors.push("middle room " + (offset + 4) + " pressure should clearly exceed early average");
});
pressures.slice(6).forEach((value, offset) => {
  if (value < midMax + 12) errors.push("late room " + (offset + 7) + " pressure should exceed middle max by a clear margin");
});
for (let i = 1; i < pressures.length; i += 1) {
  if (pressures[i] < pressures[i - 1] - 8) errors.push("pressure drops too sharply from room " + i + " to " + (i + 1));
}
for (let i = 0; i < 3; i += 1) {
  if ((counts[i].C || 0) || (counts[i].U || 0) || (counts[i].B || 0) || (counts[i].M || 0)) {
    errors.push("early room " + (i + 1) + " should not introduce late mechanics");
  }
}
for (let i = 3; i < 6; i += 1) {
  if (!(counts[i].A > 0)) errors.push("middle room " + (i + 1) + " should contain relay practice");
}
for (let i = 6; i < maps.length; i += 1) {
  if (!(counts[i].C > 0)) errors.push("late room " + (i + 1) + " should contain crumble pressure");
  if (!(counts[i].U > 0 || counts[i].B > 0 || counts[i].M > 0)) errors.push("late room " + (i + 1) + " needs at least one advanced route mechanic beyond crumble");
}
if (!counts.slice(6).some((room) => room.M > 0)) errors.push("late route should include echo anchor practice");
if (!counts.slice(7).some((room) => room.B > 0)) errors.push("rooms 8-10 should include prism practice");

if (!workflow.includes("npm run check")) errors.push("GitHub Pages workflow must run npm run check before deploy");

if (errors.length > 0) {
  console.error("Contract check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("Contract check passed: html twins, DOM ids, focus coaching, " + maps.length + " room guides, pressure " + pressures.join("/") + ".");
