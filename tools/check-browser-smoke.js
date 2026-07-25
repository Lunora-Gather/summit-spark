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

let navigationId = 0;

async function navigateApp(cdp, baseUrl, label = "app") {
  navigationId += 1;
  const url = `${baseUrl}/?smoke=${navigationId}`;
  await cdp.send("Page.navigate", { url });
  await waitUntil(label + " navigation", () => evaluate(cdp, `location.href === ${JSON.stringify(url)}`), 7000);
  await waitForAppReady(cdp);
}

async function targetPoint(cdp, selector) {
  let lastProbe = null;
  const rect = await waitUntil("click target " + selector, async () => {
    lastProbe = await evaluate(cdp, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "center" });
    const panel = el.closest(".settings-panel");
    const probe = () => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2));
      const y = Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2));
      const visual = window.visualViewport || { offsetLeft: 0, offsetTop: 0, width: window.innerWidth, height: window.innerHeight };
      const inputX = Math.max(1, Math.min((visual.width || window.innerWidth) - 1, x - (visual.offsetLeft || 0)));
      const inputY = Math.max(1, Math.min((visual.height || window.innerHeight) - 1, y - (visual.offsetTop || 0)));
      const hit = document.elementFromPoint(x, y);
      const clickable = Boolean(hit && (hit === el || el.contains(hit) || hit.closest(${JSON.stringify(selector)})));
      const visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      return {
        rect: { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) },
        x,
        y,
        inputX,
        inputY,
        clickable,
        visible,
        hit: hit ? { tag: hit.tagName, id: hit.id, className: String(hit.className || ""), text: String(hit.textContent || "").slice(0, 80) } : null,
        display: getComputedStyle(el).display,
        visibility: getComputedStyle(el).visibility,
        pointerEvents: getComputedStyle(el).pointerEvents
      };
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
    return result;
  })()`);
    if (lastProbe && lastProbe.visible && !lastProbe.clickable) throw new Error(JSON.stringify(lastProbe));
    return lastProbe && lastProbe.clickable ? { x: lastProbe.x, y: lastProbe.y, inputX: lastProbe.inputX, inputY: lastProbe.inputY, width: lastProbe.rect.width, height: lastProbe.rect.height, clickable: lastProbe.clickable } : null;
  }, 4000);
  if (!rect || rect.width <= 0 || rect.height <= 0) throw new Error("Cannot click missing/hidden selector " + selector + ": " + JSON.stringify(lastProbe));
  if (!rect.clickable) throw new Error("Cannot click occluded selector " + selector);
  return rect;
}

async function clickSelector(cdp, selector) {
  const rect = await targetPoint(cdp, selector);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
}

async function tapSelector(cdp, selector) {
  const rect = await targetPoint(cdp, selector);
  const touchPoint = { x: rect.inputX, y: rect.inputY, id: 1, radiusX: 2, radiusY: 2, force: 1 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touchPoint] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(80);
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
  const named = { Enter: 13, Escape: 27, Tab: 9, F3: 114, Space: 32 };
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
  await navigateApp(cdp, baseUrl, "desktop smoke");
  await waitUntil("entry chooser after session check", () => evaluate(cdp, `(() => {
    const gate = document.querySelector("#entryGate");
    return !!gate && !gate.classList.contains("hidden") && !document.querySelector("#overlay")?.classList.contains("entry-checking");
  })()`), 7000);
  const entryChoice = await evaluate(cdp, `(() => {
    const gate = document.querySelector("#entryGate");
    const guest = document.querySelector("#guestEntryButton");
    const account = document.querySelector("#accountEntryButton");
    const gateRect = gate?.getBoundingClientRect();
    return {
      visible: !!gate && gateRect.width > 0 && gateRect.height > 0,
      guest: guest?.textContent || "",
      account: account?.textContent || "",
      startPending: document.querySelector("#startPanel")?.classList.contains("entry-pending") || false,
      fits: !!gateRect && gateRect.left >= 0 && gateRect.right <= innerWidth && gateRect.bottom <= innerHeight
    };
  })()`);
  if (!entryChoice.visible || !entryChoice.startPending || !entryChoice.fits || !/仅保存在此设备/.test(entryChoice.guest) || !/云端保存/.test(entryChoice.account)) {
    errors.push("entry should clearly offer adaptive guest and cloud-save choices: " + JSON.stringify(entryChoice));
  }
  await clickSelector(cdp, "#guestEntryButton");
  await waitUntil("guest entry resolves", () => evaluate(cdp, `document.querySelector("#entryGate").classList.contains("hidden") && !document.querySelector("#startPanel").classList.contains("entry-pending")`));
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  });
  const reducedMotionState = await waitUntil("reduced motion preference", () => evaluate(cdp, `(() => {
    const stage = document.querySelector(".stage");
    const canvas = document.querySelector("#game");
    return stage.classList.contains("reduced-motion")
      ? { matches: matchMedia("(prefers-reduced-motion: reduce)").matches, stageClass: true, canvasTransition: getComputedStyle(canvas).transitionDuration, transitionSeconds: parseFloat(getComputedStyle(canvas).transitionDuration) }
      : null;
  })()`));
  if (!reducedMotionState.matches || !reducedMotionState.stageClass || !Number.isFinite(reducedMotionState.transitionSeconds) || reducedMotionState.transitionSeconds > 0.001) {
    errors.push("system reduced-motion preference should quiet both UI transitions and nonessential canvas ambience: " + JSON.stringify(reducedMotionState));
  }
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }]
  });
  await waitUntil("reduced motion preference clears", () => evaluate(cdp, `!document.querySelector(".stage").classList.contains("reduced-motion")`));
  const initial = await evaluate(cdp, `({
    build: document.querySelector('meta[name="build-version"]')?.content || "",
    ready: document.documentElement.classList.contains("app-ready"),
    startVisible: !!document.querySelector("#startButton"),
    overlayAvailable: document.querySelector("#overlay")?.hidden === false
      && !document.querySelector("#overlay")?.hasAttribute("inert")
      && document.querySelector("#overlay")?.getAttribute("aria-hidden") === "false",
    gameSurfaceHidden: document.querySelector("#gameHud")?.hasAttribute("inert")
      && document.querySelector("#touchControls")?.hasAttribute("inert")
      && document.querySelector("#gameHud")?.hidden === true
      && document.querySelector("#touchControls")?.hidden === true
      && getComputedStyle(document.querySelector("#gameHud"))?.display === "none"
      && getComputedStyle(document.querySelector("#touchControls"))?.display === "none"
      && document.querySelector("#game")?.tabIndex === -1
      && document.querySelector("#game")?.getAttribute("aria-hidden") === "true",
    canvasSize: (() => {
      const rect = document.querySelector("#game").getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    })(),
    startActionLayout: (() => {
      const primary = document.querySelector("#startButton").getBoundingClientRect();
      const practice = document.querySelector("#openTrainingButton").getBoundingClientRect();
      return { primaryWidth: Math.round(primary.width), practiceWidth: Math.round(practice.width) };
    })()
  })`);
  if (!/^\d{8}-p\d+$/.test(initial.build)) errors.push("browser smoke found invalid build version " + initial.build);
  if (!initial.ready || !initial.overlayAvailable || !initial.gameSurfaceHidden || initial.canvasSize.width < 300 || initial.canvasSize.height < 160) errors.push("browser smoke initial canvas/start state is invalid or exposed behind overlay: " + JSON.stringify(initial));
  if (initial.startActionLayout.primaryWidth < initial.startActionLayout.practiceWidth * 1.8) errors.push("primary start action should span the full two-column menu row: " + JSON.stringify(initial.startActionLayout));

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
      timeVisible: visible("#runTime"),
      gameSurfaceAvailable: !document.querySelector("#gameHud")?.hasAttribute("inert")
        && !document.querySelector("#touchControls")?.hasAttribute("inert")
        && document.querySelector("#gameHud")?.hidden === false
        && document.querySelector("#touchControls")?.hidden === false
        && document.querySelector("#game")?.tabIndex === 0
        && document.querySelector("#game")?.getAttribute("aria-hidden") === "false",
      overlayHidden: document.querySelector("#overlay")?.hidden === true
        && document.querySelector("#overlay")?.hasAttribute("inert")
        && document.querySelector("#overlay")?.getAttribute("aria-hidden") === "true"
    };
  })()`);
  if (!quietHud.freePlay || quietHud.trainingActive || quietHud.splitTimeVisible || quietHud.splitDeltaVisible || quietHud.flowVisible || quietHud.paceVisible || !quietHud.roomVisible || !quietHud.timeVisible || !quietHud.gameSurfaceAvailable || !quietHud.overlayHidden) {
    errors.push("free-play HUD should hide advanced timing/flow meters while keeping core status: " + JSON.stringify(quietHud));
  }
  await clickSelector(cdp, "#settingsButton");
  await waitUntil("settings open after start", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings") && document.querySelector("#gameHud").hasAttribute("inert") && document.querySelector("#game").tabIndex === -1`));
  await openSettingsGroup(cdp, ".settings-group-audio");
  const settingsAccordion = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    return {
      audioOpen: document.querySelector(".settings-group-audio").open,
      controlsClosed: !document.querySelector(".settings-group-controls").open,
      displayClosed: !document.querySelector(".settings-group-display").open,
      feedbackClosed: !document.querySelector(".settings-group-feedback").open,
      noForcedScroll: panel.scrollHeight <= panel.clientHeight + 2
    };
  })()`);
  if (!settingsAccordion.audioOpen || !settingsAccordion.controlsClosed || !settingsAccordion.displayClosed || !settingsAccordion.feedbackClosed || !settingsAccordion.noForcedScroll) {
    errors.push("settings-only groups should keep a compact single-open accordion: " + JSON.stringify(settingsAccordion));
  }
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("settings close after start", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && !document.querySelector("#gameHud").hasAttribute("inert") && document.querySelector("#game").tabIndex === 0`));
  await enableDebugPanel(cdp);
  const beforeMove = await debugPosition(cdp);
  await keyHold(cdp, "KeyD", "D", 360);
  const afterMove = await debugPosition(cdp);
  const moved = afterMove.x - beforeMove.x;
  if (moved < 8) errors.push("keyboard movement did not shift player enough: " + moved.toFixed(2));
  await clickSelector(cdp, "#settingsButton");
  await waitUntil("settings pause opens after timed movement", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const pausedClockStart = await evaluate(cdp, `document.querySelector("#runTime").textContent`);
  await sleep(360);
  const pausedClockEnd = await evaluate(cdp, `document.querySelector("#runTime").textContent`);
  if (pausedClockEnd !== pausedClockStart) errors.push("run timer advanced while settings paused the game: " + pausedClockStart + " -> " + pausedClockEnd);
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("settings pause closes after timer check", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const retryDeathsBefore = await evaluate(cdp, `document.querySelector("#deathCount").textContent`);
  await keyTap(cdp, "KeyR", "R");
  const retryState = await waitUntil("quick retry status", () => evaluate(cdp, `(() => {
    const status = document.querySelector("#gameStatus").textContent;
    const deaths = document.querySelector("#deathCount").textContent;
    return /快速重开 · R1/.test(status) && deaths !== ${JSON.stringify(retryDeathsBefore)}
      ? { status, deaths }
      : null;
  })()`));
  if (!/失 1/.test(retryState.deaths)) errors.push("quick retry should increment the visible mistake count once: " + JSON.stringify({ retryDeathsBefore, retryState }));
  const gameplayCanvas = await canvasInkSummary(cdp);
  if (gameplayCanvas.varied < 20 || gameplayCanvas.bright < 20) errors.push("canvas appears blank during gameplay: " + JSON.stringify(gameplayCanvas));
  await navigateApp(cdp, baseUrl, "desktop reset");
  await tapSelector(cdp, "#openTrainingButton");
  await waitUntil("practice panel open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  const cockpit = await evaluate(cdp, `(() => {
    const visible = (selector) => {
      const el = document.querySelector(selector);
      return !!el && getComputedStyle(el).display !== "none";
    };
    return {
    routeCards: document.querySelectorAll("[data-route-contract]").length,
    feelCards: document.querySelectorAll("[data-feel-fixture]").length,
    modePractice: document.querySelector("#settingsPanel").classList.contains("mode-practice"),
    title: document.querySelector("#panelTitle")?.textContent || "",
    practiceVisible: visible(".settings-group-training") && visible(".settings-group-room"),
    redundantPriorityRemoved: !document.querySelector("#practicePriority"),
    settingsHidden: !visible(".settings-group-controls") && !visible(".settings-group-feedback"),
    groups: document.querySelectorAll(".settings-group").length,
    systemList: getComputedStyle(document.querySelector(".settings-body")).display === "block",
    panelWidthCalm: document.querySelector("#settingsPanel").getBoundingClientRect().width <= 700,
    panelSurface: getComputedStyle(document.querySelector("#settingsPanel")).backgroundImage,
    actionTray: (() => {
      const tray = getComputedStyle(document.querySelector(".hud-actions"));
      const practice = getComputedStyle(document.querySelector("#practiceButton"));
      return {
        trayBackground: tray.backgroundImage,
        trayShadow: tray.boxShadow,
        buttonBackground: practice.backgroundImage,
        buttonRadius: practice.borderRadius
      };
    })(),
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
    };
  })()`);
  if (cockpit.routeCards < 3) errors.push("practice panel should expose at least three route contracts");
  if (cockpit.feelCards < 4) errors.push("practice panel should expose visible feel calibration cards");
  if (!cockpit.modePractice || !/练习/.test(cockpit.title) || !cockpit.practiceVisible || !cockpit.settingsHidden || !cockpit.redundantPriorityRemoved) errors.push("practice panel should be separate from quiet settings without a duplicate recommendation card: " + JSON.stringify(cockpit));
  if (cockpit.groups < 7) errors.push("practice/settings panel should keep the full grouped surface in DOM: " + JSON.stringify(cockpit));
  if (!cockpit.systemList || !cockpit.panelWidthCalm || !/235, 241, 238/.test(cockpit.panelSurface)) errors.push("practice panel should render as a restrained adaptive training sheet: " + JSON.stringify(cockpit));
  if (cockpit.actionTray.trayBackground !== "none" || cockpit.actionTray.trayShadow !== "none" || !/103, 142, 121/.test(cockpit.actionTray.buttonBackground) || cockpit.actionTray.buttonRadius !== "11px") errors.push("upper-right actions should remain unboxed, individually surfaced tools with a restrained practice-active state: " + JSON.stringify(cockpit.actionTray));
  if (cockpit.panelBox.overflow) errors.push("practice panel overflows desktop viewport: " + JSON.stringify(cockpit.panelBox));
  await openSettingsGroup(cdp, ".settings-group-advanced");
  await clickSelector(cdp, "#focusResetButton");
  const resetArmed = await evaluate(cdp, `document.querySelector("#focusResetButton").textContent.trim()`);
  if (resetArmed !== "确认清空") errors.push("advanced reset should retain its first-step confirmation after being moved out of the launch dock: " + resetArmed);
  await clickSelector(cdp, "#focusResetButton");
  const resetComplete = await waitUntil("advanced reset completes", () => evaluate(cdp, `(() => {
    const status = document.querySelector("#gameStatus").textContent;
    const label = document.querySelector("#focusResetButton").textContent.trim();
    return /统计已清空/.test(status) && label === "清空" ? { status, label } : null;
  })()`));
  if (!/统计已清空/.test(resetComplete.status) || resetComplete.label !== "清空") errors.push("advanced reset should finish and return to its concise label: " + JSON.stringify(resetComplete));
  await evaluate(cdp, `document.querySelector(".settings-group-advanced").open = false`);
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("practice panel closes", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));

  await clickSelector(cdp, "#startSettingsButton");
  await waitUntil("quiet settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  const settingsAudit = await evaluate(cdp, `(() => {
    const visible = (selector) => {
      const el = document.querySelector(selector);
      return !!el && getComputedStyle(el).display !== "none";
    };
    const rect = document.querySelector("#settingsPanel").getBoundingClientRect();
    const displayRect = document.querySelector(".settings-group-display").getBoundingClientRect();
    const feedbackRect = document.querySelector(".settings-group-feedback").getBoundingClientRect();
    return {
      title: document.querySelector("#panelTitle")?.textContent || "",
      modeSettings: document.querySelector("#settingsPanel").classList.contains("mode-settings"),
      settingsVisible: visible(".settings-group-controls") && visible(".settings-group-feedback"),
      practiceHidden: !visible(".settings-group-training") && !visible(".settings-group-room"),
      defaultOpenGroups: [...document.querySelectorAll(".settings-group[open]")].map((group) => group.className),
      audioButton: visible("#audioTestButton"),
      diagnosticsButton: visible("#diagnosticsButton"),
      feedbackTemplateButton: visible("#feedbackTemplateButton"),
      saveExportButton: visible("#saveExportButton"),
      saveImportButton: visible("#saveImportButton"),
      saveRestoreButton: visible("#saveRestoreButton"),
      restoreDisabled: document.querySelector("#saveRestoreButton")?.disabled || false,
      gamepadStatus: document.querySelector("#gamepadStatus")?.textContent || "",
      gamepadDeadzone: visible("#gamepadDeadzoneSlider"),
      systemList: getComputedStyle(document.querySelector(".settings-body")).display === "block",
      panelWidthCalm: rect.width <= 560,
      displayToFeedbackGap: Math.round(feedbackRect.top - displayRect.bottom),
      panelBox: {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        overflow: rect.right > window.innerWidth + 1 || rect.left < -1 || rect.bottom > window.innerHeight + 1
      }
    };
  })()`);
  if (!settingsAudit.modeSettings || !/设置/.test(settingsAudit.title) || !settingsAudit.settingsVisible || !settingsAudit.practiceHidden) errors.push("settings panel should hide practice surfaces: " + JSON.stringify(settingsAudit));
  if (settingsAudit.defaultOpenGroups.length !== 1 || !settingsAudit.defaultOpenGroups[0].includes("settings-group-controls")) errors.push("settings should default to controls-first system groups: " + JSON.stringify(settingsAudit));
  if (!settingsAudit.audioButton) errors.push("settings should expose audio test button");
  if (!settingsAudit.diagnosticsButton) errors.push("settings should expose diagnostics copy button");
  if (!settingsAudit.feedbackTemplateButton) errors.push("settings should expose feedback template copy button");
  if (!settingsAudit.saveExportButton || !settingsAudit.saveImportButton || !settingsAudit.saveRestoreButton) errors.push("settings should expose save export/import/restore buttons");
  if (!settingsAudit.restoreDisabled) errors.push("restore should start disabled when no import backup exists");
  if (!/未连接|standard|不支持|未检测/.test(settingsAudit.gamepadStatus)) errors.push("settings should expose non-sensitive gamepad status: " + settingsAudit.gamepadStatus);
  if (!settingsAudit.gamepadDeadzone) errors.push("settings should expose gamepad deadzone control");
  if (!settingsAudit.systemList || !settingsAudit.panelWidthCalm) errors.push("settings should render as a calm one-column system list: " + JSON.stringify(settingsAudit));
  if (settingsAudit.displayToFeedbackGap < 14) errors.push("feedback/save section should be visually separated from display settings: " + JSON.stringify(settingsAudit));
  const comfortControls = await evaluate(cdp, `({
    lowPerformance: !!document.querySelector("#lowPerformanceToggle"),
    touchSize: !!document.querySelector("#touchSizeSlider")
  })`);
  if (!comfortControls.lowPerformance) errors.push("settings should expose low-performance toggle");
  if (!comfortControls.touchSize) errors.push("settings should expose touch-size slider");
  if (settingsAudit.panelBox.overflow) errors.push("settings panel overflows desktop viewport: " + JSON.stringify(settingsAudit.panelBox));

  const macLayoutApplied = await evaluate(cdp, `(() => {
    const select = document.querySelector("#keyboardLayout");
    select.value = "mac";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    return {
      layout: saved.keyboardLayout,
      preset: saved.controlsPreset,
      left: document.querySelector('[data-binding-action="left"] kbd')?.textContent.trim(),
      profile: document.querySelector("#controlProfileNote")?.textContent || "",
      visibleBindings: document.querySelectorAll("[data-binding-action]").length
    };
  })()`);
  if (macLayoutApplied.layout !== "mac" || macLayoutApplied.preset !== "comfort" || macLayoutApplied.left !== "A" || !/避开.*⌘.*⌥/.test(macLayoutApplied.profile) || macLayoutApplied.visibleBindings < 10) {
    errors.push("keyboard layout selection should preserve the Mac-safe comfort profile: " + JSON.stringify(macLayoutApplied));
  }
  await clickSelector(cdp, '[data-preset-choice="classic"]');
  const classicBindings = await evaluate(cdp, `(() => Object.fromEntries(
    ["left", "up", "jump", "dash", "grab"].map((action) => [
      action,
      document.querySelector('[data-binding-action="' + action + '"] kbd')?.textContent.trim()
    ])
  ))()`);
  if (classicBindings.left !== "←" || classicBindings.up !== "↑" || classicBindings.jump !== "C" || classicBindings.dash !== "X" || classicBindings.grab !== "Z") {
    errors.push("classic preset should expose Celeste-style arrows plus C/X/Z: " + JSON.stringify(classicBindings));
  }
  await clickSelector(cdp, '[data-preset-choice="comfort"]');
  const comfortBindings = await evaluate(cdp, `(() => Object.fromEntries(
    ["left", "up", "jump", "dash", "grab"].map((action) => [
      action,
      document.querySelector('[data-binding-action="' + action + '"] kbd')?.textContent.trim()
    ])
  ))()`);
  if (comfortBindings.left !== "A" || comfortBindings.up !== "W" || comfortBindings.jump !== "Space" || comfortBindings.dash !== "K" || comfortBindings.grab !== "J") {
    errors.push("comfort preset should split WASD movement from Space/J/K actions: " + JSON.stringify(comfortBindings));
  }
  await clickSelector(cdp, '[data-binding-action="jump"]');
  await keyTap(cdp, "KeyF", "f");
  const reboundJump = await evaluate(cdp, `(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    return {
      code: saved.customBindings?.jump,
      label: document.querySelector('[data-binding-action="jump"] kbd')?.textContent.trim(),
      status: document.querySelector("#keyBindingStatus")?.textContent || ""
    };
  })()`);
  if (reboundJump.code !== "KeyF" || reboundJump.label !== "F" || !/跳跃/.test(reboundJump.status)) {
    errors.push("click-to-rebind should persist and render the captured keyboard key: " + JSON.stringify(reboundJump));
  }
  await clickSelector(cdp, "#resetKeyBindings");
  const resetBindings = await evaluate(cdp, `(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    return {
      jump: saved.customBindings?.jump,
      left: saved.customBindings?.left,
      layout: saved.keyboardLayout
    };
  })()`);
  if (resetBindings.layout !== "mac" || resetBindings.jump !== "Space" || resetBindings.left !== "ArrowLeft") {
    errors.push("binding reset should restore the selected keyboard layout: " + JSON.stringify(resetBindings));
  }

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

  await clickSelector(cdp, "#settingsClose");
  await waitUntil("quiet settings closes before practice", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("practice panel opens for feel", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  await evaluate(cdp, `document.querySelector(".settings-group-training")?.scrollIntoView({ block: "start" })`);
  await sleep(160);
  await clickSelector(cdp, "[data-feel-fixture]");
  await waitUntil("feel fixture launch", () => evaluate(cdp, `/手感校准/.test(document.querySelector("#gameStatus").textContent)`));
  await clickSelector(cdp, "#practiceButton");
  await waitUntil("practice reopened after feel fixture", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
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
    room: document.querySelector("#roomCount").textContent,
    hudBackground: getComputedStyle(document.querySelector(".meters")).backgroundImage,
    counterBackground: getComputedStyle(document.querySelector(".counter")).backgroundColor,
    actionSurface: getComputedStyle(document.querySelector(".icon-button")).backgroundImage
  })`);
  if (!gameplay.overlayHidden || !gameplay.room) errors.push("gameplay did not remain active after route contract launch");
  if (!/48, 73, 87/.test(gameplay.hudBackground) || !/227, 239, 234/.test(gameplay.counterBackground) || !/55, 80, 92/.test(gameplay.actionSurface)) errors.push("desktop HUD should use the refined deep-mist surface system instead of near-black slabs: " + JSON.stringify(gameplay));

  await navigateApp(cdp, baseUrl, "selected room Drill action");
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("selected room practice opens", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-room");
  await evaluate(cdp, `(() => {
    const select = document.querySelector("#roomSelect");
    select.value = "1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitUntil("room selector previews R2 without launching", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#roomSelect").value === "1" && document.querySelector("#roomCount").textContent.startsWith("R1/")`));
  const selectedRoomAction = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel").getBoundingClientRect();
    const button = document.querySelector("#focusRoomButton").getBoundingClientRect();
    const dock = document.querySelector("#practiceLaunchDock").getBoundingClientRect();
    const body = document.querySelector("#settingsPanel .settings-body");
    return {
      selected: document.querySelector("#roomSelect").value,
      label: document.querySelector("#focusRoomButton").textContent.trim(),
      roomBrief: document.querySelector("#roomBrief").textContent.trim(),
      singleDockAction: document.querySelectorAll("#practiceLaunchDock button").length === 1,
      launchInsidePanel: button.top >= panel.top && button.bottom <= panel.bottom && dock.bottom <= panel.bottom,
      launchHeight: Math.round(button.height),
      bodyScrolls: ["auto", "scroll"].includes(getComputedStyle(body).overflowY)
    };
  })()`);
  if (selectedRoomAction.selected !== "1" || !/^开始 R2 /.test(selectedRoomAction.label) || !/R2 光继横桥/.test(selectedRoomAction.roomBrief) || /R10 星顶终线/.test(selectedRoomAction.roomBrief) || !selectedRoomAction.singleDockAction || !selectedRoomAction.launchInsidePanel || selectedRoomAction.launchHeight < 42 || !selectedRoomAction.bodyScrolls) errors.push("room selection should preview R2 while the fixed dock keeps one clear launch action: " + JSON.stringify(selectedRoomAction));
  await clickSelector(cdp, "#focusRoomButton");
  await waitUntil("selected room action starts R2 Drill", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && /Drill R2/.test(document.querySelector("#gameStatus").textContent)`));

  await navigateApp(cdp, baseUrl, "first-run keyboard onboarding seed");
  await evaluate(cdp, `localStorage.clear()`);
  await navigateApp(cdp, baseUrl, "first-run keyboard onboarding clean");
  await clickSelector(cdp, "#startButton");
  const quietOnboarding = await evaluate(cdp, `({
    controlHintRemoved: !document.querySelector("#controlHint"),
    ordinaryTipHidden: document.querySelector("#gameTip").classList.contains("hidden")
  })`);
  if (!quietOnboarding.controlHintRemoved || !quietOnboarding.ordinaryTipHidden) errors.push("first-run play should start without redundant move/jump/dash strips or coach cards: " + JSON.stringify(quietOnboarding));
  await keyHold(cdp, "KeyD", "D", 180);
  await keyTap(cdp, "Space", " ");
  await keyTap(cdp, "KeyX", "X");
  const afterInputsTipHidden = await evaluate(cdp, `document.querySelector("#gameTip").classList.contains("hidden")`);
  if (!afterInputsTipHidden) errors.push("ordinary movement inputs should not raise a coaching card");
}

async function runAuthenticatedRefreshSmoke(cdp, baseUrl) {
  await evaluate(cdp, `sessionStorage.setItem("summit-spark-entry-mode", "account")`);
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        async get() { return { $id: "smoke-user", email: "signed-in@example.com" }; }
      }
      class TablesDB {
        async getRow() { throw { code: 500, message: "smoke cloud read skipped" }; }
      }
      window.Appwrite = { Client, Account, TablesDB };
    })();`
  });
  try {
    await navigateApp(cdp, baseUrl, "authenticated refresh seed");
    await waitUntil("authenticated session restored", () => evaluate(cdp, `(() => (
      document.querySelector("#entryGate")?.classList.contains("hidden")
      && !document.querySelector("#startPanel")?.classList.contains("entry-pending")
      && document.querySelector("#accountEmailLabel")?.textContent === "signed-in@example.com"
    ))()`), 7000);
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitForAppReady(cdp);
    const refreshed = await waitUntil("authenticated refresh remains past entry chooser", () => evaluate(cdp, `(() => {
      const gate = document.querySelector("#entryGate");
      const start = document.querySelector("#startPanel");
      const overlay = document.querySelector("#overlay");
      const email = document.querySelector("#accountEmailLabel")?.textContent || "";
      if (!gate || !start || overlay?.classList.contains("entry-checking")) return null;
      return {
        gateHidden: gate.classList.contains("hidden"),
        startReady: !start.classList.contains("entry-pending"),
        email
      };
    })()`), 7000);
    if (!refreshed.gateHidden || !refreshed.startReady || refreshed.email !== "signed-in@example.com") {
      errors.push("authenticated refresh should bypass the guest/login chooser: " + JSON.stringify(refreshed));
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await evaluate(cdp, `sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runResumeSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await navigateApp(cdp, baseUrl, "direct resume seed");
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
  await navigateApp(cdp, baseUrl, "direct resume reload");
  const startState = await evaluate(cdp, `({
    resumeVisible: !!document.querySelector("#resumeTrainingButton") && !document.querySelector("#resumeTrainingButton").classList.contains("hidden"),
    resumeText: document.querySelector("#resumeTrainingButton")?.textContent || "",
    lowPerformance: document.querySelector(".stage").classList.contains("low-performance"),
    touchSize: getComputedStyle(document.querySelector(".stage")).getPropertyValue("--touch-size").trim(),
    settingsVersion: JSON.parse(localStorage.getItem("summit-spark-settings")).schemaVersion,
    focusVersion: JSON.parse(localStorage.getItem("summit-spark-room-focus")).schemaVersion
  })`);
  if (!startState.resumeVisible || !/继续训练 · R/.test(startState.resumeText)) errors.push("start overlay should distinguish direct training resume from free play");
  if (!startState.lowPerformance || startState.touchSize !== "62px") errors.push("comfort settings did not apply from stored settings: " + JSON.stringify(startState));
  if (startState.settingsVersion !== 3 || startState.focusVersion !== 2) errors.push("stored settings/focus should migrate to current schema: " + JSON.stringify(startState));
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
  await navigateApp(cdp, baseUrl, "keyboard settings");
  await evaluate(cdp, `localStorage.clear()`);
  await navigateApp(cdp, baseUrl, "keyboard settings clean");

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
    return panel.classList.contains("hidden") && button.getAttribute("aria-expanded") === "false" && document.activeElement === document.querySelector("#startButton");
  })()`), 3500);

  await clickSelector(cdp, "#startSettingsButton");
  await waitUntil("pointer-opened settings focuses close", () => evaluate(cdp, `document.activeElement === document.querySelector("#settingsClose")`), 3500);
  await openSettingsGroup(cdp, ".settings-group-audio");
  await clickSelector(cdp, "#audioTestButton");
  await waitUntil("modal action keeps focus inside panel", () => evaluate(cdp, `document.querySelector("#settingsPanel").contains(document.activeElement)`), 3500);
  await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const visible = [...panel.querySelectorAll("button, select, input, textarea, summary, [tabindex]")].filter((element) => element.getClientRects().length > 0 && !element.disabled && element.getAttribute("tabindex") !== "-1" && element.getAttribute("aria-hidden") !== "true");
    visible[visible.length - 1]?.focus();
  })()`);
  await keyTap(cdp, "Tab", "Tab");
  await sleep(120);
  const focusWrapState = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const visible = [...panel.querySelectorAll("button, select, input, textarea, summary, [tabindex]")].filter((element) => element.getClientRects().length > 0 && !element.disabled && element.getAttribute("tabindex") !== "-1" && element.getAttribute("aria-hidden") !== "true");
    const describe = (element) => element ? (element.id || element.className || element.tagName) : "none";
    return {
      active: describe(document.activeElement),
      first: describe(visible[0]),
      last: describe(visible[visible.length - 1]),
      inside: panel.contains(document.activeElement),
      count: visible.length
    };
  })()`);
  if (focusWrapState.active !== "settingsClose") errors.push("modal Tab should wrap to the close button: " + JSON.stringify(focusWrapState));
  await keyTap(cdp, "Escape", "Escape");
  await waitUntil("pointer opener regains focus", () => evaluate(cdp, `document.activeElement === document.querySelector("#startSettingsButton")`), 3500);

  await keyTap(cdp, "KeyO", "O");
  await waitUntil("settings reopens from keyboard O", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`), 3500);
  await keyTap(cdp, "KeyO", "O");
  await waitUntil("settings toggles closed from keyboard O", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`), 3500);
  await keyTap(cdp, "KeyP", "P");
  await waitUntil("practice opens from keyboard P", () => evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const button = document.querySelector("#practiceButton");
    return !panel.classList.contains("hidden") && panel.classList.contains("mode-practice") && button.getAttribute("aria-expanded") === "true";
  })()`), 3500);
  await keyTap(cdp, "KeyP", "P");
  await waitUntil("practice toggles closed from keyboard P", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`), 3500);
}

async function runTrainingInterruptionSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await navigateApp(cdp, baseUrl, "route interruption seed");
  await evaluate(cdp, `localStorage.clear()`);
  await navigateApp(cdp, baseUrl, "route interruption clean");

  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("route interruption practice open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  await clickSelector(cdp, "[data-route-contract]");
  await waitUntil("route contract starts before interruption", () => evaluate(cdp, `/航线|稳定航线|节奏航线|高手航线/.test(document.querySelector("#gameStatus").textContent)`), 5000);
  await clickSelector(cdp, "#practiceButton");
  await waitUntil("practice open during route contract", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-room");
  await clickSelector(cdp, "#drillCleanButton");
  await waitUntil("plain drill interrupts route contract", () => evaluate(cdp, `/Drill/.test(document.querySelector("#gameStatus").textContent) && document.querySelector("#settingsPanel").classList.contains("hidden")`), 5000);
  await clickSelector(cdp, "#practiceButton");
  await waitUntil("practice reopened after route interruption", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
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

  await navigateApp(cdp, baseUrl, "feel interruption seed");
  await evaluate(cdp, `localStorage.clear()`);
  await navigateApp(cdp, baseUrl, "feel interruption clean");
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("feel interruption practice open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  await clickSelector(cdp, "[data-feel-fixture]");
  await waitUntil("feel fixture starts before interruption", () => evaluate(cdp, `/手感校准/.test(document.querySelector("#gameStatus").textContent)`), 5000);
  await clickSelector(cdp, "#practiceButton");
  await waitUntil("practice open during feel fixture", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-room");
  await clickSelector(cdp, "#drillPaceButton");
  await waitUntil("plain drill interrupts feel fixture", () => evaluate(cdp, `/Drill/.test(document.querySelector("#gameStatus").textContent) && document.querySelector("#settingsPanel").classList.contains("hidden")`), 5000);
  await clickSelector(cdp, "#practiceButton");
  await waitUntil("practice reopened after feel interruption", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
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
  await navigateApp(cdp, baseUrl, "save archive seed");
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
  await navigateApp(cdp, baseUrl, "save archive clean");
  await evaluate(cdp, `localStorage.clear()`);
  await navigateApp(cdp, baseUrl, "save archive ready");
  await clickSelector(cdp, "#startSettingsButton");
  await waitUntil("save archive settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
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
  if (imported.settingsVersion !== 3 || imported.touchSize !== 62 || !imported.lowPerformance || imported.deadzone !== 0.18 || imported.profileVersion !== 2 || imported.clears !== 2 || imported.focusVersion !== 2 || imported.focusRooms !== 10 || imported.bestFlow !== 321 || imported.backupKind !== "summit-spark-save-backup" || imported.backupReason !== "before-import" || imported.backupArchiveKind !== "summit-spark-save" || imported.backupOldTouchSize !== 48 || imported.stageTouchSize !== "62px") {
    errors.push("save archive import did not normalize and apply storage: " + JSON.stringify(imported));
  }
  await clickSelector(cdp, "#startSettingsButton");
  await waitUntil("settings opens for backup restore", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  await openSettingsGroup(cdp, ".settings-group-feedback");
  const restoreReady = await evaluate(cdp, `(() => ({
    disabled: document.querySelector("#saveRestoreButton")?.disabled || false,
    backupText: document.querySelector("#saveBackupStatus")?.textContent || ""
  }))()`);
  if (restoreReady.disabled || !/可恢复/.test(restoreReady.backupText)) errors.push("save backup restore should be available after import: " + JSON.stringify(restoreReady));
  await clickSelector(cdp, "#saveRestoreButton");
  await sleep(980);
  await waitForAppReady(cdp);
  const restored = await evaluate(cdp, `(() => {
    const settings = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    const profile = JSON.parse(localStorage.getItem("summit-spark-profile") || "{}");
    const backup = JSON.parse(localStorage.getItem("summit-spark-save-backup") || "{}");
    return {
      touchSize: settings.touchSize,
      lowPerformance: settings.lowPerformance,
      profileVersion: profile.version,
      clears: profile.summitClears || 0,
      backupArchiveKind: backup.archive?.kind,
      backupImportedTouchSize: backup.archive?.storage?.settings?.touchSize,
      stageTouchSize: getComputedStyle(document.querySelector(".stage")).getPropertyValue("--touch-size").trim()
    };
  })()`);
  if (restored.touchSize !== 48 || restored.lowPerformance || restored.profileVersion !== 2 || restored.clears !== 0 || restored.backupArchiveKind !== "summit-spark-save" || restored.backupImportedTouchSize !== 62 || restored.stageTouchSize !== "48px") {
    errors.push("save backup restore did not restore prior archive and preserve imported archive as new backup: " + JSON.stringify(restored));
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
  await navigateApp(cdp, baseUrl, "mobile visual");
  await clickSelector(cdp, "#startSettingsButton");
  await waitUntil("visual settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
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
      hasSaveRestore: !!document.querySelector("#saveRestoreButton"),
      hasFeedbackTemplate: !!document.querySelector("#feedbackTemplateButton"),
      buttonOverflow,
      tooSmall
    };
  })()`);
  if (!visual.panelFits || !visual.pageNoHorizontalOverflow || !visual.hasSaveImport || !visual.hasSaveStatus || !visual.hasSaveRestore || !visual.hasFeedbackTemplate || visual.buttonOverflow.length || visual.tooSmall.length) {
    errors.push("mobile visual regression guard failed: " + JSON.stringify(visual));
  }
}

async function runCanvasDensitySmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 960,
    height: 640,
    deviceScaleFactor: 2,
    mobile: false
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await navigateApp(cdp, baseUrl, "high-DPI canvas");
  await evaluate(cdp, `(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.lowPerformance = false;
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
    location.reload();
  })()`);
  await waitForAppReady(cdp);

  const normal = await evaluate(cdp, `(() => {
    const canvas = document.querySelector("#game");
    return { width: canvas.width, height: canvas.height, dpr: window.devicePixelRatio };
  })()`);
  if (normal.dpr !== 2 || normal.width !== 1440 || normal.height !== 816) {
    errors.push("normal high-DPI canvas should use the capped 1.5x buffer: " + JSON.stringify(normal));
  }

  await clickSelector(cdp, "#startSettingsButton");
  await waitUntil("high-DPI settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await openSettingsGroup(cdp, ".settings-group-display");
  await clickSelector(cdp, "#lowPerformanceToggle");
  const reduced = await waitUntil("low-performance canvas buffer", () => evaluate(cdp, `(() => {
    const canvas = document.querySelector("#game");
    return canvas.width === 960 && canvas.height === 544
      ? { width: canvas.width, height: canvas.height, enabled: document.querySelector("#lowPerformanceToggle").checked }
      : null;
  })()`));
  if (!reduced.enabled) errors.push("low-performance toggle should remain enabled after rebuilding the canvas");

  await clickSelector(cdp, "#lowPerformanceToggle");
  const restored = await waitUntil("restored high-DPI canvas buffer", () => evaluate(cdp, `(() => {
    const canvas = document.querySelector("#game");
    return canvas.width === 1440 && canvas.height === 816
      ? { width: canvas.width, height: canvas.height, enabled: document.querySelector("#lowPerformanceToggle").checked }
      : null;
  })()`));
  if (restored.enabled) errors.push("normal high-DPI canvas should be restored after disabling low-performance mode");
}

async function runMobileSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await navigateApp(cdp, baseUrl, "mobile portrait");
  const mobileStartContext = await evaluate(cdp, `(() => {
    const resume = document.querySelector("#resumeTrainingButton");
    const resumeVisible = !!resume && !resume.classList.contains("hidden");
    const resumeText = resume?.textContent.trim() || "";
    const chapter = document.querySelector("#portraitChapter").textContent.trim();
    const title = document.querySelector("#portraitRoomTitle").textContent.trim();
    const goal = document.querySelector("#portraitRoomGoal").textContent.trim();
    const resumeRoom = resumeText.match(/R([0-9]+)/)?.[1] || "";
    const titleRoom = title.match(/R([0-9]+)/)?.[1] || "";
    const resumeMode = resumeText.match(/(Clean|Pace|Style|Expert)/)?.[1] || "";
    const startActions = [...document.querySelectorAll(".start-panel button")].filter((button) => getComputedStyle(button).display !== "none");
    return {
      resumeVisible,
      resumeText,
      chapter,
      title,
      goal,
      startTouchSafe: startActions.length >= 3 && startActions.every((button) => button.getBoundingClientRect().height >= 44),
      aligned: resumeVisible
        ? chapter.includes("上次训练") && resumeRoom === titleRoom && !!resumeMode && goal.includes(resumeMode)
        : chapter.includes("攀登起点") && titleRoom === "1"
    };
  })()`);
  if (!mobileStartContext.aligned) errors.push("mobile start portrait brief should match the resume target or clearly identify the R1 climb start: " + JSON.stringify(mobileStartContext));
  if (!mobileStartContext.startTouchSafe) errors.push("mobile start actions should retain 44px hit targets: " + JSON.stringify(mobileStartContext));
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("mobile practice open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  const roomGroupOpen = await evaluate(cdp, `document.querySelector(".settings-group-room")?.open || false`);
  if (!roomGroupOpen) {
    await tapSelector(cdp, ".settings-group-room summary");
    await waitUntil("mobile room settings open", () => evaluate(cdp, `document.querySelector(".settings-group-room")?.open || false`));
  }
  await openSettingsGroup(cdp, ".settings-group-training");
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
    const variants = [...document.querySelectorAll(".variant-button")].map((button) => {
      const rect = button.getBoundingClientRect();
      return { text: button.textContent.trim(), width: rect.width, height: rect.height };
    });
    const launch = document.querySelector("#focusRoomButton").getBoundingClientRect();
    const closeTarget = document.querySelector("#settingsClose").getBoundingClientRect();
    const roomSelectTarget = document.querySelector("#roomSelect").getBoundingClientRect();
    const visibleSummaries = [...document.querySelectorAll(".settings-group > summary")].filter((summary) => summary.getBoundingClientRect().height > 0);
    return {
      modePractice: document.querySelector("#settingsPanel").classList.contains("mode-practice"),
      feelColumns: feel,
      panelFits: panel.left >= -1 && panel.right <= window.innerWidth + 1 && panel.bottom <= window.innerHeight + 1,
      cardsFit: cards.every((card) => card.scrollWidth <= card.width + 2 && card.height >= 44),
      variantsTouchSafe: variants.length === 4 && variants.every((button) => button.width >= 44 && button.height >= 44),
      variantsExplained: variants.every((button) => /无失误|节奏|类型|高手/.test(button.text)),
      launchTouchSafe: launch.top >= panel.top && launch.bottom <= panel.bottom && launch.width >= 44 && launch.height >= 44,
      panelControlsTouchSafe: closeTarget.width >= 44 && closeTarget.height >= 44 && roomSelectTarget.height >= 44 && visibleSummaries.every((summary) => summary.getBoundingClientRect().height >= 44),
      roomItemsFit: roomItems.every((item) => item.left >= -1 && item.right <= window.innerWidth + 1),
      roomItems,
      coarsePointer: matchMedia("(pointer: coarse)").matches
    };
  })()`);
  if (!mobile.modePractice) errors.push("mobile practice panel should open from the practice entry");
  if (mobile.feelColumns !== 1) errors.push("mobile Feel Lab should collapse to one column");
  if (!mobile.panelFits) errors.push("mobile practice panel overflows viewport");
  if (!mobile.cardsFit) errors.push("mobile route/feel cards have horizontal overflow or too-small hit targets");
  if (!mobile.variantsTouchSafe || !mobile.variantsExplained) errors.push("mobile Drill variants should be explained and touch-safe: " + JSON.stringify(mobile));
  if (!mobile.launchTouchSafe) errors.push("mobile selected-room launch dock should remain visible and touch-safe: " + JSON.stringify(mobile));
  if (!mobile.panelControlsTouchSafe) errors.push("mobile practice close, room select and disclosure targets should remain at least 44px: " + JSON.stringify(mobile));
  if (!mobile.roomItemsFit) errors.push("mobile room settings should not overflow horizontally: " + JSON.stringify(mobile.roomItems));
  if (!mobile.coarsePointer) errors.push("mobile smoke should emulate a coarse pointer");
  await evaluate(cdp, `(() => {
    const close = document.querySelector("#settingsClose");
    window.__mobileCloseProbe = { click: 0, pointerup: 0, touchend: 0 };
    close?.addEventListener("click", () => { window.__mobileCloseProbe.click += 1; }, { once: true });
    close?.addEventListener("pointerup", () => { window.__mobileCloseProbe.pointerup += 1; }, { once: true });
    close?.addEventListener("touchend", () => { window.__mobileCloseProbe.touchend += 1; }, { once: true });
  })()`);
  await tapSelector(cdp, "#settingsClose");
  try {
    await waitUntil("mobile settings closes", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));
  } catch (error) {
    const closeState = await evaluate(cdp, `(() => {
      const panel = document.querySelector("#settingsPanel");
      const close = document.querySelector("#settingsClose");
      const rect = close?.getBoundingClientRect();
      const x = rect ? Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2)) : 0;
      const y = rect ? Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2)) : 0;
      const hit = rect ? document.elementFromPoint(x, y) : null;
      return {
        hidden: panel?.classList.contains("hidden") || false,
        className: panel?.className || "",
        ariaHidden: panel?.getAttribute("aria-hidden") || "",
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          dpr: window.devicePixelRatio,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          visualLeft: window.visualViewport?.offsetLeft || 0,
          visualTop: window.visualViewport?.offsetTop || 0,
          visualWidth: window.visualViewport?.width || 0,
          visualHeight: window.visualViewport?.height || 0,
          visualScale: window.visualViewport?.scale || 0
        },
        closeRect: rect ? { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) } : null,
        closeText: close?.textContent || "",
        hit: hit ? { tag: hit.tagName, id: hit.id, className: String(hit.className || ""), text: String(hit.textContent || "").slice(0, 80) } : null,
        probe: window.__mobileCloseProbe || null
      };
    })()`);
    throw new Error(error.message + ": " + JSON.stringify(closeState));
  }
  await tapSelector(cdp, "#startButton");
  await waitUntil("mobile game starts", () => evaluate(cdp, `document.querySelector("#overlay").classList.contains("hidden")`));
  const touchUi = await evaluate(cdp, `(() => {
    const touch = document.querySelector(".touch");
    const direction = document.querySelector(".touch-directions");
    const action = document.querySelector(".touch-actions");
    const shell = document.querySelector(".shell");
    const ridgeStyle = getComputedStyle(shell, "::before");
    const stage = document.querySelector(".stage").getBoundingClientRect();
    const portraitBrief = document.querySelector("#portraitBrief");
    const portraitBriefRect = portraitBrief.getBoundingClientRect();
    const hudActions = [document.querySelector("#practiceButton"), document.querySelector("#settingsButton")].map((button) => {
      const rect = button.getBoundingClientRect();
      return { id: button.id, width: Math.round(rect.width), height: Math.round(rect.height), left: Math.round(rect.left), right: Math.round(rect.right) };
    });
    const buttons = [...document.querySelectorAll("[data-touch]")].map((button) => {
      const rect = button.getBoundingClientRect();
      return { id: button.dataset.touch, width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
    });
    return {
      visible: getComputedStyle(touch).display !== "none",
      position: getComputedStyle(touch).position,
      directionGrid: getComputedStyle(direction).display === "grid",
      actionGrid: getComputedStyle(action).display === "grid",
      buttonBackground: getComputedStyle(document.querySelector("[data-touch]")).backgroundImage,
      buttons,
      hudActions,
      hudActionsTouchSafe: hudActions.every((button) => button.width >= 44 && button.height >= 44 && button.left >= 0 && button.right <= window.innerWidth),
      allButtonsLarge: buttons.every((button) => button.width >= 44 && button.height >= 44),
      detachedFromPlayfield: getComputedStyle(touch).position === "fixed" && buttons.every((button) => button.top >= stage.bottom + 4),
      playfieldGap: Math.round(Math.min(...buttons.map((button) => button.top)) - stage.bottom),
      portraitBriefVisible: getComputedStyle(portraitBrief).display !== "none" && getComputedStyle(portraitBrief).opacity !== "0",
      portraitBriefAbove: portraitBriefRect.bottom <= stage.top - 8,
      portraitBriefGap: Math.round(stage.top - portraitBriefRect.bottom),
      portraitAtmosphere: shell.dataset.portraitChapter === "gate" && ridgeStyle.content !== "none" && ridgeStyle.clipPath !== "none",
      portraitBriefText: portraitBrief.textContent.trim(),
      controlHintRemoved: !document.querySelector("#controlHint"),
      stageTop: Math.round(stage.top)
    };
  })()`);
  if (!touchUi.visible || !touchUi.directionGrid || !touchUi.actionGrid || !/68, 89, 98/.test(touchUi.buttonBackground) || !touchUi.allButtonsLarge || !touchUi.hudActionsTouchSafe || !touchUi.detachedFromPlayfield || touchUi.playfieldGap > 150 || !touchUi.portraitBriefVisible || !touchUi.portraitBriefAbove || touchUi.portraitBriefGap > 160 || !touchUi.portraitAtmosphere || !/R1.*起势山门/.test(touchUi.portraitBriefText) || !touchUi.controlHintRemoved || touchUi.stageTop > 360) {
    errors.push("touch controls should use visible direction/action grids with safe hit targets away from the portrait playfield: " + JSON.stringify(touchUi));
  }
  const largeTouchUi = await evaluate(cdp, `(() => {
    const stage = document.querySelector(".stage");
    const previousSize = stage.style.getPropertyValue("--touch-size");
    stage.style.setProperty("--touch-size", "64px");
    const direction = document.querySelector(".touch-directions");
    const action = document.querySelector(".touch-actions");
    const directionRect = direction.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const buttons = [...document.querySelectorAll("[data-touch]")].map((button) => {
      const rect = button.getBoundingClientRect();
      return { id: button.dataset.touch, left: rect.left, right: rect.right, top: rect.top, width: rect.width, height: rect.height };
    });
    const grab = buttons.find((button) => button.id === "grab");
    const jump = buttons.find((button) => button.id === "jump");
    const dash = buttons.find((button) => button.id === "dash");
    const result = {
      withinViewport: buttons.every((button) => button.left >= -1 && button.right <= window.innerWidth + 1),
      clustersSeparated: actionRect.left >= directionRect.right + 4,
      actionColumns: getComputedStyle(action).gridTemplateColumns.split(" ").length,
      commonActionsPaired: Math.abs(jump.top - dash.top) < 1 && grab.top < jump.top,
      minSize: Math.min(...buttons.map((button) => Math.min(button.width, button.height))),
      maxSize: Math.max(...buttons.map((button) => Math.max(button.width, button.height))),
      directionRight: Math.round(directionRect.right),
      actionLeft: Math.round(actionRect.left),
      dashRight: Math.round(dash.right),
      viewportWidth: window.innerWidth
    };
    if (previousSize) stage.style.setProperty("--touch-size", previousSize);
    else stage.style.removeProperty("--touch-size");
    return result;
  })()`);
  if (!largeTouchUi.withinViewport || !largeTouchUi.clustersSeparated || largeTouchUi.actionColumns !== 2 || !largeTouchUi.commonActionsPaired || largeTouchUi.minSize < 44 || largeTouchUi.maxSize > 64.5) {
    errors.push("64px portrait touch setting should adapt within the phone width and keep Jump/Dash reachable: " + JSON.stringify(largeTouchUi));
  }

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 480,
    deviceScaleFactor: 1,
    mobile: true
  });
  await sleep(100);
  const shortPortrait = await evaluate(cdp, `(() => {
    const brief = document.querySelector("#portraitBrief").getBoundingClientRect();
    const hud = document.querySelector(".hud").getBoundingClientRect();
    const stage = document.querySelector(".stage").getBoundingClientRect();
    const touch = document.querySelector("#touchControls").getBoundingClientRect();
    const buttons = [...document.querySelectorAll("[data-touch]")].map((button) => button.getBoundingClientRect());
    return {
      briefAboveHud: brief.bottom <= hud.top - 6,
      briefTop: Math.round(brief.top),
      briefBottom: Math.round(brief.bottom),
      hudTop: Math.round(hud.top),
      controlsDetached: buttons.every((button) => button.top >= stage.bottom + 4),
      controlsFit: buttons.every((button) => button.left >= -1 && button.right <= window.innerWidth + 1 && button.bottom <= window.innerHeight + 1),
      touchBottom: Math.round(touch.bottom),
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  })()`);
  if (!shortPortrait.briefAboveHud || !shortPortrait.controlsDetached || !shortPortrait.controlsFit) {
    errors.push("320x480 portrait should keep the room brief clear of the HUD and all touch controls on-screen: " + JSON.stringify(shortPortrait));
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
  await navigateApp(cdp, baseUrl, "mobile landscape");
  await tapSelector(cdp, "#startSettingsButton");
  await waitUntil("mobile landscape settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  await openSettingsGroup(cdp, ".settings-group-audio");
  const landscapeAudioTouchSafe = await evaluate(cdp, `document.querySelector("#audioTestButton").getBoundingClientRect().height >= 44`);
  await openSettingsGroup(cdp, ".settings-group-feedback");
  const landscapeFeedbackTouchSafe = await evaluate(cdp, ` [...document.querySelectorAll(".settings-group-feedback button")].filter((button) => button.getBoundingClientRect().height > 0).every((button) => button.getBoundingClientRect().height >= 44 && button.getBoundingClientRect().width >= 44)`);
  const landscape = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel").getBoundingClientRect();
    const close = document.querySelector("#settingsClose").getBoundingClientRect();
    const selects = [...document.querySelectorAll(".settings-group-controls select")].filter((el) => el.getBoundingClientRect().height > 0);
    const ranges = [...document.querySelectorAll(".settings-group-controls input[type=range]")].filter((el) => el.getBoundingClientRect().height > 0);
    return {
      panelFits: panel.left >= -1 && panel.right <= window.innerWidth + 1 && panel.bottom <= window.innerHeight + 1,
      modeSettings: document.querySelector("#settingsPanel").classList.contains("mode-settings"),
      deadzone: !!document.querySelector("#gamepadDeadzoneSlider"),
      touchSize: !!document.querySelector("#touchSizeSlider"),
      controlsTouchSafe: close.width >= 44 && close.height >= 44 && selects.every((el) => el.getBoundingClientRect().height >= 44) && ranges.every((el) => el.getBoundingClientRect().height >= 44)
    };
  })()`);
  if (!landscape.panelFits) errors.push("mobile landscape settings panel overflows viewport");
  if (!landscape.modeSettings) errors.push("mobile landscape should open the quiet settings panel");
  if (!landscape.deadzone || !landscape.touchSize) errors.push("mobile landscape should keep control accessibility settings visible");
  if (!landscape.controlsTouchSafe) errors.push("mobile landscape settings controls should retain 44px hit targets: " + JSON.stringify(landscape));
  if (!landscapeAudioTouchSafe || !landscapeFeedbackTouchSafe) errors.push("mobile landscape audio and feedback/save buttons should retain 44px hit targets");
  await tapSelector(cdp, "#settingsClose");
  await tapSelector(cdp, "#startButton");
  await waitUntil("mobile landscape game starts", () => evaluate(cdp, `document.querySelector("#overlay").classList.contains("hidden")`));
  const landscapeTouch = await evaluate(cdp, `(() => {
    const touch = document.querySelector("#touchControls");
    const buttons = [...touch.querySelectorAll("button")];
    const rgba = getComputedStyle(buttons[0]).backgroundColor.match(/[\\d.]+/g)?.map(Number) || [];
    return {
      visible: getComputedStyle(touch).display === "flex",
      buttonCount: buttons.length,
      allLarge: buttons.every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }),
      backgroundAlpha: rgba.length >= 4 ? rgba[3] : 1,
      backdrop: getComputedStyle(buttons[0]).backdropFilter || ""
    };
  })()`);
  if (!landscapeTouch.visible || landscapeTouch.buttonCount !== 7 || !landscapeTouch.allLarge || landscapeTouch.backgroundAlpha > 0.34 || !/blur\(4px\)/.test(landscapeTouch.backdrop)) {
    errors.push("mobile landscape touch controls should remain usable without obscuring terrain: " + JSON.stringify(landscapeTouch));
  }
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 568,
    height: 320,
    deviceScaleFactor: 1,
    mobile: true
  });
  await sleep(100);
  await tapSelector(cdp, "#practiceButton");
  await waitUntil("short landscape practice opens", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  const shortLandscapePractice = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel").getBoundingClientRect();
    const dock = document.querySelector("#practiceLaunchDock").getBoundingClientRect();
    const launch = document.querySelector("#focusRoomButton").getBoundingClientRect();
    return {
      panelFits: panel.left >= -1 && panel.right <= window.innerWidth + 1 && panel.bottom <= window.innerHeight + 1,
      dockFits: dock.top >= panel.top && dock.bottom <= panel.bottom + 1,
      actionTouchSafe: launch.height >= 44,
      resetNestedInAdvanced: !!document.querySelector(".settings-group-advanced #focusResetButton"),
      launchHeight: Math.round(launch.height),
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  })()`);
  if (!shortLandscapePractice.panelFits || !shortLandscapePractice.dockFits || !shortLandscapePractice.actionTouchSafe || !shortLandscapePractice.resetNestedInAdvanced) {
    errors.push("568x320 touch landscape should keep one 44px launch action visible while reset stays under Advanced: " + JSON.stringify(shortLandscapePractice));
  }
  await tapSelector(cdp, "#settingsClose");
  await waitUntil("short landscape practice closes", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await evaluate(cdp, `(() => {
    const overlay = document.querySelector("#overlay");
    overlay.classList.add("finish-overlay");
    overlay.classList.remove("hidden");
    overlay.hidden = false;
    overlay.removeAttribute("inert");
    overlay.setAttribute("aria-hidden", "false");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "finishTitle");
    overlay.innerHTML = '<h1 id="finishTitle" tabindex="-1">登顶</h1><p class="finish-line">0:30.00 · 失误 1 · 光继连锁 3 · Flow 120</p><div class="review-grid">' +
      Array.from({ length: 9 }, (_, index) => '<article class="review-card ' + (index < 4 ? 'primary' : 'secondary') + '"><span>复盘项 ' + index + '</span><strong>长文本安全检查 R' + index + '</strong><p>这是一段用于横屏移动端滚动和断行的复盘内容，不能横向溢出。</p></article>').join('') +
      '</div><div class="review-actions"><button class="review-button primary-review" type="button">下一 Drill</button></div>';
    document.querySelector("#finishTitle").focus({ preventScroll: true });
    overlay.scrollTop = 0;
  })()`);
  const review = await evaluate(cdp, `(() => {
    const overlay = document.querySelector("#overlay");
    const articles = [...document.querySelectorAll(".review-grid article")].map((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, scrollWidth: el.scrollWidth };
    });
    const overlayRect = overlay.getBoundingClientRect();
    const titleRect = document.querySelector("#finishTitle").getBoundingClientRect();
    return {
      scrollSafe: getComputedStyle(overlay).overflowY === "auto" && overlay.scrollHeight >= overlay.clientHeight,
      topReachable: titleRect.top >= overlayRect.top - 1 && titleRect.bottom <= overlayRect.bottom + 1,
      focusInside: document.activeElement === document.querySelector("#finishTitle"),
      noHorizontalOverflow: articles.every((item) => item.scrollWidth <= item.width + 2),
      primaryCount: document.querySelectorAll(".review-card.primary").length
    };
  })()`);
  if (!review.scrollSafe) errors.push("finish review overlay should remain vertically scroll-safe on mobile landscape");
  if (!review.topReachable || !review.focusInside) errors.push("finish review should keep its labelled top reachable and focused on mobile landscape: " + JSON.stringify(review));
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
  await navigateApp(cdp, baseUrl, "gamepad seed");
  await evaluate(cdp, `localStorage.setItem("summit-spark-settings", JSON.stringify({ gamepadDeadzone: 0.4, audioEnabled: false }))`);
  await navigateApp(cdp, baseUrl, "gamepad clean");
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
    await runCanvasDensitySmoke(cdp, baseUrl);
    await runVisualRegressionSmoke(cdp, baseUrl);
    await runMobileSmoke(cdp, baseUrl);
    await runMobileLandscapeSmoke(cdp, baseUrl);
    await runGamepadSmoke(cdp, baseUrl);
    await runAuthenticatedRefreshSmoke(cdp, baseUrl);
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
  console.log("Browser smoke passed: desktop interactions, authenticated refresh recovery, keyboard settings, diagnostics/template snapshot, canvas/movement, direct resume, Route/Feel interruption resume, storage recovery, save import/export with preview, invalid import guard, high-DPI canvas density switching, mobile visual guard, mobile portrait/landscape, gamepad deadzone.");
}

main().catch((error) => {
  console.error("Browser smoke failed:");
  console.error("- " + error.message);
  process.exit(1);
});
