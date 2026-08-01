#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  chapterCompletionData,
  chapterGrade,
  chapterTransitionResultData,
  fullRunRecordEligibilityData,
  lumenRunSummaryData,
  postRunReviewData,
  rankPracticeLedgerRowsData,
  runChapterReviewData,
  runChapterSplitsData,
  runReportTextData,
  roomSplitFeedbackData,
  roomProgressSummaryData,
  roomTrainingRecommendationData,
  roomReviewPriorityData
} from "../public/modules/ui/presentation.mjs";

assert.deepEqual(lumenRunSummaryData({ found: 5, total: 12 }), {
  found: 5,
  total: 12,
  complete: false,
  label: "5/12",
  whisper: "山没有变轻，是你学会了继续向上。"
});
assert.deepEqual(lumenRunSummaryData({ found: 99, total: 12 }), {
  found: 12,
  total: 12,
  complete: true,
  label: "12/12",
  whisper: "所有微光，都抵达了山顶。"
});
assert.equal(lumenRunSummaryData({ found: 0, total: 0 }).complete, false, "an empty route must not count as full Lumen collection");
assert.equal(
  lumenRunSummaryData({ found: 2, total: 2, completeWhisper: "第四幕收束" }).whisper,
  "第四幕收束",
  "the full-Lumen ending should accept canonical act-resolution copy"
);

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

assert.deepEqual(chapterTransitionResultData({
  roomIndexes: [0, 1, 2],
  roomTimes: [8, 9.5, 10],
  roomMistakes: [0, 0, 0]
}), {
  seconds: 27.5,
  mistakes: 0,
  visited: 3,
  roomCount: 3,
  complete: true,
  clean: true
});
assert.deepEqual(chapterTransitionResultData({
  roomIndexes: [3, 4, 5],
  roomTimes: [0, 0, 0, 14, 18, 20],
  roomMistakes: [0, 0, 0, 1, 2, 0]
}), {
  seconds: 52,
  mistakes: 3,
  visited: 3,
  roomCount: 3,
  complete: true,
  clean: false
});
assert.deepEqual(chapterTransitionResultData({
  roomIndexes: [6, 7, 7, -1, 1.5],
  roomTimes: [0, 0, 0, 0, 0, 0, 21, 0],
  roomMistakes: [0, 0, 0, 0, 0, 0, 1, 0]
}), {
  seconds: 21,
  mistakes: 1,
  visited: 1,
  roomCount: 2,
  complete: false,
  clean: false
});
assert.equal(chapterTransitionResultData({
  roomIndexes: [8, 9],
  roomTimes: []
}), null);
assert.equal(chapterTransitionResultData({ roomIndexes: ["0", -1] }), null);

assert.deepEqual(fullRunRecordEligibilityData({
  roomTimes: [8, 9, 10],
  roomCount: 3,
  routeOriginEligible: true,
  recordsEligible: true
}), {
  visited: 3,
  roomCount: 3,
  complete: true,
  eligible: true
});
assert.deepEqual(fullRunRecordEligibilityData({
  roomTimes: [0, 0, 12],
  roomCount: 3,
  routeOriginEligible: false,
  recordsEligible: true
}), {
  visited: 1,
  roomCount: 3,
  complete: false,
  eligible: false
}, "direct final-room Practice must not qualify as a full run");
assert.equal(fullRunRecordEligibilityData({
  roomTimes: [8, 9, 10],
  roomCount: 3,
  routeOriginEligible: false,
  recordsEligible: true
}).eligible, false, "covering every room after a Practice/debug jump must remain partial");
assert.equal(fullRunRecordEligibilityData({
  roomTimes: [8, 9, 10],
  roomCount: 3,
  routeOriginEligible: true,
  recordsEligible: false
}).eligible, false, "assist use must still isolate complete-route records");
assert.equal(fullRunRecordEligibilityData({
  roomTimes: [8, Number.NaN, 10],
  roomCount: 3,
  routeOriginEligible: true,
  recordsEligible: true
}).eligible, false, "invalid room evidence must fail closed");

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

assert.deepEqual(roomTrainingRecommendationData({
  entry: { faults: 1, clean: 0, fall: 1 },
  currentMistakes: 2,
  best: 10,
  target: 9,
  grade: "A",
  leadReason: "fall"
}), {
  reasonKind: "current",
  reasonCount: 2,
  loss: 1,
  lineKind: "coach",
  routeSlot: null,
  coachReason: "fall"
}, "current mistakes should immediately select the contextual coach line");
assert.deepEqual(roomTrainingRecommendationData({
  entry: { faults: 3, clean: 0, spike: 2 },
  currentMistakes: 0,
  best: 0,
  target: 9,
  leadReason: "spike"
}), {
  reasonKind: "archive",
  reasonCount: 2,
  loss: null,
  lineKind: "coach",
  routeSlot: null,
  coachReason: "spike"
}, "three unresolved archive faults should select the contextual coach line");
assert.equal(roomTrainingRecommendationData({
  entry: { faults: 1, clean: 0, fall: 1 },
  target: 9,
  leadReason: "fall"
}).routeSlot, 0, "a light archive warning may explain the room while keeping the safe route");
assert.equal(roomTrainingRecommendationData({
  entry: { clean: 1 },
  best: 12,
  target: 9,
  grade: "A"
}).routeSlot, 1, "a split more than 1.5 seconds slow should keep the progression route");
assert.equal(roomTrainingRecommendationData({
  entry: { clean: 1 },
  best: 8.5,
  target: 9,
  grade: "S"
}).routeSlot, 2, "a clean S split should unlock the expert route recommendation");
assert.equal(roomTrainingRecommendationData({
  entry: { clean: 1 },
  best: 0,
  target: 9
}).reasonKind, "unplayed", "missing completion evidence should fail closed as unplayed");

const summaryFormatTime = (value) => `${Number(value).toFixed(2)}s`;
const summaryFormatDelta = (value) => `${Number(value).toFixed(2)}s`;
assert.deepEqual(roomProgressSummaryData({
  entry: {
    clears: 4,
    clean: 3,
    drills: 5,
    drillClears: 4,
    drillClean: 2,
    cleanWins: 1,
    cleanDrills: 2,
    paceWins: 2,
    paceDrills: 3,
    styleWins: 1,
    styleDrills: 1,
    expertWins: 0,
    expertDrills: 1
  },
  best: 8.5,
  target: 9,
  grade: "S",
  tier: "combine",
  formatTime: summaryFormatTime,
  formatDelta: summaryFormatDelta
}), {
  medal: "S 8.50s",
  clean: "无失误 3/4",
  drill: "Drill 2/4/5",
  contract: "C 1/2 · P 2/3 · S 1/1 · X 0/1",
  pace: "已达标",
  paceDelta: -0.5,
  tier: "组合"
});
assert.deepEqual(roomProgressSummaryData({
  entry: {},
  best: 0,
  target: 12,
  tier: "learn",
  formatTime: summaryFormatTime,
  formatDelta: summaryFormatDelta
}), {
  medal: "T 12.00s",
  clean: "无失误 0/0",
  drill: "Drill 0",
  contract: "C 0/0 · P 0/0 · S 0/0 · X 0/0",
  pace: "未游玩",
  paceDelta: null,
  tier: "教学"
}, "an unplayed room should keep the compact target-first summary");
assert.equal(roomProgressSummaryData({
  entry: { clears: -2, drills: Number.NaN, paceWins: 99 },
  best: 11,
  target: 9,
  tier: "custom",
  formatTime: summaryFormatTime,
  formatDelta: summaryFormatDelta
}).pace, "慢 2.00s", "a played room above target should expose one bounded pace delta");
assert.equal(roomProgressSummaryData({ tier: "custom" }).tier, "custom", "future room tiers should remain visible instead of being discarded");

assert.deepEqual(postRunReviewData({
  roomTimes: [8, 12, 14, 0],
  roomMistakes: [0, 2, 1, 9],
  targets: [9, 10, 13, 1]
}), {
  visited: 3,
  roomCount: 4,
  recommendation: {
    index: 1,
    seconds: 12,
    target: 10,
    mistakes: 2,
    loss: 2,
    reason: "mistakes",
    mode: "clean"
  },
  largestLoss: {
    index: 1,
    seconds: 12,
    target: 10,
    mistakes: 2,
    loss: 2
  },
  allTargetsMet: false
});
assert.deepEqual(postRunReviewData({
  roomTimes: [8, 11.5, 12],
  roomMistakes: [0, 0, 0],
  targets: [9, 10, 13]
})?.recommendation, {
  index: 1,
  seconds: 11.5,
  target: 10,
  mistakes: 0,
  loss: 1.5,
  reason: "pace",
  mode: "pace"
});
assert.equal(postRunReviewData({
  roomTimes: [8, 9],
  roomMistakes: [0, 0],
  targets: [9, 10]
})?.recommendation, null, "a clean run under every target should fall back to long-term mastery");
assert.equal(postRunReviewData({
  roomTimes: [0, Number.NaN],
  roomMistakes: [8, 8],
  targets: [9, 10]
}), null, "unvisited rooms must not fabricate post-run advice");
assert.equal(postRunReviewData({
  roomTimes: [8, 8],
  roomMistakes: [1, 1],
  targets: [8, 8]
})?.recommendation?.index, 0, "post-run tie order must stay deterministic");

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

const runChapters = runChapterSplitsData({
  chapterTitles: ["山门", "旧峰", "风峡", "星顶"],
  chapterIndexes: [0, 0, 1, 2, 2, 3],
  roomLabels: ["第一幕", "第一幕", "第二幕", "第三幕", "第三幕", "第四幕"],
  roomTimes: [8, 10, 14, 22, 0, 28],
  roomMistakes: [0, 1, 2, 1, 9, 0]
});
assert.deepEqual(runChapters, [
  { index: 0, label: "第一幕", seconds: 18, mistakes: 1, visited: 2, rooms: 2 },
  { index: 1, label: "第二幕", seconds: 14, mistakes: 2, visited: 1, rooms: 1 },
  { index: 2, label: "第三幕", seconds: 22, mistakes: 10, visited: 1, rooms: 2 },
  { index: 3, label: "第四幕", seconds: 28, mistakes: 0, visited: 1, rooms: 1 }
]);
assert.deepEqual(runChapterSplitsData({
  chapterTitles: ["一", "二"],
  chapterIndexes: [undefined, -1, 1.5, 1],
  roomTimes: [99, 99, 99, 4]
}), [
  { index: 0, label: "一", seconds: 0, mistakes: 0, visited: 0, rooms: 0 },
  { index: 1, label: "二", seconds: 4, mistakes: 0, visited: 1, rooms: 1 }
], "invalid room-to-chapter mappings must not fabricate Act I evidence");

const runReview = runChapterReviewData({ chapters: runChapters, totalRooms: 6 });
assert.equal(runReview.visitedRooms, 5);
assert.equal(runReview.complete, false);
assert.equal(runReview.slowest?.label, "第四幕");
assert.notEqual(runReview.slowest, runChapters[3], "review data must not expose a mutable chapter row");
assert.deepEqual(runChapterReviewData({ chapters: [], totalRooms: 10 }), {
  chapters: [],
  visitedRooms: 0,
  totalRooms: 10,
  complete: false,
  slowest: null
});
assert.equal(runChapterReviewData({
  chapters: [
    { index: 0, label: "先", seconds: 12, visited: 1 },
    { index: 1, label: "后", seconds: 12, visited: 1 }
  ],
  totalRooms: 2
}).slowest?.label, "先", "equal act times must keep chronological order");

const runReport = runReportTextData({
  build: "20260729-test",
  complete: true,
  visitedRooms: 2,
  totalRooms: 2,
  totalTime: "0:18.00",
  mistakes: 1,
  foundLumens: 2,
  totalLumens: 3,
  flow: 42.9,
  assistUsed: false,
  chapters: [
    { label: "第一幕", time: "0:18.00", mistakes: 1, visited: 2, rooms: 2 }
  ],
  rooms: [
    { index: 0, label: "起势山门", time: "0:08.00", mistakes: 0, visited: true },
    { index: 1, label: "光继横桥", time: "0:10.00", mistakes: 1, visited: true }
  ]
});
assert.match(runReport, /结果：完整登顶/);
assert.match(runReport, /总时间：0:18\.00 \/ 失误 1 \/ 微光 2\/3 \/ Flow 42/);
assert.match(runReport, /第一幕：0:18\.00 \/ 失误 1 \/ 房间 2\/2/);
assert.match(runReport, /R2 光继横桥：0:10\.00 \/ 失误 1/);
assert.match(runReport, /仅包含本轮时间、失误、微光、Flow、辅助状态与构建号/);
assert.match(runReport, /不含身份、设备名称、输入历史或路线坐标/);
const sanitizedReport = runReportTextData({
  build: "bad\ninjected",
  complete: true,
  visitedRooms: 1,
  totalRooms: 2,
  chapters: [{ label: "幕\r\n伪造", visited: 0, rooms: 1 }],
  rooms: [{ index: -4, label: "房\n伪造", visited: false }]
});
assert.match(sanitizedReport, /构建：bad injected/);
assert.match(sanitizedReport, /结果：部分路线 1\/2 房/);
assert.doesNotMatch(sanitizedReport, /bad\ninjected|幕\r?\n伪造|房\r?\n伪造/);
assert.ok(runReportTextData({
  totalRooms: 10,
  rooms: Array.from({ length: 10 }, (_, index) => ({
    index,
    label: "超长房名".repeat(1000),
    visited: true,
    time: "0:10.00"
  }))
}).length < 4000, "run reports must stay bounded even when display labels are malformed");

console.log("UI presentation check passed: chapter completion/grades, full-run record eligibility, transition results, room split feedback, room training/progress summaries, post-run evidence, run reports and practice priority ranking preserved.");
