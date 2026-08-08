#!/usr/bin/env node
"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function expectIncludes(label, content, marker) {
  if (!content.includes(marker)) errors.push(label + " missing " + marker);
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const pending = http.request(url, options, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        resolve({ status: response.statusCode, headers: response.headers, body });
      });
    });
    pending.setTimeout(5000, () => {
      pending.destroy(new Error(url + " timed out"));
    });
    pending.on("error", reject);
    pending.end();
  });
}

async function requestText(url) {
  const response = await request(url);
  if (response.status !== 200) {
    throw new Error(url + " returned " + response.status + ": " + response.body.slice(0, 80));
  }
  return response.body;
}

function expectHeader(response, name, marker) {
  const value = String(response.headers[name] || "");
  if (!value.includes(marker)) {
    errors.push(`server ${name} header missing ${marker}`);
  }
}

async function verifyServerBoundary(baseUrl) {
  const rootResponse = await request(baseUrl + "/");
  expectHeader(rootResponse, "content-security-policy", "frame-ancestors 'none'");
  expectHeader(rootResponse, "content-security-policy", "https://fra.cloud.appwrite.io");
  expectHeader(rootResponse, "referrer-policy", "no-referrer");
  expectHeader(rootResponse, "x-content-type-options", "nosniff");
  expectHeader(rootResponse, "x-frame-options", "DENY");
  expectHeader(rootResponse, "permissions-policy", "camera=()");

  const headResponse = await request(baseUrl + "/summit-spark.js", { method: "HEAD" });
  if (headResponse.status !== 200 || headResponse.body !== "") {
    errors.push("server HEAD must return the public asset without a response body");
  }
  const moduleResponse = await request(baseUrl + "/modules/core/format.mjs", { method: "HEAD" });
  if (moduleResponse.status !== 200 || moduleResponse.body !== "" || !/text\/javascript/.test(moduleResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the core format module as JavaScript without a response body");
  }
  const mathModuleResponse = await request(baseUrl + "/modules/core/math.mjs", { method: "HEAD" });
  if (mathModuleResponse.status !== 200 || mathModuleResponse.body !== "" || !/text\/javascript/.test(mathModuleResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the core math module as JavaScript without a response body");
  }
  const roomDataResponse = await request(baseUrl + "/modules/game/room-data.mjs", { method: "HEAD" });
  if (roomDataResponse.status !== 200 || roomDataResponse.body !== "" || !/text\/javascript/.test(roomDataResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the room data module as JavaScript without a response body");
  }
  const worldModelResponse = await request(baseUrl + "/modules/game/world-model.mjs", { method: "HEAD" });
  if (worldModelResponse.status !== 200 || worldModelResponse.body !== "" || !/text\/javascript/.test(worldModelResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the world model module as JavaScript without a response body");
  }
  const effectBudgetResponse = await request(baseUrl + "/modules/game/effect-budget.mjs", { method: "HEAD" });
  if (effectBudgetResponse.status !== 200 || effectBudgetResponse.body !== "" || !/text\/javascript/.test(effectBudgetResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the effect budget module as JavaScript without a response body");
  }
  const landmarkProgressResponse = await request(baseUrl + "/modules/game/landmark-progress.mjs", { method: "HEAD" });
  if (landmarkProgressResponse.status !== 200 || landmarkProgressResponse.body !== "" || !/text\/javascript/.test(landmarkProgressResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the landmark progress module as JavaScript without a response body");
  }
  const audioCuesResponse = await request(baseUrl + "/modules/game/audio-cues.mjs", { method: "HEAD" });
  if (audioCuesResponse.status !== 200 || audioCuesResponse.body !== "" || !/text\/javascript/.test(audioCuesResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the audio cues module as JavaScript without a response body");
  }
  const lumenProgressResponse = await request(baseUrl + "/modules/game/lumen-progress.mjs", { method: "HEAD" });
  if (lumenProgressResponse.status !== 200 || lumenProgressResponse.body !== "" || !/text\/javascript/.test(lumenProgressResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the Lumen progress module as JavaScript without a response body");
  }
  const storageModuleResponse = await request(baseUrl + "/modules/systems/storage.mjs", { method: "HEAD" });
  if (storageModuleResponse.status !== 200 || storageModuleResponse.body !== "" || !/text\/javascript/.test(storageModuleResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the storage module as JavaScript without a response body");
  }
  const inputModuleResponse = await request(baseUrl + "/modules/systems/input.mjs", { method: "HEAD" });
  if (inputModuleResponse.status !== 200 || inputModuleResponse.body !== "" || !/text\/javascript/.test(inputModuleResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the input module as JavaScript without a response body");
  }
  const trainingModuleResponse = await request(baseUrl + "/modules/training/state.mjs", { method: "HEAD" });
  if (trainingModuleResponse.status !== 200 || trainingModuleResponse.body !== "" || !/text\/javascript/.test(trainingModuleResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the training module as JavaScript without a response body");
  }
  const trainingReplayResponse = await request(baseUrl + "/modules/training/replay.mjs", { method: "HEAD" });
  if (trainingReplayResponse.status !== 200 || trainingReplayResponse.body !== "" || !/text\/javascript/.test(trainingReplayResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the training replay module as JavaScript without a response body");
  }
  const uiPresentationResponse = await request(baseUrl + "/modules/ui/presentation.mjs", { method: "HEAD" });
  if (uiPresentationResponse.status !== 200 || uiPresentationResponse.body !== "" || !/text\/javascript/.test(uiPresentationResponse.headers["content-type"] || "")) {
    errors.push("server HEAD must expose the UI presentation module as JavaScript without a response body");
  }
  const postResponse = await request(baseUrl + "/index.html", { method: "POST" });
  if (postResponse.status !== 405 || postResponse.headers.allow !== "GET, HEAD") {
    errors.push("server must reject non-read methods with 405 and an Allow header");
  }
  for (const privatePath of ["/appwrite.config.json", "/package.json", "/.git/config", "/docs/APPWRITE_SETUP.md"]) {
    const response = await request(baseUrl + privatePath);
    if (response.status !== 404) errors.push("server exposed non-runtime path " + privatePath);
  }
}

function expectNoInlineScript(html) {
  const scriptTags = html.match(/<script\b[^>]*>/g) || [];
  for (const tag of scriptTags) {
    if (!/\bsrc=/.test(tag)) errors.push("html must not contain inline script tags under CSP");
  }
}

async function waitForServer(baseUrl, child) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < 6000) {
    if (child.exitCode !== null) break;
    try {
      return await requestText(baseUrl + "/");
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  throw lastError || new Error("server exited before smoke request");
}

async function main() {
  const indexHtml = read("public/index.html");

  const buildVersion = (indexHtml.match(/name="build-version" content="([^"]+)"/) || [])[1] || "";
  if (!/^\d{8}-p\d+$/.test(buildVersion)) errors.push("build version should use YYYYMMDD-pN, found " + (buildVersion || "missing"));

  const port = await findFreePort();
  const child = childProcess.spawn(process.execPath, ["game-server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  try {
    const baseUrl = "http://127.0.0.1:" + port;
    const html = await waitForServer(baseUrl, child);
    await verifyServerBoundary(baseUrl);
    const js = await requestText(baseUrl + "/summit-spark.js?v=" + encodeURIComponent(buildVersion));
    const coreFormat = await requestText(baseUrl + "/modules/core/format.mjs?v=" + encodeURIComponent(buildVersion));
    const coreMath = await requestText(baseUrl + "/modules/core/math.mjs?v=" + encodeURIComponent(buildVersion));
    const roomData = await requestText(baseUrl + "/modules/game/room-data.mjs?v=" + encodeURIComponent(buildVersion));
    const worldModel = await requestText(baseUrl + "/modules/game/world-model.mjs?v=" + encodeURIComponent(buildVersion));
    const effectBudget = await requestText(baseUrl + "/modules/game/effect-budget.mjs?v=" + encodeURIComponent(buildVersion));
    const landmarkProgress = await requestText(baseUrl + "/modules/game/landmark-progress.mjs?v=" + encodeURIComponent(buildVersion));
    const audioCues = await requestText(baseUrl + "/modules/game/audio-cues.mjs?v=" + encodeURIComponent(buildVersion));
    const lumenProgress = await requestText(baseUrl + "/modules/game/lumen-progress.mjs?v=" + encodeURIComponent(buildVersion));
    const storageModule = await requestText(baseUrl + "/modules/systems/storage.mjs?v=" + encodeURIComponent(buildVersion));
    const inputModule = await requestText(baseUrl + "/modules/systems/input.mjs?v=" + encodeURIComponent(buildVersion));
    const trainingModule = await requestText(baseUrl + "/modules/training/state.mjs?v=" + encodeURIComponent(buildVersion));
    const trainingReplayModule = await requestText(baseUrl + "/modules/training/replay.mjs?v=" + encodeURIComponent(buildVersion));
    const uiPresentationModule = await requestText(baseUrl + "/modules/ui/presentation.mjs?v=" + encodeURIComponent(buildVersion));
    const css = await requestText(baseUrl + "/summit-spark.css?v=" + encodeURIComponent(buildVersion));
    expectNoInlineScript(html);

    [
      `name="build-version" content="${buildVersion}"`,
      `summit-spark.css?v=${buildVersion}`,
      `summit-spark.js?v=${buildVersion}`,
      'id="settingsPanel"',
      'id="practiceButton"',
      'id="feelLab"',
      'id="audioTestButton"',
      'id="feedbackType"',
      'id="feedbackNote"',
      'id="diagnosticsButton"',
      'id="feedbackTemplateButton"',
      'id="gamepadStatus"',
      'id="saveExportButton"',
      'id="saveDownloadButton"',
      'id="saveImportButton"',
      'id="saveRestoreButton"',
      'id="saveImportText"',
      'id="saveImportStatus"',
      'id="saveBackupStatus"',
      'id="routeContracts"',
      'id="gameStatus"',
      'settings-group-training',
      'settings-group-controls',
      'settings-group-audio',
      'settings-group-display',
      'settings-group-feedback'
    ].forEach((marker) => expectIncludes("html", html, marker));
    if (html.includes("start-guide") || html.includes("start-copy")) errors.push("html should not expose explanatory start guide blocks");
    const openSettingsGroups = html.match(/<details class="settings-group [^"]+" open>/g) || [];
    if (openSettingsGroups.length !== 0) errors.push("settings groups should all start collapsed");
    ["首次输入开始计时", "松开按键后待命", "修正路线", "REHEARSE"].forEach((marker) => {
      if (js.includes(marker)) errors.push("runtime should not expose quiet-mode prompt text: " + marker);
    });
    expectIncludes("js", js, `modules/core/format.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/core/math.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/game/room-data.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/game/world-model.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/game/effect-budget.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/game/landmark-progress.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/game/audio-cues.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/game/lumen-progress.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/systems/storage.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/systems/input.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/training/state.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/training/replay.mjs?v=${buildVersion}`);
    expectIncludes("js", js, `modules/ui/presentation.mjs?v=${buildVersion}`);
    expectIncludes("world model", worldModel, "export function cameraFollowData(");
    expectIncludes("world model", worldModel, "export function phaseBlockActiveData(");
    expectIncludes("UI presentation", uiPresentationModule, "export function roomSplitFeedbackData(");
    expectIncludes("UI presentation", uiPresentationModule, "export function chapterTransitionResultData(");
    expectIncludes("UI presentation", uiPresentationModule, "export function chapterTransitionResultTextData(");
    expectIncludes("UI presentation", uiPresentationModule, "export function summitChapterResultTextData(");
    ["export function formatTime(", "export function formatDelta(", "export function formatLocalDateTime(", "export function splitGrade(", "export function escapeHtml("]
      .forEach((marker) => expectIncludes("core format", coreFormat, marker));
    ["export function aabb(", "export function distRectPoint(", "export function approach("]
      .forEach((marker) => expectIncludes("core math", coreMath, marker));
    ["export const ROOM_TARGETS = [", "export const maps = [", "export const ROOM_ATMOSPHERES = [", "export const ROOM_LANDMARKS = [", "export const CHAPTER_SURFACE_KINDS = [", "export const CHAPTER_SURFACE_FEEDBACK = [", "export const MECHANIC_FIRST_TOUCH_CUES = {", "export function mechanicFirstTouchCueData(", "].forEach(deepFreeze);"]
      .forEach((marker) => expectIncludes("room data", roomData, marker));
    ["export const EFFECT_BUDGETS =", "export function effectQueueLimit(", "export function enforceEffectQueueBudget("]
      .forEach((marker) => expectIncludes("effect budget", effectBudget, marker));
    ["export const MOUNTAIN_GATE_LANDMARK_KINDS =", "export function mountainGateLandmarkProgress(", "export function oldPeakRelayLandmarkProgress("]
      .forEach((marker) => expectIncludes("landmark progress", landmarkProgress, marker));
    ["export const CHAPTER_AUDIO_PROFILES =", "export function ambientChapterCueData(", "export function chapterEntryCueData(", "export function summitCueData("]
      .forEach((marker) => expectIncludes("audio cues", audioCues, marker));
    ["export function resetRoomLumenProgressData("]
      .forEach((marker) => expectIncludes("Lumen progress", lumenProgress, marker));
    ["export function finiteNonNegativeNumber(", "export function normalizeSettingsData(", "export function readStoredJson(", "export function normalizeRoomFocusData(", "export function parseSaveArchiveText(", "export function createSaveArchiveData(", "export function createSaveBackupData(", "export function writeStorageTransaction("]
      .forEach((marker) => expectIncludes("storage module", storageModule, marker));
    ["export function resolveGamepadState(", "export function newlyPressedActions(", "export function effectiveBindingsData(", "export function rebindActionData(", "export function setInputBuffer(", "export function tickInputBuffers(", "export function consumeInputBuffer(", "export function clearInputBuffers("]
      .forEach((marker) => expectIncludes("input module", inputModule, marker));
    ["export const TRAINING_TRANSITIONS = Object.freeze({", "export function createDrillData(", "export function drillSucceededData(", "export function activeRouteContractDataFor(", "export function advanceRouteContractData(", "export function feelFixtureModeData(", "export function recordRoomFaultData(", "export function recordDrillClearData(", "export function roomMasteryScoreData(", "export function roomReviewModeData(", "export function practiceRoomRecommendationsData(", "export function practicePlanTargetsData(", "export function activeChallengeStateData(", "export function challengeProgressData(", "export function reconcileChallengeWinsData(", "export function createRouteInterruptionResultData(", "export function createFeelCompletionResultData(", "export function feelFixturePresentationData("]
      .forEach((marker) => expectIncludes("training module", trainingModule, marker));
    ["export const REPLAY_ACTION_LABELS =", "export function replayActionMarkersData(", "export function replayGhostStateData("]
      .forEach((marker) => expectIncludes("training replay module", trainingReplayModule, marker));
    ["export function chapterCompletionData(", "export function chapterGrade(", "export function challengeProgressSummaryData(", "export function drillModeLabel(", "export function drillModeShort(", "export function feedbackDiagnosticsData(", "export function feedbackTemplateTextData(", "export function gamepadStatusTextData(", "export function practiceProgressSummaryData(", "export function roomReviewPriorityData(", "export function routeSlotForMode(", "export function routeSlotLabel(", "export function routeSlotShort(", "export function rankPracticeLedgerRowsData(", "export function saveArchiveSummaryData(", "export function saveBackupSummaryData("]
      .forEach((marker) => expectIncludes("UI presentation module", uiPresentationModule, marker));

    [
      "markAppReady",
      "syncSettingsPanel",
      "updateFeelLab",
      "startFeelFixture",
      "activeFeelFixture",
      "lastFeelFixtureResult",
      "cancelActiveRouteContract",
      "playAudioTestPattern",
      "buildDiagnosticsSnapshot",
      "copyDiagnosticsSnapshot",
      "feedbackDiagnostics",
      "buildFeedbackTemplate",
      "buildSaveArchive",
      "createCurrentSaveBackup",
      "restoreSaveBackup",
      "panelMode",
      "importSaveArchive",
      "normalizeSaveArchiveText",
      "updateSaveImportPreview",
      "gamepadDiagnostics",
      "isSettingsTextEntryTarget",
      "requestAnimationFrame(frame)"
    ].forEach((marker) => expectIncludes("js", js, marker));

    [
      "settings-panel",
      "feel-lab",
      "feel-card.active",
      "feel-card.recent",
      "feel-card.interrupted",
      "route-contract-card.done",
      "boot-fallback",
      "compact-actions",
      "gamepad-status-row",
      "save-import-box",
      "save-import-status",
      "settings-group-audio",
      "settings-group-display",
      "touch-directions",
      "touch-actions",
      "review-more",
      "review-grid-primary",
      "P21 system polish",
      "P22 mobile playability",
      "P23 panel split",
      "stage.free-play #splitTime",
      "settings-group"
    ].forEach((marker) => expectIncludes("css", css, marker));
  } finally {
    if (child.exitCode === null) child.kill();
  }

  if (errors.length > 0) {
    console.error("Smoke check failed:");
    for (const error of errors) console.error("- " + error);
    if (stderr.trim()) console.error("Server stderr:\n" + stderr.trim());
    process.exit(1);
  }
  console.log("Smoke check passed: local HTTP boot, p" + buildVersion.split("-p")[1] + " assets, training UI markers.");
}

main().catch((error) => {
  console.error("Smoke check failed:");
  console.error("- " + error.message);
  process.exit(1);
});
