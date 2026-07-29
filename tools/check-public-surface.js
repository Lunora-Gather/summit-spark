#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function fail(message) {
  errors.push(message);
}

function extractOne(label, source, pattern) {
  const match = source.match(pattern);
  if (!match) {
    fail(`missing ${label}`);
    return null;
  }
  return match[1];
}

const gameHtml = read("public/index.html");
const playtestChecklist = read("PLAYTEST_CHECKLIST.md");
const pagesWorkflow = read(".github/workflows/pages.yml");
const runtimeSource = read("public/summit-spark.js");
const coreFormatSource = read("public/modules/core/format.mjs");
const coreMathSource = read("public/modules/core/math.mjs");
const roomDataSource = read("public/modules/game/room-data.mjs");
const storageSource = read("public/modules/systems/storage.mjs");
const inputSource = read("public/modules/systems/input.mjs");
const trainingSource = read("public/modules/training/state.mjs");
const uiPresentationSource = read("public/modules/ui/presentation.mjs");

const buildVersion = extractOne(
  "meta build-version",
  gameHtml,
  /<meta name="build-version" content="([^"]+)">/
);
const cssVersion = extractOne(
  "css asset version",
  gameHtml,
  /summit-spark\.css\?v=([^"]+)/
);
const jsVersion = extractOne(
  "js asset version",
  gameHtml,
  /summit-spark\.js\?v=([^"]+)/
);
const coreFormatVersion = extractOne(
  "core format module version",
  runtimeSource,
  /modules\/core\/format\.mjs\?v=([^"]+)"/
);
const coreMathVersion = extractOne(
  "core math module version",
  runtimeSource,
  /modules\/core\/math\.mjs\?v=([^"]+)"/
);
const roomDataVersion = extractOne(
  "room data module version",
  runtimeSource,
  /modules\/game\/room-data\.mjs\?v=([^"]+)"/
);
const storageVersion = extractOne(
  "storage module version",
  runtimeSource,
  /modules\/systems\/storage\.mjs\?v=([^"]+)"/
);
const inputVersion = extractOne(
  "input module version",
  runtimeSource,
  /modules\/systems\/input\.mjs\?v=([^"]+)"/
);
const trainingVersion = extractOne(
  "training state module version",
  runtimeSource,
  /modules\/training\/state\.mjs\?v=([^"]+)"/
);
const uiPresentationVersion = extractOne(
  "UI presentation module version",
  runtimeSource,
  /modules\/ui\/presentation\.mjs\?v=([^"]+)"/
);

if (buildVersion && cssVersion && buildVersion !== cssVersion) {
  fail(`css version ${cssVersion} does not match build version ${buildVersion}`);
}

if (buildVersion && jsVersion && buildVersion !== jsVersion) {
  fail(`js version ${jsVersion} does not match build version ${buildVersion}`);
}

if (buildVersion && coreFormatVersion && buildVersion !== coreFormatVersion) {
  fail(`core format version ${coreFormatVersion} does not match build version ${buildVersion}`);
}

if (buildVersion && coreMathVersion && buildVersion !== coreMathVersion) {
  fail(`core math version ${coreMathVersion} does not match build version ${buildVersion}`);
}

if (buildVersion && roomDataVersion && buildVersion !== roomDataVersion) {
  fail(`room data version ${roomDataVersion} does not match build version ${buildVersion}`);
}

if (buildVersion && storageVersion && buildVersion !== storageVersion) {
  fail(`storage version ${storageVersion} does not match build version ${buildVersion}`);
}

if (buildVersion && inputVersion && buildVersion !== inputVersion) {
  fail(`input version ${inputVersion} does not match build version ${buildVersion}`);
}
if (buildVersion && trainingVersion && buildVersion !== trainingVersion) {
  fail(`training version ${trainingVersion} does not match build version ${buildVersion}`);
}
if (buildVersion && uiPresentationVersion && buildVersion !== uiPresentationVersion) {
  fail(`UI presentation version ${uiPresentationVersion} does not match build version ${buildVersion}`);
}

if (!playtestChecklist.includes("meta build-version") || !playtestChecklist.includes("node tools/check-public-surface.js")) {
  fail("PLAYTEST_CHECKLIST.md should verify the current build through the public-surface check");
}

if (/20\d{6}-p\d+/.test(playtestChecklist)) {
  fail("PLAYTEST_CHECKLIST.md should not pin a release build that becomes stale after the next update");
}

const requiredFragments = [
  '<html lang="zh-CN">',
  'http-equiv="Content-Security-Policy"',
  'script-src-attr \'none\'',
  'connect-src \'self\' https://fra.cloud.appwrite.io',
  'worker-src \'none\'',
  '<meta name="referrer" content="no-referrer">',
  '<canvas id="game"',
  'id="startButton"',
  'id="settingsPanel"',
  'id="practiceButton"',
  'id="feedbackNote"',
  'id="saveImportText"',
  'data-touch="jump"',
  'data-touch="dash"',
  'data-touch="grab"',
  '<script src="summit-spark.js?'
];

for (const fragment of requiredFragments) {
  if (!gameHtml.includes(fragment)) fail(`public/index.html should include ${fragment}`);
}

if (!pagesWorkflow.includes("Stage public runtime only") || !pagesWorkflow.includes("path: _site")) {
  fail("Pages deployment must publish the staged runtime instead of the full repository");
}
if (pagesWorkflow.includes("path: .\n")) {
  fail("Pages deployment must not publish the full repository root");
}
if (!runtimeSource.includes("window.self !== window.top") || !runtimeSource.includes("document.body.replaceChildren(notice)")) {
  fail("public runtime must stop before initialization when embedded by another page");
}
if (!runtimeSource.includes('import("./modules/core/format.mjs?v=') || !coreFormatSource.includes("export function formatTime(")) {
  fail("public runtime must consume the versioned core format module");
}
if (!runtimeSource.includes('import("./modules/core/math.mjs?v=') || !coreMathSource.includes("export function aabb(")) {
  fail("public runtime must consume the versioned core math module");
}
if (!runtimeSource.includes('import("./modules/game/room-data.mjs?v=')
  || !roomDataSource.includes("export const maps = [")
  || !roomDataSource.includes("export const ROOM_LANDMARKS = [")
  || !roomDataSource.includes("export const CHAPTER_SURFACE_KINDS = [")
  || !roomDataSource.includes("export const MECHANIC_FIRST_TOUCH_CUES = {")
  || !roomDataSource.includes("export function mechanicFirstTouchCueData(")
  || !runtimeSource.includes("drawRoomLandmark(ambientTime, atmosphere)")
  || !roomDataSource.includes("].forEach(deepFreeze);")) {
  fail("public runtime must consume the versioned immutable room data and landmark module");
}
if (!runtimeSource.includes("CHAPTER_SURFACE_KINDS[chapterIndexForRoom(roomIndex)]")
  || !runtimeSource.includes("const material = CHAPTER_SURFACE_KINDS.includes(surfaceKind)")
  || !runtimeSource.includes("`${scale}:${material}:")) {
  fail("rock tile cache should preserve four chapter-owned surface materials");
}
for (const trigger of [
  'showMechanicFirstTouchCue("relay")',
  'showMechanicFirstTouchCue("spring")',
  'showMechanicFirstTouchCue("updraft")',
  'showMechanicFirstTouchCue("crumble")',
  'showMechanicFirstTouchCue("prism")'
]) {
  if (!runtimeSource.includes(trigger)) fail(`public runtime should trigger ${trigger} on first mechanic contact`);
}
if (!runtimeSource.includes('showFeelCue("回声召回", "冲刺与体力已恢复"')
  || !runtimeSource.includes('setGameStatus("回声锚点已激活，可随时召回")')
  || !runtimeSource.includes('setGameStatus("回声召回：冲刺与体力已恢复")')) {
  fail("Echo activation and recall should expose concise canvas and live-status feedback");
}
if (!roomDataSource.includes('resolve: "断开的旧路，被你重新连起。"')
  || !runtimeSource.includes("let chapterTransitionFromChapter = -1")
  || !runtimeSource.includes("drawChapterTransitionCopy({")
  || !runtimeSource.includes('focus: "章节收束"')) {
  fail("chapter transitions must close the previous act before presenting the next act");
}
for (const name of ["ROOM_TARGETS", "ROOM_NAMES", "ROOM_STYLE_TRIALS", "EXPERT_REQUIREMENTS", "maps", "ROOM_ATMOSPHERES", "ROOM_LANDMARKS", "CHAPTER_SURFACE_KINDS"]) {
  if (new RegExp(`\\bconst\\s+${name}\\s*=`).test(runtimeSource)) {
    fail(`public runtime must not duplicate room-data ownership for ${name}`);
  }
}
if (!runtimeSource.includes('import("./modules/systems/storage.mjs?v=')
  || !storageSource.includes("export function finiteNonNegativeNumber(")
  || !storageSource.includes("export function normalizeSettingsData(")
  || !storageSource.includes("export function readStoredJson(")
  || !storageSource.includes("export function createSaveArchiveData(")
  || !storageSource.includes("export function createSaveBackupData(")
  || !storageSource.includes("export function writeStorageTransaction(")) {
  fail("public runtime must consume the versioned storage foundation module");
}
for (const name of ["finiteNonNegativeNumber", "finiteNonNegativeInt", "strictBoolean"]) {
  if (new RegExp(`\\bfunction\\s+${name}\\s*\\(`).test(runtimeSource)) {
    fail(`public runtime must not duplicate storage ownership for ${name}`);
  }
}
for (const delegation of [
  "return readStoredJsonData(localStorage, key, fallback, normalize, markStorageIssue)",
  "return normalizeSettingsData(saved, defaults, {",
  "const archive = createSaveArchiveData({",
  "return createSaveBackupData({"
]) {
  if (!runtimeSource.includes(delegation)) {
    fail(`public runtime must delegate storage ownership through ${delegation}`);
  }
}
if (!runtimeSource.includes('import("./modules/systems/input.mjs?v=')
  || !inputSource.includes("export function resolveGamepadState(")
  || !inputSource.includes("export function effectiveBindingsData(")
  || !inputSource.includes("export function rebindActionData(")
  || !inputSource.includes("export function setInputBuffer(")
  || !inputSource.includes("export function tickInputBuffers(")
  || !inputSource.includes("export function consumeInputBuffer(")
  || !inputSource.includes("export function clearInputBuffers(")) {
  fail("public runtime must consume the versioned input mapping module");
}
for (const delegation of [
  "const resolved = resolveGamepadState(pads, {",
  "return effectiveBindingsData(settings, CONTROL_PRESETS)",
  "const rebound = rebindActionData(settings.customBindings",
  "tickInputBuffers(player, dt)",
  'setInputBuffer(player, "jump", JUMP_BUFFER_TIME)',
  'consumeInputBuffer(player, "dash")',
  "clearInputBuffers(player)"
]) {
  if (!runtimeSource.includes(delegation)) {
    fail(`public runtime must delegate input ownership through ${delegation}`);
  }
}

if (!runtimeSource.includes('import("./modules/training/state.mjs?v=')
  || !trainingSource.includes("export const TRAINING_TRANSITIONS = Object.freeze({")
  || !trainingSource.includes("export function drillSucceededData(")
  || !trainingSource.includes("export function activeRouteContractDataFor(")
  || !trainingSource.includes("export function advanceRouteContractData(")
  || !trainingSource.includes("export function feelFixtureModeData(")
  || !trainingSource.includes("export function recordRoomFaultData(")
  || !trainingSource.includes("export function recordDrillClearData(")
  || !trainingSource.includes("export function roomMasteryScoreData(")
  || !trainingSource.includes("export function roomReviewModeData(")
  || !trainingSource.includes("export function activeChallengeStateData(")
  || !trainingSource.includes("export function challengeProgressData(")
  || !trainingSource.includes("export function reconcileChallengeWinsData(")
  || !trainingSource.includes("export function createRouteInterruptionResultData(")
  || !trainingSource.includes("export function createFeelCompletionResultData(")
  || !trainingSource.includes("export function feelFixturePresentationData(")) {
  fail("public runtime must consume the versioned training state module");
}
for (const delegation of [
  "clearTrainingTransitionState(trainingTransitionOptionsData(name, overrides))",
  "activeDrill = createDrillData(",
  "return drillSucceededData(drill, {",
  "return activeRouteContractDataFor(activeRouteContract, ROUTE_CONTRACTS)",
  "const advancement = advanceRouteContractData(",
  "return feelFixtureModeData(fixture)",
  "roomFocus[roomIndex] = recordRoomFaultData(entry, normalized)",
  "roomFocus[index] = recordDrillClearData(entry, clean, mode)",
  "return roomMasteryScoreData({",
  "return roomReviewModeData({ entry, loss, pressure, grade })",
  "return activeChallengeStateData(activeChallenge, challenge, {",
  "const progress = challengeProgressData(challenge, {",
  "const reconciled = reconcileChallengeWinsData(",
  "const result = createRouteInterruptionResultData(",
  "lastRouteContractResult = createRouteCompletionResultData(contract)",
  "const result = createFeelCompletionResultData(",
  "return feelFixturePresentationData("
]) {
  if (!runtimeSource.includes(delegation)) {
    fail(`public runtime must delegate training ownership through ${delegation}`);
  }
}

if (!runtimeSource.includes('import("./modules/ui/presentation.mjs?v=')
  || !uiPresentationSource.includes("export function chapterCompletionData(")
  || !uiPresentationSource.includes("export function chapterGrade(")
  || !uiPresentationSource.includes("export function roomReviewPriorityData(")
  || !uiPresentationSource.includes("export function rankPracticeLedgerRowsData(")) {
  fail("public runtime must consume the versioned UI presentation module");
}
for (const delegation of [
  "return chapterCompletionModelData({",
  "return roomReviewPriorityData({",
  "return rankPracticeLedgerRowsData(maps.map("
]) {
  if (!runtimeSource.includes(delegation)) {
    fail(`public runtime must delegate UI presentation ownership through ${delegation}`);
  }
}
if (/\bfunction\s+chapterGrade\s*\(/.test(runtimeSource)) {
  fail("public runtime must not duplicate the UI-owned chapter grade rule");
}

if (errors.length > 0) {
  console.error("Public surface check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Public surface check passed: build ${buildVersion || "unknown"}.`);
