#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  escapeHtml,
  formatDelta,
  formatLocalDateTime,
  formatTime,
  splitGrade
} from "../public/modules/core/format.mjs";

assert.equal(formatTime(0), "0:00.00");
assert.equal(formatTime(65.439), "1:05.43");
assert.equal(formatTime(-2), "0:00.00");
assert.equal(formatTime(Number.NaN), "0:00.00");
assert.equal(formatTime(Number.POSITIVE_INFINITY), "0:00.00");

assert.equal(formatDelta(1.239), "+1.23");
assert.equal(formatDelta(-1.239), "-1.23");
assert.equal(formatDelta(0), "-0.00");
assert.equal(formatDelta(Number.NaN), "-0.00");
assert.equal(formatDelta(Number.NEGATIVE_INFINITY), "-0.00");

assert.equal(splitGrade(10, 10), "S");
assert.equal(splitGrade(12.5, 10), "A");
assert.equal(splitGrade(16, 10), "B");
assert.equal(splitGrade(16.01, 10), "C");
assert.equal(splitGrade(0, 10), "");
assert.equal(splitGrade(-1, 10), "");
assert.equal(splitGrade(Number.POSITIVE_INFINITY, 10), "");
assert.equal(splitGrade("12.5", "10"), "A");

const localTimestamp = "2026-08-07T06:05:00.000Z";
assert.equal(formatLocalDateTime(localTimestamp), new Date(localTimestamp).toLocaleString("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
}));
assert.equal(formatLocalDateTime("invalid"), "刚刚");
assert.equal(formatLocalDateTime(null), "刚刚");
assert.equal(formatLocalDateTime("invalid", "未知时间"), "未知时间");

assert.equal(
  escapeHtml('<button title="a&b">'),
  "&lt;button title=&quot;a&amp;b&quot;&gt;"
);

console.log("Core format check passed: finite time/delta, grade, local timestamps and HTML escaping behavior preserved.");
