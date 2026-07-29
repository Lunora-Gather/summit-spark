#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  REPLAY_ACTION_LABELS,
  replayActionMarkersData,
  replayGhostStateData
} from "../public/modules/training/replay.mjs";

const path = [
  { x: 0, y: 0, t: 0 },
  { x: 1, y: 1, t: 0.1, dash: true },
  { x: 2, y: 2, t: 0.2, dash: true },
  { x: 3, y: 3, t: 0.3 },
  { x: 4, y: 4, t: 0.4, dash: true, spark: true },
  { x: 5, y: 5, t: 0.5 },
  { x: 6, y: 6, t: 0.6, over: true },
  { x: 7, y: 7, t: 0.7, over: true },
  { x: 8, y: 8, t: 0.8, over: true, dash: true },
  { x: 9, y: 9, t: 0.9, over: true },
  { x: 10, y: 10, t: 1, over: true, spark: true }
];

assert.deepEqual(
  replayActionMarkersData(path).map(({ kind, index }) => ({ kind, index })),
  [
    { kind: "dash", index: 1 },
    { kind: "spark", index: 4 },
    { kind: "over", index: 6 },
    { kind: "overDash", index: 8 },
    { kind: "prismSpark", index: 10 }
  ]
);
assert.equal(replayActionMarkersData(path, { maxMarkers: 2 }).length, 2);
assert.deepEqual(replayActionMarkersData(path, { maxMarkers: 0 }), []);
assert.deepEqual(replayActionMarkersData(path, { minPointGap: 5 }).map((marker) => marker.index), [1, 6]);
assert.deepEqual(replayActionMarkersData(null), []);
assert.deepEqual(replayActionMarkersData([{ x: "bad", y: 1, dash: true }]), []);
assert.deepEqual(replayActionMarkersData([{ x: 1, y: 2, dash: "true" }]), []);
const inheritedAction = Object.create({ x: 1, y: 2, dash: true });
assert.deepEqual(replayActionMarkersData([inheritedAction]), []);
assert.deepEqual(replayGhostStateData(inheritedAction), { kind: "pace", label: "PB" });

assert.deepEqual(replayGhostStateData({ dash: true }), { kind: "dash", label: "冲刺" });
assert.deepEqual(replayGhostStateData({ dash: true, over: true }), { kind: "overDash", label: "过载冲刺" });
assert.deepEqual(replayGhostStateData({ spark: true, over: true }), { kind: "prismSpark", label: "过载 Spark" });
assert.deepEqual(replayGhostStateData({ over: true }), { kind: "over", label: "过载" });
assert.deepEqual(replayGhostStateData({}), { kind: "pace", label: "PB" });
assert.equal(REPLAY_ACTION_LABELS.__proto__, Object.prototype);
assert.ok(Object.isFrozen(REPLAY_ACTION_LABELS));

console.log("Training replay checks passed: bounded action transitions and ghost semantics.");
