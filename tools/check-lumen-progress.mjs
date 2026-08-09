import assert from "node:assert/strict";
import {
  resetRoomLumenProgressData,
  restoreRoomLumenCheckpointData,
  roomLumenCheckpointData
} from "../public/modules/game/lumen-progress.mjs";
import { maps } from "../public/modules/game/room-data.mjs";

const attempt = resetRoomLumenProgressData(new Set([
  "2:20:2",
  "3:6:12",
  "3:6:12",
  "4:21:14"
]), 3);
assert.deepEqual([...attempt.collected], ["2:20:2", "4:21:14"]);
assert.equal(attempt.removed, 1, "retry should discard only the current room's provisional Lumen");

const firstRoom = resetRoomLumenProgressData(["0:25:3", "1:17:2", null], -4);
assert.deepEqual([...firstRoom.collected], ["1:17:2"]);
assert.equal(firstRoom.removed, 1, "invalid room indexes should fail closed to the first room");

const empty = resetRoomLumenProgressData({ damaged: true }, 8);
assert.deepEqual([...empty.collected], []);
assert.equal(empty.removed, 0);

const rows = ["....", ".L..", "...."];
assert.deepEqual(
  roomLumenCheckpointData(new Set(["3:1:1", "3:9:9", "2:1:1", "bad"]), 3, rows),
  ["3:1:1"],
  "midpoint snapshots should keep only real Lumen coordinates from the active room"
);
const restored = restoreRoomLumenCheckpointData(new Set(["2:1:1"]), ["3:1:1", "3:1:1", "3:9:9"], 3, rows);
assert.deepEqual([...restored.collected], ["2:1:1", "3:1:1"]);
assert.deepEqual(restored.snapshot, ["3:1:1"]);
assert.equal(restored.restored, 1, "midpoint restore should remain bounded and duplicate-safe");

for (const [roomIndex, lumenId] of [[4, "4:36:10"], [6, "6:36:7"]]) {
  const beforeLatePickup = roomLumenCheckpointData(new Set(), roomIndex, maps[roomIndex]);
  const afterLatePickup = new Set([lumenId]);
  const respawned = resetRoomLumenProgressData(afterLatePickup, roomIndex);
  const restoredBeforePickup = restoreRoomLumenCheckpointData(
    respawned.collected,
    beforeLatePickup,
    roomIndex,
    maps[roomIndex]
  );
  assert.equal(restoredBeforePickup.collected.has(lumenId), false, `R${roomIndex + 1} late Lumen must not survive a pre-pickup camp snapshot`);

  const afterPickupSnapshot = roomLumenCheckpointData(afterLatePickup, roomIndex, maps[roomIndex]);
  const restoredAfterPickup = restoreRoomLumenCheckpointData(
    respawned.collected,
    afterPickupSnapshot,
    roomIndex,
    maps[roomIndex]
  );
  assert.equal(restoredAfterPickup.collected.has(lumenId), true, `R${roomIndex + 1} late Lumen should survive only after a validated camp snapshot`);
}

console.log("lumen progress checks passed: room resets, validated midpoint snapshots and late-screen reward rollback");
