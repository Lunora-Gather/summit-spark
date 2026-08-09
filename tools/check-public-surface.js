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
const worldModelSource = read("public/modules/game/world-model.mjs");
const effectBudgetSource = read("public/modules/game/effect-budget.mjs");
const landmarkProgressSource = read("public/modules/game/landmark-progress.mjs");
const audioCuesSource = read("public/modules/game/audio-cues.mjs");
const lumenProgressSource = read("public/modules/game/lumen-progress.mjs");
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
const worldModelVersion = extractOne(
  "world model module version",
  runtimeSource,
  /modules\/game\/world-model\.mjs\?v=([^"]+)"/
);
const effectBudgetVersion = extractOne(
  "effect budget module version",
  runtimeSource,
  /modules\/game\/effect-budget\.mjs\?v=([^"]+)"/
);
const landmarkProgressVersion = extractOne(
  "landmark progress module version",
  runtimeSource,
  /modules\/game\/landmark-progress\.mjs\?v=([^"]+)"/
);
const audioCuesVersion = extractOne(
  "audio cues module version",
  runtimeSource,
  /modules\/game\/audio-cues\.mjs\?v=([^"]+)"/
);
const lumenProgressVersion = extractOne(
  "Lumen progress module version",
  runtimeSource,
  /modules\/game\/lumen-progress\.mjs\?v=([^"]+)"/
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
if (buildVersion && worldModelVersion && buildVersion !== worldModelVersion) {
  fail(`world model version ${worldModelVersion} does not match build version ${buildVersion}`);
}
if (buildVersion && effectBudgetVersion && buildVersion !== effectBudgetVersion) {
  fail(`effect budget version ${effectBudgetVersion} does not match build version ${buildVersion}`);
}
if (buildVersion && landmarkProgressVersion && buildVersion !== landmarkProgressVersion) {
  fail(`landmark progress version ${landmarkProgressVersion} does not match build version ${buildVersion}`);
}
if (buildVersion && audioCuesVersion && buildVersion !== audioCuesVersion) {
  fail(`audio cues version ${audioCuesVersion} does not match build version ${buildVersion}`);
}
if (buildVersion && lumenProgressVersion && buildVersion !== lumenProgressVersion) {
  fail(`Lumen progress version ${lumenProgressVersion} does not match build version ${buildVersion}`);
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
if (!runtimeSource.includes('import("./modules/core/format.mjs?v=')
  || !coreFormatSource.includes("export function formatTime(")
  || !coreFormatSource.includes("export function formatLocalDateTime(")
  || !runtimeSource.includes("formatLocalDateTime(cloudRow.$updatedAt)")
  || /\bfunction\s+formatCloudTime\s*\(/.test(runtimeSource)) {
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
if (!runtimeSource.includes('import("./modules/game/world-model.mjs?v=')
  || !worldModelSource.includes("export function roomWorldData(")
  || !worldModelSource.includes("export function cameraFollowData(")
  || !worldModelSource.includes("export function phaseBlockActiveData(")
  || !worldModelSource.includes("export function driftShardPositionData(")
  || !runtimeSource.includes("cameraFollowData({")
  || !runtimeSource.includes("phaseBlockActiveData({")
  || !runtimeSource.includes("driftShardPositionData({")) {
  fail("public runtime must consume the versioned pure world and dynamic-obstacle model");
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
if (!runtimeSource.includes('import("./modules/game/landmark-progress.mjs?v=')
  || !landmarkProgressSource.includes("export function mountainGateLandmarkProgress(")
  || !landmarkProgressSource.includes("export function oldPeakRelayLandmarkProgress(")
  || !runtimeSource.includes("mountainGateLandmarkProgress: mountainGateLandmarkProgressData")
  || !runtimeSource.includes("oldPeakRelayLandmarkProgress: oldPeakRelayLandmarkProgressData")) {
  fail("public runtime must consume the versioned pure landmark progress module");
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
if (!runtimeSource.includes('import("./modules/game/lumen-progress.mjs?v=')
  || !lumenProgressSource.includes("export function resetRoomLumenProgressData(")
  || !lumenProgressSource.includes("export function roomLumenCheckpointData(")
  || !lumenProgressSource.includes("export function restoreRoomLumenCheckpointData(")
  || !runtimeSource.includes("const reset = resetRoomLumenProgressData(collected, roomIndex);")
  || !runtimeSource.includes("collected = reset.collected;")) {
  fail("public runtime must delegate provisional Lumen rollback and validated midpoint snapshots to the game model");
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
if (!runtimeSource.includes("function emitSurfaceWallContact(")
  || !runtimeSource.includes("function emitSurfaceWallJumpFeedback(")
  || !runtimeSource.includes("directionX: -(wallDir || 1)")
  || runtimeSource.includes("addSnow(player.x + (player.wallDir > 0 ? player.w : 0)")) {
  fail("runtime wall contact feedback should reuse the active surface identity and move away from the touched wall");
}
if (!runtimeSource.includes("function restoreGroundDashCharge()")
  || (runtimeSource.match(/restoreGroundDashCharge\(\);/g) || []).length < 2
  || !runtimeSource.includes('if (restoreDashCharge()) triggerActionVisual("recharge", 0.26);')
  || !runtimeSource.includes('const recharge = visualRatio("recharge", 0.26);')
  || !runtimeSource.includes("ctx.ellipse(cx, player.y + player.h + 1.5")
  || runtimeSource.includes("hairColor = player.dashes")
  || runtimeSource.includes("hairColor = recharge")) {
  fail("ground dash recharge should use a foot-level pulse while the climber hair remains state-independent");
}
if (!runtimeSource.includes("const relayChainPath = [];")
  || !runtimeSource.includes("const chain = scoreRelayChain(relay);")
  || !runtimeSource.includes("relayChainPath.push({ x: relay.x, y: relay.y });")
  || !runtimeSource.includes("if (relayChainPath.length > 4) relayChainPath.splice(0, relayChainPath.length - 4);")
  || (runtimeSource.match(/relayChainPath\.length = 0;/g) || []).length < 3
  || !runtimeSource.includes("function drawActiveRelayThread(time)")
  || !runtimeSource.includes("drawRelayRoutes(time);\n    drawActiveRelayThread(time);\n    drawVelocityWake(time);")
  || !runtimeSource.includes("points.length >= 3 ? palette.gold")
  || !runtimeSource.includes("if (!prefersReducedMotion && !settings.calmEffects && !settings.lowPerformance)")) {
  fail("Relay activation order should render one bounded in-world thread that clears with the chain and respects comfort modes");
}
if (!runtimeSource.includes("awakened: false")
  || !runtimeSource.includes("relay.awakened = true;")
  || !runtimeSource.includes("function relayLandmarkProgress()")
  || !runtimeSource.includes("return oldPeakRelayLandmarkProgressData(")
  || !landmarkProgressSource.includes('"triple-link",\n  "switchback",\n  "broken-gate"')
  || !landmarkProgressSource.includes("return awakenedRelayProgress(relays);")
  || !runtimeSource.includes("function drawProgressiveLandmarkPath(points, progress)")
  || !runtimeSource.includes("function drawRelayLandmarkResponse(kind, progress, time, atmosphere)")
  || !runtimeSource.includes("drawRelayLandmarkResponse(landmark.kind, relayLandmarkProgress(), time, atmosphere);")
  || !runtimeSource.includes('"broken-gate": [[-72, -50], [-38, -78], [-5, -54], [7, -67], [18, -62], [42, -80], [72, -50]]')
  || runtimeSource.includes("hairColor = relayLandmarkProgress")) {
  fail("Old Peak Relay progress should remain an attempt-local environmental landmark response without recoloring the climber");
}
if (!runtimeSource.includes("function gateLandmarkProgress()")
  || !runtimeSource.includes("return mountainGateLandmarkProgressData(kind, {")
  || !runtimeSource.includes("return oldPeakRelayLandmarkProgressData(")
  || !runtimeSource.includes("function drawGateLandmarkResponse(kind, progress, time)")
  || !runtimeSource.includes("drawGateLandmarkResponse(landmark.kind, gateLandmarkProgress(), time);")
  || !runtimeSource.includes("gate ${gateLandmarkProgress().toFixed(2)}")
  || !landmarkProgressSource.includes('if (kind === "gate-steps") return roomTech.spark === true ? 1 : 0;')
  || !landmarkProgressSource.includes('if (kind === "relay-bridge") return awakenedRelayProgress(options?.relays);')
  || !landmarkProgressSource.includes('if (kind === "mist-springs")')
  || runtimeSource.includes("hairColor = gateLandmarkProgress")) {
  fail("Mountain Gate lesson progress should wake only its existing room landmarks without adding UI or recoloring the climber");
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
  'playSound("crumble", block.rippleOrder === 0 ? 0.72 : 0.46)'
]) {
  if (!runtimeSource.includes(feedback)) fail(`world feedback chain missing ${feedback}`);
}
if (!runtimeSource.includes("drawUpdraftPlayerWake(fieldBounds, motionTime, pulse);")
  || !runtimeSource.includes("function drawUpdraftPlayerWake(fieldBounds, time, pulse)")
  || !runtimeSource.includes("if (!player.inUpdraft || !aabb(getPlayerBox(), fieldBounds)) return;")
  || !runtimeSource.includes("(-player.vy + 180) / 520")
  || !runtimeSource.includes("for (const side of [-1, 1])")
  || !runtimeSource.includes("if (!prefersReducedMotion && !settings.calmEffects && !settings.lowPerformance)")
  || runtimeSource.indexOf("drawEntities(time);") > runtimeSource.indexOf("if (player.deadTimer <= 0) drawPlayer(time);")
  || runtimeSource.includes("hairColor = player.inUpdraft")) {
  fail("occupied updrafts should draw a player-relative paired wake behind the fixed-hair climber with comfort fallbacks");
}
if (!runtimeSource.includes("drawActiveEchoMemory(anchor, time);")
  || !runtimeSource.includes("function drawActiveEchoMemory(anchor, time)")
  || !runtimeSource.includes("(distance - 48) / 260")
  || !runtimeSource.includes("20 + separation * 5 + breathe * 2")
  || !runtimeSource.includes("prefersReducedMotion ? 0.45")
  || runtimeSource.indexOf("drawEntities(time);") > runtimeSource.indexOf("if (player.deadTimer <= 0) drawPlayer(time);")
  || runtimeSource.includes("ctx.moveTo(anchor.x, anchor.y);")
  || runtimeSource.includes("ctx.lineTo(player.x + player.w / 2, player.y + player.h / 2);")
  || runtimeSource.includes("hairColor = echoAnchor")) {
  fail("Echo readiness should stay local to the active anchor instead of drawing a room-spanning tether");
}
if (!runtimeSource.includes("drawSummitConstellation(time, atmosphere);")
  || !runtimeSource.includes("function drawSummitConstellation(time, atmosphere)")
  || !runtimeSource.includes("collected.size / totalLumens")
  || !runtimeSource.includes("const segmentProgress = progress * (stars.length - 1);")
  || !runtimeSource.includes("Math.max(0, Math.min(1, segmentProgress - i))")
  || !runtimeSource.includes("if (progress <= 0)")
  || !runtimeSource.includes("prefersReducedMotion ? 0")
  || runtimeSource.includes("hairColor = collected.size")) {
  fail("Star Summit's existing background constellation should respond continuously to current-run Lumens without recoloring the climber");
}
if (!runtimeSource.includes("const CRUMBLE_RIPPLE_DELAY = 0.065;")
  || !runtimeSource.includes("function activeCrumbleStrip(origin)")
  || !runtimeSource.includes("if (chapterIndexForRoom(roomIndex) !== 2) return [origin];")
  || !runtimeSource.includes("room.entities.crumble.get(`${x}:${origin.y}`)")
  || !runtimeSource.includes("function armCrumbleStrip(origin)")
  || !runtimeSource.includes("block.rippleDelay = order * CRUMBLE_RIPPLE_DELAY;")
  || !runtimeSource.includes("if (block.rippleDelay > 0) continue;")
  || !runtimeSource.includes("const queued = block?.rippleDelay > 0")
  || !runtimeSource.includes("block.rippleOrder === 0 ? 0.72 : 0.46")
  || !runtimeSource.includes('name === "land" || name === "crumble"')
  || runtimeSource.includes("hairColor = block.rippleDelay")) {
  fail("Wind Gorge crumble strips should expose a bounded same-row fracture ripple without changing Star Summit or the climber");
}
if (!runtimeSource.includes("const SPRING_APEX_WINDOW = 0.62;")
  || !runtimeSource.includes("const SPRING_APEX_SPEED = 150;")
  || !runtimeSource.includes("player.springLaunchTimer = SPRING_APEX_WINDOW;")
  || !runtimeSource.includes("player.onGround = false;\n        player.wasGrounded = false;\n        player.vy = -720;")
  || !runtimeSource.includes("const springApex = player.springLaunchTimer > 0")
  || !runtimeSource.includes("Math.abs(player.vy) <= SPRING_APEX_SPEED")
  || !runtimeSource.includes('addFlow(springApex ? 15')
  || !runtimeSource.includes('markRoomTech("springApex")')
  || !runtimeSource.includes('showFeelCue("SPRING APEX", "顶点冲刺"')
  || !runtimeSource.includes('triggerActionVisual("springApex", 0.34)')
  || !runtimeSource.includes("const dashSpeed = DASH_SPEED * (player.overdrive > 0 ? OVERDRIVE_DASH_MULT : 1);")
  || runtimeSource.includes("hairColor = springApex")) {
  fail("spring apex timing should be rewarded without changing dash speed or recoloring the climber");
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
  || !trainingSource.includes("export function practiceRoomRecommendationsData(")
  || !trainingSource.includes("export function practicePlanTargetsData(")
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
  "return practiceRoomRecommendationsData(maps.map(",
  "const targets = practicePlanTargetsData({",
  "return practiceRoomRecommendations().recommended;",
  "return practiceRoomRecommendations().clean;",
  "return practiceRoomRecommendations().pace;",
  "return practiceRoomRecommendations().style;",
  "return practiceRoomRecommendations().expert;",
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
  || !uiPresentationSource.includes("export function chapterTransitionResultTextData(")
  || !uiPresentationSource.includes("export function summitChapterResultTextData(")
  || !uiPresentationSource.includes("export function challengeProgressSummaryData(")
  || !uiPresentationSource.includes("export function drillModeLabel(")
  || !uiPresentationSource.includes("export function drillModeShort(")
  || !uiPresentationSource.includes("export function drillPresentationData(")
  || !uiPresentationSource.includes("export function feedbackDiagnosticsData(")
  || !uiPresentationSource.includes("export function feedbackTemplateTextData(")
  || !uiPresentationSource.includes("export function gamepadStatusTextData(")
  || !uiPresentationSource.includes("export function practiceProgressSummaryData(")
  || !uiPresentationSource.includes("export function roomSplitFeedbackData(")
  || !uiPresentationSource.includes("export function roomProgressSummaryData(")
  || !uiPresentationSource.includes("export function roomTrainingRecommendationData(")
  || !uiPresentationSource.includes("export function roomReviewPriorityData(")
  || !uiPresentationSource.includes("export function routeSlotForMode(")
  || !uiPresentationSource.includes("export function routeSlotLabel(")
  || !uiPresentationSource.includes("export function routeSlotShort(")
  || !uiPresentationSource.includes("export function rankPracticeLedgerRowsData(")
  || !uiPresentationSource.includes("export function runChapterSplitsData(")
  || !uiPresentationSource.includes("export function runChapterReviewData(")
  || !uiPresentationSource.includes("export function runRoomReviewData(")
  || !uiPresentationSource.includes("export function runReportTextData(")
  || !uiPresentationSource.includes("export function saveArchiveSummaryData(")
  || !uiPresentationSource.includes("export function saveBackupSummaryData(")) {
  fail("public runtime must consume the versioned UI presentation module");
}
for (const delegation of [
  "return chapterCompletionModelData({",
  "return drillPresentationData(input);",
  "return chapterTransitionResultData({",
  "return chapterTransitionResultTextModelData({",
  "return summitChapterResultTextModelData({",
  "challengeProgressSummaryData(challengeBoardItems())",
  "return feedbackDiagnosticsData({",
  "return feedbackTemplateTextData({",
  "return gamepadStatusTextData(lastGamepadStatus)",
  "const result = roomSplitFeedbackData({",
  "return roomProgressSummaryData({",
  "return roomTrainingRecommendationData({",
  "return roomReviewPriorityData({",
  "return practiceProgressSummaryData({",
  "return rankPracticeLedgerRowsData(maps.map(",
  "return runChapterSplitsData({",
  "const review = runChapterReviewData({",
  "const text = runReportTextData({",
  "saveArchiveSummaryData({ archive: result, roomTotal: maps.length })",
  "saveBackupSummaryData(backup)"
]) {
  if (!runtimeSource.includes(delegation)) {
    fail(`public runtime must delegate UI presentation ownership through ${delegation}`);
  }
}
if (/\bfunction\s+chapterGrade\s*\(/.test(runtimeSource)) {
  fail("public runtime must not duplicate the UI-owned chapter grade rule");
}
for (const retiredHelper of ["feedbackTypeLabel", "saveArchiveSummary", "saveBackupSummary"]) {
  if (new RegExp(`\\bfunction\\s+${retiredHelper}\\s*\\(`).test(runtimeSource)) {
    fail(`public runtime must not duplicate UI-owned save summary helper ${retiredHelper}`);
  }
}
for (const retiredHelper of ["chapterSummary", "challengeSummary", "contractSummary"]) {
  if (new RegExp(`\\bfunction\\s+${retiredHelper}\\s*\\(`).test(runtimeSource)) {
    fail(`public runtime must not duplicate UI-owned practice summary helper ${retiredHelper}`);
  }
}
for (const retiredHelper of ["drillModeLabel", "contractModeLabel", "contractModeShort", "drillTargetText", "drillObjectiveForRoom", "drillBriefText", "routeSlotForMode", "routeSlotLabel", "routeSlotShort"]) {
  if (new RegExp(`\\bfunction\\s+${retiredHelper}\\s*\\(`).test(runtimeSource)) {
    fail(`public runtime must not duplicate UI-owned Drill/route label helper ${retiredHelper}`);
  }
}
for (const retiredHelper of ["roomMedalLabel", "roomCleanText", "roomDrillText", "roomDrillContractText", "roomPaceLabel", "roomTierLabel"]) {
  if (new RegExp(`\\bfunction\\s+${retiredHelper}\\s*\\(`).test(runtimeSource)) {
    fail(`public runtime must not duplicate UI-owned room summary helper ${retiredHelper}`);
  }
}

if (errors.length > 0) {
  console.error("Public surface check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Public surface check passed: build ${buildVersion || "unknown"}.`);
