#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import {
  TRAINING_TRANSITIONS,
  activeRouteContractDataFor,
  activeChallengeReviewData,
  activeChallengeStateData,
  advanceRouteContractData,
  challengeProgressData,
  createFeelCompletionResultData,
  createFeelInterruptionResultData,
  createDrillData,
  createActiveChallengeData,
  createRouteCompletionResultData,
  createRouteInterruptionResultData,
  createRouteContractStateData,
  drillSucceededData,
  drillContractProgressData,
  drillContractStatsData,
  feelFixtureMatchesDrillData,
  feelFixtureModeData,
  feelFixturePresentationData,
  leadingRoomReasonData,
  practicePlanTargetsData,
  practiceRoomRecommendationsData,
  recordDrillClearData,
  recordDrillStartData,
  recordRoomClearData,
  recordRoomFaultData,
  reconcileChallengeWinsData,
  roomFocusScoreData,
  roomMasteryLevelData,
  roomMasteryScoreData,
  roomReviewModeData,
  routeContractMatchesDrillData,
  routeContractResumeStepData,
  routeContractSummaryTextData,
  routeStepIndexData,
  trainingTransitionOptionsData
} from "../public/modules/training/state.mjs";

assert.equal(Object.isFrozen(TRAINING_TRANSITIONS), true);
assert.equal(Object.isFrozen(TRAINING_TRANSITIONS.hardReset), true);
assert.deepEqual(trainingTransitionOptionsData("hardReset", { keepDrill: true }), {
  keepDrill: true,
  keepChallenge: false,
  keepRoute: false,
  keepFeel: false,
  routeReason: "重开路线",
  feelReason: "重开中断"
});
assert.deepEqual(trainingTransitionOptionsData("__proto__", { keepFeel: true }), { keepFeel: true });

const clean = createDrillData(1, "clean", "无失误", 8);
const pace = createDrillData(2, "pace", "达标", 12);
const style = createDrillData(6, "style", "类型动作", 15);
const expert = createDrillData(9, "expert", "高手线", 20);
assert.deepEqual(createDrillData(0, "clean", "x", Number.NaN), {
  room: 0,
  mode: "clean",
  objective: "x",
  target: 0
});
assert.equal(drillSucceededData(clean, { clean: true, elapsed: 100 }), true);
assert.equal(drillSucceededData(clean, { clean: false, elapsed: 1 }), false);
assert.equal(drillSucceededData(pace, { clean: false, elapsed: 12 }), true, "pace target is inclusive");
assert.equal(drillSucceededData(pace, { clean: true, elapsed: 12.001 }), false);
assert.equal(drillSucceededData(style, { styleSucceeded: true }), true);
assert.equal(drillSucceededData(style, { styleSucceeded: false }), false);
assert.equal(drillSucceededData(expert, {
  clean: true,
  elapsed: 20,
  expertRequirementsMet: true
}), true);
assert.equal(drillSucceededData(expert, {
  clean: true,
  elapsed: 20,
  expertRequirementsMet: false
}), false);

const contracts = [{
  id: "stable",
  label: "稳定航线",
  steps: [
    { index: 1, mode: "clean" },
    { index: 4, mode: "clean" },
    { index: 6, mode: "style" }
  ]
}];
const contract = contracts[0];
assert.equal(routeStepIndexData(contract, -4), 0);
assert.equal(routeStepIndexData(contract, 99), 2);
assert.equal(routeStepIndexData({ id: "empty", steps: [] }, 0), -1);
const route = createRouteContractStateData(contract, 0, 7);
assert.deepEqual(route, { id: "stable", step: 0, generation: 7 });
assert.equal(createRouteContractStateData({ id: "empty", steps: [] }, 0, 1), null);
assert.deepEqual(activeRouteContractDataFor(route, contracts), {
  contract,
  step: contract.steps[0],
  stepIndex: 0,
  total: 3
});
assert.equal(activeRouteContractDataFor({ id: "__proto__", step: 0 }, contracts), null);
assert.equal(routeContractMatchesDrillData(route, contracts, clean), true);
assert.equal(routeContractMatchesDrillData(route, contracts, pace), false);
assert.equal(routeContractResumeStepData({
  id: "stable",
  done: false,
  step: 99
}, contract), 2);
assert.equal(routeContractResumeStepData({
  id: "stable",
  done: true,
  step: 1
}, contract), -1);
assert.equal(routeContractResumeStepData({
  id: "stable",
  done: false,
  step: 1.5
}, contract), 0, "malformed resume steps must preserve the legacy safe fallback");

const firstAdvance = advanceRouteContractData(route, contract, 1, "clean");
assert.equal(firstAdvance.matched, true);
assert.equal(firstAdvance.done, false);
assert.deepEqual(firstAdvance.state, { id: "stable", step: 1, generation: 7 });
assert.deepEqual(firstAdvance.next, contract.steps[1]);
assert.equal(advanceRouteContractData(route, contract, 1, "pace").matched, false);
const finalAdvance = advanceRouteContractData({
  id: "stable",
  step: 2,
  generation: 7
}, contract, 6, "style");
assert.equal(finalAdvance.matched, true);
assert.equal(finalAdvance.done, true);
assert.equal(finalAdvance.state, null);

assert.equal(feelFixtureModeData({ expected: ["jump"] }), "clean");
assert.equal(feelFixtureModeData({ expected: ["dash"] }), "pace");
assert.equal(feelFixtureModeData({ expected: ["wallSpark"] }), "style");
assert.equal(feelFixtureModeData({ expected: ["dash", "prismSpark"] }), "style");
assert.equal(feelFixtureMatchesDrillData({
  id: "jump-buffer",
  room: 1,
  mode: "clean"
}, clean), true);
assert.equal(feelFixtureMatchesDrillData({
  id: "jump-buffer",
  room: 1,
  mode: "pace"
}, clean), false);

const focusEntry = {
  schemaVersion: 2,
  faults: 2,
  clears: 1,
  clean: 1,
  drills: 3,
  drillClears: 1,
  drillClean: 1,
  cleanDrills: 1,
  cleanWins: 1,
  paceDrills: 2,
  paceWins: 0,
  styleDrills: 0,
  styleWins: 0,
  expertDrills: 0,
  expertWins: 0,
  fall: 1,
  spikes: 1,
  last: "spikes"
};
assert.equal(leadingRoomReasonData(focusEntry, ["fall", "spikes"], (reason) => reason || "none"), "fall", "ties preserve reason order");
assert.equal(leadingRoomReasonData({
  ...focusEntry,
  fall: 0,
  spikes: 0
}, ["fall", "spikes"], (reason) => reason || "none"), "spikes");

const faulted = recordRoomFaultData(focusEntry, "spikes");
assert.equal(faulted.faults, 3);
assert.equal(faulted.spikes, 2);
assert.equal(faulted.last, "spikes");
assert.equal(focusEntry.faults, 2, "Focus updates must not mutate the previous entry");
const cleared = recordRoomClearData(focusEntry, true);
assert.equal(cleared.clears, 2);
assert.equal(cleared.clean, 2);
assert.equal(recordRoomClearData(focusEntry, false).clean, 1);

const drillStarted = recordDrillStartData(focusEntry, "style");
assert.equal(drillStarted.drills, 4);
assert.equal(drillStarted.styleDrills, 1);
assert.equal(recordDrillStartData(focusEntry, "__proto__").drills, 4);
assert.equal(recordDrillStartData(focusEntry, "__proto__").cleanDrills, 1);
const drillCleared = recordDrillClearData(focusEntry, true, "pace");
assert.equal(drillCleared.drillClears, 2);
assert.equal(drillCleared.drillClean, 2);
assert.equal(drillCleared.paceWins, 1);
assert.deepEqual(drillContractStatsData(focusEntry, "pace"), { starts: 2, wins: 0 });
assert.deepEqual(drillContractStatsData(focusEntry, "auto"), { starts: 3, wins: 1 });
assert.equal(drillContractProgressData({ starts: 4, wins: 1 }), 25);
assert.equal(drillContractProgressData({ starts: 1, wins: 4 }), 100);
assert.equal(drillContractProgressData({ starts: 0, wins: 4 }), 0);

const capped = recordRoomFaultData({ faults: 9999, spikes: 9999 }, "spikes");
assert.equal(capped.faults, 9999);
assert.equal(capped.spikes, 9999);
assert.equal(roomFocusScoreData({ faults: 8, clean: 2 }, 3), 16);
assert.equal(roomFocusScoreData({ faults: Number.NaN, clean: -1 }, -2), 0);
assert.equal(roomMasteryScoreData({
  entry: { clean: 1, expertWins: 1 },
  best: 10,
  grade: "S",
  focusScore: 0
}), 90);
assert.equal(roomMasteryScoreData({
  entry: { clean: 1, cleanWins: 1 },
  best: 10,
  grade: "B",
  focusScore: 20
}), 46, "mastery pressure penalty remains capped at 18");
assert.equal(roomMasteryLevelData(86), "掌握");
assert.equal(roomMasteryLevelData(66), "稳定");
assert.equal(roomMasteryLevelData(42), "成形");
assert.equal(roomMasteryLevelData(18), "可通");
assert.equal(roomMasteryLevelData(17), "待练");
assert.equal(roomReviewModeData({
  entry: { clean: 0 },
  loss: null,
  pressure: 0,
  grade: ""
}), "clean");
assert.equal(roomReviewModeData({
  entry: { clean: 1 },
  loss: 0.2,
  pressure: 0,
  grade: "A"
}), "pace");
assert.equal(roomReviewModeData({
  entry: { clean: 1, styleWins: 0 },
  loss: -0.2,
  pressure: 0,
  grade: "S"
}), "style");
assert.equal(roomReviewModeData({
  entry: { clean: 1, styleWins: 1, expertWins: 0 },
  loss: -0.2,
  pressure: 0,
  grade: "S"
}), "expert");

const recommendationRows = [
  { index: 0, entry: {}, best: 0, target: 9, grade: "", focusScore: 0, loss: null },
  { index: 1, entry: { clean: 1 }, best: 12, target: 10, grade: "A", focusScore: 0, loss: 2 },
  { index: 2, entry: { clean: 1, styleWins: 0 }, best: 8, target: 9, grade: "S", focusScore: 3, loss: -1 },
  { index: 3, entry: { clean: 1, styleWins: 1, expertWins: 0 }, best: 9, target: 10, grade: "S", focusScore: 0, loss: -1 }
];
assert.deepEqual(practiceRoomRecommendationsData(recommendationRows), {
  recommended: 2,
  clean: 0,
  pace: 1,
  style: 2,
  expert: 3
}, "one snapshot should preserve Focus, Clean, largest-loss, Style and Expert priorities");
assert.deepEqual(practiceRoomRecommendationsData(recommendationRows.map((row) => ({ ...row, focusScore: 0 }))), {
  recommended: 0,
  clean: 0,
  pace: 1,
  style: 2,
  expert: 3
}, "without actionable Focus, the first unplayed room should lead the general recommendation");
assert.deepEqual(practiceRoomRecommendationsData([
  { index: 4, entry: { clean: 1, styleWins: 1, expertWins: 1 }, best: 9.6, target: 10, grade: "S", focusScore: 0, loss: -0.4 },
  { index: 5, entry: { clean: 1, styleWins: 1, expertWins: 1 }, best: 9.9, target: 10, grade: "S", focusScore: 0, loss: -0.1 }
]), {
  recommended: 5,
  clean: 5,
  pace: 5,
  style: 5,
  expert: 4
}, "a fully mastered set should fall back deterministically to the closest PB while Expert keeps the first S room");
assert.deepEqual(practiceRoomRecommendationsData([
  { index: 1, entry: {}, best: 0, target: 10, grade: "", focusScore: 0, loss: null },
  { index: 1, entry: { clean: 1 }, best: 8, target: 10, grade: "S", focusScore: 99, loss: -2 },
  { index: -1 },
  null
]), { recommended: 1, clean: 1, pace: 1, style: 1, expert: 1 }, "invalid and duplicate room rows must fail closed without changing authored order");
assert.deepEqual(practiceRoomRecommendationsData([]), {
  recommended: -1,
  clean: -1,
  pace: -1,
  style: -1,
  expert: -1
});
assert.deepEqual(practicePlanTargetsData({
  first: { index: 0, mode: "pace", score: 40, level: "成形" },
  entry: { clean: 0 },
  best: 0,
  grade: "",
  recommendations: { style: 2, expert: 3 },
  ledgerRows: [
    { index: 2, mode: "style", score: 58, level: "成形" },
    { index: 4, mode: "clean", score: 20, level: "可通" }
  ]
}), {
  first: { index: 0, mode: "pace", score: 40, level: "成形" },
  second: { index: 2, mode: "style" },
  third: { index: 4, mode: "clean", score: 20, level: "可通" }
}, "the third plan step must skip a ledger row that exactly repeats the second target");
assert.deepEqual(practicePlanTargetsData({
  first: { index: 3, mode: "expert", score: 90, level: "掌握" },
  entry: { clean: 1 },
  best: 9,
  grade: "S",
  recommendations: { style: 3, expert: 3 },
  ledgerRows: [{ index: 3, mode: "expert", score: 90, level: "掌握" }]
}), {
  first: { index: 3, mode: "expert", score: 90, level: "掌握" },
  second: { index: 3, mode: "style" },
  third: { index: 3, mode: "clean", score: 90, level: "掌握" }
}, "a one-room fallback should still offer three distinct Drill modes");
assert.deepEqual(practicePlanTargetsData({ first: { index: -1, mode: "clean" } }), {
  first: null,
  second: null,
  third: null
});

const challenge = { id: "nodeath", kind: "nodeath", label: "零失误登顶", goal: "完整通关且失误数为 0" };
assert.deepEqual(createActiveChallengeData(challenge, 45.9), {
  ...challenge,
  startBestFlow: 45
});
assert.equal(createActiveChallengeData(null, 0), null);
const failedChallenge = activeChallengeStateData(
  createActiveChallengeData(challenge, 0),
  challenge,
  {
    won: false,
    roomIndex: 4,
    roomTotal: 10,
    deathCount: 2,
    flowPeak: 0,
    flowTarget: 180,
    bestFlow: 0
  }
);
assert.equal(failedChallenge.status, "已破");
assert.equal(failedChallenge.progress, 40);
assert.equal(failedChallenge.failed, true);
assert.deepEqual(activeChallengeReviewData(failedChallenge), {
  value: "已破 · 零失误登顶",
  detail: "已有失误 2，继续完成可保留复盘；下一轮从 R1 重开"
});
const flowChallenge = { id: "flow", kind: "flow", label: "整局 Flow", goal: "完整路线 Flow 达到 180" };
const flowState = activeChallengeStateData(
  createActiveChallengeData(flowChallenge, 170),
  flowChallenge,
  {
    won: false,
    roomIndex: 2,
    roomTotal: 10,
    deathCount: 0,
    flowPeak: 180.9,
    flowTarget: 180,
    bestFlow: 180.9
  }
);
assert.equal(flowState.done, true);
assert.equal(flowState.progress, 100);
assert.equal(flowState.status, "达成");
assert.equal(activeChallengeStateData({ id: "__proto__" }, challenge, {}), null);

const progressMetrics = {
  roomTotal: 10,
  summitClears: 2,
  bestTime: 100,
  cleanRooms: 8,
  sRooms: 10,
  styleRooms: 4,
  expertRooms: 0,
  bestDeathCount: 0,
  bestFlow: 220.5,
  flowTarget: 180
};
assert.deepEqual(challengeProgressData({
  id: "run",
  kind: "run",
  goal: "完成一次完整路线"
}, progressMetrics), {
  current: 1,
  target: 1,
  progress: 100,
  done: true,
  detail: "已登顶 2 次"
});
assert.equal(challengeProgressData({ kind: "clean", goal: "" }, progressMetrics).progress, 80);
assert.equal(challengeProgressData({ kind: "pace", goal: "" }, progressMetrics).done, true);
assert.equal(challengeProgressData({ kind: "style", goal: "" }, progressMetrics).progress, 40);
assert.equal(challengeProgressData({ kind: "expert", goal: "" }, progressMetrics).progress, 0);
assert.equal(challengeProgressData({ kind: "nodeath", goal: "" }, progressMetrics).done, true);
assert.deepEqual(challengeProgressData({ kind: "flow", goal: "" }, progressMetrics), {
  current: 180,
  target: 180,
  progress: 100,
  done: true,
  detail: "整局 Flow 220/180"
});
const reconciled = reconcileChallengeWinsData(
  { clear: true, unknown: true },
  [{ id: "pace", done: true }, { id: "__proto__", done: true }, { id: "style", done: false }],
  ["clear", "pace", "style"]
);
assert.deepEqual(reconciled, {
  challengeWins: { clear: true, pace: true },
  changed: true
});
assert.deepEqual(reconcileChallengeWinsData(
  reconciled.challengeWins,
  [{ id: "pace", done: true }],
  ["clear", "pace", "style"]
), {
  challengeWins: { clear: true, pace: true },
  changed: false
});

const interruptedRoute = createRouteInterruptionResultData(
  { id: "stable", step: 1, generation: 4 },
  contracts,
  "切换航线",
  (step) => `R${step.index + 1} ${step.mode}`
);
assert.deepEqual(interruptedRoute, {
  id: "stable",
  label: "稳定航线",
  done: false,
  step: 1,
  detail: "切换航线：停在 2/3 R5 clean"
});
assert.equal(createRouteInterruptionResultData(
  { id: "__proto__", step: 0 },
  contracts,
  "中断",
  () => ""
), null);
assert.deepEqual(createRouteCompletionResultData(contract), {
  id: "stable",
  label: "稳定航线",
  done: true,
  detail: ""
});
assert.equal(createRouteCompletionResultData(null), null);
assert.equal(routeContractSummaryTextData({
  active: activeRouteContractDataFor(route, contracts),
  stepLabel: (step) => `R${step.index + 1} ${step.mode}`
}), "航线 稳定航线 1/3：R2 clean");
assert.equal(routeContractSummaryTextData({
  lastResult: interruptedRoute
}), "航线 稳定航线 可继续");
assert.equal(routeContractSummaryTextData({
  lastResult: createRouteCompletionResultData(contract)
}), "航线 稳定航线 已完成");
assert.equal(routeContractSummaryTextData({
  nextContract: contract,
  nextProgress: 33.6
}), "航线建议 稳定航线 34%");

const fixtures = [{
  id: "jump-buffer",
  room: 1,
  expected: ["jump"],
  note: "提前按跳必须接住落地"
}];
const activeFeel = { id: "jump-buffer", room: 0, mode: "clean" };
assert.deepEqual(createFeelInterruptionResultData(activeFeel, fixtures, "改练中断"), {
  id: "jump-buffer",
  done: false,
  detail: "改练中断：提前按跳必须接住落地"
});
assert.equal(createFeelInterruptionResultData({ id: "__proto__" }, fixtures, "中断"), null);
const completedFeel = createFeelCompletionResultData(activeFeel, fixtures, {
  room: 0,
  mode: "clean",
  clean: true,
  elapsed: 1.25,
  formatTime: (value) => `${value.toFixed(2)}s`
});
assert.deepEqual(completedFeel, {
  id: "jump-buffer",
  done: true,
  detail: "提前按跳必须接住落地 / 1.25s / 无失误"
});
assert.equal(createFeelCompletionResultData(activeFeel, fixtures, {
  room: 1,
  mode: "clean",
  clean: true,
  elapsed: 1,
  formatTime: String
}), null);
assert.deepEqual(feelFixturePresentationData(fixtures[0], activeFeel, null, "未开练"), {
  status: "进行中",
  detail: "当前校准：提前按跳必须接住落地",
  className: "active"
});
assert.deepEqual(feelFixturePresentationData(fixtures[0], null, completedFeel, "未开练"), {
  status: "刚完成",
  detail: completedFeel.detail,
  className: "recent"
});
assert.deepEqual(feelFixturePresentationData(fixtures[0], null, null, "未开练"), {
  status: "未开练",
  detail: "提前按跳必须接住落地",
  className: ""
});

console.log("Training module check passed: state, Focus/challenges, five-mode room recommendations and exact Route/Feel result assembly.");
