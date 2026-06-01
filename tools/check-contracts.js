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
const longTermPath = path.join(root, "LONG_TERM_OPTIMIZATION_OUTLINE.md");
const longTermPlan = fs.existsSync(longTermPath) ? fs.readFileSync(longTermPath, "utf8") : "";
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
const allowedStyleTech = new Set(["spark", "relay", "relayChain", "spring", "updraft", "prism", "echo", "recall", "crumble"]);
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
  "settingsClose", "shakeSlider", "debugToggle", "calmEffectsToggle", "practiceLinesToggle",
  "ghostOpacitySlider", "controlPreset", "roomSelect", "practicePriority", "focusRoomButton", "focusResetButton", "coachSummary",
  "roomBrief", "practiceReport", "practicePlan", "practiceQueue", "practiceLedger", "drillCleanButton", "drillPaceButton", "drillStyleButton", "drillExpertButton", "gameStatus"
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
if (!js.includes("drawTimingGateCue")) errors.push("first-input timing gate needs a visible cue");
if (!js.includes("deathPrescription")) errors.push("death coach should prescribe next action");
if (!js.includes("deathCoachPlanText")) errors.push("death coach should point to a drill plan");
if (!js.includes("drawContractStrip")) errors.push("Drill HUD should show contract ladder status");
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
if (!indexHtml.includes('id="practicePlan"')) errors.push("settings panel must include a practice plan surface");
if (!indexHtml.includes("settings-panel")) errors.push("settings panel shell is missing");
if (!standaloneHtml.includes("settings-panel")) errors.push("standalone settings panel shell is missing");
const css = fs.readFileSync(path.join(root, "summit-spark.css"), "utf8");
if (!css.includes("review-actions")) errors.push("finish review actions styling is missing");
if (!indexHtml.includes("drill-variants")) errors.push("settings panel must expose drill variants");
if (!css.includes("variant-button")) errors.push("drill variant styling is missing");
if (!css.includes("plan-step")) errors.push("practice plan step styling is missing");
if (!css.includes("plan-meter")) errors.push("practice plan progress styling is missing");
if (!css.includes("queue-meter")) errors.push("practice queue progress styling is missing");
if (!css.includes("queue-cta")) errors.push("practice queue cards need a clear action affordance");
if (!css.includes("ledger-meter")) errors.push("practice ledger progress styling is missing");
if (!css.includes("settings-open")) errors.push("settings pause should visually dim the playfield");
if (!css.includes("focus-button.armed")) errors.push("focus reset confirmation state styling is missing");
if (!css.includes("orientation: portrait")) errors.push("portrait mobile settings should not be trapped in the landscape stage");
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
if (!fs.readFileSync(path.join(root, "package.json"), "utf8").includes("\"check\"")) errors.push("package.json must expose npm run check");
if (!readme.includes("LONG_TERM_OPTIMIZATION_OUTLINE.md")) errors.push("README must link the long-term optimization outline");
if (!readme.includes("SUPER_PUSH_PLAN.md")) errors.push("README must link the super-push plan");
if (!roadmap.includes("LONG_TERM_OPTIMIZATION_OUTLINE.md")) errors.push("ROADMAP must link the long-term optimization outline");
if (!roadmap.includes("SUPER_PUSH_PLAN.md")) errors.push("ROADMAP must link the super-push plan");
if (!masterplan.includes("LONG_TERM_OPTIMIZATION_OUTLINE.md")) errors.push("MASTERPLAN must link the long-term optimization outline");
if (!masterplan.includes("SUPER_PUSH_PLAN.md")) errors.push("MASTERPLAN must link the super-push plan");
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
