#!/usr/bin/env node
"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];

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

function requestJson(url, method = "GET") {
  return requestText(url, method).then((text) => JSON.parse(text));
}

function requestText(url, method = "GET") {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`${method} ${url} returned ${response.statusCode}: ${body.slice(0, 120)}`));
          return;
        }
        resolve(body);
      });
    });
    request.setTimeout(5000, () => request.destroy(new Error(`${method} ${url} timed out`)));
    request.on("error", reject);
    request.end();
  });
}

function candidateBrowsers() {
  const names = [];
  if (process.env.BROWSER_EXECUTABLE_PATH) names.push(process.env.BROWSER_EXECUTABLE_PATH);
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA || "";
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    names.push(
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(local, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe")
    );
  } else if (process.platform === "darwin") {
    names.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    );
  } else {
    names.push("/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge");
  }
  return [...new Set(names)];
}

function findBrowser() {
  return candidateBrowsers().find((candidate) => candidate && fs.existsSync(candidate));
}

function killProcess(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
    child.kill();
    setTimeout(resolve, 1200);
  });
}

function removeTempDir(dir) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 120 });
      return;
    } catch {
      // Chrome may keep profile files briefly after process termination.
    }
  }
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
        else resolve(message.result || {});
      } else if (message.method) {
        this.events.push(message);
      }
    });
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("CDP websocket open timed out")), 5000);
      this.ws.addEventListener("open", () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      this.ws.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("CDP websocket failed"));
      }, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(method + " timed out"));
      }, 15000);
    });
    this.ws.send(payload);
    return promise;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // Browser shutdown is best-effort after smoke.
    }
  }
}

async function waitUntil(label, fn, timeout = 6000) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeout) {
    try {
      const value = await fn();
      if (value) return value;
      last = String(value);
    } catch (error) {
      last = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(label + " timed out" + (last ? ": " + last : ""));
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error("Evaluation failed: " + expression);
  return result.result ? result.result.value : undefined;
}

async function waitForAppReady(cdp) {
  await waitUntil("app ready", async () => {
    return evaluate(cdp, `document.readyState === "complete" && document.documentElement.classList.contains("app-ready")`);
  }, 7000);
}

async function clickSelector(cdp, selector) {
  const rect = await waitUntil("click target " + selector, () => evaluate(cdp, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "center" });
    const panel = el.closest(".settings-panel");
    const probe = () => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2));
      const y = Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      const clickable = Boolean(hit && (hit === el || el.contains(hit) || hit.closest(${JSON.stringify(selector)})));
      const visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      return { rect, x, y, clickable: clickable || (Boolean(panel) && visible) };
    };
    let result = probe();
    if (!result.clickable && panel) {
      const rectBefore = result.rect;
      const panelRect = panel.getBoundingClientRect();
      const targetCenter = rectBefore.top + rectBefore.height / 2;
      const panelCenter = panelRect.top + panelRect.height / 2;
      panel.scrollTop += targetCenter - panelCenter;
      result = probe();
    }
    return result.clickable ? { x: result.x, y: result.y, width: result.rect.width, height: result.rect.height, clickable: result.clickable } : null;
  })()`), 4000);
  if (!rect || rect.width <= 0 || rect.height <= 0) throw new Error("Cannot click missing/hidden selector " + selector);
  if (!rect.clickable) throw new Error("Cannot click occluded selector " + selector);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
}

async function openSettingsGroup(cdp, selector) {
  await evaluate(cdp, `(() => {
    const group = document.querySelector(${JSON.stringify(selector)});
    if (group) group.open = true;
  })()`);
  await sleep(120);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function virtualKeyCode(code, key) {
  if (key && key.length === 1) return key.toUpperCase().charCodeAt(0);
  const named = { Enter: 13, Escape: 27, F3: 114, Space: 32 };
  return named[key] || named[code] || 0;
}

async function keyDown(cdp, code, key) {
  const event = {
    type: "keyDown",
    code,
    key,
    windowsVirtualKeyCode: virtualKeyCode(code, key)
  };
  if (key && key.length === 1) {
    event.text = key;
    event.unmodifiedText = key;
  }
  await cdp.send("Input.dispatchKeyEvent", event);
}

async function keyUp(cdp, code, key) {
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    code,
    key,
    windowsVirtualKeyCode: virtualKeyCode(code, key)
  });
}

async function keyTap(cdp, code, key) {
  await keyDown(cdp, code, key);
  await keyUp(cdp, code, key);
}

async function keyHold(cdp, code, key, ms = 300) {
  await keyDown(cdp, code, key);
  await sleep(ms);
  await keyUp(cdp, code, key);
}

async function canvasInkSummary(cdp) {
  return evaluate(cdp, `(() => {
    const canvas = document.querySelector("#game");
    const context = canvas.getContext("2d");
    const { width, height } = canvas;
    const data = context.getImageData(0, 0, width, height).data;
    const first = [data[0], data[1], data[2], data[3]];
    let varied = 0;
    let bright = 0;
    let samples = 0;
    const step = Math.max(8, Math.floor(Math.min(width, height) / 32));
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        samples += 1;
        if (Math.abs(r - first[0]) + Math.abs(g - first[1]) + Math.abs(b - first[2]) + Math.abs(a - first[3]) > 10) varied += 1;
        if (r + g + b > 80 && a > 0) bright += 1;
      }
    }
    return { samples, varied, bright };
  })()`);
}

async function enableDebugPanel(cdp) {
  await evaluate(cdp, `(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "F3", key: "F3", bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "F3", key: "F3", bubbles: true }));
  })()`);
  await waitUntil("debug panel visible", () => evaluate(cdp, `!document.querySelector("#debugPanel").classList.contains("hidden") && /pos /.test(document.querySelector("#debugPanel").textContent)`), 2500);
}

async function debugPosition(cdp) {
  const pos = await waitUntil("debug position", () => evaluate(cdp, `(() => {
    const match = document.querySelector("#debugPanel").textContent.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    return match ? { x: Number(match[1]), y: Number(match[2]), text: document.querySelector("#debugPanel").textContent } : null;
  })()`), 2500);
  return pos;
}

async function runDesktopSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  const initial = await evaluate(cdp, `({
    build: document.querySelector('meta[name="build-version"]')?.content || "",
    ready: document.documentElement.classList.contains("app-ready"),
    startVisible: !!document.querySelector("#startButton"),
    canvasSize: (() => {
      const rect = document.querySelector("#game").getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    })()
  })`);
  if (!/^\d{8}-p\d+$/.test(initial.build)) errors.push("browser smoke found invalid build version " + initial.build);
  if (!initial.ready || initial.canvasSize.width < 300 || initial.canvasSize.height < 160) errors.push("browser smoke initial canvas/start state is invalid");
  const initialCanvas = await canvasInkSummary(cdp);
  if (initialCanvas.varied < 20 || initialCanvas.bright < 20) errors.push("canvas appears blank before gameplay: " + JSON.stringify(initialCanvas));

  await clickSelector(cdp, "#startButton");
  await waitUntil("start button begins game", () => evaluate(cdp, `document.querySelector("#overlay").classList.contains("hidden") && /游戏开始/.test(document.querySelector("#gameStatus").textContent)`));
  const quietHud = await evaluate(cdp, `(() => {
    const stage = document.querySelector(".stage");
    const visible = (selector) => getComputedStyle(document.querySelector(selector)).display !== "none";
    return {
      freePlay: stage.classList.contains("free-play"),
      trainingActive: stage.classList.contains("training-active"),
      splitTimeVisible: visible("#splitTime"),
      splitDeltaVisible: visible("#splitDelta"),
      flowVisible: visible("#flowCount"),
      paceVisible: visible(".pace-meter"),
      roomVisible: visible("#roomCount"),
      timeVisible: visible("#runTime")
    };
  })()`);
  if (!quietHud.freePlay || quietHud.trainingActive || quietHud.splitTimeVisible || quietHud.splitDeltaVisible || quietHud.flowVisible || quietHud.paceVisible || !quietHud.roomVisible || !quietHud.timeVisible) {
    errors.push("free-play HUD should hide advanced timing/flow meters while keeping core status: " + JSON.stringify(quietHud));
  }
  await enableDebugPanel(cdp);
  const beforeMove = await debugPosition(cdp);
  await keyHold(cdp, "KeyD", "D", 360);
  const afterMove = await debugPosition(cdp);
  const moved = afterMove.x - beforeMove.x;
  if (moved < 8) errors.push("keyboard movement did not shift player enough: " + moved.toFixed(2));
  const gameplayCanvas = await canvasInkSummary(cdp);
  if (gameplayCanvas.varied < 20 || gameplayCanvas.bright < 20) errors.push("canvas appears blank during gameplay: " + JSON.stringify(gameplayCanvas));
  await clickSelector(cdp, "#settingsButton");
  await waitUntil("settings open after start", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("settings close after start", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const cockpit = await evaluate(cdp, `({
    routeCards: document.querySelectorAll("[data-route-contract]").length,
    feelCards: document.querySelectorAll("[data-feel-fixture]").length,
    groups: document.querySelectorAll(".settings-group").length,
    defaultOpenGroups: [...document.querySelectorAll(".settings-group[open]")].map((group) => group.className),
    audioButton: !!document.querySelector("#audioTestButton"),
    diagnosticsButton: !!document.querySelector("#diagnosticsButton"),
    feedbackTemplateButton: !!document.querySelector("#feedbackTemplateButton"),
    saveExportButton: !!document.querySelector("#saveExportButton"),
    saveImportButton: !!document.querySelector("#saveImportButton"),
    gamepadStatus: document.querySelector("#gamepadStatus")?.textContent || "",
    gamepadDeadzone: !!document.querySelector("#gamepadDeadzoneSlider"),
    systemList: getComputedStyle(document.querySelector(".settings-body")).display === "block",
    panelWidthCalm: document.querySelector("#settingsPanel").getBoundingClientRect().width <= 620,
    panelBox: (() => {
      const rect = document.querySelector("#settingsPanel").getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        overflow: rect.right > window.innerWidth + 1 || rect.left < -1 || rect.bottom > window.innerHeight + 1
      };
    })()
  })`);
  if (cockpit.routeCards < 3) errors.push("settings should expose at least three route contracts");
  if (cockpit.feelCards < 4) errors.push("settings should expose visible feel calibration cards");
  if (
    cockpit.groups < 7 ||
    cockpit.defaultOpenGroups.length !== 1 ||
    !cockpit.defaultOpenGroups[0].includes("settings-group-controls")
  ) {
    errors.push("settings should default to controls-first system groups: " + JSON.stringify(cockpit));
  }
  if (!cockpit.audioButton) errors.push("settings should expose audio test button");
  if (!cockpit.diagnosticsButton) errors.push("settings should expose diagnostics copy button");
  if (!cockpit.feedbackTemplateButton) errors.push("settings should expose feedback template copy button");
  if (!cockpit.saveExportButton || !cockpit.saveImportButton) errors.push("settings should expose save export/import buttons");
  if (!/未连接|standard|不支持|未检测/.test(cockpit.gamepadStatus)) errors.push("settings should expose non-sensitive gamepad status: " + cockpit.gamepadStatus);
  if (!cockpit.gamepadDeadzone) errors.push("settings should expose gamepad deadzone control");
  if (!cockpit.systemList || !cockpit.panelWidthCalm) errors.push("settings should render as a calm one-column system list: " + JSON.stringify(cockpit));
  const comfortControls = await evaluate(cdp, `({
    lowPerformance: !!document.querySelector("#lowPerformanceToggle"),
    touchSize: !!document.querySelector("#touchSizeSlider")
  })`);
  if (!comfortControls.lowPerformance) errors.push("settings should expose low-performance toggle");
  if (!comfortControls.touchSize) errors.push("settings should expose touch-size slider");
  if (cockpit.panelBox.overflow) errors.push("settings panel overflows desktop viewport: " + JSON.stringify(cockpit.panelBox));

  await openSettingsGroup(cdp, ".settings-group-audio");
  await clickSelector(cdp, "#audioTestButton");
  const audioStatus = await evaluate(cdp, `document.querySelector("#gameStatus").textContent`);
  if (!/声音试听/.test(audioStatus)) errors.push("audio test button did not update live status");
  await evaluate(cdp, `(() => {
    const type = document.querySelector("#feedbackType");
    const note = document.querySelector("#feedbackNote");
    type.value = "mobile";
    type.dispatchEvent(new Event("change", { bubbles: true }));
    note.value = "R7 touch note with extra spacing";
    note.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await openSettingsGroup(cdp, ".settings-group-feedback");
  await clickSelector(cdp, "#diagnosticsButton");
  const diagnostics = await waitUntil("diagnostics snapshot", () => evaluate(cdp, `(() => {
    const snapshot = window.__summitLastDiagnostics;
    if (!snapshot) return null;
    const status = document.querySelector("#gameStatus").textContent;
    if (!/诊断/.test(status)) return null;
    return {
      build: snapshot.build,
      schemaVersion: snapshot.schemaVersion,
      feedbackType: snapshot.feedback?.type,
      feedbackNote: snapshot.feedback?.note,
      gamepad: snapshot.gamepad,
      hasSettings: !!snapshot.settings && typeof snapshot.settings.gamepadDeadzone === "number",
      hasProgress: !!snapshot.progress && typeof snapshot.progress.chapterPercent === "number",
      hasNoUserAgent: !JSON.stringify(snapshot).includes("userAgent"),
      status
    };
  })()`), 5000);
  if (!/^\d{8}-p\d+$/.test(diagnostics.build) || diagnostics.schemaVersion !== 1 || diagnostics.feedbackType !== "mobile" || !/R7 touch note/.test(diagnostics.feedbackNote || "") || !diagnostics.gamepad || typeof diagnostics.gamepad.deadzone !== "number" || !diagnostics.hasSettings || !diagnostics.hasProgress || !diagnostics.hasNoUserAgent || !/诊断/.test(diagnostics.status)) {
    errors.push("diagnostics button did not produce a safe feedback snapshot: " + JSON.stringify(diagnostics));
  }
  await clickSelector(cdp, "#feedbackTemplateButton");
  const template = await waitUntil("feedback template", () => evaluate(cdp, `(() => {
    const text = window.__summitLastFeedbackTemplate || "";
    return /Summit Spark/.test(text) && /反馈类型：移动端/.test(text) && /复现步骤：/.test(text) && !/userAgent/.test(text) ? text : null;
  })()`), 5000);
  if (!/R7 touch note/.test(template)) errors.push("feedback template should include the current note");
  await sleep(420);

  await openSettingsGroup(cdp, ".settings-group-training");
  await evaluate(cdp, `document.querySelector(".settings-group-training")?.scrollIntoView({ block: "start" })`);
  await sleep(160);
  await clickSelector(cdp, "[data-feel-fixture]");
  await waitUntil("feel fixture launch", () => evaluate(cdp, `/手感校准/.test(document.querySelector("#gameStatus").textContent)`));
  await clickSelector(cdp, "#settingsButton");
  await waitUntil("settings reopened after feel fixture", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  await evaluate(cdp, `document.querySelector(".settings-group-training")?.scrollIntoView({ block: "start" })`);
  await sleep(160);
  const feelState = await evaluate(cdp, `document.querySelector(".feel-card.active, .feel-card.recent, .feel-card.interrupted")?.className || ""`);
  if (!/feel-card/.test(feelState)) errors.push("Feel Lab did not preserve active/recent/interrupted state after launch");

  const routeAfterFeel = await evaluate(cdp, `(() => {
    const group = document.querySelector(".settings-group-training");
    const panel = document.querySelector("#settingsPanel");
    const card = document.querySelector("[data-route-contract]");
    if (group) group.open = true;
    if (card) card.scrollIntoView({ block: "center", inline: "center" });
    const rect = card ? card.getBoundingClientRect() : null;
    const hit = rect ? document.elementFromPoint(Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2)), Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2))) : null;
    return {
      groupOpen: Boolean(group?.open),
      cardCount: document.querySelectorAll("[data-route-contract]").length,
      rect: rect ? { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) } : null,
      panel: panel ? { scrollTop: Math.round(panel.scrollTop), height: Math.round(panel.getBoundingClientRect().height) } : null,
      hit: hit ? { tag: hit.tagName, className: hit.className, id: hit.id } : null
    };
  })()`);
  if (process.env.SMOKE_DEBUG) console.error("routeAfterFeel " + JSON.stringify(routeAfterFeel));

  await clickSelector(cdp, "[data-route-contract]");
  await waitUntil("route contract launch", () => evaluate(cdp, `/航线|稳定航线|节奏航线|高手航线/.test(document.querySelector("#gameStatus").textContent)`));
  await keyTap(cdp, "KeyD", "D");
  const gameplay = await evaluate(cdp, `({
    overlayHidden: document.querySelector("#overlay").classList.contains("hidden"),
    status: document.querySelector("#gameStatus").textContent,
    room: document.querySelector("#roomCount").textContent
  })`);
  if (!gameplay.overlayHidden || !gameplay.room) errors.push("gameplay did not remain active after route contract launch");
}

async function runResumeSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await evaluate(cdp, `(() => {
    localStorage.clear();
    localStorage.setItem("summit-spark-settings", JSON.stringify({
      schemaVersion: 1,
      lowPerformance: true,
      touchSize: 62,
      gamepadDeadzone: 0.31,
      audioEnabled: false
    }));
    localStorage.setItem("summit-spark-room-focus", JSON.stringify({
      schemaVersion: 1,
      rooms: [{ faults: 4, fall: 4, drills: 1, cleanWins: 0 }]
    }));
  })()`);
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  const startState = await evaluate(cdp, `({
    resumeVisible: !!document.querySelector("#resumeTrainingButton") && !document.querySelector("#resumeTrainingButton").classList.contains("hidden"),
    resumeText: document.querySelector("#resumeTrainingButton")?.textContent || "",
    lowPerformance: document.querySelector(".stage").classList.contains("low-performance"),
    touchSize: getComputedStyle(document.querySelector(".stage")).getPropertyValue("--touch-size").trim(),
    settingsVersion: JSON.parse(localStorage.getItem("summit-spark-settings")).schemaVersion,
    focusVersion: JSON.parse(localStorage.getItem("summit-spark-room-focus")).schemaVersion
  })`);
  if (!startState.resumeVisible || !/继续 R/.test(startState.resumeText)) errors.push("start overlay should expose direct resume training after progress storage");
  if (!startState.lowPerformance || startState.touchSize !== "62px") errors.push("comfort settings did not apply from stored settings: " + JSON.stringify(startState));
  if (startState.settingsVersion !== 2 || startState.focusVersion !== 2) errors.push("stored settings/focus should migrate to current schema: " + JSON.stringify(startState));
  await clickSelector(cdp, "#resumeTrainingButton");
  await waitUntil("resume training starts drill", () => evaluate(cdp, `/Drill/.test(document.querySelector("#gameStatus").textContent) && document.querySelector("#overlay").classList.contains("hidden")`), 5000);
}

async function runKeyboardSettingsSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await evaluate(cdp, `localStorage.clear()`);
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);

  await keyTap(cdp, "KeyO", "O");
  await waitUntil("settings opens from keyboard O", () => evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const button = document.querySelector("#settingsButton");
    return !panel.classList.contains("hidden") && button.getAttribute("aria-expanded") === "true" && document.activeElement === document.querySelector("#settingsClose");
  })()`), 3500);

  await openSettingsGroup(cdp, ".settings-group-feedback");
  await clickSelector(cdp, "#feedbackNote");
  await keyTap(cdp, "KeyO", "O");
  const textEntryState = await waitUntil("feedback textarea keeps O input local", () => evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const note = document.querySelector("#feedbackNote");
    return {
      panelOpen: !panel.classList.contains("hidden"),
      value: note.value,
      active: document.activeElement === note
    };
  })()`), 3500);
  if (!textEntryState.panelOpen || !textEntryState.active || !/o/i.test(textEntryState.value)) {
    errors.push("feedback textarea should keep O as text input instead of toggling settings: " + JSON.stringify(textEntryState));
  }

  await keyTap(cdp, "Escape", "Escape");
  await waitUntil("settings closes from keyboard Escape", () => evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const button = document.querySelector("#settingsButton");
    return panel.classList.contains("hidden") && button.getAttribute("aria-expanded") === "false";
  })()`), 3500);

  await keyTap(cdp, "KeyO", "O");
  await waitUntil("settings reopens from keyboard O", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`), 3500);
  await keyTap(cdp, "KeyO", "O");
  await waitUntil("settings toggles closed from keyboard O", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`), 3500);
}

async function runTrainingInterruptionSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await evaluate(cdp, `localStorage.clear()`);
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);

  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("route interruption cockpit open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  await clickSelector(cdp, "[data-route-contract]");
  await waitUntil("route contract starts before interruption", () => evaluate(cdp, `/航线|稳定航线|节奏航线|高手航线/.test(document.querySelector("#gameStatus").textContent)`), 5000);
  await clickSelector(cdp, "#settingsButton");
  await waitUntil("settings open during route contract", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await openSettingsGroup(cdp, ".settings-group-room");
  await clickSelector(cdp, "#drillCleanButton");
  await waitUntil("plain drill interrupts route contract", () => evaluate(cdp, `/Drill/.test(document.querySelector("#gameStatus").textContent) && document.querySelector("#settingsPanel").classList.contains("hidden")`), 5000);
  await clickSelector(cdp, "#settingsButton");
  await waitUntil("settings reopened after route interruption", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  const routeInterrupted = await evaluate(cdp, `(() => {
    const card = document.querySelector(".route-contract-card.interrupted");
    const badge = document.querySelector(".route-resume-badge");
    return {
      interrupted: !!card,
      resume: !!document.querySelector("[data-route-resume]"),
      badgeText: badge ? badge.textContent : "",
      detail: card ? card.textContent : ""
    };
  })()`);
  if (!routeInterrupted.interrupted || !routeInterrupted.resume || !/继续上次/.test(routeInterrupted.badgeText)) {
    errors.push("route contract interruption should show an explicit resume card: " + JSON.stringify(routeInterrupted));
  }
  await clickSelector(cdp, "[data-route-resume]");
  await waitUntil("route contract resumes from interrupted card", () => evaluate(cdp, `/航线|稳定航线|节奏航线|高手航线/.test(document.querySelector("#gameStatus").textContent) && document.querySelector("#settingsPanel").classList.contains("hidden")`), 5000);

  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await evaluate(cdp, `localStorage.clear()`);
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("feel interruption cockpit open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  await clickSelector(cdp, "[data-feel-fixture]");
  await waitUntil("feel fixture starts before interruption", () => evaluate(cdp, `/手感校准/.test(document.querySelector("#gameStatus").textContent)`), 5000);
  await clickSelector(cdp, "#settingsButton");
  await waitUntil("settings open during feel fixture", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await openSettingsGroup(cdp, ".settings-group-room");
  await clickSelector(cdp, "#drillPaceButton");
  await waitUntil("plain drill interrupts feel fixture", () => evaluate(cdp, `/Drill/.test(document.querySelector("#gameStatus").textContent) && document.querySelector("#settingsPanel").classList.contains("hidden")`), 5000);
  await clickSelector(cdp, "#settingsButton");
  await waitUntil("settings reopened after feel interruption", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const feelInterrupted = await evaluate(cdp, `(() => {
    const card = document.querySelector(".feel-card.interrupted");
    const head = document.querySelector(".feel-lab-head em");
    return {
      interrupted: !!card,
      headText: head ? head.textContent : "",
      cardText: card ? card.textContent : ""
    };
  })()`);
  if (!feelInterrupted.interrupted || !/已中断/.test(feelInterrupted.headText + feelInterrupted.cardText)) {
    errors.push("Feel Lab interruption should remain visible after changing drill: " + JSON.stringify(feelInterrupted));
  }
}

async function runStorageSmoke(cdp, baseUrl) {
  await evaluate(cdp, `(() => {
    localStorage.setItem("summit-spark-settings", "{bad json");
    localStorage.setItem("summit-spark-profile", JSON.stringify({ summitClears: -5, bestDeathCount: "bad", challengeWins: { clear: true, bad: true } }));
    localStorage.setItem("summit-spark-room-bests", JSON.stringify([2, -4, "bad", 9]));
    localStorage.setItem("summit-spark-room-paths", JSON.stringify([[{ x: 20, y: 30, t: 0, dash: true }], "bad", [{ x: -999999, y: "bad", t: -2 }]]));
    localStorage.setItem("summit-spark-focus", "not-json");
  })()`);
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  const state = await evaluate(cdp, `({
    ready: document.documentElement.classList.contains("app-ready"),
    settingsOk: !!document.querySelector("#settingsButton"),
    status: document.querySelector("#gameStatus").textContent,
    storageTip: document.querySelector("#gameTip").classList.contains("storage"),
    tipTitle: document.querySelector("#gameTipTitle").textContent
  })`);
  if (!state.ready || !state.settingsOk) errors.push("app did not recover from corrupted storage");
  if (!state.storageTip || !/存档/.test(state.tipTitle)) errors.push("storage recovery did not show a one-shot storage toast");
}

async function runSaveArchiveSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await evaluate(cdp, `localStorage.clear()`);
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("save archive cockpit open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await openSettingsGroup(cdp, ".settings-group-feedback");
  await clickSelector(cdp, "#saveExportButton");
  const exported = await waitUntil("save archive export", () => evaluate(cdp, `(() => {
    const archive = window.__summitLastSaveArchive;
    if (!archive) return null;
    return {
      kind: archive.kind,
      schemaVersion: archive.schemaVersion,
      build: archive.build,
      hasSettings: !!archive.storage?.settings,
      hasProfile: !!archive.storage?.profile,
      hasRoomFocus: !!archive.storage?.roomFocus,
      importLength: document.querySelector("#saveImportText")?.value.length || 0,
      importPreview: document.querySelector("#saveImportStatus")?.textContent || "",
      previewValid: document.querySelector("#saveImportStatus")?.classList.contains("valid") || false,
      status: document.querySelector("#gameStatus")?.textContent || ""
    };
  })()`), 5000);
  if (exported.kind !== "summit-spark-save" || exported.schemaVersion !== 1 || !exported.hasSettings || !exported.hasProfile || !exported.hasRoomFocus || exported.importLength < 120 || !exported.previewValid || !/可导入/.test(exported.importPreview)) {
    errors.push("save archive export did not create a usable local archive: " + JSON.stringify(exported));
  }
  await waitUntil("save archive export status", () => evaluate(cdp, `/存档/.test(document.querySelector("#gameStatus")?.textContent || "")`), 5000);
  await evaluate(cdp, `(() => {
    const input = document.querySelector("#saveImportText");
    input.value = "{bad json";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  const invalidPreview = await evaluate(cdp, `(() => ({
    text: document.querySelector("#saveImportStatus")?.textContent || "",
    error: document.querySelector("#saveImportStatus")?.classList.contains("error") || false
  }))()`);
  if (!invalidPreview.error || !/JSON/.test(invalidPreview.text)) errors.push("invalid save JSON should show import preview error: " + JSON.stringify(invalidPreview));
  await clickSelector(cdp, "#saveImportButton");
  await sleep(360);
  const invalidImport = await evaluate(cdp, `(() => ({
    ready: document.documentElement.classList.contains("app-ready"),
    status: document.querySelector("#gameStatus")?.textContent || "",
    text: document.querySelector("#saveImportStatus")?.textContent || "",
    stillOpen: !document.querySelector("#settingsPanel").classList.contains("hidden")
  }))()`);
  if (!invalidImport.ready || !invalidImport.stillOpen || !/导入失败/.test(invalidImport.status) || !/JSON/.test(invalidImport.text)) {
    errors.push("invalid save import should fail in place without reload: " + JSON.stringify(invalidImport));
  }
  await evaluate(cdp, `(() => {
    const input = document.querySelector("#saveImportText");
    input.value = JSON.stringify({ kind: "other-save", storage: {} });
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  const wrongKindPreview = await evaluate(cdp, `(() => ({
    text: document.querySelector("#saveImportStatus")?.textContent || "",
    error: document.querySelector("#saveImportStatus")?.classList.contains("error") || false
  }))()`);
  if (!wrongKindPreview.error || !/summit-spark-save/.test(wrongKindPreview.text)) errors.push("wrong save kind should show import preview error: " + JSON.stringify(wrongKindPreview));

  const importArchive = {
    kind: "summit-spark-save",
    schemaVersion: 1,
    build: "browser-smoke",
    storage: {
      settings: { touchSize: 62, lowPerformance: true, gamepadDeadzone: 0.18, audioEnabled: false },
      profile: { summitClears: 2, bestDeathCount: 1, bestFlowPeak: 210, challengeWins: { clear: true } },
      roomBests: [12.5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      roomPaths: [[{ x: 20, y: 40, t: 0.1, dash: true, spark: false, over: false }]],
      roomFocus: { schemaVersion: 1, rooms: [{ faults: 3, fall: 3, drills: 2, cleanWins: 1, last: "fall" }] },
      bestTime: 55.25,
      bestFlow: 321
    }
  };
  await evaluate(cdp, `(() => {
    const input = document.querySelector("#saveImportText");
    input.value = ${JSON.stringify(JSON.stringify(importArchive))};
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  const validPreview = await evaluate(cdp, `(() => ({
    text: document.querySelector("#saveImportStatus")?.textContent || "",
    valid: document.querySelector("#saveImportStatus")?.classList.contains("valid") || false
  }))()`);
  if (!validPreview.valid || !/browser-smoke/.test(validPreview.text) || !/触控 62px/.test(validPreview.text)) {
    errors.push("valid save archive should show a useful import preview: " + JSON.stringify(validPreview));
  }
  await clickSelector(cdp, "#saveImportButton");
  await sleep(980);
  await waitForAppReady(cdp);
  const imported = await evaluate(cdp, `(() => {
    const settings = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    const profile = JSON.parse(localStorage.getItem("summit-spark-profile") || "{}");
    const focus = JSON.parse(localStorage.getItem("summit-spark-room-focus") || "{}");
    const backup = JSON.parse(localStorage.getItem("summit-spark-save-backup") || "{}");
    return {
      settingsVersion: settings.schemaVersion,
      touchSize: settings.touchSize,
      lowPerformance: settings.lowPerformance,
      deadzone: settings.gamepadDeadzone,
      profileVersion: profile.version,
      clears: profile.summitClears,
      focusVersion: focus.schemaVersion,
      focusRooms: Array.isArray(focus.rooms) ? focus.rooms.length : 0,
      bestFlow: Number(localStorage.getItem("summit-spark-best-flow") || 0),
      backupKind: backup.kind,
      backupReason: backup.reason,
      backupArchiveKind: backup.archive?.kind,
      backupOldTouchSize: backup.archive?.storage?.settings?.touchSize,
      stageTouchSize: getComputedStyle(document.querySelector(".stage")).getPropertyValue("--touch-size").trim()
    };
  })()`);
  if (imported.settingsVersion !== 2 || imported.touchSize !== 62 || !imported.lowPerformance || imported.deadzone !== 0.18 || imported.profileVersion !== 2 || imported.clears !== 2 || imported.focusVersion !== 2 || imported.focusRooms !== 10 || imported.bestFlow !== 321 || imported.backupKind !== "summit-spark-save-backup" || imported.backupReason !== "before-import" || imported.backupArchiveKind !== "summit-spark-save" || imported.backupOldTouchSize !== 48 || imported.stageTouchSize !== "62px") {
    errors.push("save archive import did not normalize and apply storage: " + JSON.stringify(imported));
  }
}

async function runVisualRegressionSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 640,
    deviceScaleFactor: 1,
    mobile: true
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("visual settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const visual = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const rect = panel.getBoundingClientRect();
    const controls = [...panel.querySelectorAll("button, select, textarea, output")].filter((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    }).map((el) => {
      const box = el.getBoundingClientRect();
      return {
        id: el.id || el.className || el.tagName,
        tag: el.tagName,
        width: Math.round(box.width),
        height: Math.round(box.height),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      };
    });
    const buttonOverflow = controls.filter((item) => item.tag === "BUTTON" && item.scrollWidth > item.clientWidth + 2);
    const tooSmall = controls.filter((item) => item.tag !== "TEXTAREA" && (item.width < 28 || item.height < 28));
    return {
      panelWidth: Math.round(rect.width),
      panelFits: rect.left >= -1 && rect.right <= window.innerWidth + 1 && rect.bottom <= window.innerHeight + 1,
      pageNoHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2 && document.body.scrollWidth <= window.innerWidth + 2,
      hasSaveImport: !!document.querySelector("#saveImportText"),
      hasSaveStatus: !!document.querySelector("#saveImportStatus"),
      hasFeedbackTemplate: !!document.querySelector("#feedbackTemplateButton"),
      buttonOverflow,
      tooSmall
    };
  })()`);
  if (!visual.panelFits || !visual.pageNoHorizontalOverflow || !visual.hasSaveImport || !visual.hasSaveStatus || !visual.hasFeedbackTemplate || visual.buttonOverflow.length || visual.tooSmall.length) {
    errors.push("mobile visual regression guard failed: " + JSON.stringify(visual));
  }
}

async function runMobileSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 700,
    deviceScaleFactor: 1,
    mobile: true
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("mobile settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const roomGroupOpen = await evaluate(cdp, `document.querySelector(".settings-group-room")?.open || false`);
  if (!roomGroupOpen) {
    await clickSelector(cdp, ".settings-group-room summary");
    await waitUntil("mobile room settings open", () => evaluate(cdp, `document.querySelector(".settings-group-room")?.open || false`));
  }
  const mobile = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel").getBoundingClientRect();
    const feel = getComputedStyle(document.querySelector("#feelLab")).gridTemplateColumns.split(" ").filter(Boolean).length;
    const cards = [...document.querySelectorAll(".feel-card, .route-contract-card")].slice(0, 6).map((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, scrollWidth: el.scrollWidth, height: rect.height };
    });
    const roomItems = [...document.querySelectorAll("#roomSelect, #roomBrief, .drill-variants, .settings-group-room .coach-row")].map((el) => {
      const rect = el.getBoundingClientRect();
      return { id: el.id || el.className, left: rect.left, right: rect.right, width: rect.width, scrollWidth: el.scrollWidth };
    });
    return {
      feelColumns: feel,
      panelFits: panel.left >= -1 && panel.right <= window.innerWidth + 1 && panel.bottom <= window.innerHeight + 1,
      cardsFit: cards.every((card) => card.scrollWidth <= card.width + 2 && card.height >= 44),
      roomItemsFit: roomItems.every((item) => item.left >= -1 && item.right <= window.innerWidth + 1),
      roomItems,
      coarsePointer: matchMedia("(pointer: coarse)").matches
    };
  })()`);
  if (mobile.feelColumns !== 1) errors.push("mobile Feel Lab should collapse to one column");
  if (!mobile.panelFits) errors.push("mobile settings panel overflows viewport");
  if (!mobile.cardsFit) errors.push("mobile route/feel cards have horizontal overflow or too-small hit targets");
  if (!mobile.roomItemsFit) errors.push("mobile room settings should not overflow horizontally: " + JSON.stringify(mobile.roomItems));
  if (!mobile.coarsePointer) errors.push("mobile smoke should emulate a coarse pointer");
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("mobile settings closes", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await clickSelector(cdp, "#startButton");
  await waitUntil("mobile game starts", () => evaluate(cdp, `document.querySelector("#overlay").classList.contains("hidden")`));
  const touchUi = await evaluate(cdp, `(() => {
    const touch = document.querySelector(".touch");
    const direction = document.querySelector(".touch-directions");
    const action = document.querySelector(".touch-actions");
    const stage = document.querySelector(".stage").getBoundingClientRect();
    const buttons = [...document.querySelectorAll("[data-touch]")].map((button) => {
      const rect = button.getBoundingClientRect();
      return { id: button.dataset.touch, width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
    });
    return {
      visible: getComputedStyle(touch).display !== "none",
      position: getComputedStyle(touch).position,
      directionGrid: getComputedStyle(direction).display === "grid",
      actionGrid: getComputedStyle(action).display === "grid",
      buttons,
      allButtonsLarge: buttons.every((button) => button.width >= 44 && button.height >= 44),
      detachedFromPlayfield: getComputedStyle(touch).position === "fixed" && buttons.every((button) => button.top >= stage.bottom + 4)
    };
  })()`);
  if (!touchUi.visible || !touchUi.directionGrid || !touchUi.actionGrid || !touchUi.allButtonsLarge || !touchUi.detachedFromPlayfield) {
    errors.push("touch controls should use visible direction/action grids with safe hit targets away from the portrait playfield: " + JSON.stringify(touchUi));
  }
}

async function runMobileLandscapeSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 700,
    height: 390,
    deviceScaleFactor: 1,
    mobile: true
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("mobile landscape settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const landscape = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel").getBoundingClientRect();
    return {
      panelFits: panel.left >= -1 && panel.right <= window.innerWidth + 1 && panel.bottom <= window.innerHeight + 1,
      deadzone: !!document.querySelector("#gamepadDeadzoneSlider"),
      touchSize: !!document.querySelector("#touchSizeSlider")
    };
  })()`);
  if (!landscape.panelFits) errors.push("mobile landscape settings panel overflows viewport");
  if (!landscape.deadzone || !landscape.touchSize) errors.push("mobile landscape should keep control accessibility settings visible");
  await clickSelector(cdp, "#settingsClose");
  await evaluate(cdp, `(() => {
    const overlay = document.querySelector("#overlay");
    overlay.classList.remove("hidden");
    overlay.innerHTML = '<h1>登顶</h1><p class="finish-line">0:30.00 · D 1 · Relay 3 · Flow 120</p><div class="review-grid">' +
      Array.from({ length: 9 }, (_, index) => '<article class="review-card ' + (index < 4 ? 'primary' : 'secondary') + '"><span>复盘项 ' + index + '</span><strong>长文本安全检查 R' + index + '</strong><p>这是一段用于横屏移动端滚动和断行的复盘内容，不能横向溢出。</p></article>').join('') +
      '</div><div class="review-actions"><button class="review-button primary-review" type="button">下一 Drill</button></div>';
  })()`);
  const review = await evaluate(cdp, `(() => {
    const overlay = document.querySelector("#overlay");
    const articles = [...document.querySelectorAll(".review-grid article")].map((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, scrollWidth: el.scrollWidth };
    });
    return {
      scrollSafe: getComputedStyle(overlay).overflowY === "auto" && overlay.scrollHeight >= overlay.clientHeight,
      noHorizontalOverflow: articles.every((item) => item.scrollWidth <= item.width + 2),
      primaryCount: document.querySelectorAll(".review-card.primary").length
    };
  })()`);
  if (!review.scrollSafe) errors.push("finish review overlay should remain vertically scroll-safe on mobile landscape");
  if (!review.noHorizontalOverflow) errors.push("finish review cards overflow horizontally on mobile landscape");
  if (review.primaryCount < 4) errors.push("finish review should preserve primary card priority markers");
}

async function runGamepadSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await evaluate(cdp, `localStorage.setItem("summit-spark-settings", JSON.stringify({ gamepadDeadzone: 0.4, audioEnabled: false }))`);
  await cdp.send("Page.navigate", { url: baseUrl + "/" });
  await waitForAppReady(cdp);
  await evaluate(cdp, `(() => {
    window.__summitMockPadState.buttons[0].pressed = true;
    window.__summitMockPadState.buttons[0].value = 1;
  })()`);
  await waitUntil("gamepad button starts game", () => evaluate(cdp, `document.querySelector("#overlay").classList.contains("hidden")`), 5000);
  await evaluate(cdp, `(() => {
    window.__summitMockPadState.buttons[0].pressed = false;
    window.__summitMockPadState.buttons[0].value = 0;
    window.__summitMockPadState.axes[0] = 0;
  })()`);
  await enableDebugPanel(cdp);
  const beforeAxis = await debugPosition(cdp);
  await evaluate(cdp, `window.__summitMockPadState.axes[0] = 0.34`);
  await sleep(480);
  const blocked = await debugPosition(cdp);
  if (blocked.x - beforeAxis.x > 4) errors.push("gamepad deadzone 0.40 should block 0.34 axis drift");
  const padStatus = await evaluate(cdp, `document.querySelector("#gamepadStatus")?.textContent || ""`);
  if (!/轴 0\.34/.test(padStatus) || !/接近死区/.test(padStatus)) errors.push("gamepad status should expose axis magnitude and drift risk: " + padStatus);
  await evaluate(cdp, `(() => {
    const slider = document.querySelector("#gamepadDeadzoneSlider");
    slider.value = "0.16";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await sleep(640);
  const moved = await debugPosition(cdp);
  if (moved.x - blocked.x < 8) errors.push("gamepad mock did not move player after lowering deadzone");
  if (!/pad dz 0\.16/.test(moved.text)) errors.push("debug panel did not report updated gamepad deadzone");
}

async function waitForDebuggingPort(port, child) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < 8000) {
    if (child.exitCode !== null) break;
    try {
      return await requestJson(`http://127.0.0.1:${port}/json/version`);
    } catch (error) {
      last = error.message;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  throw new Error("Chrome debugging port did not open: " + last);
}

async function main() {
  const browserPath = findBrowser();
  if (!browserPath) {
    throw new Error("No Chrome/Edge executable found. Set BROWSER_EXECUTABLE_PATH to run browser smoke.");
  }

  const serverPort = await findFreePort();
  const debugPort = await findFreePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "summit-spark-browser-"));
  const baseUrl = "http://127.0.0.1:" + serverPort;
  const server = childProcess.spawn(process.execPath, ["game-server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(serverPort) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const browser = childProcess.spawn(browserPath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-extensions",
    "--mute-audio",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=" + debugPort,
    "--user-data-dir=" + userDataDir,
    "about:blank"
  ], { stdio: ["ignore", "pipe", "pipe"] });
  let cdp = null;

  try {
    await waitUntil("local server", () => requestText(baseUrl + "/").then(Boolean), 7000);
    await waitForDebuggingPort(debugPort, browser);
    const target = await requestJson(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl + "/")}`, "PUT");
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.ready();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Input.setIgnoreInputEvents", { ignore: false });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => {
        const makeButtons = () => Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
        window.__summitMockPadState = { axes: [0, 0, 0, 0], buttons: makeButtons(), connected: true, mapping: "standard" };
        Object.defineProperty(Navigator.prototype, "getGamepads", {
          configurable: true,
          value() {
            return [window.__summitMockPadState];
          }
        });
      })();`
    });

    await runDesktopSmoke(cdp, baseUrl);
    await runKeyboardSettingsSmoke(cdp, baseUrl);
    await runResumeSmoke(cdp, baseUrl);
    await runTrainingInterruptionSmoke(cdp, baseUrl);
    await runStorageSmoke(cdp, baseUrl);
    await runSaveArchiveSmoke(cdp, baseUrl);
    await runVisualRegressionSmoke(cdp, baseUrl);
    await runMobileSmoke(cdp, baseUrl);
    await runMobileLandscapeSmoke(cdp, baseUrl);
    await runGamepadSmoke(cdp, baseUrl);
  } finally {
    if (cdp) cdp.close();
    await killProcess(browser);
    await killProcess(server);
    removeTempDir(userDataDir);
  }

  if (errors.length > 0) {
    console.error("Browser smoke failed:");
    for (const error of errors) console.error("- " + error);
    process.exit(1);
  }
  console.log("Browser smoke passed: desktop interactions, keyboard settings, diagnostics/template snapshot, canvas/movement, direct resume, Route/Feel interruption resume, storage recovery, save import/export with preview, invalid import guard, mobile visual guard, mobile portrait/landscape, gamepad deadzone.");
}

main().catch((error) => {
  console.error("Browser smoke failed:");
  console.error("- " + error.message);
  process.exit(1);
});
