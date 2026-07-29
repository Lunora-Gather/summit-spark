#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import {
  CHAPTER_EXPERIENCE,
  EXPERT_REQUIREMENTS,
  EXPERT_REQUIREMENT_LABELS,
  maps,
  ROOM_ATMOSPHERES,
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
  SKILL_LABELS
} from "../public/modules/game/room-data.mjs";

const roomCollections = [
  ROOM_TARGETS,
  ROOM_NAMES,
  ROOM_TIERS,
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
assert.equal(CHAPTER_EXPERIENCE.length, 4, "chapter copy should cover four acts");
assert.ok(Object.isFrozen(CHAPTER_EXPERIENCE[0]), "nested chapter records should be read-only");
assert.ok(Object.isFrozen(ROOM_STYLE_TRIALS[0].tech), "nested trial requirements should be read-only");
assert.ok(Object.isFrozen(SKILL_LABELS), "skill labels should be read-only");
assert.ok(Object.isFrozen(EXPERT_REQUIREMENT_LABELS), "expert labels should be read-only");
assert.equal(new Set(ROOM_LANDMARKS.map((landmark) => landmark.kind)).size, maps.length, "every room should have a distinct landmark kind");
ROOM_LANDMARKS.forEach((landmark, index) => {
  assert.equal(typeof landmark.kind, "string", `room ${index + 1} landmark should have a kind`);
  assert.ok(landmark.x > 0 && landmark.x < 1, `room ${index + 1} landmark x should be normalized`);
  assert.ok(landmark.y > 0 && landmark.y < 1, `room ${index + 1} landmark y should be normalized`);
  assert.ok(landmark.scale > 0.5 && landmark.scale < 1.5, `room ${index + 1} landmark scale should stay restrained`);
});
assertDeepFrozen(CHAPTER_EXPERIENCE, "chapter experience");
assertDeepFrozen(SKILL_LABELS, "skill labels");
assertDeepFrozen(EXPERT_REQUIREMENT_LABELS, "expert labels");
assert.equal(ROOM_NAMES[0], "起势山门");
assert.equal(ROOM_NAMES.at(-1), "星顶终线");
assert.ok(maps.at(-1).some((row) => row.includes("H")), "the summit goal should remain in the final room");
assert.throws(() => {
  maps[0][0] = "";
}, TypeError, "room maps should reject mutation at runtime");

console.log("Room data module check passed: 10 immutable rooms, 4 chapters and aligned contracts.");
