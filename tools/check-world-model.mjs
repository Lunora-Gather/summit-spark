#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import {
  cameraFollowData,
  driftShardPositionData,
  phaseBlockActiveData,
  roomWorldData
} from "../public/modules/game/world-model.mjs";

const longRows = Array.from({ length: 17 }, () => ".".repeat(45));
assert.deepEqual(roomWorldData(longRows), { columns: 45, width: 1440 }, "long rooms should expose their full world width");
assert.equal(roomWorldData([".".repeat(30), ".".repeat(29)]), null, "ragged room rows should fail closed");
assert.equal(roomWorldData([".".repeat(29)]), null, "sub-screen rooms should fail closed");

const resting = cameraFollowData({ cameraX: 0, targetX: 0, playerCenter: 420, worldWidth: 1440, viewportWidth: 960, dt: 1 / 60 });
assert.equal(resting.targetX, 0, "camera should remain still inside the horizontal safe zone");
const following = cameraFollowData({ cameraX: 0, targetX: 0, playerCenter: 800, worldWidth: 1440, viewportWidth: 960, dt: 1 / 60 });
assert.ok(following.targetX > 0 && following.cameraX > 0, "camera should follow after the player crosses the right guide");
const rightEdge = cameraFollowData({ cameraX: 999, targetX: 999, playerCenter: 2000, worldWidth: 1440, viewportWidth: 960, dt: 1 });
assert.equal(rightEdge.maxCamera, 480, "camera range should equal world width minus viewport width");
assert.equal(rightEdge.targetX, 480, "camera target should clamp to the room edge");
assert.ok(rightEdge.cameraX <= 480, "camera position should never expose space beyond the room");

assert.equal(phaseBlockActiveData({ elapsed: 0.4 }).active, true, "phase ledges should begin active");
assert.equal(phaseBlockActiveData({ elapsed: 1.8 }).active, false, "phase ledges should become pass-through during their off beat");
assert.equal(phaseBlockActiveData({ elapsed: 2.5, wasActive: false, overlapping: true }).active, false, "phase ledges must not rematerialize inside the player");
assert.equal(phaseBlockActiveData({ elapsed: 2.5, wasActive: false, overlapping: false }).active, true, "phase ledges should rematerialize once clear");

assert.deepEqual(
  driftShardPositionData({ baseX: 100, baseY: 80, axis: "x", elapsed: 0, phase: Math.PI / 2, amplitude: 44 }),
  { x: 144, y: 80, travel: 44 },
  "horizontal drift shards should stay on their telegraphed rail"
);
assert.deepEqual(
  driftShardPositionData({ baseX: 100, baseY: 80, axis: "y", elapsed: 0, phase: -Math.PI / 2, amplitude: 44 }),
  { x: 100, y: 36, travel: -44 },
  "vertical drift shards should remain deterministic"
);

console.log("World model check passed: variable room widths, bounded camera guides, fail-safe phase timing and deterministic drift rails.");
