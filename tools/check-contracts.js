#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "public", "summit-spark.js"), "utf8");
const coreFormat = fs.readFileSync(path.join(root, "public", "modules", "core", "format.mjs"), "utf8");
const coreMath = fs.readFileSync(path.join(root, "public", "modules", "core", "math.mjs"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const workflowPath = path.join(root, ".github", "workflows", "pages.yml");
const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, "utf8") : "";
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const releaseChecklistPath = path.join(root, "RELEASE_CHECKLIST.md");
const releaseChecklist = fs.existsSync(releaseChecklistPath) ? fs.readFileSync(releaseChecklistPath, "utf8") : "";
const playtestPath = path.join(root, "PLAYTEST_CHECKLIST.md");
const playtestChecklist = fs.existsSync(playtestPath) ? fs.readFileSync(playtestPath, "utf8") : "";
const knownIssuesPath = path.join(root, "KNOWN_ISSUES.md");
const knownIssues = fs.existsSync(knownIssuesPath) ? fs.readFileSync(knownIssuesPath, "utf8") : "";
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

function hasCjk(text) {
  return /[\u3400-\u9fff]/.test(text);
}

function isTooShortText(text, latinMin, cjkMin) {
  if (typeof text !== "string") return true;
  return text.length < (hasCjk(text) ? cjkMin : latinMin);
}

const maps = extractArray("maps");
const targets = extractArray("ROOM_TARGETS");
const names = extractArray("ROOM_NAMES");
const tiers = extractArray("ROOM_TIERS");
const skills = extractArray("ROOM_SKILLS");
const guides = extractArray("ROOM_GUIDES");
const purposes = extractArray("ROOM_PURPOSES");
const routeLines = extractArray("ROOM_ROUTE_LINES");
const styleTrials = extractArray("ROOM_STYLE_TRIALS");
const deathKeys = extractArray("DEATH_REASON_KEYS");
const deathLabels = extractObject("DEATH_REASON_LABELS");

for (const [label, array] of [["ROOM_TARGETS", targets], ["ROOM_NAMES", names], ["ROOM_TIERS", tiers], ["ROOM_SKILLS", skills], ["ROOM_GUIDES", guides], ["ROOM_PURPOSES", purposes], ["ROOM_ROUTE_LINES", routeLines], ["ROOM_STYLE_TRIALS", styleTrials]]) {
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
  if (isTooShortText(guide, 18, 10)) errors.push("room " + (index + 1) + " guide is too short");
});
purposes.forEach((purpose, index) => {
  if (isTooShortText(purpose, 18, 8)) errors.push("room " + (index + 1) + " purpose is too short");
});
routeLines.forEach((lines, index) => {
  if (!Array.isArray(lines) || lines.length !== 3) errors.push("room " + (index + 1) + " needs safe/fast/expert route lines");
  (Array.isArray(lines) ? lines : []).forEach((line, lineIndex) => {
    if (isTooShortText(line, 12, 7)) errors.push("room " + (index + 1) + " route line " + (lineIndex + 1) + " is too short");
  });
});
const styleKinds = new Set();
const allowedStyleTech = new Set(["spark", "wallSpark", "prismSpark", "relay", "relayChain", "spring", "updraft", "prism", "echo", "recall", "crumble"]);
styleTrials.forEach((trial, index) => {
  if (!trial || typeof trial !== "object") errors.push("room " + (index + 1) + " style trial must be an object");
  if (isTooShortText(trial?.label, 7, 2)) errors.push("room " + (index + 1) + " style label is too short");
  if (isTooShortText(trial?.goal, 12, 7)) errors.push("room " + (index + 1) + " style goal is too short");
  if (typeof trial?.kind === "string") styleKinds.add(trial.kind);
  if (!Array.isArray(trial?.tech)) errors.push("room " + (index + 1) + " style tech must be an array");
  for (const tech of Array.isArray(trial?.tech) ? trial.tech : []) {
    if (!allowedStyleTech.has(tech)) errors.push("room " + (index + 1) + " style trial has unknown tech " + tech);
  }
  if (!(Number(trial?.timeScale) > 1)) errors.push("room " + (index + 1) + " style trial needs a timeScale above 1");
});
if (styleKinds.size < 6) errors.push("style trials should cover at least six difficulty types");

deathKeys.forEach((key) => {
  if (!deathLabels[key]) errors.push("DEATH_REASON_LABELS missing " + key);
  if (!js.includes("entry[key] = 0") && !js.includes("entry[" + JSON.stringify(key) + "] = 0")) {
    errors.push("createRoomFocusEntry must initialize death reason " + key);
  }
});
for (const key of Object.keys(deathLabels)) {
  if (!deathKeys.includes(key)) errors.push("DEATH_REASON_LABELS has extra key " + key);
}

const requiredIds = [
  "game", "startButton", "overlay", "lumenCount", "roomCount", "splitTime", "splitDelta",
  "flowCount", "runTime", "deathCount", "debugPanel", "settingsButton", "practiceButton", "settingsPanel",
  "settingsClose", "shakeSlider", "debugToggle", "calmEffectsToggle", "lowPerformanceToggle", "practiceLinesToggle",
  "ghostOpacitySlider", "assistMode", "audioToggle", "audioVolumeSlider", "audioTestButton", "feedbackType", "feedbackNote", "diagnosticsButton", "feedbackTemplateButton", "controlPreset", "keyboardLayout", "keyBindingEditor", "keyBindingStatus", "resetKeyBindings", "grabMode", "gamepadDeadzoneSlider", "gamepadStatus", "touchSizeSlider", "saveExportButton", "saveDownloadButton", "saveImportButton", "saveRestoreButton", "saveImportText", "saveImportStatus", "saveBackupStatus", "roomSelect", "focusRoomButton", "focusResetButton",
  "roomBrief", "practiceReport", "chapterOverview", "practicePlan", "routeContracts", "feelLab", "practiceQueue", "challengeBoard", "profileSummary", "practiceLedger", "drillCleanButton", "drillPaceButton", "drillStyleButton", "drillExpertButton",
  "startReadiness", "loadStatus", "bootFallback", "openTrainingButton", "startSettingsButton", "resumeTrainingButton", "gameStatus", "gameTip", "gameTipTitle", "gameTipDetail", "panelTitle"
];
for (const id of requiredIds) {
  if (!hasId(indexHtml, id)) errors.push("index.html missing #" + id);
  if (!js.includes("getElementById(" + JSON.stringify(id) + ")") && id !== "game") {
    errors.push("summit-spark.js does not bind #" + id);
  }
}

if (!js.includes(" / 失误 ${current}")) errors.push("roomSelectFocusLabel must expose current-run mistake counts in player-facing language");
if (!js.includes(" / 关注 ")) errors.push("roomSelectFocusLabel must expose localized persistent watch markers");
for (const [key, label] of Object.entries({ spike: "尖刺", fall: "坠落", crumble: "碎冰", retry: "重开", room: "换房" })) {
  if (deathLabels[key] !== label) errors.push("DEATH_REASON_LABELS must localize " + key + " as " + label);
}
if (js.includes('focusPopupText = `FOCUS') || js.includes('return ` / Focus R') || js.includes('` · Focus ${deathReasonLabel')) errors.push("player-facing focus feedback must not expose internal English labels");
if (!js.includes("roomCoachHint")) errors.push("practice coach hint helper is missing");
if (!js.includes("recommendedPracticeRoom")) errors.push("recommended practice room helper is missing");
if (!js.includes("startRoomDrill")) errors.push("room drill entry helper is missing");
if (!js.includes("resolveDrillMode")) errors.push("primary drill contract resolver is missing");
if (!js.includes("retryFailedDrill")) errors.push("failed drill retry helper is missing");
if (!js.includes("drawDrillHud")) errors.push("drill HUD helper is missing");
if (!js.includes("drillModeLabel")) errors.push("drill mode label helper is missing");
if (!js.includes("drillSucceeded")) errors.push("drill variant success helper is missing");
if (!js.includes("ROOM_STYLE_TRIALS")) errors.push("style difficulty trials are missing");
if (!js.includes('{ top: "#294563", mid: "#66869c", low: "#c99b84", back: "#728b9c", midPeak: "#536f86", front: "#354c64"') || !js.includes("act === 0 ? 0.19 : 0.14") || !js.includes("[gateX + 27, gateX + 75].forEach((lanternX)")) errors.push("R1 should open with a bright dawn gradient, clear aerial perspective and restrained static gate lantern detail");
if (!js.includes("styleTrialSucceeded")) errors.push("style trial success helper is missing");
if (!js.includes("styleTrialReviewText")) errors.push("finish review must expose a Style trial card");
if (!js.includes("drillHudDetailText")) errors.push("Drill HUD should show contract progress details");
if (!js.includes("drawRequirementBeacons")) errors.push("active Style/Expert drills should draw missing requirement beacons");
if (!js.includes("requirementBeaconPoints")) errors.push("requirement beacons need entity point mapping");
if (!js.includes('mode === "style"')) errors.push("Style mode must participate in drill mode checks");
if (!js.includes("stylePracticeRoom")) errors.push("practice queue needs a Style recommendation helper");
if (!js.includes("EXPERT_REQUIREMENTS")) errors.push("expert drill requirements are missing");
if (!js.includes("expertRequirementText")) errors.push("expert drill requirement text helper is missing");
if (!js.includes("markRoomTech")) errors.push("room tech tracking helper is missing");
if (js.includes('data-finish-mode="auto"')) errors.push("finish review primary drill should resolve to a contract mode");
if (!js.includes("actionVisual")) errors.push("action visual pulse state is missing");
if (!js.includes("drawPlayerAura")) errors.push("player action aura helper is missing");
if (!js.includes("ctx.scale(playerVisualScale, playerVisualScale)") || !js.includes("const playerVisualScale = isPortraitViewport() ? 1.38 : 1.09") || js.includes('const spawn = visualRatio("spawn", 0.32)') || js.includes('const spawnPulse = visualRatio("spawn", 0.32)')) errors.push("player should use a modest foot-anchored desktop scale plus a restrained portrait readability boost, without respawn aura rings");
if (!js.includes("ctx.lineWidth = 2.65") || !js.includes("ctx.lineWidth = 2.55") || !js.includes('const handSkin = "#d6aa8f"') || !js.includes("walling ? 1.3 : 1.15") || js.includes("ctx.arc(cx + player.wallDir * 12, y + 15, 2")) errors.push("player arms and muted hands should stay compact and wall grip must not add a duplicate glowing hand dot");
if (!js.includes("roomPurposeLabel")) errors.push("room purpose helper is missing");
if (!js.includes("roomRouteLine")) errors.push("room route line helper is missing");
if (!js.includes("routeLineCore")) errors.push("drill route line core helper is missing");
if (!js.includes("roomTrainingAdvice")) errors.push("room training advice helper is missing");
if (!js.includes("roomCleanShort")) errors.push("room clean badge helper is missing");
if (!js.includes("roomDrillText")) errors.push("room drill stats helper is missing");
if (!js.includes("roomPaceLabel")) errors.push("room pace helper is missing");
if (!js.includes("summitReview")) errors.push("summit review helper is missing");
if (!js.includes("summitReviewCardsHtml")) errors.push("summit review card helper is missing");
if (!js.includes("function runChapterSplits(") || !js.includes("function runChapterReview(") || !js.includes('reviewCardHtml("本轮分幕"') || !js.includes("runRoomTimes[roomIndex]")) errors.push("summit review must retain per-room timing and a quiet four-act breakdown");
if (!js.includes("roomTimes: runRoomTimes.map(") || !js.includes("roomMistakes: roomMistakes.slice()") || !js.includes("chapterSplits: runChapterSplits().map(")) errors.push("diagnostics must expose current-run room and chapter evidence for full-pass tuning");
if (!js.includes("function buildRunReport(") || !js.includes("function copyRunReport(") || !js.includes("data-copy-run-report") || !js.includes("__summitLastRunReport") || !js.includes("不含身份、设备名称、输入历史或路线坐标")) errors.push("collapsed summit review must provide a bounded privacy-labelled current-run report without uploading it");
if (!js.includes("function copyTextWithDownloadFallback(") || !js.includes("copyTextWithDownloadFallback(text, filename")) errors.push("text exports should share one clipboard-to-download fallback instead of duplicating browser error handling");
if (!js.includes("bindFinishReviewActions")) errors.push("finish review drill buttons are missing");
if (!js.includes("showFinishOverlay") || !js.includes('aria-labelledby", "finishTitle"') || !js.includes('focus({ preventScroll: true })')) errors.push("finish overlay must move focus into a labelled modal review surface");
if (!js.includes('overlay.classList.add("finish-overlay")')) errors.push("finish overlay should use its scroll-safe layout mode");
if (!js.includes('lastRouteContractResult ? routeContractCard : ""')) errors.push("inactive route contracts should not occupy a primary finish card");
if (!js.includes("palette.gold, 30, 300")) errors.push("finish celebration should remain restrained");
if (!js.includes("practiceReportText")) errors.push("practice report helper is missing");
if (!js.includes("updatePracticePlan")) errors.push("practice plan helper is missing");
if (!js.includes("practicePlanSteps")) errors.push("practice plan must generate actionable steps");
if (!js.includes("updatePracticeQueue")) errors.push("practice queue helper is missing");
if (!js.includes("updatePracticeLedger")) errors.push("practice ledger helper is missing");
if (!js.includes("roomMasteryScore")) errors.push("room mastery score helper is missing");
if (!js.includes("contractSummary")) errors.push("drill contract summary helper is missing");
if (!js.includes("drillContractStats")) errors.push("drill contract card stats helper is missing");
if (!js.includes("practiceRouteSummary")) errors.push("practice route summary helper is missing");
if (!js.includes("practiceLedgerSummary")) errors.push("practice ledger summary helper is missing");
if (!js.includes("PROFILE_KEY")) errors.push("long-term profile storage key is missing");
if (!js.includes("LONG_TERM_CHALLENGES")) errors.push("long-term challenge definitions are missing");
if (!js.includes("FLOW_CHALLENGE_TARGET = 900")) errors.push("Flow challenge target must stay reachable under the 999 flow cap");
if (!js.includes("readProfile")) errors.push("long-term profile read helper is missing");
if (!js.includes("profileData.summitClears <= 0")) errors.push("profile normalization must not turn missing death data into zero-death completion");
if (!js.includes("recordSummitProfile")) errors.push("summit clear should update the long-term profile");
if (!js.includes("chapterCompletionData")) errors.push("chapter completion data helper is missing");
if (!js.includes("updateChapterOverview")) errors.push("settings panel should expose chapter completion");
if (!js.includes("challengeBoardItems")) errors.push("challenge board item helper is missing");
if (!js.includes("updateChallengeBoard")) errors.push("settings panel should expose long-term challenges");
if (!js.includes("updateProfileSummary")) errors.push("settings panel should expose the long-term profile");
if (!js.includes("startSummitChallenge")) errors.push("full-run challenge start helper is missing");
if (!js.includes("challengeStartsRun")) errors.push("full-run challenge cards should not fall back to room drills");
if (!js.includes("activeChallengeState")) errors.push("active challenge state helper is missing");
if (!js.includes("drawActiveChallengeHud")) errors.push("active challenge HUD is missing");
if (!js.includes("activeChallengeReview")) errors.push("finish review should report the active challenge result");
if (!js.includes("SOUND_PRESETS")) errors.push("sound presets are missing");
if (!js.includes("unlockAudio")) errors.push("audio unlock helper is missing");
if (!js.includes("playSound")) errors.push("audio feedback helper is missing");
if (!js.includes("playAudioTestPattern")) errors.push("audio settings should expose a test pattern");
if (!js.includes("buildDiagnosticsSnapshot")) errors.push("feedback diagnostics snapshot helper is missing");
if (!js.includes("copyDiagnosticsSnapshot")) errors.push("feedback diagnostics copy helper is missing");
if (!js.includes("feedbackDiagnostics")) errors.push("feedback diagnostics note helper is missing");
if (!js.includes("buildFeedbackTemplate")) errors.push("feedback template helper is missing");
if (!js.includes("copyFeedbackTemplate")) errors.push("feedback template copy helper is missing");
if (!js.includes("SAVE_ARCHIVE_KIND")) errors.push("save archive kind guard is missing");
if (!js.includes("buildSaveArchive")) errors.push("save archive export helper is missing");
if (!js.includes("copySaveArchive")) errors.push("save archive copy helper is missing");
if (!js.includes("downloadSaveArchiveAction")) errors.push("save archive download helper is missing");
if (!js.includes("importSaveArchive")) errors.push("save archive import helper is missing");
if (!js.includes("normalizeSaveArchiveText")) errors.push("save archive preview/import normalizer is missing");
if (!js.includes("updateSaveImportPreview")) errors.push("save archive import preview helper is missing");
if (!js.includes("writeNormalizedSaveArchive")) errors.push("save archive writer should be separated from preview normalization");
if (!js.includes("__summitLastSaveArchive")) errors.push("browser smoke needs a save archive hook");
if (!js.includes("gamepadDiagnostics")) errors.push("gamepad compatibility diagnostics helper is missing");
if (!js.includes("updateGamepadStatusOutput")) errors.push("settings panel should show non-sensitive gamepad status");
if (!js.includes("isSettingsTextEntryTarget")) errors.push("settings text-entry hotkey isolation helper is missing");
if (!js.includes('"TEXTAREA"')) errors.push("settings input isolation must include textarea controls");
if (!js.includes("__summitLastDiagnostics")) errors.push("browser smoke needs a diagnostics snapshot hook");
if (!js.includes("No user identity, user agent, raw input history, replay path, or secrets.")) errors.push("diagnostics snapshot must state its privacy boundary");
if (js.includes("navigator.userAgent")) errors.push("diagnostics snapshot must not collect user agent");
if (!js.includes("ROUTE_CONTRACTS")) errors.push("route contract definitions are missing");
if (!js.includes("updateRouteContracts")) errors.push("route contract settings surface is missing");
if (!js.includes("advanceRouteContract")) errors.push("route contracts should auto-advance after Drill wins");
if (!js.includes("activeRouteContractData")) errors.push("route contract active-state helper is missing");
if (!js.includes("cancelActiveRouteContract")) errors.push("route contract interruption helper is missing");
if (!js.includes("resumeRouteContract")) errors.push("route contract resume helper is missing");
if (!js.includes("routeContractResumeStep")) errors.push("route contract resume step helper is missing");
if (!js.includes("routeContractGeneration")) errors.push("route contract generation guard is missing");
if (!js.includes("clearRouteContractStepTimer")) errors.push("route contract timer cleanup is missing");
if (!js.includes("routeContractMatchesDrill")) errors.push("route retry should validate matching active contract state");
if (!js.includes("routeContractHudDetail")) errors.push("active route contract should be visible in Drill HUD");
if (!js.includes("routeContractSummaryText")) errors.push("route contracts should appear in practice reports and review");
if (!js.includes("route-resume-badge")) errors.push("route resume card should expose an explicit continue badge");
if (!js.includes("FEEL_REPLAY_FIXTURES")) errors.push("feel replay fixtures are missing");
if (!js.includes("updateFeelLab")) errors.push("settings panel should expose a feel lab");
if (!js.includes("startFeelFixture")) errors.push("feel lab cards should launch calibration drills");
if (!js.includes("activeFeelFixture")) errors.push("feel lab active calibration state is missing");
if (!js.includes("lastFeelFixtureResult")) errors.push("feel lab should preserve the last calibration result");
if (!js.includes("completeActiveFeelFixture")) errors.push("feel lab should record successful calibration drills");
if (!js.includes("cancelActiveFeelFixture")) errors.push("feel lab should record interrupted calibration drills");
if (!js.includes("feelFixtureMatchesDrill")) errors.push("feel retry should validate matching active calibration state");
if (!js.includes("normalizeRoomBests")) errors.push("room best storage normalization is missing");
if (!js.includes("normalizeRoomPaths")) errors.push("room path storage normalization is missing");
if (!js.includes("readStoredJson")) errors.push("storage read/repair helper is missing");
if (!js.includes("finiteNonNegativeInt")) errors.push("finite storage integer normalizer is missing");
if (!js.includes("strictBoolean")) errors.push("strict storage boolean normalizer is missing");
if (!js.includes("storageHealthMessage")) errors.push("storage health feedback state is missing");
if (!js.includes("maybeShowStorageRepairToast")) errors.push("storage repair should show a one-shot toast");
if (!js.includes("wallSpark") || !js.includes("prismSpark")) errors.push("Spark variants are missing");
if (!js.includes("drawFailureGhostLine")) errors.push("quiet failure ghost hook is missing");
if (!js.includes("drawFailureGhostArrow")) errors.push("quiet failure direction hook is missing");
if (!js.includes("triggerSparkVariantVisual")) errors.push("Wall/Prism Spark should keep distinct visual pulses");
if (!js.includes("drawChapterResonance")) errors.push("chapter resonance environment feedback is missing");
if (!js.includes("roomBriefText")) errors.push("room brief helper is missing");
if (!js.includes("roomBriefHtml")) errors.push("room brief should expose structured overview markup");
if (!js.includes("trackDrillStart")) errors.push("drill start tracker is missing");
if (!js.includes("trackDrillClear")) errors.push("drill clear tracker is missing");
if (!js.includes("drillSummary")) errors.push("drill summary helper is missing");
if (!js.includes("ghostOpacity")) errors.push("practice ghost opacity setting is missing");
if (!js.includes("timingArmed")) errors.push("first-input timing gate is missing");
if (!js.includes("timingInputReady")) errors.push("first-input neutral guard is missing");
if (!js.includes("isGamePaused")) errors.push("settings pause helper is missing");
if (!js.includes("hasTimingIntent")) errors.push("timing intent helper is missing");
if (!js.includes("resetFocusStats")) errors.push("focus reset helper is missing");
if (!js.includes("releaseAllInputs")) errors.push("settings input release helper is missing");
if (!js.includes("syncSettingsVisibility")) errors.push("settings open state must sync aria-expanded and panel visibility");
if (!js.includes("drawTimingGateCue")) errors.push("first-input timing gate helper should stay explicit");
if (!js.includes("APEX_GRAVITY_MULT")) errors.push("apex gravity shaping is missing");
if (!js.includes("showFeelCue")) errors.push("feel window feedback helper is missing");
if (!js.includes("drawFeelCue")) errors.push("feel cue renderer is missing");
if (!js.includes("actionPulse.apex")) errors.push("apex input cue should be visible");
if (!js.includes("ROUTE_CUE_TIME")) errors.push("route cue timing constant is missing");
if (!js.includes("routeSlotForMode")) errors.push("route cue should map drill modes to safe/fast/expert slots");
if (!js.includes("routeFocusData")) errors.push("route focus data helper is missing");
if (!js.includes("routeCompassTarget")) errors.push("route compass target helper is missing");
if (!js.includes("drawRouteCompass")) errors.push("in-room route compass renderer is missing");
if (!js.includes('ctx.setLineDash([6, 7])') || !js.includes('ctx.moveTo(-5, -5)') || !js.includes('ctx.fillStyle = CANVAS_PANEL_BG') || js.includes('ctx.fillStyle = "rgba(7,12,20,0.68)"')) errors.push("route compass should use a thin non-glowing chevron and mist label instead of a bright dashed arrow with a black tag");
if (js.includes('!${') || !js.includes('` · 失误 ${current}`') || !js.includes('filter(Boolean).join(" · ")') || !js.includes("function drillBriefText(index, mode = \"auto\")") || !js.includes('`${target} · 路线：${routeLineCore(index, 0)}`') || !js.includes('const hudObjective = activeDrill.mode === "clean" ? routeLineCore(roomIndex, 0) : activeDrill.objective')) errors.push("player-facing training status should use natural mistake wording, separate target conditions from route advice, and avoid duplicate or contradictory clean claims");
if (!js.includes("drawRouteFocusCue")) errors.push("route focus cue renderer is missing");
if (!js.includes("showMasteryPopup")) errors.push("room mastery completion popup helper is missing");
if (!js.includes("drawMasteryPopup")) errors.push("room mastery popup renderer is missing");
if (!js.includes("nextMasteryStepText")) errors.push("mastery feedback should name the next contract step");
if (!js.includes("masteryContractPillsHtml")) errors.push("mastery contract pill renderer is missing");
if (!js.includes("masteryRoadmapRows")) errors.push("mastery roadmap rows helper is missing");
if (!js.includes("reviewRoadmapHtml")) errors.push("finish review should expose a mastery roadmap");
if (!js.includes("drawContractStrip")) errors.push("Drill HUD should show contract ladder status");
if (!js.includes("failureCueActive")) errors.push("quiet failure state helper is missing");
if (!js.includes("showFailureRehearsal")) errors.push("quiet failure hook is missing");
if (!js.includes("showDrillFailureRehearsal")) errors.push("quiet Drill failure hook is missing");
if (!js.includes("drawFailureRehearsalCue")) errors.push("quiet failure renderer hook is missing");
["首次输入开始计时", "松开按键后待命", "修正路线", "REHEARSE"].forEach((marker) => {
  if (js.includes(marker)) errors.push("quiet play mode must not expose prompt text: " + marker);
});
if (!js.includes("GAME_TIP_TIME")) errors.push("game tip timing constant is missing");
if (!js.includes("showGameTip")) errors.push("game tip helper is missing");
if (!js.includes("beginnerFlowActive")) errors.push("beginner flow activation guard is missing");
if (!js.includes("updateOnboardingCues")) errors.push("beginner onboarding progression is missing");
if (!js.includes("showBeginnerDeathTip")) errors.push("beginner death tip helper is missing");
if (!js.includes("configureCanvasBuffer")) errors.push("canvas clarity buffer helper is missing");
if (!js.includes("function canvasBufferScale()") || !js.includes("const cssScale = Math.max(rect.width / W, rect.height / H);") || !js.includes("Math.min(CANVAS_BUFFER_SCALE_MAX, roundedUp)")) errors.push("normal canvas density should follow the responsive physical display size without unbounded buffers");
if (!js.includes("if (settings.lowPerformance) return 1;") || !js.includes('syncComfortSettings();\n    configureCanvasBuffer();')) errors.push("low-performance changes must immediately rebuild the canvas at 1x density");
const unbudgetedShadowBlurs = [...js.matchAll(/ctx\.shadowBlur\s*=\s*([^;\n]+);/g)]
  .map((match) => match[1].trim())
  .filter((value) => value !== "0" && !value.startsWith("performanceShadowBlur("));
if (!js.includes("function performanceShadowBlur(value)") || !js.includes("return settings.lowPerformance ? 0 : value;") || unbudgetedShadowBlurs.length) errors.push("every nonzero canvas shadow blur must collapse to zero in low-performance mode");
if (!js.includes("refreshStartOverlay")) errors.push("start overlay should expose ready/continue state");
if (!js.includes("syncGameplayAccessibility") || !js.includes("surface.hidden = overlayOwnsInteraction") || !indexHtml.includes('id="gameHud" aria-hidden="true" inert hidden') || !indexHtml.includes('id="touchControls" aria-label="触控" aria-hidden="true" inert hidden')) errors.push("start/finish overlays must hide the HUD and all overlays must make the obscured game surface inert");
if (!js.includes('progress ? "自由攀登" : "开始攀登"') || !js.includes("继续训练 · R")) errors.push("start overlay must distinguish free climbing from recommended training");
if (!js.includes("openStartTrainingPanel") || !js.includes("openSettingsPanel")) errors.push("start overlay should expose separate practice and settings panels");
if (!js.includes("confirmFocusReset")) errors.push("focus reset should require confirmation");
if (!js.includes("scheduleFocusResetExpiry")) errors.push("focus reset confirmation should expire visibly");
if (!js.includes('focusResetButton.textContent = armed ? "确认清空" : "清空"')) errors.push("focus reset confirmation should use concise localized labels");
if (!js.includes("panelReturnFocus") || !js.includes("trapPanelFocus") || !js.includes("panelFocusableElements")) errors.push("modal panel must trap Tab and restore its invoking control");
if (!js.includes('closingPractice ? "练习面板已关闭" : "设置已关闭"')) errors.push("panel close status must match the active settings or practice mode");
if (!js.includes("if (settingsVisible) {") || !js.includes("settingsPanel?.contains(document.activeElement)")) errors.push("game focus helper must not escape an open modal panel");
if ((js.match(/player\.dashes = 1;/g) || []).length) errors.push("dash restoration must go through restoreDashCharge so lumen reserve is preserved");
if (!js.includes("drawCooldownRing")) errors.push("mechanic cooldown ring helper is missing");
if (!js.includes('ctx.strokeStyle = "rgba(247,245,240,0.78)"') || !js.includes("const streamSegments = settings.calmEffects ? 3 : 4") || !js.includes("ctx.moveTo(x - 6, arrowY + 4)") || js.includes("ctx.shadowBlur = settings.calmEffects ? 2 : 7") || !js.includes("settings.calmEffects ? 0.14 : 0.22")) errors.push("updrafts should use short non-glowing flow segments, one compact arrow, and restrained in-field particles");
if ((js.match(/updraftFieldBounds\(updraft\)/g) || []).length < 3 || !js.includes("const bottom = fieldBounds.y + fieldBounds.h") || !js.includes("ctx.fillRect(fieldBounds.x, top, fieldBounds.w, bottom - top)") || !js.includes("ctx.globalAlpha = 0.26 + pulse * 0.08")) errors.push("updraft visuals and physics must share the same full-height field bounds with a readable static edge");
if (!js.includes("field.addColorStop(0.5, `rgba(143,227,155,${0.145 + pulse * 0.075})`)") || !js.includes("ctx.globalAlpha = 0.26 + pulse * 0.08") || !js.includes("ctx.globalAlpha = 0.34 + pulse * 0.1") || !js.includes("ctx.globalAlpha = 0.4 + pulse * 0.1")) errors.push("updraft boundaries and direction arrows should remain readable at rest without adding glow, long trails, or extra particles");
if (!js.includes("ctx.lineTo(0, 11)") || !js.includes("ctx.arc(0, -6, 3.5")) errors.push("echo anchor should keep a distinct anchor silhouette instead of duplicating the relay diamond");
if (!js.includes("active ? 0.78 + pulse * 0.12 : 0.64 + pulse * 0.1") || !js.includes('active ? palette.green : "rgba(143,227,155,0.78)"') || !js.includes("ctx.lineWidth = active ? 2.4 : 2.6")) errors.push("inactive echo anchors should remain readable against late-chapter backgrounds without adding extra rings, links, or motion");
if (!js.includes("const coilTop = capY + 5") || !js.includes("const coilBottom = baseY + 1") || !js.includes("for (const offset of [9, 19])") || !js.includes('roundRect(ctx, spring.x + 3, baseY, spring.w - 6, 5, 2)') || js.includes('ctx.fillStyle = "#1c2e2f"')) errors.push("spring entities should read as compact cap-coil-base devices, including intentional midair relay springs, without changing their collision boxes");
if (!js.includes("settings.calmEffects ? 2 : 8") || !js.includes("13 + pulse * 4") || !js.includes("20 + pulse * 3") || !js.includes("settings.calmEffects ? (active ? 3 : 0)")) errors.push("relay, prism, and echo-anchor idle states should prioritize distinct silhouettes over large persistent glow halos");
if (!js.includes("const poleX = checkpoint.x - 15") || !js.includes("burst(checkpoint.x, checkpoint.y + 8, palette.green, 4, 90)")) errors.push("checkpoints should use an offset flag and only emit activation feedback after a respawn change");
if (indexHtml.includes("pause-badge") || indexHtml.includes('id="panelSubtitle"')) errors.push("settings header should avoid repeating modal state and category descriptions");
if (indexHtml.includes('<div class="hud" aria-hidden="true">')) errors.push("settings button must not be hidden by hud aria-hidden");
if (indexHtml.includes('<div class="meters" aria-hidden="true">')) errors.push("HUD counters should remain available to assistive tech");
if (!indexHtml.includes('class="dash-meter" title="冲刺" data-meter-label="冲" role="progressbar" aria-label="冲刺储备" aria-valuemin="0" aria-valuemax="2"') || !indexHtml.includes('class="stamina-meter" title="体力" data-meter-label="体" role="progressbar" aria-label="攀墙体力" aria-valuemin="0" aria-valuemax="100"')) errors.push("critical HUD meters should expose standard localized progressbar semantics");
if (!indexHtml.includes('data-meter-label="冲"') || !indexHtml.includes('data-meter-label="体"')) errors.push("compact HUD meters should remain semantically readable at gameplay scale");
if (!js.includes('lumenCount.textContent = `✦ ${found}/${totalLumens}`') || !js.includes('roomCount.textContent = `R${roomIndex + 1}/${maps.length}')) errors.push("HUD counters should expose restrained visual labels");
if (!indexHtml.includes('id="runTime" aria-label="总时间"')) errors.push("HUD counters need accessible labels");
if (!indexHtml.includes('aria-controls="settingsPanel"')) errors.push("settings button must reference settings panel");
if (!indexHtml.includes('aria-expanded="false"')) errors.push("settings button must expose collapsed state");
if (!indexHtml.includes('aria-label="设置"') || !indexHtml.includes('aria-label="练习"')) errors.push("HUD should expose localized settings and practice labels");
if (!indexHtml.includes('aria-live="polite"')) errors.push("game should expose live status text");
if (!indexHtml.includes("settings-section-title")) errors.push("settings panel must group controls");
if (!indexHtml.includes("settings-group-training") || !indexHtml.includes("settings-group-controls") || !indexHtml.includes("settings-group-audio") || !indexHtml.includes("settings-group-display") || !indexHtml.includes("settings-group-feedback")) errors.push("panel must use focused grouped disclosure sections");
if (!indexHtml.includes("settings-only") || !indexHtml.includes("practice-only")) errors.push("panel must separate settings-only and practice-only groups");
if (indexHtml.includes("start-guide") || indexHtml.includes("start-copy")) errors.push("start overlay should not include explanatory guide blocks");
const openSettingsGroups = indexHtml.match(/<details class="settings-group [^"]+" open>/g) || [];
if (openSettingsGroups.length !== 0) errors.push("settings groups should all start collapsed");
if (!js.includes("closeSettingsFromOutside")) errors.push("settings panel should dismiss on outside pointer input");
if (!indexHtml.includes('id="practicePlan"')) errors.push("practice panel must include a practice plan surface");
if (!indexHtml.includes('id="routeContracts"')) errors.push("practice panel must include route contracts");
if (!indexHtml.includes('id="feelLab"')) errors.push("practice panel must include feel lab");
if (!indexHtml.includes('id="audioTestButton"')) errors.push("settings panel must include an audio test button");
if (!indexHtml.includes('id="feedbackType"')) errors.push("settings panel must include feedback type");
if (!indexHtml.includes('id="feedbackNote"')) errors.push("settings panel must include feedback note textarea");
if (!indexHtml.includes('id="diagnosticsButton"')) errors.push("settings panel must include a diagnostics copy button");
if (!indexHtml.includes('id="feedbackTemplateButton"')) errors.push("settings panel must include a feedback template button");
if (!indexHtml.includes('id="gamepadStatus"')) errors.push("settings panel must include non-sensitive gamepad status");
if (!indexHtml.includes('id="saveExportButton"')) errors.push("settings panel must include save export copy");
if (!indexHtml.includes('id="saveDownloadButton"')) errors.push("settings panel must include save archive download");
if (!indexHtml.includes('id="saveImportButton"')) errors.push("settings panel must include save archive import");
if (!indexHtml.includes('id="saveRestoreButton"') || !indexHtml.includes('id="saveBackupStatus"')) errors.push("settings panel must include save backup restore controls");
if (!indexHtml.includes('id="saveImportText"')) errors.push("settings panel must include save archive import text");
if (!indexHtml.includes('id="saveImportStatus"')) errors.push("settings panel must include save archive import preview status");
const buildVersion = (indexHtml.match(/name="build-version" content="([^"]+)"/) || [])[1] || "";
if (!/^\d{8}-p\d+$/.test(buildVersion)) errors.push("HTML should expose the current YYYYMMDD-pN build version");
if (buildVersion && !indexHtml.includes("summit-spark.css?v=" + buildVersion)) errors.push("HTML should version the CSS asset with the build version");
if (buildVersion && !indexHtml.includes("summit-spark.js?v=" + buildVersion)) errors.push("HTML should version the JS asset with the build version");
if (buildVersion && !js.includes("modules/core/format.mjs?v=" + buildVersion)) errors.push("runtime should version the core format module with the build version");
if (buildVersion && !js.includes("modules/core/math.mjs?v=" + buildVersion)) errors.push("runtime should version the core math module with the build version");
for (const helper of ["formatTime", "formatDelta", "splitGrade", "escapeHtml"]) {
  if (!coreFormat.includes(`export function ${helper}(`) || js.includes(`function ${helper}(`)) {
    errors.push(`pure helper ${helper} should have one exported implementation in the core format module`);
  }
}
for (const helper of ["aabb", "distRectPoint", "approach"]) {
  if (!coreMath.includes(`export function ${helper}(`) || js.includes(`function ${helper}(`)) {
    errors.push(`pure helper ${helper} should have one exported implementation in the core math module`);
  }
}
if (!indexHtml.includes("boot-noscript")) errors.push("start overlay should explain when JavaScript is disabled");
if (!indexHtml.includes("settings-panel")) errors.push("settings panel shell is missing");
const css = fs.readFileSync(path.join(root, "public", "summit-spark.css"), "utf8");
const browserSmoke = fs.readFileSync(path.join(root, "tools", "check-browser-smoke.js"), "utf8");
if (!css.includes(".stage.low-performance #game") || !css.includes("-webkit-backdrop-filter: none;") || !browserSmoke.includes("low-performance mode should remove per-frame canvas filters and backdrop blurs")) errors.push("low-performance mode must remove canvas filter passes and live backdrop compositing");
if (!js.includes("function writeStorageTransaction(entries)") || !js.includes("for (const [key] of entries) previous.set(key, localStorage.getItem(key));") || !js.includes("localStorage.removeItem(key);") || !browserSmoke.includes("a partial save write must roll every imported key and the previous backup back before reporting failure")) errors.push("multi-key save imports must restore every previous value after a partial storage failure");
if (!indexHtml.includes("viewport-fit=cover, interactive-widget=resizes-content") || !css.includes("env(safe-area-inset-left, 0px)") || !css.includes("env(safe-area-inset-right, 0px)") || !browserSmoke.includes("account drawer must remain bounded and its focused field reachable after a mobile keyboard resize")) errors.push("mobile entry and settings must honor all safe-area edges and keyboard-resized viewports");
if (!css.includes(".settings-panel.mode-settings {\n    bottom: auto;")
  || !css.includes("100dvh\n      - max(58px")
  || !css.includes(".settings-backdrop {\n  position: fixed;\n  inset: 0;")
  || !browserSmoke.includes("collapsed mobile Settings should fit its five-item list instead of leaving a large empty lower sheet")) errors.push("collapsed phone Settings must content-fit while expanded drawers remain capped by dynamic viewport and safe-area bounds");
if (!js.includes('const ACCOUNT_HINT_STORAGE_KEY = "summit-spark-account-hint"')
  || !js.includes('if (saved === "account" || readAccountHint())')
  || !js.includes("if (Number(error?.code) === 401) writeAccountHint(false);")
  || !js.includes("guestEntryButton?.focus({ preventScroll: true });")
  || !css.includes(".stage:has(.start-panel.entry-pending) + .portrait-brief")
  || !browserSmoke.includes("fresh visitors should see the focused guest/email chooser immediately")
  || !browserSmoke.includes("an expired account hint should be cleared")
  || !browserSmoke.includes("320px first-run entry should stay focused, touch-safe and free of background room coaching")) errors.push("first-run entry must appear immediately, while account hints restore silently and expired hints recover cleanly");
if (!js.includes("let accountSdkLoadPromise = null;")
  || !js.includes("document.getElementById(\"appwriteSdk\")?.remove();")
  || !js.includes("async function ensureAccountSdk()")
  || !browserSmoke.includes("runCloudSdkRetrySmoke")
  || !browserSmoke.includes("a transient cloud SDK load failure should retry from Account without a page refresh")) errors.push("a transient Appwrite SDK failure must remove the failed loader and retry through the account surface without a full refresh");
if (!css.includes(".entry-option:focus-visible") || !css.includes("outline: 2px solid #477b80;") || !css.includes("color: #3a636c;") || !browserSmoke.includes("recoveryContrast") || !browserSmoke.includes("mobile password tab and recovery action should keep a refined visible focus ring and safe touch target")) errors.push("first-run focus and password recovery must use refined non-default focus styling and composited 4.5:1 text contrast");
if (!js.includes("const SAVE_ARCHIVE_MAX_CHARS = 1000000;")
  || !indexHtml.includes('id="saveImportText" maxlength="1000000"')
  || !browserSmoke.includes("runLargeCloudArchiveSmoke")
  || !browserSmoke.includes("largeArchive.inputMaxLength < largeArchive.chars")
  || !browserSmoke.includes('cdp.send("Input.insertText", { text: largeArchiveText })')
  || !browserSmoke.includes("a full ten-room route archive above the legacy 240k cap must upload and remain paste-importable")) errors.push("complete ten-room route archives must remain below a consistent 1MB cloud and real-input guard and round-trip through import");
if (!js.includes('const preserved = settings.controlsPreset === "custom" ? "，自定义键位保持不变" : "";') || browserSmoke.includes("switching Mac and PC labels must preserve every custom binding until the explicit restore action") === false) errors.push("keyboard platform label changes must not destroy an existing custom binding profile");
if (!js.includes('const ACCOUNT_OTP_EMAIL_SESSION_KEY = "summit-spark-otp-email";') || !js.includes("function clearAccountOtpState") || !js.includes("if (otpEmail !== email)") || !browserSmoke.includes("changing OTP email invalidates the issued token")) errors.push("an issued OTP identity must be bound to its normalized email and invalidated when that email changes");
if (!js.includes("function hasMeaningfulSaveData") || !js.includes("hasMeaningfulRoomPaths(roomPaths)") || !js.includes("hasMeaningfulRoomFocus(savedFocus)") || js.includes("entry?.attempts") || !browserSmoke.includes("cloud conflict must preserve ${conflictCase.name} local data")) errors.push("cloud conflict detection must cover real settings, profile, path, focus, PB and Flow fields instead of a nonexistent attempts field");
if (!indexHtml.includes('id="accountAuthTabs" role="group" aria-label="登录方式"') || indexHtml.includes('role="tablist"') || indexHtml.includes('role="tab"') || !indexHtml.includes('data-auth-mode="code" aria-pressed="true"') || !indexHtml.includes('id="accountEmail" name="email"') || !indexHtml.includes('id="accountNewPassword" name="new-password" type="password" autocomplete="new-password" minlength="8" aria-label="新密码"') || !indexHtml.includes('id="accountOldPassword" name="old-password" type="password" autocomplete="current-password" aria-label="原密码（已有密码时填写）"') || !indexHtml.includes('aria-describedby="accountStatus"') || !js.includes('button.setAttribute("aria-pressed", String(active));') || js.includes('button.setAttribute("aria-selected", String(active));') || !browserSmoke.includes("account login mode should expose segmented-button semantics and autofill-ready described fields") || !browserSmoke.includes("accessibleName")) errors.push("account login choices and all five fields must expose unique real labels, autofill purposes and live status descriptions");
if ((indexHtml.match(/class="settings-group-chevron" aria-hidden="true"/g) || []).length !== 7 || !indexHtml.includes('<summary aria-expanded="false">') || !css.includes(".settings-group summary > .settings-group-chevron") || !css.includes(".settings-group[open] summary::after") || !css.includes("content: none;") || !js.includes("function syncSettingsGroupDisclosure(group)") || !js.includes('setAttribute("aria-expanded", String(group.open))') || !browserSmoke.includes("settings disclosures should keep decorative chevrons out of accessible names and expose collapsed state")) errors.push("settings disclosures must expose synchronized expanded state while keeping every decorative chevron out of accessible names");
if ((js.match(/class="review-more-chevron" aria-hidden="true"/g) || []).length !== 2 || !js.includes("function syncReviewDisclosure(details)") || !js.includes('event.target.matches(".review-more")') || !css.includes(".review-more summary > .review-more-chevron") || !css.includes(".review-more[open] summary::after") || !browserSmoke.includes("finish review disclosures should synchronize expanded state while keeping their rotating chevron decorative")) errors.push("finish review disclosures must keep generated symbols out of accessible names and synchronize their expanded state");
if (!js.includes("function finishDialogVisible()") || !js.includes("function trapFinishFocus(event)") || !js.includes('finishDialogVisible() && event.code === "Tab"') || !browserSmoke.includes("finish dialog should trap forward and backward Tab focus inside its modal surface")) errors.push("the modal summit review must trap forward and backward keyboard focus inside the finish overlay");
if (!js.includes('overlay.classList.remove("finish-overlay")') || !js.includes('overlay.removeAttribute("aria-modal")') || !js.includes('overlay.removeAttribute("aria-labelledby")') || !js.includes('overlay.removeAttribute("role")') || !browserSmoke.includes("finish restart should clear modal semantics and return focus to the second run")) errors.push("restarting after the summit must fully retire finish-dialog semantics and restore gameplay focus");
if (!js.includes("function focusVisibleOverlaySurface()") || !js.includes("focusableElementsWithin(overlay)[0]") || (js.match(/focusVisibleOverlaySurface\(\)/g) || []).length < 3 || !js.includes("const returnTarget = panelReturnFocus;") || !browserSmoke.includes("outside settings dismissal above the finish review should restore focus to the visible modal title") || !browserSmoke.includes("immediate outside account dismissal should stay on its visible entry trigger after delayed focus work")) errors.push("settings dismissal over a start or finish overlay must restore focus to its live trigger or another currently rendered overlay control");
if (!indexHtml.includes('id="settingsBackdrop" aria-hidden="true"') || !css.includes(".settings-backdrop") || !js.includes('settingsBackdrop?.addEventListener("click", closeSettingsFromBackdrop)') || !js.includes("function pointHitsVisibleElement") || !js.includes("panelReturnFocus = practiceTrigger;") || !js.includes("panelReturnFocus = startAccountButton;") || !browserSmoke.includes("outside start-button region closes without click-through") || !browserSmoke.includes("switched practice panel closes to its actual trigger") || !browserSmoke.includes("switched account panel closes to its actual trigger")) errors.push("settings must use a real non-inert backdrop that blocks click-through, switches intended outside actions and transfers return-focus ownership to the actual trigger");
if (!css.includes("color: #526970;") || !css.includes("font-size: 10.5px;") || !css.includes("color: #4f6871;") || !browserSmoke.includes('["binding section title"') || !browserSmoke.includes('["disclosure chevron"') || !browserSmoke.includes("const effectiveBackground") || !browserSmoke.includes("mobile exposed backdrop tap dismisses without click-through")) errors.push("binding section titles and disclosure chevrons must meet accurate composited contrast checks, while mobile touch must cover exposed backdrop dismissal without click-through");
if (!indexHtml.includes('id="settingsPanel" role="dialog" aria-labelledby="panelTitle" aria-modal="true" aria-hidden="true" inert') || !js.includes('if (settingsVisible) settingsPanel?.removeAttribute("inert")') || !js.includes('else settingsPanel?.setAttribute("inert", "")') || !js.includes('if (!settingsVisible || panelMode !== "settings" || !accountFocused || !accountGroup.open) return;')) errors.push("the closed settings dialog must remain inert and delayed account focus must not re-enter it after dismissal");
if (!js.includes("let accountSessionGeneration = 0;") || !js.includes("const sessionIsCurrent = () => expectedGeneration === accountSessionGeneration") || !js.includes("if (!sessionIsCurrent()) return;") || !browserSmoke.includes("late cloud inspection after logout must not revive stale account state")) errors.push("cloud inspection responses must be scoped to the account session generation that started them");
if (!js.includes("let cloudInspectionPending = false;") || !js.includes("let cloudRemoteUsable = false;") || !js.includes("function syncCloudActionAvailability()") || !js.includes("cloudSyncBusy || cloudInspectionPending") || !browserSmoke.includes("pending cloud inspection must report checking and lock destructive cloud actions")) errors.push("cloud actions must remain locked and accurately labelled until remote inspection completes");
if (!js.includes("let cloudUploadPermitted = false;") || !js.includes("cloudInspectionPending || !cloudUploadPermitted") || !browserSmoke.includes("failed cloud inspection must keep both replacement actions locked") || !browserSmoke.includes("corrupt cloud archive should allow explicit repair upload but block download")) errors.push("unknown and confirmed-corrupt remote states must expose distinct safe upload/download permissions");
if (!js.includes("let cloudSaveDirty = false;") || !js.includes("let cloudSyncFlushRequested = false;") || !js.includes("let cloudSyncRetryBlocked = false;") || !js.includes("cloudSyncRetryBlocked = true;") || !js.includes('setCloudStatus("有新进度等待同步", "待同步")') || !js.includes("function armCloudSyncTimer()") || !js.includes("function resumeQueuedCloudSave()") || !js.includes("queueMicrotask(resumeQueuedCloudSave)") || !js.includes("if (cloudSyncBusy) {") || !browserSmoke.includes("a local change queued during a slow upload must receive a second upload with the latest archive") || !browserSmoke.includes("a local change made during password update must resume cloud sync after account busy clears")) errors.push("queued changes across upload and non-upload account activity must resume losslessly while failed uploads remain visibly blocked until a deliberate retry");
if (!js.includes('dashMeter?.setAttribute("aria-valuenow", String(dashCharges))') || !js.includes('dashCharges > 0 ? `${dashCharges} 次冲刺可用` : "冲刺已耗尽"') || !js.includes('staminaMeter?.setAttribute("aria-valuenow", String(staminaPercent))') || !js.includes('staminaMeter?.setAttribute("aria-valuetext", `体力 ${staminaPercent}%`)')) errors.push("dash and stamina progressbar values should track live gameplay state");
if (!css.includes("font-size: 8px;") || css.includes("font-size: 7px;")) errors.push("compact HUD meter labels should remain readable without expanding the HUD");
if (!css.includes("content: attr(data-meter-label)")) errors.push("HUD status bars should render their compact semantic labels");
if (!css.includes("top: clamp(0px, calc((100dvh - 700px) * 0.3), 44px)")) errors.push("tall portrait playfields should stay visually coupled to fixed touch controls while leaving room for the portrait brief");
if (!css.includes("orientation: landscape) and (pointer: coarse)") || !css.includes("background: rgba(20, 20, 21, 0.3)") || !css.includes("backdrop-filter: blur(4px)")) errors.push("coarse-pointer landscape controls should preserve terrain readability beneath their overlay");
if (!css.includes(".settings-group:not([open]) > .settings-group-body") || !css.includes("display: none")) errors.push("collapsed settings details must remove their bodies from layout and keyboard focus");
if (!css.includes(".settings-panel .variant-button") || !css.includes("min-height: 44px")) errors.push("mobile Drill variant buttons should meet the 44px touch target floor");
if (!css.includes(".overlay.finish-overlay")) errors.push("long finish review must align from a reachable scroll top");
if (!css.includes(".room-route-grid")) errors.push("room brief should group route choices visually");
if (!css.includes(".start-actions > #startButton") || !css.includes("grid-column: 1 / -1")) errors.push("the primary start action should own a full row instead of leaving an empty half-cell");
if (!css.includes(".hud[hidden]") || !css.includes("display: none !important")) errors.push("author HUD display rules must not override the overlay hidden state");
if (!js.includes("overlay.hidden = !overlayVisible") || !css.includes(".overlay[hidden]")) errors.push("visual overlay state must match its focus and accessibility state");
if (!css.includes("review-actions")) errors.push("finish review actions styling is missing");
if (!indexHtml.includes("drill-variants")) errors.push("settings panel must expose drill variants");
if (!css.includes("variant-button")) errors.push("drill variant styling is missing");
if (!css.includes("plan-step")) errors.push("practice plan step styling is missing");
if (!css.includes("plan-meter")) errors.push("practice plan progress styling is missing");
if (!css.includes("route-contracts")) errors.push("route contract styling is missing");
if (!css.includes("route-contract-card")) errors.push("route contract cards are missing");
if (!css.includes("route-contract-card.done")) errors.push("route contract completion styling is missing");
if (!css.includes("route-contract-card.interrupted")) errors.push("route contract resume/interruption styling is missing");
if (!css.includes("feel-lab")) errors.push("feel lab styling is missing");
if (!css.includes("feel-card")) errors.push("feel calibration cards are missing");
if (!css.includes("feel-card.active")) errors.push("active feel calibration styling is missing");
if (!css.includes("feel-card.recent")) errors.push("recent feel calibration styling is missing");
if (!css.includes("feel-card.interrupted")) errors.push("interrupted feel calibration styling is missing");
if (!css.includes("storage-note")) errors.push("storage health note styling is missing");
if (!css.includes("game-tip.storage")) errors.push("storage health toast styling is missing");
if (!css.includes("feedback-box")) errors.push("feedback note styling is missing");
if (!css.includes("compact-actions")) errors.push("compact action button styling is missing");
if (!css.includes("gamepad-status-row")) errors.push("gamepad status styling is missing");
if (!css.includes("save-import-box")) errors.push("save import textarea styling is missing");
if (!css.includes("save-import-status")) errors.push("save import preview status styling is missing");
if (!css.includes("route-resume-badge")) errors.push("route resume badge styling is missing");
if (!css.includes("review-card.primary")) errors.push("finish review primary card styling is missing");
if (!css.includes("100dvh")) errors.push("mobile viewports should use dynamic viewport height");
if (!css.includes("overflow-wrap: anywhere")) errors.push("cards/review text should wrap long tokens safely");
if (!css.includes("chapter-overview")) errors.push("chapter overview styling is missing");
if (!css.includes("chapter-meter")) errors.push("chapter completion progress styling is missing");
if (!css.includes("queue-meter")) errors.push("practice queue progress styling is missing");
if (!css.includes("queue-cta")) errors.push("practice queue cards need a clear action affordance");
if (!css.includes("challenge-board")) errors.push("long-term challenge board styling is missing");
if (!css.includes("challenge-card")) errors.push("long-term challenge cards are missing");
if (!css.includes("--challenge-progress")) errors.push("challenge card progress styling is missing");
if (!css.includes("profile-summary")) errors.push("long-term profile summary styling is missing");
if (!css.includes("ledger-meter")) errors.push("practice ledger progress styling is missing");
if (!css.includes("contract-pill")) errors.push("contract pill styling is missing");
if (!css.includes("review-roadmap")) errors.push("finish review roadmap styling is missing");
if (!css.includes("roadmap-row")) errors.push("finish review roadmap rows are missing");
if (!css.includes("settings-body")) errors.push("settings panel should use the refined cockpit layout");
if (!css.includes("settings-group")) errors.push("settings grouped disclosure styling is missing");
if (!css.includes("P116: cool-mist depth with warm ascent accents") || !js.includes("const mountainPeaks = 6") || !js.includes("peakX - step * 0.17") || !js.includes("rgba(230, 240, 239, 0.9)")) errors.push("the visual system must preserve layered, faceted mountain depth instead of reverting to a flat sawtooth backdrop");
if (!css.includes("P117: quiet right-side tools and a cohesive mist-sheet panel") || !css.includes(".hud-actions {\n  gap: 7px;") || !css.includes("border-color: transparent;\n  background: none;\n  box-shadow: none;")) errors.push("practice/settings should retain unboxed HUD tools and the shared mist-sheet foundation");
if (!css.includes("P118: remove repeated coaching and make the right sheet task-first") || !css.includes("width: min(470px, calc(100% - 36px));") || !css.includes("rgba(214, 226, 220, 0.985)") || !css.includes(".settings-group summary span::before {\n  display: none;") || !css.includes(".practice-launch-dock .coach-actions {\n  width: 100%;\n  grid-template-columns: minmax(0, 1fr);")) errors.push("the right sheet should remain compact, decoration-light and focused on one primary launch action");
if (!css.includes(".settings-panel.mode-settings .settings-column {\n  display: block;") || !css.includes(".settings-panel.mode-settings .settings-column + .settings-column") || !css.includes("border-top: 1px solid rgba(58, 85, 96, 0.12)")) errors.push("feedback/save settings must retain a non-collapsing visual separator from display settings");
if (!css.includes("start-panel")) errors.push("start overlay should use the refined ready panel");
if (!js.includes("markAppReady")) errors.push("start overlay needs a JS-ready marker");
if (!js.includes("grabLatched")) errors.push("toggle grab mode state is missing");
if (!js.includes("updateGrabModeState")) errors.push("toggle grab mode update helper is missing");
if (!js.includes("rawGrabHeld")) errors.push("raw grab input helper is missing");
if (!js.includes('grabMode: "hold"')) errors.push("settings should default grab mode to hold");
if (!js.includes("GAMEPAD_DEADZONE_DEFAULT")) errors.push("gamepad deadzone defaults are missing");
if (!js.includes("clampGamepadDeadzone")) errors.push("gamepad deadzone normalization helper is missing");
if (!js.includes("axisMagnitude") || !js.includes("driftRisk")) errors.push("gamepad status should expose axis magnitude and drift risk");
if (!js.includes("TOUCH_SIZE_DEFAULT")) errors.push("touch size defaults are missing");
if (!js.includes("clampTouchSize")) errors.push("touch size normalization helper is missing");
if (!js.includes("lowPerformance")) errors.push("low performance setting is missing");
if (!js.includes("SETTINGS_SCHEMA_VERSION")) errors.push("settings schema version is missing");
if (!js.includes("function recordsEligible()") || !js.includes("辅助完成 · 不计 PB")) errors.push("assist mode must isolate PB and long-term records");
if (!js.includes("function updateAmbientMusic(") || !js.includes("AMBIENT_CHAPTER_CHORDS")) errors.push("chapter ambient music layer is missing");
if (!js.includes("ROOM_WHISPERS") || !js.includes('const hairColor = "#294657"') || js.includes("function drawPlayerRibbon(")) errors.push("classic fixed-hair climber or room atmosphere copy is missing");
if (!js.includes("CHAPTER_EXPERIENCE") || !js.includes("function beginChapterTransition(") || !js.includes("function drawChapterTransition(") || !js.includes("chapterEntry: true")) errors.push("chapter boundaries and direct chapter practice need a paced in-canvas transition");
if (!js.includes("function drawChapterWeather(") || !js.includes("chapterIndexForRoom(roomIndex)")) errors.push("each chapter needs a distinct environmental motion language");
if (!js.includes("function beginSummitReveal(") || !js.includes("function finishSummitReveal(") || !js.includes("pendingSummitResult !== expectedResult") || !js.includes("function drawSummitReveal(") || !js.includes("SUMMIT_REVEAL_TIME") || !js.includes("summitReveal: summitRevealTimer > 0")) errors.push("the summit must pause for a testable in-world reveal and safely reach review even when animation frames are throttled");
if (!js.includes("player.inUpdraft = true") || !js.includes("const windborne = Boolean(player.inUpdraft)") || !js.includes("windborne,")) errors.push("the fixed-hair climber needs a restrained body-level updraft response without recoloring the hair");
if (!skills[7]?.includes("wind") || !maps[7]?.join("").includes("U")) errors.push("R8 must close Wind Gorge by testing wind after prism and crumble pressure");
if ((maps[2]?.join("").match(/T/g) || []).length < 2 || (maps[5]?.join("").match(/T/g) || []).length < 2 || (maps[5]?.join("").match(/A/g) || []).length < 2) errors.push("R3 and R6 capstones must retain their two-stage spring and relay exams");
if (!js.includes("PROFILE_SCHEMA_VERSION")) errors.push("profile schema version is missing");
if (!js.includes("ROOM_FOCUS_SCHEMA_VERSION")) errors.push("room focus schema version is missing");
if (!js.includes("resumeRecommendedTraining")) errors.push("start overlay direct resume helper is missing");
if (!js.includes("TRAINING_TRANSITIONS")) errors.push("training state transition table is missing");
if (!js.includes("syncPlayModeClass")) errors.push("stage play-mode class sync helper is missing");
if (!js.includes("function createCurrentSaveBackup")
  || !js.includes("[SAVE_BACKUP_KEY, JSON.stringify(backup)]")
  || !browserSmoke.includes('"summit-spark-save-backup",')
  || !browserSmoke.includes("roll every imported key and the previous backup back")) errors.push("save import must create its backup inside the same rollback transaction as every replaced save key");
if (!js.includes("restoreSaveBackup") || !js.includes("updateSaveBackupStatus") || !js.includes("panelMode")) errors.push("p23 practice/settings split and backup restore helpers are missing");
if (!js.includes("drawPlayerStateFrame")) errors.push("player state silhouette helper is missing");
if (js.includes("const hairRgb") || js.includes("for (let i = player.hair.length - 1; i > 0; i--)")) errors.push("player hair must remain part of the head silhouette instead of becoming a detached line after jumping");
if (!js.includes("function paceFeedbackActive()") || !js.includes("!paceFeedbackActive()")) errors.push("the large pace ribbon must stay inside explicit pace, route, Feel, or pace-challenge sessions");
if (js.includes("    drawFeelCue(time);\n    drawFlowCue(time);\n    drawRelayChainCue(time);\n    drawRoomBestCue();")) errors.push("normal rendering must not stack text labels directly above the player");
if (!js.includes('const outline = "rgba(31, 66, 82, 0.58)"') || js.includes('const outline = "#162233"')) errors.push("player edges should use a soft blue local edge instead of a small black sticker outline");
if (js.includes("if (apex > 0) {") || !js.includes("if (!practiceVisualsActive() || player.deadTimer > 0")) errors.push("free climbing must not show an apex line or a permanent dash-aim guide around the player");
if (js.includes("if (jump > 0) {") || js.includes("cy - 28 - lift")) errors.push("jumping must read through character motion rather than a floating chevron above the head");
if (!js.includes("const riseTuck = Math.max(0, Math.min(1, -player.vy / 420))") || !js.includes("const fallExtend = Math.max(0, Math.min(1, player.vy / 520))") || !js.includes("const leadKneeX = 2.75 + riseTuck * 0.5 - fallExtend * 0.15") || !js.includes("const rearKneeX = -2.65 - riseTuck * 0.45 + fallExtend * 0.2") || !js.includes("ctx.translate(cx, y + 21)") || !js.includes("ctx.globalAlpha = 0.76") || !js.includes("ctx.lineWidth = 2.65") || !js.includes("ctx.lineWidth = 3.05") || !js.includes('leadLegTone.addColorStop(1, "#477988")') || !js.includes("ctx.quadraticCurveTo(leadKneeX, leadKneeY, leadEndX, leadEndY)") || !js.includes("ctx.quadraticCurveTo(rearKneeX, rearKneeY, rearEndX, rearEndY)") || js.includes("frontToeX") || js.includes("rearToeX") || js.includes("roundRect(ctx, leadEndX")) errors.push("airborne legs should stay tucked under the coat with rounded integrated ends, grounded-scale weight, restrained contrast, and no forked toe or boot shapes");
if (!js.includes("const ghostTimerArmed = player.ghostTimer > 0") || !js.includes("if (ghostTimerArmed) addGhost(settings.calmEffects ? 0.28 : 0.34)") || !js.includes("player.ghostTimer = settings.lowPerformance ? 0.08 : settings.calmEffects ? 0.055 : 0.04") || !js.includes("const life = settings.calmEffects ? 0.16 : 0.18") || !js.includes("const resolvedAlpha = settings.calmEffects ? Math.min(alpha, 0.3) : alpha") || js.includes("player.ghostTimer = 0.032")) errors.push("dash afterimages should avoid a duplicate start frame and honor calm/low-performance pacing while preserving a short directional read");
if (!js.includes("if (!airborne) {") || !js.includes('ctx.fillStyle = "rgba(23,49,60,0.1)"') || js.includes("roundRect(ctx, frontFootX - 2.8") || !js.includes("const groundedLegTone = ctx.createLinearGradient") || js.includes('groundedLegTone.addColorStop(1, "#294b5d")')) errors.push("player contact shadow should disappear in air and grounded feet should share the soft mist-blue integrated leg silhouette without dark boot blocks");
if (!js.includes("const ROOM_INTRO_TIME = 1.2") || !js.includes("const introAlpha = Math.min(1, t * 2.4)") || !js.includes('ctx.fillStyle = "rgba(224, 234, 225, 0.72)"') || !js.includes('ctx.fillStyle = "rgba(50, 75, 80, 0.76)"') || !js.includes('const width = introCompact ? 250 : 218') || js.includes('ctx.fillStyle = "rgba(12, 12, 13, 0.58)"')) errors.push("room entry feedback should remain a brief compact mist-light chapter card with a stable readable hold rather than a large dark or prematurely fading banner");
if (!indexHtml.includes('id="portraitBrief"') || !indexHtml.includes('id="portraitRoomTitle"') || !indexHtml.includes('id="portraitRoomGoal"') || !js.includes("function updatePortraitBrief()") || !js.includes('hasProgress ? "上次训练" : "攀登起点"') || !js.includes("portraitRoomTitle.textContent = `R${target + 1} · ${ROOM_NAMES[target]")) errors.push("portrait play should expose a context-aware start/current-room brief instead of contradictory or empty space");
if (indexHtml.includes('id="controlHint"') || !js.includes('if (kind === "coach" || kind === "onboarding") return;')) errors.push("ordinary onboarding and coach tips should remain absent while warning and storage feedback stay available");
if (!css.includes('top: clamp(96px, calc(50dvh - 285px), 220px)')) errors.push("portrait brief should use the upper safe field while the chapter ridge keeps it visually coupled to the fixed-aspect playfield");
if (!css.includes('@media (max-width: 760px) and (max-height: 520px) and (orientation: portrait)') || !css.includes('top: max(clamp(28px, calc(50dvh - 192px), 68px), calc(env(safe-area-inset-top, 0px) + 10px))')) errors.push("short portrait screens should compact and center the room brief in the upper safe field before the stage HUD rises into it");
if (!css.includes('@media (max-width: 760px) and (max-height: 520px) and (orientation: landscape) and (pointer: coarse)') || !css.includes('.practice-launch-dock .focus-button {\n    min-height: 44px;')) errors.push("short touch landscape should preserve 44px practice launch and reset targets without expanding the mouse layout");
if (!css.includes('background: linear-gradient(180deg, rgba(74, 99, 108, 0.62), rgba(37, 58, 72, 0.5))') || !css.includes('background: rgba(232, 241, 235, 0.1)') || !css.includes('background: rgba(61, 82, 91, 0.52)')) errors.push("the bright stage should use one mist-blue HUD language instead of near-black telemetry and action slabs");
if (!css.includes('background: rgba(203, 217, 211, 0.62)') || !css.includes('background: linear-gradient(180deg, rgba(68, 89, 98, 0.58), rgba(46, 65, 76, 0.54))') || !css.includes('.stage.low-performance .touch button')) errors.push("keyboard and touch input surfaces should share one quiet mist-blue language across normal and low-performance modes");
if (!js.includes('const CANVAS_PANEL_BG = "rgba(211,224,216,0.74)"') || !js.includes('const CANVAS_PANEL_INK = "rgba(36,58,68,0.9)"') || !js.includes('const y = compact ? H - height - 18 : 68') || (js.match(/ctx\.fillStyle = "rgba\(7,12,20,0\.72\)"/g) || []).length > 1) errors.push("training canvas cards should use the shared light mist surface with dark text, and advanced input feedback must stay fixed away from the character rather than becoming head text");
if (!css.includes("top: clamp(0px, calc((100dvh - 700px) * 0.3), 44px)") || !css.includes(".stage.settings-open + .portrait-brief")) errors.push("portrait brief should stay coupled to the playfield and hide behind settings");
if (!indexHtml.includes('id="practiceLaunchDock"') || indexHtml.includes('class="practice-launch-copy"') || !css.includes(".settings-panel .settings-body") || !css.includes("scrollbar-gutter: stable") || !css.includes(".settings-panel.mode-practice .practice-launch-dock")) errors.push("practice should keep one selected-room launch action in a non-scrolling panel dock without duplicate summary copy");
if (!js.includes("const cachedRockTiles = new Map()") || !js.includes("const cachedCrumbleTiles = new Map()") || !js.includes("function createTileSpriteSurface()") || !js.includes("function rockTileSprite(") || !js.includes("ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, x, y, TILE, TILE)") || js.includes("ctx.createLinearGradient(x, y, x + TILE, y + TILE)")) errors.push("static rock/crumble tiles should use density-aware cached sprites while dynamic warning overlays remain live");
if (!js.includes('rockDark: "#30465b"') || !js.includes('rockLight: "#8298a8"') || !js.includes('spriteCtx.fillStyle = "#2b4054"') || js.includes('spriteCtx.fillStyle = "#101827"')) errors.push("ordinary platforms should use lifted blue-gray rock faces instead of near-black rectangular slabs");
if (!js.includes('const shell = stage.closest(".shell")') || !js.includes('const chapterTone = target < 3 ? "gate"') || !js.includes("shell.dataset.portraitChapter = chapterTone") || !css.includes('.shell[data-portrait-chapter="old-peak"]') || !css.includes('.shell[data-portrait-chapter="wind"]') || !css.includes('.shell[data-portrait-chapter="summit"]') || !css.includes("--portrait-ridge-top") || !css.includes("clip-path: polygon(") || !css.includes("top: clamp(96px, calc(50dvh - 285px), 220px)")) errors.push("portrait play should extend a chapter-aware, static low-contrast atmosphere through the brief, stage and touch zones while using the upper safe field for its room brief");
if (!css.includes("--portrait-touch-size: clamp(44px, calc((100vw - 82px) / 5), var(--touch-size, 48px))") || !css.includes('"recall grab"') || !css.includes('"jump dash"') || !browserSmoke.includes("largeTouchUi.withinViewport") || !browserSmoke.includes("commonActionsPaired")) errors.push("large portrait touch controls should adapt to narrow phone widths, keep Jump/Dash paired and reserve one contextual Echo action without clipping");
if (!js.includes('window.matchMedia?.("(prefers-reduced-motion: reduce)")') || !js.includes('stage?.classList.toggle("reduced-motion", prefersReducedMotion)') || !js.includes("player.deadTimer > 0 || prefersReducedMotion") || !js.includes("!settings.lowPerformance && !prefersReducedMotion") || !css.includes("@media (prefers-reduced-motion: reduce)") || !browserSmoke.includes("reducedMotionState")) errors.push("system reduced-motion preference should freeze nonessential canvas ambience and collapse UI animation without hiding gameplay feedback");
if (js.includes('burst(player.x + player.w / 2, player.y + player.h, "#e9f7ff", 5, 135)')) errors.push("ordinary jumps should not leave square debris beneath the player silhouette");
if (!js.includes("function drawSummitGoal(goal, time)") || !js.includes("drawSummitGoal(room.entities.goal, time)") || js.includes('drawDiamond(goal.x, goal.y + Math.sin(time * 4) * 5, 19')) errors.push("the summit goal should use a unique beacon silhouette instead of another collectible diamond");
if (!js.includes("const moonTrack = [0.76, 0.58, 0.34, 0.2]") || !js.includes("const moonHeights = [88, 78, 98, 82]") || !js.includes("const chapterRoomOffset = ((roomIndex % 3) - 1) * 14") || !js.includes("const moonX = W * moonTrack[moonChapter] + chapterRoomOffset") || js.includes("const moonX = W - 110")) errors.push("the moon should migrate by chapter so right-edge exits and the summit goal retain an uncluttered focal area");
if (!js.includes("function isPortraitViewport()") || !js.includes("window.visualViewport?.width || window.innerWidth") || !js.includes("viewportWidth <= 760 && viewportHeight > viewportWidth") || !js.includes("const playerVisualScale = isPortraitViewport() ? 1.38 : 1.09")) errors.push("portrait play should enlarge only the foot-anchored player rendering enough to survive full-room downscaling without changing collision geometry or adding locator effects");
if (!js.includes("const relaySpin = motionTime * (settings.calmEffects ? 0.42 : 1.2)") || !js.includes("ctx.rotate(-relaySpin * 1.75)") || !js.includes("const prismSpin = motionTime * (settings.calmEffects ? 0.46 : 1.35)") || !js.includes("ctx.rotate(prismSpin * 1.78)") || (js.match(/else if \(!settings\.calmEffects \|\| pulse > 0\.04\)/g) || []).length < 2) errors.push("dense late-room relay and prism fields should slow idle rotation and hide secondary ready-state ornaments in calm mode while retaining cooldown and trigger feedback");
if (js.includes("burst(player.x + player.w / 2, player.y + player.h / 2, palette.hot, 7, 210)") || !js.includes("const restartBurstCount = settings.calmEffects ? 7 : 12") || !js.includes('burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", restartBurstCount, 210)')) errors.push("manual retry should not stack a death burst under the respawn burst, and calm room restarts should use the same restrained confirmation budget");
if (!indexHtml.includes('id="deathCount" aria-label="失误次数">失 0</div>') || !js.includes('label: "零失误登顶"') || !js.includes('goal: "完整通关且失误数为 0"') || !js.includes('deathCountText.textContent = `失 ${deathCount}`') || !js.includes('`最佳失误 ${profile.bestDeathCount}`') || !js.includes('<em>最佳失误</em>') || js.includes('deathCountText.textContent = `D ${deathCount}`') || js.includes('label: "零死亡登顶"')) errors.push("the visible counter and no-retry challenge should use the accurate mistake semantic while internal death save keys remain compatible");
if (!js.includes('setGameStatus(`快速重开 · R${roomIndex + 1}`)') || !js.includes('setGameStatus(`房间重开 · R${roomIndex + 1}`)') || !js.includes('setGameStatus(`${deathReasonLabel(deathReason)} · R${roomIndex + 1}，自动复位`)')) errors.push("death and retry actions should replace stale panel status with quiet current feedback");
if (!js.includes('document.querySelectorAll(".settings-group.settings-only")') || !js.includes("if (!group.open || panelMode !== \"settings\") return;") || !js.includes("other.open = false")) errors.push("quiet settings groups should behave as a single-open accordion without changing practice groups");
if (!js.includes('drillCleanButton.textContent = "无失误 · Clean"') || !js.includes('drillPaceButton.textContent = "节奏 · Pace"') || !js.includes('drillStyleButton.textContent = "类型 · Style"') || !js.includes('drillExpertButton.textContent = "高手 · Expert"')) errors.push("Drill variants should explain their English mode names in the visible button labels");
if (!js.includes('focusRoomButton?.addEventListener("click", () => {\n    const target = practiceTargetRoom();') || !js.includes('const label = `开始 R${target + 1} ${drillModeLabel(mode)}`')) errors.push("the room-card primary Drill action should follow the selected room instead of duplicating the global recommendation");
const roomSelectChangeSource = js.slice(js.indexOf('roomSelect?.addEventListener("change"'), js.indexOf('focusRoomButton?.addEventListener("click"'));
if (!roomSelectChangeSource.includes("updateRoomBrief()") || !roomSelectChangeSource.includes("updatePracticeCoach()") || roomSelectChangeSource.includes("jumpToRoom(") || roomSelectChangeSource.includes("closeSettings()") || !js.includes('if (settingsVisible && panelMode === "practice") return;')) errors.push("room selection should update the practice preview without unexpectedly closing the panel or starting gameplay");
if (indexHtml.includes('id="practicePriority"') || indexHtml.includes('id="coachSummary"') || !indexHtml.includes('class="control-row practice-reset-row"')) errors.push("practice should avoid duplicate recommendation/summary surfaces while keeping reset under Advanced");
if (!js.includes("const boostedMotion = dashPulse > 0.04") || !js.includes("if (!boostedMotion) return;")) errors.push("ordinary jumps must not inherit vertical speed wakes that read as long feet");
if (!css.includes("boot-fallback")) errors.push("start overlay should expose a delayed boot fallback");
if (!css.includes("boot-noscript")) errors.push("noscript fallback styling is missing");
if (!css.includes("app-ready")) errors.push("boot fallback should hide after JS initialization");
if (!css.includes("game-tip")) errors.push("game tip styling is missing");
if (!css.includes("--tip-progress")) errors.push("game tip progress styling is missing");
if (!css.includes("--touch-size")) errors.push("touch controls should expose a size variable");
if (!css.includes("touch-directions") || !css.includes("touch-actions")) errors.push("touch controls should use separated direction/action clusters");
if (!css.includes("review-more") || !css.includes("review-grid-primary")) errors.push("finish review should keep extra detail collapsed behind a cleaner primary grid");
if (!css.includes("P21 system polish") || !css.includes(".stage.free-play #splitTime") || !css.includes(".stage.training-active")) errors.push("p21 quiet HUD and system settings styles are missing");
if (!css.includes("P22 mobile playability") || !css.includes("position: fixed") || !css.includes(".stage.settings-open .touch") || !/display:\s*flex;\s*z-index:\s*8/.test(css)) errors.push("p22 portrait touch detachment styles are missing");
if (!css.includes(".settings-panel .settings-group-body > *") || !css.includes("#roomSelect") || !css.includes("overflow-wrap: anywhere")) errors.push("mobile settings width clamps are missing");
if (!css.includes(".settings-panel .control-row select") || !css.includes("#263744")) errors.push("light settings controls need explicit readable foreground styles");
if (!css.includes("P23 panel split") || !css.includes(".settings-panel.mode-settings .practice-only") || !css.includes(".settings-panel.mode-practice .settings-only")) errors.push("p23 settings/practice panel split styles are missing");
if (!css.includes("resume-start.hidden")) errors.push("direct resume button hide state is missing");
if (!css.includes("low-performance")) errors.push("low-performance visual state styling is missing");
if (!css.includes("image-rendering: auto")) errors.push("canvas should not pixelate vector text overlays");
if (!css.includes("settings-open")) errors.push("settings pause should visually dim the playfield");
if (!css.includes(".stage.settings-open .overlay:not(.hidden)")) errors.push("settings-open start overlay should be layered behind the settings panel");
if (!css.includes("z-index: 3")) errors.push("settings-open start overlay should lower its z-index");
if (!css.includes("focus-button.armed")) errors.push("focus reset confirmation state styling is missing");
if (!css.includes("@media (max-height: 520px) and (orientation: landscape)") || !css.includes(".practice-launch-copy b {\n    display: none;") || !css.includes("grid-template-columns: minmax(124px, auto) auto")) errors.push("short landscape practice dock should collapse verbose copy to one line while preserving reachable launch actions");
if (!css.includes("orientation: portrait")) errors.push("portrait mobile settings should not be trapped in the landscape stage");
if (!css.includes("100dvh")) errors.push("portrait start overlay should escape the landscape stage height");
if (!css.includes("max-height: calc(100dvh - 24px)")) errors.push("portrait start panel should be height constrained");
if (!css.includes("/* P111: compact settings stay visually quiet") || !css.includes("@media (max-width: 760px), (pointer: coarse)") || !css.includes(".settings-panel .mini-button {\n    width: 44px;") || !css.includes('.settings-group summary,\n  #settingsPanel button,\n  .settings-panel .control-row select,') || !css.includes('.settings-panel .control-row input[type="range"] {\n    min-height: 44px;')) errors.push("narrow and coarse-pointer settings controls should preserve 44px close, disclosure, button, select and range hit targets");
if (!css.includes(".start-panel .primary,\n  .start-panel .secondary-start {\n    min-height: 44px;")) errors.push("narrow and coarse-pointer start actions should retain 44px hit targets");
if (!css.includes("#practiceButton,\n  #settingsButton {\n    width: 44px;") || !css.includes("height: 44px;\n    min-height: 44px;")) errors.push("narrow and coarse-pointer HUD practice/settings actions should retain 44px square hit targets");
if (!css.includes("overflow-x: hidden")) errors.push("overlays should not create horizontal scrollbars");
if (!css.includes("overflow-y: auto")) errors.push("finish review overlay should be scroll-safe");
if (!js.includes("x: Number(right) - Number(left)")) errors.push("opposing horizontal inputs should resolve to neutral");
if (!js.includes("y: Number(down) - Number(up)")) errors.push("opposing vertical inputs should resolve to neutral");
if (!js.includes('window.addEventListener("blur"') || !js.includes('document.addEventListener("visibilitychange"')) {
  errors.push("focus loss should release held inputs and pause the simulation");
}
if (!js.includes("(settingsVisible || focusPaused) && started && !won")) errors.push("focus pause must share the normal pause boundary");
if (js.includes('armRouteCue("入场", null, ROUTE_CUE_TIME)')) errors.push("free play should not auto-arm an entry route cue");
if (!js.includes("lumenReserve: false") || !js.includes("player.dashes = Math.min(2, player.dashes + 1)")) {
  errors.push("lumens should create a bounded optional dash reserve");
}
if (!js.includes('stage.classList.toggle("lumen-reserve"')) errors.push("lumen reserve should have a quiet HUD state");
if (!js.includes("function restoreDashCharge()") || !js.includes("dashes: player.lumenReserve ? 2 : 1")) {
  errors.push("lumen reserve should survive retry and every dash-refill path consistently");
}
if (!indexHtml.includes('aria-labelledby="panelTitle" aria-modal="true"')) {
  errors.push("settings and practice should expose dynamic dialog semantics");
}
if (!indexHtml.includes('data-touch="recall" aria-label="先激活回声锚点" hidden disabled>召</button>')
  || !indexHtml.includes('data-touch="grab" aria-label="抓墙">抓</button>')
  || !indexHtml.includes('data-touch="jump" aria-label="跳跃">跳</button>')
  || !indexHtml.includes('data-touch="dash" aria-label="冲刺">冲</button>')
  || !js.includes('touchPressed.has("recall") || gamepadPressed.has("recall")')
  || !js.includes("function syncTouchRecallButton()")
  || !js.includes('touchRecallButton.classList.remove("active")')
  || !js.includes("function drawEchoLessonCue(anchor, time)")
  || !browserSmoke.includes("touch Echo recall returns to the active anchor")
  || !browserSmoke.includes("afterTouchRecall.active")) {
  errors.push("touch actions should keep direct visible labels");
}

["drills", "drillClears", "drillClean", "cleanDrills", "cleanWins", "paceDrills", "paceWins", "styleDrills", "styleWins", "expertDrills", "expertWins"].forEach((field) => {
  if (!js.includes(field + ": 0")) errors.push("createRoomFocusEntry must initialize " + field);
  if (!js.includes("saved." + field)) errors.push("normalizeRoomFocus must preserve " + field);
});

const counts = maps.map(countTiles);
const pressures = counts.map(pressure);
// Compare the middle act against the two teaching rooms; R3 is intentionally
// a capstone spike rather than part of the introductory pressure baseline.
const earlyAvg = pressures.slice(0, 2).reduce((sum, value) => sum + value, 0) / 2;
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
if (!workflow.includes("node-version: 24")
  || !workflow.includes("actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0")
  || !workflow.includes("actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0")
  || !workflow.includes("actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128 # v5.0.0")
  || workflow.includes("FORCE_JAVASCRIPT_ACTIONS_TO_NODE24")) {
  errors.push("GitHub Pages workflow should use reviewed native Node 24 Pages actions without the retired compatibility override");
}
if (!fs.readFileSync(path.join(root, "package.json"), "utf8").includes("\"check\"")) errors.push("package.json must expose npm run check");
if (!fs.readFileSync(path.join(root, "package.json"), "utf8").includes("\"browser-smoke\"")) errors.push("package.json must expose npm run browser-smoke");
if (!fs.readFileSync(path.join(root, "package.json"), "utf8").includes("\"route-audit\"")) errors.push("package.json must expose npm run route-audit");
if (!fs.readFileSync(path.join(root, "package.json"), "utf8").includes("\"state-check\"")) errors.push("package.json must expose npm run state-check");
if (!fs.existsSync(path.join(root, "tools", "check-browser-smoke.js"))) errors.push("browser smoke script is missing");
if (!fs.existsSync(path.join(root, "tools", "check-route-audit.js"))) errors.push("route audit script is missing");
if (!fs.existsSync(path.join(root, "tools", "check-training-state.js"))) errors.push("training state check script is missing");
const internalPlanningDocs = [
  "DEVELOPMENT_DIRECTION.md",
  "LONG_TERM_OPTIMIZATION_OUTLINE.md",
  "MASTERPLAN.md",
  "ROADMAP.md",
  "SUPER_PUSH_PLAN.md",
  "UX_EXPERIENCE_REVIEW_PLAN.md"
];
for (const file of internalPlanningDocs) {
  if (fs.existsSync(path.join(root, file))) errors.push("public first-version package should not include internal planning doc: " + file);
}
if (!readme.includes("CHANGELOG.md")) errors.push("README must link the changelog");
if (!readme.includes("RELEASE_CHECKLIST.md")) errors.push("README must link the release checklist");
if (!readme.includes("PLAYTEST_CHECKLIST.md")) errors.push("README must link the manual playtest checklist");
if (!readme.includes("KNOWN_ISSUES.md")) errors.push("README must link known issues");
if (!readme.includes("诊断快照")) errors.push("README must explain the diagnostics snapshot");
if (!releaseChecklist.includes("PLAYTEST_CHECKLIST.md")) errors.push("release checklist must require the manual playtest checklist");
if (!releaseChecklist.includes("KNOWN_ISSUES.md")) errors.push("release checklist must require known issue triage");
if (!releaseChecklist.includes("diagnostics copy button")) errors.push("release checklist must include diagnostics verification");
if (!playtestChecklist.includes("Ten-Room Route Pass") || !playtestChecklist.includes("Route interruption/resume") || !playtestChecklist.includes("Feel interruption")) {
  errors.push("PLAYTEST_CHECKLIST.md must cover ten-room pass plus Route/Feel interruption");
}
if (!playtestChecklist.includes("诊断 / 复制")) errors.push("PLAYTEST_CHECKLIST.md must pair friction notes with diagnostics snapshots");
if (!playtestChecklist.includes("meta build-version") || !playtestChecklist.includes("node tools/check-public-surface.js") || /20\d{6}-p\d+/.test(playtestChecklist)) errors.push("PLAYTEST_CHECKLIST.md should verify the current public build dynamically instead of pinning a stale release version");
if (!playtestChecklist.includes("compact bottom Move → Jump → Dash strip") || !playtestChecklist.includes("labelled touch controls are rendered") || playtestChecklist.includes("without automatic teaching toast or visible control guide")) errors.push("PLAYTEST_CHECKLIST.md should distinguish the quiet first-run keyboard strip from forbidden toast/head-level coaching and touch duplication");
if (!playtestChecklist.includes("operating system's reduced-motion preference") || !releaseChecklist.includes("reduced-motion preference") || !releaseChecklist.includes("64px setting")) errors.push("manual and release checks should cover reduced motion plus the narrow-phone 64px touch-control boundary");
if (!knownIssues.includes("Physical gamepad") || !knownIssues.includes("Full 10-room human pass") || !knownIssues.includes("Online Pages freshness")) {
  errors.push("KNOWN_ISSUES.md must keep current real-world verification limits visible");
}
if (!knownIssues.includes("Diagnostics, feedback templates and summit run reports are local-only")) errors.push("KNOWN_ISSUES.md must describe diagnostics, templates and run reports as local-only");

if (errors.length > 0) {
  console.error("Contract check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("Contract check passed: single HTML entry, DOM ids, focus coaching, " + maps.length + " room guides, pressure " + pressures.join("/") + ".");
