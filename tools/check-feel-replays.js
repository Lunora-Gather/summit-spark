#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "summit-spark.js"), "utf8");
const errors = [];

function extractArray(name) {
  const needle = "const " + name + " = ";
  const start = source.indexOf(needle);
  if (start === -1) throw new Error("Missing " + name);
  const arrayStart = source.indexOf("[", start);
  if (arrayStart === -1) throw new Error("Missing array for " + name);
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (let i = arrayStart; i < source.length; i += 1) {
    const ch = source[i];
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
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        return Function("\"use strict\"; return (" + source.slice(arrayStart, i + 1) + ");")();
      }
    }
  }
  throw new Error("Unclosed array for " + name);
}

function numberConst(name) {
  const match = source.match(new RegExp("const " + name + " = ([0-9.]+);"));
  return match ? Number(match[1]) : NaN;
}

const fixtures = extractArray("FEEL_REPLAY_FIXTURES");
const routeContracts = extractArray("ROUTE_CONTRACTS");
const requiredIds = ["jump-buffer", "coyote-jump", "wall-grace", "aim-memory-dash", "spark-hop", "wall-spark", "prism-spark"];
const allowedExpected = new Set(["jump", "wall", "dash", "spark", "wallSpark", "prismSpark"]);
const requiredWindows = {
  JUMP_BUFFER_TIME: [0.09, 0.14],
  COYOTE_TIME: [0.08, 0.13],
  WALL_COYOTE_TIME: [0.08, 0.13],
  DASH_AIM_MEMORY: [0.06, 0.11],
  SPARK_HOP_WINDOW: [0.085, 0.13]
};

for (const id of requiredIds) {
  if (!fixtures.some((fixture) => fixture.id === id)) errors.push("missing feel replay fixture " + id);
}

for (const [name, [min, max]] of Object.entries(requiredWindows)) {
  const value = numberConst(name);
  if (!Number.isFinite(value)) errors.push("missing feel constant " + name);
  else if (value < min || value > max) errors.push(name + " should stay within " + min + "-" + max + ", found " + value);
}

fixtures.forEach((fixture) => {
  if (!fixture || typeof fixture !== "object") {
    errors.push("feel fixture must be an object");
    return;
  }
  if (typeof fixture.id !== "string" || fixture.id.length < 3) errors.push("feel fixture needs id");
  if (!Number.isInteger(fixture.room) || fixture.room < 1 || fixture.room > 10) errors.push("feel fixture " + fixture.id + " has invalid room");
  if (!requiredWindows[fixture.window]) errors.push("feel fixture " + fixture.id + " has unknown window " + fixture.window);
  if (!(Number(fixture.maxDelay) > 0)) errors.push("feel fixture " + fixture.id + " needs maxDelay");
  if (!Array.isArray(fixture.expected) || fixture.expected.length === 0) errors.push("feel fixture " + fixture.id + " needs expected actions");
  for (const action of Array.isArray(fixture.expected) ? fixture.expected : []) {
    if (!allowedExpected.has(action)) errors.push("feel fixture " + fixture.id + " has unknown expected action " + action);
  }
});

if (!source.includes("WALL_SPARK_X_MULT")) errors.push("Wall Spark tuning constant is missing");
if (!source.includes("PRISM_SPARK_MULT")) errors.push("Prism Spark tuning constant is missing");
if (!source.includes("player.sparkHopVariant")) errors.push("Spark variant state is missing");
if (!source.includes("playSound")) errors.push("audio feedback helper is missing");
if (!source.includes("SOUND_PRESETS")) errors.push("sound presets are missing");
if (!source.includes("playAudioTestPattern")) errors.push("audio test pattern is missing");
if (!source.includes("drawFailureGhostLine")) errors.push("quiet failure ghost hook is missing");
if (!source.includes("updateFeelLab")) errors.push("feel lab UI helper is missing");
if (!source.includes("startFeelFixture")) errors.push("feel fixture launch helper is missing");
if (!source.includes("activeFeelFixture")) errors.push("active feel fixture state is missing");
if (!source.includes("lastFeelFixtureResult")) errors.push("feel fixture result state is missing");
if (!source.includes("completeActiveFeelFixture")) errors.push("feel fixture completion helper is missing");
if (!source.includes("cancelActiveFeelFixture")) errors.push("feel fixture interruption helper is missing");
if (!source.includes("routeContractHudDetail")) errors.push("route contracts should feed the active Drill HUD");
if (!source.includes("routeContractSummaryText")) errors.push("route contracts should feed practice review text");
if (!source.includes("resumeRouteContract")) errors.push("route contracts should support resuming interrupted routes");
if (!source.includes("routeContractGeneration")) errors.push("route contract auto-advance should use a generation guard");
if (!source.includes("routeContractMatchesDrill")) errors.push("route contract retries should validate matching drill state");
if (!source.includes("feelFixtureMatchesDrill")) errors.push("feel fixture retries should validate matching drill state");

if (routeContracts.length < 3) errors.push("route contracts should include at least three training routes");
routeContracts.forEach((contract) => {
  if (!contract.id || !contract.label || !contract.goal) errors.push("route contract missing id/label/goal");
  if (!Array.isArray(contract.steps) || contract.steps.length !== 3) errors.push("route contract " + contract.id + " should have exactly three steps");
  (contract.steps || []).forEach((step) => {
    if (!Number.isInteger(step.index) || step.index < 0 || step.index >= 10) errors.push("route contract " + contract.id + " has invalid room index");
    if (!["clean", "pace", "style", "expert"].includes(step.mode)) errors.push("route contract " + contract.id + " has invalid mode " + step.mode);
  });
});

if (errors.length > 0) {
  console.error("Feel replay check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("Feel replay check passed: " + fixtures.length + " fixtures, " + routeContracts.length + " route contracts.");
