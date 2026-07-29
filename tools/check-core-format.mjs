#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  escapeHtml,
  formatDelta,
  formatTime,
  splitGrade
} from "../public/modules/core/format.mjs";

assert.equal(formatTime(0), "0:00.00");
assert.equal(formatTime(65.439), "1:05.43");
assert.equal(formatTime(-2), "0:00.00");

assert.equal(formatDelta(1.239), "+1.23");
assert.equal(formatDelta(-1.239), "-1.23");
assert.equal(formatDelta(0), "-0.00");

assert.equal(splitGrade(10, 10), "S");
assert.equal(splitGrade(12.5, 10), "A");
assert.equal(splitGrade(16, 10), "B");
assert.equal(splitGrade(16.01, 10), "C");
assert.equal(splitGrade(0, 10), "");

assert.equal(
  escapeHtml('<button title="a&b">'),
  "&lt;button title=&quot;a&amp;b&quot;&gt;"
);

console.log("Core format check passed: time, delta, grade and HTML escaping behavior preserved.");
