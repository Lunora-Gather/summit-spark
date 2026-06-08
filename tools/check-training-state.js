#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "summit-spark.js"), "utf8");
const errors = [];

function extractObject(name) {
  const needle = "const " + name + " = ";
  const start = js.indexOf(needle);
  if (start === -1) throw new Error("Missing " + name);
  const objectStart = js.indexOf("{", start);
  if (objectStart === -1) throw new Error("Missing object for " + name);
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (let i = objectStart; i < js.length; i += 1) {
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
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return Function("\"use strict\"; return (" + js.slice(objectStart, i + 1).replace(/Object\.freeze\(/g, "(") + ");")();
      }
    }
  }
  throw new Error("Unclosed object for " + name);
}

function functionBody(name) {
  const needle = "function " + name + "(";
  const start = js.indexOf(needle);
  if (start === -1) {
    errors.push("missing function " + name);
    return "";
  }
  const signatureStart = js.indexOf("(", start);
  let parenDepth = 0;
  let signatureEnd = -1;
  for (let i = signatureStart; i < js.length; i += 1) {
    if (js[i] === "(") parenDepth += 1;
    if (js[i] === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnd = i;
        break;
      }
    }
  }
  const bodyStart = js.indexOf("{", signatureEnd);
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (let i = bodyStart; i < js.length; i += 1) {
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
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return js.slice(bodyStart, i + 1);
    }
  }
  errors.push("unclosed function " + name);
  return "";
}

const transitions = extractObject("TRAINING_TRANSITIONS");
const expected = {
  hardReset: { keepDrill: false, keepChallenge: false, keepRoute: false, keepFeel: false, routeReason: "重开路线", feelReason: "重开中断" },
  jumpRoom: { keepDrill: false, keepChallenge: false, keepRoute: false, keepFeel: false, routeReason: "跳房中断", feelReason: "跳房中断" }
};

for (const [name, rules] of Object.entries(expected)) {
  const transition = transitions[name];
  if (!transition) {
    errors.push("missing transition " + name);
    continue;
  }
  for (const [field, value] of Object.entries(rules)) {
    if (transition[field] !== value) errors.push("transition " + name + " has invalid " + field);
  }
}

const clearBody = functionBody("clearTrainingTransitionState");
if (!clearBody.includes("activeDrill = null")) errors.push("clearTrainingTransitionState must clear activeDrill by default");
if (!clearBody.includes("activeChallenge = null")) errors.push("clearTrainingTransitionState must clear activeChallenge by default");
if (!clearBody.includes("cancelActiveRouteContract")) errors.push("clearTrainingTransitionState must cancel route contracts by default");
if (!clearBody.includes("cancelActiveFeelFixture")) errors.push("clearTrainingTransitionState must cancel feel fixtures by default");

const hardResetBody = functionBody("hardReset");
if (!hardResetBody.includes('applyTrainingTransition("hardReset"')) errors.push("hardReset must use the transition table");
if (!hardResetBody.includes("keepChallenge") || !hardResetBody.includes("keepRoute") || !hardResetBody.includes("keepFeel")) errors.push("hardReset must preserve explicit keep overrides");

const jumpBody = functionBody("jumpToRoom");
if (!jumpBody.includes('applyTrainingTransition("jumpRoom"')) errors.push("jumpToRoom must use the transition table");
if (!jumpBody.includes("keepDrill") || !jumpBody.includes("keepRoute") || !jumpBody.includes("keepFeel")) errors.push("jumpToRoom must preserve explicit keep overrides");

const drillBody = functionBody("startRoomDrill");
if (!drillBody.includes('cancelActiveRouteContract("改练中断")')) errors.push("startRoomDrill should interrupt mismatched route contracts");
if (!drillBody.includes('cancelActiveFeelFixture("改练中断")')) errors.push("startRoomDrill should interrupt mismatched feel fixtures");
if (!drillBody.includes("keepRoute") || !drillBody.includes("keepFeel")) errors.push("startRoomDrill must pass keepRoute/keepFeel into jumpToRoom");

const retryBody = functionBody("retryFailedDrill");
if (!retryBody.includes("routeContractMatchesDrill") || !retryBody.includes("feelFixtureMatchesDrill")) errors.push("failed Drill retry must validate Route/Feel state before preserving it");

const resumeBody = functionBody("resumeRecommendedTraining");
if (!resumeBody.includes("clearTransientTrainingResults") || !resumeBody.includes("startRoomDrill")) errors.push("direct resume should clear stale summaries and start the recommended Drill");

if (!js.includes("SETTINGS_SCHEMA_VERSION = 2")) errors.push("settings schema version should be current");
if (!js.includes("PROFILE_SCHEMA_VERSION = 2")) errors.push("profile schema version should be current");
if (!js.includes("ROOM_FOCUS_SCHEMA_VERSION = 2")) errors.push("room focus schema version should be current");
if (!js.includes("lowPerformance") || !js.includes("touchSize")) errors.push("comfort settings must include lowPerformance and touchSize");

if (errors.length > 0) {
  console.error("Training state check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("Training state check passed: transitions, Route/Feel preservation, direct resume, schema versions.");
