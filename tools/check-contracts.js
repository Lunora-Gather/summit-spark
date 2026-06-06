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
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const roadmap = fs.readFileSync(path.join(root, "ROADMAP.md"), "utf8");
const masterplan = fs.readFileSync(path.join(root, "MASTERPLAN.md"), "utf8");
const directionPath = path.join(root, "DEVELOPMENT_DIRECTION.md");
const developmentDirection = fs.existsSync(directionPath) ? fs.readFileSync(directionPath, "utf8") : "";
const longTermPath = path.join(root, "LONG_TERM_OPTIMIZATION_OUTLINE.md");
const longTermPlan = fs.existsSync(longTermPath) ? fs.readFileSync(longTermPath, "utf8") : "";
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

if (indexHtml !== standaloneHtml) errors.push("index.html and summit-spark.html must stay identical");
const requiredIds = [
  "game", "startButton", "overlay", "lumenCount", "roomCount", "splitTime", "splitDelta",
  "flowCount", "runTime", "deathCount", "debugPanel", "settingsButton", "settingsPanel",
  "settingsClose", "shakeSlider", "debugToggle", "calmEffectsToggle", "lowPerformanceToggle", "practiceLinesToggle",
  "ghostOpacitySlider", "audioToggle", "audioVolumeSlider", "audioTestButton", "feedbackType", "feedbackNote", "diagnosticsButton", "feedbackTemplateButton", "controlPreset", "grabMode", "gamepadDeadzoneSlider", "gamepadStatus", "touchSizeSlider", "saveExportButton", "saveDownloadButton", "saveImportButton", "saveImportText", "saveImportStatus", "roomSelect", "practicePriority", "focusRoomButton", "focusResetButton", "coachSummary",
  "roomBrief", "practiceReport", "chapterOverview", "practicePlan", "routeContracts", "feelLab", "practiceQueue", "challengeBoard", "profileSummary", "practiceLedger", "drillCleanButton", "drillPaceButton", "drillStyleButton", "drillExpertButton",
  "startReadiness", "loadStatus", "bootFallback", "openTrainingButton", "resumeTrainingButton", "gameStatus", "gameTip", "gameTipTitle", "gameTipDetail"
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
if (!js.includes("startRoomDrill")) errors.push("room drill entry helper is missing");
if (!js.includes("resolveDrillMode")) errors.push("primary drill contract resolver is missing");
if (!js.includes("retryFailedDrill")) errors.push("failed drill retry helper is missing");
if (!js.includes("drawDrillHud")) errors.push("drill HUD helper is missing");
if (!js.includes("drillModeLabel")) errors.push("drill mode label helper is missing");
if (!js.includes("drillSucceeded")) errors.push("drill variant success helper is missing");
if (!js.includes("ROOM_STYLE_TRIALS")) errors.push("style difficulty trials are missing");
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
if (!js.includes("roomPurposeLabel")) errors.push("room purpose helper is missing");
if (!js.includes("roomRouteLine")) errors.push("room route line helper is missing");
if (!js.includes("routeLineCore")) errors.push("drill route line core helper is missing");
if (!js.includes("roomTrainingAdvice")) errors.push("room training advice helper is missing");
if (!js.includes("roomCleanShort")) errors.push("room clean badge helper is missing");
if (!js.includes("roomDrillText")) errors.push("room drill stats helper is missing");
if (!js.includes("roomPaceLabel")) errors.push("room pace helper is missing");
if (!js.includes("summitReview")) errors.push("summit review helper is missing");
if (!js.includes("summitReviewCardsHtml")) errors.push("summit review card helper is missing");
if (!js.includes("bindFinishReviewActions")) errors.push("finish review drill buttons are missing");
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
if (!js.includes("refreshStartOverlay")) errors.push("start overlay should expose ready/continue state");
if (!js.includes("openStartTrainingPanel")) errors.push("start overlay should open the training cockpit");
if (!js.includes("confirmFocusReset")) errors.push("focus reset should require confirmation");
if (!js.includes("scheduleFocusResetExpiry")) errors.push("focus reset confirmation should expire visibly");
if (!js.includes("drawCooldownRing")) errors.push("mechanic cooldown ring helper is missing");
if (!indexHtml.includes("pause-badge")) errors.push("settings panel must show pause state");
if (indexHtml.includes('<div class="hud" aria-hidden="true">')) errors.push("settings button must not be hidden by hud aria-hidden");
if (indexHtml.includes('<div class="meters" aria-hidden="true">')) errors.push("HUD counters should remain available to assistive tech");
if (!indexHtml.includes('class="dash-meter" title="冲刺" aria-hidden="true"')) errors.push("decorative dash meter should be hidden from assistive tech");
if (!indexHtml.includes('id="runTime" aria-label="总时间"')) errors.push("HUD counters need accessible labels");
if (!indexHtml.includes('aria-controls="settingsPanel"')) errors.push("settings button must reference settings panel");
if (!indexHtml.includes('aria-expanded="false"')) errors.push("settings button must expose collapsed state");
if (!indexHtml.includes('aria-label="设置"')) errors.push("settings button should have a localized accessible label");
if (!indexHtml.includes('aria-live="polite"')) errors.push("game should expose live status text");
if (!indexHtml.includes("settings-section-title")) errors.push("settings panel must group controls");
if (!indexHtml.includes("settings-group-training") || !indexHtml.includes("settings-group-controls") || !indexHtml.includes("settings-group-audio") || !indexHtml.includes("settings-group-display") || !indexHtml.includes("settings-group-feedback")) errors.push("settings panel must use focused grouped disclosure sections");
if (indexHtml.includes("start-guide") || indexHtml.includes("start-copy")) errors.push("start overlay should not include explanatory guide blocks");
const openSettingsGroups = indexHtml.match(/<details class="settings-group [^"]+" open>/g) || [];
if (openSettingsGroups.length !== 1 || !openSettingsGroups[0].includes("settings-group-controls")) {
  errors.push("settings controls group should be the only default-open group");
}
if (!indexHtml.includes('id="practicePlan"')) errors.push("settings panel must include a practice plan surface");
if (!indexHtml.includes('id="routeContracts"')) errors.push("settings panel must include route contracts");
if (!indexHtml.includes('id="feelLab"')) errors.push("settings panel must include feel lab");
if (!indexHtml.includes('id="audioTestButton"')) errors.push("settings panel must include an audio test button");
if (!indexHtml.includes('id="feedbackType"')) errors.push("settings panel must include feedback type");
if (!indexHtml.includes('id="feedbackNote"')) errors.push("settings panel must include feedback note textarea");
if (!indexHtml.includes('id="diagnosticsButton"')) errors.push("settings panel must include a diagnostics copy button");
if (!indexHtml.includes('id="feedbackTemplateButton"')) errors.push("settings panel must include a feedback template button");
if (!indexHtml.includes('id="gamepadStatus"')) errors.push("settings panel must include non-sensitive gamepad status");
if (!indexHtml.includes('id="saveExportButton"')) errors.push("settings panel must include save export copy");
if (!indexHtml.includes('id="saveDownloadButton"')) errors.push("settings panel must include save archive download");
if (!indexHtml.includes('id="saveImportButton"')) errors.push("settings panel must include save archive import");
if (!indexHtml.includes('id="saveImportText"')) errors.push("settings panel must include save archive import text");
if (!indexHtml.includes('id="saveImportStatus"')) errors.push("settings panel must include save archive import preview status");
const buildVersion = (indexHtml.match(/name="build-version" content="([^"]+)"/) || [])[1] || "";
if (!/^\d{8}-p\d+$/.test(buildVersion)) errors.push("HTML should expose the current YYYYMMDD-pN build version");
if (buildVersion && !indexHtml.includes("summit-spark.css?v=" + buildVersion)) errors.push("HTML should version the CSS asset with the build version");
if (buildVersion && !indexHtml.includes("summit-spark.js?v=" + buildVersion)) errors.push("HTML should version the JS asset with the build version");
if (!indexHtml.includes("boot-noscript")) errors.push("start overlay should explain when JavaScript is disabled");
if (!indexHtml.includes("settings-panel")) errors.push("settings panel shell is missing");
if (!standaloneHtml.includes("settings-panel")) errors.push("standalone settings panel shell is missing");
const css = fs.readFileSync(path.join(root, "summit-spark.css"), "utf8");
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
if (!js.includes("PROFILE_SCHEMA_VERSION")) errors.push("profile schema version is missing");
if (!js.includes("ROOM_FOCUS_SCHEMA_VERSION")) errors.push("room focus schema version is missing");
if (!js.includes("resumeRecommendedTraining")) errors.push("start overlay direct resume helper is missing");
if (!js.includes("TRAINING_TRANSITIONS")) errors.push("training state transition table is missing");
if (!js.includes("syncPlayModeClass")) errors.push("stage play-mode class sync helper is missing");
if (!js.includes("SAVE_BACKUP_KEY") || !js.includes("backupCurrentSaveArchive")) errors.push("save import should preserve a local backup before overwrite");
if (!js.includes("drawPlayerStateFrame")) errors.push("player state silhouette helper is missing");
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
if (!css.includes("resume-start.hidden")) errors.push("direct resume button hide state is missing");
if (!css.includes("low-performance")) errors.push("low-performance visual state styling is missing");
if (!css.includes("image-rendering: auto")) errors.push("canvas should not pixelate vector text overlays");
if (!css.includes("settings-open")) errors.push("settings pause should visually dim the playfield");
if (!css.includes(".stage.settings-open .overlay:not(.hidden)")) errors.push("settings-open start overlay should be layered behind the settings panel");
if (!css.includes("z-index: 3")) errors.push("settings-open start overlay should lower its z-index");
if (!css.includes("focus-button.armed")) errors.push("focus reset confirmation state styling is missing");
if (!css.includes("orientation: portrait")) errors.push("portrait mobile settings should not be trapped in the landscape stage");
if (!css.includes("100dvh")) errors.push("portrait start overlay should escape the landscape stage height");
if (!css.includes("max-height: calc(100dvh - 24px)")) errors.push("portrait start panel should be height constrained");
if (!css.includes("overflow-x: hidden")) errors.push("overlays should not create horizontal scrollbars");
if (!css.includes("overflow-y: auto")) errors.push("finish review overlay should be scroll-safe");

["drills", "drillClears", "drillClean", "cleanDrills", "cleanWins", "paceDrills", "paceWins", "styleDrills", "styleWins", "expertDrills", "expertWins"].forEach((field) => {
  if (!js.includes(field + ": 0")) errors.push("createRoomFocusEntry must initialize " + field);
  if (!js.includes("saved." + field)) errors.push("normalizeRoomFocus must preserve " + field);
});

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
if (!workflow.includes("FORCE_JAVASCRIPT_ACTIONS_TO_NODE24") || !workflow.includes("node-version: 24")) errors.push("GitHub Pages workflow should opt into Node 24 for action/runtime compatibility");
if (!fs.readFileSync(path.join(root, "package.json"), "utf8").includes("\"check\"")) errors.push("package.json must expose npm run check");
if (!fs.readFileSync(path.join(root, "package.json"), "utf8").includes("\"browser-smoke\"")) errors.push("package.json must expose npm run browser-smoke");
if (!fs.readFileSync(path.join(root, "package.json"), "utf8").includes("\"route-audit\"")) errors.push("package.json must expose npm run route-audit");
if (!fs.readFileSync(path.join(root, "package.json"), "utf8").includes("\"state-check\"")) errors.push("package.json must expose npm run state-check");
if (!fs.existsSync(path.join(root, "tools", "check-browser-smoke.js"))) errors.push("browser smoke script is missing");
if (!fs.existsSync(path.join(root, "tools", "check-route-audit.js"))) errors.push("route audit script is missing");
if (!fs.existsSync(path.join(root, "tools", "check-training-state.js"))) errors.push("training state check script is missing");
if (!readme.includes("LONG_TERM_OPTIMIZATION_OUTLINE.md")) errors.push("README must link the long-term optimization outline");
if (!readme.includes("SUPER_PUSH_PLAN.md")) errors.push("README must link the super-push plan");
if (!readme.includes("DEVELOPMENT_DIRECTION.md")) errors.push("README must link the development direction guardrails");
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
if (!knownIssues.includes("Physical gamepad") || !knownIssues.includes("Full 10-room human pass") || !knownIssues.includes("Online Pages freshness")) {
  errors.push("KNOWN_ISSUES.md must keep current real-world verification limits visible");
}
if (!knownIssues.includes("Diagnostics and feedback templates are local-only")) errors.push("KNOWN_ISSUES.md must describe diagnostics/templates as local-only");
if (!roadmap.includes("LONG_TERM_OPTIMIZATION_OUTLINE.md")) errors.push("ROADMAP must link the long-term optimization outline");
if (!roadmap.includes("SUPER_PUSH_PLAN.md")) errors.push("ROADMAP must link the super-push plan");
if (!roadmap.includes("DEVELOPMENT_DIRECTION.md")) errors.push("ROADMAP must link the development direction guardrails");
if (!masterplan.includes("LONG_TERM_OPTIMIZATION_OUTLINE.md")) errors.push("MASTERPLAN must link the long-term optimization outline");
if (!masterplan.includes("SUPER_PUSH_PLAN.md")) errors.push("MASTERPLAN must link the super-push plan");
if (!masterplan.includes("DEVELOPMENT_DIRECTION.md")) errors.push("MASTERPLAN must link the development direction guardrails");
const requiredDirectionSections = [
  "# 山巅微光开发方向守则",
  "## 1. 分支与 PR",
  "## 2. 产品方向",
  "## 3. 数据规则",
  "## 4. UI 优先级",
  "## 5. 质量门"
];
if (!developmentDirection) {
  errors.push("Missing DEVELOPMENT_DIRECTION.md");
} else {
  for (const section of requiredDirectionSections) {
    if (!developmentDirection.includes(section)) errors.push("development direction missing " + section);
  }
}
const requiredLongTermSections = [
  "# 山巅微光长期优化总纲",
  "## 1. 产品北极星",
  "## 2. 已有基础",
  "## 3. 长期推进主线",
  "## 4. 审美与可读性原则",
  "## 5. 分阶段路线",
  "## 6. 下一轮推进包",
  "## 7. 完成标准",
  "## 8. 风险边界",
  "不是复刻"
];
if (!longTermPlan) {
  errors.push("Missing LONG_TERM_OPTIMIZATION_OUTLINE.md");
} else {
  for (const section of requiredLongTermSections) {
    if (!longTermPlan.includes(section)) errors.push("long-term outline missing " + section);
  }
}

if (errors.length > 0) {
  console.error("Contract check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("Contract check passed: html twins, DOM ids, focus coaching, " + maps.length + " room guides, pressure " + pressures.join("/") + ".");
