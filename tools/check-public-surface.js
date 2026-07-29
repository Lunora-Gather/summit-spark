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
  || !roomDataSource.includes("].forEach(deepFreeze);")) {
  fail("public runtime must consume the versioned immutable room data module");
}
for (const name of ["ROOM_TARGETS", "ROOM_NAMES", "ROOM_STYLE_TRIALS", "EXPERT_REQUIREMENTS", "maps", "ROOM_ATMOSPHERES"]) {
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

if (errors.length > 0) {
  console.error("Public surface check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Public surface check passed: build ${buildVersion || "unknown"}.`);
