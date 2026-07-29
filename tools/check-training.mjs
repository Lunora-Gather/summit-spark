#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import {
  TRAINING_TRANSITIONS,
  activeRouteContractDataFor,
  advanceRouteContractData,
  createDrillData,
  createRouteContractStateData,
  drillSucceededData,
  drillContractProgressData,
  drillContractStatsData,
  feelFixtureMatchesDrillData,
  feelFixtureModeData,
  leadingRoomReasonData,
  recordDrillClearData,
  recordDrillStartData,
  recordRoomClearData,
  recordRoomFaultData,
  roomFocusScoreData,
  roomMasteryLevelData,
  roomMasteryScoreData,
  roomReviewModeData,
  routeContractMatchesDrillData,
  routeContractResumeStepData,
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

console.log("Training module check passed: transitions, Drill/Route/Feel state, Focus counters, mastery and review mode.");
