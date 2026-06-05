#!/usr/bin/env node
"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function expectIncludes(label, content, marker) {
  if (!content.includes(marker)) errors.push(label + " missing " + marker);
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        if (response.statusCode !== 200) {
          reject(new Error(url + " returned " + response.statusCode + ": " + body.slice(0, 80)));
          return;
        }
        resolve(body);
      });
    });
    request.setTimeout(5000, () => {
      request.destroy(new Error(url + " timed out"));
    });
    request.on("error", reject);
  });
}

async function waitForServer(baseUrl, child) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < 6000) {
    if (child.exitCode !== null) break;
    try {
      return await requestText(baseUrl + "/");
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  throw lastError || new Error("server exited before smoke request");
}

async function main() {
  const indexHtml = read("index.html");
  const standaloneHtml = read("summit-spark.html");
  if (indexHtml !== standaloneHtml) errors.push("index.html and summit-spark.html are not identical");

  const buildVersion = (indexHtml.match(/name="build-version" content="([^"]+)"/) || [])[1] || "";
  if (!/^\d{8}-p\d+$/.test(buildVersion)) errors.push("build version should use YYYYMMDD-pN, found " + (buildVersion || "missing"));

  const port = await findFreePort();
  const child = childProcess.spawn(process.execPath, ["game-server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  try {
    const baseUrl = "http://127.0.0.1:" + port;
    const html = await waitForServer(baseUrl, child);
    const js = await requestText(baseUrl + "/summit-spark.js?v=" + encodeURIComponent(buildVersion));
    const css = await requestText(baseUrl + "/summit-spark.css?v=" + encodeURIComponent(buildVersion));

    [
      `name="build-version" content="${buildVersion}"`,
      `summit-spark.css?v=${buildVersion}`,
      `summit-spark.js?v=${buildVersion}`,
      'id="settingsPanel"',
      'id="feelLab"',
      'id="audioTestButton"',
      'id="feedbackType"',
      'id="feedbackNote"',
      'id="diagnosticsButton"',
      'id="feedbackTemplateButton"',
      'id="gamepadStatus"',
      'id="saveExportButton"',
      'id="saveDownloadButton"',
      'id="saveImportButton"',
      'id="saveImportText"',
      'id="saveImportStatus"',
      'id="routeContracts"',
      'id="gameStatus"',
      'settings-group-training',
      'settings-group-controls',
      'settings-group-feedback'
    ].forEach((marker) => expectIncludes("html", html, marker));
    if (html.includes("start-guide") || html.includes("start-copy")) errors.push("html should not expose explanatory start guide blocks");
    if (/settings-group[^>]*\sopen\b/.test(html)) errors.push("settings groups should default collapsed");

    [
      "markAppReady",
      "syncSettingsPanel",
      "updateFeelLab",
      "startFeelFixture",
      "activeFeelFixture",
      "lastFeelFixtureResult",
      "routeContractHudDetail",
      "cancelActiveRouteContract",
      "playAudioTestPattern",
      "buildDiagnosticsSnapshot",
      "copyDiagnosticsSnapshot",
      "feedbackDiagnostics",
      "buildFeedbackTemplate",
      "buildSaveArchive",
      "importSaveArchive",
      "normalizeSaveArchiveText",
      "updateSaveImportPreview",
      "gamepadDiagnostics",
      "isSettingsTextEntryTarget",
      "requestAnimationFrame(frame)"
    ].forEach((marker) => expectIncludes("js", js, marker));

    [
      "settings-panel",
      "feel-lab",
      "feel-card.active",
      "feel-card.recent",
      "feel-card.interrupted",
      "route-contract-card.done",
      "boot-fallback",
      "compact-actions",
      "gamepad-status-row",
      "save-import-box",
      "save-import-status",
      "settings-group"
    ].forEach((marker) => expectIncludes("css", css, marker));
  } finally {
    if (child.exitCode === null) child.kill();
  }

  if (errors.length > 0) {
    console.error("Smoke check failed:");
    for (const error of errors) console.error("- " + error);
    if (stderr.trim()) console.error("Server stderr:\n" + stderr.trim());
    process.exit(1);
  }
  console.log("Smoke check passed: local HTTP boot, p" + buildVersion.split("-p")[1] + " assets, training UI markers.");
}

main().catch((error) => {
  console.error("Smoke check failed:");
  console.error("- " + error.message);
  process.exit(1);
});
