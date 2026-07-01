#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireFile(relativePath) {
  if (!exists(relativePath)) errors.push(`missing required file: ${relativePath}`);
}

function requireIncludes(relativePath, expected) {
  if (!exists(relativePath)) return;
  const content = read(relativePath);
  for (const item of expected) {
    if (!content.includes(item)) errors.push(`${relativePath} should include: ${item}`);
  }
}

const requiredFiles = [
  "README.md",
  "CHANGELOG.md",
  "RELEASE_CHECKLIST.md",
  "PLAYTEST_CHECKLIST.md",
  "KNOWN_ISSUES.md",
  "CONTRIBUTING.md",
  "docs/ARCHITECTURE.md",
  "docs/CONTENT_BIBLE.md",
  "docs/OPTIMIZATION_ROADMAP.md",
  "docs/PLAYTEST_PROTOCOL.md",
  "docs/REFACTORING_GUIDE.md",
  "docs/QUALITY_GATES.md",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/playtest_feedback.yml",
  ".github/ISSUE_TEMPLATE/config.yml"
];

for (const file of requiredFiles) requireFile(file);

requireIncludes("README.md", [
  "## 运行",
  "## 操作",
  "## 开发方向",
  "## 最新推进"
]);

requireIncludes("docs/ARCHITECTURE.md", [
  "目标架构",
  "拆分顺序",
  "每次架构改动的验收"
]);

requireIncludes("docs/CONTENT_BIBLE.md", [
  "一句话定位",
  "核心体验",
  "内容扩展规则"
]);

requireIncludes("docs/OPTIMIZATION_ROADMAP.md", [
  "P0：稳定公开面",
  "P2：低风险模块化",
  "P6：发布节奏"
]);

requireIncludes("docs/QUALITY_GATES.md", [
  "npm run check",
  "npm run browser-smoke",
  "改动风险分级"
]);

requireIncludes("RELEASE_CHECKLIST.md", [
  "npm run check",
  "npm run browser-smoke",
  "KNOWN_ISSUES.md"
]);

requireIncludes("KNOWN_ISSUES.md", [
  "Needs Human Or Device Verification",
  "Current Product Boundaries"
]);

if (errors.length > 0) {
  console.error("Documentation check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Documentation check passed: ${requiredFiles.length} required files verified.`);
