#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function fail(message) {
  errors.push(message);
}

function extractOne(label, source, pattern) {
  const match = source.match(pattern);
  if (!match) {
    fail(`missing ${label}`);
    return null;
  }
  return match[1];
}

const indexHtml = read("index.html");
const gameHtml = read("summit-spark.html");

if (indexHtml !== gameHtml) {
  fail("index.html and summit-spark.html must stay identical until the dual-entry policy changes");
}

const buildVersion = extractOne(
  "meta build-version",
  gameHtml,
  /<meta name="build-version" content="([^"]+)">/
);
const cssVersion = extractOne(
  "css asset version",
  gameHtml,
  /summit-spark\.css\?v=([^"]+)/
);
const jsVersion = extractOne(
  "js asset version",
  gameHtml,
  /summit-spark\.js\?v=([^"]+)/
);

if (buildVersion && cssVersion && buildVersion !== cssVersion) {
  fail(`css version ${cssVersion} does not match build version ${buildVersion}`);
}

if (buildVersion && jsVersion && buildVersion !== jsVersion) {
  fail(`js version ${jsVersion} does not match build version ${buildVersion}`);
}

const requiredFragments = [
  '<html lang="zh-CN">',
  '<canvas id="game"',
  'id="startButton"',
  'id="settingsPanel"',
  'id="practiceButton"',
  'id="feedbackNote"',
  'id="saveImportText"',
  'data-touch="jump"',
  'data-touch="dash"',
  'data-touch="grab"',
  '<script src="summit-spark.js?'
];

for (const fragment of requiredFragments) {
  if (!gameHtml.includes(fragment)) fail(`summit-spark.html should include ${fragment}`);
}

if (errors.length > 0) {
  console.error("Public surface check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Public surface check passed: build ${buildVersion || "unknown"}.`);
