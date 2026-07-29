#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  aabb,
  approach,
  distRectPoint
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

console.log("Core math check passed: overlap, distance and bounded approach behavior preserved.");
