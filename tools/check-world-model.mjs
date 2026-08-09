#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import {
  cameraFollowData,
  driftShardPositionData,
  nearestSafePositionData,
  phaseBlockActiveData,
  roomEntrySpawnData,
  roomWorldData
} from "../public/modules/game/world-model.mjs";
import { maps } from "../public/modules/game/room-data.mjs";

const longRows = Array.from({ length: 17 }, () => ".".repeat(45));
assert.deepEqual(roomWorldData(longRows), { columns: 45, width: 1440 }, "long rooms should expose their full world width");
assert.equal(roomWorldData([".".repeat(30), ".".repeat(29)]), null, "ragged room rows should fail closed");
assert.equal(roomWorldData([".".repeat(29)]), null, "sub-screen rooms should fail closed");

const roomEntries = maps.map((rows) => roomEntrySpawnData(rows));
assert.equal(roomEntries.every(Boolean), true, "all rooms should expose one canonical S/P entry spawn");
assert.deepEqual(roomEntries[1], { x: 70.5, y: 263, tileX: 2, tileY: 8, marker: "P" }, "R2 should respawn above its authored left platform instead of inheriting R1 exit height");
roomEntries.forEach((spawn, index) => {
  assert.equal(maps[index][spawn.tileY + 1]?.[spawn.tileX], "#", `R${index + 1} entry should retain solid support`);
  assert.equal(spawn.y + 25, (spawn.tileY + 1) * 32, `R${index + 1} player feet should meet, not overlap, entry support`);
});
assert.equal(roomEntrySpawnData(["S.P", "###"]), null, "ambiguous entry maps should fail closed");

const playerBoxBlockedByR2Entry = (x, y) => x < 160 && x + 19 > 0 && y < 320 && y + 25 > 288;
assert.deepEqual(nearestSafePositionData({
  x: 26,
  y: 297,
  maxRadius: 64,
  isBlocked: playerBoxBlockedByR2Entry
}), { x: 26, y: 263, recovered: true, distance: 34 }, "a legacy R2 respawn embedded one tile deep should recover to the platform top");
assert.deepEqual(nearestSafePositionData({ x: 26, y: 263, isBlocked: playerBoxBlockedByR2Entry }), { x: 26, y: 263, recovered: false, distance: 0 }, "an already safe spawn should stay exact");
assert.equal(nearestSafePositionData({ x: 0, y: 0, maxRadius: 3, isBlocked: () => true }), null, "fully blocked searches should fail closed within their bound");

const resting = cameraFollowData({ cameraX: 0, targetX: 0, playerCenter: 420, worldWidth: 1440, viewportWidth: 960, dt: 1 / 60 });
assert.equal(resting.targetX, 0, "camera should remain still inside the horizontal safe zone");
const following = cameraFollowData({ cameraX: 0, targetX: 0, playerCenter: 800, worldWidth: 1440, viewportWidth: 960, dt: 1 / 60 });
assert.ok(following.targetX > 0 && following.cameraX > 0, "camera should follow after the player crosses the right guide");
const anticipated = cameraFollowData({ cameraX: 0, targetX: 0, playerCenter: 590, velocityX: 420, worldWidth: 1440, viewportWidth: 960, dt: 1 / 60 });
assert.equal(anticipated.lookAhead, 40, "camera look-ahead should stay capped during a fast dash");
assert.ok(anticipated.targetX > 0, "camera should reveal the route slightly before a fast player crosses the guide");
const reversing = cameraFollowData({ cameraX: 240, targetX: 240, playerCenter: 590, velocityX: -420, worldWidth: 1440, viewportWidth: 960, dt: 1 / 60 });
assert.equal(reversing.lookAhead, -40, "camera anticipation should follow a genuine direction reversal");
const rightEdge = cameraFollowData({ cameraX: 999, targetX: 999, playerCenter: 2000, worldWidth: 1440, viewportWidth: 960, dt: 1 });
assert.equal(rightEdge.maxCamera, 480, "camera range should equal world width minus viewport width");
assert.equal(rightEdge.targetX, 480, "camera target should clamp to the room edge");
assert.ok(rightEdge.cameraX <= 480, "camera position should never expose space beyond the room");

assert.equal(phaseBlockActiveData({ elapsed: 0.4 }).active, true, "phase ledges should begin active");
assert.equal(phaseBlockActiveData({ elapsed: 1.8 }).active, false, "phase ledges should become pass-through during their off beat");
assert.equal(phaseBlockActiveData({ elapsed: 2.5, wasActive: false, overlapping: true }).active, false, "phase ledges must not rematerialize inside the player");
assert.equal(phaseBlockActiveData({ elapsed: 2.5, wasActive: false, overlapping: false }).active, true, "phase ledges should rematerialize once clear");
assert.equal(phaseBlockActiveData({ elapsed: 1.2 }).warning, true, "phase ledges should telegraph before disappearing");
assert.equal(phaseBlockActiveData({ elapsed: 2.2 }).warning, true, "phase ledges should telegraph before rematerializing");

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

console.log("World model check passed: variable room widths, canonical safe entries, bounded solid recovery, predictive camera guides, phase timing and drift rails.");
