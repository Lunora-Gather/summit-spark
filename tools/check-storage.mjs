#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import {
  clampGamepadDeadzoneData,
  clampTouchSizeData,
  createProfileData,
  createRoomFocusEntryData,
  createSaveArchiveData,
  createSaveBackupData,
  finiteNonNegativeInt,
  finiteNonNegativeNumber,
  hasMeaningfulSaveData,
  normalizeProfileData,
  normalizeRoomBestsData,
  normalizeRoomFocusData,
  normalizeRoomPathPointData,
  normalizeRoomPathsData,
  normalizedSaveArchiveSyncKeyData,
  normalizeSettingsData,
  parseSaveArchiveText,
  parseSaveBackupValue,
  readStoredJson,
  saveArchiveSyncKeyData,
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
assert.equal(clampGamepadDeadzoneData(0.01, { min: 0.12, max: 0.45, fallback: 0.28 }), 0.12);
assert.equal(clampTouchSizeData(900, { min: 44, max: 64, fallback: 48 }), 64);

const defaultSettings = {
  schemaVersion: 4,
  shake: 0.65,
  calmEffects: true,
  lowPerformance: false,
  controlsPreset: "comfort",
  keyboardLayout: "pc",
  customBindings: { jump: "Space", dash: "ShiftLeft" },
  grabMode: "hold",
  gamepadDeadzone: 0.28,
  touchSize: 48,
  practiceLines: true,
  ghostOpacity: 0.75,
  assistMode: "off",
  audioEnabled: true,
  audioVolume: 0.35
};
const settings = normalizeSettingsData({
  shake: 9,
  calmEffects: "false",
  lowPerformance: 1,
  controlsPreset: "__proto__",
  keyboardLayout: "mac",
  customBindings: { jump: "KeyJ", dash: "not-valid" },
  grabMode: "toggle",
  gamepadDeadzone: 0.01,
  touchSize: 900,
  practiceLines: false,
  ghostOpacity: 0,
  assistMode: "gentle",
  audioEnabled: "true",
  audioVolume: -1
}, defaultSettings, {
  schemaVersion: 4,
  bindingActions: ["jump", "dash"],
  defaultBindingsForLayout: (layout) => layout === "mac"
    ? { jump: "Space", dash: "MetaLeft" }
    : { jump: "Space", dash: "ShiftLeft" },
  validBindingCode: (code) => code === "KeyJ" || code === "Space" || code === "MetaLeft",
  controlPresets: { comfort: {} },
  gamepadDeadzone: { min: 0.12, max: 0.45, fallback: 0.28 },
  touchSize: { min: 44, max: 64, fallback: 48 }
});
assert.deepEqual(settings, {
  schemaVersion: 4,
  shake: 1,
  calmEffects: false,
  lowPerformance: false,
  controlsPreset: "comfort",
  keyboardLayout: "mac",
  customBindings: { jump: "KeyJ", dash: "MetaLeft" },
  grabMode: "toggle",
  gamepadDeadzone: 0.12,
  touchSize: 64,
  practiceLines: false,
  ghostOpacity: 0.2,
  assistMode: "gentle",
  audioEnabled: true,
  audioVolume: 0
});

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
    clean: 12000,
    drills: 2,
    drillClears: 7,
    drillClean: 9,
    cleanDrills: 0,
    cleanWins: 4,
    paceDrills: 1,
    paceWins: 8,
    styleDrills: 4,
    styleWins: 4,
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
assert.equal(focus[0].clean, 9999);
assert.equal(focus[0].drillClears, 2);
assert.equal(focus[0].drillClean, 2);
assert.equal(focus[0].cleanWins, 0);
assert.equal(focus[0].paceDrills, 1);
assert.equal(focus[0].paceWins, 1);
assert.equal(focus[0].styleDrills, 1);
assert.equal(focus[0].styleWins, 1);
assert.equal(focus[0].expertWins, 0);
assert.equal(focus[0].spike, 0);
assert.equal(focus[0].fall, 0);
assert.equal(focus[0].last, "none");
assert.equal(focus[1].last, "none");

const repairedFocus = normalizeRoomFocusData({
  rooms: [{
    faults: 3,
    fall: 8,
    last: "fall",
    clears: 1,
    clean: 5,
    drills: 2,
    drillClears: 8,
    drillClean: 6,
    cleanDrills: 0,
    cleanWins: 4,
    paceDrills: 1,
    paceWins: 7
  }]
}, {
  roomCount: 1,
  schemaVersion: 2,
  deathReasonKeys: deathKeys,
  deathReasonLabels: deathLabels
})[0];
assert.deepEqual({
  faults: repairedFocus.faults,
  fall: repairedFocus.fall,
  last: repairedFocus.last,
  clears: repairedFocus.clears,
  clean: repairedFocus.clean,
  drills: repairedFocus.drills,
  drillClears: repairedFocus.drillClears,
  drillClean: repairedFocus.drillClean,
  cleanDrills: repairedFocus.cleanDrills,
  cleanWins: repairedFocus.cleanWins,
  paceDrills: repairedFocus.paceDrills,
  paceWins: repairedFocus.paceWins
}, {
  faults: 3,
  fall: 3,
  last: "fall",
  clears: 1,
  clean: 1,
  drills: 2,
  drillClears: 2,
  drillClean: 2,
  cleanDrills: 0,
  cleanWins: 0,
  paceDrills: 1,
  paceWins: 1
}, "Focus normalization should fail closed when wins, clean clears or death reasons lack aggregate evidence");

const emptySaveData = {
  settings: defaultSettings,
  baselineSettings: defaultSettings,
  profile: createProfileData(2),
  roomBests: [0, 0],
  roomPaths: [[], []],
  roomFocus: [
    createRoomFocusEntryData(2, deathKeys),
    createRoomFocusEntryData(2, deathKeys)
  ],
  bestTime: 0,
  bestFlow: 0
};
assert.equal(hasMeaningfulSaveData(emptySaveData), false, "a normalized default archive should not block the first cloud download");
for (const [label, patch] of [
  ["custom setting", { settings: { ...defaultSettings, touchSize: 64 } }],
  ["summit profile", { profile: { ...createProfileData(2), summitClears: 1 } }],
  ["challenge win", { profile: { ...createProfileData(2), challengeWins: { clear: true } } }],
  ["room PB", { roomBests: [0, 9.5] }],
  ["room path", { roomPaths: [[], [{ x: 20, y: 30 }]] }],
  ["failed Drill", { roomFocus: [{ ...createRoomFocusEntryData(2, deathKeys), paceDrills: 1 }] }],
  ["death reason", { roomFocus: [{ ...createRoomFocusEntryData(2, deathKeys), fall: 1, last: "fall" }] }],
  ["summit time", { bestTime: 88 }],
  ["Flow best", { bestFlow: 42 }]
]) {
  assert.equal(hasMeaningfulSaveData({ ...emptySaveData, ...patch }), true, `${label} should require an explicit cloud-conflict choice`);
}
assert.equal(hasMeaningfulSaveData({
  baselineSettings: defaultSettings,
  profile: { challengeWins: { clear: false } },
  roomBests: "bad",
  roomPaths: {},
  roomFocus: null,
  bestTime: Number.NaN,
  bestFlow: -1
}), false, "malformed or false progress fields must fail closed");

const syncArchiveA = {
  kind: "summit-spark-save",
  schemaVersion: 1,
  build: "p1",
  exportedAt: "earlier",
  storage: {
    settings: { audioEnabled: true, touchSize: 48 },
    roomBests: [8.8, 0],
    roomPaths: [[], [{ x: 1, y: 2 }]]
  }
};
const syncArchiveReordered = {
  exportedAt: "later",
  build: "p999",
  storage: {
    roomPaths: [[], [{ y: 2, x: 1 }]],
    roomBests: [8.8, 0],
    settings: { touchSize: 48, audioEnabled: true }
  },
  schemaVersion: 1,
  kind: "summit-spark-save"
};
assert.equal(
  saveArchiveSyncKeyData(syncArchiveA),
  saveArchiveSyncKeyData(syncArchiveReordered),
  "sync comparison should ignore build/export time and object-key order"
);
assert.notEqual(
  saveArchiveSyncKeyData(syncArchiveA),
  saveArchiveSyncKeyData({
    ...syncArchiveA,
    storage: { ...syncArchiveA.storage, roomBests: [8.7, 0] }
  }),
  "different PB content must never be skipped as already synchronized"
);
assert.notEqual(
  saveArchiveSyncKeyData(syncArchiveA),
  saveArchiveSyncKeyData({
    ...syncArchiveA,
    storage: { ...syncArchiveA.storage, roomPaths: [[{ x: 1, y: 2 }], []] }
  }),
  "array order remains meaningful for room-indexed save data"
);
function legacyArchiveFingerprintForRegression(archive) {
  const text = JSON.stringify({
    kind: archive?.kind || "",
    schemaVersion: archive?.schemaVersion || 0,
    storage: archive?.storage || {}
  });
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
const legacyCollisionA = {
  kind: "summit-spark-save",
  schemaVersion: 1,
  storage: { marker: "1251qgz-be4" }
};
const legacyCollisionB = {
  kind: "summit-spark-save",
  schemaVersion: 1,
  storage: { marker: "1ccfy0c-1ayr" }
};
assert.equal(
  legacyArchiveFingerprintForRegression(legacyCollisionA),
  legacyArchiveFingerprintForRegression(legacyCollisionB),
  "the regression fixtures should demonstrate the retired 32-bit collision"
);
assert.notEqual(
  saveArchiveSyncKeyData(legacyCollisionA),
  saveArchiveSyncKeyData(legacyCollisionB),
  "different archives that collided under the retired fingerprint must never compare equal"
);
const normalizedSyncOptions = {
  kind: "summit-spark-save",
  schemaVersion: 1,
  roomFocusSchemaVersion: 2
};
const normalizedSyncData = {
  settings: defaultSettings,
  profile: createProfileData(2),
  roomBests: [8.8, 0],
  roomPaths: [[], [{ x: 1, y: 2 }]],
  roomFocus: [createRoomFocusEntryData(2, deathKeys)],
  bestTime: 88,
  bestFlow: 42
};
const deepUnknown = {};
let deepCursor = deepUnknown;
for (let depth = 0; depth < 2000; depth += 1) {
  deepCursor.next = {};
  deepCursor = deepCursor.next;
}
assert.equal(
  normalizedSaveArchiveSyncKeyData(normalizedSyncData, normalizedSyncOptions),
  normalizedSaveArchiveSyncKeyData({
    ...normalizedSyncData,
    sourceBuild: "ignored",
    unknown: deepUnknown,
    settings: { ...defaultSettings }
  }, normalizedSyncOptions),
  "unknown and deeply nested non-storage fields must not enter normalized cloud comparison"
);
assert.notEqual(
  normalizedSaveArchiveSyncKeyData(normalizedSyncData, normalizedSyncOptions),
  normalizedSaveArchiveSyncKeyData({
    ...normalizedSyncData,
    roomFocus: [{ ...createRoomFocusEntryData(2, deathKeys), paceDrills: 1 }]
  }, normalizedSyncOptions),
  "normalized Focus differences must remain sync-significant"
);
const cyclicArchive = { kind: "summit-spark-save", storage: {} };
cyclicArchive.storage.self = cyclicArchive.storage;
assert.throws(
  () => saveArchiveSyncKeyData(cyclicArchive),
  /acyclic/,
  "non-JSON cyclic values must fail closed"
);

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

const archive = createSaveArchiveData({
  kind: "summit-spark-save",
  schemaVersion: 1,
  build: "p186",
  exportedAt: "2026-07-29T00:00:00.000Z",
  settings: { touchSize: 48 },
  profile: { summitClears: 2 },
  roomBests: [4],
  roomPaths: [[]],
  roomFocusSchemaVersion: 2,
  roomFocus: [{ faults: 0 }],
  bestTime: 80,
  bestFlow: 120
});
assert.deepEqual(Object.keys(archive), ["kind", "schemaVersion", "build", "exportedAt", "storage"]);
assert.deepEqual(Object.keys(archive.storage), [
  "settings",
  "profile",
  "roomBests",
  "roomPaths",
  "roomFocus",
  "bestTime",
  "bestFlow"
]);
assert.deepEqual(archive.storage.roomFocus, {
  schemaVersion: 2,
  rooms: [{ faults: 0 }]
});
const backup = createSaveBackupData({
  sourceBuild: "incoming",
  archive,
  savedAt: "2026-07-29T00:00:01.000Z"
});
assert.equal(backup.kind, "summit-spark-save-backup");
assert.equal(backup.schemaVersion, 1);
assert.equal(backup.reason, "before-import");
assert.equal(backup.sourceBuild, "incoming");
assert.equal(backup.archive, archive);
assert.equal(parseSaveBackupValue(backup, (value) => {
  assert.equal(value.kind, "summit-spark-save");
}), backup);
assert.equal(parseSaveBackupValue({ ...backup, archive: { kind: "bad" } }, () => {
  throw new Error("invalid");
}), null);
assert.equal(parseSaveBackupValue({ ...backup, schemaVersion: 99 }, () => {}), null);
assert.equal(parseSaveBackupValue({ ...backup, reason: "other" }, () => {}), null);
assert.equal(parseSaveBackupValue([], () => {}), null);

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

const repairIssues = [];
const corruptedStorage = new MemoryStorage({ profile: "{" });
assert.deepEqual(readStoredJson(
  corruptedStorage,
  "profile",
  {},
  (value) => ({ version: 2, value: value.value || 0 }),
  (message) => repairIssues.push(message)
), { version: 2, value: 0 });
assert.deepEqual(repairIssues, ["本地存档已修复"]);
assert.equal(corruptedStorage.getItem("profile"), JSON.stringify({ version: 2, value: 0 }));

const normalizedStorage = new MemoryStorage({ settings: JSON.stringify({ touchSize: 20 }) });
assert.deepEqual(readStoredJson(
  normalizedStorage,
  "settings",
  {},
  () => ({ touchSize: 44 })
), { touchSize: 44 });
assert.equal(normalizedStorage.getItem("settings"), JSON.stringify({ touchSize: 44 }));

const writeIssues = [];
const unwritableStorage = new MemoryStorage({ profile: "{" }, "profile");
readStoredJson(
  unwritableStorage,
  "profile",
  {},
  () => ({ version: 2 }),
  (message) => writeIssues.push(message)
);
assert.deepEqual(writeIssues, ["本地存档已修复", "本地存档不可写"]);

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

console.log("Storage module check passed: settings, meaningful-progress conflict protection, normalized collision-free sync comparison, causal Focus repair, archive/backup, bounds, legacy focus and exact rollback.");
