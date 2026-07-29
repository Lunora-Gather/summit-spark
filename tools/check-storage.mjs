#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import {
  createProfileData,
  createRoomFocusEntryData,
  finiteNonNegativeInt,
  finiteNonNegativeNumber,
  normalizeProfileData,
  normalizeRoomBestsData,
  normalizeRoomFocusData,
  normalizeRoomPathPointData,
  normalizeRoomPathsData,
  parseSaveArchiveText,
  strictBoolean,
  writeStorageTransaction
} from "../public/modules/systems/storage.mjs";

assert.equal(finiteNonNegativeNumber("4.25", 9, 10), 4.25);
assert.equal(finiteNonNegativeNumber(-4, 9, 10), 0);
assert.equal(finiteNonNegativeNumber(Infinity, 9, 10), 9);
assert.equal(finiteNonNegativeNumber(40, 9, 10), 10);
assert.equal(finiteNonNegativeInt(4.99), 4);
assert.equal(strictBoolean("true", false), true);
assert.equal(strictBoolean("false", true), false);
assert.equal(strictBoolean(1, false), false, "truthy non-booleans must not bypass storage guards");

assert.deepEqual(createProfileData(2), {
  version: 2,
  summitClears: 0,
  bestDeathCount: null,
  bestRelayChain: 0,
  bestFlowPeak: 0,
  lastClearTime: 0,
  lastClearAt: "",
  challengeWins: {}
});
const profile = normalizeProfileData({
  summitClears: "12000",
  bestDeathCount: "7.9",
  bestRelayChain: -1,
  bestFlowPeak: 1200,
  lastClearTime: 50000,
  lastClearAt: 123,
  challengeWins: { clear: "true", unknown: true }
}, { schemaVersion: 2, challengeIds: ["clear", "clean"] });
assert.deepEqual(profile, {
  version: 2,
  summitClears: 9999,
  bestDeathCount: 7,
  bestRelayChain: 0,
  bestFlowPeak: 999,
  lastClearTime: 36000,
  lastClearAt: "",
  challengeWins: { clear: true }
});
assert.equal(normalizeProfileData({ summitClears: 0, bestDeathCount: 4 }, {
  schemaVersion: 2,
  challengeIds: []
}).bestDeathCount, null);

assert.deepEqual(normalizeRoomBestsData([4.5, -1, "bad", 5000], 5), [4.5, 0, 0, 3600, 0]);
const pointOptions = { tile: 32, width: 960, height: 544 };
assert.deepEqual(normalizeRoomPathPointData({
  x: 1200.04,
  y: -90,
  dash: "true",
  spark: 1,
  over: false,
  t: 1.23456
}, pointOptions), {
  x: 992,
  y: -32,
  dash: true,
  spark: false,
  over: false,
  t: 1.235
});
assert.equal(normalizeRoomPathPointData({ x: "bad", y: 1 }, pointOptions), null);
const paths = normalizeRoomPathsData([
  [{ x: 1, y: 2 }, null, { x: 3, y: 4 }],
  "bad"
], { roomCount: 3, maxPoints: 2, ...pointOptions });
assert.equal(paths.length, 3);
assert.equal(paths[0].length, 1, "invalid points are removed after the bounded slice");
assert.deepEqual(paths[1], []);
assert.deepEqual(paths[2], []);

const deathKeys = ["spike", "fall"];
const deathLabels = { spike: "尖刺", fall: "坠落" };
const focusEntry = createRoomFocusEntryData(2, deathKeys);
assert.equal(focusEntry.schemaVersion, 2);
assert.equal(focusEntry.expertWins, 0);
assert.equal(focusEntry.spike, 0);
const focus = normalizeRoomFocusData({
  schemaVersion: 1,
  rooms: [{
    faults: -4,
    clears: 12000,
    expertWins: "3.8",
    spike: Infinity,
    fall: 7,
    last: "fall"
  }]
}, {
  roomCount: 2,
  schemaVersion: 2,
  deathReasonKeys: deathKeys,
  deathReasonLabels: deathLabels
});
assert.equal(focus.length, 2);
assert.equal(focus[0].schemaVersion, 2);
assert.equal(focus[0].faults, 0);
assert.equal(focus[0].clears, 9999);
assert.equal(focus[0].expertWins, 3);
assert.equal(focus[0].spike, 0);
assert.equal(focus[0].fall, 7);
assert.equal(focus[0].last, "fall");
assert.equal(focus[1].last, "none");

assert.throws(
  () => parseSaveArchiveText("{", { maxChars: 100, kind: "summit-spark-save" }),
  /不是有效 JSON/
);
assert.throws(
  () => parseSaveArchiveText(JSON.stringify({ kind: "other", storage: {} }), {
    maxChars: 100,
    kind: "summit-spark-save"
  }),
  /不是 summit-spark-save 存档/
);
assert.throws(
  () => parseSaveArchiveText(JSON.stringify({ kind: "summit-spark-save", storage: [] }), {
    maxChars: 100,
    kind: "summit-spark-save"
  }),
  /不是 summit-spark-save 存档/,
  "array-shaped storage must not be accepted as an archive object"
);
assert.throws(
  () => parseSaveArchiveText("x".repeat(101), { maxChars: 100, kind: "summit-spark-save" }),
  /导入内容过大/
);
const parsed = parseSaveArchiveText(JSON.stringify({
  kind: "summit-spark-save",
  build: "x".repeat(80),
  storage: { settings: {} }
}), { maxChars: 1000, kind: "summit-spark-save" });
assert.equal(parsed.sourceBuild.length, 40);
assert.deepEqual(parsed.storage, { settings: {} });

class MemoryStorage {
  constructor(values = {}, failKey = "") {
    this.values = new Map(Object.entries(values));
    this.failKey = failKey;
    this.failed = false;
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    if (key === this.failKey && !this.failed) {
      this.failed = true;
      throw new Error("quota");
    }
    this.values.set(key, value);
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const successfulStorage = new MemoryStorage({ a: "old" });
writeStorageTransaction(successfulStorage, [["a", "new"], ["b", "added"]]);
assert.equal(successfulStorage.getItem("a"), "new");
assert.equal(successfulStorage.getItem("b"), "added");

const failingStorage = new MemoryStorage({ a: "old", c: "keep" }, "b");
assert.throws(
  () => writeStorageTransaction(failingStorage, [["a", "new"], ["b", "added"], ["c", "changed"]]),
  /quota/
);
assert.equal(failingStorage.getItem("a"), "old");
assert.equal(failingStorage.getItem("b"), null);
assert.equal(failingStorage.getItem("c"), "keep");

console.log("Storage module check passed: bounds, legacy focus, archive guards and exact rollback.");
