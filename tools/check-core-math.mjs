#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  aabb,
  approach,
  distRectPoint,
  fixedStepFrameData
} from "../public/modules/core/math.mjs";

const box = { x: 10, y: 20, w: 30, h: 40 };

assert.equal(aabb(box, { x: 39, y: 59, w: 2, h: 2 }), true);
assert.equal(aabb(box, { x: 40, y: 20, w: 2, h: 2 }), false);
assert.equal(aabb(box, { x: -20, y: 20, w: 30, h: 40 }), false);

assert.equal(distRectPoint(box, 20, 30), 0);
assert.equal(distRectPoint(box, 40, 60), 0);
assert.equal(distRectPoint(box, 43, 64), 5);

assert.equal(approach(0, 10, 3), 3);
assert.equal(approach(9, 10, 3), 10);
assert.equal(approach(10, 0, 3), 7);
assert.equal(approach(1, 0, 3), 0);
assert.equal(approach(5, 5, 3), 5);

const sixtyHz = fixedStepFrameData({ elapsed: 1 / 60, accumulator: 0 });
assert.equal(sixtyHz.steps, 2, "60 Hz should advance two 120 Hz physics steps");
assert.ok(sixtyHz.remainder < 1e-8);

const highRefreshFirst = fixedStepFrameData({ elapsed: 1 / 240, accumulator: 0 });
assert.equal(highRefreshFirst.steps, 0, "240 Hz frames should retain a partial fixed step");
const highRefreshSecond = fixedStepFrameData({ elapsed: 1 / 240, accumulator: highRefreshFirst.remainder });
assert.equal(highRefreshSecond.steps, 1, "two 240 Hz frames should advance one 120 Hz step without losing time");

const stalled = fixedStepFrameData({ elapsed: 0.6, accumulator: 0 });
assert.equal(stalled.frameDt, 0.1, "physics catch-up must be bounded after a main-thread stall");
assert.equal(stalled.steps, 12, "bounded catch-up should consume the full 100 ms physics budget");
assert.equal(stalled.elapsed, 0.6, "wall-clock timing must retain the real elapsed duration");

const overloaded = fixedStepFrameData({ elapsed: 0.1, accumulator: 0.1, maxSteps: 4 });
assert.equal(overloaded.steps, 4);
assert.ok(overloaded.dropped > 0, "spiral-of-death protection should report discarded simulation backlog");

console.log("Core math check passed: overlap, distance, approach and fixed-step frame behavior preserved.");
