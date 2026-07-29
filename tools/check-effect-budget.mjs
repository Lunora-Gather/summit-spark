#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  EFFECT_BUDGETS,
  effectQueueLimit,
  enforceEffectQueueBudget
} from "../public/modules/game/effect-budget.mjs";

assert.equal(effectQueueLimit("particles"), 240);
assert.equal(effectQueueLimit("particles", { calmEffects: true }), 170);
assert.equal(effectQueueLimit("particles", { reducedMotion: true, calmEffects: true }), 120);
assert.equal(effectQueueLimit("particles", {
  lowPerformance: true,
  reducedMotion: true,
  calmEffects: true
}), 96);
assert.equal(effectQueueLimit("ghosts", { lowPerformance: true }), 6);
assert.equal(effectQueueLimit("unknown"), 0);
assert.equal(effectQueueLimit("__proto__"), 0);

const queue = [1, 2, 3, 4, 5];
assert.equal(enforceEffectQueueBudget(queue, 3.9), 2);
assert.deepEqual(queue, [3, 4, 5]);
assert.equal(enforceEffectQueueBudget(queue, 3), 0);

const invalidLimitQueue = [1, 2];
assert.equal(enforceEffectQueueBudget(invalidLimitQueue, Number.NaN), 2);
assert.deepEqual(invalidLimitQueue, []);
assert.equal(enforceEffectQueueBudget(null, 2), 0);

const stressed = [];
for (let i = 0; i < 10_000; i += 1) {
  stressed.push(i);
  enforceEffectQueueBudget(stressed, EFFECT_BUDGETS.particles.normal);
}
assert.equal(stressed.length, EFFECT_BUDGETS.particles.normal);
assert.equal(stressed[0], 10_000 - EFFECT_BUDGETS.particles.normal);
assert.equal(stressed.at(-1), 9_999);

assert.ok(Object.isFrozen(EFFECT_BUDGETS));
for (const limits of Object.values(EFFECT_BUDGETS)) assert.ok(Object.isFrozen(limits));

console.log("Effect budget checks passed.");
