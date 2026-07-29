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
  feelFixtureMatchesDrillData,
  feelFixtureModeData,
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

console.log("Training module check passed: transitions, Drill outcomes, Route resume/advance and Feel matching.");
