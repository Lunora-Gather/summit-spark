#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import {
  CHAPTER_EXPERIENCE,
  CHAPTER_START_ROOMS,
  CHAPTER_SURFACE_FEEDBACK,
  CHAPTER_SURFACE_KINDS,
  EXPERT_REQUIREMENTS,
  EXPERT_REQUIREMENT_LABELS,
  MECHANIC_FIRST_TOUCH_CUES,
  maps,
  ROOM_ATMOSPHERES,
  ROOM_CHAPTER_INDEXES,
  ROOM_CHAPTER_LABELS,
  ROOM_GUIDES,
  ROOM_LANDMARKS,
  ROOM_NAMES,
  ROOM_PURPOSES,
  ROOM_ROUTE_LINES,
  ROOM_SKILLS,
  ROOM_STYLE_TRIALS,
  ROOM_TARGETS,
  ROOM_TIERS,
  ROOM_WHISPERS,
  SKILL_LABELS,
  mechanicFirstTouchCueData
} from "../public/modules/game/room-data.mjs";

const roomCollections = [
  ROOM_TARGETS,
  ROOM_NAMES,
  ROOM_TIERS,
  ROOM_CHAPTER_INDEXES,
  ROOM_CHAPTER_LABELS,
  ROOM_WHISPERS,
  ROOM_SKILLS,
  ROOM_GUIDES,
  ROOM_PURPOSES,
  ROOM_ROUTE_LINES,
  ROOM_STYLE_TRIALS,
  EXPERT_REQUIREMENTS,
  ROOM_ATMOSPHERES,
  ROOM_LANDMARKS
];

function assertDeepFrozen(value, label) {
  if (!value || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value), `${label} should be recursively read-only`);
  Object.values(value).forEach((child, index) => assertDeepFrozen(child, `${label}.${index}`));
}

assert.equal(maps.length, 10, "canonical room module should expose ten rooms");
roomCollections.forEach((collection) => {
  assert.equal(collection.length, maps.length, "every room collection should align with the map count");
  assertDeepFrozen(collection, "room collection");
});
maps.forEach((room) => {
  assert.equal(room.length, 17, "every room should have 17 rows");
  assert.ok(Object.isFrozen(room), "nested room rows should be read-only");
  room.forEach((row) => assert.equal(row.length, 30, "every room row should have 30 columns"));
});
maps.forEach((room, index) => {
  const entryAnchors = [];
  room.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      if (tile === "S" || tile === "P") entryAnchors.push({ x, y });
    });
  });
  assert.equal(entryAnchors.length, 1, `room ${index + 1} should own exactly one entry anchor`);
  assert.ok(entryAnchors[0].x <= 2, `room ${index + 1} entry should stay within the left three columns`);
  assert.equal(room[entryAnchors[0].y + 1]?.[entryAnchors[0].x], "#", `room ${index + 1} entry should have stable support`);
});
assert.equal(CHAPTER_EXPERIENCE.length, 4, "chapter copy should cover four acts");
assert.deepEqual(ROOM_CHAPTER_INDEXES, [0, 0, 0, 1, 1, 1, 2, 2, 3, 3], "each room should own one canonical chapter index");
assert.deepEqual(CHAPTER_START_ROOMS, [0, 3, 6, 8], "four acts should expose their canonical opening rooms");
assert.equal(CHAPTER_START_ROOMS.length, CHAPTER_EXPERIENCE.length, "every act should own one opening room");
CHAPTER_START_ROOMS.forEach((room, chapter) => {
  assert.equal(ROOM_CHAPTER_INDEXES[room], chapter, `chapter ${chapter + 1} should begin at its declared room`);
  assert.match(ROOM_CHAPTER_LABELS[room], new RegExp(`^${["I", "II", "III", "IV"][chapter]} · `), `chapter ${chapter + 1} opening label should stay aligned`);
});
assert.deepEqual(CHAPTER_SURFACE_KINDS, ["gate-slate", "old-peak", "wind-cut", "star-etched"], "four acts should own distinct platform materials");
assert.equal(new Set(CHAPTER_SURFACE_KINDS).size, CHAPTER_EXPERIENCE.length, "chapter platform materials should remain distinct");
assert.deepEqual(
  CHAPTER_SURFACE_FEEDBACK.map((feedback) => feedback.kind),
  ["slate-chip", "warm-dust", "ice-flake", "star-spark"],
  "four acts should carry distinct landing feedback silhouettes"
);
assert.equal(CHAPTER_SURFACE_FEEDBACK.length, CHAPTER_EXPERIENCE.length, "every act should own landing feedback");
assert.equal(new Set(CHAPTER_SURFACE_FEEDBACK.map((feedback) => feedback.primary)).size, CHAPTER_EXPERIENCE.length, "landing feedback primary colors should remain distinct");
CHAPTER_SURFACE_FEEDBACK.forEach((feedback, index) => {
  assert.match(feedback.primary, /^#[0-9a-f]{6}$/i, `chapter ${index + 1} landing primary should be a hex color`);
  assert.match(feedback.accent, /^#[0-9a-f]{6}$/i, `chapter ${index + 1} landing accent should be a hex color`);
});
CHAPTER_EXPERIENCE.forEach((chapter, index) => {
  for (const field of ["title", "vow", "focus", "resolve"]) {
    assert.equal(typeof chapter[field], "string", `chapter ${index + 1} should include ${field}`);
    assert.ok(chapter[field].length > 0, `chapter ${index + 1} ${field} should be non-empty`);
  }
});
assert.ok(Object.isFrozen(CHAPTER_EXPERIENCE[0]), "nested chapter records should be read-only");
assert.ok(Object.isFrozen(ROOM_STYLE_TRIALS[0].tech), "nested trial requirements should be read-only");
assert.ok(Object.isFrozen(SKILL_LABELS), "skill labels should be read-only");
assert.ok(Object.isFrozen(EXPERT_REQUIREMENT_LABELS), "expert labels should be read-only");
assert.deepEqual(Object.keys(MECHANIC_FIRST_TOUCH_CUES).sort(), ["crumble", "prism", "relay", "spring", "updraft"], "first-touch cues should cover the five introduced route mechanics");
for (const [key, cue] of Object.entries(MECHANIC_FIRST_TOUCH_CUES)) {
  assert.ok(Number.isInteger(cue.room) && cue.room >= 0 && cue.room < maps.length, `${key} cue should reference a valid teaching room`);
  assert.equal(typeof cue.title, "string", `${key} cue should have a title`);
  assert.equal(typeof cue.detail, "string", `${key} cue should have detail`);
  assert.ok(cue.title.length > 0 && cue.detail.length > 0, `${key} cue copy should be non-empty`);
}
assert.equal(new Set(ROOM_LANDMARKS.map((landmark) => landmark.kind)).size, maps.length, "every room should have a distinct landmark kind");
ROOM_LANDMARKS.forEach((landmark, index) => {
  assert.equal(typeof landmark.kind, "string", `room ${index + 1} landmark should have a kind`);
  assert.ok(landmark.x > 0 && landmark.x < 1, `room ${index + 1} landmark x should be normalized`);
  assert.ok(landmark.y > 0 && landmark.y < 1, `room ${index + 1} landmark y should be normalized`);
  assert.ok(landmark.scale > 0.5 && landmark.scale < 1.5, `room ${index + 1} landmark scale should stay restrained`);
});
assertDeepFrozen(CHAPTER_EXPERIENCE, "chapter experience");
assertDeepFrozen(CHAPTER_START_ROOMS, "chapter start rooms");
assertDeepFrozen(CHAPTER_SURFACE_KINDS, "chapter surface kinds");
assertDeepFrozen(CHAPTER_SURFACE_FEEDBACK, "chapter surface feedback");
assertDeepFrozen(SKILL_LABELS, "skill labels");
assertDeepFrozen(EXPERT_REQUIREMENT_LABELS, "expert labels");
assertDeepFrozen(MECHANIC_FIRST_TOUCH_CUES, "mechanic first-touch cues");
assert.equal(mechanicFirstTouchCueData("relay")?.title, "光继", "new players should receive the first relay cue");
assert.equal(mechanicFirstTouchCueData("spring")?.title, "弹簧", "new players should receive the first spring cue");
assert.equal(mechanicFirstTouchCueData("updraft")?.title, "风升", "new players should receive the first updraft cue");
assert.equal(mechanicFirstTouchCueData("crumble", { seen: { crumble: true } }), null, "a cue should appear at most once per session");
assert.equal(mechanicFirstTouchCueData("prism", { roomFocus: Array.from({ length: 8 }, (_, index) => index === 7 ? { clears: 1 } : null) }), null, "cleared teaching rooms should suppress first-touch cues");
assert.equal(mechanicFirstTouchCueData("prism", { bestRoomTimes: Array.from({ length: 8 }, (_, index) => index === 7 ? 18.4 : 0) }), null, "recorded teaching-room times should suppress first-touch cues");
assert.equal(mechanicFirstTouchCueData("unknown"), null, "unknown mechanic cues should fail closed");
assert.equal(mechanicFirstTouchCueData("__proto__"), null, "prototype-named mechanic cues should fail closed");
assert.equal(ROOM_NAMES[0], "起势山门");
assert.equal(ROOM_NAMES.at(-1), "星顶终线");
assert.equal(maps[2][5][2], "P", "Gate capstone Practice should begin from the full left-side route");
assert.equal(maps[2][6].slice(0, 6), "######", "Gate capstone entry should keep broad stable support");
assert.equal(maps[2][8][13], ".", "Gate capstone should not retain a mid-room Practice shortcut");
assert.equal((maps[5].join("").match(/A/g) || []).length, 4, "Old Peak capstone should retain four relay beats");
assert.equal((maps[5].join("").match(/T/g) || []).length, 2, "Old Peak capstone should retain its two-stage spring exit");
assert.match(ROOM_GUIDES[5], /四枚光继.*两级弹簧/, "Old Peak guide should name the authored relay and spring counts");
assert.match(ROOM_PURPOSES[5], /四枚光继.*两级弹簧/, "Old Peak purpose should match the authored mechanic counts");
assert.match(ROOM_ROUTE_LINES[5][2], /四枚光继.*两级弹簧/, "Old Peak expert line should match the authored mechanic counts");
assert.match(ROOM_STYLE_TRIALS[5].goal, /四枚光继.*两级弹簧/, "Old Peak style goal should match the authored mechanic counts");
assert.ok(ROOM_STYLE_TRIALS[2].tech.includes("springApex"), "Gate capstone Style should recognize the taught spring-apex dash");
assert.ok(ROOM_STYLE_TRIALS[5].tech.includes("springApex"), "Old Peak capstone Style should recover the spring-apex dash");
assert.ok(ROOM_STYLE_TRIALS[9].tech.includes("springApex"), "Summit finale Style should synthesize the spring-apex dash");
assert.equal(EXPERT_REQUIREMENT_LABELS.springApex, "弹簧顶点", "spring-apex mastery should have one canonical label");
assert.equal(maps[6][15][2], "P", "Wind Gorge should start from a grounded checkpoint");
assert.equal(maps[6][16].slice(0, 5), "#####", "Wind Gorge checkpoint should keep broad stable support");
assert.equal(maps[8][10].slice(9, 16), "#######", "Echo Rockfield should recover on stable ground after its first wind");
assert.equal(maps[8][10].slice(22, 26), "CCCC", "Echo Rockfield should renew crumble pressure after its recovery shelf");
assert.match(ROOM_GUIDES[8], /落稳中层/, "Echo Rockfield guide should explain its recovery beat");
assert.match(ROOM_ROUTE_LINES[8][0], /落稳中层/, "Echo Rockfield safe route should name its recovery beat");
assert.ok(maps.at(-1).some((row) => row.includes("H")), "the summit goal should remain in the final room");
assert.throws(() => {
  maps[0][0] = "";
}, TypeError, "room maps should reject mutation at runtime");

console.log("Room data module check passed: 10 immutable rooms, one grounded left entry per room, 4 chapters and aligned contracts.");
