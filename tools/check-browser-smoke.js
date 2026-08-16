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
  if (!child) return Promise.resolve();
  const closeHandles = () => {
    child.stdin?.destroy();
    child.stdout?.destroy();
    child.stderr?.destroy();
    child.unref?.();
  };
  if (child.exitCode !== null) {
    closeHandles();
    return Promise.resolve();
  }
  if (process.platform === "win32" && Number.isInteger(child.pid)) {
    return new Promise((resolve) => {
      let settled = false;
      let timeoutId = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        try {
          if (child.exitCode === null) child.kill();
        } catch {
          // The exact test process may already have exited.
        }
        closeHandles();
        resolve();
      };
      const killer = childProcess.spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore"
      });
      killer.once("exit", finish);
      killer.once("error", finish);
      timeoutId = setTimeout(() => {
        try {
          killer.kill();
        } catch {
          // Tree cleanup is best-effort after the exact timeout.
        }
        finish();
      }, 2500);
    });
  }
  return new Promise((resolve) => {
    child.once("exit", () => {
      closeHandles();
      resolve();
    });
    child.kill();
    setTimeout(() => {
      closeHandles();
      resolve();
    }, 1200);
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

async function waitUntil(label, fn, timeout = 6000, pollInterval = 120) {
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
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
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

async function runBootFailureSmoke(cdp, baseUrl) {
  navigationId += 1;
  const url = `${baseUrl}/?smoke=${navigationId}&boot-fault=1`;
  await cdp.send("Page.navigate", { url });
  await waitUntil("boot failure navigation", () => evaluate(cdp, `location.href === ${JSON.stringify(url)}`), 7000);
  const state = await waitUntil("boot failure recovery surface", () => evaluate(cdp, `(() => {
    const root = document.documentElement;
    const actions = document.querySelector("#startPanel .start-actions");
    const retry = document.querySelector("#bootRetryButton");
    const fallback = document.querySelector("#bootFallback");
    if (!root.classList.contains("app-boot-failed")) return null;
    return {
      ready: root.classList.contains("app-ready"),
      readiness: document.querySelector("#startReadiness")?.textContent || "",
      loadStatus: document.querySelector("#loadStatus")?.textContent || "",
      loadVisible: document.querySelector("#startPanel .load-strip")?.getAttribute("aria-hidden") === "false",
      actionsHidden: getComputedStyle(actions).display === "none",
      actionsInert: actions?.hasAttribute("inert") && actions?.getAttribute("aria-hidden") === "true",
      fallbackVisible: getComputedStyle(fallback).opacity === "1" && fallback?.getAttribute("role") === "alert",
      fallbackText: fallback?.textContent || "",
      retryVisible: retry && !retry.hidden && getComputedStyle(retry).display !== "none",
      retryText: retry?.textContent || "",
      retryEnabled: retry ? !retry.disabled : false
    };
  })()`), 7000, 40);
  if (state.ready
    || !/启动未完成/.test(state.readiness)
    || !/启动资源加载失败/.test(state.loadStatus)
    || !state.loadVisible
    || !state.actionsHidden
    || !state.actionsInert
    || !state.fallbackVisible
    || !/不会清除本地存档/.test(state.fallbackText)
    || !state.retryVisible
    || !state.retryEnabled
    || !/重新加载/.test(state.retryText)) {
    errors.push("boot failure should replace dead menu actions with a clear local-safe retry surface: " + JSON.stringify(state));
  }
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

async function clickPoint(cdp, x, y) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}

async function tapSelector(cdp, selector) {
  const rect = await targetPoint(cdp, selector);
  await tapPoint(cdp, rect.inputX, rect.inputY);
}

async function tapPoint(cdp, x, y) {
  const touchPoint = { x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 };
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
  const named = { Enter: 13, Escape: 27, Tab: 9, F3: 114, Space: 32, Shift: 16 };
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

async function windowKeyHold(cdp, code, key, ms = 300) {
  await evaluate(cdp, `window.dispatchEvent(new KeyboardEvent("keydown", { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key)}, bubbles: true }))`);
  await sleep(ms);
  await evaluate(cdp, `window.dispatchEvent(new KeyboardEvent("keyup", { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key)}, bubbles: true }))`);
  await sleep(80);
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
  const bootRuntimeErrors = await evaluate(cdp, `window.__summitEarlyRuntimeErrors || []`);
  if (bootRuntimeErrors.length) throw new Error("runtime error during boot: " + JSON.stringify(bootRuntimeErrors));
  await evaluate(cdp, `(() => {
    window.__summitSmokeRuntimeErrors = [];
    window.addEventListener("error", (event) => {
      window.__summitSmokeRuntimeErrors.push(String(event.message || "unknown runtime error"));
    });
  })()`);
  await waitUntil("entry chooser after session check", () => evaluate(cdp, `(() => {
    const gate = document.querySelector("#entryGate");
    const guest = document.querySelector("#guestEntryButton");
    return !!gate
      && !gate.classList.contains("hidden")
      && !document.querySelector("#overlay")?.classList.contains("entry-checking")
      && document.activeElement === guest;
  })()`), 7000);
  const entryChoice = await evaluate(cdp, `(() => {
    const gate = document.querySelector("#entryGate");
    const guest = document.querySelector("#guestEntryButton");
    const account = document.querySelector("#accountEntryButton");
    const gateRect = gate?.getBoundingClientRect();
    const rgb = (value) => (String(value).match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (value) => {
      const channels = rgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const contrast = (element, background) => {
      const foregroundLum = luminance(getComputedStyle(element).color);
      const backgroundLum = luminance(background);
      return (Math.max(foregroundLum, backgroundLum) + 0.05) / (Math.min(foregroundLum, backgroundLum) + 0.05);
    };
    const gateBackground = getComputedStyle(gate).backgroundColor;
    const guestFocusStyle = getComputedStyle(guest);
    const contrastSamples = [
      ["eyebrow", document.querySelector(".entry-eyebrow")],
      ["guest detail", guest?.querySelector("small")],
      ["account detail", account?.querySelector("small")]
    ].map(([label, element]) => ({ label, ratio: Number(contrast(element, gateBackground).toFixed(2)) }));
    return {
      visible: !!gate && gateRect.width > 0 && gateRect.height > 0,
      guest: guest?.textContent || "",
      account: account?.textContent || "",
      startPending: document.querySelector("#startPanel")?.classList.contains("entry-pending") || false,
      fits: !!gateRect && gateRect.left >= 0 && gateRect.right <= innerWidth && gateRect.bottom <= innerHeight,
      guestFocused: document.activeElement === guest,
      focusOutlineWidth: guestFocusStyle.outlineWidth,
      focusOutlineColor: guestFocusStyle.outlineColor,
      contrastSamples
    };
  })()`);
  if (
    !entryChoice.visible
    || !entryChoice.startPending
    || !entryChoice.fits
    || !entryChoice.guestFocused
    || Number.parseFloat(entryChoice.focusOutlineWidth) < 2
    || /rgb\(0, 0, 0\)/.test(entryChoice.focusOutlineColor)
    || !/仅保存在此设备/.test(entryChoice.guest)
    || !/云端保存/.test(entryChoice.account)
  ) {
    errors.push("entry should clearly offer adaptive guest and cloud-save choices: " + JSON.stringify(entryChoice));
  }
  if (entryChoice.contrastSamples.some((sample) => sample.ratio < 4.5)) {
    errors.push("small entry text should retain at least 4.5:1 contrast: " + JSON.stringify(entryChoice.contrastSamples));
  }
  const immediateAccountOpen = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const account = document.querySelector("#accountEntryButton");
    account.focus({ preventScroll: true });
    account.click();
    const opened = !panel.classList.contains("hidden") && !panel.hasAttribute("inert");
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    return opened;
  })()`);
  if (!immediateAccountOpen) errors.push("entry account drawer should become interactive before an immediate outside dismissal");
  const entryAccountOutsideReturn = await waitUntil("immediate outside account dismissal restores entry trigger", () => evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const account = document.querySelector("#accountEntryButton");
    return panel.classList.contains("hidden") && panel.hasAttribute("inert") && document.activeElement === account
      ? { active: document.activeElement.id, visible: account.getClientRects().length > 0, inert: panel.hasAttribute("inert") }
      : null;
  })()`), 2500);
  await sleep(80);
  const delayedAccountFocus = await evaluate(cdp, `document.activeElement?.id || ""`);
  if (entryAccountOutsideReturn.active !== "accountEntryButton" || !entryAccountOutsideReturn.visible || !entryAccountOutsideReturn.inert || delayedAccountFocus !== "accountEntryButton") {
    errors.push("immediate outside account dismissal should stay on its visible entry trigger after delayed focus work: " + JSON.stringify({ entryAccountOutsideReturn, delayedAccountFocus }));
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
      const canvas = document.querySelector("#game");
      const rect = canvas.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        bufferWidth: canvas.width,
        bufferHeight: canvas.height,
        requiredWidth: Math.ceil(rect.width * window.devicePixelRatio),
        requiredHeight: Math.ceil(rect.height * window.devicePixelRatio)
      };
    })(),
    startActionLayout: (() => {
      const primary = document.querySelector("#startButton").getBoundingClientRect();
      const practice = document.querySelector("#openTrainingButton").getBoundingClientRect();
      return { primaryWidth: Math.round(primary.width), practiceWidth: Math.round(practice.width) };
    })()
  })`);
  if (!/^\d{8}-p\d+$/.test(initial.build)) errors.push("browser smoke found invalid build version " + initial.build);
  if (!initial.ready || !initial.overlayAvailable || !initial.gameSurfaceHidden || initial.canvasSize.width < 300 || initial.canvasSize.height < 160) errors.push("browser smoke initial canvas/start state is invalid or exposed behind overlay: " + JSON.stringify(initial));
  if (initial.canvasSize.bufferWidth < initial.canvasSize.requiredWidth || initial.canvasSize.bufferHeight < initial.canvasSize.requiredHeight) errors.push("desktop canvas buffer should cover its physical display size: " + JSON.stringify(initial.canvasSize));
  if (initial.startActionLayout.primaryWidth < initial.startActionLayout.practiceWidth * 1.8) errors.push("primary start action should span the full two-column menu row: " + JSON.stringify(initial.startActionLayout));

  await clickSelector(cdp, "#startButton");
  await waitUntil("start button begins game with first-act framing", () => evaluate(cdp, `document.querySelector("#overlay").classList.contains("hidden") && /游戏开始.*第一幕.*先读懂落点/.test(document.querySelector("#gameStatus").textContent)`));
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
  const storageWriteFault = await evaluate(cdp, `(() => {
    const proto = Storage.prototype;
    const original = proto.setItem;
    let result;
    try {
      proto.setItem = function(key, value) {
        if (key === "summit-spark-settings") throw new Error("smoke quota");
        return original.call(this, key, value);
      };
      const toggle = document.querySelector("#audioToggle");
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      result = {
        tip: document.querySelector("#gameTipTitle")?.textContent || "",
        status: document.querySelector("#gameStatus")?.textContent || ""
      };
    } finally {
      proto.setItem = original;
    }
    return result;
  })()`);
  if (!/本地存档不可写/.test(storageWriteFault.tip)) {
    errors.push("a mid-session storage write failure should expose the existing persistence warning: " + JSON.stringify(storageWriteFault));
  }
  const duplicateClose = await evaluate(cdp, `(() => {
    const button = document.querySelector("#settingsClose");
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerType: "touch" }));
    button.dispatchEvent(new Event("touchend", { bubbles: true, cancelable: true }));
    button.click();
    return {
      hidden: document.querySelector("#settingsPanel").classList.contains("hidden"),
      active: document.activeElement?.id || ""
    };
  })()`);
  if (!duplicateClose.hidden || duplicateClose.active !== "settingsButton") {
    errors.push("duplicate touch/click close events should be idempotent and preserve the opener focus: " + JSON.stringify(duplicateClose));
  }
  await waitUntil("settings close after start", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && !document.querySelector("#gameHud").hasAttribute("inert") && document.querySelector("#game").tabIndex === 0`));
  const hiddenPanelMutations = await evaluate(cdp, `(async () => {
    const panel = document.querySelector("#settingsPanel");
    const changes = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        changes.push({
          type: record.type,
          target: record.target.id || record.target.className || record.target.nodeName,
          attribute: record.attributeName || ""
        });
      }
    });
    observer.observe(panel, { attributes: true, childList: true, characterData: true, subtree: true });
    await new Promise((resolve) => setTimeout(resolve, 420));
    observer.disconnect();
    return changes;
  })()`);
  if (hiddenPanelMutations.length !== 0) errors.push(`hidden practice/settings DOM should remain mutation-free during gameplay: ${JSON.stringify(hiddenPanelMutations)}`);
  await enableDebugPanel(cdp);
  const beforeMove = await debugPosition(cdp);
  if (!/relay chain 0  path 0/.test(beforeMove.text)) {
    errors.push("a fresh room should begin without a stale Relay thread: " + beforeMove.text);
  }
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
  const manualRetryBuffers = await debugPosition(cdp);
  if (!/jbuf 0\.000/.test(manualRetryBuffers.text) || !/dbuf 0\.000/.test(manualRetryBuffers.text)) {
    errors.push("manual Quick Retry should clear stale Jump/Dash buffers: " + manualRetryBuffers.text);
  }
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyD", key: "D", windowsVirtualKeyCode: 68 });
  const earlyDeathWindow = await waitUntil("automatic death exposes an early stale-input window", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const match = text.match(/dead ([\\d.]+)/);
    const remaining = match ? Number(match[1]) : 0;
    return remaining >= 0.15 ? { remaining } : null;
  })()`), 5000, 20);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", code: "KeyD", key: "d", windowsVirtualKeyCode: 68 });
  await keyTap(cdp, "Space", " ");
  await sleep(420);
  const staleRespawnProbe = await debugPosition(cdp);
  const staleJump = staleRespawnProbe.text.match(/jbuf ([\d.]+)/);
  const staleDead = staleRespawnProbe.text.match(/dead ([\d.]+)/);
  if (!(earlyDeathWindow.remaining >= 0.15)
    || (staleDead ? Number(staleDead[1]) : -1) !== 0
    || (staleJump ? Number(staleJump[1]) : -1) !== 0
    || Math.abs(staleRespawnProbe.y - manualRetryBuffers.y) > 2) {
    errors.push("an action pressed before the final death buffer window must expire instead of launching the respawn: " + JSON.stringify({ earlyDeathWindow, staleRespawnProbe }));
  }
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyD", key: "D", windowsVirtualKeyCode: 68 });
  const lateDeathWindow = await waitUntil("automatic death reaches the late input-buffer window", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const match = text.match(/dead ([\\d.]+)/);
    const remaining = match ? Number(match[1]) : 0;
    return remaining >= 0.055 && remaining <= 0.105 ? { remaining, text } : null;
  })()`), 5000, 20);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", code: "KeyD", key: "d", windowsVirtualKeyCode: 68 });
  await keyTap(cdp, "Space", " ");
  await sleep(260);
  const bufferedRespawnProbe = await debugPosition(cdp);
  const bufferedVelocity = bufferedRespawnProbe.text.match(/vel ([\d.-]+), ([\d.-]+)/);
  const bufferedDead = bufferedRespawnProbe.text.match(/dead ([\d.]+)/);
  const bufferedRespawnJump = {
    x: bufferedRespawnProbe.x,
    y: bufferedRespawnProbe.y,
    vx: bufferedVelocity ? Number(bufferedVelocity[1]) : 0,
    vy: bufferedVelocity ? Number(bufferedVelocity[2]) : 0,
    dead: bufferedDead ? Number(bufferedDead[1]) : -1
  };
  if (!(lateDeathWindow.remaining > 0)
    || bufferedRespawnJump.dead !== 0
    || bufferedRespawnJump.y >= manualRetryBuffers.y - 4) {
    errors.push("automatic respawn should preserve a Jump pressed inside the final input-buffer window: " + JSON.stringify({ lateDeathWindow, bufferedRespawnJump }));
  }
  await evaluate(cdp, `window.dispatchEvent(new Event("blur"))`);
  await waitUntil("visible gameplay records unmatched focus pause", () => evaluate(cdp, `/pause focus 1  settings 0  hidden 0/.test(document.querySelector("#debugPanel").textContent)`));
  const focusRecoveryStart = await debugPosition(cdp);
  await keyHold(cdp, "KeyD", "D", 280);
  const keyboardFocusRecovery = await debugPosition(cdp);
  if (!/pause focus 0  settings 0  hidden 0/.test(keyboardFocusRecovery.text)
    || keyboardFocusRecovery.x - focusRecoveryStart.x < 6) {
    errors.push("a real keyboard action should recover an unmatched visible-window focus pause after respawn: " + JSON.stringify({ focusRecoveryStart, keyboardFocusRecovery }));
  }
  await evaluate(cdp, `window.dispatchEvent(new Event("blur"))`);
  await waitUntil("second unmatched focus pause", () => evaluate(cdp, `/pause focus 1  settings 0  hidden 0/.test(document.querySelector("#debugPanel").textContent)`));
  await clickSelector(cdp, "#game");
  const pointerFocusRecovery = await waitUntil("canvas pointer recovers unmatched focus pause", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /pause focus 0  settings 0  hidden 0/.test(text) ? text : "";
  })()`));
  if (!/pause focus 0/.test(pointerFocusRecovery)) errors.push("canvas pointer should recover a stale visible focus pause");
  const gameplayCanvas = await canvasInkSummary(cdp);
  if (gameplayCanvas.varied < 20 || gameplayCanvas.bright < 20) errors.push("canvas appears blank during gameplay: " + JSON.stringify(gameplayCanvas));
  await keyTap(cdp, "Digit0", "0");
  await waitUntil("debug jump reaches summit room", () => evaluate(cdp, `/R10\\/10/.test(document.querySelector("#roomCount").textContent)`));
  await sleep(2100);
  await keyHold(cdp, "KeyD", "D", 180);
  await waitUntil("summit room timing contributes to current-run evidence", () => evaluate(cdp, `!/0:00\\.00$/.test(document.querySelector("#runTime").textContent)`));
  await keyTap(cdp, "KeyR", "R");
  await waitUntil("summit route records a current-run mistake", () => evaluate(cdp, `/快速重开 · R10/.test(document.querySelector("#gameStatus").textContent) && /失 1/.test(document.querySelector("#deathCount").textContent)`));
  const earlyRuntimeErrors = await evaluate(cdp, `window.__summitSmokeRuntimeErrors || []`);
  if (earlyRuntimeErrors.length) throw new Error("runtime error stopped gameplay: " + JSON.stringify(earlyRuntimeErrors));
  await evaluate(cdp, `window.addEventListener("error", (event) => { window.__summitRevealTestError = event.message || "unknown"; }, { once: true })`);
  await keyTap(cdp, "KeyH", "H");
  await sleep(80);
  const debugSummitState = await evaluate(cdp, `({
    status: document.querySelector("#gameStatus").textContent,
    room: document.querySelector("#roomCount").textContent,
    debugVisible: !document.querySelector("#debugPanel").classList.contains("hidden"),
    overlayHidden: document.querySelector("#overlay").classList.contains("hidden"),
    lumenSky: /lumen 0\\/12  sky 0\\.00/.test(document.querySelector("#debugPanel").textContent)
  })`);
  if (!/星顶回应 · 第四幕 · 星顶 · 1\/2 房 ·/.test(debugSummitState.status) || !debugSummitState.lumenSky) {
    errors.push("debug summit trigger should begin the reveal with partial final-act evidence: " + JSON.stringify(debugSummitState));
  }
  const summitRevealState = await waitUntil("summit reveal holds before review", () => evaluate(cdp, `(() => {
    const status = document.querySelector("#gameStatus").textContent;
    const hidden = document.querySelector("#overlay").classList.contains("hidden");
    return /星顶回应 · 第四幕 · 星顶 · 1\\/2 房 ·/.test(status) && hidden ? { status, hidden } : null;
  })()`));
  if (!summitRevealState.hidden || !/星顶回应 · 第四幕 · 星顶 · 1\/2 房 ·/.test(summitRevealState.status)) {
    errors.push("summit goal should hold on an in-world reveal with final-act evidence before opening review: " + JSON.stringify(summitRevealState));
  }
  await sleep(2800);
  const finishProbe = await evaluate(cdp, `({
    hasTitle: !!document.querySelector("#finishTitle"),
    line: document.querySelector(".finish-line")?.textContent || "",
    whisper: document.querySelector(".finish-whisper")?.textContent || "",
    status: document.querySelector("#gameStatus").textContent,
    error: window.__summitRevealTestError || ""
  })`);
  if (!finishProbe.hasTitle) {
    errors.push("summit reveal did not open finish review: " + JSON.stringify(finishProbe));
  }
  if (finishProbe.hasTitle && !/练习登顶，不计总纪录/.test(finishProbe.line)) {
    errors.push("partial debug/Practice summit should be labelled as non-record full-run evidence: " + JSON.stringify(finishProbe));
  }
  if (finishProbe.hasTitle && (!/微光 0\/12/.test(finishProbe.line) || finishProbe.whisper !== "山没有变轻，是你学会了继续向上。")) {
    errors.push("summit review should close the current-run Lumen loop without granting the all-Lumen ending to a partial route: " + JSON.stringify(finishProbe));
  }
  const runEvidenceReview = finishProbe.hasTitle ? await evaluate(cdp, `(() => {
    const title = document.querySelector("#finishTitle");
    const more = document.querySelector(".review-more");
    const text = more.textContent || "";
    const nextCard = [...document.querySelectorAll(".review-card")].find((card) => card.querySelector("span")?.textContent.trim() === "下一 Drill");
    const lossCard = [...document.querySelectorAll(".review-card")].find((card) => card.querySelector("span")?.textContent.trim() === "本轮最大损失");
    const sheetRect = document.querySelector(".finish-sheet")?.getBoundingClientRect();
    const titleRect = title?.getBoundingClientRect();
    return {
      text,
      focused: document.activeElement === title,
      next: nextCard?.querySelector("strong")?.textContent.trim() || "",
      advice: document.querySelector(".review-advice")?.textContent.trim() || "",
      lossLabel: lossCard?.querySelector("span")?.textContent.trim() || "",
      compactKeepsake: Boolean(sheetRect)
        && sheetRect.width <= 762
        && sheetRect.left <= 72
        && sheetRect.right <= window.innerWidth * 0.7
        && sheetRect.bottom <= window.innerHeight,
      emotionalHierarchy: Boolean(titleRect)
        && titleRect.height >= 44
        && document.querySelectorAll(".finish-stats > span").length === 4,
      collapsedAnalysis: document.querySelectorAll(".finish-disclosures > .review-more:not([open])").length === 2
    };
  })()`) : { text: "", focused: false };
  if (finishProbe.hasTitle && (!/本轮分幕/.test(runEvidenceReview.text)
    || !/已记录 1\/10 房/.test(runEvidenceReview.text)
    || runEvidenceReview.next !== "R10 Clean"
    || !/R10 星顶终线：本轮失误 1/.test(runEvidenceReview.advice)
    || runEvidenceReview.lossLabel !== "本轮最大损失"
    || !runEvidenceReview.compactKeepsake
    || !runEvidenceReview.emotionalHierarchy
    || !runEvidenceReview.collapsedAnalysis
    || !runEvidenceReview.focused)) {
    errors.push("summit review should preserve the summit scene while exposing bounded current-run evidence without losing modal focus: " + JSON.stringify(runEvidenceReview));
  }
  if (finishProbe.hasTitle) {
    await evaluate(cdp, `document.querySelector(".review-more").open = true`);
    await waitUntil("current-run report action becomes visible", () => evaluate(cdp, `document.querySelector("[data-copy-run-report]")?.getClientRects().length > 0`));
    await clickSelector(cdp, "[data-copy-run-report]");
    const runReport = await waitUntil("current-run report copy", () => evaluate(cdp, `(() => {
      const text = window.__summitLastRunReport || "";
      const status = document.querySelector("#gameStatus").textContent;
      return text && /本轮报告/.test(status) ? { text, status } : null;
    })()`));
    if (!/结果：部分路线 1\/10 房/.test(runReport.text)
      || !/IV · 星顶/.test(runReport.text)
      || !/R10 星顶终线：0:/.test(runReport.text)
      || !/R1 起势山门：—/.test(runReport.text)
      || !/微光 0\/12/.test(runReport.text)
      || !/重点：最慢 R10 星顶终线 0:/.test(runReport.text)
      || !/不含身份、设备名称、输入历史或路线坐标/.test(runReport.text)
      || /userAgent|@/.test(runReport.text)
      || runReport.text.length > 4000) {
      errors.push("current-run report should be bounded, useful and privacy-labelled: " + JSON.stringify(runReport));
    }
  }
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
  await openSettingsGroup(cdp, ".settings-group-training");
  await openSettingsGroup(cdp, ".practice-subgroup-advanced");
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
  await evaluate(cdp, `document.querySelector(".practice-subgroup-advanced").open = false`);
  await waitUntil("advanced disclosure closes with synchronized semantics", () => evaluate(cdp, `(() => {
    const group = document.querySelector(".practice-subgroup-advanced");
    return !group.open;
  })()`));
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("practice panel closes", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));

  await clickSelector(cdp, "#startSettingsButton");
  await waitUntil("quiet settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  const defaultOpenGroups = await evaluate(cdp, `[...document.querySelectorAll(".settings-group.settings-only[open]")].map((group) => group.className)`);
  if (defaultOpenGroups.length !== 0) errors.push("settings should open with every system group collapsed: " + JSON.stringify(defaultOpenGroups));
  const collapsedDisclosureSemantics = await evaluate(cdp, `(() => {
    const groups = [...document.querySelectorAll(".settings-group.settings-only")];
    return {
      groupCount: groups.length,
      generatedContent: groups.map((group) => getComputedStyle(group.querySelector("summary"), "::after").content),
      expandedStates: groups.map((group) => group.querySelector("summary")?.getAttribute("aria-expanded") || ""),
      chevrons: groups.map((group) => {
        const chevrons = group.querySelectorAll(":scope > summary > .settings-group-chevron");
        return {
          count: chevrons.length,
          hidden: chevrons[0]?.getAttribute("aria-hidden") || ""
        };
      })
    };
  })()`);
  if (
    collapsedDisclosureSemantics.groupCount < 5
    || collapsedDisclosureSemantics.generatedContent.some((content) => content !== "none")
    || collapsedDisclosureSemantics.expandedStates.some((state) => state !== "false")
    || collapsedDisclosureSemantics.chevrons.some((chevron) => chevron.count !== 1 || chevron.hidden !== "true")
  ) {
    errors.push("settings disclosures should keep decorative chevrons out of accessible names and expose collapsed state: " + JSON.stringify(collapsedDisclosureSemantics));
  }
  await openSettingsGroup(cdp, ".settings-group-controls");
  const openedControlsDisclosure = await evaluate(cdp, `(() => {
    const group = document.querySelector(".settings-group-controls");
    const summary = group?.querySelector(":scope > summary");
    const chevron = summary?.querySelector(".settings-group-chevron");
    return {
      open: Boolean(group?.open),
      expanded: summary?.getAttribute("aria-expanded") || "",
      chevronHidden: chevron?.getAttribute("aria-hidden") || "",
      generatedContent: summary ? getComputedStyle(summary, "::after").content : ""
    };
  })()`);
  if (!openedControlsDisclosure.open || openedControlsDisclosure.expanded !== "true" || openedControlsDisclosure.chevronHidden !== "true" || openedControlsDisclosure.generatedContent !== "none") {
    errors.push("opening a settings disclosure should synchronize its accessible expanded state without exposing the decorative chevron: " + JSON.stringify(openedControlsDisclosure));
  }
  const settingsAudit = await evaluate(cdp, `(() => {
    const visible = (selector) => {
      const el = document.querySelector(selector);
      return !!el && getComputedStyle(el).display !== "none";
    };
    const rect = document.querySelector("#settingsPanel").getBoundingClientRect();
    const displayRect = document.querySelector(".settings-group-display").getBoundingClientRect();
    const feedbackRect = document.querySelector(".settings-group-feedback").getBoundingClientRect();
    const rgba = (value) => {
      const channels = (String(value).match(/[\\d.]+/g) || []).map(Number);
      return {
        r: channels[0] || 0,
        g: channels[1] || 0,
        b: channels[2] || 0,
        a: channels.length > 3 ? channels[3] : 1
      };
    };
    const composite = (foreground, background) => ({
      r: foreground.r * foreground.a + background.r * (1 - foreground.a),
      g: foreground.g * foreground.a + background.g * (1 - foreground.a),
      b: foreground.b * foreground.a + background.b * (1 - foreground.a),
      a: 1
    });
    const effectiveBackground = (element) => {
      const ancestors = [];
      for (let current = element; current instanceof Element; current = current.parentElement) ancestors.unshift(current);
      return ancestors.reduce((background, current) => {
        const layer = rgba(getComputedStyle(current).backgroundColor);
        return layer.a > 0 ? composite(layer, background) : background;
      }, { r: 255, g: 255, b: 255, a: 1 });
    };
    const luminance = (color) => {
      const channels = [color.r, color.g, color.b].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const contrast = (element, pseudo = "") => {
      const background = effectiveBackground(element);
      const foreground = composite(rgba(getComputedStyle(element, pseudo).color), background);
      const foregroundLum = luminance(foreground);
      const backgroundLum = luminance(background);
      return (Math.max(foregroundLum, backgroundLum) + 0.05) / (Math.min(foregroundLum, backgroundLum) + 0.05);
    };
    const contrastSamples = [
      ["group label", document.querySelector(".settings-group summary > span"), ""],
      ["account summary", document.querySelector(".settings-group-account summary > small"), ""],
      ["control label", document.querySelector(".settings-group-controls .control-row > span"), ""],
      ["profile detail", document.querySelector("#controlProfileNote span"), ""],
      ["binding status", document.querySelector("#keyBindingStatus"), ""],
      ["binding label", document.querySelector("[data-binding-action] span"), ""],
      ["binding section title", document.querySelector(".binding-section-title"), ""],
      ["disclosure chevron", document.querySelector(".settings-group-chevron"), ""],
      ["account note", document.querySelector("#accountNote"), ""],
      ["account status", document.querySelector("#accountStatus"), ""],
      ["email placeholder", document.querySelector("#accountEmail"), "::placeholder"]
    ].map(([label, element, pseudo]) => ({ label, ratio: Number(contrast(element, pseudo).toFixed(2)) }));
    return {
      title: document.querySelector("#panelTitle")?.textContent || "",
      modeSettings: document.querySelector("#settingsPanel").classList.contains("mode-settings"),
      settingsVisible: visible(".settings-group-controls") && visible(".settings-group-feedback"),
      practiceHidden: !visible(".settings-group-training") && !visible(".settings-group-room"),
      audioButton: visible("#audioTestButton"),
      diagnosticsButton: visible("#diagnosticsButton"),
      feedbackTemplateButton: visible("#feedbackTemplateButton"),
      saveExportButton: visible("#saveExportButton"),
      saveImportButton: visible("#saveImportButton"),
      saveRestoreButton: visible("#saveRestoreButton"),
      contextualActionLabels: {
        audio: document.querySelector("#audioTestButton")?.getAttribute("aria-label") || "",
        diagnostics: document.querySelector("#diagnosticsButton")?.getAttribute("aria-label") || "",
        template: document.querySelector("#feedbackTemplateButton")?.getAttribute("aria-label") || "",
        export: document.querySelector("#saveExportButton")?.getAttribute("aria-label") || "",
        download: document.querySelector("#saveDownloadButton")?.getAttribute("aria-label") || "",
        import: document.querySelector("#saveImportButton")?.getAttribute("aria-label") || "",
        restore: document.querySelector("#saveRestoreButton")?.getAttribute("aria-label") || ""
      },
      restoreDisabled: document.querySelector("#saveRestoreButton")?.disabled || false,
      gamepadStatus: document.querySelector("#gamepadStatus")?.textContent || "",
      gamepadDeadzone: visible("#gamepadDeadzoneSlider"),
      systemList: getComputedStyle(document.querySelector(".settings-body")).display === "block",
      panelWidthCalm: rect.width <= 560,
      displayToFeedbackGap: Math.round(feedbackRect.top - displayRect.bottom),
      contrastSamples,
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
  if (!settingsAudit.audioButton) errors.push("settings should expose audio test button");
  if (!settingsAudit.diagnosticsButton) errors.push("settings should expose diagnostics copy button");
  if (!settingsAudit.feedbackTemplateButton) errors.push("settings should expose feedback template copy button");
  if (!settingsAudit.saveExportButton || !settingsAudit.saveImportButton || !settingsAudit.saveRestoreButton) errors.push("settings should expose save export/import/restore buttons");
  if (new Set(Object.values(settingsAudit.contextualActionLabels)).size !== 7 || Object.values(settingsAudit.contextualActionLabels).some((label) => !label)) {
    errors.push("compact settings actions should expose unique contextual accessible names: " + JSON.stringify(settingsAudit.contextualActionLabels));
  }
  if (!settingsAudit.restoreDisabled) errors.push("restore should start disabled when no import backup exists");
  if (!/未连接|standard|不支持|未检测/.test(settingsAudit.gamepadStatus)) errors.push("settings should expose non-sensitive gamepad status: " + settingsAudit.gamepadStatus);
  if (!settingsAudit.gamepadDeadzone) errors.push("settings should expose gamepad deadzone control");
  if (!settingsAudit.systemList || !settingsAudit.panelWidthCalm) errors.push("settings should render as a calm one-column system list: " + JSON.stringify(settingsAudit));
  if (settingsAudit.displayToFeedbackGap < 14) errors.push("feedback/save section should be visually separated from display settings: " + JSON.stringify(settingsAudit));
  if (settingsAudit.contrastSamples.some((sample) => sample.ratio < 4.5)) {
    errors.push("small settings text should retain at least 4.5:1 contrast: " + JSON.stringify(settingsAudit.contrastSamples));
  }
  const comfortControls = await evaluate(cdp, `({
    lowPerformance: !!document.querySelector("#lowPerformanceToggle"),
    touchSize: !!document.querySelector("#touchSizeSlider"),
    resetAppearance: (() => {
      const button = document.querySelector("#resetKeyBindings");
      const style = getComputedStyle(button);
      return {
        disabled: button.disabled,
        background: style.backgroundColor,
        color: style.color
      };
    })()
  })`);
  if (!comfortControls.lowPerformance) errors.push("settings should expose low-performance toggle");
  if (!comfortControls.touchSize) errors.push("settings should expose touch-size slider");
  if (comfortControls.resetAppearance.disabled || !/255, 255, 255/.test(comfortControls.resetAppearance.background) || !/63, 91, 102/.test(comfortControls.resetAppearance.color)) {
    errors.push("enabled restore-layout action should use the clear light secondary style instead of looking disabled: " + JSON.stringify(comfortControls.resetAppearance));
  }
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
  await clickSelector(cdp, '[data-binding-action="jump"]');
  await keyTap(cdp, "Escape", "Escape");
  const cancelledBinding = await evaluate(cdp, `(() => ({
    panelOpen: !document.querySelector("#settingsPanel").classList.contains("hidden"),
    preset: document.querySelector("#controlPreset").value,
    classicPressed: document.querySelector('[data-preset-choice="classic"]')?.getAttribute("aria-pressed"),
    jump: document.querySelector('[data-binding-action="jump"] kbd')?.textContent.trim(),
    capturing: document.querySelectorAll("[data-binding-action].capturing").length,
    status: document.querySelector("#keyBindingStatus")?.textContent || ""
  }))()`);
  if (!cancelledBinding.panelOpen || cancelledBinding.preset !== "classic" || cancelledBinding.classicPressed !== "true" || cancelledBinding.jump !== "C" || cancelledBinding.capturing !== 0 || !/原方案保持不变/.test(cancelledBinding.status)) {
    errors.push("Escape should cancel rebinding without silently switching the active preset: " + JSON.stringify(cancelledBinding));
  }
  await clickSelector(cdp, '[data-binding-action="dash"]');
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("closing settings cancels pending rebinding", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await clickSelector(cdp, "#startSettingsButton");
  await openSettingsGroup(cdp, ".settings-group-controls");
  const closedBinding = await evaluate(cdp, `({
    preset: document.querySelector("#controlPreset").value,
    dash: document.querySelector('[data-binding-action="dash"] kbd')?.textContent.trim(),
    capturing: document.querySelectorAll("[data-binding-action].capturing").length
  })`);
  if (closedBinding.preset !== "classic" || closedBinding.dash !== "X" || closedBinding.capturing !== 0) {
    errors.push("closing settings should roll back an unfinished key capture: " + JSON.stringify(closedBinding));
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
  await clickSelector(cdp, '[data-layout-choice="pc"]');
  const customAfterPcSwitch = await evaluate(cdp, `(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    return {
      layout: saved.keyboardLayout,
      preset: saved.controlsPreset,
      jump: saved.customBindings?.jump,
      label: document.querySelector('[data-binding-action="jump"] kbd')?.textContent.trim(),
      status: document.querySelector("#gameStatus")?.textContent || ""
    };
  })()`);
  await clickSelector(cdp, '[data-layout-choice="mac"]');
  const customAfterMacSwitch = await evaluate(cdp, `(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    return {
      layout: saved.keyboardLayout,
      preset: saved.controlsPreset,
      jump: saved.customBindings?.jump,
      label: document.querySelector('[data-binding-action="jump"] kbd')?.textContent.trim(),
      status: document.querySelector("#gameStatus")?.textContent || ""
    };
  })()`);
  if (customAfterPcSwitch.layout !== "pc" || customAfterPcSwitch.preset !== "custom" || customAfterPcSwitch.jump !== "KeyF" || customAfterPcSwitch.label !== "F" || !/自定义键位保持不变/.test(customAfterPcSwitch.status)
    || customAfterMacSwitch.layout !== "mac" || customAfterMacSwitch.preset !== "custom" || customAfterMacSwitch.jump !== "KeyF" || customAfterMacSwitch.label !== "F" || !/自定义键位保持不变/.test(customAfterMacSwitch.status)) {
    errors.push("switching Mac and PC labels must preserve every custom binding until the explicit restore action: " + JSON.stringify({ customAfterPcSwitch, customAfterMacSwitch }));
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
  const audioFailure = await evaluate(cdp, `(() => {
    window.__summitSmokeAudioUnavailable = true;
    document.querySelector("#audioTestButton")?.click();
    return document.querySelector("#gameStatus")?.textContent || "";
  })()`);
  const unavailableAudioStatus = await waitUntil("audio unavailable status", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#gameStatus")?.textContent || "";
    return /声音暂不可用/.test(text) ? text : null;
  })()`), 1200, 40);
  await evaluate(cdp, `window.__summitSmokeAudioUnavailable = false`);
  await clickSelector(cdp, "#audioTestButton");
  const audioStatus = await waitUntil("audio test status", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#gameStatus")?.textContent || "";
    return /声音试听/.test(text) ? text : null;
  })()`), 1200, 40);
  await evaluate(cdp, `window.__summitSmokeAudioContextClosed = true`);
  await clickSelector(cdp, "#audioTestButton");
  const audioRecoveryStatus = await waitUntil("audio context recovery status", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#gameStatus")?.textContent || "";
    return /声音试听/.test(text) ? text : null;
  })()`), 1200, 40);
  if (!/声音暂不可用/.test(unavailableAudioStatus) || !/声音试听/.test(audioStatus) || !/声音试听/.test(audioRecoveryStatus)) {
    errors.push("audio test should distinguish unavailable audio and recover a replaced context: " + JSON.stringify({ audioFailure, unavailableAudioStatus, audioStatus, audioRecoveryStatus }));
  }
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
      hasRunEvidence: Array.isArray(snapshot.run?.roomTimes)
        && snapshot.run.roomTimes.length === 10
        && Array.isArray(snapshot.run?.roomMistakes)
        && snapshot.run.roomMistakes.length === 10
        && Array.isArray(snapshot.run?.chapterSplits)
        && snapshot.run.chapterSplits.length === 4,
      hasNoUserAgent: !JSON.stringify(snapshot).includes("userAgent"),
      status
    };
  })()`), 5000);
  if (!/^\d{8}-p\d+$/.test(diagnostics.build) || diagnostics.schemaVersion !== 1 || diagnostics.feedbackType !== "mobile" || !/R7 touch note/.test(diagnostics.feedbackNote || "") || !diagnostics.gamepad || typeof diagnostics.gamepad.deadzone !== "number" || !diagnostics.hasSettings || !diagnostics.hasProgress || !diagnostics.hasRunEvidence || !diagnostics.hasNoUserAgent || !/诊断/.test(diagnostics.status)) {
    errors.push("diagnostics button did not produce a safe feedback snapshot: " + JSON.stringify(diagnostics));
  }
  await clickSelector(cdp, "#feedbackTemplateButton");
  const template = await waitUntil("feedback template", () => evaluate(cdp, `(() => {
    const text = window.__summitLastFeedbackTemplate || "";
    return /Summit Spark/.test(text) && /反馈类型：移动端/.test(text) && /复现步骤：/.test(text) && !/userAgent/.test(text) ? text : null;
  })()`), 5000);
  if (!/R7 touch note/.test(template)) errors.push("feedback template should include the current note");
  await sleep(420);

  const outsidePoint = await evaluate(cdp, `({ x: 18, y: Math.round(innerHeight / 2) })`);
  await clickPoint(cdp, outsidePoint.x, outsidePoint.y);
  await waitUntil("outside pointer closes quiet settings", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const outsideDismissFocus = await waitUntil("outside pointer restores safe focus", () => evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const active = document.activeElement;
    return active && active !== document.body && !panel.contains(active) ? (active.id || active.tagName) : "";
  })()`));
  if (outsideDismissFocus !== "startSettingsButton") errors.push("outside settings dismissal should return start-screen focus to its visible trigger: " + outsideDismissFocus);
  await clickSelector(cdp, "#startSettingsButton");
  await waitUntil("quiet settings reopens collapsed", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelectorAll(".settings-group.settings-only[open]").length === 0`));
  const outsideStartPoint = await evaluate(cdp, `(() => {
    const rect = document.querySelector("#startButton").getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  })()`);
  await clickPoint(cdp, outsideStartPoint.x, outsideStartPoint.y);
  await waitUntil("outside start-button region closes without click-through", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && !document.querySelector("#overlay").classList.contains("hidden") && document.querySelector("#gameHud").hidden`));
  await clickSelector(cdp, "#startSettingsButton");
  const outsideTrainingPoint = await evaluate(cdp, `(() => {
    const rect = document.querySelector("#openTrainingButton").getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  })()`);
  await clickPoint(cdp, outsideTrainingPoint.x, outsideTrainingPoint.y);
  await waitUntil("real outside training-button pointer switches panels", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("switched practice panel closes to its actual trigger", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && document.activeElement === document.querySelector("#openTrainingButton")`));
  await clickSelector(cdp, "#startSettingsButton");
  const outsideAccountPoint = await evaluate(cdp, `(() => {
    const rect = document.querySelector("#startAccountButton").getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  })()`);
  await clickPoint(cdp, outsideAccountPoint.x, outsideAccountPoint.y);
  await waitUntil("real outside account-button pointer switches panels", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("account-focused") && document.querySelector(".settings-group-account").open`));
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("switched account panel closes to its actual trigger", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && document.activeElement === document.querySelector("#startAccountButton")`));
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("practice panel opens for feel", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  await openSettingsGroup(cdp, ".practice-subgroup-feel");
  await evaluate(cdp, `document.querySelector(".settings-group-training")?.scrollIntoView({ block: "start" })`);
  await sleep(160);
  await clickSelector(cdp, "[data-feel-fixture]");
  await waitUntil("feel fixture launch", () => evaluate(cdp, `/手感校准/.test(document.querySelector("#gameStatus").textContent)`));
  await clickSelector(cdp, "#practiceButton");
  await waitUntil("practice reopened after feel fixture", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  await openSettingsGroup(cdp, ".practice-subgroup-feel");
  await evaluate(cdp, `document.querySelector(".settings-group-training")?.scrollIntoView({ block: "start" })`);
  await sleep(160);
  const feelState = await evaluate(cdp, `document.querySelector(".feel-card.active, .feel-card.recent, .feel-card.interrupted")?.className || ""`);
  if (!/feel-card/.test(feelState)) errors.push("Feel Lab did not preserve active/recent/interrupted state after launch");

  const routeAfterFeel = await evaluate(cdp, `(() => {
    const group = document.querySelector(".settings-group-training");
    const subgroup = document.querySelector(".practice-subgroup-route");
    const panel = document.querySelector("#settingsPanel");
    const card = document.querySelector("[data-route-contract]");
    if (group) group.open = true;
    if (subgroup) subgroup.open = true;
    if (card) card.scrollIntoView({ block: "center", inline: "center" });
    const rect = card ? card.getBoundingClientRect() : null;
    const hit = rect ? document.elementFromPoint(Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2)), Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2))) : null;
    return {
      groupOpen: Boolean(group?.open),
      subgroupOpen: Boolean(subgroup?.open),
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
  await evaluate(cdp, `(() => {
    const select = document.querySelector("#roomSelect");
    select.value = "5";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  const r6AuthoredBrief = await waitUntil("R6 brief names its authored mechanic counts", () => evaluate(cdp, `(() => {
    const brief = document.querySelector("#roomBrief").textContent.trim();
    const launch = document.querySelector("#focusRoomButton").textContent.trim();
    if (document.querySelector("#roomSelect").value !== "5" || !/^开始 R6 /.test(launch)) return null;
    return { brief, launch };
  })()`));
  if (!/R6 旧峰出口/.test(r6AuthoredBrief.brief)
    || !/六枚光继/.test(r6AuthoredBrief.brief)
    || !/三级弹簧/.test(r6AuthoredBrief.brief)
    || /双光继|双弹簧/.test(r6AuthoredBrief.brief)) {
    errors.push("R6 Practice brief should describe its actual six-relay, three-stage-spring long route without stale double-mechanic copy: " + JSON.stringify(r6AuthoredBrief));
  }
  await evaluate(cdp, `(() => {
    const select = document.querySelector("#roomSelect");
    select.value = "1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitUntil("room selector returns to R2 before launch", () => evaluate(cdp, `document.querySelector("#roomSelect").value === "1" && /^开始 R2 /.test(document.querySelector("#focusRoomButton").textContent.trim())`));
  await clickSelector(cdp, "#focusRoomButton");
  await waitUntil("selected room action starts R2 Drill", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && /Drill R2/.test(document.querySelector("#gameStatus").textContent)`));

  await navigateApp(cdp, baseUrl, "R3 full-route Practice entry");
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("R3 practice panel opens", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-room");
  await evaluate(cdp, `(() => {
    const select = document.querySelector("#roomSelect");
    select.value = "2";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await clickSelector(cdp, "#focusRoomButton");
  await waitUntil("selected room action starts R3 Drill", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && /Drill R3/.test(document.querySelector("#gameStatus").textContent)`));
  await keyTap(cdp, "F3", "F3");
  const r3PracticeEntry = await waitUntil("R3 Practice uses its full-route left checkpoint", () => evaluate(cdp, `(() => {
    const debug = document.querySelector("#debugPanel").textContent;
    const position = debug.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    const ground = /ground 1/.test(debug);
    const flow = debug.match(/flow (\\d+)/);
    const dash = debug.match(/dash (\\d+)/);
    if (!/room 3\\/10/.test(debug) || !position || !ground || !flow || !dash) return null;
    return { x: Number(position[1]), y: Number(position[2]), ground, flow: Number(flow[1]), dash: Number(dash[1]) };
  })()`), 3500);
  if (Math.abs(r3PracticeEntry.x - 70.5) > 1
    || Math.abs(r3PracticeEntry.y - 167) > 1
    || !r3PracticeEntry.ground
    || r3PracticeEntry.flow !== 0
    || r3PracticeEntry.dash !== 1) {
    errors.push("direct R3 Practice should begin on the full-route left Gate capstone checkpoint: " + JSON.stringify(r3PracticeEntry));
  }
  await keyHold(cdp, "ArrowRight", "ArrowRight", 420);
  await sleep(120);
  const fullResourceRefill = await evaluate(cdp, `(() => {
    const debug = document.querySelector("#debugPanel").textContent;
    const position = debug.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    const flow = debug.match(/flow (\\d+)/);
    const dash = debug.match(/dash (\\d+)/);
    return position && flow && dash
      ? { x: Number(position[1]), y: Number(position[2]), flow: Number(flow[1]), dash: Number(dash[1]), ground: /ground 1/.test(debug), debug }
      : { debug };
  })()`);
  if (fullResourceRefill.flow !== 0
    || fullResourceRefill.dash !== 1
    || fullResourceRefill.x < 105
    || fullResourceRefill.x > 185
    || !fullResourceRefill.ground) {
    errors.push("walking through a refill with full dash and stamina should neither consume it nor award passive Flow: " + JSON.stringify(fullResourceRefill));
  }
  await keyTap(cdp, "KeyR", "R");
  await waitUntil("R3 quick retry returns to the authored checkpoint", () => evaluate(cdp, `(() => {
    const debug = document.querySelector("#debugPanel").textContent;
    const position = debug.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    return position && Math.abs(Number(position[1]) - 70.5) < 1 && /dash 1/.test(debug) && /flow 0/.test(debug);
  })()`), 2500);
  await keyTap(cdp, "ShiftLeft", "Shift");
  await sleep(600);
  const spentResourceRefill = await evaluate(cdp, `(() => {
    const debug = document.querySelector("#debugPanel").textContent;
    const flow = debug.match(/flow (\\d+)/);
    const dash = debug.match(/dash (\\d+)/);
    const position = debug.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    return flow && dash && position
      ? { flow: Number(flow[1]), dash: Number(dash[1]), x: Number(position[1]), y: Number(position[2]), debug }
      : { debug };
  })()`);
  if (spentResourceRefill.flow < 19 || spentResourceRefill.dash !== 1) {
    errors.push("R3 refill should still restore and reward a genuinely spent dash: " + JSON.stringify(spentResourceRefill));
  }
  await keyTap(cdp, "F3", "F3");

  await navigateApp(cdp, baseUrl, "R7 grounded Practice seed");
  await evaluate(cdp, `(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.assistMode = "off";
    saved.controlsPreset = "comfort";
    saved.keyboardLayout = "pc";
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
  })()`);
  await navigateApp(cdp, baseUrl, "R7 grounded Practice entry");
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("R7 practice panel opens", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-room");
  await evaluate(cdp, `(() => {
    const select = document.querySelector("#roomSelect");
    select.value = "6";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await clickSelector(cdp, "#focusRoomButton");
  await waitUntil("selected room action starts R7 Drill", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && /Drill R7/.test(document.querySelector("#gameStatus").textContent)`));
  await keyTap(cdp, "F3", "F3");
  const r7PracticeEntry = await waitUntil("R7 Practice uses its grounded checkpoint", () => evaluate(cdp, `(() => {
    const debug = document.querySelector("#debugPanel").textContent;
    const position = debug.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    const ground = /ground 1/.test(debug);
    if (!/room 7\\/10/.test(debug) || !position || !ground) return null;
    return { x: Number(position[1]), y: Number(position[2]), ground };
  })()`), 3500);
  if (Math.abs(r7PracticeEntry.x - 70.5) > 1 || Math.abs(r7PracticeEntry.y - 487) > 1 || !r7PracticeEntry.ground) {
    errors.push("direct R7 Practice should begin on the intended grounded Wind Gorge checkpoint: " + JSON.stringify(r7PracticeEntry));
  }
  await keyDown(cdp, "KeyD", "D");
  let r7WindWake;
  try {
    r7WindWake = await waitUntil("R7 floor route enters its authored updraft", () => evaluate(cdp, `(() => {
      const debug = document.querySelector("#debugPanel").textContent;
      const position = debug.match(/pos ([\\d.-]+), ([\\d.-]+)/);
      if (!position || !/wind 1/.test(debug)) return null;
      return { x: Number(position[1]), y: Number(position[2]), debug };
    })()`), 3600, 20);
  } finally {
    await keyUp(cdp, "KeyD", "D");
  }
  await keyHold(cdp, "KeyA", "A", 520);
  const r7WindExit = await waitUntil("R7 updraft wake clears after leaving the exact field", () => evaluate(cdp, `(() => {
    const debug = document.querySelector("#debugPanel").textContent;
    const position = debug.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    if (!position || !/wind 0/.test(debug)) return null;
    return { x: Number(position[1]), y: Number(position[2]), debug };
  })()`), 1400, 20);
  if (r7WindWake.x < 630
    || r7WindWake.x > 730
    || r7WindExit.x >= r7WindWake.x
    || !/wind 1/.test(r7WindWake.debug)
    || !/wind 0/.test(r7WindExit.debug)) {
    errors.push("R7 player-relative updraft wake should exist only inside the exact occupied field: " + JSON.stringify({ r7WindWake, r7WindExit }));
  }
  await keyTap(cdp, "F3", "F3");

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

async function runChapterTransitionInputSmoke(cdp, baseUrl) {
  async function launchR4Transition(label) {
    await navigateApp(cdp, baseUrl, label);
    await clickSelector(cdp, "#openTrainingButton");
    await waitUntil(label + " practice panel opens", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
    await openSettingsGroup(cdp, ".settings-group-room");
    await evaluate(cdp, `(() => {
      const select = document.querySelector("#roomSelect");
      select.value = "3";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await clickSelector(cdp, "#focusRoomButton");
    await waitUntil(label + " starts R4 transition", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && /Drill R4/.test(document.querySelector("#gameStatus").textContent)`));
    await enableDebugPanel(cdp);
    return waitUntil(label + " exposes act timer", () => evaluate(cdp, `(() => {
      const text = document.querySelector("#debugPanel").textContent;
      const act = text.match(/act ([\\d.]+)/);
      const pos = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
      return act && pos && Number(act[1]) > 1.2
        ? { act: Number(act[1]), x: Number(pos[1]), y: Number(pos[2]), text }
        : null;
    })()`), 3500);
  }

  const earlyStart = await launchR4Transition("early chapter-buffer");
  await keyTap(cdp, "Space", " ");
  await keyTap(cdp, "KeyX", "X");
  await sleep(360);
  const earlyExpired = await evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const act = text.match(/act ([\\d.]+)/);
    const jump = text.match(/jbuf ([\\d.]+)/);
    const dash = text.match(/dbuf ([\\d.]+)/);
    return {
      act: act ? Number(act[1]) : -1,
      jump: jump ? Number(jump[1]) : -1,
      dash: dash ? Number(dash[1]) : -1,
      text
    };
  })()`);
  const earlySettled = await waitUntil("early chapter inputs remain stale after transition", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const act = text.match(/act ([\\d.]+)/);
    const pos = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    const velocity = text.match(/vel ([\\d.-]+), ([\\d.-]+)/);
    const dash = text.match(/dash (\\d+)/);
    if (!act || Number(act[1]) !== 0 || !pos || !velocity || !dash || !/ground 1/.test(text)) return null;
    return {
      x: Number(pos[1]),
      y: Number(pos[2]),
      vx: Number(velocity[1]),
      vy: Number(velocity[2]),
      dash: Number(dash[1]),
      text
    };
  })()`), 4000);
  if (earlyExpired.act <= 0.4
    || earlyExpired.jump !== 0
    || earlyExpired.dash !== 0
    || !/surface warm-dust/.test(earlyStart.text)
    || !/relays 5  gate 0\.00  relic 0\.00/.test(earlyStart.text)
    || Math.abs(earlySettled.x - earlyStart.x) > 2
    || Math.abs(earlySettled.y - earlyStart.y) > 2
    || Math.abs(earlySettled.vx) > 2
    || Math.abs(earlySettled.vy) > 2
    || earlySettled.dash !== 1) {
    errors.push("chapter transition should expire early Jump/Dash and expose Old Peak landing material without launching the new act: " + JSON.stringify({ earlyStart, earlyExpired, earlySettled }));
  }

  const lateStart = await launchR4Transition("late chapter-buffer");
  const lateWindow = await waitUntil("chapter transition reaches final input-buffer window", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const act = text.match(/act ([\\d.]+)/);
    const remaining = act ? Number(act[1]) : -1;
    return remaining > 0 && remaining <= 0.09 ? { remaining, text } : null;
  })()`), 3500, 8);
  await keyTap(cdp, "Space", " ");
  let lateJump;
  try {
    lateJump = await waitUntil("late chapter Jump connects after transition", () => evaluate(cdp, `(() => {
      const text = document.querySelector("#debugPanel").textContent;
      const act = text.match(/act ([\\d.]+)/);
      const pos = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
      const velocity = text.match(/vel ([\\d.-]+), ([\\d.-]+)/);
      if (!act || Number(act[1]) !== 0 || !pos || !velocity) return null;
      const state = {
        x: Number(pos[1]),
        y: Number(pos[2]),
        vx: Number(velocity[1]),
        vy: Number(velocity[2]),
        text
      };
      return state.y < ${lateStart.y - 3} && state.vy < -20 ? state : null;
    })()`), 1800, 10);
  } catch (error) {
    const snapshot = await evaluate(cdp, `document.querySelector("#debugPanel").textContent`);
    throw new Error(`${error.message}: ${snapshot}`);
  }
  if (!(lateWindow.remaining > 0)
    || lateJump.y >= lateStart.y - 3
    || lateJump.vy >= -20) {
    errors.push("chapter transition should preserve a Jump pressed inside the final normal buffer window: " + JSON.stringify({ lateStart, lateWindow, lateJump }));
  }
}

async function runOldPeakRelicSmoke(cdp, baseUrl) {
  await navigateApp(cdp, baseUrl, "Old Peak Relay relic");
  await clickSelector(cdp, "#startButton");
  await enableDebugPanel(cdp);
  await keyTap(cdp, "Digit5", "5");
  const dormant = await waitUntil("R5 Relay relic starts dormant", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /room 5\\/10/.test(text) && /relays 5  gate 0\\.00  relic 0\\.00/.test(text) ? { text } : null;
  })()`), 3500);
  await keyDown(cdp, "KeyD", "D");
  const awakened = await waitUntil("R5 first Relay awakens its switchback relic", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    return /relays 5  gate 0\\.00  relic 0\\.20/.test(text) && position
      ? { x: Number(position[1]), y: Number(position[2]), text }
      : null;
  })()`), 1800, 20);
  await keyUp(cdp, "KeyD", "D");
  await sleep(4350);
  const afterCooldown = await evaluate(cdp, `document.querySelector("#debugPanel").textContent`);
  await keyTap(cdp, "KeyR", "R");
  const reset = await waitUntil("R5 retry clears attempt-local Relay relic", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /快速重开 · R5/.test(document.querySelector("#gameStatus").textContent)
      && /relays 5  gate 0\\.00  relic 0\\.00/.test(text)
      ? { text }
      : null;
  })()`), 3500);
  if (!/relic 0\.00/.test(dormant.text)
    || awakened.x < 180
    || awakened.x > 235
    || !/relic 0\.20/.test(afterCooldown)
    || !/relic 0\.00/.test(reset.text)) {
    errors.push("R5 Relay relic should awaken once, survive node cooldown and clear through the room retry lifecycle: " + JSON.stringify({ dormant, awakened, afterCooldown, reset }));
  }
}

async function runMountainGateLandmarkSmoke(cdp, baseUrl) {
  await navigateApp(cdp, baseUrl, "Mountain Gate landmark seed");
  await evaluate(cdp, `(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.assistMode = "off";
    saved.controlsPreset = "comfort";
    saved.keyboardLayout = "pc";
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
  })()`);
  await navigateApp(cdp, baseUrl, "Mountain Gate landmarks");
  await clickSelector(cdp, "#startButton");
  await enableDebugPanel(cdp);
  const r1Dormant = await waitUntil("R1 gate landmark starts dormant", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /room 1\\/10/.test(text) && /gate 0\\.00  relic 0\\.00/.test(text) ? { text } : null;
  })()`), 2500, 20);
  let r1Awake = null;
  const r1AttemptSnapshots = [];
  const r1Timings = [
    { dash: 75, spark: 185 },
    { dash: 65, spark: 175 }
  ];
  for (let attempt = 0; attempt < r1Timings.length && !r1Awake; attempt += 1) {
    if (attempt > 0) {
      await keyTap(cdp, "KeyR", "R");
      await waitUntil("R1 bounded Spark retry restores its start", () => evaluate(cdp, `(() => {
        const text = document.querySelector("#debugPanel").textContent;
        return /快速重开 · R1/.test(document.querySelector("#gameStatus")?.textContent || "")
          && /gate 0\\.00  relic 0\\.00/.test(text);
      })()`), 2500, 20);
    }
    const timing = r1Timings[attempt];
    await evaluate(cdp, `new Promise((resolve) => {
      const send = (type, code, key) => window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }));
      const tap = (code, key) => {
        send("keydown", code, key);
        send("keyup", code, key);
      };
      send("keydown", "KeyD", "d");
      tap("Space", " ");
      setTimeout(() => tap("KeyK", "k"), ${timing.dash});
      setTimeout(() => tap("Space", " "), ${timing.spark});
      setTimeout(() => {
        send("keyup", "KeyD", "d");
        resolve(true);
      }, 330);
    })`);
    try {
      r1Awake = await waitUntil("R1 Spark wakes the gate steps", () => evaluate(cdp, `(() => {
        const text = document.querySelector("#debugPanel").textContent;
        return /room 1\\/10/.test(text) && /gate 1\\.00  relic 0\\.00/.test(text)
          ? { text }
          : null;
      })()`), 1100, 20);
    } catch {
      r1AttemptSnapshots.push(await evaluate(cdp, `document.querySelector("#debugPanel")?.textContent || ""`));
    }
  }
  if (!r1Awake) {
    throw new Error("R1 Spark wakes the gate steps timed out: " + JSON.stringify(r1AttemptSnapshots));
  }
  await keyTap(cdp, "KeyR", "R");
  const r1Reset = await waitUntil("R1 retry restores the dormant gate steps", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /快速重开 · R1/.test(document.querySelector("#gameStatus").textContent)
      && /gate 0\\.00  relic 0\\.00/.test(text)
      ? { text }
      : null;
  })()`), 2500, 20);
  await keyTap(cdp, "Digit2", "2");
  const r2Dormant = await waitUntil("R2 Relay bridge starts dormant", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /room 2\\/10/.test(text) && /ground 1/.test(text) && /act 0\\.000/.test(text)
      && /respawn 70\\.5, 263\\.0  overlap 0/.test(text)
      && /relays 2  gate 0\\.00  relic 0\\.00/.test(text)
      ? { text }
      : null;
  })()`), 4500, 20);
  let r2Awake = null;
  const r2AttemptSnapshots = [];
  const r2LaunchCues = [{ jumpX: 105, dashX: 155 }, { jumpX: 95, dashX: 145 }];
  for (let attempt = 0; attempt < r2LaunchCues.length && !r2Awake; attempt += 1) {
    if (attempt > 0) {
      await keyTap(cdp, "KeyR", "R");
      await waitUntil("R2 bounded Relay retry restores its start", () => evaluate(cdp, `(() => {
        const text = document.querySelector("#debugPanel").textContent;
        return /快速重开 · R2/.test(document.querySelector("#gameStatus").textContent)
          && /ground 1/.test(text)
          && /respawn 70\\.5, 263\\.0  overlap 0/.test(text)
          && /relays 2  gate 0\\.00  relic 0\\.00/.test(text);
      })()`), 3500, 20);
    }
    await keyDown(cdp, "KeyD", "D");
    try {
      try {
        await waitUntil("R2 real-input run-up reaches jump cue", () => evaluate(cdp, `(() => {
          const text = document.querySelector("#debugPanel").textContent;
          const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
          return position && Number(position[1]) >= ${r2LaunchCues[attempt].jumpX} && /ground 1/.test(text)
            ? { x: Number(position[1]), y: Number(position[2]), text }
            : null;
        })()`), 1200, 8);
      } catch {
        r2AttemptSnapshots.push(await evaluate(cdp, `document.querySelector("#debugPanel").textContent`));
        continue;
      }
      await keyHold(cdp, "Space", " ", 90);
      let launchCue;
      try {
        launchCue = await waitUntil("R2 real-input launch reaches dash cue", () => evaluate(cdp, `(() => {
          const text = document.querySelector("#debugPanel").textContent;
          const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
          if (!position) return null;
          const state = { x: Number(position[1]), y: Number(position[2]), text };
          return state.x >= ${r2LaunchCues[attempt].dashX} ? state : null;
        })()`), 1500, 8);
      } catch {
        r2AttemptSnapshots.push(await evaluate(cdp, `document.querySelector("#debugPanel").textContent`));
        continue;
      }
      if (launchCue.x > 245) {
        r2AttemptSnapshots.push(launchCue.text);
        continue;
      }
      await keyTap(cdp, "KeyK", "K");
      try {
        r2Awake = await waitUntil("R2 first unique Relay wakes half the bridge", () => evaluate(cdp, `(() => {
          const text = document.querySelector("#debugPanel").textContent;
          const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
          return /relays 2  gate 0\\.50  relic 0\\.00/.test(text) && position
            ? { x: Number(position[1]), y: Number(position[2]), text }
            : null;
        })()`), 2200, 20);
      } catch {
        r2AttemptSnapshots.push(await evaluate(cdp, `document.querySelector("#debugPanel").textContent`));
      }
    } finally {
      await keyUp(cdp, "KeyD", "D");
    }
  }
  if (!r2Awake) throw new Error(`R2 first unique Relay wakes half the bridge failed after two bounded input attempts: ${JSON.stringify(r2AttemptSnapshots)}`);
  await sleep(4350);
  const r2Cooldown = await evaluate(cdp, `document.querySelector("#debugPanel").textContent`);
  await keyTap(cdp, "KeyR", "R");
  const r2Reset = await waitUntil("R2 retry restores the dormant Relay bridge", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /快速重开 · R2/.test(document.querySelector("#gameStatus").textContent)
      && /respawn 70\\.5, 263\\.0  overlap 0/.test(text)
      && /relays 2  gate 0\\.00  relic 0\\.00/.test(text)
      ? { text }
      : null;
  })()`), 3500, 20);
  if (!/gate 0\.00/.test(r1Dormant.text)
    || !/gate 1\.00/.test(r1Awake.text)
    || !/gate 0\.00/.test(r1Reset.text)
    || !/gate 0\.00/.test(r2Dormant.text)
    || r2Awake.x < 270
    || r2Awake.x > 355
    || !/gate 0\.50/.test(r2Cooldown)
    || !/gate 0\.00/.test(r2Reset.text)) {
    errors.push("Mountain Gate landmarks should wake from authored attempt-local actions, survive ordinary Relay cooldown and clear on retry: " + JSON.stringify({ r1Dormant, r1Awake, r1Reset, r2Dormant, r2Awake, r2Cooldown, r2Reset }));
  }
}

async function runWindGorgeCrumbleRippleSmoke(cdp, baseUrl) {
  await navigateApp(cdp, baseUrl, "Wind Gorge crumble ripple seed");
  await evaluate(cdp, `(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.assistMode = "off";
    saved.controlsPreset = "comfort";
    saved.keyboardLayout = "pc";
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
  })()`);
  await navigateApp(cdp, baseUrl, "Wind Gorge crumble ripple");
  await clickSelector(cdp, "#startButton");
  await enableDebugPanel(cdp);
  await keyTap(cdp, "Digit8", "8");
  const dormant = await waitUntil("R8 crumble strip starts fully restored", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /room 8\\/10/.test(text) && /crumble 15\\/15 q0 a0/.test(text) ? { text } : null;
  })()`), 3500);
  let waveStart;
  let waveBroken;
  await keyDown(cdp, "KeyD", "D");
  try {
    await waitUntil("R8 crumble approach reaches its launch pocket", () => evaluate(cdp, `(() => {
      const text = document.querySelector("#debugPanel").textContent;
      const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
      return /ground 1/.test(text) && position && Number(position[1]) >= 155 && Number(position[1]) <= 170;
    })()`), 1400, 20);
    await keyTap(cdp, "KeyK", "K");
    waveStart = await waitUntil("R8 five-tile strip enters a staged fracture wave", () => evaluate(cdp, `(() => {
      const text = document.querySelector("#debugPanel").textContent;
      const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
      return /crumble (?:15\\/15 q[1-4] a1|10\\/15 q0 a0)/.test(text) && position
        ? { x: Number(position[1]), y: Number(position[2]), text }
        : null;
    })()`), 1600, 20);
    waveBroken = await waitUntil("R8 staged strip completes five bounded breaks", () => evaluate(cdp, `(() => {
      const text = document.querySelector("#debugPanel").textContent;
      return /crumble 10\\/15 q0 a0/.test(text) ? { text } : null;
    })()`), 1800, 20);
  } finally {
    await keyUp(cdp, "KeyD", "D");
  }
  await keyTap(cdp, "KeyR", "R");
  const reset = await waitUntil("R8 retry restores the full crumble strip", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /快速重开 · R8/.test(document.querySelector("#gameStatus").textContent)
      && /crumble 15\\/15 q0 a0/.test(text)
      ? { text }
      : null;
  })()`), 3500);
  if (!/crumble 15\/15 q0 a0/.test(dormant.text)
    || waveStart.x < 240
    || waveStart.x > 450
    || !/crumble 10\/15 q0 a0/.test(waveBroken.text)
    || !/crumble 15\/15 q0 a0/.test(reset.text)) {
    errors.push("R8 should stage one five-tile same-row fracture wave and restore it atomically on retry: " + JSON.stringify({ dormant, waveStart, waveBroken, reset }));
  }
}

async function runSpringApexSmoke(cdp, baseUrl) {
  await navigateApp(cdp, baseUrl, "spring apex seed");
  await evaluate(cdp, `(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.assistMode = "off";
    saved.controlsPreset = "comfort";
    saved.keyboardLayout = "pc";
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
  })()`);
  await navigateApp(cdp, baseUrl, "spring apex");
  await clickSelector(cdp, "#startButton");
  await enableDebugPanel(cdp);
  await keyTap(cdp, "Digit0", "0");
  const ready = await waitUntil("R10 spring route starts settled", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    return /room 10\\/10/.test(text) && /ground 1/.test(text) && /act 0\\.000/.test(text) && position
      ? { x: Number(position[1]), y: Number(position[2]), text }
      : null;
  })()`), 4500, 20);
  let approach;
  let approachProbe = null;
  await keyDown(cdp, "KeyD", "D");
  try {
    approach = await waitUntil("R10 spring approach reaches the lower floor", () => evaluate(cdp, `(() => {
      const text = document.querySelector("#debugPanel").textContent;
      const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
      return position && Number(position[1]) >= 245 && Number(position[1]) <= 270
        ? { x: Number(position[1]), y: Number(position[2]), text }
        : null;
    })()`), 1800, 20);
  } catch {
    approachProbe = await debugPosition(cdp);
  } finally {
    await keyUp(cdp, "KeyD", "D");
  }
  if (approachProbe) throw new Error("R10 spring approach missed lower-floor window: " + JSON.stringify(approachProbe));
  let launch;
  await keyDown(cdp, "KeyD", "D");
  try {
    launch = await waitUntil("R10 floor spring opens the apex window", () => evaluate(cdp, `(() => {
      const text = document.querySelector("#debugPanel").textContent;
      const timer = text.match(/spring apex ([\\d.]+) hit/);
      const velocity = text.match(/vel ([\\d.-]+), ([\\d.-]+)/);
      return timer && Number(timer[1]) > 0.2 && velocity && Number(velocity[2]) < -500
        ? { timer: Number(timer[1]), vx: Number(velocity[1]), vy: Number(velocity[2]), text }
        : null;
    })()`), 1200, 20);
  } finally {
    await keyUp(cdp, "KeyD", "D");
  }
  const apex = await waitUntil("R10 spring reaches its authored apex timing", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const timer = text.match(/spring apex ([\\d.]+) hit/);
    const velocity = text.match(/vel ([\\d.-]+), ([\\d.-]+)/);
    const vy = velocity ? Number(velocity[2]) : Number.NaN;
    if (!timer || Number(timer[1]) <= 0 || !Number.isFinite(vy) || vy < -130 || vy >= 0) return null;
    window.dispatchEvent(new CustomEvent("summit-spark:test-action", { detail: "springApexDash" }));
    return { timer: Number(timer[1]), vx: Number(velocity[1]), vy, text };
  })()`), 1200, 10);
  let recognized;
  try {
    recognized = await waitUntil("R10 apex dash closes the spring timing loop", () => evaluate(cdp, `(() => {
      const text = document.querySelector("#debugPanel").textContent;
      const hit = text.match(/spring apex ([\\d.]+) hit ([\\d.]+)/);
      const velocity = text.match(/vel ([\\d.-]+), ([\\d.-]+)/);
      const flow = text.match(/flow (\\d+)/);
      const timer = text.match(/spring apex ([\\d.]+) hit/);
      const cueVisible = /feel SPRING APEX/.test(text);
      // A loaded CI runner can present the same apex state for several polls.
      // Re-issue the localhost-only buffered action while the window is alive;
      // startDash is resource-guarded, so this cannot spend a second dash.
      if (timer && Number(timer[1]) > 0.02 && !cueVisible) {
        window.dispatchEvent(new CustomEvent("summit-spark:test-action", { detail: "springApexDash" }));
      }
      if (!hit || !velocity || !flow || Number(hit[2]) <= 0 || Number(flow[1]) < 15 || !cueVisible) return null;
      return {
        timer: Number(hit[1]),
        hit: Number(hit[2]),
        vx: Number(velocity[1]),
        vy: Number(velocity[2]),
        flow: Number(flow[1]),
        speed: Number(window.__summitSmokeSpringApexSpeed) || Math.hypot(Number(velocity[1]), Number(velocity[2])),
        text
      };
    })()`), 900, 10);
  } catch (error) {
    const probe = await debugPosition(cdp);
    throw new Error(`${error.message}: ${JSON.stringify({ apex, probe })}`);
  } finally {
    // The localhost-only test event writes the normal Dash buffer synchronously;
    // keyboard and gamepad delivery are covered by their broader interaction tests.
  }
  await keyTap(cdp, "KeyR", "R");
  const reset = await waitUntil("R10 retry clears spring apex attempt state", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /快速重开 · R10/.test(document.querySelector("#gameStatus").textContent)
      && /spring apex 0\\.000 hit 0\\.000/.test(text)
      ? { text }
      : null;
  })()`), 3500, 20);
  if (ready.x < 60
    || approach.x < 245
    || launch.timer <= 0.2
    || Math.abs(apex.vy) > 150
    || recognized.timer !== 0
    || recognized.flow < 15
    || recognized.speed < 560
    || recognized.speed > 610
    || !/spring apex 0\.000 hit 0\.000/.test(reset.text)) {
    errors.push("R10 spring apex should reward the authored timing at ordinary dash speed and clear all attempt state on retry: " + JSON.stringify({ ready, approach, launch, apex, recognized, reset }));
  }
}

async function runGroundRechargeSmoke(cdp, baseUrl) {
  await navigateApp(cdp, baseUrl, "ground recharge seed");
  await evaluate(cdp, `(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.assistMode = "off";
    saved.controlsPreset = "classic";
    saved.keyboardLayout = "pc";
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
  })()`);
  await navigateApp(cdp, baseUrl, "ground recharge");
  await clickSelector(cdp, "#startButton");
  await waitUntil("ground recharge run starts", () => evaluate(cdp, `document.querySelector("#overlay").classList.contains("hidden") && /游戏开始/.test(document.querySelector("#gameStatus").textContent)`));
  await enableDebugPanel(cdp);
  const ready = await waitUntil("ground recharge begins from stable full dash", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const recharge = text.match(/recharge ([\\d.]+)/);
    return /ground 1/.test(text) && /dash 1/.test(text) && recharge && Number(recharge[1]) === 0
      ? { text, status: document.querySelector("#gameStatus").textContent }
      : null;
  })()`), 2500);
  await keyHold(cdp, "KeyX", "x", 80);
  const active = await waitUntil("ground dash emits one recharge pulse", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const recharge = text.match(/recharge ([\\d.]+)/);
    const dash = text.match(/dash (\\d+)/);
    if (!recharge || !dash || Number(recharge[1]) <= 0.05 || Number(dash[1]) !== 1) return null;
    return {
      recharge: Number(recharge[1]),
      dash: Number(dash[1]),
      aria: document.querySelector(".dash-meter")?.getAttribute("aria-valuenow") || "",
      status: document.querySelector("#gameStatus").textContent,
      text
    };
  })()`), 2500, 20);
  const settled = await waitUntil("ground recharge pulse expires", () => evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const recharge = text.match(/recharge ([\\d.]+)/);
    if (!recharge || Number(recharge[1]) !== 0 || !/dash 1/.test(text) || !/ground 1/.test(text)) return null;
    return { recharge: Number(recharge[1]), status: document.querySelector("#gameStatus").textContent, text };
  })()`), 1800, 20);
  await sleep(320);
  const noRepeat = await evaluate(cdp, `(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const recharge = text.match(/recharge ([\\d.]+)/);
    return { recharge: recharge ? Number(recharge[1]) : -1, dash: /dash 1/.test(text), status: document.querySelector("#gameStatus").textContent, text };
  })()`);
  if (active.aria !== "1"
    || !/R1 计时开始/.test(active.status)
    || settled.status !== active.status
    || noRepeat.status !== active.status
    || settled.recharge !== 0
    || noRepeat.recharge !== 0
    || !noRepeat.dash) {
    errors.push("ground dash recharge should emit one foot-only pulse, restore the meter, expire and stay quiet while full: " + JSON.stringify({ ready, active, settled, noRepeat }));
  }
}

async function runFreshEntryImmediateSmoke(cdp, baseUrl) {
  await evaluate(cdp, `(() => {
    sessionStorage.removeItem("summit-spark-entry-mode");
    localStorage.removeItem("summit-spark-account-hint");
  })()`);
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        get() { return new Promise(() => {}); }
      }
      class TablesDB {}
      window.__summitAccountRestoreTimeoutMs = 2000;
      window.Appwrite = { Client, Account, TablesDB };
    })();`
  });
  try {
    await navigateApp(cdp, baseUrl, "fresh entry immediate chooser");
    const entry = await evaluate(cdp, `(() => {
      const gate = document.querySelector("#entryGate");
      const overlay = document.querySelector("#overlay");
      return {
        gateVisible: !!gate && !gate.classList.contains("hidden"),
        checking: overlay?.classList.contains("entry-checking"),
        pending: document.querySelector("#startPanel")?.classList.contains("entry-pending"),
        focused: document.activeElement?.id || ""
      };
    })()`);
    if (!entry.gateVisible || entry.checking || !entry.pending || entry.focused !== "guestEntryButton") {
      errors.push("fresh visitors should see the focused guest/email chooser immediately without waiting for account restore: " + JSON.stringify(entry));
    }
    const preStartContext = await evaluate(cdp, `(() => {
      const canvas = document.querySelector("#game");
      canvas.dispatchEvent(new Event("contextlost", { cancelable: true }));
      window.dispatchEvent(new Event("resize"));
      canvas.dispatchEvent(new Event("contextrestored"));
      return document.querySelector("#gameStatus")?.textContent || "";
    })()`);
    await clickSelector(cdp, "#guestEntryButton");
    await waitUntil("guest entry after pre-start context restore", () => evaluate(cdp, `document.querySelector("#entryGate")?.classList.contains("hidden")`));
    await clickSelector(cdp, "#startButton");
    await waitUntil("start after pre-start context restore", () => evaluate(cdp, `document.querySelector("#overlay")?.classList.contains("hidden")`));
    await enableDebugPanel(cdp);
    const preStartBeforeMove = await debugPosition(cdp);
    await keyHold(cdp, "KeyD", "D", 90);
    const preStartAfterMove = await debugPosition(cdp);
    if (!/画面已恢复/.test(preStartContext) || preStartAfterMove.x <= preStartBeforeMove.x) {
      errors.push("a context loss before gameplay should restore cleanly before the first start: " + JSON.stringify({ preStartContext, preStartBeforeMove, preStartAfterMove }));
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
  }
}

async function runCloudSdkRetrySmoke(cdp, baseUrl) {
  await evaluate(cdp, `(() => {
    sessionStorage.removeItem("summit-spark-entry-mode");
    localStorage.removeItem("summit-spark-account-hint");
  })()`);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.setBlockedURLs", { urls: ["*vendor/appwrite-26.2.0.js*"] });
  try {
    await navigateApp(cdp, baseUrl, "blocked cloud SDK");
    const idle = await waitUntil("guest entry keeps the cloud SDK lazy", () => evaluate(cdp, `(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return /打开账号页时再连接/.test(status) && !document.querySelector("#appwriteSdk")
        ? { status, entryVisible: !document.querySelector("#entryGate")?.classList.contains("hidden") }
        : null;
    })()`), 3000);
    await clickSelector(cdp, "#accountEntryButton");
    const failed = await waitUntil("blocked cloud SDK exposes retry state", () => evaluate(cdp, `(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return /账号页重试/.test(status) && !document.querySelector("#appwriteSdk")
        ? {
            status,
            panelOpen: !document.querySelector("#settingsPanel")?.classList.contains("hidden")
          }
        : null;
    })()`), 5000);
    await cdp.send("Network.setBlockedURLs", { urls: [] });
    await evaluate(cdp, `(() => {
      const panel = document.querySelector("#settingsPanel");
      if (panel && !panel.classList.contains("hidden")) document.querySelector("#settingsCloseButton")?.click();
      document.querySelector("#accountEntryButton")?.click();
    })()`);
    const recovered = await waitUntil("account drawer retries cloud SDK without refresh", () => evaluate(cdp, `(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      const panelOpen = !document.querySelector("#settingsPanel")?.classList.contains("hidden");
      const accountOpen = document.querySelector(".settings-group-account")?.open || false;
      const sdkReady = typeof window.Appwrite?.Client === "function";
      if (!panelOpen || !accountOpen || !sdkReady) return null;
      return {
        status,
        sdkReady,
        scriptCount: document.querySelectorAll("#appwriteSdk").length,
        sendEnabled: !document.querySelector("#accountSendCode")?.disabled
      };
    })()`), 7000);
    if (!idle.entryVisible || !failed.panelOpen || !recovered.sdkReady || recovered.scriptCount !== 1 || !recovered.sendEnabled || /暂时未载入/.test(recovered.status)) {
      errors.push("guest cloud loading should stay lazy and a transient SDK failure should retry from Account without a page refresh: " + JSON.stringify({ idle, failed, recovered }));
    }
  } finally {
    await cdp.send("Network.setBlockedURLs", { urls: [] });
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
    await evaluate(cdp, `(() => {
      sessionStorage.removeItem("summit-spark-entry-mode");
      localStorage.removeItem("summit-spark-account-hint");
    })()`);
  }
}

async function runExpiredAccountHintSmoke(cdp, baseUrl) {
  await evaluate(cdp, `(() => {
    sessionStorage.removeItem("summit-spark-entry-mode");
    localStorage.setItem("summit-spark-account-hint", "1");
  })()`);
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        async get() { throw { code: 401, type: "user_unauthorized" }; }
      }
      class TablesDB {}
      window.Appwrite = { Client, Account, TablesDB };
    })();`
  });
  try {
    await navigateApp(cdp, baseUrl, "expired account hint");
    const expired = await waitUntil("expired account hint returns to chooser", () => evaluate(cdp, `(() => {
      const gate = document.querySelector("#entryGate");
      const overlay = document.querySelector("#overlay");
      if (!gate || gate.classList.contains("hidden") || overlay?.classList.contains("entry-checking")) return null;
      const hint = localStorage.getItem("summit-spark-account-hint");
      const focused = document.activeElement?.id || "";
      return hint === null && focused === "guestEntryButton" ? { hint, focused } : null;
    })()`), 4000);
    if (expired.hint !== null || expired.focused !== "guestEntryButton") {
      errors.push("an expired account hint should be cleared and return focus to the chooser: " + JSON.stringify(expired));
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await evaluate(cdp, `localStorage.removeItem("summit-spark-account-hint")`);
  }
}

async function runAuthenticatedRefreshSmoke(cdp, baseUrl) {
  await evaluate(cdp, `(() => {
    sessionStorage.removeItem("summit-spark-entry-mode");
    localStorage.setItem("summit-spark-account-hint", "1");
  })()`);
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
    const failedInspectionPermissions = await waitUntil("failed cloud inspection locks replacement actions", () => evaluate(cdp, `(() => {
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      const cloud = document.querySelector("#cloudSyncStatus")?.textContent || "";
      const upload = document.querySelector("#cloudUploadButton");
      const download = document.querySelector("#cloudDownloadButton");
      const logout = document.querySelector("#accountLogout");
      return summary === "读取失败"
        && /读取失败/.test(cloud)
        && upload?.disabled
        && download?.disabled
        && !logout?.disabled
        ? { summary, cloud, uploadDisabled: upload.disabled, downloadDisabled: download.disabled, logoutDisabled: logout.disabled }
        : null;
    })()`), 5000);
    if (failedInspectionPermissions.summary !== "读取失败"
      || !failedInspectionPermissions.uploadDisabled
      || !failedInspectionPermissions.downloadDisabled
      || failedInspectionPermissions.logoutDisabled) {
      errors.push("failed cloud inspection must keep both replacement actions locked while preserving logout: " + JSON.stringify(failedInspectionPermissions));
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await evaluate(cdp, `sessionStorage.removeItem("summit-spark-entry-mode")`);
    await evaluate(cdp, `localStorage.removeItem("summit-spark-account-hint")`);
  }
}

async function runAccountRestoreTimeoutSmoke(cdp, baseUrl) {
  await evaluate(cdp, `(() => {
    sessionStorage.removeItem("summit-spark-entry-mode");
    localStorage.setItem("summit-spark-account-hint", "1");
  })()`);
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        get() { return new Promise(() => {}); }
        createEmailToken() { return new Promise(() => {}); }
      }
      class TablesDB {}
      window.__summitAccountRestoreTimeoutMs = 80;
      window.Appwrite = { Client, Account, TablesDB, ID: { unique: () => "pending-user" } };
    })();`
  });
  try {
    await navigateApp(cdp, baseUrl, "stalled account restore");
    const recovered = await waitUntil("stalled account restore returns to chooser", () => evaluate(cdp, `(() => {
      const gate = document.querySelector("#entryGate");
      const start = document.querySelector("#startPanel");
      const overlay = document.querySelector("#overlay");
      const status = document.querySelector("#accountStatus")?.textContent || "";
      if (!gate || !start || overlay?.classList.contains("entry-checking")) return null;
      return {
        gateVisible: !gate.classList.contains("hidden"),
        startPending: start.classList.contains("entry-pending"),
        status,
        hint: localStorage.getItem("summit-spark-account-hint")
      };
    })()`), 4000);
    if (!recovered.gateVisible || !recovered.startPending || !/云端连接超时/.test(recovered.status) || recovered.hint !== "1") {
      errors.push("stalled account restore should recover to the guest/login chooser with a clear message: " + JSON.stringify(recovered));
    }
    await clickSelector(cdp, "#accountEntryButton");
    await waitUntil("account drawer opens after restore timeout", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector(".settings-group-account")?.open`));
    await evaluate(cdp, `document.querySelector("#accountEmail").value = "pending@example.com"`);
    await clickSelector(cdp, "#accountEmail");
    await keyTap(cdp, "Enter", "Enter");
    const busyState = await waitUntil("account form enters unified busy state", () => evaluate(cdp, `(() => {
      const group = document.querySelector(".settings-group-account");
      if (group?.getAttribute("aria-busy") !== "true") return null;
      const controls = [
        ...document.querySelectorAll("[data-auth-mode]"),
        document.querySelector("#accountEmail"),
        document.querySelector("#accountCode"),
        document.querySelector("#accountSendCode"),
        document.querySelector("#accountSubmit")
      ];
      return { allDisabled: controls.every((control) => control?.disabled === true) };
    })()`));
    if (!busyState.allDisabled) errors.push("authentication tabs, fields and actions should lock together while a request is pending");
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await evaluate(cdp, `sessionStorage.removeItem("summit-spark-entry-mode")`);
    await evaluate(cdp, `localStorage.removeItem("summit-spark-account-hint")`);
  }
}

async function runRestrictedSessionStorageAuthSmoke(cdp, baseUrl) {
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const storageError = () => { throw new DOMException("Session storage blocked", "SecurityError"); };
      const originalGetItem = Storage.prototype.getItem;
      const originalSetItem = Storage.prototype.setItem;
      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.getItem = function(key) {
        if (this === window.sessionStorage) return storageError();
        return originalGetItem.call(this, key);
      };
      Storage.prototype.setItem = function(key, value) {
        if (this === window.sessionStorage) return storageError();
        return originalSetItem.call(this, key, value);
      };
      Storage.prototype.removeItem = function(key) {
        if (this === window.sessionStorage) return storageError();
        return originalRemoveItem.call(this, key);
      };

      window.__summitRestrictedAuth = { sent: 0, sessions: 0, upserts: 0 };
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        async get() {
          if (!window.__summitRestrictedAuth.sessions) throw { code: 401, type: "user_unauthorized" };
          return { $id: "restricted-user", email: "restricted@example.com" };
        }
        async createEmailToken(payload) {
          window.__summitRestrictedAuth.sent += 1;
          window.__summitRestrictedAuth.email = payload.email;
          return { userId: "restricted-user", phrase: "MIST-PEAK" };
        }
        async createSession(payload) {
          window.__summitRestrictedAuth.sessions += 1;
          window.__summitRestrictedAuth.sessionPayload = payload;
          return {};
        }
      }
      class TablesDB {
        async getRow() { throw { code: 404, type: "row_not_found" }; }
        async upsertRow() {
          window.__summitRestrictedAuth.upserts += 1;
          return { $updatedAt: new Date().toISOString() };
        }
      }
      const Permission = { read: (role) => "read(" + role + ")", update: (role) => "update(" + role + ")", delete: (role) => "delete(" + role + ")" };
      const Role = { user: (id) => "user:" + id };
      window.Appwrite = {
        Client,
        Account,
        TablesDB,
        Permission,
        Role,
        ID: { unique: () => "restricted-user" }
      };
    })();`
  });
  try {
    await navigateApp(cdp, baseUrl, "restricted session storage auth");
    await waitUntil("blocked session storage falls back to entry chooser", () => evaluate(cdp, `!document.querySelector("#entryGate")?.classList.contains("hidden")`), 5000);
    await clickSelector(cdp, "#accountEntryButton");
    await waitUntil("restricted storage account drawer opens", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector(".settings-group-account")?.open`));
    await evaluate(cdp, `document.querySelector("#accountEmail").value = "restricted@example.com"`);
    await clickSelector(cdp, "#accountSendCode");
    const sent = await waitUntil("OTP send remains successful when session storage is blocked", () => evaluate(cdp, `(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return window.__summitRestrictedAuth?.sent === 1 && /验证码已发送/.test(status)
        ? { status, sent: window.__summitRestrictedAuth.sent }
        : null;
    })()`), 5000);
    await evaluate(cdp, `(() => {
      const email = document.querySelector("#accountEmail");
      email.value = "changed@example.com";
      email.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    const invalidated = await waitUntil("changing OTP email invalidates the issued token", () => evaluate(cdp, `(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      const code = document.querySelector("#accountCode")?.value || "";
      return /邮箱已更改/.test(status) && !code
        ? { status, code, sessions: window.__summitRestrictedAuth?.sessions || 0 }
        : null;
    })()`));
    await evaluate(cdp, `document.querySelector("#accountEmail").value = "restricted@example.com"`);
    await clickSelector(cdp, "#accountSendCode");
    await waitUntil("fresh OTP issued after email change", () => evaluate(cdp, `window.__summitRestrictedAuth?.sent === 2`));
    await evaluate(cdp, `(() => {
      document.querySelector("#accountEmail").value = "autofill-change@example.com";
      document.querySelector("#accountCode").value = "123456";
    })()`);
    await clickSelector(cdp, "#accountSubmit");
    const guardedMismatch = await waitUntil("OTP submit rejects an email changed without an input event", () => evaluate(cdp, `(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return /邮箱已更改/.test(status)
        ? { status, sessions: window.__summitRestrictedAuth?.sessions || 0 }
        : null;
    })()`));
    await evaluate(cdp, `document.querySelector("#accountEmail").value = "restricted@example.com"`);
    await clickSelector(cdp, "#accountSendCode");
    await waitUntil("third OTP issued after guarded mismatch", () => evaluate(cdp, `window.__summitRestrictedAuth?.sent === 3`));
    await evaluate(cdp, `document.querySelector("#accountCode").value = "123456"`);
    await clickSelector(cdp, "#accountSubmit");
    const signedIn = await waitUntil("OTP login remains successful when session cleanup is blocked", () => evaluate(cdp, `(() => {
      const mock = window.__summitRestrictedAuth;
      const email = document.querySelector("#accountEmailLabel")?.textContent || "";
      return mock?.sessions === 1 && email === "restricted@example.com"
        ? { email, sessions: mock.sessions, payload: mock.sessionPayload, upserts: mock.upserts }
        : null;
    })()`), 7000);
    if (!/安全短语/.test(sent.status) || invalidated.sessions !== 0 || guardedMismatch.sessions !== 0 || signedIn.payload?.userId !== "restricted-user" || signedIn.payload?.secret !== "123456") {
      errors.push("session storage restrictions and email edits must not reuse or override OTP identity state: " + JSON.stringify({ sent, invalidated, guardedMismatch, signedIn }));
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await navigateApp(cdp, baseUrl, "restricted session storage cleanup");
  }
}

async function runPasswordRecoverySmoke(cdp, baseUrl) {
  await evaluate(cdp, `sessionStorage.removeItem("summit-spark-entry-mode")`);
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        async updateRecovery(payload) {
          if (payload.password === "password123") {
            throw { code: 400, type: "user_password_dictionary", message: "Password is too common" };
          }
          window.__summitRecoveryUpdate = payload;
          return {};
        }
      }
      class TablesDB {}
      window.Appwrite = { Client, Account, TablesDB };
    })();`
  });
  try {
    const recoveryUrl = `${baseUrl}/?userId=recovery-user&secret=recovery-secret&keep=1`;
    await cdp.send("Page.navigate", { url: recoveryUrl });
    await waitUntil("password recovery navigation", () => evaluate(cdp, `location.pathname === "/" && location.search === "?keep=1"`), 7000);
    await waitForAppReady(cdp);
    const recoveryState = await waitUntil("password recovery opens focused account drawer", () => evaluate(cdp, `(() => {
      const panel = document.querySelector("#settingsPanel");
      const password = document.querySelector("#accountPassword");
      if (!panel || panel.classList.contains("hidden") || !panel.classList.contains("account-focused")) return null;
      const hidden = (selector) => getComputedStyle(document.querySelector(selector)).display === "none";
      return {
        search: location.search,
        title: document.querySelector("#panelTitle")?.textContent || "",
        closeLabel: document.querySelector("#settingsClose")?.getAttribute("aria-label") || "",
        groupOpen: Boolean(document.querySelector(".settings-group-account")?.open),
        authTabsHidden: hidden("#accountAuthTabs"),
        emailHidden: hidden("#accountEmailField"),
        codeHidden: hidden("#accountCodeFields"),
        noteHidden: hidden("#accountNote"),
        passwordVisible: !hidden("#accountPasswordField"),
        passwordLabel: document.querySelector("#accountPasswordLabel")?.textContent || "",
        passwordPlaceholder: password?.placeholder || "",
        submit: document.querySelector("#accountSubmit")?.textContent.trim() || "",
        focused: document.activeElement === password,
        status: document.querySelector("#accountStatus")?.textContent || ""
      };
    })()`), 7000);
    if (recoveryState.search !== "?keep=1" || recoveryState.title !== "设置新密码" || recoveryState.closeLabel !== "关闭改密" || !recoveryState.groupOpen || !recoveryState.authTabsHidden || !recoveryState.emailHidden || !recoveryState.codeHidden || !recoveryState.noteHidden || !recoveryState.passwordVisible || recoveryState.passwordLabel !== "新密码" || !/输入新密码/.test(recoveryState.passwordPlaceholder) || recoveryState.submit !== "确认新密码" || !recoveryState.focused || !/改密链接已验证/.test(recoveryState.status)) {
      errors.push("recovery links should immediately hide secrets and open a focused, single-purpose password form: " + JSON.stringify(recoveryState));
    }
    await evaluate(cdp, `document.querySelector("#accountPassword").value = "password123"`);
    await clickSelector(cdp, "#accountSubmit");
    const weakPassword = await waitUntil("password recovery explains dictionary rejection", () => evaluate(cdp, `(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return /过于常见/.test(status) ? {
        status,
        stillRecovering: document.querySelector("#panelTitle")?.textContent === "设置新密码",
        passwordVisible: getComputedStyle(document.querySelector("#accountPasswordField")).display !== "none"
      } : null;
    })()`), 5000);
    if (!weakPassword.stillRecovering || !weakPassword.passwordVisible) {
      errors.push("a rejected weak password should keep the recovery form active with a precise explanation: " + JSON.stringify(weakPassword));
    }
    await evaluate(cdp, `document.querySelector("#accountPassword").value = "updated-password"`);
    await clickSelector(cdp, "#accountSubmit");
    const updated = await waitUntil("password recovery completes", () => evaluate(cdp, `(() => {
      const payload = window.__summitRecoveryUpdate;
      const status = document.querySelector("#accountStatus")?.textContent || "";
      if (!payload || !/密码已更新/.test(status)) return null;
      const visible = (selector) => getComputedStyle(document.querySelector(selector)).display !== "none";
      return {
        payload,
        search: location.search,
        title: document.querySelector("#panelTitle")?.textContent || "",
        closeLabel: document.querySelector("#settingsClose")?.getAttribute("aria-label") || "",
        authTabsVisible: visible("#accountAuthTabs"),
        emailVisible: visible("#accountEmailField"),
        passwordLabel: document.querySelector("#accountPasswordLabel")?.textContent || "",
        submit: document.querySelector("#accountSubmit")?.textContent.trim() || "",
        status
      };
    })()`), 5000);
    if (updated.payload.userId !== "recovery-user" || updated.payload.secret !== "recovery-secret" || updated.payload.password !== "updated-password" || updated.search !== "?keep=1" || updated.title !== "账号" || updated.closeLabel !== "关闭账号" || !updated.authTabsVisible || !updated.emailVisible || updated.passwordLabel !== "密码" || updated.submit !== "使用密码登录") {
      errors.push("completed recovery should use the captured token once and restore the regular login form: " + JSON.stringify(updated));
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await evaluate(cdp, `sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runCloudSyncExitGuardSmoke(cdp, baseUrl) {
  await evaluate(cdp, `sessionStorage.setItem("summit-spark-entry-mode", "account")`);
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      window.__summitCloudMock = { upserts: 0, deletes: 0, failWrites: false, holdWrites: false, pendingWrite: null, pendingPassword: null };
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        async get() { return { $id: "cloud-guard-user", email: "2026-runner@example.com" }; }
        async deleteSession() { window.__summitCloudMock.deletes += 1; return {}; }
        updatePassword() {
          return new Promise((resolve) => {
            window.__summitCloudMock.pendingPassword = { resolve };
          });
        }
      }
      class TablesDB {
        async getRow() { throw { code: 404, type: "row_not_found" }; }
        async upsertRow(payload) {
          window.__summitCloudMock.upserts += 1;
          window.__summitCloudMock.lastPayload = payload;
          if (window.__summitCloudMock.failWrites) throw { code: 503, type: "general_server_error" };
          if (window.__summitCloudMock.holdWrites) {
            return new Promise((resolve) => {
              window.__summitCloudMock.pendingWrite = { resolve, payload };
            });
          }
          return { $updatedAt: new Date().toISOString() };
        }
      }
      const Permission = { read: (role) => "read(" + role + ")", update: (role) => "update(" + role + ")", delete: (role) => "delete(" + role + ")" };
      const Role = { user: (id) => "user:" + id };
      window.Appwrite = { Client, Account, TablesDB, Permission, Role };
    })();`
  });
  try {
    await navigateApp(cdp, baseUrl, "cloud sync exit guard");
    const initialSync = await waitUntil("first cloud sync completes", () => evaluate(cdp, `(() => {
      const mock = window.__summitCloudMock;
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      return mock?.upserts >= 1 && summary === "已同步" ? { upserts: mock.upserts, summary } : null;
    })()`), 7000);
    await clickSelector(cdp, "#startSettingsButton");
    await openSettingsGroup(cdp, ".settings-group-account");
    const accountLayout = await evaluate(cdp, `(() => {
      const panel = document.querySelector("#settingsPanel").getBoundingClientRect();
      const body = document.querySelector(".settings-group-account .account-body").getBoundingClientRect();
      const head = document.querySelector(".account-user-head").getBoundingClientRect();
      const avatar = document.querySelector("#accountAvatar").getBoundingClientRect();
      const actions = [...document.querySelectorAll(".cloud-actions button")].map((button) => button.getBoundingClientRect());
      const password = document.querySelector(".password-reset").getBoundingClientRect();
      const firstPasswordRow = document.querySelector(".password-reset > div").getBoundingClientRect();
      const oldPassword = document.querySelector("#accountOldPassword").getBoundingClientRect();
      const savePassword = document.querySelector("#accountSetPassword").getBoundingClientRect();
      return {
        avatar: document.querySelector("#accountAvatar").textContent.trim(),
        panelFits: panel.left >= 0 && panel.right <= innerWidth && panel.bottom <= innerHeight,
        identityAligned: Math.abs((avatar.top + avatar.height / 2) - (head.top + head.height / 2)) <= 2,
        actionsAligned: actions.length === 2 && Math.abs(actions[0].top - actions[1].top) <= 1 && Math.abs(actions[0].height - actions[1].height) <= 1,
        passwordContained: password.left >= body.left && password.right <= body.right && firstPasswordRow.left >= password.left && firstPasswordRow.right <= password.right,
        passwordRowsSeparated: oldPassword.top >= firstPasswordRow.bottom + 6,
        saveButtonAligned: Math.abs(savePassword.top - firstPasswordRow.top) <= 1 && Math.abs(savePassword.bottom - firstPasswordRow.bottom) <= 1
      };
    })()`);
    if (accountLayout.avatar !== "S"
      || !accountLayout.panelFits
      || !accountLayout.identityAligned
      || !accountLayout.actionsAligned
      || !accountLayout.passwordContained
      || !accountLayout.passwordRowsSeparated
      || !accountLayout.saveButtonAligned) {
      errors.push("authenticated account disclosure should keep identity, sync actions and security fields on one contained grid: " + JSON.stringify(accountLayout));
    }
    await clickSelector(cdp, "#settingsClose");
    await evaluate(cdp, `(() => {
      const toggle = document.querySelector("#audioToggle");
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      window.dispatchEvent(new Event("pagehide"));
    })()`);
    const flushed = await waitUntil("pagehide flushes pending cloud save", () => evaluate(cdp, `(() => {
      const mock = window.__summitCloudMock;
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      return mock?.upserts > ${initialSync.upserts} && summary === "已同步" ? { upserts: mock.upserts, summary } : null;
    })()`), 5000);
    const slowUploadTarget = await evaluate(cdp, `(() => {
      const mock = window.__summitCloudMock;
      mock.holdWrites = true;
      const calm = document.querySelector("#calmEffectsToggle");
      calm.checked = !calm.checked;
      calm.dispatchEvent(new Event("change", { bubbles: true }));
      const queuedSummary = document.querySelector("#accountSummary")?.textContent || "";
      window.dispatchEvent(new Event("pagehide"));
      return { calmEffects: calm.checked, queuedSummary };
    })()`);
    if (slowUploadTarget.queuedSummary !== "待同步") {
      errors.push("a locally queued save should stop claiming it is already synced: " + JSON.stringify(slowUploadTarget));
    }
    const heldUpload = await waitUntil("first slow cloud upload remains in flight", () => evaluate(cdp, `(() => {
      const mock = window.__summitCloudMock;
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      return mock?.pendingWrite && summary === "同步中"
        ? { upserts: mock.upserts, summary }
        : null;
    })()`), 5000);
    const queuedDuringUpload = await evaluate(cdp, `(() => {
      const lines = document.querySelector("#practiceLinesToggle");
      lines.checked = !lines.checked;
      lines.dispatchEvent(new Event("change", { bubbles: true }));
      window.dispatchEvent(new Event("pagehide"));
      return {
        practiceLines: lines.checked,
        summary: document.querySelector("#accountSummary")?.textContent || "",
        upserts: window.__summitCloudMock?.upserts || 0
      };
    })()`);
    if (queuedDuringUpload.summary !== "待同步" || queuedDuringUpload.upserts !== heldUpload.upserts) {
      errors.push("new progress during an in-flight upload should stay visibly queued without a concurrent write: " + JSON.stringify({ heldUpload, queuedDuringUpload }));
    }
    await evaluate(cdp, `(() => {
      const mock = window.__summitCloudMock;
      const pending = mock.pendingWrite;
      mock.pendingWrite = null;
      mock.holdWrites = false;
      pending.resolve({ $updatedAt: new Date().toISOString() });
    })()`);
    const followupUpload = await waitUntil("queued change receives a follow-up cloud upload", () => evaluate(cdp, `(() => {
      const mock = window.__summitCloudMock;
      if (!mock || mock.upserts <= ${heldUpload.upserts}) return null;
      const archive = JSON.parse(mock.lastPayload?.data?.archive || "{}");
      const settings = archive.storage?.settings || {};
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      return settings.calmEffects === ${JSON.stringify(slowUploadTarget.calmEffects)}
        && settings.practiceLines === ${JSON.stringify(queuedDuringUpload.practiceLines)}
        && summary === "已同步"
        ? { upserts: mock.upserts, summary, calmEffects: settings.calmEffects, practiceLines: settings.practiceLines }
        : null;
    })()`), 5000);
    if (followupUpload.upserts <= heldUpload.upserts
      || followupUpload.calmEffects !== slowUploadTarget.calmEffects
      || followupUpload.practiceLines !== queuedDuringUpload.practiceLines) {
      errors.push("a local change queued during a slow upload must receive a second upload with the latest archive: " + JSON.stringify({ heldUpload, slowUploadTarget, queuedDuringUpload, followupUpload }));
    }
    await clickSelector(cdp, "#startAccountButton");
    await waitUntil("account drawer opens for password busy queue", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector(".settings-group-account")?.open`));
    await evaluate(cdp, `document.querySelector("#accountNewPassword").value = "queue-password-157"`);
    await clickSelector(cdp, "#accountSetPassword");
    await waitUntil("password update remains in flight", () => evaluate(cdp, `window.__summitCloudMock?.pendingPassword && document.querySelector(".settings-group-account")?.getAttribute("aria-busy") === "true"`));
    await clickSelector(cdp, "#settingsClose");
    const passwordBusyTarget = await evaluate(cdp, `(() => {
      const audio = document.querySelector("#audioToggle");
      const before = window.__summitCloudMock.upserts;
      audio.checked = !audio.checked;
      audio.dispatchEvent(new Event("change", { bubbles: true }));
      return {
        audioEnabled: audio.checked,
        before,
        summary: document.querySelector("#accountSummary")?.textContent || ""
      };
    })()`);
    if (passwordBusyTarget.summary !== "待同步") {
      errors.push("local progress during password update should remain visibly queued: " + JSON.stringify(passwordBusyTarget));
    }
    await sleep(120);
    const passwordBusyWrites = await evaluate(cdp, `window.__summitCloudMock?.upserts || 0`);
    if (passwordBusyWrites !== passwordBusyTarget.before) {
      errors.push("password update and cloud save must not write concurrently: " + JSON.stringify({ passwordBusyTarget, passwordBusyWrites }));
    }
    await evaluate(cdp, `(() => {
      const mock = window.__summitCloudMock;
      const pending = mock.pendingPassword;
      mock.pendingPassword = null;
      pending.resolve({});
    })()`);
    const resumedAfterPassword = await waitUntil("cloud sync resumes after password update", () => evaluate(cdp, `(() => {
      const mock = window.__summitCloudMock;
      if (!mock || mock.upserts <= ${passwordBusyTarget.before}) return null;
      const archive = JSON.parse(mock.lastPayload?.data?.archive || "{}");
      const audioEnabled = archive.storage?.settings?.audioEnabled;
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      return audioEnabled === ${JSON.stringify(passwordBusyTarget.audioEnabled)} && summary === "已同步"
        ? { upserts: mock.upserts, audioEnabled, summary }
        : null;
    })()`), 5000);
    if (resumedAfterPassword.upserts <= passwordBusyTarget.before || resumedAfterPassword.audioEnabled !== passwordBusyTarget.audioEnabled) {
      errors.push("a local change made during password update must resume cloud sync after account busy clears: " + JSON.stringify({ passwordBusyTarget, resumedAfterPassword }));
    }
    await evaluate(cdp, `(() => {
      const toggle = document.querySelector("#audioToggle");
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      window.__summitCloudMock.failWrites = true;
    })()`);
    await clickSelector(cdp, "#startAccountButton");
    await waitUntil("account drawer opens for guarded logout", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector(".settings-group-account")?.open`));
    await clickSelector(cdp, "#accountLogout");
    const guarded = await waitUntil("failed final sync prevents logout", () => evaluate(cdp, `(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      if (!/账号仍保持登录/.test(status)) return null;
      return {
        status,
        summary: document.querySelector("#accountSummary")?.textContent || "",
        userVisible: !document.querySelector("#accountUser")?.classList.contains("hidden"),
        deletes: window.__summitCloudMock?.deletes || 0,
        upserts: window.__summitCloudMock?.upserts || 0
      };
    })()`), 5000);
    if (flushed.upserts <= initialSync.upserts || guarded.summary !== "同步失败" || !guarded.userVisible || guarded.deletes !== 0 || guarded.upserts <= flushed.upserts) {
      errors.push("pending progress should flush on pagehide and a failed final upload must keep the account signed in: " + JSON.stringify({ initialSync, flushed, guarded }));
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await evaluate(cdp, `sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runLargeCloudArchiveSmoke(cdp, baseUrl) {
  await evaluate(cdp, `(() => {
    sessionStorage.setItem("summit-spark-entry-mode", "account");
    const paths = Array.from({ length: 10 }, (_, room) =>
      Array.from({ length: 420 }, (_, index) => ({
        x: Math.round((((index * 3.17) + room * 7) % 960) * 10) / 10,
        y: Math.round((((index * 2.39) + room * 11) % 544) * 10) / 10,
        dash: index % 3 === 0,
        spark: index % 7 === 0,
        over: index % 11 === 0,
        t: Math.round(index * 45) / 1000
      }))
    );
    localStorage.setItem("summit-spark-room-paths", JSON.stringify(paths));
  })()`);
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      window.__summitLargeCloudMock = { upserts: 0, lastPayload: null };
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        async get() { return { $id: "large-cloud-user", email: "large-cloud@example.com" }; }
      }
      class TablesDB {
        async getRow() { throw { code: 404, type: "row_not_found" }; }
        async upsertRow(payload) {
          window.__summitLargeCloudMock.upserts += 1;
          window.__summitLargeCloudMock.lastPayload = payload;
          return { $updatedAt: new Date().toISOString() };
        }
      }
      const Permission = { read: (role) => "read(" + role + ")", update: (role) => "update(" + role + ")", delete: (role) => "delete(" + role + ")" };
      const Role = { user: (id) => "user:" + id };
      window.Appwrite = { Client, Account, TablesDB, Permission, Role };
    })();`
  });
  try {
    await navigateApp(cdp, baseUrl, "large cloud archive");
    const largeArchive = await waitUntil("large cloud archive uploads intact", () => evaluate(cdp, `(() => {
      const mock = window.__summitLargeCloudMock;
      const archiveText = mock?.lastPayload?.data?.archive || "";
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      if (!archiveText || summary !== "已同步") return null;
      const archive = JSON.parse(archiveText);
      const paths = archive.storage?.roomPaths || [];
      const input = document.querySelector("#saveImportText");
      window.__summitLargeArchiveText = archiveText;
      return {
        chars: archiveText.length,
        inputMaxLength: input.maxLength,
        upserts: mock.upserts,
        pathCount: paths.length,
        pointCount: paths.reduce((total, path) => total + path.length, 0),
        summary
      };
    })()`), 7000);
    await clickSelector(cdp, "#startSettingsButton");
    await openSettingsGroup(cdp, ".settings-group-feedback");
    await evaluate(cdp, `(() => {
      const input = document.querySelector("#saveImportText");
      input.value = "";
      input.focus();
    })()`);
    const largeArchiveText = await evaluate(cdp, `window.__summitLargeArchiveText || ""`);
    await cdp.send("Input.insertText", { text: largeArchiveText });
    const realisticImport = await waitUntil("large archive accepts real text input", () => evaluate(cdp, `(() => {
      const input = document.querySelector("#saveImportText");
      const preview = document.querySelector("#saveImportStatus");
      return input?.value.length === window.__summitLargeArchiveText?.length
        && preview?.classList.contains("valid")
        ? {
            chars: input.value.length,
            previewValid: true,
            previewText: preview.textContent || ""
          }
        : null;
    })()`), 7000);
    if (
      largeArchive.chars <= 240000
      || largeArchive.chars >= 1000000
      || largeArchive.inputMaxLength < largeArchive.chars
      || largeArchive.upserts !== 1
      || largeArchive.pathCount !== 10
      || largeArchive.pointCount !== 4200
      || realisticImport.chars !== largeArchive.chars
      || !realisticImport.previewValid
      || !/可导入/.test(realisticImport.previewText)
    ) {
      errors.push("a full ten-room route archive above the legacy 240k cap must upload and remain paste-importable: " + JSON.stringify({ largeArchive, realisticImport }));
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await evaluate(cdp, `(() => {
      sessionStorage.removeItem("summit-spark-entry-mode");
      localStorage.removeItem("summit-spark-room-paths");
    })()`);
  }
}

async function runCloudLogoutInspectionRaceSmoke(cdp, baseUrl) {
  await evaluate(cdp, `sessionStorage.setItem("summit-spark-entry-mode", "account")`);
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      window.__summitCloudRace = { deletes: 0, resolveRow: null };
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        async get() { return { $id: "race-user", email: "race@example.com" }; }
        async deleteSession() { window.__summitCloudRace.deletes += 1; return {}; }
      }
      class TablesDB {
        getRow() {
          return new Promise((resolve) => {
            window.__summitCloudRace.resolveRow = resolve;
          });
        }
      }
      window.Appwrite = { Client, Account, TablesDB };
    })();`
  });
  try {
    await navigateApp(cdp, baseUrl, "cloud logout inspection race");
    const pendingInspection = await waitUntil("cloud inspection remains pending after session restore", () => evaluate(cdp, `(() => {
      const race = window.__summitCloudRace;
      const email = document.querySelector("#accountEmailLabel")?.textContent || "";
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      const cloud = document.querySelector("#cloudSyncStatus")?.textContent || "";
      const upload = document.querySelector("#cloudUploadButton");
      const download = document.querySelector("#cloudDownloadButton");
      const logout = document.querySelector("#accountLogout");
      return typeof race?.resolveRow === "function"
        && email === "race@example.com"
        && summary === "检查中"
        && /正在检查/.test(cloud)
        && upload?.disabled
        && download?.disabled
        && !logout?.disabled
        ? { summary, cloud, uploadDisabled: upload.disabled, downloadDisabled: download.disabled, logoutDisabled: logout.disabled }
        : null;
    })()`), 7000);
    if (pendingInspection.summary !== "检查中" || !pendingInspection.uploadDisabled || !pendingInspection.downloadDisabled || pendingInspection.logoutDisabled) {
      errors.push("pending cloud inspection must report checking and lock destructive cloud actions while preserving logout: " + JSON.stringify(pendingInspection));
    }
    await clickSelector(cdp, "#startAccountButton");
    await waitUntil("account drawer opens during pending cloud inspection", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && !document.querySelector("#accountUser")?.classList.contains("hidden") && document.activeElement === document.querySelector("#settingsClose")`));
    await clickSelector(cdp, "#accountLogout");
    const loggedOut = await waitUntil("logout completes before cloud inspection", () => evaluate(cdp, `(() => {
      const race = window.__summitCloudRace;
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      const cloud = document.querySelector("#cloudSyncStatus")?.textContent || "";
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return race?.deletes === 1 && summary === "未登录" && cloud === "未登录" && /已退出/.test(status)
        ? { summary, cloud, status, userHidden: document.querySelector("#accountUser")?.classList.contains("hidden") }
        : null;
    })()`), 5000);
    await evaluate(cdp, `window.__summitCloudRace.resolveRow({ archive: "{}", $updatedAt: new Date().toISOString() })`);
    await sleep(180);
    const afterLateInspection = await evaluate(cdp, `({
      summary: document.querySelector("#accountSummary")?.textContent || "",
      cloud: document.querySelector("#cloudSyncStatus")?.textContent || "",
      status: document.querySelector("#accountStatus")?.textContent || "",
      userHidden: document.querySelector("#accountUser")?.classList.contains("hidden"),
      deletes: window.__summitCloudRace?.deletes || 0
    })`);
    if (!loggedOut.userHidden
      || afterLateInspection.summary !== "未登录"
      || afterLateInspection.cloud !== "未登录"
      || !/已退出/.test(afterLateInspection.status)
      || !afterLateInspection.userHidden
      || afterLateInspection.deletes !== 1) {
      errors.push("late cloud inspection after logout must not revive stale account state: " + JSON.stringify({ loggedOut, afterLateInspection }));
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await evaluate(cdp, `sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runCorruptCloudPermissionsSmoke(cdp, baseUrl) {
  await evaluate(cdp, `sessionStorage.setItem("summit-spark-entry-mode", "account")`);
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        async get() { return { $id: "corrupt-user", email: "corrupt@example.com" }; }
      }
      class TablesDB {
        async getRow() {
          return { archive: "{}", $updatedAt: new Date().toISOString() };
        }
      }
      window.Appwrite = { Client, Account, TablesDB };
    })();`
  });
  try {
    await navigateApp(cdp, baseUrl, "corrupt cloud permissions");
    const corruptPermissions = await waitUntil("corrupt cloud archive exposes only repair upload", () => evaluate(cdp, `(() => {
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      const cloud = document.querySelector("#cloudSyncStatus")?.textContent || "";
      const status = document.querySelector("#accountStatus")?.textContent || "";
      const upload = document.querySelector("#cloudUploadButton");
      const download = document.querySelector("#cloudDownloadButton");
      const logout = document.querySelector("#accountLogout");
      return summary === "存档异常"
        && /无法识别/.test(cloud)
        && /损坏/.test(status)
        && !upload?.disabled
        && download?.disabled
        && !logout?.disabled
        ? { summary, cloud, status, uploadDisabled: upload.disabled, downloadDisabled: download.disabled, logoutDisabled: logout.disabled }
        : null;
    })()`), 7000);
    if (corruptPermissions.uploadDisabled || !corruptPermissions.downloadDisabled || corruptPermissions.logoutDisabled) {
      errors.push("corrupt cloud archive should allow explicit repair upload but block download: " + JSON.stringify(corruptPermissions));
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await evaluate(cdp, `sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runCloudConflictGuardSmoke(cdp, baseUrl) {
  await evaluate(cdp, `sessionStorage.setItem("summit-spark-entry-mode", "account")`);
  const remoteArchive = {
    kind: "summit-spark-save",
    schemaVersion: 1,
    build: "remote-conflict",
    storage: {
      settings: {},
      profile: { summitClears: 1, bestRelayChain: 2 },
      roomBests: [8.5],
      roomPaths: [],
      roomFocus: { schemaVersion: 2, rooms: [] },
      bestTime: 70,
      bestFlow: 100
    }
  };
  const injected = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        async get() { return { $id: "conflict-user", email: "conflict@example.com" }; }
      }
      class TablesDB {
        async getRow() {
          return {
            archive: ${JSON.stringify(JSON.stringify(remoteArchive))},
            $updatedAt: new Date().toISOString()
          };
        }
      }
      window.Appwrite = { Client, Account, TablesDB };
    })();`
  });
  const cases = [
    {
      name: "focus-only",
      seed: `localStorage.setItem("summit-spark-room-focus", JSON.stringify({ schemaVersion: 2, rooms: [{ faults: 3, drills: 2, fall: 3, last: "fall" }] }))`,
      probe: `JSON.parse(localStorage.getItem("summit-spark-room-focus") || "{}").rooms?.[0]?.faults === 3`
    },
    {
      name: "path-only",
      seed: `localStorage.setItem("summit-spark-room-paths", JSON.stringify([[{ x: 20, y: 30, t: 0.1, dash: false }]]))`,
      probe: `JSON.parse(localStorage.getItem("summit-spark-room-paths") || "[]")[0]?.length === 1`
    },
    {
      name: "settings-only",
      seed: `localStorage.setItem("summit-spark-settings", JSON.stringify({ schemaVersion: 3, audioEnabled: false, touchSize: 62 }))`,
      probe: `JSON.parse(localStorage.getItem("summit-spark-settings") || "{}").touchSize === 62`
    }
  ];
  try {
    for (const conflictCase of cases) {
      await evaluate(cdp, `(() => { localStorage.clear(); ${conflictCase.seed}; })()`);
      await navigateApp(cdp, baseUrl, `cloud conflict ${conflictCase.name}`);
      const guarded = await waitUntil(`cloud conflict preserves ${conflictCase.name}`, () => evaluate(cdp, `(() => {
        const status = document.querySelector("#accountStatus")?.textContent || "";
        if (!/请选择/.test(status)) return null;
        return {
          status,
          summary: document.querySelector("#accountSummary")?.textContent || "",
          localPreserved: Boolean(${conflictCase.probe}),
          remoteNotApplied: (JSON.parse(localStorage.getItem("summit-spark-profile") || "{}").summitClears || 0) === 0,
          uploadEnabled: !document.querySelector("#cloudUploadButton")?.disabled,
          downloadEnabled: !document.querySelector("#cloudDownloadButton")?.disabled
        };
      })()`), 7000);
      if (!guarded.localPreserved || !guarded.remoteNotApplied || guarded.summary !== "待确认" || !guarded.uploadEnabled || !guarded.downloadEnabled) {
        errors.push(`cloud conflict must preserve ${conflictCase.name} local data instead of treating it as empty: ` + JSON.stringify(guarded));
      }
    }
  } finally {
    if (injected.identifier) {
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected.identifier });
    }
    await evaluate(cdp, `sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runPracticeRecommendationIntegrationSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await navigateApp(cdp, baseUrl, "practice recommendation seed");
  await evaluate(cdp, `(() => {
    localStorage.clear();
    localStorage.setItem("summit-spark-room-bests", JSON.stringify([8.5, 12, 12, 13]));
    localStorage.setItem("summit-spark-room-focus", JSON.stringify({
      schemaVersion: 2,
      rooms: [
        { clears: 1, clean: 0 },
        { clears: 1, clean: 1 },
        { faults: 5, fall: 5, last: "fall", clears: 1, clean: 1 },
        { clears: 1, clean: 1, drills: 1, drillClears: 1, styleDrills: 1, styleWins: 1 }
      ]
    }));
  })()`);
  await navigateApp(cdp, baseUrl, "practice recommendation reload");

  const startRecommendation = await waitUntil("start resume exposes the Focus-led recommendation", () => evaluate(cdp, `(() => {
    const button = document.querySelector("#resumeTrainingButton");
    if (!button || button.classList.contains("hidden")) return null;
    return { text: button.textContent.trim(), ariaHidden: button.getAttribute("aria-hidden") };
  })()`));
  if (startRecommendation.text !== "继续训练 · R3 Style" || startRecommendation.ariaHidden !== "false") {
    errors.push("start resume should expose the shared Focus-led R3 Style recommendation: " + JSON.stringify(startRecommendation));
  }

  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("recommendation practice panel opens", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  await openSettingsGroup(cdp, ".practice-subgroup-advanced");
  const surfaces = await waitUntil("all recommendation surfaces render from the seeded evidence", () => evaluate(cdp, `(() => {
    const queue = [...document.querySelectorAll("#practiceQueue [data-queue-room]")].map((card) => ({
      room: Number(card.getAttribute("data-queue-room")),
      mode: card.getAttribute("data-queue-mode")
    }));
    const plan = [...document.querySelectorAll("#practicePlan [data-plan-room]")].map((card) => ({
      room: Number(card.getAttribute("data-plan-room")),
      mode: card.getAttribute("data-plan-mode"),
      title: card.querySelector(".plan-main em")?.textContent.trim().split(" · ")[0] || ""
    }));
    const challenges = [...document.querySelectorAll("#challengeBoard [data-challenge-room]")].map((card) => ({
      label: card.querySelector(".challenge-meta b")?.textContent.trim() || "",
      room: Number(card.getAttribute("data-challenge-room")),
      mode: card.getAttribute("data-challenge-mode")
    }));
    const planHeader = document.querySelector("#practicePlan .plan-head em")?.textContent.trim() || "";
    if (queue.length !== 4 || plan.length !== 3 || challenges.length !== 4) return null;
    return { queue, plan, planHeader, challenges };
  })()`));
  const queueKey = surfaces.queue.map((item) => `${item.mode}:R${item.room + 1}`).join("|");
  const planKey = surfaces.plan.map((item) => `${item.mode}:R${item.room + 1}`).join("|");
  const challengeKey = surfaces.challenges.map((item) => `${item.label}:R${item.room + 1}:${item.mode}`).join("|");
  if (queueKey !== "clean:R1|pace:R2|style:R3|expert:R4"
    || surfaces.plan[0].room !== 2
    || surfaces.plan[0].mode !== "style"
    || new Set(surfaces.plan.map((item) => `${item.room}:${item.mode}`)).size !== 3
    || new Set(surfaces.plan.map((item) => item.room)).size !== 3
    || surfaces.planHeader !== "短板 → 迁移 → 跨房"
    || surfaces.plan[0].title !== "修最短板"
    || surfaces.plan[1].title !== "换一种能力"
    || !surfaces.plan[2].title.startsWith("补")
    || challengeKey !== "全 Clean:R1:clean|全 S:R2:pace|全 Style:R3:style|全 Expert:R4:expert") {
    errors.push("start, labeled three-room three-step plan, queue and challenge recommendations must share the same causal ten-room evidence: " + JSON.stringify({ ...surfaces, queueKey, planKey, challengeKey }));
  }

  await clickSelector(cdp, "#settingsClose");
  await clickSelector(cdp, "#resumeTrainingButton");
  const launched = await waitUntil("shared recommendation launches the exact R3 Style Drill", () => evaluate(cdp, `(() => {
    const status = document.querySelector("#gameStatus")?.textContent || "";
    const room = document.querySelector("#roomCount")?.textContent || "";
    return /Style Drill R3/.test(status) && room.startsWith("R3/") && document.querySelector("#overlay").classList.contains("hidden")
      ? { status, room }
      : null;
  })()`), 5000, 20);
  if (!/Style Drill R3/.test(launched.status) || !launched.room.startsWith("R3/")) {
    errors.push("direct resume must launch the room and mode advertised by every recommendation surface: " + JSON.stringify(launched));
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
  if (startState.settingsVersion !== 4 || startState.focusVersion !== 2) errors.push("stored settings/focus should migrate to current schema: " + JSON.stringify(startState));
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

async function runAssistModeSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await navigateApp(cdp, baseUrl, "assist mode");
  await evaluate(cdp, `(() => {
    localStorage.clear();
    localStorage.setItem("summit-spark-best-flow", "1");
  })()`);
  await navigateApp(cdp, baseUrl, "assist mode clean");
  await clickSelector(cdp, "#startSettingsButton");
  await openSettingsGroup(cdp, ".settings-group-display");
  const enabled = await evaluate(cdp, `(() => {
    const select = document.querySelector("#assistMode");
    select.value = "gentle";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const stored = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    return {
      value: select.value,
      stored: stored.assistMode,
      version: stored.schemaVersion,
      stageClass: document.querySelector(".stage")?.classList.contains("assist-active"),
      status: document.querySelector("#gameStatus")?.textContent || ""
    };
  })()`);
  if (enabled.value !== "gentle" || enabled.stored !== "gentle" || enabled.version !== 4 || !enabled.stageClass || !/不计纪录/.test(enabled.status)) {
    errors.push("gentle assist should persist, expose its active state, and explain record isolation: " + JSON.stringify(enabled));
  }
  await clickSelector(cdp, "#settingsClose");
  await clickSelector(cdp, "#startButton");
  const focusBefore = await evaluate(cdp, `localStorage.getItem("summit-spark-room-focus")`);
  await keyTap(cdp, "KeyX", "x");
  await keyTap(cdp, "KeyR", "r");
  await sleep(220);
  const isolated = await evaluate(cdp, `({
    bestFlow: localStorage.getItem("summit-spark-best-flow"),
    roomFocus: localStorage.getItem("summit-spark-room-focus"),
    assistMode: JSON.parse(localStorage.getItem("summit-spark-settings") || "{}").assistMode,
    stageClass: document.querySelector(".stage")?.classList.contains("assist-active")
  })`);
  if (isolated.bestFlow !== "1" || isolated.roomFocus !== focusBefore || isolated.assistMode !== "gentle" || !isolated.stageClass) {
    errors.push("assisted movement and retries must not replace Flow or room-focus records: " + JSON.stringify({ ...isolated, focusBefore }));
  }
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
  await openSettingsGroup(cdp, ".practice-subgroup-route");
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
  await openSettingsGroup(cdp, ".practice-subgroup-route");
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
  await openSettingsGroup(cdp, ".practice-subgroup-feel");
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
      profile: { summitClears: 2, bestDeathCount: 1, bestFlowPeak: 210, bestLumenCount: 9, challengeWins: { clear: true } },
      roomBests: [12.5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      roomPaths: [[{ x: 20, y: 40, t: 0.1, dash: true, spark: false, over: false }]],
      roomFocus: {
        schemaVersion: 1,
        rooms: [{
          faults: 3,
          fall: 8,
          drills: 2,
          drillClears: 2,
          cleanDrills: 0,
          cleanWins: 4,
          paceDrills: 1,
          paceWins: 7,
          last: "fall"
        }]
      },
      bestTime: 55.25,
      bestFlow: 999
    }
  };
  await evaluate(cdp, `(() => {
    const keys = [
      "summit-spark-save-backup",
      "summit-spark-settings",
      "summit-spark-profile",
      "summit-spark-room-bests",
      "summit-spark-room-paths",
      "summit-spark-room-focus",
      "summit-spark-best-time",
      "summit-spark-best-flow"
    ];
    localStorage.setItem("summit-spark-save-backup", JSON.stringify({ sentinel: "preserve-prior-backup" }));
    window.__summitAtomicBefore = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
    window.__summitAtomicOriginalSetItem = Storage.prototype.setItem;
    let rejected = false;
    Storage.prototype.setItem = function(key, value) {
      if (this === window.localStorage && key === "summit-spark-profile" && !rejected) {
        rejected = true;
        throw new DOMException("Simulated quota failure", "QuotaExceededError");
      }
      return window.__summitAtomicOriginalSetItem.call(this, key, value);
    };
    const input = document.querySelector("#saveImportText");
    input.value = ${JSON.stringify(JSON.stringify(importArchive))};
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await clickSelector(cdp, "#saveImportButton");
  await sleep(360);
  const atomicFailure = await evaluate(cdp, `(() => {
    Storage.prototype.setItem = window.__summitAtomicOriginalSetItem;
    const before = window.__summitAtomicBefore || {};
    const after = Object.fromEntries(Object.keys(before).map((key) => [key, localStorage.getItem(key)]));
    delete window.__summitAtomicBefore;
    delete window.__summitAtomicOriginalSetItem;
    return {
      rolledBack: Object.keys(before).every((key) => before[key] === after[key]),
      status: document.querySelector("#gameStatus")?.textContent || "",
      importStatus: document.querySelector("#saveImportStatus")?.textContent || "",
      importError: document.querySelector("#saveImportStatus")?.classList.contains("error") || false,
      stillOpen: !document.querySelector("#settingsPanel")?.classList.contains("hidden")
    };
  })()`);
  if (!atomicFailure.rolledBack || !atomicFailure.importError || !atomicFailure.stillOpen || !/导入失败/.test(atomicFailure.status) || !/不可写/.test(atomicFailure.importStatus)) {
    errors.push("a partial save write must roll every imported key and the previous backup back before reporting failure: " + JSON.stringify(atomicFailure));
  }
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
      bestLumens: profile.bestLumenCount,
      focusVersion: focus.schemaVersion,
      focusRooms: Array.isArray(focus.rooms) ? focus.rooms.length : 0,
      focusFaults: focus.rooms?.[0]?.faults,
      focusFall: focus.rooms?.[0]?.fall,
      focusCleanDrills: focus.rooms?.[0]?.cleanDrills,
      focusCleanWins: focus.rooms?.[0]?.cleanWins,
      focusPaceDrills: focus.rooms?.[0]?.paceDrills,
      focusPaceWins: focus.rooms?.[0]?.paceWins,
      bestFlow: Number(localStorage.getItem("summit-spark-best-flow") || 0),
      backupKind: backup.kind,
      backupReason: backup.reason,
      backupArchiveKind: backup.archive?.kind,
      backupOldTouchSize: backup.archive?.storage?.settings?.touchSize,
      stageTouchSize: getComputedStyle(document.querySelector(".stage")).getPropertyValue("--touch-size").trim()
    };
  })()`);
  if (imported.settingsVersion !== 4
    || imported.touchSize !== 62
    || !imported.lowPerformance
    || imported.deadzone !== 0.18
    || imported.profileVersion !== 3
    || imported.clears !== 2
    || imported.bestLumens !== 9
    || imported.focusVersion !== 2
    || imported.focusRooms !== 10
    || imported.focusFaults !== 3
    || imported.focusFall !== 3
    || imported.focusCleanDrills !== 0
    || imported.focusCleanWins !== 0
    || imported.focusPaceDrills !== 1
    || imported.focusPaceWins !== 1
    || imported.bestFlow !== 999
    || imported.backupKind !== "summit-spark-save-backup"
    || imported.backupReason !== "before-import"
    || imported.backupArchiveKind !== "summit-spark-save"
    || imported.backupOldTouchSize !== 48
    || imported.stageTouchSize !== "62px") {
    errors.push("save archive import did not normalize and apply storage: " + JSON.stringify(imported));
  }
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("Practice opens for full-route Flow evidence", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(cdp, ".settings-group-training");
  await openSettingsGroup(cdp, ".practice-subgroup-profile");
  await openSettingsGroup(cdp, ".practice-subgroup-advanced");
  const fullRouteFlowEvidence = await evaluate(cdp, `(() => {
    const card = document.querySelector(".challenge-card.flow");
    const lumenCard = document.querySelector(".challenge-card.lumens");
    const profile = document.querySelector("#profileSummary");
    return {
      cardText: card?.textContent.replace(/\\s+/g, " ").trim() || "",
      cardDone: card?.classList.contains("done") || false,
      lumenCardText: lumenCard?.textContent.replace(/\s+/g, " ").trim() || "",
      lumenCardDone: lumenCard?.classList.contains("done") || false,
      profileText: profile?.textContent.replace(/\\s+/g, " ").trim() || "",
      practiceBest: Number(localStorage.getItem("summit-spark-best-flow") || 0),
      fullRouteBest: JSON.parse(localStorage.getItem("summit-spark-profile") || "{}").bestFlowPeak || 0
    };
  })()`);
  if (fullRouteFlowEvidence.practiceBest !== 999
    || fullRouteFlowEvidence.fullRouteBest !== 210
    || fullRouteFlowEvidence.cardDone
    || fullRouteFlowEvidence.lumenCardDone
    || !/整局 Flow 210\/900/.test(fullRouteFlowEvidence.cardText)
    || !/最佳微光 9\/12/.test(fullRouteFlowEvidence.lumenCardText)
    || !/210整局 Flow/.test(fullRouteFlowEvidence.profileText)
    || /999/.test(fullRouteFlowEvidence.cardText)
    || /999/.test(fullRouteFlowEvidence.profileText)) {
    errors.push("Practice Flow best must not complete or replace the full-route Flow challenge/profile evidence: " + JSON.stringify(fullRouteFlowEvidence));
  }
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("Practice closes after full-route Flow evidence check", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));
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
  if (restored.touchSize !== 48 || restored.lowPerformance || restored.profileVersion !== 3 || restored.clears !== 0 || restored.backupArchiveKind !== "summit-spark-save" || restored.backupImportedTouchSize !== 62 || restored.stageTouchSize !== "48px") {
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
    const rect = canvas.getBoundingClientRect();
    return {
      width: canvas.width,
      height: canvas.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      requiredWidth: Math.ceil(rect.width * window.devicePixelRatio),
      requiredHeight: Math.ceil(rect.height * window.devicePixelRatio),
      dpr: window.devicePixelRatio
    };
  })()`);
  if (normal.dpr !== 2 || normal.width < normal.requiredWidth || normal.height < normal.requiredHeight || normal.width > 2496 || normal.height > 1414) {
    errors.push("normal high-DPI canvas should cover its physical display size without exceeding the 2.6x buffer cap: " + JSON.stringify(normal));
  }

  await clickSelector(cdp, "#startSettingsButton");
  await waitUntil("high-DPI settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await openSettingsGroup(cdp, ".settings-group-display");
  await clickSelector(cdp, "#lowPerformanceToggle");
  const reduced = await waitUntil("low-performance canvas buffer", () => evaluate(cdp, `(() => {
    const canvas = document.querySelector("#game");
    const state = {
      width: canvas.width,
      height: canvas.height,
      enabled: document.querySelector("#lowPerformanceToggle").checked,
      canvasFilter: getComputedStyle(canvas).filter,
      hudBackdrop: getComputedStyle(document.querySelector(".meters")).backdropFilter,
      tipBackdrop: getComputedStyle(document.querySelector("#gameTip")).backdropFilter,
      touchBackdrop: getComputedStyle(document.querySelector(".touch button")).backdropFilter,
      entryBackdrop: getComputedStyle(document.querySelector("#entryGate")).backdropFilter
    };
    return state.width === 960
      && state.height === 544
      && state.canvasFilter === "none"
      && state.hudBackdrop === "none"
      && state.tipBackdrop === "none"
      && state.touchBackdrop === "none"
      && state.entryBackdrop === "none"
      ? state
      : null;
  })()`));
  if (!reduced.enabled) errors.push("low-performance toggle should remain enabled after rebuilding the canvas");
  if (reduced.canvasFilter !== "none" || reduced.hudBackdrop !== "none" || reduced.tipBackdrop !== "none" || reduced.touchBackdrop !== "none" || reduced.entryBackdrop !== "none") {
    errors.push("low-performance mode should remove per-frame canvas filters and backdrop blurs: " + JSON.stringify(reduced));
  }

  await clickSelector(cdp, "#lowPerformanceToggle");
  const restored = await waitUntil("restored high-DPI canvas buffer", () => evaluate(cdp, `(() => {
    const canvas = document.querySelector("#game");
    return canvas.width === ${normal.width} && canvas.height === ${normal.height}
      ? { width: canvas.width, height: canvas.height, enabled: document.querySelector("#lowPerformanceToggle").checked }
      : null;
  })()`));
  if (restored.enabled) errors.push("normal high-DPI canvas should be restored after disabling low-performance mode");
}

async function runRestartSoakSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await navigateApp(cdp, baseUrl, "restart soak");
  const entryPending = await evaluate(cdp, `!document.querySelector("#entryGate")?.classList.contains("hidden")`);
  if (entryPending) {
    await clickSelector(cdp, "#guestEntryButton");
    await waitUntil("restart soak guest entry", () => evaluate(cdp, `document.querySelector("#entryGate").classList.contains("hidden")`));
  }
  await clickSelector(cdp, "#startButton");
  await waitUntil("restart soak game start", () => evaluate(cdp, `document.querySelector("#overlay").classList.contains("hidden")`));
  await enableDebugPanel(cdp);
  let last = await debugPosition(cdp);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    await keyTap(cdp, "KeyR", "R");
    const state = await waitUntil(`restart soak ${attempt + 1}`, () => evaluate(cdp, `(() => {
      const status = document.querySelector("#gameStatus")?.textContent || "";
      const text = document.querySelector("#debugPanel")?.textContent || "";
      const dead = text.match(/dead ([\\d.]+)/);
      const overlap = text.match(/overlap (\\d+)/);
      return /快速重开/.test(status) && dead && Number(dead[1]) === 0 && overlap && Number(overlap[1]) === 0
        ? { status, text }
        : null;
    })()`), 3000, 40);
    const current = await debugPosition(cdp);
    if (!Number.isFinite(current.x) || !Number.isFinite(current.y)) {
      errors.push("repeated quick retries should retain finite player coordinates: " + JSON.stringify({ attempt, state, current }));
      break;
    }
    await keyHold(cdp, "KeyD", "D", 90);
    const moved = await debugPosition(cdp);
    if (moved.x - current.x < 1) {
      errors.push("player should accept movement immediately after repeated retry: " + JSON.stringify({ attempt, current, moved }));
      break;
    }
    last = moved;
  }
  await evaluate(cdp, `window.dispatchEvent(new CustomEvent("summit-spark:test-action", { detail: "corruptMotion" }))`);
  const selfHealed = await waitUntil("non-finite runtime state self-heals", () => evaluate(cdp, `(() => {
    const status = document.querySelector("#gameStatus")?.textContent || "";
    const text = document.querySelector("#debugPanel")?.textContent || "";
    const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    const overlap = text.match(/overlap (\\d+)/);
    const recoveries = text.match(/recover (\\d+)/);
    return /运行状态已恢复/.test(status)
      && position
      && Number.isFinite(Number(position[1]))
      && Number.isFinite(Number(position[2]))
      && overlap
      && Number(overlap[1]) === 0
      && recoveries
      && Number(recoveries[1]) === 1
      ? { x: Number(position[1]), y: Number(position[2]), status, text }
      : null;
  })()`), 3000, 30);
  await keyHold(cdp, "KeyD", "D", 90);
  const afterSelfHealMove = await debugPosition(cdp);
  if (afterSelfHealMove.x - selfHealed.x < 1) {
    errors.push("a self-healed runtime should accept movement immediately: " + JSON.stringify({ selfHealed, afterSelfHealMove }));
  }
  await evaluate(cdp, `window.dispatchEvent(new CustomEvent("summit-spark:test-action", { detail: "corruptStructure" }))`);
  let structureHealed;
  try {
    structureHealed = await waitUntil("damaged runtime collections self-heal", () => evaluate(cdp, `(() => {
    const status = document.querySelector("#gameStatus")?.textContent || "";
    const text = document.querySelector("#debugPanel")?.textContent || "";
    const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    const recoveries = text.match(/recover (\\d+)/);
    return /运行状态已恢复/.test(status)
      && position
      && Number.isFinite(Number(position[1]))
      && Number.isFinite(Number(position[2]))
      && recoveries
      && Number(recoveries[1]) === 2
      ? { x: Number(position[1]), y: Number(position[2]), status, text }
      : null;
    })()`), 3000, 30);
    await keyHold(cdp, "KeyD", "D", 90);
    const afterStructureHealMove = await debugPosition(cdp);
    if (afterStructureHealMove.x - structureHealed.x < 1) {
      errors.push("a structurally self-healed runtime should accept movement immediately: " + JSON.stringify({ structureHealed, afterStructureHealMove }));
    }
  } catch (error) {
    const probe = await debugPosition(cdp);
    const runtimeErrors = await evaluate(cdp, `window.__summitSmokeRuntimeErrors || []`);
    errors.push(`damaged runtime collections probe failed: ${error.message}: ${JSON.stringify({ probe, runtimeErrors })}`);
  }
  await evaluate(cdp, `window.dispatchEvent(new CustomEvent("summit-spark:test-action", { detail: "throwFrame" }))`);
  const frameBoundary = await waitUntil("thrown frame boundary remains recoverable", () => evaluate(cdp, `(() => {
    const status = document.querySelector("#gameStatus")?.textContent || "";
    const text = document.querySelector("#debugPanel")?.textContent || "";
    return /运行状态异常/.test(status) && /faults 1/.test(text) ? { status, text } : null;
  })()`), 3000, 30);
  await keyTap(cdp, "KeyR", "R");
  const afterFrameBoundary = await waitUntil("retry after thrown frame boundary", () => evaluate(cdp, `(() => {
    const status = document.querySelector("#gameStatus")?.textContent || "";
    const text = document.querySelector("#debugPanel")?.textContent || "";
    const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    const dead = text.match(/dead ([\\d.]+)/);
    return /快速重开/.test(status) && position && dead && Number(dead[1]) === 0
      ? { status, x: Number(position[1]), y: Number(position[2]), text }
      : null;
  })()`), 3000, 30);
  await keyHold(cdp, "KeyD", "D", 90);
  const afterFrameBoundaryMove = await debugPosition(cdp);
  if (afterFrameBoundaryMove.x - afterFrameBoundary.x < 1) {
    errors.push("retry after a thrown frame should restore movement: " + JSON.stringify({ frameBoundary, afterFrameBoundary, afterFrameBoundaryMove }));
  }
  const contextLoss = await evaluate(cdp, `(() => {
    const canvas = document.querySelector("#game");
    const event = new Event("contextlost", { cancelable: true });
    canvas.dispatchEvent(event);
    window.dispatchEvent(new Event("resize"));
    return {
      defaultPrevented: event.defaultPrevented,
      status: document.querySelector("#gameStatus")?.textContent || ""
    };
  })()`);
  if (!contextLoss.defaultPrevented || !/失去绘制上下文/.test(contextLoss.status)) {
    errors.push("canvas context loss should pause visibly and opt into browser restoration: " + JSON.stringify(contextLoss));
  }
  await sleep(100);
  const contextRestored = await evaluate(cdp, `(() => {
    const canvas = document.querySelector("#game");
    canvas.dispatchEvent(new Event("contextrestored"));
    return document.querySelector("#gameStatus")?.textContent || "";
  })()`);
  const afterContextRestore = await waitUntil("canvas context restoration", () => evaluate(cdp, `(() => {
    const status = document.querySelector("#gameStatus")?.textContent || "";
    const debug = document.querySelector("#debugPanel")?.textContent || "";
    return /画面已恢复/.test(status) && /canvas 1/.test(debug) ? { status, debug } : null;
  })()`), 3000, 30);
  await keyHold(cdp, "KeyD", "D", 90);
  const afterContextRestoreMove = await debugPosition(cdp);
  if (afterContextRestoreMove.x <= afterFrameBoundaryMove.x) {
    errors.push("movement should resume after canvas context restoration: " + JSON.stringify({ contextRestored, afterContextRestore, afterContextRestoreMove }));
  }
  const runtimeErrors = await evaluate(cdp, `window.__summitSmokeRuntimeErrors || []`);
  if (runtimeErrors.length) errors.push("restart soak should not emit runtime errors: " + JSON.stringify(runtimeErrors));
  if (!Number.isFinite(last.x) || !Number.isFinite(last.y)) errors.push("restart soak should finish with a finite debug position: " + JSON.stringify(last));
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
    const startButton = document.querySelector("#startButton");
    const accountButton = document.querySelector("#startAccountButton");
    const startRect = startButton?.getBoundingClientRect();
    const accountRect = accountButton?.getBoundingClientRect();
    const accountBackground = getComputedStyle(accountButton).backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
    const accountBackgroundAlpha = accountBackground.length >= 4 ? accountBackground[3] : 1;
    const portraitBrief = document.querySelector("#portraitBrief");
    return {
      resumeVisible,
      resumeText,
      chapter,
      title,
      goal,
      startTouchSafe: startActions.length >= 3 && startActions.every((button) => button.getBoundingClientRect().height >= 44),
      accountEntryReadable: !!startRect && !!accountRect
        && accountRect.width >= startRect.width * 0.9
        && accountRect.height >= 44
        && accountBackgroundAlpha >= 0.5
        && accountButton.scrollWidth <= accountButton.clientWidth + 2,
      briefHiddenDuringMenu: getComputedStyle(portraitBrief).visibility === "hidden"
        && getComputedStyle(portraitBrief).opacity === "0",
      aligned: resumeVisible
        ? chapter.includes("上次训练") && resumeRoom === titleRoom && !!resumeMode && goal.includes(resumeMode)
        : chapter.includes("攀登起点") && titleRoom === "1"
    };
  })()`);
  if (!mobileStartContext.aligned) errors.push("mobile start portrait brief should match the resume target or clearly identify the R1 climb start: " + JSON.stringify(mobileStartContext));
  if (!mobileStartContext.startTouchSafe) errors.push("mobile start actions should retain 44px hit targets: " + JSON.stringify(mobileStartContext));
  if (!mobileStartContext.accountEntryReadable) errors.push("mobile cloud-login entry should remain full-width, readable and touch-safe: " + JSON.stringify(mobileStartContext));
  if (!mobileStartContext.briefHiddenDuringMenu) errors.push("mobile menus should not repeat the background room brief: " + JSON.stringify(mobileStartContext));
  await clickSelector(cdp, "#startAccountButton");
  await waitUntil("mobile account panel opens", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("account-focused")`));
  const mobileAccountTouchSafe = await evaluate(cdp, `(() => {
    const controls = [...document.querySelectorAll(".settings-group-account button, .settings-group-account input")].filter((control) => {
      const rect = control.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return controls.length >= 6 && controls.every((control) => control.getBoundingClientRect().height >= 44);
  })()`);
  if (!mobileAccountTouchSafe) errors.push("mobile account inputs and actions should retain 44px touch targets");
  const accountSemantics = await evaluate(cdp, `(() => {
    const group = document.querySelector("#accountAuthTabs");
    const code = document.querySelector('[data-auth-mode="code"]');
    const password = document.querySelector('[data-auth-mode="password"]');
    const fields = ["accountEmail", "accountPassword", "accountCode", "accountNewPassword", "accountOldPassword"]
      .map((id) => {
        const field = document.getElementById(id);
        const labelledBy = field?.getAttribute("aria-labelledby") || "";
        const labelledText = labelledBy
          ? labelledBy.split(/\s+/).map((labelId) => document.getElementById(labelId)?.textContent?.trim() || "").filter(Boolean).join(" ")
          : "";
        const labelText = [...(field?.labels || [])].map((label) => label.textContent?.trim() || "").filter(Boolean).join(" ");
        return {
          id,
          name: field?.name || "",
          autocomplete: field?.autocomplete || "",
          describedBy: field?.getAttribute("aria-describedby") || "",
          accessibleName: field?.getAttribute("aria-label") || labelledText || labelText
        };
      });
    return {
      role: group?.getAttribute("role") || "",
      codeRole: code?.getAttribute("role") || "",
      passwordRole: password?.getAttribute("role") || "",
      codePressed: code?.getAttribute("aria-pressed") || "",
      passwordPressed: password?.getAttribute("aria-pressed") || "",
      fields
    };
  })()`);
  if (
    accountSemantics.role !== "group"
    || accountSemantics.codeRole
    || accountSemantics.passwordRole
    || accountSemantics.codePressed !== "true"
    || accountSemantics.passwordPressed !== "false"
    || accountSemantics.fields.some((field) => !field.name || !field.autocomplete || !field.describedBy.includes("accountStatus") || !field.accessibleName)
    || new Set(accountSemantics.fields.map((field) => field.accessibleName)).size !== accountSemantics.fields.length
    || accountSemantics.fields.find((field) => field.id === "accountNewPassword")?.accessibleName !== "新密码"
    || accountSemantics.fields.find((field) => field.id === "accountOldPassword")?.accessibleName !== "原密码（已有密码时填写）"
  ) {
    errors.push("account login mode should expose segmented-button semantics and autofill-ready described fields: " + JSON.stringify(accountSemantics));
  }
  await clickSelector(cdp, '[data-auth-mode="password"]');
  const mobilePasswordFocus = await evaluate(cdp, `(() => {
    const tab = document.querySelector('[data-auth-mode="password"]');
    const code = document.querySelector('[data-auth-mode="code"]');
    const recovery = document.querySelector("#accountRecovery");
    const style = getComputedStyle(tab);
    const parseRgba = (value) => {
      const match = String(value).match(/rgba?\\(([^)]+)\\)/);
      if (!match) return [0, 0, 0, 0];
      const parts = match[1].split(/[, ]+/).filter(Boolean).map(Number);
      return [parts[0], parts[1], parts[2], parts[3] ?? 1];
    };
    const composite = (foreground, background) => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3]);
      if (!alpha) return [0, 0, 0, 0];
      return [
        (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
        (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
        (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
        alpha
      ];
    };
    const layers = [];
    for (let parent = recovery.parentElement; parent; parent = parent.parentElement) {
      layers.push(parseRgba(getComputedStyle(parent).backgroundColor));
    }
    const recoveryBackground = layers.reverse().reduce(
      (background, layer) => composite(layer, background),
      [255, 255, 255, 1]
    );
    const recoveryForeground = composite(parseRgba(getComputedStyle(recovery).color), recoveryBackground);
    const luminance = (color) => {
      const channels = color.slice(0, 3).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const foregroundLum = luminance(recoveryForeground);
    const backgroundLum = luminance(recoveryBackground);
    return {
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      recoveryHeight: recovery.getBoundingClientRect().height,
      recoveryContrast: Number(((Math.max(foregroundLum, backgroundLum) + 0.05) / (Math.min(foregroundLum, backgroundLum) + 0.05)).toFixed(2)),
      codePressed: code?.getAttribute("aria-pressed") || "",
      passwordPressed: tab?.getAttribute("aria-pressed") || ""
    };
  })()`);
  if (
    Number.parseFloat(mobilePasswordFocus.outlineWidth) < 2
    || /rgb\(0, 0, 0\)/.test(mobilePasswordFocus.outlineColor)
    || mobilePasswordFocus.recoveryHeight < 44
    || mobilePasswordFocus.recoveryContrast < 4.5
    || mobilePasswordFocus.codePressed !== "false"
    || mobilePasswordFocus.passwordPressed !== "true"
  ) {
    errors.push("mobile password tab and recovery action should keep a refined visible focus ring and safe touch target: " + JSON.stringify(mobilePasswordFocus));
  }
  await clickSelector(cdp, "#settingsClose");
  await waitUntil("mobile account panel closes", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await tapSelector(cdp, "#startSettingsButton");
  await waitUntil("mobile collapsed settings open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  const collapsedSettingsFit = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel").getBoundingClientRect();
    const groups = [...document.querySelectorAll(".settings-group.settings-only")].filter((group) => group.getBoundingClientRect().height > 0);
    const last = groups[groups.length - 1]?.getBoundingClientRect();
    return {
      panelHeight: Math.round(panel.height),
      viewportHeight: innerHeight,
      emptyTail: last ? Math.round(panel.bottom - last.bottom) : 999,
      allCollapsed: groups.length === 5 && groups.every((group) => !group.open),
      bounded: panel.top >= 0 && panel.bottom <= innerHeight
    };
  })()`);
  if (!collapsedSettingsFit.allCollapsed || !collapsedSettingsFit.bounded || collapsedSettingsFit.emptyTail > 28 || collapsedSettingsFit.panelHeight > collapsedSettingsFit.viewportHeight * 0.68) {
    errors.push("collapsed mobile Settings should fit its five-item list instead of leaving a large empty lower sheet: " + JSON.stringify(collapsedSettingsFit));
  }
  const mobileBackdropPoint = await evaluate(cdp, `(() => {
    const rect = document.querySelector("#settingsPanel").getBoundingClientRect();
    return {
      x: Math.max(1, Math.floor(rect.left / 2)),
      y: Math.max(1, Math.min(innerHeight - 1, Math.round(rect.top + rect.height / 2)))
    };
  })()`);
  await tapPoint(cdp, mobileBackdropPoint.x, mobileBackdropPoint.y);
  await waitUntil("mobile exposed backdrop tap dismisses without click-through", () => evaluate(cdp, `document.querySelector("#settingsPanel").classList.contains("hidden") && document.activeElement === document.querySelector("#startSettingsButton") && !document.querySelector("#overlay").classList.contains("hidden")`));
  await clickSelector(cdp, "#openTrainingButton");
  await waitUntil("mobile practice open", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  const collapsedPracticeFit = await evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel").getBoundingClientRect();
    const dock = document.querySelector("#practiceLaunchDock").getBoundingClientRect();
    const groups = [...document.querySelectorAll(".settings-group.practice-only")].filter((group) => group.getBoundingClientRect().height > 0);
    const last = groups[groups.length - 1]?.getBoundingClientRect();
    return {
      panelHeight: Math.round(panel.height),
      viewportHeight: innerHeight,
      emptyTail: last ? Math.round(dock.top - last.bottom) : 999,
      allCollapsed: groups.length === 2 && groups.every((group) => !group.open),
      dockVisible: dock.height >= 44 && dock.bottom <= panel.bottom + 1,
      bounded: panel.top >= 0 && panel.bottom <= innerHeight
    };
  })()`);
  if (!collapsedPracticeFit.allCollapsed || !collapsedPracticeFit.dockVisible || !collapsedPracticeFit.bounded || collapsedPracticeFit.emptyTail > 28 || collapsedPracticeFit.panelHeight > collapsedPracticeFit.viewportHeight * 0.56) {
    errors.push("collapsed mobile Practice should fit its two choices and launch action instead of leaving an empty full-height workspace: " + JSON.stringify(collapsedPracticeFit));
  }
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
    const roomItems = [...document.querySelectorAll("#roomSelect, #roomBrief, .drill-variants, #practiceLaunchDock")].map((el) => {
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
    const selectedRoomLabel = document.querySelector("#roomSelect")?.selectedOptions?.[0]?.textContent.trim() || "";
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
      roomSelectConcise: /^R1 · /.test(selectedRoomLabel) && selectedRoomLabel.length <= 24,
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
  if (!mobile.roomSelectConcise) errors.push("mobile room selector should keep a concise selection label while details stay in the room brief: " + JSON.stringify(mobile));
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
  await cdp.send("Page.bringToFront");
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
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
    const buttons = [...document.querySelectorAll("[data-touch], [data-touch-command]")].map((button) => {
      const rect = button.getBoundingClientRect();
      return { id: button.dataset.touch || button.dataset.touchCommand, width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
    }).filter((button) => button.width > 0 && button.height > 0);
    const recall = document.querySelector('[data-touch="recall"]');
    return {
      visible: getComputedStyle(touch).display !== "none",
      position: getComputedStyle(touch).position,
      directionGrid: getComputedStyle(direction).display === "grid",
      actionGrid: getComputedStyle(action).display === "grid",
      buttonBackground: getComputedStyle(document.querySelector("[data-touch]")).backgroundImage,
      buttons,
      recallContextual: recall.hidden && recall.disabled && recall.getAttribute("aria-label") === "先激活回声锚点",
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
      retryLabels: [document.querySelector('[data-touch-command="retry"]'), document.querySelector('[data-touch-command="roomRestart"]')]
        .map((button) => (button?.getAttribute("aria-label") || "") + " " + (button?.getAttribute("title") || "")),
      stageTop: Math.round(stage.top)
    };
  })()`);
  if (!touchUi.visible || !touchUi.directionGrid || !touchUi.actionGrid || !/68, 89, 98/.test(touchUi.buttonBackground) || !touchUi.allButtonsLarge || !touchUi.recallContextual || !touchUi.hudActionsTouchSafe || !touchUi.detachedFromPlayfield || touchUi.playfieldGap < 12 || touchUi.playfieldGap > 28 || !touchUi.portraitBriefVisible || !touchUi.portraitBriefAbove || touchUi.portraitBriefGap < 8 || touchUi.portraitBriefGap > 20 || !touchUi.portraitAtmosphere || !/R1.*起势山门/.test(touchUi.portraitBriefText) || !touchUi.controlHintRemoved || touchUi.stageTop > 380 || !touchUi.retryLabels.every((label) => /重开/.test(label) && /(R|T)/.test(label))) {
    errors.push("touch controls should use visible direction/action grids with safe hit targets away from the portrait playfield: " + JSON.stringify(touchUi));
  }
  await tapSelector(cdp, '[data-touch-command="retry"]');
  await waitUntil("portrait touch quick retry responds", () => evaluate(cdp, `/快速重开/.test(document.querySelector("#gameStatus")?.textContent || "")`));
  await tapSelector(cdp, '[data-touch-command="roomRestart"]');
  await waitUntil("portrait touch room restart responds", () => evaluate(cdp, `/房间重开/.test(document.querySelector("#gameStatus")?.textContent || "")`));
  const largeTouchUi = await evaluate(cdp, `(() => {
    const shell = document.querySelector(".shell");
    const previousSize = shell.style.getPropertyValue("--touch-size");
    shell.style.setProperty("--touch-size", "64px");
    const direction = document.querySelector(".touch-directions");
    const action = document.querySelector(".touch-actions");
    const directionRect = direction.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const buttons = [...document.querySelectorAll("[data-touch]")].map((button) => {
      const rect = button.getBoundingClientRect();
      return { id: button.dataset.touch, left: rect.left, right: rect.right, top: rect.top, width: rect.width, height: rect.height };
    }).filter((button) => button.width > 0 && button.height > 0);
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
    if (previousSize) shell.style.setProperty("--touch-size", previousSize);
    else shell.style.removeProperty("--touch-size");
    return result;
  })()`);
  if (!largeTouchUi.withinViewport || !largeTouchUi.clustersSeparated || largeTouchUi.actionColumns !== 2 || !largeTouchUi.commonActionsPaired || largeTouchUi.minSize < 44 || largeTouchUi.maxSize > 64.5) {
    errors.push("64px portrait touch setting should adapt within the phone width and keep Jump/Dash reachable: " + JSON.stringify(largeTouchUi));
  }

  await enableDebugPanel(cdp);
  const touchReleaseStart = await debugPosition(cdp);
  const touchRightTarget = await targetPoint(cdp, '[data-touch="right"]');
  const heldTouchPoint = {
    x: touchRightTarget.inputX,
    y: touchRightTarget.inputY,
    id: 7,
    radiusX: 2,
    radiusY: 2,
    force: 1
  };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [heldTouchPoint] });
  await sleep(180);
  const touchReleaseHeld = await debugPosition(cdp);
  await evaluate(cdp, `document.querySelector('[data-touch="right"]').dispatchEvent(new Event("lostpointercapture"))`);
  await sleep(260);
  const touchReleaseLost = await debugPosition(cdp);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  if (touchReleaseHeld.x - touchReleaseStart.x < 1 || touchReleaseLost.x - touchReleaseHeld.x > 8) {
    errors.push("lost touch pointer capture should release movement without waiting for pointerup: " + JSON.stringify({ touchReleaseStart, touchReleaseHeld, touchReleaseLost }));
  }
  await keyTap(cdp, "Digit9", "9");
  await waitUntil("mobile debug jump reaches Echo room", () => evaluate(cdp, `/R9\\/10/.test(document.querySelector("#roomCount").textContent)`));
  const echoRecallReady = await waitUntil("touch Echo recall becomes available in the safe entry pocket", () => evaluate(cdp, `(() => {
    const button = document.querySelector('[data-touch="recall"]');
    const debug = document.querySelector("#debugPanel").textContent;
    const rect = button.getBoundingClientRect();
    const crumble = debug.match(/crumble (\\d+)\\/(\\d+)/);
    return !button.hidden && !button.disabled && /anchor 1/.test(debug)
      ? {
          label: button.getAttribute("aria-label"),
          available: button.classList.contains("available"),
          recallReady: /recall 1/.test(debug),
          width: Math.round(rect.width),
          crumbleActive: Number(crumble?.[1]),
          crumbleTotal: Number(crumble?.[2])
        }
      : null;
  })()`), 3500);
  await windowKeyHold(cdp, "KeyA", "a", 220);
  const beforeTouchRecall = await debugPosition(cdp);
  await tapSelector(cdp, '[data-touch="recall"]');
  const afterTouchRecall = await waitUntil("touch Echo recall returns to the active anchor", () => evaluate(cdp, `(() => {
    const match = document.querySelector("#debugPanel").textContent.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    const button = document.querySelector('[data-touch="recall"]');
    const debug = document.querySelector("#debugPanel").textContent;
    if (!match || !button.disabled) return null;
    const x = Number(match[1]);
    return x > ${Math.round(beforeTouchRecall.x + 20)}
      ? { x, label: button.getAttribute("aria-label"), active: button.classList.contains("active"), recallReady: /recall 1/.test(debug), status: document.querySelector("#gameStatus").textContent }
      : null;
  })()`), 3500);
  if (!echoRecallReady.available || !echoRecallReady.recallReady || echoRecallReady.width < 44 || echoRecallReady.label !== "召回到回声锚点"
    || echoRecallReady.crumbleActive !== 18 || echoRecallReady.crumbleTotal !== 18
    || afterTouchRecall.label !== "召回冷却中" || afterTouchRecall.active || afterTouchRecall.recallReady || !/回声召回.*恢复/.test(afterTouchRecall.status)) {
    errors.push("R9 should expose contextual Echo recall from its safe pocket, load the recovered 18-crumble route, and enter cooldown after a real touch recall: " + JSON.stringify({ echoRecallReady, beforeTouchRecall, afterTouchRecall }));
  }
  await keyTap(cdp, "Digit0", "0");
  await waitUntil("mobile debug jump reaches finale room", () => evaluate(cdp, `/R10\\/10/.test(document.querySelector("#roomCount").textContent)`));
  const finaleEchoReady = await waitUntil("R10 reuses Echo beside its entry checkpoint", () => evaluate(cdp, `(() => {
    const button = document.querySelector('[data-touch="recall"]');
    const debug = document.querySelector("#debugPanel").textContent;
    return !button.hidden && !button.disabled && /anchor 1/.test(debug)
      ? { label: button.getAttribute("aria-label"), status: document.querySelector("#gameStatus").textContent }
      : null;
  })()`), 3500);
  if (finaleEchoReady.label !== "召回到回声锚点" || !/回声锚点已激活/.test(finaleEchoReady.status)) {
    errors.push("R10 should reactivate Echo from its stable entry pocket before the finale route: " + JSON.stringify(finaleEchoReady));
  }
  await keyTap(cdp, "Digit1", "1");
  await keyTap(cdp, "F3", "F3");

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
    const buttons = [...document.querySelectorAll("[data-touch]")]
      .map((button) => button.getBoundingClientRect())
      .filter((button) => button.width > 0 && button.height > 0);
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

async function runMobileSafeAreaSmoke(cdp, baseUrl) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 700,
    deviceScaleFactor: 3,
    mobile: true
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top: 47, right: 0, bottom: 34, left: 0 }
  });
  try {
    await evaluate(cdp, `sessionStorage.removeItem("summit-spark-entry-mode")`);
    await navigateApp(cdp, baseUrl, "mobile safe-area entry");
    await waitUntil("safe-area entry chooser", () => evaluate(cdp, `!document.querySelector("#entryGate")?.classList.contains("hidden")`), 7000);
    const entry = await evaluate(cdp, `(() => {
      const gate = document.querySelector("#entryGate").getBoundingClientRect();
      const viewport = document.querySelector('meta[name="viewport"]')?.content || "";
      return {
        viewport,
        top: Math.round(gate.top),
        bottom: Math.round(gate.bottom),
        left: Math.round(gate.left),
        right: Math.round(gate.right),
        fitsSafeArea: gate.top >= 47 && gate.bottom <= innerHeight - 34 && gate.left >= 0 && gate.right <= innerWidth,
        roomBriefHidden: getComputedStyle(document.querySelector("#portraitBrief")).visibility === "hidden",
        guestFocused: document.activeElement === document.querySelector("#guestEntryButton")
      };
    })()`);
    if (!/viewport-fit=cover/.test(entry.viewport) || !/interactive-widget=resizes-content/.test(entry.viewport) || !entry.fitsSafeArea || !entry.roomBriefHidden || !entry.guestFocused) {
      errors.push("mobile entry must negotiate keyboard resizing and remain inside notched-device safe areas: " + JSON.stringify(entry));
    }

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 320,
      height: 568,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(120);
    const narrowEntry = await evaluate(cdp, `(() => {
      const gate = document.querySelector("#entryGate").getBoundingClientRect();
      const buttons = [...document.querySelectorAll("#entryGate button")].map((button) => button.getBoundingClientRect());
      const brief = getComputedStyle(document.querySelector("#portraitBrief"));
      return {
        fitsSafeArea: gate.top >= 47 && gate.bottom <= innerHeight - 34 && gate.left >= 0 && gate.right <= innerWidth,
        actionsTouchSafe: buttons.length === 2 && buttons.every((button) => button.width >= 44 && button.height >= 44),
        roomBriefHidden: brief.visibility === "hidden" && Number(brief.opacity) === 0,
        guestFocused: document.activeElement === document.querySelector("#guestEntryButton"),
        viewport: { width: innerWidth, height: innerHeight }
      };
    })()`);
    if (!narrowEntry.fitsSafeArea || !narrowEntry.actionsTouchSafe || !narrowEntry.roomBriefHidden || !narrowEntry.guestFocused) {
      errors.push("320px first-run entry should stay focused, touch-safe and free of background room coaching: " + JSON.stringify(narrowEntry));
    }

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 700,
      deviceScaleFactor: 3,
      mobile: true
    });
    await sleep(120);
    await clickSelector(cdp, "#accountEntryButton");
    await waitUntil("safe-area account drawer opens", () => evaluate(cdp, `!document.querySelector("#settingsPanel")?.classList.contains("hidden") && document.querySelector("#settingsPanel")?.classList.contains("account-focused")`));
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 420,
      deviceScaleFactor: 3,
      mobile: true
    });
    await sleep(180);
    await evaluate(cdp, `document.querySelector("#accountEmail")?.focus({ preventScroll: false })`);
    await sleep(180);
    const keyboard = await evaluate(cdp, `(() => {
      const panel = document.querySelector("#settingsPanel").getBoundingClientRect();
      const body = document.querySelector("#settingsPanel .settings-body");
      const field = document.querySelector("#accountEmail").getBoundingClientRect();
      return {
        panel: { top: Math.round(panel.top), right: Math.round(panel.right), bottom: Math.round(panel.bottom), left: Math.round(panel.left) },
        field: { top: Math.round(field.top), bottom: Math.round(field.bottom) },
        bodyScrolls: ["auto", "scroll"].includes(getComputedStyle(body).overflowY),
        focused: document.activeElement?.id,
        fitsSafeArea: panel.top >= 47 && panel.bottom <= innerHeight - 34 && panel.left >= 0 && panel.right <= innerWidth,
        fieldReachable: field.bottom > panel.top && field.top < panel.bottom
      };
    })()`);
    if (!keyboard.fitsSafeArea || !keyboard.bodyScrolls || keyboard.focused !== "accountEmail" || !keyboard.fieldReachable) {
      errors.push("account drawer must remain bounded and its focused field reachable after a mobile keyboard resize: " + JSON.stringify(keyboard));
    }
  } finally {
    await cdp.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    await evaluate(cdp, `sessionStorage.setItem("summit-spark-entry-mode", "guest")`);
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
    const buttons = [...touch.querySelectorAll("button")].filter((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const rgba = getComputedStyle(buttons[0]).backgroundColor.match(/[\\d.]+/g)?.map(Number) || [];
    return {
      visible: getComputedStyle(touch).display === "flex",
      buttonCount: buttons.length,
      commandCount: touch.querySelectorAll("[data-touch-command]").length,
      allLarge: buttons.every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }),
      backgroundAlpha: rgba.length >= 4 ? rgba[3] : 1,
      backdrop: getComputedStyle(buttons[0]).backdropFilter || ""
    };
  })()`);
  if (!landscapeTouch.visible || landscapeTouch.buttonCount !== 9 || landscapeTouch.commandCount !== 2 || !landscapeTouch.allLarge || landscapeTouch.backgroundAlpha > 0.34 || !/blur\(4px\)/.test(landscapeTouch.backdrop)) {
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
      resetNestedInAdvanced: !!document.querySelector(".practice-subgroup-advanced #focusResetButton"),
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
    overlay.innerHTML = '<section class="finish-sheet"><h1 id="finishTitle" tabindex="-1">登顶</h1><p class="finish-line">0:30.00 · 失误 1 · 微光 7/12 · 光继连锁 3 · Flow 120</p><p class="finish-whisper">所有微光，都抵达了山顶。</p><p class="finish-mastery">S 9/10 / A 1 / 无失误 9/10 (20) / Drill 0/0/9 / Flow Best 999 / 失误 尖刺 4 / 坠落 4 / 碎冰 1 / 重点 R1 坠落</p><div class="review-grid">' +
      Array.from({ length: 9 }, (_, index) => '<article class="review-card ' + (index < 4 ? 'primary' : 'secondary') + '"><span>复盘项 ' + index + '</span><strong>长文本安全检查 R' + index + '</strong><p>这是一段用于横屏移动端滚动和断行的复盘内容，不能横向溢出。</p></article>').join('') +
      '</div><div class="review-actions"><button class="review-button primary-review" type="button">下一 Drill</button></div>' +
      '<details class="review-more"><summary aria-expanded="false"><span>更多复盘</span><span class="review-more-chevron" aria-hidden="true">›</span></summary><div class="review-grid review-grid-extra"></div></details>' +
      '<details class="review-more review-roadmap-panel"><summary aria-expanded="false"><span>掌握路线图</span><span class="review-more-chevron" aria-hidden="true">›</span></summary></details>' +
      '<button class="primary" id="restartButton" type="button">再来</button></section>';
    document.querySelector("#finishTitle").focus({ preventScroll: true });
    overlay.scrollTop = 0;
  })()`);
  const initialReviewDisclosure = await evaluate(cdp, `(() => {
    const details = document.querySelector(".review-more");
    const summary = details?.querySelector(":scope > summary");
    const chevron = summary?.querySelector(".review-more-chevron");
    return {
      count: document.querySelectorAll(".review-more").length,
      expanded: summary?.getAttribute("aria-expanded") || "",
      chevronHidden: chevron?.getAttribute("aria-hidden") || "",
      generatedContent: summary ? getComputedStyle(summary, "::after").content : ""
    };
  })()`);
  if (initialReviewDisclosure.count !== 2 || initialReviewDisclosure.expanded !== "false" || initialReviewDisclosure.chevronHidden !== "true" || initialReviewDisclosure.generatedContent !== "none") {
    errors.push("finish review disclosures should start collapsed without generated accessible symbols: " + JSON.stringify(initialReviewDisclosure));
  }
  await evaluate(cdp, `document.querySelector(".review-more").open = true`);
  await sleep(120);
  await evaluate(cdp, `(() => {
    const overlay = document.querySelector("#overlay");
    const focusable = [...overlay.querySelectorAll("button, select, input, textarea, summary, [tabindex]")]
      .filter((element) => element.getClientRects().length > 0 && !element.disabled && element.getAttribute("tabindex") !== "-1" && element.getAttribute("aria-hidden") !== "true");
    focusable[focusable.length - 1]?.focus();
  })()`);
  await keyTap(cdp, "Tab", "Tab");
  await sleep(80);
  const finishForwardWrap = await evaluate(cdp, `(() => {
    const overlay = document.querySelector("#overlay");
    const focusable = [...overlay.querySelectorAll("button, select, input, textarea, summary, [tabindex]")]
      .filter((element) => element.getClientRects().length > 0 && !element.disabled && element.getAttribute("tabindex") !== "-1" && element.getAttribute("aria-hidden") !== "true");
    return document.activeElement === focusable[0] && overlay.contains(document.activeElement);
  })()`);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", code: "Tab", key: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", code: "Tab", key: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
  await sleep(80);
  const finishBackwardWrap = await evaluate(cdp, `(() => {
    const overlay = document.querySelector("#overlay");
    const focusable = [...overlay.querySelectorAll("button, select, input, textarea, summary, [tabindex]")]
      .filter((element) => element.getClientRects().length > 0 && !element.disabled && element.getAttribute("tabindex") !== "-1" && element.getAttribute("aria-hidden") !== "true");
    return document.activeElement === focusable[focusable.length - 1] && overlay.contains(document.activeElement);
  })()`);
  if (!finishForwardWrap || !finishBackwardWrap) {
    errors.push("finish dialog should trap forward and backward Tab focus inside its modal surface");
  }
  await evaluate(cdp, `(() => {
    document.querySelector("#finishTitle")?.focus({ preventScroll: true });
    document.querySelector("#overlay").scrollTop = 0;
  })()`);
  const review = await evaluate(cdp, `(() => {
    const overlay = document.querySelector("#overlay");
    const articles = [...document.querySelectorAll(".review-grid article")].map((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, scrollWidth: el.scrollWidth };
    });
    const overlayRect = overlay.getBoundingClientRect();
    const titleRect = document.querySelector("#finishTitle").getBoundingClientRect();
    const finishLine = document.querySelector(".finish-line");
    const sheet = document.querySelector(".finish-sheet");
    const sheetChildren = [...sheet.children].filter((element) => element.getClientRects().length > 0);
    const flowRects = sheetChildren.map((element) => element.getBoundingClientRect());
    const restartRect = document.querySelector("#restartButton").getBoundingClientRect();
    const cardContentFits = [...document.querySelectorAll(".review-card")].every((card) => {
      const cardRect = card.getBoundingClientRect();
      return [...card.children].every((child) => child.getBoundingClientRect().bottom <= cardRect.bottom + 1);
    });
    return {
      scrollSafe: getComputedStyle(overlay).overflowY === "auto" && overlay.scrollHeight >= overlay.clientHeight,
      topReachable: titleRect.top >= overlayRect.top - 1 && titleRect.bottom <= overlayRect.bottom + 1,
      focusInside: document.activeElement === document.querySelector("#finishTitle"),
      noHorizontalOverflow: articles.every((item) => item.scrollWidth <= item.width + 2),
      finishLineNoOverflow: finishLine.scrollWidth <= finishLine.clientWidth + 2,
      verticalFlowSafe: flowRects.every((rect, index) => index === 0 || flowRects[index - 1].bottom <= rect.top + 1),
      cardContentFits,
      restartCompact: restartRect.width <= 282 && restartRect.width < sheet.getBoundingClientRect().width,
      primaryCount: document.querySelectorAll(".review-card.primary").length,
      disclosure: (() => {
        const details = document.querySelector(".review-more");
        const summary = details?.querySelector(":scope > summary");
        const chevron = summary?.querySelector(".review-more-chevron");
        return {
          open: Boolean(details?.open),
          expanded: summary?.getAttribute("aria-expanded") || "",
          generatedContent: summary ? getComputedStyle(summary, "::after").content : "",
          chevronHidden: chevron?.getAttribute("aria-hidden") || "",
          transform: chevron ? getComputedStyle(chevron).transform : "none"
        };
      })()
    };
  })()`);
  if (!review.scrollSafe) errors.push("finish review overlay should remain vertically scroll-safe on mobile landscape");
  if (!review.topReachable || !review.focusInside) errors.push("finish review should keep its labelled top reachable and focused on mobile landscape: " + JSON.stringify(review));
  if (!review.noHorizontalOverflow) errors.push("finish review cards overflow horizontally on mobile landscape");
  if (!review.finishLineNoOverflow) errors.push("finish review summary should wrap its current-run Lumen count without horizontal overflow");
  if (!review.verticalFlowSafe || !review.cardContentFits || !review.restartCompact) errors.push("finish review should keep one non-overlapping vertical sheet with contained cards and a compact restart action: " + JSON.stringify(review));
  if (review.primaryCount < 4) errors.push("finish review should preserve primary card priority markers");
  if (!review.disclosure.open || review.disclosure.expanded !== "true" || review.disclosure.generatedContent !== "none" || review.disclosure.chevronHidden !== "true" || review.disclosure.transform === "none") {
    errors.push("finish review disclosures should synchronize expanded state while keeping their rotating chevron decorative: " + JSON.stringify(review.disclosure));
  }
  await keyTap(cdp, "KeyO", "o");
  await waitUntil("settings opens above finish review", () => evaluate(cdp, `!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#overlay").hasAttribute("inert")`));
  await evaluate(cdp, `document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }))`);
  const finishOutsideReturn = await waitUntil("outside settings dismissal restores finish focus", () => evaluate(cdp, `(() => {
    const panel = document.querySelector("#settingsPanel");
    const title = document.querySelector("#finishTitle");
    return panel.classList.contains("hidden") && document.activeElement === title ? {
      active: document.activeElement.id,
      overlayInert: document.querySelector("#overlay").hasAttribute("inert")
    } : null;
  })()`));
  if (finishOutsideReturn.active !== "finishTitle" || finishOutsideReturn.overlayInert) {
    errors.push("outside settings dismissal above the finish review should restore focus to the visible modal title: " + JSON.stringify(finishOutsideReturn));
  }
  await tapSelector(cdp, "#restartButton");
  const restartedLifecycle = await waitUntil("finish restart lifecycle cleanup", () => evaluate(cdp, `(() => {
    const overlay = document.querySelector("#overlay");
    const canvas = document.querySelector("#game");
    const clean = overlay.classList.contains("hidden")
      && !overlay.classList.contains("finish-overlay")
      && overlay.hidden
      && overlay.hasAttribute("inert")
      && overlay.getAttribute("aria-hidden") === "true"
      && !overlay.hasAttribute("role")
      && !overlay.hasAttribute("aria-modal")
      && !overlay.hasAttribute("aria-labelledby")
      && document.activeElement === canvas
      && !canvas.hasAttribute("inert")
      && canvas.getAttribute("aria-hidden") === "false";
    return clean ? {
      overlayHidden: overlay.hidden,
      overlayInert: overlay.hasAttribute("inert"),
      active: document.activeElement?.id || "",
      status: document.querySelector("#gameStatus")?.textContent || ""
    } : null;
  })()`));
  if (restartedLifecycle.active !== "game"
    || !restartedLifecycle.overlayHidden
    || !restartedLifecycle.overlayInert
    || !/游戏重开.*第一幕.*先读懂落点/.test(restartedLifecycle.status)) {
    errors.push("finish restart should clear modal semantics and return focus to the second run: " + JSON.stringify(restartedLifecycle));
  }
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
  const gamepadErrorsBeforeThrow = await evaluate(cdp, `window.__earlyRuntimeErrors?.length || window.__summitEarlyRuntimeErrors?.length || 0`);
  await evaluate(cdp, `window.__summitMockPadState.throw = true`);
  await sleep(220);
  await evaluate(cdp, `window.__summitMockPadState.throw = false`);
  const gamepadErrorsAfterThrow = await evaluate(cdp, `window.__earlyRuntimeErrors?.length || window.__summitEarlyRuntimeErrors?.length || 0`);
  if (gamepadErrorsAfterThrow !== gamepadErrorsBeforeThrow) errors.push("a transient getGamepads exception should be treated as disconnected instead of an unhandled runtime error");
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
  while (Date.now() - start < 20000) {
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
    ...(process.platform === "win32" ? ["--no-sandbox"] : []),
    "--disable-breakpad",
    "--disable-crash-reporter",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-extensions",
    "--mute-audio",
    "--noerrdialogs",
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
    await cdp.send("Page.bringToFront");
    await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await cdp.send("Input.setIgnoreInputEvents", { ignore: false });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => {
        window.__summitEarlyRuntimeErrors = [];
        window.addEventListener("error", (event) => {
          window.__summitEarlyRuntimeErrors.push(String(event.message || "unknown boot runtime error"));
        });
        const makeButtons = () => Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
        window.__summitMockPadState = { axes: [0, 0, 0, 0], buttons: makeButtons(), connected: true, mapping: "standard" };
        Object.defineProperty(Navigator.prototype, "getGamepads", {
          configurable: true,
          value() {
            if (window.__summitMockPadState.throw) throw new Error("summit smoke gamepad poll fault");
            return [window.__summitMockPadState];
          }
        });
      })();`
    });

    await runBootFailureSmoke(cdp, baseUrl);
    await runDesktopSmoke(cdp, baseUrl);
    await runChapterTransitionInputSmoke(cdp, baseUrl);
    await runMountainGateLandmarkSmoke(cdp, baseUrl);
    await runOldPeakRelicSmoke(cdp, baseUrl);
    await runWindGorgeCrumbleRippleSmoke(cdp, baseUrl);
    await runSpringApexSmoke(cdp, baseUrl);
    await runGroundRechargeSmoke(cdp, baseUrl);
    await runKeyboardSettingsSmoke(cdp, baseUrl);
    await runAssistModeSmoke(cdp, baseUrl);
    await runPracticeRecommendationIntegrationSmoke(cdp, baseUrl);
    await runResumeSmoke(cdp, baseUrl);
    await runTrainingInterruptionSmoke(cdp, baseUrl);
    await runStorageSmoke(cdp, baseUrl);
    await runSaveArchiveSmoke(cdp, baseUrl);
    await runCanvasDensitySmoke(cdp, baseUrl);
    await runVisualRegressionSmoke(cdp, baseUrl);
    await runRestartSoakSmoke(cdp, baseUrl);
    await runMobileSmoke(cdp, baseUrl);
    await runMobileSafeAreaSmoke(cdp, baseUrl);
    await runMobileLandscapeSmoke(cdp, baseUrl);
    await runGamepadSmoke(cdp, baseUrl);
    await runFreshEntryImmediateSmoke(cdp, baseUrl);
    await runCloudSdkRetrySmoke(cdp, baseUrl);
    await runExpiredAccountHintSmoke(cdp, baseUrl);
    await runAuthenticatedRefreshSmoke(cdp, baseUrl);
    await runAccountRestoreTimeoutSmoke(cdp, baseUrl);
    await runRestrictedSessionStorageAuthSmoke(cdp, baseUrl);
    await runPasswordRecoverySmoke(cdp, baseUrl);
    await runCloudSyncExitGuardSmoke(cdp, baseUrl);
    await runLargeCloudArchiveSmoke(cdp, baseUrl);
    await runCloudLogoutInspectionRaceSmoke(cdp, baseUrl);
    await runCorruptCloudPermissionsSmoke(cdp, baseUrl);
    await runCloudConflictGuardSmoke(cdp, baseUrl);
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
  console.log("Browser smoke passed: desktop interactions, respawn focus recovery, finite/structural runtime self-healing and 16-cycle restart soak, R1 Spark gate-step wake/retry and R2 canonical collision-free respawn plus Relay-bridge wake/cooldown/retry lifecycle, dormant R4 Old Peak Relay relic baseline, R5 Relay relic activation/cooldown/retry lifecycle, R8 five-tile Wind Gorge crumble ripple and retry reset, R10 ordinary-speed spring-apex recognition and retry reset, one-shot hair-independent ground dash recharge, exact-field R7 updraft wake entry/exit, local R9 Echo memory ready/cooldown lifecycle, zero-Lumen Star Summit constellation baseline, bounded chapter-transition inputs with stale expiry and late acceptance, bounded late-input automatic respawn with stale/manual clearing, current-run Lumen finish/report closure and mobile wrapping, restart-symmetric non-blocking first-act framing with immediate entry, full-route Flow evidence isolation, causal Focus import repair, shared start/plan/queue/challenge practice recommendations, partial-summit total-record isolation, value-aware R3 refill with no passive Flow, authored six-relay/three-spring R6 brief, full-route R3 and grounded R7 Practice entries, recovered 18-crumble R9 Echo route, summit reveal final-act evidence/fallback, current-run act evidence and bounded run-report export, settings and finish-review disclosure semantics, finish-modal focus trap and restart lifecycle, 4.5:1 small-text contrast, account form semantics, custom-binding platform preservation, gentle-assist persistence and Flow-record isolation, retryable cloud SDK, expired account hint, authenticated refresh, stalled-session, email-bound restricted-storage OTP, password-recovery, full-size cloud archive, full-field cloud conflict, guarded cloud-exit and stale-inspection isolation, keyboard settings, diagnostics/template snapshot, canvas/movement, direct resume, Route/Feel interruption resume, storage recovery, atomic save rollback, save import/export with preview, invalid import guard, high-DPI canvas density switching, low-performance compositor budget, mobile visual guard, notched safe-area and keyboard-resize fit, mobile portrait/landscape, gamepad deadzone.");
}

main().catch((error) => {
  console.error("Browser smoke failed:");
  console.error("- " + error.message);
  process.exit(1);
});
