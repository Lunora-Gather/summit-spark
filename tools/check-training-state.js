#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "public", "summit-spark.js"), "utf8");
const trainingModule = fs.readFileSync(path.join(root, "public", "modules", "training", "state.mjs"), "utf8");
const errors = [];

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

if (!trainingModule.includes("export const TRAINING_TRANSITIONS = Object.freeze({")
  || !trainingModule.includes('routeReason: "重开路线"')
  || !trainingModule.includes('feelReason: "跳房中断"')) {
  errors.push("training module must own the immutable reset and room-jump transitions");
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
if (!drillBody.includes("createDrillData(")) errors.push("startRoomDrill must create state through the training module");

const retryBody = functionBody("retryFailedDrill");
if (!retryBody.includes("routeContractMatchesDrill") || !retryBody.includes("feelFixtureMatchesDrill")) errors.push("failed Drill retry must validate Route/Feel state before preserving it");

const resumeBody = functionBody("resumeRecommendedTraining");
if (!resumeBody.includes("clearTransientTrainingResults") || !resumeBody.includes("startRoomDrill")) errors.push("direct resume should clear stale summaries and start the recommended Drill");

const transitionBody = functionBody("applyTrainingTransition");
if (!transitionBody.includes("trainingTransitionOptionsData(")) errors.push("training transitions must resolve through the training module");
const succeededBody = functionBody("drillSucceeded");
if (!succeededBody.includes("drillSucceededData(")) errors.push("Drill outcomes must delegate to the training module");
const routeDataBody = functionBody("activeRouteContractData");
if (!routeDataBody.includes("activeRouteContractDataFor(")) errors.push("Route active-state lookup must delegate to the training module");
const advanceBody = functionBody("advanceRouteContract");
if (!advanceBody.includes("advanceRouteContractData(")) errors.push("Route advancement must delegate to the training module");
const feelModeBody = functionBody("feelFixtureMode");
if (!feelModeBody.includes("feelFixtureModeData(")) errors.push("Feel fixture mode must delegate to the training module");
const faultBody = functionBody("trackRoomFault");
if (!faultBody.includes("recordRoomFaultData(")) errors.push("Focus faults must delegate to the training module");
const drillClearBody = functionBody("trackDrillClear");
if (!drillClearBody.includes("recordDrillClearData(")) errors.push("Focus Drill wins must delegate to the training module");
const masteryBody = functionBody("roomMasteryScore");
if (!masteryBody.includes("roomMasteryScoreData(")) errors.push("Focus mastery must delegate to the training module");
const reviewModeBody = functionBody("roomReviewMode");
if (!reviewModeBody.includes("roomReviewModeData(")) errors.push("Focus review mode must delegate to the training module");
const activeChallengeBody = functionBody("activeChallengeState");
if (!activeChallengeBody.includes("activeChallengeStateData(")) errors.push("active challenge state must delegate to the training module");
const challengeProgressBody = functionBody("challengeProgress");
if (!challengeProgressBody.includes("challengeProgressData(") || challengeProgressBody.includes("profile.challengeWins")) errors.push("challenge progress must remain pure and delegate to the training module");
const challengeBoardBody = functionBody("updateChallengeBoard");
if (challengeBoardBody.includes("writeProfile(")) errors.push("challenge rendering must not write profile state");
const challengeSyncBody = functionBody("syncChallengeWins");
if (!challengeSyncBody.includes("reconcileChallengeWinsData(") || !challengeSyncBody.includes("writeProfile(")) errors.push("challenge wins must reconcile through one explicit persistence path");
for (const name of ["recordSummitProfile", "addFlow", "markRoomClear", "trackDrillClear"]) {
  if (!functionBody(name).includes("syncChallengeWins(")) errors.push(name + " must explicitly reconcile newly earned challenge wins");
}
const cancelRouteBody = functionBody("cancelActiveRouteContract");
if (!cancelRouteBody.includes("createRouteInterruptionResultData(")) errors.push("Route interruption results must delegate to exact training result assembly");
const routeSummaryBody = functionBody("routeContractSummaryText");
if (!routeSummaryBody.includes("routeContractSummaryTextData(")) errors.push("Route summaries must delegate to training result assembly");
const completeFeelBody = functionBody("completeActiveFeelFixture");
if (!completeFeelBody.includes("createFeelCompletionResultData(")) errors.push("Feel completion results must delegate to exact training result assembly");
const feelPresentationBody = functionBody("feelFixtureStatusText");
if (!feelPresentationBody.includes("feelFixturePresentationData(")) errors.push("Feel card presentation must delegate to training result assembly");
if (js.includes("function routeContractById(") || js.includes("function feelFixtureById(")) errors.push("training state must not retain fallback-to-first Route or Feel lookup helpers");

if (!js.includes("SETTINGS_SCHEMA_VERSION = 4")) errors.push("settings schema version should be current");
if (!js.includes("PROFILE_SCHEMA_VERSION = 2")) errors.push("profile schema version should be current");
if (!js.includes("ROOM_FOCUS_SCHEMA_VERSION = 2")) errors.push("room focus schema version should be current");
if (!js.includes("lowPerformance") || !js.includes("touchSize")) errors.push("comfort settings must include lowPerformance and touchSize");

if (errors.length > 0) {
  console.error("Training state check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("Training state check passed: transitions, Route/Feel preservation, direct resume, schema versions.");
