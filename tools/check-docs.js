#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];
const requiredFiles = [
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "KNOWN_ISSUES.md",
  "PLAYTEST_CHECKLIST.md",
  "RELEASE_CHECKLIST.md",
  "public/index.html",
  "public/summit-spark.css",
  "public/summit-spark.js",
  "public/modules/core/format.mjs",
  "public/modules/core/math.mjs",
  "public/modules/game/room-data.mjs",
  "public/vendor/appwrite-26.2.0.js",
  "public/vendor/APPWRITE-LICENSE",
  "data/README.md",
  "data/rooms.generated.json",
  "docs/APPWRITE_SETUP.md",
  "docs/ARCHITECTURE.md",
  "docs/CONTENT_BIBLE.md",
  "docs/DATA_CONTRACTS.md",
  "docs/OPTIMIZATION_ROADMAP.md",
  "docs/PLAYTEST_PROTOCOL.md",
  "docs/QUALITY_GATES.md",
  "tools/check-core-format.mjs",
  "tools/check-core-math.mjs",
  "tools/check-room-data.mjs",
  "tools/README.md",
  ".github/workflows/docs-quality.yml",
  ".github/workflows/pages.yml",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/playtest_feedback.yml"
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) errors.push(`missing required file: ${relativePath}`);
}

const requiredMarkers = new Map([
  ["README.md", ["## 快速开始", "## 仓库结构", "## 质量检查", "## 发布"]],
  ["docs/ARCHITECTURE.md", ["当前目录", "依赖方向", "下一阶段拆分顺序", "删除策略"]],
  ["docs/DATA_CONTRACTS.md", ["当前数据源", "自动检查", "rooms.generated.json"]],
  ["docs/QUALITY_GATES.md", ["npm run check", "npm run browser-smoke", "发布门"]],
  ["tools/README.md", ["核心门禁", "房间数据", "添加新检查"]],
  ["RELEASE_CHECKLIST.md", ["npm run check", "npm run browser-smoke", "KNOWN_ISSUES.md"]]
]);

for (const [relativePath, markers] of requiredMarkers) {
  if (!fs.existsSync(path.join(root, relativePath))) continue;
  const content = read(relativePath);
  for (const marker of markers) {
    if (!content.includes(marker)) errors.push(`${relativePath} missing required marker: ${marker}`);
  }
}

if (errors.length > 0) {
  console.error("Documentation check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Documentation check passed: ${requiredFiles.length} focused files verified.`);
