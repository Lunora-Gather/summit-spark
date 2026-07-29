#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  chapterCompletionData,
  chapterGrade,
  rankPracticeLedgerRowsData,
  roomSplitFeedbackData,
  roomReviewPriorityData
} from "../public/modules/ui/presentation.mjs";

assert.deepEqual(chapterCompletionData({
  roomTotal: 10,
  clear: 10,
  clean: 5,
  pace: 4,
  style: 3,
  expert: 2,
  mastery: 64.4
}), {
  clear: 10,
  clean: 5,
  pace: 4,
  style: 3,
  expert: 2,
  mastery: 64,
  percent: 48
});
assert.deepEqual(chapterCompletionData(), {
  clear: 0,
  clean: 0,
  pace: 0,
  style: 0,
  expert: 0,
  mastery: 0,
  percent: 0
});
assert.equal(chapterCompletionData({
  roomTotal: 10,
  clear: 99,
  clean: 99,
  pace: 99,
  style: 99,
  expert: 99,
  mastery: 999
}).percent, 100, "completion must clamp to a display-safe percentage");

assert.equal(chapterGrade(0), "D");
assert.equal(chapterGrade(20), "C");
assert.equal(chapterGrade(42), "B");
assert.equal(chapterGrade(62), "A");
assert.equal(chapterGrade(78), "S");
assert.equal(chapterGrade(92), "SS");
assert.equal(chapterGrade(Number.NaN), "D");

assert.equal(roomSplitFeedbackData({ elapsed: 0 }), null);
assert.equal(roomSplitFeedbackData({ elapsed: Number.NaN }), null);
assert.deepEqual(roomSplitFeedbackData({
  elapsed: 10.5,
  previousBest: 0,
  target: 9
}), {
  elapsed: 10.5,
  previousBest: 0,
  target: 9,
  eligible: true,
  kind: "first",
  reference: 9,
  referenceKind: "target",
  delta: 1.5,
  ahead: false,
  isNewBest: true
});
assert.deepEqual(roomSplitFeedbackData({
  elapsed: 8.5,
  previousBest: 9,
  target: 8.8
}), {
  elapsed: 8.5,
  previousBest: 9,
  target: 8.8,
  eligible: true,
  kind: "pb",
  reference: 9,
  referenceKind: "pb",
  delta: -0.5,
  ahead: true,
  isNewBest: true
});
assert.deepEqual(roomSplitFeedbackData({
  elapsed: 9.25,
  previousBest: 9,
  target: 8.8
}), {
  elapsed: 9.25,
  previousBest: 9,
  target: 8.8,
  eligible: true,
  kind: "split",
  reference: 9,
  referenceKind: "pb",
  delta: 0.25,
  ahead: false,
  isNewBest: false
});
assert.deepEqual(roomSplitFeedbackData({
  elapsed: 12,
  previousBest: 8,
  target: 9,
  eligible: false
}), {
  elapsed: 12,
  previousBest: 8,
  target: 9,
  eligible: false,
  kind: "assist",
  reference: 8,
  referenceKind: "pb",
  delta: 4,
  ahead: false,
  isNewBest: false
});
assert.equal(
  roomSplitFeedbackData({ elapsed: 7, previousBest: "bad", target: -4 }).referenceKind,
  "none",
  "invalid references must fail closed instead of fabricating a PB comparison"
);

const incompletePriority = roomReviewPriorityData({
  roomCount: 10,
  index: 2,
  entry: {},
  best: 0,
  loss: null,
  pressure: 3
});
assert.equal(incompletePriority, 206.08);
const practicedPriority = roomReviewPriorityData({
  roomCount: 10,
  index: 2,
  entry: { clean: 1, paceWins: 1, styleWins: 1, expertWins: 1 },
  best: 9,
  loss: -0.4,
  pressure: 3
});
assert.equal(practicedPriority, 24.08);
assert.equal(
  roomReviewPriorityData({ roomCount: 10, index: 4, entry: {}, best: 8, loss: 9, pressure: 0 }),
  142.06,
  "positive split loss contribution should remain capped"
);

const sourceRows = [
  { index: 0, priority: 4, label: "A" },
  { index: 1, priority: 12, label: "B" },
  { index: 2, priority: 7, label: "C" }
];
const rankedRows = rankPracticeLedgerRowsData(sourceRows);
assert.deepEqual(rankedRows.map((row) => row.index), [1, 2, 0]);
assert.notEqual(rankedRows[0], sourceRows[1], "presentation ranking must not expose mutable source rows");
assert.deepEqual(sourceRows.map((row) => row.index), [0, 1, 2], "presentation ranking must not reorder caller data");
assert.deepEqual(rankPracticeLedgerRowsData(null), []);

console.log("UI presentation check passed: chapter completion/grades, room split feedback and practice priority ranking preserved.");
