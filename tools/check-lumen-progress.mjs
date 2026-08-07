import assert from "node:assert/strict";
import { resetRoomLumenProgressData } from "../public/modules/game/lumen-progress.mjs";

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

console.log("lumen progress checks passed");
