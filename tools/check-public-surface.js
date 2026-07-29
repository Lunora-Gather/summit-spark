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
const stylesheetSource = read("public/summit-spark.css");
const coreFormatSource = read("public/modules/core/format.mjs");
const coreMathSource = read("public/modules/core/math.mjs");
const roomDataSource = read("public/modules/game/room-data.mjs");
const effectBudgetSource = read("public/modules/game/effect-budget.mjs");
const audioCuesSource = read("public/modules/game/audio-cues.mjs");
const storageSource = read("public/modules/systems/storage.mjs");
const inputSource = read("public/modules/systems/input.mjs");
const trainingSource = read("public/modules/training/state.mjs");
const trainingReplaySource = read("public/modules/training/replay.mjs");
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
const effectBudgetVersion = extractOne(
  "effect budget module version",
  runtimeSource,
  /modules\/game\/effect-budget\.mjs\?v=([^"]+)"/
);
const audioCuesVersion = extractOne(
  "audio cues module version",
  runtimeSource,
  /modules\/game\/audio-cues\.mjs\?v=([^"]+)"/
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
const trainingReplayVersion = extractOne(
  "training replay module version",
  runtimeSource,
  /modules\/training\/replay\.mjs\?v=([^"]+)"/
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
if (buildVersion && effectBudgetVersion && buildVersion !== effectBudgetVersion) {
  fail(`effect budget version ${effectBudgetVersion} does not match build version ${buildVersion}`);
}
if (buildVersion && audioCuesVersion && buildVersion !== audioCuesVersion) {
  fail(`audio cues version ${audioCuesVersion} does not match build version ${buildVersion}`);
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
if (buildVersion && trainingReplayVersion && buildVersion !== trainingReplayVersion) {
  fail(`training replay version ${trainingReplayVersion} does not match build version ${buildVersion}`);
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
  || !roomDataSource.includes("export const CHAPTER_SURFACE_FEEDBACK = [")
  || !roomDataSource.includes("export const MECHANIC_FIRST_TOUCH_CUES = {")
  || !roomDataSource.includes("export function mechanicFirstTouchCueData(")
  || !runtimeSource.includes("drawRoomLandmark(ambientTime, atmosphere)")
  || !roomDataSource.includes("].forEach(deepFreeze);")) {
  fail("public runtime must consume the versioned immutable room data and landmark module");
}
if (!runtimeSource.includes('import("./modules/game/effect-budget.mjs?v=')
  || !effectBudgetSource.includes("export function effectQueueLimit(")
  || !effectBudgetSource.includes("export function enforceEffectQueueBudget(")
  || !runtimeSource.includes('budgetEffectQueue("particles", particles)')
  || !runtimeSource.includes('budgetEffectQueue("ghosts", ghosts)')
  || !runtimeSource.includes('budgetEffectQueue("shards", shards)')
  || !runtimeSource.includes('budgetEffectQueue("lightTrails", lightTrails)')) {
  fail("public runtime must consume and enforce the shared effect queue budgets");
}
if (runtimeSource.includes("while (lightTrails.length > 18)")) {
  fail("public runtime must not retain an independent light-trail queue limit");
}
[
  "DEATH_MARK_LIFE",
  "DEATH_REPLAY_LIFE",
  "DEATH_COACH_TIME",
  "FAILURE_REHEARSAL_TIME",
  "deathMarks",
  "deathReplays",
  "deathCoachTimer",
  "failureCueTimer",
  "addDeathMark",
  "updateDeathMarks",
  "drawDeathMarks",
  "drawDeathReplays",
  "drawFailureGhostLine",
  "drawFailureGhostArrow",
  "drawFailureRehearsalCue",
  "drawFailureRouteArrow",
  "drawDeathCoach",
  "showDeathCoach",
  "clearDeathCoach",
  "showFailureRehearsal",
  "showDrillFailureRehearsal",
  "clearFailureRehearsal",
  "showBeginnerDeathTip",
  "deathPrescription",
  "deathCoachPlanText"
].forEach((marker) => {
  if (runtimeSource.includes(marker)) {
    fail(`public runtime must not restore obsolete quiet-failure pipeline marker ${marker}`);
  }
});
if (!runtimeSource.includes('import("./modules/game/audio-cues.mjs?v=')
  || !audioCuesSource.includes("export const CHAPTER_AUDIO_PROFILES")
  || !audioCuesSource.includes("export function ambientChapterCueData(")
  || !audioCuesSource.includes("export function chapterEntryCueData(")
  || !audioCuesSource.includes("export function summitCueData(")
  || !runtimeSource.includes("playChapterEntrySound(chapterTransitionChapter, chapterTransitionFromChapter)")
  || !runtimeSource.includes("clearAmbientVoices()")
  || !runtimeSource.includes("playSummitSound()")) {
  fail("public runtime must consume chapter-owned ambient, transition and summit audio cues");
}
if (runtimeSource.includes("const AMBIENT_CHAPTER_CHORDS")) {
  fail("public runtime must not duplicate chapter audio profile ownership");
}
if (!runtimeSource.includes('import("./modules/training/replay.mjs?v=')
  || !trainingReplaySource.includes("export const REPLAY_ACTION_LABELS")
  || !trainingReplaySource.includes("export function replayActionMarkersData(")
  || !trainingReplaySource.includes("export function replayGhostStateData(")
  || !runtimeSource.includes("drawReplayTag(path[0].x, path[0].y - 18, \"PB 路线\"")
  || !runtimeSource.includes("drawReplayTag(origin.x, origin.y - 15, \"本次\"")
  || !runtimeSource.includes("drawReplayActionMarker(marker, alpha, showLabel)")
  || !runtimeSource.includes("replayGhostStateData(ghost)")) {
  fail("practice replay must distinguish PB/current paths and explain bounded action transitions");
}
if (!runtimeSource.includes("CHAPTER_SURFACE_KINDS[chapterIndexForRoom(roomIndex)]")
  || !runtimeSource.includes("const material = CHAPTER_SURFACE_KINDS.includes(surfaceKind)")
  || !runtimeSource.includes("`${scale}:${material}:")) {
  fail("rock tile cache should preserve four chapter-owned surface materials");
}
if (!runtimeSource.includes("CHAPTER_SURFACE_FEEDBACK[chapter]")
  || !runtimeSource.includes("emitSurfaceLandingFeedback(fallSpeed, true)")
  || !runtimeSource.includes("emitSurfaceLandingFeedback(fallSpeed, false)")) {
  fail("runtime landing feedback should consume the four chapter-owned surface identities");
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
if (!runtimeSource.includes("drawRouteFocusCue(time);\n    drawFeelCue(time);")
  || !runtimeSource.includes("setGameStatus(`${cue.title}：${cue.detail}`)")
  || runtimeSource.includes("triggerSparkVariantVisual(variant);\n    showFeelCue(")) {
  fail("public runtime should render and announce one-shot mechanic cues without per-Spark text noise");
}
for (const deadFunction of [
  "activeDrillText",
  "buildSaveArchiveText",
  "createProfile",
  "drawContractStrip",
  "drawFlowCue",
  "drawRelayChainCue",
  "drawRoomBestCue",
  "drillHudDetailText",
  "normalizeRoomPathPoint",
  "roomBriefText",
  "roomCleanShort",
  "roomPaceShort",
  "roomSkillShort",
  "routeContractHudDetail",
  "summitReview",
  "tileAt"
]) {
  if (runtimeSource.includes(`function ${deadFunction}(`)) fail(`public runtime should not ship consumerless helper ${deadFunction}`);
}
for (const match of runtimeSource.matchAll(/^  function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
  const name = match[1];
  const references = runtimeSource.match(new RegExp(`\\b${name}\\b`, "g"))?.length || 0;
  if (references <= 1) fail(`public runtime function ${name} has no consumer`);
}
const importBindingsSource = runtimeSource.slice(
  runtimeSource.indexOf("  const ["),
  runtimeSource.indexOf("  ] = await Promise.all")
);
for (const match of importBindingsSource.matchAll(/^      ([A-Za-z_$][\w$]*)(?::\s*([A-Za-z_$][\w$]*))?,?$/gm)) {
  const localName = match[2] || match[1];
  const escaped = localName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const references = runtimeSource.match(new RegExp(`\\b${escaped}\\b`, "g"))?.length || 0;
  if (references <= 1) fail(`public runtime import ${localName} has no consumer`);
}
for (const declaration of runtimeSource.matchAll(/^  let\s+([A-Za-z_$][\w$]*)\b/gm)) {
  const name = declaration[1];
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const occurrencePattern = new RegExp(`(?<![\\w$])${escaped}(?![\\w$])`, "g");
  let reads = 0;
  for (const occurrence of runtimeSource.matchAll(occurrencePattern)) {
    const occurrenceIndex = occurrence.index || 0;
    if (occurrenceIndex >= declaration.index && occurrenceIndex < declaration.index + declaration[0].length) continue;
    const before = runtimeSource.slice(Math.max(0, occurrenceIndex - 12), occurrenceIndex);
    const after = runtimeSource.slice(occurrenceIndex + name.length, occurrenceIndex + name.length + 12);
    const directWrite = /(?:\+\+|--)\s*$/.test(before)
      || /^\s*(?:=(?!=)|\+=|-=|\*=|\/=|%=|\+\+|--)/.test(after);
    if (!directWrite) reads += 1;
  }
  if (reads === 0) fail(`public runtime mutable state ${name} is written but never read`);
}
const surfaceConsumerSource = `${gameHtml}\n${runtimeSource}`;
const stylesheetClasses = new Set(
  [...stylesheetSource.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => match[1])
);
for (const name of stylesheetClasses) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`(^|[^\\w-])${escaped}([^\\w-]|$)`).test(surfaceConsumerSource)) {
    fail(`public stylesheet class ${name} has no HTML or runtime consumer`);
  }
}
if (!runtimeSource.includes('showFeelCue("回声召回", "冲刺与体力已恢复"')
  || !runtimeSource.includes('setGameStatus("回声锚点已激活，可随时召回")')
  || !runtimeSource.includes('setGameStatus("回声召回：冲刺与体力已恢复")')) {
  fail("Echo activation and recall should expose concise canvas and live-status feedback");
}
for (const feedback of [
  'wind: [{ type: "sine"',
  'checkpoint: [{ type: "sine"',
  'crack: [{ type: "square"',
  "const wasInUpdraft = player.inUpdraft",
  "const enteredUpdraft = !wasInUpdraft && !player.inUpdraft",
  'playSound("wind", 0.58)',
  'playSound("checkpoint", 0.72)',
  'setGameStatus(`检查点已点亮 · R${roomIndex + 1}`)',
  'playSound("crack", 0.62)',
  'playSound("crumble", 0.72)'
]) {
  if (!runtimeSource.includes(feedback)) fail(`world feedback chain missing ${feedback}`);
}
if (!runtimeSource.includes("Number.isFinite(soundCooldowns[name])")) {
  fail("sound cooldowns should suppress same-frame world feedback even at audio time zero");
}
if (!runtimeSource.includes("let summitChapterResult = null")
  || !runtimeSource.includes("summitChapterResult = chapterResultForTransition(chapterIndexForRoom(roomIndex))")
  || !runtimeSource.includes("summitChapterResultText(summitChapterResult)")
  || !runtimeSource.includes("clearSplitPopup();\n    clearMasteryPopup();\n    clearFocusPopup();")) {
  fail("summit reveal must own final-act evidence without overlapping expiring room-result overlays");
}
if (!uiPresentationSource.includes("export function postRunReviewData(")
  || !runtimeSource.includes("function currentRunReviewData(")
  || !runtimeSource.includes('reviewCardHtml("本轮最大损失"')
  || !runtimeSource.includes("postRunTrainingAdvice(runPlan)")) {
  fail("summit review must use current-run evidence before falling back to long-term practice priorities");
}
if (!roomDataSource.includes('resolve: "断开的旧路，被你重新连起。"')
  || !runtimeSource.includes("let chapterTransitionFromChapter = -1")
  || !runtimeSource.includes("let chapterTransitionFromResult = null")
  || !runtimeSource.includes("chapterResultForTransition(chapterTransitionFromChapter)")
  || !runtimeSource.includes("chapterTransitionResultText(chapterTransitionFromResult)")
  || !runtimeSource.includes("drawChapterTransitionCopy({")
  || !uiPresentationSource.includes("export function chapterTransitionResultData(")) {
  fail("chapter transitions must close the previous act before presenting the next act");
}
for (const name of ["ROOM_TARGETS", "ROOM_NAMES", "ROOM_STYLE_TRIALS", "EXPERT_REQUIREMENTS", "maps", "ROOM_ATMOSPHERES", "ROOM_LANDMARKS", "CHAPTER_SURFACE_KINDS", "CHAPTER_SURFACE_FEEDBACK"]) {
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
  || !uiPresentationSource.includes("export function chapterTransitionResultData(")
  || !uiPresentationSource.includes("export function roomSplitFeedbackData(")
  || !uiPresentationSource.includes("export function roomReviewPriorityData(")
  || !uiPresentationSource.includes("export function rankPracticeLedgerRowsData(")
  || !uiPresentationSource.includes("export function runChapterSplitsData(")
  || !uiPresentationSource.includes("export function runChapterReviewData(")
  || !uiPresentationSource.includes("export function runReportTextData(")) {
  fail("public runtime must consume the versioned UI presentation module");
}
for (const delegation of [
  "return chapterCompletionModelData({",
  "return chapterTransitionResultData({",
  "const result = roomSplitFeedbackData({",
  "return roomReviewPriorityData({",
  "return rankPracticeLedgerRowsData(maps.map(",
  "return runChapterSplitsData({",
  "const review = runChapterReviewData({",
  "const text = runReportTextData({"
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
