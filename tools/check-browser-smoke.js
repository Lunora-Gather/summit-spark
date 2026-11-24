#!/usr/bin/env node
"use strict";

const childProcess = require("child_process");
const http = require("http");
const { launchSafari, startFixture } = require("./safari-smoke-transport.cjs");
const net = require("net");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];
const { checkStorageRecovery } = require("./check-storage-recovery.cjs");
const { routes: oldPeakRoutes, replayOldPeakStyle, checkOldPeakStyleGuidance, checkOldPeakCampHint } = require("./lib/old-peak-style-replay.cjs");

// Preserve the existing account failure/slow-write fixtures while modeling
// staged writes separately from committed state.
const transactionalTablesMockSource = `
window.__summitTransactionalTables = (Base) => class extends Base {
  constructor(...args) {
    super(...args);
    this.transactions = new Map();
    this.revision = 0;
    this.nextTransaction = 0;
    this.committedRow = undefined;
    window.__summitCloudBackend = this;
  }
  setRemote(row) { this.committedRow = row; this.revision += 1; }
  async createTransaction() {
    const $id = String(++this.nextTransaction);
    this.transactions.set($id, {});
    return { $id };
  }
  async upsertRow(payload) {
    const result = await super.upsertRow(payload);
    this.transactions.set(payload.transactionId, { payload, revision: this.revision, result });
    return result;
  }
  async getRow(payload) {
    if (this.committedRow !== undefined) {
      if (!this.committedRow) throw { code: 404 };
      return structuredClone(this.committedRow);
    }
    return super.getRow(payload);
  }
  async updateTransaction({ transactionId, commit }) {
    if (!commit) { this.transactions.delete(transactionId); return {}; }
    const staged = this.transactions.get(transactionId);
    if (staged.revision !== this.revision) throw { code: 409, type: "transaction_conflict" };
    this.setRemote({ ...staged.result, ...staged.payload.data, $updatedAt: new Date().toISOString() });
    return { status: "committed" };
  }
  async deleteTransaction({ transactionId }) { this.transactions.delete(transactionId); }
};`;

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

async function waitForAppReady(browser) {
  await waitUntil("app ready", async () => {
    return browser.evaluate(`document.readyState === "complete" && document.documentElement.classList.contains("app-ready")`);
  }, 7000);
}

let navigationId = 0;

async function navigateApp(browser, baseUrl, label = "app") {
  navigationId += 1;
  const url = `${baseUrl}/?smoke=${navigationId}`;
  await browser.navigate(url);
  await waitUntil(label + " navigation", () => browser.evaluate(`location.href === ${JSON.stringify(url)}`), 7000);
  await waitForAppReady(browser);
}

async function runSummitCollection(browser, upstream) {
  const {collectorRoute, installCollectionClock, startCollectionReplay} = require("./lib/summit-collection-replay.cjs");
  const fixture = await startFixture(upstream);
  fixture.scripts.set("collection-clock", "(" + installCollectionClock.toString() + ")();");
  try {
    await navigateApp(browser, fixture.url, "fresh summit collection");
    await browser.evaluate("stepCollectionFrame()");
    await clickSelector(browser, "#guestEntryButton");
    await browser.evaluate("(" + startCollectionReplay.toString() + ")(" + JSON.stringify(collectorRoute) + ")");
    // Bound the work per script call on the slower hosted Mac display.
    for (let frames = 0; frames < 6000; frames += 48) {
      const result = await browser.evaluate("runCollectionBatch(48)");
      if (result) {
        console.log("Safari summit collection " + JSON.stringify(result));
        return;
      }
    }
    throw Error("Summit collection exceeded its frame limit");
  } finally {
    await fixture.close();
  }
}

async function runLightStepSmoke(browser, upstream) {
  // Expose observations only in this local test response. Use normal key events
  // and the game's full frame loop from each authored room entrance.
  function checkMissedPair(knownId) {
    jumpToRoom(9);
    collected.add(knownId);
    runRoomTimes[1] = 6;
    showFinishOverlay(false, false, true);
    const find = overlay.querySelector("[data-find-lumens]");
    if (!find?.textContent.includes("R2 寻光练习")) throw Error("Missing the R2 free practice action");
    find.click();
    const available = () => room.entities.lumens.filter(lumen => !lumen.taken).map(lumen => lumen.id);
    const target = available();
    const touch = id => {
      const item = room.entities.lumens.find(lumen => lumen.id === id);
      player.x = item.x - player.w / 2;
      player.y = item.y - player.h / 2;
      updateEntities(0, { x: 0, y: 0 });
    };
    if (roomIndex !== 1 || activeDrill || runStartedAsFullRoute || target.length !== 1 || target[0] === knownId || collected.size) {
      throw Error("R2 must offer only the missed pickup and start its own unscored run");
    }
    const originalText = ctx.fillText;
    const routeCards = [];
    ctx.fillText = function(text, ...rest) {
      if (this.globalAlpha > 0.01 && /下一房|待练/.test(text)) routeCards.push(text);
      return originalText.call(this, text, ...rest);
    };
    try {
      for (let tick = 0; tick < 150; tick++) frame(lastTime + 1000 / 60);
    } finally {
      ctx.fillText = originalText;
    }
    if (!gameTipVisible("lumen") || routeCards.length) throw Error("Route advice covered the free search directions");
    touch(knownId);
    if (collected.size) throw Error("The previous pickup awarded credit twice");
    touch(target[0]);
    if (collected.size !== 1 || !collected.has(target[0])) throw Error("The missed pickup did not count");
    respawn();
    if (collected.size || available().join() !== target[0]) throw Error("A death restored the wrong pickup");
    restartCurrentRoom();
    if (collected.size || available().join() !== target[0]) throw Error("Room restart restored the wrong pickup");
    touch(target[0]);
    player.x = roomWorldWidth() + 4;
    resolveRoomTransition();
    if (roomIndex !== 2 || available().length !== 2 || !collected.has(target[0])) throw Error("The next room lost its normal pickup rules");
    hardReset();
    if (!runStartedAsFullRoute || parseRoom(1).entities.lumens.some(item => item.taken) || collected.size) {
      throw Error("A new full climb inherited this hunt");
    }
    return true;
  }
  function replay(index, jumpFrames, dashFrames, stop, limit, style = false) {
    if (style) startRoomDrill(index, "style");
    else jumpToRoom(index);
    const attempt = room;
    const winsBefore = drillContractStats(index, "style").wins;
    const tick = () => frame(lastTime + 1000 / 60);
    const bindings = effectiveBindings();
    const key = (action, down) => window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", {
      code: bindings[action], bubbles: true, cancelable: true
    }));
    tick();
    const shelf = room.lightStep;
    const observed = new Set();
    key("right", true);
    for (let n = 0; n < limit && room === attempt && !deathCount; n++) {
      if (jumpFrames.includes(n)) key("jump", true);
      if (jumpFrames.includes(n - 10)) key("jump", false);
      if (dashFrames.includes(n)) key("dash", true);
      if (dashFrames.includes(n - 2)) key("dash", false);
      if (n === stop) key("right", false);
      tick();
      if (roomIndex === index) {
        for (const [name, used] of Object.entries(roomTech)) if (used) observed.add(name);
      }
    }
    for (const action of ["right", "jump", "dash"]) key(action, false);
    return { room: roomIndex, lit: shelf.ring.awakened, landed: shelf.landed, deaths: deathCount, tech: [...observed],
      distinctRelays: attempt.entities.relays.filter(relay => relay.awakened).length,
      styleWins: drillContractStats(index, "style").wins - winsBefore };
  }
  function checkRunChain() {
    hardReset();
    for (let i = 0; i < 3; i++) scoreRelayChain();
    quickRetry();
    const afterRetry = [bestRelayChain, relayChain];
    jumpToRoom(1);
    const afterPracticeStart = bestRelayChain;
    scoreRelayChain();
    hardReset();
    return { afterRetry, afterPracticeStart, afterNewRun: bestRelayChain };
  }
  function checkChapterClock(index, origin, hz) {
    jumpToRoom(index - 1);
    lastTime = origin;
    physicsAccumulator = 0;
    player.x = roomWorldWidth() + 4;
    const tick = seconds => frame(lastTime + seconds * 1000);
    tick(1 / 60); // The first physics tick crosses the boundary, the second belongs to the new chapter.
    const initial = chapterTransitionTicks;
    const introAtEntry = roomIntroTimer;
    const startX = player.x;
    const entered = roomIndex === index && roomTime === 0;
    focusPaused = true;
    tick(.1);
    const frozen = chapterTransitionTicks === initial && roomTime === 0;
    focusPaused = false;
    // Stop at the last display frame with at least one locked simulation tick remaining.
    const frames = Math.ceil(initial * hz / 120) - 1;
    const seenChapters = new Set();
    let mixedTitles = false;
    let frameTitles = [];
    const paint = ctx.fillText;
    ctx.fillText = function(text, ...args) {
      if (/^第[一二三四]幕 ·/.test(text) && this.globalAlpha > 0.01) frameTitles.push(text);
      return paint.call(this, text, ...args);
    };
    try {
      for (let i = 0; i < frames; i++) {
        frameTitles = [];
        tick(1 / hz);
        for (const title of frameTitles) seenChapters.add(title);
        if (frameTitles.length > 1) mixedTitles = true;
      }
    } finally {
      ctx.fillText = paint;
    }
    const left = chapterTransitionTicks;
    const stayed = player.x === startX && roomTime === 0;
    // Finish the lock, then advance exactly two ticks. A half-step must stay in the accumulator.
    tick(left / 120 - physicsAccumulator);
    const atBoundary = chapterTransitionTicks === 0 && roomTime === 0;
    const introPreserved = roomIntroTimer === introAtEntry && roomIntroTimer > 1;
    tick(1 / 240);
    const half = roomTime;
    tick(1 / 240);
    tick(1 / 120);
    return { entered, initial, frozen, left, stayed, atBoundary, introPreserved, mixedTitles, titles: [...seenChapters], half, playable: roomTime };
  }
  function checkJumpRelease() {
    jumpToRoom(0);
    const tick = () => frame(lastTime + 1000 / 60);
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, {
      code: effectiveBindings().jump, bubbles: true
    }));
    for (let i = 0; i < 4; i++) tick();
    key("keydown");
    for (let i = 0; i < 4; i++) tick();
    const rising = player.vy;
    const button = document.querySelector('[data-touch="jump"]');
    const touch = (type) => button.dispatchEvent(new PointerEvent(type, {
      pointerId: 23, pointerType: "touch", bubbles: true, cancelable: true
    }));
    touch("pointerdown");
    key("keyup");
    const stillHolding = player.vy;
    touch("pointerup");
    const released = player.vy;
    key("keyup");
    return {rising, stillHolding, released, afterStrayRelease: player.vy};
  }
  function checkRecallInput(source, action) {
    jumpToRoom(8);
    const tick = () => frame(lastTime + 1000 / 120);
    const key = (name, down) => window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", {
      code: effectiveBindings()[name], bubbles: true, cancelable: true
    }));
    key("right", true);
    for (let i = 0; i < 80 && !echoAnchor; i++) tick();
    key("right", false);
    if (!echoAnchor) throw new Error("Did not reach the R9 entry anchor");
    key("recall", true);
    key("recall", false);
    if (hitStopTimer <= 1 / 120) throw new Error("Recall did not start its impact pause");
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const button = buttons[action === "jump" ? 0 : 1];
    const previous = Object.getOwnPropertyDescriptor(navigator, "getGamepads");
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [{ connected: true, axes: [0, 0], buttons }] });
    try {
      const tap = down => source === "keyboard" ? key(action, down) : Object.assign(button, { pressed: down, value: down ? 1 : 0 });
      tap(true); tick();
      tap(false); tick();
      const buffered = hasInputBuffer(player, action);
      // The recalled player can settle on the ledge one step after time resumes.
      for (let i = 0; i < 6; i++) {
        tick();
        if (action === "jump" ? player.vy < -200 : player.dashTimer > 0) return { buffered, performed: true };
      }
      return { buffered, performed: false };
    } finally {
      if (previous) Object.defineProperty(navigator, "getGamepads", previous);
      else delete navigator.getGamepads;
    }
  }
  const fixture = await startFixture(upstream);
  const file = "/summit-spark.js";
  const original = require("node:fs").readFileSync(path.join(root, "public", file.slice(1)), "utf8");
  const instrumented = original.replace("  function update(dt, clockDt = dt) {",
    "  window.checkMissedPair = " + checkMissedPair.toString() + ";\n" +
    "  window.replayOldPeakStyle = " + replayOldPeakStyle.toString() + ";\n" +
    "  window.checkOldPeakStyleGuidance = " + checkOldPeakStyleGuidance.toString() + ";\n" +
    "  window.checkOldPeakCampHint = " + checkOldPeakCampHint.toString() + ";\n" +
    "  window.replayLightStep = " + replay.toString() + ";\n  window.checkRunChain = " + checkRunChain.toString() +
    ";\n  window.checkChapterClock = " + checkChapterClock.toString() + ";\n  window.checkJumpRelease = " + checkJumpRelease.toString() +
    ";\n  window.checkRecallInput = " + checkRecallInput.toString() + ";\n  function update(dt, clockDt = dt) {");
  fixture.routes.set(file, (_request, response) => response.writeHead(200, {
    "Content-Type": "application/javascript", "Cache-Control": "no-store"
  }).end(instrumented));
  try {
    await navigateApp(browser, fixture.url, "light-step crossings");
    const crossings = await browser.evaluate(`(() => {
      document.querySelector("#guestEntryButton").click();
      const hops = (first, spacing) => Array.from({length: 12}, (_, i) => first + i * spacing);
      return [
        replayLightStep(1, [14], [31, 56], 82, 96),
        replayLightStep(3, hops(60, 72), [19, 32], -1, 620),
        replayLightStep(5, hops(90, 54), [], -1, 620)
      ];
    })()`);
    if (crossings.some(row => !row.lit || !row.landed || row.deaths) ||
      crossings[1].room !== 4 || !crossings[1].tech.includes("gate") ||
      crossings[2].room !== 6 || !crossings[2].tech.includes("spring")) {
      errors.push("the bridge, gold gate and spring entrances should lead onto usable light steps: " + JSON.stringify(crossings));
    }
    for (const [route, keys] of Object.entries(oldPeakRoutes)) {
      const result = await browser.evaluate(`replayOldPeakStyle(${JSON.stringify(keys)})`);
      const complete = route === "complete";
      const shortcut = route === "shortcut";
      if (result.deaths || result.elapsed <= 0 || result.elapsed >= 35 || !result.gate || !result.apex || !result.nearPhase
        || result.relays !== (shortcut ? 1 : 6) || result.springs !== (shortcut ? 1 : 3)
        || result.landed !== (complete || shortcut) || result.earlyLanding !== (route === "earlyLanding")
        || result.wins !== Number(complete) || result.retries !== Number(!complete) || result.nextRoom !== (complete ? 7 : 6)
        || (complete && !result.progress.includes("前往出口"))
        || (!complete && !result.nextProgress.includes("光继 0/6 · 弹簧 0/3"))
        || (shortcut && !result.feedback.includes("光继 1/6、弹簧 1/3"))
        || (!complete && !shortcut && !result.feedback.includes("落上相位台"))) {
        errors.push(`R6 Style ${route} should distinguish unique devices and the order of landings: ${JSON.stringify(result)}`);
      }
    }
    await browser.evaluate("checkOldPeakStyleGuidance()");
    await browser.evaluate("checkOldPeakCampHint()");
    const jump = await browser.evaluate("checkJumpRelease()");
    if (!(jump.rising < -120 && jump.stillHolding === jump.rising &&
      jump.released > jump.rising && jump.released < 0 && jump.afterStrayRelease === jump.released)) {
      errors.push("only releasing the last held jump should shorten an ascent: " + JSON.stringify(jump));
    }
    for (const source of ["keyboard", "gamepad"]) {
      for (const action of ["jump", "dash"]) {
        const result = await browser.evaluate(`checkRecallInput("${source}", "${action}")`);
        if (!result.buffered || !result.performed) errors.push(`${source} ${action} tapped during recall should execute after hitstop: ${JSON.stringify(result)}`);
      }
    }
    const chain = await browser.evaluate("checkRunChain()");
    const [oneRing, twoRings] = await browser.evaluate(`[
      replayLightStep(1, [14,86,158], [31,56], -1, 350, true),
      replayLightStep(1, [14,119], [31,56,119], -1, 350, true)
    ]`);
    if (oneRing.room !== 1 || oneRing.deaths || oneRing.distinctRelays !== 1 || oneRing.styleWins !== 0 ||
        twoRings.room !== 2 || twoRings.deaths || twoRings.distinctRelays !== 2 || twoRings.styleWins !== 1) {
      errors.push("R2 Style must award a clean landing between distinct rings: " + JSON.stringify({oneRing, twoRings}));
    }
    if (chain.afterRetry[0] !== 3 || chain.afterRetry[1] !== 0 || chain.afterPracticeStart !== 0 || chain.afterNewRun !== 0) {
      errors.push("relay peak should survive room retries and clear for a new run or practice session: " + JSON.stringify(chain));
    }
    for (const id of ["1:17:2", "1:15:7"]) {
      await browser.evaluate(`checkMissedPair(${JSON.stringify(id)})`);
    }
    const locked = await browser.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches ? 144 : 216");
    for (const [index, origin, hz] of [[3,100,60], [3,65536,60], [6,65536,120], [8,65536,240]]) {
      const clock = await browser.evaluate(`checkChapterClock(${index},${origin},${hz})`);
      if (!clock.entered || clock.initial !== locked - 1 || !clock.frozen || clock.left !== 1 ||
          !clock.stayed || !clock.atBoundary || !clock.introPreserved || clock.mixedTitles || clock.titles.length !== 2 ||
          clock.half !== 0 || Math.abs(clock.playable - 1 / 60) > 1e-9) {
        errors.push(`R${index + 1} chapter lock at ${hz}Hz miscounted a boundary step: ` + JSON.stringify(clock));
      }
    }
  } finally {
    await fixture.close();
  }
}

async function runBootFailureSmoke(browser, baseUrl) {
  navigationId += 1;
  const url = `${baseUrl}/?smoke=${navigationId}&boot-fault=1`;
  await browser.navigate(url);
  await waitUntil("boot failure navigation", () => browser.evaluate(`location.href === ${JSON.stringify(url)}`), 7000);
  const state = await waitUntil("boot failure recovery surface", () => browser.evaluate(`(() => {
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

async function targetPoint(browser, selector) {
  let lastProbe = null;
  const rect = await waitUntil("click target " + selector, async () => {
    lastProbe = await browser.evaluate(`(() => {
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

async function clickSelector(browser, selector) {
  await targetPoint(browser, selector);
  await browser.clickElement(selector);
}

async function clickPoint(browser, x, y) {
  await browser.clickAt(x, y);
}

async function tapSelector(browser, selector) {
  const rect = await targetPoint(browser, selector);
  await tapPoint(browser, rect.inputX, rect.inputY);
}

async function tapPoint(browser, x, y) {
  await browser.touchDown({x, y});
  await browser.touchUp();
  await sleep(80);
}

async function openSettingsGroup(browser, selector) {
  await browser.evaluate(`(() => {
    const group = document.querySelector(${JSON.stringify(selector)});
    if (group) group.open = true;
  })()`);
  await sleep(120);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function keyDown(browser, code, key) {
  await browser.keyDown(code, key);
}

async function keyUp(browser, code, key) {
  await browser.keyUp(code, key);
}

async function keyTap(browser, code, key) {
  await keyDown(browser, code, key);
  await keyUp(browser, code, key);
}

async function keyHold(browser, code, key, ms = 300) {
  await keyDown(browser, code, key);
  await sleep(ms);
  await keyUp(browser, code, key);
}

async function windowKeyHold(browser, code, key, ms = 300) {
  await browser.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key)}, bubbles: true }))`);
  await sleep(ms);
  await browser.evaluate(`window.dispatchEvent(new KeyboardEvent("keyup", { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key)}, bubbles: true }))`);
  await sleep(80);
}

async function canvasInkSummary(browser) {
  return browser.evaluate(`(() => {
    const canvas = document.querySelector("#game");
    const sample = document.createElement("canvas");
    sample.width = Math.min(256, canvas.width);
    sample.height = Math.max(1, Math.round(canvas.height * sample.width / canvas.width));
    const context = sample.getContext("2d", { willReadFrequently: true });
    const { width, height } = sample;
    context.drawImage(canvas, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;
    const first = [data[0], data[1], data[2], data[3]];
    let varied = 0;
    let bright = 0;
    let samples = 0;
    const step = Math.max(1, Math.floor(Math.min(width, height) / 32));
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

async function enableDebugPanel(browser) {
  await browser.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "F3", key: "F3", bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "F3", key: "F3", bubbles: true }));
  })()`);
  await waitUntil("debug panel visible", () => browser.evaluate(`!document.querySelector("#debugPanel").classList.contains("hidden") && /pos /.test(document.querySelector("#debugPanel").textContent)`), 2500);
}

async function debugPosition(browser) {
  const pos = await waitUntil("debug position", () => browser.evaluate(`(() => {
    const match = document.querySelector("#debugPanel").textContent.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    return match ? { x: Number(match[1]), y: Number(match[2]), text: document.querySelector("#debugPanel").textContent } : null;
  })()`), 2500);
  return pos;
}

function visibleStartSelector(browser) {
  return browser.evaluate(`document.querySelector("#entryGate").classList.contains("hidden") ? "#startButton" : "#guestEntryButton"`);
}

async function clearGuestProgress(browser) {
  await browser.evaluate(`(() => {
    sessionStorage.removeItem("summit-spark-entry-mode");
    for (const key of ["account-hint", "best-time", "room-bests", "room-focus"]) localStorage.removeItem("summit-spark-" + key);
  })()`);
}

async function runMenuScaleSmoke(browser, baseUrl) {
  const samples = [];
  for (const [width, height] of [[960, 640], [1920, 1080]]) {
    await browser.setViewport(width, height);
    await navigateApp(browser, baseUrl, 'menu scale ' + width);
    if (await browser.evaluate('!document.querySelector("#entryGate").classList.contains("hidden")')) {
      await clickSelector(browser, "#guestEntryButton");
      await waitUntil("new guest is playing", () => browser.evaluate('document.querySelector("#overlay").hidden'));
      await navigateApp(browser, baseUrl, "returning guest menu");
    }
    await waitUntil("menu start is visible", () => browser.evaluate('document.querySelector("#startButton").getBoundingClientRect().width > 0'));
    samples.push(await browser.evaluate(`(() => {
      const stage = document.querySelector('.stage').getBoundingClientRect();
      const button = document.querySelector('#startButton').getBoundingClientRect();
      const title = document.querySelector('#startPanel h1').getBoundingClientRect();
      return { width: button.width, ratio: button.width / stage.width, fits: title.left >= stage.left && title.right <= stage.right };
    })()`));
  }
  if (samples.some(s => s.width < 298 || s.width > 402 || s.ratio < 0.25 || s.ratio > 0.35 || !s.fits)
    || samples[1].width - samples[0].width < 70) errors.push('menu proportions should adapt to the game frame instead of remaining a fixed 320px: ' + JSON.stringify(samples));
  await browser.setViewport(1280, 720);
}

async function runBackwardTransitionSmoke(browser, baseUrl) {
  await browser.setViewport(1280, 720);
  await navigateApp(browser, baseUrl, "backward transition");
  await clickSelector(browser, await visibleStartSelector(browser));
  await waitUntil("backward transition starts", () => browser.evaluate(`document.querySelector("#overlay").classList.contains("hidden")`));
  await enableDebugPanel(browser);

  // R2 -> R1 exercises the same-act path. The local-only probe seeds a
  // previous-room Lumen and an already-faulted current attempt, then crosses
  // the actual left boundary on the next update.
  await keyTap(browser, "Digit2", "2");
  await waitUntil("backward probe reaches R2", () => browser.evaluate(`/room 2\\/10/.test(document.querySelector("#debugPanel").textContent)`));
  await browser.evaluate(`window.dispatchEvent(new CustomEvent("summit-spark:test-action", { detail: "prepareBackwardTransition" }))`);
  const sameAct = await waitUntil("backward R2 transition restores clean and carried Lumen", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /room 1\\/10/.test(text) && /attempt clean 1/.test(text) && /carry 1/.test(text) && /lumen 1\\//.test(text) && /drill 0/.test(text)
      ? { text }
      : null;
  })()`), 3000, 20);
  const sameActStatus = await browser.evaluate(`document.querySelector("#gameStatus")?.textContent || ""`);
  if (!/attempt clean 1/.test(sameAct.text) || !/carry 1/.test(sameAct.text) || !/drill 0/.test(sameAct.text) || !/已回退 · 本房 Drill 已暂停/.test(sameActStatus)) {
    errors.push("backward same-act transition should re-arm Clean, preserve banked Lumen and leave room training cleanly: " + JSON.stringify({ text: sameAct.text, status: sameActStatus }));
  }

  // A checkpoint retry on the exit shelf must still be a partial visit.
  await keyTap(browser, "KeyR", "r");
  const readRecords = `(() => {
    const focus = JSON.parse(localStorage.getItem("summit-spark-room-focus") || "{}").rooms?.[0];
    return JSON.stringify([
      localStorage.getItem("summit-spark-room-bests"), localStorage.getItem("summit-spark-room-paths"),
      focus?.clears || 0, focus?.clean || 0
    ]);
  })()`;
  const beforeRecross = await browser.evaluate(readRecords);
  await keyDown(browser, "KeyD", "d");
  try {
    await waitUntil("walk back into R2 from the exit shelf", () =>
      browser.evaluate(`document.querySelector("#debugPanel").textContent.includes("room 2/10")`), 6000, 40);
  } finally {
    await keyUp(browser, "KeyD", "d");
  }
  if (await browser.evaluate(readRecords) !== beforeRecross) {
    errors.push("returning across the exit after a checkpoint retry changed a PB, replay or clear count");
  }

  // Turning back at the pass or immediately re-entering must keep the player moving.
  await keyTap(browser, "Digit4", "4");
  await waitUntil("backward probe reaches R4", () => browser.evaluate(`/room 4\\/10/.test(document.querySelector("#debugPanel").textContent)`));
  await browser.evaluate(`window.dispatchEvent(new CustomEvent("summit-spark:test-action", { detail: "prepareBackwardTransition" }))`);
  const firstRoomFrame = room => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return text.includes("room ${room}/10") ? { text } : null;
  })()`);
  const actBoundary = await waitUntil("walk back into the preceding act", () => firstRoomFrame(3), 3500, 20);
  if (!/act 0\.000/.test(actBoundary.text) || !/attempt clean 1/.test(actBoundary.text)) {
    errors.push("backward chapter crossing should preserve control and a fresh Clean attempt: " + actBoundary.text);
  }
  await keyDown(browser, "KeyD", "d");
  try {
    const reentry = await waitUntil("re-enter the introduced act", () => firstRoomFrame(4), 3000, 20);
    if (!/act 0\.000/.test(reentry.text)) {
      errors.push("returning to an introduced chapter should keep control: " + reentry.text);
    }
  } finally {
    await keyUp(browser, "KeyD", "d");
  }
}

async function checkReducedMotion(browser) {
  const reducedMotionState = await waitUntil("reduced motion preference", () => browser.evaluate(`(() => {
    const stage = document.querySelector(".stage");
    const canvas = document.querySelector("#game");
    return stage.classList.contains("reduced-motion")
      ? { matches: matchMedia("(prefers-reduced-motion: reduce)").matches, stageClass: true, canvasTransition: getComputedStyle(canvas).transitionDuration, transitionSeconds: parseFloat(getComputedStyle(canvas).transitionDuration) }
      : null;
  })()`));
  if (!reducedMotionState.matches || !reducedMotionState.stageClass || !Number.isFinite(reducedMotionState.transitionSeconds) || reducedMotionState.transitionSeconds > 0.001) {
    errors.push("system reduced-motion preference should quiet both UI transitions and nonessential canvas ambience: " + JSON.stringify(reducedMotionState));
  }
}

async function runDesktopSmoke(browser, baseUrl) {
  await browser.setViewport(1280, 720);
  await navigateApp(browser, baseUrl, "desktop smoke");
  const bootRuntimeErrors = await browser.evaluate(`window.__summitEarlyRuntimeErrors || []`);
  if (bootRuntimeErrors.length) throw new Error("runtime error during boot: " + JSON.stringify(bootRuntimeErrors));
  await waitUntil("entry chooser after session check", () => browser.evaluate(`(() => {
    const gate = document.querySelector("#entryGate");
    const guest = document.querySelector("#guestEntryButton");
    return !!gate
      && !gate.classList.contains("hidden")
      && !document.querySelector("#overlay")?.classList.contains("entry-checking")
      && document.activeElement === guest;
  })()`), 7000);
  const entryChoice = await browser.evaluate(`(() => {
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
    const guestFocusStyle = getComputedStyle(guest);
    const contrastSamples = [
      // Guest uses a light-to-gold gradient; the gold endpoint is the lower
      // contrast bound. Account uses an opaque computed mist fill.
      ["guest detail", guest?.querySelector("small"), "rgb(230, 191, 103)"],
      ["account detail", account?.querySelector("small"), getComputedStyle(account).backgroundColor]
    ].map(([label, element, background]) => ({ label, ratio: Number(contrast(element, background).toFixed(2)) }));
    return {
      visible: !!gate && gateRect.width > 0 && gateRect.height > 0,
      guest: guest?.textContent || "",
      account: account?.textContent || "",
      startPending: document.querySelector("#startPanel")?.classList.contains("entry-pending") || false,
      fits: !!gateRect && gateRect.left >= 0 && gateRect.right <= innerWidth && gateRect.bottom <= innerHeight,
      guestFocused: document.activeElement === guest,
      focusOutlineWidth: guestFocusStyle.outlineWidth,
      focusOutlineStyle: guestFocusStyle.outlineStyle,
      focusOutlineOffset: guestFocusStyle.outlineOffset,
      focusShadow: guestFocusStyle.boxShadow,
      focusOutlineColor: guestFocusStyle.outlineColor,
      contrastSamples
    };
  })()`);
  const startupVisual = await browser.evaluate(`(() => {
    const overlay = document.querySelector("#overlay");
    const style = getComputedStyle(overlay);
    const title = document.querySelector("#entryGate h1");
    const gate = document.querySelector("#entryGate");
    const gateStyle = getComputedStyle(gate);
    return {
      backgroundImage: style.backgroundImage,
      titleReadableWidth: Math.round(title?.getBoundingClientRect().width || 0),
      gateWidth: Math.round(gate?.getBoundingClientRect().width || 0),
      gateHeight: Math.round(gate?.getBoundingClientRect().height || 0),
      gateBackgroundColor: gateStyle.backgroundColor,
      gateShadow: gateStyle.boxShadow,
      title: title.textContent,
      titleStyle: [getComputedStyle(title).fontSize, getComputedStyle(title).color, getComputedStyle(title).textShadow],
      guestStyle: [getComputedStyle(document.querySelector('#guestEntryButton')).borderRadius, getComputedStyle(document.querySelector('#guestEntryButton')).backgroundImage]
    };
  })()`);
  if (
    !entryChoice.visible
    || !entryChoice.startPending
    || !entryChoice.fits
    || !entryChoice.guestFocused
    || entryChoice.focusOutlineStyle !== 'none'
    || entryChoice.focusShadow !== 'none'
    || /rgb\(0, 0, 0\)/.test(entryChoice.focusOutlineColor)
    || !/开始攀登/.test(entryChoice.guest) || !/仅保存在此设备/.test(entryChoice.guest)
    || !/云端保存/.test(entryChoice.account)
  ) {
    errors.push("entry should clearly offer adaptive guest and cloud-save choices: " + JSON.stringify(entryChoice));
  }
  if (entryChoice.contrastSamples.some((sample) => sample.ratio < 4.5)) {
    errors.push("small entry text should retain at least 4.5:1 contrast: " + JSON.stringify(entryChoice.contrastSamples));
  }
  await keyTap(browser, 'Tab', 'Tab');
  const keyboardEntry = await browser.evaluate(`(() => {
    const focused = document.activeElement;
    const style = getComputedStyle(focused);
    return { active: focused.id, outline: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset), shadow: style.boxShadow };
  })()`);
  if (keyboardEntry.active !== 'accountEntryButton' || keyboardEntry.outline < 2 || keyboardEntry.offset >= 0 || keyboardEntry.shadow !== 'none') {
    errors.push('first-run entry should hide automatic focus decoration but retain an inset keyboard focus indicator: ' + JSON.stringify(keyboardEntry));
  }
  if (!startupVisual.backgroundImage.includes("radial-gradient")
    || !startupVisual.backgroundImage.includes("assets/moonlit-pass.jpg")
    || startupVisual.titleReadableWidth < 180
    || startupVisual.gateWidth < 300
    || startupVisual.gateHeight < 180
    || startupVisual.title !== "山巅微光"
    || startupVisual.gateBackgroundColor !== "rgba(0, 0, 0, 0)"
    || startupVisual.gateShadow !== "none") {
    errors.push("startup choice should keep a quiet visual center and a substantial readable entry surface: " + JSON.stringify(startupVisual));
  }
  const immediateAccountOpen = await browser.evaluate(`(() => {
    const panel = document.querySelector("#settingsPanel");
    const account = document.querySelector("#accountEntryButton");
    // Safari pointer activation can leave focus on the primary start button.
    document.querySelector("#guestEntryButton").focus({ preventScroll: true });
    account.click();
    const opened = !panel.classList.contains("hidden") && !panel.hasAttribute("inert");
    const startPanel = document.querySelector("#startPanel");
    const panelRect = panel.getBoundingClientRect();
    const overlayRect = document.querySelector("#overlay").getBoundingClientRect();
    const formRect = document.querySelector('.account-body').getBoundingClientRect();
    const headingRect = document.querySelector('#panelTitle').getBoundingClientRect();
    window.__summitAccountTypography = {
      label: Number.parseFloat(getComputedStyle(document.querySelector("#accountEmailField > span")).fontSize),
      note: Number.parseFloat(getComputedStyle(document.querySelector("#accountNote")).fontSize),
      status: Number.parseFloat(getComputedStyle(document.querySelector("#accountStatus")).fontSize),
      input: Number.parseFloat(getComputedStyle(document.querySelector("#accountEmail")).fontSize),
      panel: {
        left: Math.round(panelRect.left),
        right: Math.round(panelRect.right),
        top: Math.round(panelRect.top),
        bottom: Math.round(panelRect.bottom),
        width: Math.round(panelRect.width),
        radius: parseFloat(getComputedStyle(panel).borderTopLeftRadius),
        backgroundColor: getComputedStyle(panel).backgroundColor,
        accountSurface: {
          backgroundColor: getComputedStyle(document.querySelector(".settings-group-account")).backgroundColor,
          boxShadow: getComputedStyle(document.querySelector(".settings-group-account")).boxShadow,
          sideHidden: getComputedStyle(document.querySelector('.settings-column-side')).display === 'none',
          leftGap: formRect.left - panelRect.left,
          rightGap: panelRect.right - formRect.right,
          titleAligned: Math.abs(headingRect.left - formRect.left) < 2
        },
        centered: Math.abs((panelRect.left + panelRect.right) / 2 - (overlayRect.left + overlayRect.right) / 2) < 3
      },
      launchMenuHidden: getComputedStyle(startPanel).visibility === "hidden"
    };
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    return opened;
  })()`);
  if (!immediateAccountOpen) errors.push("entry account drawer should become interactive before an immediate outside dismissal");
  const accountTypography = await browser.evaluate(`window.__summitAccountTypography || {}`);
  if (accountTypography.label < 12 || accountTypography.note < 12 || accountTypography.status < 12 || accountTypography.input < 14) {
    errors.push("account entry typography should remain readable on large and small surfaces: " + JSON.stringify(accountTypography));
  }
  if (!accountTypography.launchMenuHidden || !accountTypography.panel?.centered) {
    errors.push("startup account entry should retire the launch menu and center the focused account sheet: " + JSON.stringify(accountTypography));
  }
  if (
    !/^rgba?\(0, 0, 0(?:, 0)?\)$/.test(accountTypography.panel?.accountSurface?.backgroundColor || "")
    || accountTypography.panel?.accountSurface?.boxShadow !== "none"
    || !accountTypography.panel?.accountSurface?.sideHidden
    || !accountTypography.panel?.accountSurface?.titleAligned
    || Math.abs(accountTypography.panel.accountSurface.leftGap - accountTypography.panel.accountSurface.rightGap) > 2
  ) {
    errors.push("focused account form should use equal gutters, one surface and no empty side-column divider: " + JSON.stringify(accountTypography.panel));
  }
  const entryAccountOutsideReturn = await waitUntil("immediate outside account dismissal restores entry trigger", () => browser.evaluate(`(() => {
    const panel = document.querySelector("#settingsPanel");
    const account = document.querySelector("#accountEntryButton");
    return panel.classList.contains("hidden") && panel.hasAttribute("inert") && document.activeElement === account
      ? { active: document.activeElement.id, visible: account.getClientRects().length > 0, inert: panel.hasAttribute("inert") }
      : null;
  })()`), 2500);
  await sleep(80);
  const delayedAccountFocus = await browser.evaluate(`document.activeElement?.id || ""`);
  if (entryAccountOutsideReturn.active !== "accountEntryButton" || !entryAccountOutsideReturn.visible || !entryAccountOutsideReturn.inert || delayedAccountFocus !== "accountEntryButton") {
    errors.push("immediate outside account dismissal should stay on its visible entry trigger after delayed focus work: " + JSON.stringify({ entryAccountOutsideReturn, delayedAccountFocus }));
  }
  await clickSelector(browser, "#guestEntryButton");
  await waitUntil("one guest click starts R1", () => browser.evaluate(`document.querySelector("#overlay").hidden && document.activeElement.id === "game" && document.querySelector("#roomCount").textContent.startsWith("R1/")`));
  await navigateApp(browser, baseUrl, "returning guest launch menu");
  await waitUntil("remembered guest has the menu", () => browser.evaluate(`!document.querySelector("#overlay").hidden && document.querySelector("#startButton").getBoundingClientRect().width > 0`));
  const menuStyle = await browser.evaluate(`(() => {
    const title = getComputedStyle(document.querySelector('#startPanel h1'));
    const primary = getComputedStyle(document.querySelector('#startButton'));
    return { titleStyle: [title.fontSize, title.color, title.textShadow], guestStyle: [primary.borderRadius, primary.backgroundImage] };
  })()`);
  if (JSON.stringify(menuStyle.titleStyle) !== JSON.stringify(startupVisual.titleStyle)
    || JSON.stringify(menuStyle.guestStyle) !== JSON.stringify(startupVisual.guestStyle)) {
    errors.push('entry and main menu must share the actual title and primary-button design: ' + JSON.stringify({ startupVisual, menuStyle }));
  }
  await waitUntil("default system motion", () => browser.evaluate(`!matchMedia("(prefers-reduced-motion: reduce)").matches
    && !document.querySelector(".stage").classList.contains("reduced-motion")`));
  const initial = await browser.evaluate(`({
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

  await clickSelector(browser, "#startButton");
  await waitUntil("start button begins game with first-act framing", () => browser.evaluate(`document.querySelector("#overlay").classList.contains("hidden") && /游戏开始.*第一幕.*先读懂落点/.test(document.querySelector("#gameStatus").textContent)`));
  const quietHud = await browser.evaluate(`(() => {
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
  await clickSelector(browser, "#settingsButton");
  await waitUntil("settings open after start", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings") && document.querySelector("#gameHud").hasAttribute("inert") && document.querySelector("#game").tabIndex === -1`));
  const refinedSettings = await browser.evaluate(`(() => {
    const panel = document.querySelector('#settingsPanel').getBoundingClientRect();
    const rows = [...document.querySelectorAll('.settings-only > summary')].filter(e => e.getBoundingClientRect().height > 0);
    const sliders = [...document.querySelectorAll('.settings-only input[type="range"]')];
    const readings = sliders.map(slider => ({ value: slider.parentElement.querySelector('.range-value')?.textContent,
      spoken: slider.getAttribute('aria-valuetext'), number: Number(slider.value) }));
    return { width: panel.width, height: panel.height,
      quietRows: rows.length === 5 && rows.every(row => getComputedStyle(row.parentElement).boxShadow === 'none'),
      icons: rows.every(row => row.querySelector('svg[aria-hidden="true"]')?.getBoundingClientRect().width >= 16), readings };
  })()`);
  if (refinedSettings.width > 442 || refinedSettings.height > 370 || !refinedSettings.quietRows || !refinedSettings.icons
    || refinedSettings.readings.length !== 5 || refinedSettings.readings.some(r => !r.value || r.value !== r.spoken || !Number.isFinite(r.number))) {
    errors.push('Settings should retain a compact list surface and synchronized accessible slider values: ' + JSON.stringify(refinedSettings));
  }
  await openSettingsGroup(browser, ".settings-group-audio");
  const changedRange = await browser.evaluate(`(() => {
    const slider = document.querySelector('#audioVolumeSlider');
    const previous = slider.value;
    slider.value = '0.6'; slider.dispatchEvent(new Event('input', { bubbles: true }));
    const result = { visible: slider.parentElement.querySelector('.range-value').textContent, spoken: slider.getAttribute('aria-valuetext') };
    slider.value = previous; slider.dispatchEvent(new Event('input', { bubbles: true }));
    return result;
  })()`);
  if (changedRange.visible !== '60%' || changedRange.spoken !== '60%') errors.push('slider value readouts must follow actual input events: ' + JSON.stringify(changedRange));
  const settingsAccordion = await browser.evaluate(`(() => {
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
  const storageWriteFault = await browser.evaluate(`(() => {
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
  const duplicateClose = await browser.evaluate(`(() => {
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
  await waitUntil("settings close after start", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden") && !document.querySelector("#gameHud").hasAttribute("inert") && document.querySelector("#game").tabIndex === 0`));
  const hiddenPanelMutations = await browser.evaluate(`(async () => {
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
  await enableDebugPanel(browser);
  const beforeMove = await debugPosition(browser);
  if (!/relay chain 0  path 0/.test(beforeMove.text)) {
    errors.push("a fresh room should begin without a stale Relay thread: " + beforeMove.text);
  }
  await keyHold(browser, "KeyD", "D", 360);
  const afterMove = await debugPosition(browser);
  const moved = afterMove.x - beforeMove.x;
  if (moved < 8) errors.push("keyboard movement did not shift player enough: " + moved.toFixed(2));
  await clickSelector(browser, "#settingsButton");
  await waitUntil("settings pause opens after timed movement", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const pausedClockStart = await browser.evaluate(`document.querySelector("#runTime").textContent`);
  await sleep(360);
  const pausedClockEnd = await browser.evaluate(`document.querySelector("#runTime").textContent`);
  if (pausedClockEnd !== pausedClockStart) errors.push("run timer advanced while settings paused the game: " + pausedClockStart + " -> " + pausedClockEnd);
  await clickSelector(browser, "#settingsClose");
  await waitUntil("settings pause closes after timer check", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const retryDeathsBefore = await browser.evaluate(`document.querySelector("#deathCount").textContent`);
  await keyTap(browser, "KeyR", "R");
  const retryState = await waitUntil("quick retry status", () => browser.evaluate(`(() => {
    const status = document.querySelector("#gameStatus").textContent;
    const deaths = document.querySelector("#deathCount").textContent;
    return /快速重开 · R1/.test(status) && deaths !== ${JSON.stringify(retryDeathsBefore)}
      ? { status, deaths }
      : null;
  })()`));
  if (!/失 1/.test(retryState.deaths)) errors.push("quick retry should increment the visible mistake count once: " + JSON.stringify({ retryDeathsBefore, retryState }));
  const manualRetryBuffers = await debugPosition(browser);
  if (!/jbuf 0\.000/.test(manualRetryBuffers.text) || !/dbuf 0\.000/.test(manualRetryBuffers.text)) {
    errors.push("manual Quick Retry should clear stale Jump/Dash buffers: " + manualRetryBuffers.text);
  }
  await browser.keyDown("KeyD", "D");
  const earlyDeathWindow = await waitUntil("automatic death exposes an early stale-input window", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const match = text.match(/dead ([\\d.]+)/);
    const remaining = match ? Number(match[1]) : 0;
    return remaining >= 0.15 ? { remaining } : null;
  })()`), 5000, 20);
  await browser.keyUp("KeyD", "d");
  await keyTap(browser, "Space", " ");
  await sleep(420);
  const staleRespawnProbe = await debugPosition(browser);
  const staleJump = staleRespawnProbe.text.match(/jbuf ([\d.]+)/);
  const staleDead = staleRespawnProbe.text.match(/dead ([\d.]+)/);
  if (!(earlyDeathWindow.remaining >= 0.15)
    || (staleDead ? Number(staleDead[1]) : -1) !== 0
    || (staleJump ? Number(staleJump[1]) : -1) !== 0
    || Math.abs(staleRespawnProbe.y - manualRetryBuffers.y) > 2) {
    errors.push("an action pressed before the final death buffer window must expire instead of launching the respawn: " + JSON.stringify({ earlyDeathWindow, staleRespawnProbe }));
  }
  await browser.keyDown("KeyD", "D");
  const lateDeathWindow = await waitUntil("automatic death reaches the late input-buffer window", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const match = text.match(/dead ([\\d.]+)/);
    const remaining = match ? Number(match[1]) : 0;
    return remaining >= 0.055 && remaining <= 0.105 ? { remaining, text } : null;
  })()`), 5000, 20);
  await browser.keyUp("KeyD", "d");
  await keyTap(browser, "Space", " ");
  await sleep(260);
  const bufferedRespawnProbe = await debugPosition(browser);
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
  await browser.evaluate(`window.dispatchEvent(new Event("blur"))`);
  await waitUntil("visible gameplay records unmatched focus pause", () => browser.evaluate(`/pause focus 1  settings 0  hidden 0/.test(document.querySelector("#debugPanel").textContent)`));
  const focusRecoveryStart = await debugPosition(browser);
  await keyHold(browser, "KeyD", "D", 280);
  const keyboardFocusRecovery = await debugPosition(browser);
  if (!/pause focus 0  settings 0  hidden 0/.test(keyboardFocusRecovery.text)
    || keyboardFocusRecovery.x - focusRecoveryStart.x < 6) {
    errors.push("a real keyboard action should recover an unmatched visible-window focus pause after respawn: " + JSON.stringify({ focusRecoveryStart, keyboardFocusRecovery }));
  }
  await browser.evaluate(`window.dispatchEvent(new Event("blur"))`);
  await waitUntil("second unmatched focus pause", () => browser.evaluate(`/pause focus 1  settings 0  hidden 0/.test(document.querySelector("#debugPanel").textContent)`));
  await clickSelector(browser, "#game");
  const pointerFocusRecovery = await waitUntil("canvas pointer recovers unmatched focus pause", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /pause focus 0  settings 0  hidden 0/.test(text) ? text : "";
  })()`));
  if (!/pause focus 0/.test(pointerFocusRecovery)) errors.push("canvas pointer should recover a stale visible focus pause");
  const gameplayCanvas = await canvasInkSummary(browser);
  if (gameplayCanvas.varied < 20 || gameplayCanvas.bright < 20) errors.push("canvas appears blank during gameplay: " + JSON.stringify(gameplayCanvas));
  await keyTap(browser, "Digit0", "0");
  await waitUntil("debug jump reaches summit room", () => browser.evaluate(`/R10\\/10/.test(document.querySelector("#roomCount").textContent)`));
  await sleep(2100);
  await keyHold(browser, "KeyD", "D", 180);
  await waitUntil("summit room timing contributes to current-run evidence", () => browser.evaluate(`!/0:00\\.00$/.test(document.querySelector("#runTime").textContent)`));
  await keyTap(browser, "KeyR", "R");
  await waitUntil("summit route records a current-run mistake", () => browser.evaluate(`/快速重开 · R10/.test(document.querySelector("#gameStatus").textContent) && /失 1/.test(document.querySelector("#deathCount").textContent)`));
  const earlyRuntimeErrors = await browser.evaluate(`window.__summitEarlyRuntimeErrors || []`);
  if (earlyRuntimeErrors.length) throw new Error("runtime error stopped gameplay: " + JSON.stringify(earlyRuntimeErrors));
  await browser.evaluate(`window.addEventListener("error", (event) => { window.__summitRevealTestError = event.message || "unknown"; }, { once: true })`);
  await keyTap(browser, "KeyH", "H");
  await sleep(80);
  const debugSummitState = await browser.evaluate(`({
    status: document.querySelector("#gameStatus").textContent,
    room: document.querySelector("#roomCount").textContent,
    debugVisible: !document.querySelector("#debugPanel").classList.contains("hidden"),
    overlayHidden: document.querySelector("#overlay").classList.contains("hidden"),
    lumenSky: /lumen 0\\/12  sky 0\\.00/.test(document.querySelector("#debugPanel").textContent)
  })`);
  if (!/星顶回应 · 第四幕 · 星顶 · 1\/2 房 ·/.test(debugSummitState.status) || !debugSummitState.lumenSky) {
    errors.push("debug summit trigger should begin the reveal with partial final-act evidence: " + JSON.stringify(debugSummitState));
  }
  const summitRevealState = await waitUntil("summit reveal holds before review", () => browser.evaluate(`(() => {
    const status = document.querySelector("#gameStatus").textContent;
    const hidden = document.querySelector("#overlay").classList.contains("hidden");
    return /星顶回应 · 第四幕 · 星顶 · 1\\/2 房 ·/.test(status) && hidden ? { status, hidden } : null;
  })()`));
  if (!summitRevealState.hidden || !/星顶回应 · 第四幕 · 星顶 · 1\/2 房 ·/.test(summitRevealState.status)) {
    errors.push("summit goal should hold on an in-world reveal with final-act evidence before opening review: " + JSON.stringify(summitRevealState));
  }
  await sleep(2800);
  const finishProbe = await browser.evaluate(`({
    hasTitle: !!document.querySelector("#finishTitle"),
    line: document.querySelector(".finish-line")?.textContent || "",
    facts: Object.fromEntries([...document.querySelectorAll(".finish-stats > span")].map(row =>
      [row.querySelector("em").textContent, row.querySelector("strong").textContent])),
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
  if (finishProbe.hasTitle && (finishProbe.facts["微光"] !== "0/12" || finishProbe.facts["最长连锁"] !== "0 环" || finishProbe.whisper !== "山没有变轻，是你学会了继续向上。")) {
    errors.push("summit review should close the current-run Lumen loop without granting the all-Lumen ending to a partial route: " + JSON.stringify(finishProbe));
  }
  const runEvidenceReview = finishProbe.hasTitle ? await browser.evaluate(`(() => {
    const title = document.querySelector("#finishTitle");
    const more = document.querySelector(".review-more");
    const text = more.textContent || "";
    const nextCard = [...document.querySelectorAll(".review-card")].find((card) => card.querySelector("span")?.textContent.trim() === "建议练习");
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
    await browser.evaluate(`document.querySelector(".review-more").open = true`);
    await waitUntil("current-run report action becomes visible", () => browser.evaluate(`document.querySelector("[data-copy-run-report]")?.getClientRects().length > 0`));
    await clickSelector(browser, "[data-copy-run-report]");
    const runReport = await waitUntil("current-run report copy", () => browser.evaluate(`(() => {
      const text = window.__summitLastRunReport || "";
      const status = document.querySelector("#gameStatus").textContent;
      return text && /本轮报告/.test(status) ? { text, status } : null;
    })()`));
    if (!/结果：部分路线 1\/10 房/.test(runReport.text)
      || !/IV · 星顶/.test(runReport.text)
      || !/R10 星顶终线：0:/.test(runReport.text)
      || !/R1 起势山门：—/.test(runReport.text)
      || !/微光 0\/12/.test(runReport.text)
      || !/已走房间漏收：R10（1 枚）(?:\n|$)/.test(runReport.text)
      || !/重点：最慢 R10 星顶终线 0:/.test(runReport.text)
      || !/不含身份、设备名称、输入历史或路线坐标/.test(runReport.text)
      || /userAgent|@/.test(runReport.text)
      || runReport.text.length > 4000) {
      errors.push("current-run report should be bounded, useful and privacy-labelled: " + JSON.stringify(runReport));
    }
    const returnLink = await browser.evaluate(`document.querySelector("[data-find-lumens]")?.textContent || ""`);
    if (!returnLink.includes("R10 寻光练习 缺 1 枚")) errors.push("Partial summit should offer the visited room's missing Lumen");
    await clickSelector(browser, "[data-find-lumens]");
    const freeHunt = await browser.evaluate(`({
      free: document.querySelector(".stage").classList.contains("free-play"),
      retired: document.querySelector("#overlay").hidden && !document.querySelector("#overlay").hasAttribute("aria-modal"),
      focused: document.activeElement === document.querySelector("#game"),
      room: document.querySelector("#roomCount").textContent, tip: document.querySelector("#gameTip").textContent
    })`);
    if (!freeHunt.free || !freeHunt.retired || !freeHunt.focused || !freeHunt.room.startsWith("R10/") || !freeHunt.tip.includes("上次漏收 1 枚 · 前段高处")) {
      errors.push("Returning to a missing Lumen must begin free exploration with its location: " + JSON.stringify(freeHunt));
    }
  }
  await navigateApp(browser, baseUrl, "desktop reset");
  await tapSelector(browser, "#openTrainingButton");
  await waitUntil("practice panel open", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  const cockpit = await browser.evaluate(`(() => {
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
  await openSettingsGroup(browser, ".settings-group-training");
  await openSettingsGroup(browser, ".practice-subgroup-advanced");
  await clickSelector(browser, "#focusResetButton");
  const resetArmed = await browser.evaluate(`document.querySelector("#focusResetButton").textContent.trim()`);
  if (resetArmed !== "确认清空") errors.push("advanced reset should retain its first-step confirmation after being moved out of the launch dock: " + resetArmed);
  await clickSelector(browser, "#focusResetButton");
  const resetComplete = await waitUntil("advanced reset completes", () => browser.evaluate(`(() => {
    const status = document.querySelector("#gameStatus").textContent;
    const label = document.querySelector("#focusResetButton").textContent.trim();
    return /统计已清空/.test(status) && label === "清空" ? { status, label } : null;
  })()`));
  if (!/统计已清空/.test(resetComplete.status) || resetComplete.label !== "清空") errors.push("advanced reset should finish and return to its concise label: " + JSON.stringify(resetComplete));
  await browser.evaluate(`document.querySelector(".practice-subgroup-advanced").open = false`);
  await waitUntil("advanced disclosure closes with synchronized semantics", () => browser.evaluate(`(() => {
    const group = document.querySelector(".practice-subgroup-advanced");
    return !group.open;
  })()`));
  await clickSelector(browser, "#settingsClose");
  await waitUntil("practice panel closes", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`));

  await clickSelector(browser, "#startSettingsButton");
  await waitUntil("quiet settings open", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  const defaultOpenGroups = await browser.evaluate(`[...document.querySelectorAll(".settings-group.settings-only[open]")].map((group) => group.className)`);
  if (defaultOpenGroups.length !== 0) errors.push("settings should open with every system group collapsed: " + JSON.stringify(defaultOpenGroups));
  const collapsedDisclosureSemantics = await browser.evaluate(`(() => {
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
  await openSettingsGroup(browser, ".settings-group-controls");
  const openedControlsDisclosure = await browser.evaluate(`(() => {
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
  const settingsAudit = await browser.evaluate(`(() => {
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
  const comfortControls = await browser.evaluate(`({
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

  const macLayoutApplied = await browser.evaluate(`(() => {
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
  await clickSelector(browser, '[data-preset-choice="classic"]');
  const classicBindings = await browser.evaluate(`(() => Object.fromEntries(
    ["left", "up", "jump", "dash", "grab"].map((action) => [
      action,
      document.querySelector('[data-binding-action="' + action + '"] kbd')?.textContent.trim()
    ])
  ))()`);
  if (classicBindings.left !== "←" || classicBindings.up !== "↑" || classicBindings.jump !== "C" || classicBindings.dash !== "X" || classicBindings.grab !== "Z") {
    errors.push("classic preset should expose Celeste-style arrows plus C/X/Z: " + JSON.stringify(classicBindings));
  }
  await clickSelector(browser, '[data-binding-action="jump"]');
  await keyTap(browser, "Escape", "Escape");
  const cancelledBinding = await browser.evaluate(`(() => ({
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
  await clickSelector(browser, '[data-binding-action="dash"]');
  await clickSelector(browser, "#settingsClose");
  await waitUntil("closing settings cancels pending rebinding", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await clickSelector(browser, "#startSettingsButton");
  await openSettingsGroup(browser, ".settings-group-controls");
  const closedBinding = await browser.evaluate(`({
    preset: document.querySelector("#controlPreset").value,
    dash: document.querySelector('[data-binding-action="dash"] kbd')?.textContent.trim(),
    capturing: document.querySelectorAll("[data-binding-action].capturing").length
  })`);
  if (closedBinding.preset !== "classic" || closedBinding.dash !== "X" || closedBinding.capturing !== 0) {
    errors.push("closing settings should roll back an unfinished key capture: " + JSON.stringify(closedBinding));
  }
  await clickSelector(browser, '[data-preset-choice="comfort"]');
  const comfortBindings = await browser.evaluate(`(() => Object.fromEntries(
    ["left", "up", "jump", "dash", "grab"].map((action) => [
      action,
      document.querySelector('[data-binding-action="' + action + '"] kbd')?.textContent.trim()
    ])
  ))()`);
  if (comfortBindings.left !== "A" || comfortBindings.up !== "W" || comfortBindings.jump !== "Space" || comfortBindings.dash !== "K" || comfortBindings.grab !== "J") {
    errors.push("comfort preset should split WASD movement from Space/J/K actions: " + JSON.stringify(comfortBindings));
  }
  await clickSelector(browser, '[data-binding-action="jump"]');
  await keyTap(browser, "KeyF", "f");
  const reboundJump = await browser.evaluate(`(() => {
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
  await clickSelector(browser, '[data-layout-choice="pc"]');
  const customAfterPcSwitch = await browser.evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    return {
      layout: saved.keyboardLayout,
      preset: saved.controlsPreset,
      jump: saved.customBindings?.jump,
      label: document.querySelector('[data-binding-action="jump"] kbd')?.textContent.trim(),
      status: document.querySelector("#gameStatus")?.textContent || ""
    };
  })()`);
  await clickSelector(browser, '[data-layout-choice="mac"]');
  const customAfterMacSwitch = await browser.evaluate(`(() => {
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
  await clickSelector(browser, "#resetKeyBindings");
  const resetBindings = await browser.evaluate(`(() => {
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

  await openSettingsGroup(browser, ".settings-group-audio");
  const audioFailure = await browser.evaluate(`(() => {
    window.__summitSmokeAudioUnavailable = true;
    document.querySelector("#audioTestButton")?.click();
    return document.querySelector("#gameStatus")?.textContent || "";
  })()`);
  const unavailableAudioStatus = await waitUntil("audio unavailable status", () => browser.evaluate(`(() => {
    const text = document.querySelector("#gameStatus")?.textContent || "";
    return /声音暂不可用/.test(text) ? text : null;
  })()`), 1200, 40);
  await browser.evaluate(`window.__summitSmokeAudioUnavailable = false`);
  await clickSelector(browser, "#audioTestButton");
  const audioStatus = await waitUntil("audio test status", () => browser.evaluate(`(() => {
    const text = document.querySelector("#gameStatus")?.textContent || "";
    return /声音试听/.test(text) ? text : null;
  })()`), 1200, 40);
  await browser.evaluate(`window.__summitSmokeAudioContextClosed = true`);
  await clickSelector(browser, "#audioTestButton");
  const audioRecoveryStatus = await waitUntil("audio context recovery status", () => browser.evaluate(`(() => {
    const text = document.querySelector("#gameStatus")?.textContent || "";
    return /声音试听/.test(text) ? text : null;
  })()`), 1200, 40);
  if (!/声音暂不可用/.test(unavailableAudioStatus) || !/声音试听/.test(audioStatus) || !/声音试听/.test(audioRecoveryStatus)) {
    errors.push("audio test should distinguish unavailable audio and recover a replaced context: " + JSON.stringify({ audioFailure, unavailableAudioStatus, audioStatus, audioRecoveryStatus }));
  }
  await browser.evaluate(`(() => {
    const type = document.querySelector("#feedbackType");
    const note = document.querySelector("#feedbackNote");
    type.value = "mobile";
    type.dispatchEvent(new Event("change", { bubbles: true }));
    note.value = "R7 touch note with extra spacing";
    note.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await openSettingsGroup(browser, ".settings-group-feedback");
  await clickSelector(browser, "#diagnosticsButton");
  const diagnostics = await waitUntil("diagnostics snapshot", () => browser.evaluate(`(() => {
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
  await clickSelector(browser, "#feedbackTemplateButton");
  const template = await waitUntil("feedback template", () => browser.evaluate(`(() => {
    const text = window.__summitLastFeedbackTemplate || "";
    return /Summit Spark/.test(text) && /反馈类型：移动端/.test(text) && /复现步骤：/.test(text) && !/userAgent/.test(text) ? text : null;
  })()`), 5000);
  if (!/R7 touch note/.test(template)) errors.push("feedback template should include the current note");
  await sleep(420);

  const outsidePoint = await browser.evaluate(`({ x: 18, y: Math.round(innerHeight / 2) })`);
  await clickPoint(browser, outsidePoint.x, outsidePoint.y);
  await waitUntil("outside pointer closes quiet settings", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const outsideDismissFocus = await waitUntil("outside pointer restores safe focus", () => browser.evaluate(`(() => {
    const panel = document.querySelector("#settingsPanel");
    const active = document.activeElement;
    return active && active !== document.body && !panel.contains(active) ? (active.id || active.tagName) : "";
  })()`));
  if (outsideDismissFocus !== "startSettingsButton") errors.push("outside settings dismissal should return start-screen focus to its visible trigger: " + outsideDismissFocus);
  await clickSelector(browser, "#startSettingsButton");
  await waitUntil("quiet settings reopens collapsed", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelectorAll(".settings-group.settings-only[open]").length === 0`));
  const outsideStartPoint = await browser.evaluate(`(() => {
    const rect = document.querySelector("#startButton").getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  })()`);
  await clickPoint(browser, outsideStartPoint.x, outsideStartPoint.y);
  await waitUntil("outside start-button region closes without click-through", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden") && !document.querySelector("#overlay").classList.contains("hidden") && document.querySelector("#gameHud").hidden`));
  await clickSelector(browser, "#startSettingsButton");
  const outsideTrainingPoint = await browser.evaluate(`(() => {
    const rect = document.querySelector("#openTrainingButton").getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  })()`);
  await clickPoint(browser, outsideTrainingPoint.x, outsideTrainingPoint.y);
  await waitUntil("real outside training-button pointer switches panels", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await clickSelector(browser, "#settingsClose");
  await waitUntil("switched practice panel closes to its actual trigger", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden") && document.activeElement === document.querySelector("#openTrainingButton")`));
  await clickSelector(browser, "#startSettingsButton");
  const outsideAccountPoint = await browser.evaluate(`(() => {
    const rect = document.querySelector("#startAccountButton").getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  })()`);
  await clickPoint(browser, outsideAccountPoint.x, outsideAccountPoint.y);
  await waitUntil("real outside account-button pointer switches panels", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("account-focused") && document.querySelector(".settings-group-account").open`));
  await clickSelector(browser, "#settingsClose");
  await waitUntil("switched account panel closes to its actual trigger", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden") && document.activeElement === document.querySelector("#startAccountButton")`));
  await clickSelector(browser, "#openTrainingButton");
  await waitUntil("practice panel opens for feel", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-training");
  await openSettingsGroup(browser, ".practice-subgroup-feel");
  await browser.evaluate(`document.querySelector(".settings-group-training")?.scrollIntoView({ block: "start" })`);
  await sleep(160);
  await clickSelector(browser, "[data-feel-fixture]");
  await waitUntil("feel fixture launch", () => browser.evaluate(`/手感校准/.test(document.querySelector("#gameStatus").textContent)`));
  await clickSelector(browser, "#practiceButton");
  await waitUntil("practice reopened after feel fixture", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-training");
  await openSettingsGroup(browser, ".practice-subgroup-feel");
  await browser.evaluate(`document.querySelector(".settings-group-training")?.scrollIntoView({ block: "start" })`);
  await sleep(160);
  const feelState = await browser.evaluate(`document.querySelector(".feel-card.active, .feel-card.recent, .feel-card.interrupted")?.className || ""`);
  if (!/feel-card/.test(feelState)) errors.push("Feel Lab did not preserve active/recent/interrupted state after launch");

  const routeAfterFeel = await browser.evaluate(`(() => {
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

  await clickSelector(browser, "[data-route-contract]");
  await waitUntil("route contract launch", () => browser.evaluate(`/航线|稳定航线|节奏航线|高手航线/.test(document.querySelector("#gameStatus").textContent)`));
  await keyTap(browser, "KeyD", "D");
  const gameplay = await browser.evaluate(`({
    overlayHidden: document.querySelector("#overlay").classList.contains("hidden"),
    status: document.querySelector("#gameStatus").textContent,
    room: document.querySelector("#roomCount").textContent,
    hudBackground: getComputedStyle(document.querySelector(".meters")).backgroundImage,
    counterBackground: getComputedStyle(document.querySelector(".counter")).backgroundColor,
    actionSurface: getComputedStyle(document.querySelector(".icon-button")).backgroundImage
  })`);
  if (!gameplay.overlayHidden || !gameplay.room) errors.push("gameplay did not remain active after route contract launch");
  if (!/48, 73, 87/.test(gameplay.hudBackground) || !/227, 239, 234/.test(gameplay.counterBackground) || !/55, 80, 92/.test(gameplay.actionSurface)) errors.push("desktop HUD should use the refined deep-mist surface system instead of near-black slabs: " + JSON.stringify(gameplay));

  await navigateApp(browser, baseUrl, "selected room Drill action");
  await clickSelector(browser, "#openTrainingButton");
  await waitUntil("selected room practice opens", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-room");
  await browser.evaluate(`(() => {
    const select = document.querySelector("#roomSelect");
    select.value = "1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitUntil("room selector previews R2 without launching", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#roomSelect").value === "1" && document.querySelector("#roomCount").textContent.startsWith("R1/")`));
  const selectedRoomAction = await browser.evaluate(`(() => {
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
  await browser.evaluate(`(() => {
    const select = document.querySelector("#roomSelect");
    select.value = "5";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  const r6AuthoredBrief = await waitUntil("R6 brief names its authored mechanic counts", () => browser.evaluate(`(() => {
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
  await browser.evaluate(`(() => {
    const select = document.querySelector("#roomSelect");
    select.value = "1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitUntil("room selector returns to R2 before launch", () => browser.evaluate(`document.querySelector("#roomSelect").value === "1" && /^开始 R2 /.test(document.querySelector("#focusRoomButton").textContent.trim())`));
  await clickSelector(browser, "#focusRoomButton");
  await waitUntil("selected room action starts R2 Drill", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden") && /Drill R2/.test(document.querySelector("#gameStatus").textContent)`));

  await navigateApp(browser, baseUrl, "R3 full-route Practice entry");
  await clickSelector(browser, "#openTrainingButton");
  await waitUntil("R3 practice panel opens", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-room");
  await browser.evaluate(`(() => {
    const select = document.querySelector("#roomSelect");
    select.value = "2";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await clickSelector(browser, "#focusRoomButton");
  await waitUntil("selected room action starts R3 Drill", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden") && /Drill R3/.test(document.querySelector("#gameStatus").textContent)`));
  await keyTap(browser, "F3", "F3");
  const r3PracticeEntry = await waitUntil("R3 Practice uses its full-route left checkpoint", () => browser.evaluate(`(() => {
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
  await keyHold(browser, "ArrowRight", "ArrowRight", 420);
  await sleep(120);
  const fullResourceRefill = await browser.evaluate(`(() => {
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
    // R3's first support ends at x=192; allow a few compositor/frame-timing
    // pixels while the grounded check still rejects leaving the platform.
    || fullResourceRefill.x > 194
    || !fullResourceRefill.ground) {
    errors.push("walking through a refill with full dash and stamina should neither consume it nor award passive Flow: " + JSON.stringify(fullResourceRefill));
  }
  await keyTap(browser, "KeyR", "R");
  await waitUntil("R3 quick retry returns to the authored checkpoint", () => browser.evaluate(`(() => {
    const debug = document.querySelector("#debugPanel").textContent;
    const position = debug.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    return position && Math.abs(Number(position[1]) - 70.5) < 1 && /dash 1/.test(debug) && /flow 0/.test(debug);
  })()`), 2500);
  await keyTap(browser, "ShiftLeft", "Shift");
  await sleep(600);
  const spentResourceRefill = await browser.evaluate(`(() => {
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
  await keyTap(browser, "F3", "F3");

  await navigateApp(browser, baseUrl, "R7 grounded Practice seed");
  await browser.evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.assistMode = "off";
    saved.controlsPreset = "comfort";
    saved.keyboardLayout = "pc";
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
  })()`);
  await navigateApp(browser, baseUrl, "R7 grounded Practice entry");
  await clickSelector(browser, "#openTrainingButton");
  await waitUntil("R7 practice panel opens", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-room");
  await browser.evaluate(`(() => {
    const select = document.querySelector("#roomSelect");
    select.value = "6";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await clickSelector(browser, "#focusRoomButton");
  await waitUntil("selected room action starts R7 Drill", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden") && /Drill R7/.test(document.querySelector("#gameStatus").textContent)`));
  await keyTap(browser, "F3", "F3");
  const r7PracticeEntry = await waitUntil("R7 Practice uses its grounded checkpoint", () => browser.evaluate(`(() => {
    const debug = document.querySelector("#debugPanel").textContent;
    const position = debug.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    const ground = /ground 1/.test(debug);
    if (!/room 7\\/10/.test(debug) || !position || !ground) return null;
    return { x: Number(position[1]), y: Number(position[2]), ground };
  })()`), 3500);
  if (Math.abs(r7PracticeEntry.x - 70.5) > 1 || Math.abs(r7PracticeEntry.y - 487) > 1 || !r7PracticeEntry.ground) {
    errors.push("direct R7 Practice should begin on the intended grounded Wind Gorge checkpoint: " + JSON.stringify(r7PracticeEntry));
  }
  await keyDown(browser, "KeyD", "D");
  let r7WindWake;
  try {
    r7WindWake = await waitUntil("R7 floor route enters its authored updraft", () => browser.evaluate(`(() => {
      const debug = document.querySelector("#debugPanel").textContent;
      const position = debug.match(/pos ([\\d.-]+), ([\\d.-]+)/);
      if (!position || !/wind 1/.test(debug)) return null;
      return { x: Number(position[1]), y: Number(position[2]), debug };
    })()`), 3600, 20);
  } finally {
    await keyUp(browser, "KeyD", "D");
  }
  await keyHold(browser, "KeyA", "A", 520);
  const r7WindExit = await waitUntil("R7 updraft wake clears after leaving the exact field", () => browser.evaluate(`(() => {
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
  await keyTap(browser, "F3", "F3");

  await navigateApp(browser, baseUrl, "first-run keyboard onboarding seed");
  await browser.evaluate(`localStorage.clear()`);
  await navigateApp(browser, baseUrl, "first-run keyboard onboarding clean");
  await clickSelector(browser, "#startButton");
  const quietOnboarding = await browser.evaluate(`({
    controlHintRemoved: !document.querySelector("#controlHint"),
    ordinaryTipHidden: document.querySelector("#gameTip").classList.contains("hidden")
  })`);
  if (!quietOnboarding.controlHintRemoved || !quietOnboarding.ordinaryTipHidden) errors.push("first-run play should start without redundant move/jump/dash strips or coach cards: " + JSON.stringify(quietOnboarding));
  await keyHold(browser, "KeyD", "D", 180);
  await keyTap(browser, "Space", " ");
  await keyTap(browser, "KeyX", "X");
  const afterInputsTipHidden = await browser.evaluate(`document.querySelector("#gameTip").classList.contains("hidden")`);
  if (!afterInputsTipHidden) errors.push("ordinary movement inputs should not raise a coaching card");
}

async function runChapterTransitionInputSmoke(browser, baseUrl) {
  async function launchR4Transition(label) {
    await navigateApp(browser, baseUrl, label);
    await clickSelector(browser, "#openTrainingButton");
    await waitUntil(label + " practice panel opens", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
    await openSettingsGroup(browser, ".settings-group-room");
    await browser.evaluate(`(() => {
      const select = document.querySelector("#roomSelect");
      select.value = "3";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await clickSelector(browser, "#focusRoomButton");
    await waitUntil(label + " starts R4 transition", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden") && /Drill R4/.test(document.querySelector("#gameStatus").textContent)`));
    await enableDebugPanel(browser);
    return waitUntil(label + " exposes act timer", () => browser.evaluate(`(() => {
      const text = document.querySelector("#debugPanel").textContent;
      const act = text.match(/act ([\\d.]+)/);
      const pos = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
      return act && pos && Number(act[1]) > 1.2
        ? { act: Number(act[1]), x: Number(pos[1]), y: Number(pos[2]), text }
        : null;
    })()`), 3500);
  }

  const earlyStart = await launchR4Transition("early chapter-buffer");
  await keyTap(browser, "Space", " ");
  await keyTap(browser, "KeyX", "X");
  await sleep(360);
  const earlyExpired = await browser.evaluate(`(() => {
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
  const earlySettled = await waitUntil("early chapter inputs remain stale after transition", () => browser.evaluate(`(() => {
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
  const lateWindow = await waitUntil("chapter transition reaches final input-buffer window", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const act = text.match(/act ([\\d.]+)/);
    const remaining = act ? Number(act[1]) : -1;
    return remaining > 0 && remaining <= 0.09 ? { remaining, text } : null;
  })()`), 3500, 8);
  await keyTap(browser, "Space", " ");
  let lateJump;
  try {
    lateJump = await waitUntil("late chapter Jump connects after transition", () => browser.evaluate(`(() => {
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
    const snapshot = await browser.evaluate(`document.querySelector("#debugPanel").textContent`);
    throw new Error(`${error.message}: ${snapshot}`);
  }
  if (!(lateWindow.remaining > 0)
    || lateJump.y >= lateStart.y - 3
    || lateJump.vy >= -20) {
    errors.push("chapter transition should preserve a Jump pressed inside the final normal buffer window: " + JSON.stringify({ lateStart, lateWindow, lateJump }));
  }
}

async function runOldPeakRelicSmoke(browser, baseUrl) {
  await navigateApp(browser, baseUrl, "Old Peak Relay relic");
  await clickSelector(browser, "#startButton");
  await enableDebugPanel(browser);
  await keyTap(browser, "Digit5", "5");
  const dormant = await waitUntil("R5 Relay relic starts dormant", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /room 5\\/10/.test(text) && /relays 5  gate 0\\.00  relic 0\\.00/.test(text) ? { text } : null;
  })()`), 3500);
  await keyDown(browser, "KeyD", "D");
  const awakened = await waitUntil("R5 first Relay awakens its switchback relic", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    return /relays 5  gate 0\\.00  relic 0\\.20/.test(text) && position
      ? { x: Number(position[1]), y: Number(position[2]), text }
      : null;
  })()`), 1800, 20);
  await keyUp(browser, "KeyD", "D");
  await sleep(4350);
  const afterCooldown = await browser.evaluate(`document.querySelector("#debugPanel").textContent`);
  await keyTap(browser, "KeyR", "R");
  const reset = await waitUntil("R5 retry clears attempt-local Relay relic", () => browser.evaluate(`(() => {
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

async function runMountainGateLandmarkSmoke(browser, baseUrl) {
  await navigateApp(browser, baseUrl, "Mountain Gate landmark seed");
  await browser.evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.assistMode = "off";
    saved.controlsPreset = "comfort";
    saved.keyboardLayout = "pc";
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
  })()`);
  await navigateApp(browser, baseUrl, "Mountain Gate landmarks");
  await clickSelector(browser, "#startButton");
  await enableDebugPanel(browser);
  const r1Dormant = await waitUntil("R1 gate landmark starts dormant", () => browser.evaluate(`(() => {
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
      await keyTap(browser, "KeyR", "R");
      await waitUntil("R1 bounded Spark retry restores its start", () => browser.evaluate(`(() => {
        const text = document.querySelector("#debugPanel").textContent;
        return /快速重开 · R1/.test(document.querySelector("#gameStatus")?.textContent || "")
          && /gate 0\\.00  relic 0\\.00/.test(text);
      })()`), 2500, 20);
    }
    const timing = r1Timings[attempt];
    await browser.evaluate(`new Promise((resolve) => {
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
      r1Awake = await waitUntil("R1 Spark wakes the gate steps", () => browser.evaluate(`(() => {
        const text = document.querySelector("#debugPanel").textContent;
        return /room 1\\/10/.test(text) && /gate 1\\.00  relic 0\\.00/.test(text)
          ? { text }
          : null;
      })()`), 1100, 20);
    } catch {
      r1AttemptSnapshots.push(await browser.evaluate(`document.querySelector("#debugPanel")?.textContent || ""`));
    }
  }
  if (!r1Awake) {
    throw new Error("R1 Spark wakes the gate steps timed out: " + JSON.stringify(r1AttemptSnapshots));
  }
  await keyTap(browser, "KeyR", "R");
  const r1Reset = await waitUntil("R1 retry restores the dormant gate steps", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    return /快速重开 · R1/.test(document.querySelector("#gameStatus").textContent)
      && /gate 0\\.00  relic 0\\.00/.test(text)
      ? { text }
      : null;
  })()`), 2500, 20);
  await keyTap(browser, "Digit2", "2");
  const r2Dormant = await waitUntil("R2 Relay bridge starts dormant", () => browser.evaluate(`(() => {
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
      await keyTap(browser, "KeyR", "R");
      await waitUntil("R2 bounded Relay retry restores its start", () => browser.evaluate(`(() => {
        const text = document.querySelector("#debugPanel").textContent;
        return /快速重开 · R2/.test(document.querySelector("#gameStatus").textContent)
          && /ground 1/.test(text)
          && /respawn 70\\.5, 263\\.0  overlap 0/.test(text)
          && /relays 2  gate 0\\.00  relic 0\\.00/.test(text);
      })()`), 3500, 20);
    }
    await keyDown(browser, "KeyD", "D");
    try {
      try {
        await waitUntil("R2 real-input run-up reaches jump cue", () => browser.evaluate(`(() => {
          const text = document.querySelector("#debugPanel").textContent;
          const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
          return position && Number(position[1]) >= ${r2LaunchCues[attempt].jumpX} && /ground 1/.test(text)
            ? { x: Number(position[1]), y: Number(position[2]), text }
            : null;
        })()`), 1200, 8);
      } catch {
        r2AttemptSnapshots.push(await browser.evaluate(`document.querySelector("#debugPanel").textContent`));
        continue;
      }
      await keyHold(browser, "Space", " ", 90);
      let launchCue;
      try {
        launchCue = await waitUntil("R2 real-input launch reaches dash cue", () => browser.evaluate(`(() => {
          const text = document.querySelector("#debugPanel").textContent;
          const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
          if (!position) return null;
          const state = { x: Number(position[1]), y: Number(position[2]), text };
          return state.x >= ${r2LaunchCues[attempt].dashX} ? state : null;
        })()`), 1500, 8);
      } catch {
        r2AttemptSnapshots.push(await browser.evaluate(`document.querySelector("#debugPanel").textContent`));
        continue;
      }
      if (launchCue.x > 245) {
        r2AttemptSnapshots.push(launchCue.text);
        continue;
      }
      await keyTap(browser, "KeyK", "K");
      try {
        r2Awake = await waitUntil("R2 first unique Relay wakes half the bridge", () => browser.evaluate(`(() => {
          const text = document.querySelector("#debugPanel").textContent;
          const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
          return /relays 2  gate 0\\.50  relic 0\\.00/.test(text) && position
            ? { x: Number(position[1]), y: Number(position[2]), text }
            : null;
        })()`), 2200, 20);
      } catch {
        r2AttemptSnapshots.push(await browser.evaluate(`document.querySelector("#debugPanel").textContent`));
      }
    } finally {
      await keyUp(browser, "KeyD", "D");
    }
  }
  if (!r2Awake) throw new Error(`R2 first unique Relay wakes half the bridge failed after two bounded input attempts: ${JSON.stringify(r2AttemptSnapshots)}`);
  await sleep(4350);
  const r2Cooldown = await browser.evaluate(`document.querySelector("#debugPanel").textContent`);
  await keyTap(browser, "KeyR", "R");
  const r2Reset = await waitUntil("R2 retry restores the dormant Relay bridge", () => browser.evaluate(`(() => {
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

async function runWindGorgeCrumbleRippleSmoke(browser, baseUrl) {
  await navigateApp(browser, baseUrl, "Wind Gorge crumble ripple seed");
  await browser.evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.assistMode = "off";
    saved.controlsPreset = "comfort";
    saved.keyboardLayout = "pc";
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
  })()`);
  const clock = await installFrameClock(browser);
  try {
    await navigateApp(browser, baseUrl, "Wind Gorge crumble ripple");
    await clickSelector(browser, "#startButton");
    const exercise = () => {
      const panel = document.getElementById("debugPanel");
      const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, {code, bubbles: true}));
      const tap = code => { key("keydown", code); key("keyup", code); };
      function stepUntil(label, match, frames) {
        for (let i = 0; i < frames; i++) {
          window.stepGameFrame();
          if (match(panel.textContent)) return;
        }
        throw new Error(label + ": " + panel.textContent);
      }
      const x = text => Number(text.match(/pos ([\d.-]+),/)?.[1]);
      if (panel.classList.contains("hidden")) tap("F3");
      tap("Digit8");
      stepUntil("R8 fully restored", text => /room 8\/10/.test(text) && /crumble 15\/15 q0 a0/.test(text)
        && /ground 1/.test(text) && /act 0\.000/.test(text), 180);
      key("keydown", "KeyD");
      try {
        stepUntil("Reach the launch pocket", text => /ground 1/.test(text) && x(text) >= 155 && x(text) <= 170, 90);
        tap("KeyK");
        stepUntil("First tile arms while the strip is queued", text =>
          /crumble 15\/15 q[1-4] a1/.test(text) && x(text) >= 240 && x(text) <= 450, 120);
        stepUntil("Only the five contiguous tiles break", text => /crumble 10\/15 q0 a0/.test(text), 120);
      } finally {
        key("keyup", "KeyD");
      }
      tap("KeyR");
      stepUntil("Retry restores every tile", text => /快速重开 · R8/.test(document.getElementById("gameStatus").textContent)
        && /crumble 15\/15 q0 a0/.test(text), 120);
    };
    await browser.evaluate(`(${exercise})()`);
  } finally {
    await browser.removeInitScript(clock);
  }
}

async function runSpringApexSmoke(browser, baseUrl) {
  await navigateApp(browser, baseUrl, "spring apex seed");
  await browser.evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.assistMode = "off";
    saved.controlsPreset = "comfort";
    saved.keyboardLayout = "pc";
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
  })()`);
  await navigateApp(browser, baseUrl, "spring apex");
  await clickSelector(browser, "#startButton");
  await enableDebugPanel(browser);
  await keyTap(browser, "Digit0", "0");
  const ready = await waitUntil("R10 spring route starts settled", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    return /room 10\\/10/.test(text) && /ground 1/.test(text) && /act 0\\.000/.test(text) && position
      ? { x: Number(position[1]), y: Number(position[2]), text }
      : null;
  })()`), 4500, 20);
  let approach;
  let approachProbe = null;
  await keyDown(browser, "KeyD", "D");
  try {
    approach = await waitUntil("R10 spring approach reaches the lower floor", () => browser.evaluate(`(() => {
      const text = document.querySelector("#debugPanel").textContent;
      const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
      return position && Number(position[1]) >= 245 && Number(position[1]) <= 270
        ? { x: Number(position[1]), y: Number(position[2]), text }
        : null;
    })()`), 1800, 20);
  } catch {
    approachProbe = await debugPosition(browser);
  } finally {
    await keyUp(browser, "KeyD", "D");
  }
  if (approachProbe) throw new Error("R10 spring approach missed lower-floor window: " + JSON.stringify(approachProbe));
  let launch;
  await keyDown(browser, "KeyD", "D");
  try {
    launch = await waitUntil("R10 floor spring opens the apex window", () => browser.evaluate(`(() => {
      const text = document.querySelector("#debugPanel").textContent;
      const timer = text.match(/spring apex ([\\d.]+) hit/);
      const velocity = text.match(/vel ([\\d.-]+), ([\\d.-]+)/);
      return timer && Number(timer[1]) > 0.2 && velocity && Number(velocity[2]) < -500
        ? { timer: Number(timer[1]), vx: Number(velocity[1]), vy: Number(velocity[2]), text }
        : null;
    })()`), 1200, 20);
  } finally {
    await keyUp(browser, "KeyD", "D");
  }
  const apex = await waitUntil("R10 spring reaches its authored apex timing", () => browser.evaluate(`(() => {
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
    recognized = await waitUntil("R10 apex dash closes the spring timing loop", () => browser.evaluate(`(() => {
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
    const probe = await debugPosition(browser);
    throw new Error(`${error.message}: ${JSON.stringify({ apex, probe })}`);
  } finally {
    // The localhost-only test event writes the normal Dash buffer synchronously;
    // keyboard and gamepad delivery are covered by their broader interaction tests.
  }
  await keyTap(browser, "KeyR", "R");
  const reset = await waitUntil("R10 retry clears spring apex attempt state", () => browser.evaluate(`(() => {
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

function installFrameClock(browser) {
  return browser.addInitScript({source: `(() => {
    let pending = [];
    let time;
    window.requestAnimationFrame = callback => pending.push(callback);
    window.stepGameFrame = () => {
      time = (time ?? performance.now()) + 1000 / 60;
      const callbacks = pending;
      pending = [];
      for (const callback of callbacks) callback(time);
    };
  })();`});
}

async function runRetryAndTouchAimSmoke(browser, baseUrl) {
  const clock = await installFrameClock(browser);
  try {
    await browser.setViewport(390, 760);
    // Keep the recorded falls and the guest choice out of other first-run scenarios.
    const isolated = new URL(baseUrl);
    isolated.hostname = "localhost";
    await navigateApp(browser, isolated.origin, "retry and touch aim");
    const exercise = () => {
      const el = id => document.getElementById(id);
      el(el("entryGate").classList.contains("hidden") ? "startButton" : "guestEntryButton").click();
      const key = (code, type) => window.dispatchEvent(new KeyboardEvent(type, {code, bubbles: true}));
      key("F3", "keydown");
      key("F3", "keyup");
      const status = el("gameStatus");
      for (const [retry, message] of [["KeyR", "快速重开"], ["KeyT", "房间重开"]]) {
        const previous = Number(el("deathCount").textContent.split(" ")[1]);
        key("KeyD", "keydown");
        for (let i = 0; i < 320 && !status.textContent.includes("自动复位"); i++) window.stepGameFrame();
        key("KeyD", "keyup");
        if (!status.textContent.includes("自动复位")) throw new Error("Did not reach the R1 fall");
        key(retry, "keydown");
        key(retry, "keyup");
        window.stepGameFrame();
        if (!status.textContent.includes(message) || el("deathCount").textContent !== "失 " + (previous + 1)) {
          throw new Error(retry + " should resume play and count the fall exactly once");
        }
      }

      for (let frame = 0; frame < 50; frame++) window.stepGameFrame();
      const right = document.querySelector('[data-touch="right"]');
      const dash = document.querySelector('[data-touch="dash"]');
      const bounds = right.getBoundingClientRect();
      const center = bounds.y + bounds.height / 2;
      const touch = (button, type, pointerId, y = center) => button.dispatchEvent(new PointerEvent(type, {
        pointerType: "touch", pointerId, clientX: bounds.x + bounds.width / 2, clientY: y, bubbles: true
      }));
      touch(right, "pointerdown", 8);
      touch(right, "pointermove", 8, center - bounds.height * 0.6);
      touch(right, "pointerup", 9);
      if (right.dataset.slideAim !== "up") throw new Error("Second finger interrupted upward aim");
      touch(dash, "pointerdown", 10);
      for (let frame = 0; frame < 3; frame++) window.stepGameFrame();
      const speed = el("debugPanel").textContent.match(/vel ([\d.-]+), ([\d.-]+)/);
      if (!speed || Number(speed[1]) <= 0 || Number(speed[2]) >= 0
        || document.querySelector(".dash-meter").getAttribute("aria-valuenow") !== "0") {
        throw new Error("Expected an upward right dash that consumes the charge");
      }
      touch(dash, "pointerup", 10);
      touch(right, "pointermove", 8, center + bounds.height * 0.6);
      if (right.dataset.slideAim !== "down") throw new Error("Downward drag did not change aim");
      const left = document.querySelector('[data-touch="left"]');
      const leftBox = left.getBoundingClientRect();
      right.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", pointerId: 8,
        clientX: leftBox.left + leftBox.width / 2, clientY: center, bubbles: true }));
      if (!left.classList.contains("active") || right.classList.contains("active")) throw new Error("Sliding across the pad should turn without lifting");
      touch(left, "pointerdown", 11);
      touch(right, "pointercancel", 8);
      if (!left.classList.contains("active")) throw new Error("Cancelling a slide released the other thumb");
      touch(left, "pointerup", 11);
      if (right.dataset.slideAim || right.classList.contains("active") || left.classList.contains("active")) throw new Error("Cancelled touch stayed active");
    };
    await browser.evaluate(`(${exercise})()`);
  } finally {
    await browser.removeInitScript(clock);
    await browser.setViewport(1280, 720);
  }
}

async function runGroundRechargeSmoke(browser, baseUrl) {
  await navigateApp(browser, baseUrl, "ground recharge seed");
  await browser.evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.assistMode = "off";
    saved.controlsPreset = "classic";
    saved.keyboardLayout = "pc";
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
  })()`);
  await navigateApp(browser, baseUrl, "ground recharge");
  await clickSelector(browser, "#startButton");
  await waitUntil("ground recharge run starts", () => browser.evaluate(`document.querySelector("#overlay").classList.contains("hidden") && /游戏开始/.test(document.querySelector("#gameStatus").textContent)`));
  await enableDebugPanel(browser);
  const ready = await waitUntil("ground recharge begins from stable full dash", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const recharge = text.match(/recharge ([\\d.]+)/);
    return /ground 1/.test(text) && /dash 1/.test(text) && recharge && Number(recharge[1]) === 0
      ? { text, status: document.querySelector("#gameStatus").textContent }
      : null;
  })()`), 2500);
  await keyHold(browser, "KeyX", "x", 80);
  const active = await waitUntil("ground dash emits one recharge pulse", () => browser.evaluate(`(() => {
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
  const settled = await waitUntil("ground recharge pulse expires", () => browser.evaluate(`(() => {
    const text = document.querySelector("#debugPanel").textContent;
    const recharge = text.match(/recharge ([\\d.]+)/);
    if (!recharge || Number(recharge[1]) !== 0 || !/dash 1/.test(text) || !/ground 1/.test(text)) return null;
    return { recharge: Number(recharge[1]), status: document.querySelector("#gameStatus").textContent, text };
  })()`), 1800, 20);
  await sleep(320);
  const noRepeat = await browser.evaluate(`(() => {
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

async function runFreshEntryImmediateSmoke(browser, baseUrl) {
  await clearGuestProgress(browser);
  const injected = await browser.addInitScript({
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
    await navigateApp(browser, baseUrl, "fresh entry immediate chooser");
    const entry = await browser.evaluate(`(() => {
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
    await browser.evaluate(`document.querySelector("#accountEntryButton").focus()`);
    await keyTap(browser, "Enter", "Enter");
    await waitUntil("Enter on email login opens the account panel without starting", () => browser.evaluate(`
      document.querySelector("#settingsPanel").classList.contains("account-focused")
        && !document.querySelector("#overlay").hidden
    `));
    await keyTap(browser, "Escape", "Escape");
    await waitUntil("Escape returns to the entry chooser", () => browser.evaluate(`
      document.querySelector("#settingsPanel").classList.contains("hidden")
        && !document.querySelector("#entryGate").classList.contains("hidden")
    `));
    const preStartContext = await browser.evaluate(`(() => {
      const canvas = document.querySelector("#game");
      canvas.dispatchEvent(new Event("contextlost", { cancelable: true }));
      window.dispatchEvent(new Event("resize"));
      canvas.dispatchEvent(new Event("contextrestored"));
      return document.querySelector("#gameStatus")?.textContent || "";
    })()`);
    await browser.evaluate(`document.querySelector("#guestEntryButton").focus()`);
    await keyTap(browser, "Space", " ");
    await waitUntil("Space starts a fresh guest after pre-start context restore", () => browser.evaluate(`document.querySelector("#overlay").hidden && document.activeElement.id === "game"`));
    await enableDebugPanel(browser);
    const preStartBeforeMove = await debugPosition(browser);
    await keyHold(browser, "KeyD", "D", 90);
    const preStartAfterMove = await debugPosition(browser);
    if (!/画面已恢复/.test(preStartContext) || preStartAfterMove.x <= preStartBeforeMove.x) {
      errors.push("a context loss before gameplay should restore cleanly before the first start: " + JSON.stringify({ preStartContext, preStartBeforeMove, preStartAfterMove }));
    }
  } finally {
    browser.removeInitScript(injected);
  }
}

async function runCloudSdkRetrySmoke(browser, baseUrl) {
  await clearGuestProgress(browser);
  browser.blockAsset("/vendor/appwrite-26.2.0.js");
  try {
    await navigateApp(browser, baseUrl, "blocked cloud SDK");
    const idle = await waitUntil("guest entry keeps the cloud SDK lazy", () => browser.evaluate(`(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return /打开账号页时再连接/.test(status) && !document.querySelector("#appwriteSdk")
        ? { status, entryVisible: !document.querySelector("#entryGate")?.classList.contains("hidden") }
        : null;
    })()`), 3000);
    await clickSelector(browser, "#accountEntryButton");
    const failed = await waitUntil("blocked cloud SDK exposes retry state", () => browser.evaluate(`(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return /账号页重试/.test(status) && !document.querySelector("#appwriteSdk")
        ? {
            status,
            panelOpen: !document.querySelector("#settingsPanel")?.classList.contains("hidden")
          }
        : null;
    })()`), 5000);
    browser.unblockAssets();
    await browser.evaluate(`(() => {
      const panel = document.querySelector("#settingsPanel");
      if (panel && !panel.classList.contains("hidden")) document.querySelector("#settingsCloseButton")?.click();
      document.querySelector("#accountEntryButton")?.click();
    })()`);
    const recovered = await waitUntil("account drawer retries cloud SDK without refresh", () => browser.evaluate(`(() => {
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
    browser.unblockAssets();
    await browser.evaluate(`(() => {
      sessionStorage.removeItem("summit-spark-entry-mode");
      localStorage.removeItem("summit-spark-account-hint");
    })()`);
  }
}

async function runExpiredAccountHintSmoke(browser, baseUrl) {
  await browser.evaluate(`(() => {
    sessionStorage.removeItem("summit-spark-entry-mode");
    localStorage.setItem("summit-spark-account-hint", "1");
  })()`);
  const injected = await browser.addInitScript({
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
    await navigateApp(browser, baseUrl, "expired account hint");
    const expired = await waitUntil("expired account hint returns to chooser", () => browser.evaluate(`(() => {
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
    browser.removeInitScript(injected);
    await browser.evaluate(`localStorage.removeItem("summit-spark-account-hint")`);
  }
}

async function runAuthenticatedRefreshSmoke(browser, baseUrl) {
  const originalFlow = await browser.evaluate(`(() => {
    sessionStorage.removeItem("summit-spark-entry-mode");
    localStorage.setItem("summit-spark-account-hint", "1");
    const flow = localStorage.getItem("summit-spark-best-flow");
    localStorage.setItem("summit-spark-best-flow", "77");
    return flow;
  })()`);
  const injected = await browser.addInitScript({
    source: `(() => {
      class Client {
        setEndpoint() { return this; }
        setProject() { return this; }
      }
      class Account {
        async get() { return { $id: "smoke-user", email: "signed-in@example.com" }; }
      }
      const nativeSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = (callback, delay, ...args) =>
        nativeSetTimeout(callback, delay === 10000 ? 300 : delay, ...args);
      window.__summitInspectionReads = 0;
      class TablesDB {
        async getRow() {
          const read = ++window.__summitInspectionReads;
          if (read === 1) throw { code: 404, type: "table_not_found", message: "Test table unavailable" };
          if (read === 2) {
            return new Promise((resolve) => { window.__summitLateInspection = resolve; });
          }
          return {
            archive: JSON.stringify({ kind: "summit-spark-save", schemaVersion: 1, storage: {} }),
            $updatedAt: "2026-11-18T00:00:00.000Z"
          };
        }
      }
      window.Appwrite = { Client, Account, TablesDB };
    })();`
  });
  try {
    await navigateApp(browser, baseUrl, "authenticated refresh seed");
    await waitUntil("authenticated session restored", () => browser.evaluate(`(() => (
      document.querySelector("#entryGate")?.classList.contains("hidden")
      && !document.querySelector("#startPanel")?.classList.contains("entry-pending")
      && document.querySelector("#accountEmailLabel")?.textContent === "signed-in@example.com"
    ))()`), 7000);
    await browser.reload();
    await waitForAppReady(browser);
    const refreshed = await waitUntil("authenticated refresh remains past entry chooser", () => browser.evaluate(`(() => {
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
    const failedInspectionPermissions = await waitUntil("failed cloud inspection locks replacement actions", () => browser.evaluate(`(() => {
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
    await clickSelector(browser, "#startSettingsButton");
    await clickSelector(browser, ".settings-group-account > summary");
    await clickSelector(browser, "#cloudRetryButton");
    await waitUntil("a stalled cloud read offers another retry while keeping save choices locked", () => browser.evaluate(`(() => {
      const retry = document.querySelector("#cloudRetryButton");
      return window.__summitInspectionReads === 2
        && !retry.hidden && !retry.disabled
        && /读取超时/.test(document.querySelector("#cloudSyncStatus").textContent)
        && document.querySelector("#cloudUploadButton").disabled
        && document.querySelector("#cloudDownloadButton").disabled;
    })()`));
    await clickSelector(browser, "#cloudRetryButton");
    await waitUntil("cloud retry recovers choices with both saves available and local progress retained", () => browser.evaluate(`(() => {
      const retry = document.querySelector("#cloudRetryButton");
      return window.__summitInspectionReads === 3 && retry.hidden
        && !document.querySelector("#cloudComparison").hidden
        && !document.querySelector("#cloudUploadButton").disabled
        && !document.querySelector("#cloudDownloadButton").disabled
        && localStorage.getItem("summit-spark-best-flow") === "77";
    })()`));
    await browser.evaluate(`window.__summitLateInspection({ archive: "invalid late response" })`);
    await sleep(100);
    if (!await browser.evaluate(`!document.querySelector("#cloudComparison").hidden && !document.querySelector("#cloudDownloadButton").disabled`)) {
      errors.push("cloud read results arriving after timeout must not replace the recovered comparison");
    }
    await clickSelector(browser, "#settingsClose");
  } finally {
    browser.removeInitScript(injected);
    await browser.evaluate(`sessionStorage.removeItem("summit-spark-entry-mode")`);
    await browser.evaluate(`(() => {
      localStorage.removeItem("summit-spark-account-hint");
      const flow = ${JSON.stringify(originalFlow)};
      if (flow === null) localStorage.removeItem("summit-spark-best-flow");
      else localStorage.setItem("summit-spark-best-flow", flow);
    })()`);
  }
}

async function runAccountRestoreTimeoutSmoke(browser, baseUrl) {
  await browser.evaluate(`(() => {
    sessionStorage.removeItem("summit-spark-entry-mode");
    localStorage.setItem("summit-spark-account-hint", "1");
  })()`);
  const injected = await browser.addInitScript({
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
    await navigateApp(browser, baseUrl, "stalled account restore");
    const recovered = await waitUntil("stalled account restore returns to chooser", () => browser.evaluate(`(() => {
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
    await clickSelector(browser, "#accountEntryButton");
    await waitUntil("account drawer opens after restore timeout", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector(".settings-group-account")?.open`));
    await browser.evaluate(`document.querySelector("#accountEmail").value = "pending@example.com"`);
    await clickSelector(browser, "#accountSendCode");
    const busyState = await waitUntil("account form enters unified busy state", () => browser.evaluate(`(() => {
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
    browser.removeInitScript(injected);
    await browser.evaluate(`sessionStorage.removeItem("summit-spark-entry-mode")`);
    await browser.evaluate(`localStorage.removeItem("summit-spark-account-hint")`);
  }
}

async function runRestrictedSessionStorageAuthSmoke(browser, baseUrl) {
  const injected = await browser.addInitScript({
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
          // Keep the mocked request pending while the repeated action arrives.
          await new Promise(resolve => setTimeout(resolve, 150));
          return { userId: "restricted-user", phrase: "MIST-PEAK" };
        }
        async createSession(payload) {
          window.__summitRestrictedAuth.sessions += 1;
          window.__summitRestrictedAuth.sessionPayload = payload;
          await new Promise(resolve => setTimeout(resolve, 150));
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
      ${transactionalTablesMockSource}
      window.Appwrite = {
        Client,
        Account,
        TablesDB: window.__summitTransactionalTables(TablesDB),
        Permission,
        Role,
        ID: { unique: () => "restricted-user" }
      };
    })();`
  });
  try {
    await navigateApp(browser, baseUrl, "restricted session storage auth");
    await waitUntil("blocked session storage falls back to entry chooser", () => browser.evaluate(`!document.querySelector("#entryGate")?.classList.contains("hidden")`), 5000);
    await clickSelector(browser, "#accountEntryButton");
    await waitUntil("restricted storage account drawer opens", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector(".settings-group-account")?.open`));
    await browser.evaluate(`document.querySelector("#accountEmail").value = "restricted@example.com"`);
    await browser.evaluate(`(() => {
      for (let click = 0; click < 2; click++) document.querySelector("#accountSendCode").click();
    })()`);
    const sent = await waitUntil("OTP send remains successful when session storage is blocked", () => browser.evaluate(`(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return window.__summitRestrictedAuth?.sent >= 1 && /验证码已发送/.test(status)
        ? { status, sent: window.__summitRestrictedAuth.sent }
        : null;
    })()`), 5000);
    if (!await browser.evaluate('document.activeElement === document.querySelector("#accountCode")')) {
      throw new Error("The issued OTP should be ready to type into the enabled code field");
    }
    if (sent.sent !== 1) throw new Error("Rapid OTP actions issued " + sent.sent + " requests; expected one");
    await browser.evaluate(`(() => {
      const email = document.querySelector("#accountEmail");
      email.value = "changed@example.com";
      email.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    const invalidated = await waitUntil("changing OTP email invalidates the issued token", () => browser.evaluate(`(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      const code = document.querySelector("#accountCode")?.value || "";
      return /邮箱已更改/.test(status) && !code
        ? { status, code, sessions: window.__summitRestrictedAuth?.sessions || 0 }
        : null;
    })()`));
    await browser.evaluate(`document.querySelector("#accountEmail").value = "restricted@example.com"`);
    await clickSelector(browser, "#accountSendCode");
    await waitUntil("fresh OTP issued after email change", () => browser.evaluate(`window.__summitRestrictedAuth?.sent === 2
      && /验证码已发送/.test(document.querySelector('#accountStatus')?.textContent || '')`));
    await browser.evaluate(`(() => {
      document.querySelector("#accountEmail").value = "autofill-change@example.com";
      document.querySelector("#accountCode").value = "123456";
    })()`);
    await clickSelector(browser, "#accountSubmit");
    const guardedMismatch = await waitUntil("OTP submit rejects an email changed without an input event", () => browser.evaluate(`(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return /邮箱已更改/.test(status)
        ? { status, sessions: window.__summitRestrictedAuth?.sessions || 0 }
        : null;
    })()`));
    await browser.evaluate(`document.querySelector("#accountEmail").value = "restricted@example.com"`);
    await clickSelector(browser, "#accountSendCode");
    await waitUntil("third OTP issued after guarded mismatch", () => browser.evaluate(`window.__summitRestrictedAuth?.sent === 3
      && /验证码已发送/.test(document.querySelector('#accountStatus')?.textContent || '')`));
    await browser.evaluate(`document.querySelector("#accountCode").value = "123456"`);
    await browser.evaluate(`(() => {
      for (let click = 0; click < 2; click++) document.querySelector("#accountSubmit").click();
    })()`);
    const signedIn = await waitUntil("OTP login remains successful when session cleanup is blocked", () => browser.evaluate(`(() => {
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
    browser.removeInitScript(injected);
    await navigateApp(browser, baseUrl, "restricted session storage cleanup");
  }
}

async function runPasswordRecoverySmoke(browser, baseUrl) {
  await browser.evaluate(`sessionStorage.removeItem("summit-spark-entry-mode")`);
  const injected = await browser.addInitScript({
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
    await browser.navigate(recoveryUrl);
    await waitUntil("password recovery navigation", () => browser.evaluate(`location.pathname === "/" && location.search === "?keep=1"`), 7000);
    await waitForAppReady(browser);
    const recoveryState = await waitUntil("password recovery opens focused account drawer", () => browser.evaluate(`(() => {
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
    await browser.evaluate(`document.querySelector("#accountPassword").value = "password123"`);
    await clickSelector(browser, "#accountSubmit");
    const rejectedRecoveryUi = await waitUntil("password recovery explains dictionary rejection", () => browser.evaluate(`(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return /过于常见/.test(status) ? {
        status,
        stillRecovering: document.querySelector("#panelTitle")?.textContent === "设置新密码",
        passwordVisible: getComputedStyle(document.querySelector("#accountPasswordField")).display !== "none"
      } : null;
    })()`), 5000);
    if (!rejectedRecoveryUi.stillRecovering || !rejectedRecoveryUi.passwordVisible) {
      errors.push("a rejected weak password should keep the recovery form active with a precise explanation: " + JSON.stringify(rejectedRecoveryUi));
    }
    await browser.evaluate(`document.querySelector("#accountPassword").value = "updated-password"`);
    await clickSelector(browser, "#accountSubmit");
    const updated = await waitUntil("password recovery completes", () => browser.evaluate(`(() => {
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
      errors.push("completed recovery should use the captured token once and restore the regular login form");
    }
  } finally {
    browser.removeInitScript(injected);
    await browser.evaluate(`sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runCloudSyncExitGuardSmoke(browser, baseUrl) {
  await browser.evaluate(`sessionStorage.setItem("summit-spark-entry-mode", "account")`);
  const injected = await browser.addInitScript({
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
      ${transactionalTablesMockSource}
      window.Appwrite = { Client, Account, TablesDB: window.__summitTransactionalTables(TablesDB), Permission, Role };
    })();`
  });
  try {
    await navigateApp(browser, baseUrl, "cloud sync exit guard");
    const initialSync = await waitUntil("first cloud sync completes", () => browser.evaluate(`(() => {
      const mock = window.__summitCloudMock;
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      return mock?.upserts >= 1 && summary === "已同步" ? { upserts: mock.upserts, summary } : null;
    })()`), 7000);
    await clickSelector(browser, "#startSettingsButton");
    await openSettingsGroup(browser, ".settings-group-account");
    const accountLayout = await browser.evaluate(`(() => {
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
    await clickSelector(browser, "#settingsClose");
    await browser.evaluate(`(() => {
      const toggle = document.querySelector("#audioToggle");
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      window.dispatchEvent(new Event("pagehide"));
    })()`);
    const flushed = await waitUntil("pagehide flushes pending cloud save", () => browser.evaluate(`(() => {
      const mock = window.__summitCloudMock;
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      return mock?.upserts > ${initialSync.upserts} && summary === "已同步" ? { upserts: mock.upserts, summary } : null;
    })()`), 5000);
    const slowUploadTarget = await browser.evaluate(`(() => {
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
    const heldUpload = await waitUntil("first slow cloud upload remains in flight", () => browser.evaluate(`(() => {
      const mock = window.__summitCloudMock;
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      return mock?.pendingWrite && summary === "同步中"
        ? { upserts: mock.upserts, summary }
        : null;
    })()`), 5000);
    const queuedDuringUpload = await browser.evaluate(`(() => {
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
    await browser.evaluate(`(() => {
      const mock = window.__summitCloudMock;
      const pending = mock.pendingWrite;
      mock.pendingWrite = null;
      mock.holdWrites = false;
      pending.resolve({ $updatedAt: new Date().toISOString() });
    })()`);
    const followupUpload = await waitUntil("queued change receives a follow-up cloud upload", () => browser.evaluate(`(() => {
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
    await clickSelector(browser, "#startAccountButton");
    await waitUntil("account drawer opens for password busy queue", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector(".settings-group-account")?.open`));
    await browser.evaluate(`document.querySelector("#accountNewPassword").value = "queue-password-157"`);
    await clickSelector(browser, "#accountSetPassword");
    await waitUntil("password update remains in flight", () => browser.evaluate(`window.__summitCloudMock?.pendingPassword && document.querySelector(".settings-group-account")?.getAttribute("aria-busy") === "true"`));
    await clickSelector(browser, "#settingsClose");
    const queuedSettings = await browser.evaluate(`(() => {
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
    if (queuedSettings.summary !== "待同步") {
      errors.push("local progress during password update should remain visibly queued: " + JSON.stringify(queuedSettings));
    }
    await sleep(120);
    const stagedWriteCount = await browser.evaluate(`window.__summitCloudMock?.upserts || 0`);
    if (stagedWriteCount !== queuedSettings.before) {
      errors.push("password update and cloud save must not write concurrently: " + JSON.stringify({ queuedSettings, stagedWriteCount }));
    }
    await browser.evaluate(`(() => {
      const mock = window.__summitCloudMock;
      const pending = mock.pendingPassword;
      mock.pendingPassword = null;
      pending.resolve({});
    })()`);
    const resumedSync = await waitUntil("cloud sync resumes after password update", () => browser.evaluate(`(() => {
      const mock = window.__summitCloudMock;
      if (!mock || mock.upserts <= ${queuedSettings.before}) return null;
      const archive = JSON.parse(mock.lastPayload?.data?.archive || "{}");
      const audioEnabled = archive.storage?.settings?.audioEnabled;
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      return audioEnabled === ${JSON.stringify(queuedSettings.audioEnabled)} && summary === "已同步"
        ? { upserts: mock.upserts, audioEnabled, summary }
        : null;
    })()`), 5000);
    if (resumedSync.upserts <= queuedSettings.before || resumedSync.audioEnabled !== queuedSettings.audioEnabled) {
      errors.push("a local change made during password update must resume cloud sync after account busy clears: " + JSON.stringify({ queuedSettings, resumedSync }));
    }
    await browser.evaluate(`(() => {
      const backend = window.__summitCloudBackend;
      const remote = JSON.parse(backend.committedRow.archive);
      remote.storage.profile.summitClears = 9;
      backend.setRemote({ archive: JSON.stringify(remote), $updatedAt: "2030-01-01T00:00:00.000Z" });
      const toggle = document.querySelector("#audioToggle");
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      window.dispatchEvent(new Event("pagehide"));
    })()`);
    const accountAlreadyOpen = await browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector(".settings-group-account").open`);
    if (!accountAlreadyOpen) await clickSelector(browser, "#startAccountButton");
    const conflict = await waitUntil("external device update pauses automatic sync", () => browser.evaluate(`(() => {
      const status = document.querySelector("#accountStatus")?.textContent || "";
      if (!/另一设备/.test(status)) return null;
      return {
        remoteClears: JSON.parse(window.__summitCloudBackend.committedRow.archive).storage.profile.summitClears,
        localClears: JSON.parse(localStorage.getItem("summit-spark-profile") || "{}").summitClears || 0,
        summary: document.querySelector("#accountSummary")?.textContent,
        uploadEnabled: !document.querySelector("#cloudUploadButton").disabled,
        downloadEnabled: !document.querySelector("#cloudDownloadButton").disabled
      };
    })()`), 5000);
    if (conflict.remoteClears !== 9 || conflict.localClears === 9 || conflict.summary !== "待确认" || !conflict.uploadEnabled || !conflict.downloadEnabled) {
      errors.push("external cloud update must preserve both saves and require a choice: " + JSON.stringify(conflict));
    }
    // Even an explicit upload must reject a version changed after it was shown.
    await browser.evaluate(`(() => {
      const backend = window.__summitCloudBackend;
      const remote = JSON.parse(backend.committedRow.archive);
      remote.storage.profile.summitClears = 10;
      backend.setRemote({ archive: JSON.stringify(remote), $updatedAt: "2030-01-02T00:00:00.000Z" });
    })()`);
    await clickSelector(browser, "#cloudUploadButton");
    await waitUntil("stale explicit choice is rejected", () => browser.evaluate(`document.querySelector(".settings-group-account").getAttribute("aria-busy") === "false" && /另一设备/.test(document.querySelector("#accountStatus").textContent)`));
    const preserved = await browser.evaluate(`JSON.parse(window.__summitCloudBackend.committedRow.archive).storage.profile.summitClears`);
    if (preserved !== 10) errors.push("explicit upload must not bypass the remote version guard");
    await clickSelector(browser, "#cloudUploadButton");
    await waitUntil("fresh explicit choice resumes cloud sync", () => browser.evaluate(`document.querySelector("#accountSummary").textContent === "已同步"`));
    await clickSelector(browser, "#settingsClose");
    await waitUntil("conflict account panel closes", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`));
    await browser.evaluate(`(() => {
      const toggle = document.querySelector("#audioToggle");
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      window.__summitCloudMock.failWrites = true;
    })()`);
    await clickSelector(browser, "#startAccountButton");
    await waitUntil("account drawer opens for guarded logout", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector(".settings-group-account")?.open`));
    await clickSelector(browser, "#accountLogout");
    const guarded = await waitUntil("failed final sync prevents logout", () => browser.evaluate(`(() => {
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
    browser.removeInitScript(injected);
    await browser.evaluate(`sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runLargeCloudArchiveSmoke(browser, baseUrl) {
  await browser.evaluate(`(() => {
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
  const injected = await browser.addInitScript({
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
      ${transactionalTablesMockSource}
      window.Appwrite = { Client, Account, TablesDB: window.__summitTransactionalTables(TablesDB), Permission, Role };
    })();`
  });
  try {
    await navigateApp(browser, baseUrl, "large cloud archive");
    const largeArchive = await waitUntil("large cloud archive uploads intact", () => browser.evaluate(`(() => {
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
    await clickSelector(browser, "#startSettingsButton");
    await openSettingsGroup(browser, ".settings-group-feedback");
    await browser.evaluate(`(() => {
      const input = document.querySelector("#saveImportText");
      input.value = "";
      input.focus();
    })()`);
    const largeArchiveText = await browser.evaluate(`window.__summitLargeArchiveText || ""`);
    await browser.insertText(largeArchiveText);
    const realisticImport = await waitUntil("large archive accepts real text input", () => browser.evaluate(`(() => {
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
    browser.removeInitScript(injected);
    await browser.evaluate(`(() => {
      sessionStorage.removeItem("summit-spark-entry-mode");
      localStorage.removeItem("summit-spark-room-paths");
    })()`);
  }
}

async function runCloudLogoutInspectionRaceSmoke(browser, baseUrl) {
  await browser.evaluate(`sessionStorage.setItem("summit-spark-entry-mode", "account")`);
  const injected = await browser.addInitScript({
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
    await navigateApp(browser, baseUrl, "cloud logout inspection race");
    const pendingInspection = await waitUntil("cloud inspection remains pending after session restore", () => browser.evaluate(`(() => {
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
    await clickSelector(browser, "#startAccountButton");
    await waitUntil("account drawer opens during pending cloud inspection", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && !document.querySelector("#accountUser")?.classList.contains("hidden") && document.activeElement === document.querySelector("#settingsClose")`));
    await clickSelector(browser, "#accountLogout");
    const loggedOut = await waitUntil("logout completes before cloud inspection", () => browser.evaluate(`(() => {
      const race = window.__summitCloudRace;
      const summary = document.querySelector("#accountSummary")?.textContent || "";
      const cloud = document.querySelector("#cloudSyncStatus")?.textContent || "";
      const status = document.querySelector("#accountStatus")?.textContent || "";
      return race?.deletes === 1 && summary === "未登录" && cloud === "未登录" && /已退出/.test(status)
        ? { summary, cloud, status, userHidden: document.querySelector("#accountUser")?.classList.contains("hidden") }
        : null;
    })()`), 5000);
    await browser.evaluate(`window.__summitCloudRace.resolveRow({ archive: "{}", $updatedAt: new Date().toISOString() })`);
    await sleep(180);
    const afterLateInspection = await browser.evaluate(`({
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
    browser.removeInitScript(injected);
    await browser.evaluate(`sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runCorruptCloudPermissionsSmoke(browser, baseUrl) {
  await browser.evaluate(`sessionStorage.setItem("summit-spark-entry-mode", "account")`);
  const injected = await browser.addInitScript({
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
    await navigateApp(browser, baseUrl, "corrupt cloud permissions");
    const corruptPermissions = await waitUntil("corrupt cloud archive exposes only repair upload", () => browser.evaluate(`(() => {
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
    browser.removeInitScript(injected);
    await browser.evaluate(`sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runCloudConflictGuardSmoke(browser, baseUrl) {
  await browser.evaluate(`sessionStorage.setItem("summit-spark-entry-mode", "account")`);
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
  const injected = await browser.addInitScript({
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
      await browser.evaluate(`(() => { localStorage.clear(); ${conflictCase.seed}; })()`);
      await navigateApp(browser, baseUrl, `cloud conflict ${conflictCase.name}`);
      const guarded = await waitUntil(`cloud conflict preserves ${conflictCase.name}`, () => browser.evaluate(`(() => {
        const status = document.querySelector("#accountStatus")?.textContent || "";
        if (!/请选择/.test(status)) return null;
        return {
          status,
          summary: document.querySelector("#accountSummary")?.textContent || "",
          localPreserved: Boolean(${conflictCase.probe}),
          remoteNotApplied: (JSON.parse(localStorage.getItem("summit-spark-profile") || "{}").summitClears || 0) === 0,
          comparisonVisible: !document.querySelector("#cloudComparison").hidden,
          local: document.querySelector("#localSaveSummary").textContent,
          remote: document.querySelector("#remoteSaveSummary").textContent,
          choiceHelp: document.querySelector("#cloudChoiceHelp").textContent,
          uploadEnabled: !document.querySelector("#cloudUploadButton")?.disabled,
          downloadEnabled: !document.querySelector("#cloudDownloadButton")?.disabled
        };
      })()`), 7000);
      if (!guarded.localPreserved || !guarded.remoteNotApplied || guarded.summary !== "待确认" || !guarded.uploadEnabled || !guarded.downloadEnabled
        || !guarded.comparisonVisible || !/登顶 0 次/.test(guarded.local) || !/登顶 1 次/.test(guarded.remote)
        || !/覆盖云端.*替换本机/.test(guarded.choiceHelp)) {
        errors.push(`cloud conflict must preserve ${conflictCase.name} local data instead of treating it as empty: ` + JSON.stringify(guarded));
      }
    }
  } finally {
    browser.removeInitScript(injected);
    await browser.evaluate(`sessionStorage.removeItem("summit-spark-entry-mode")`);
  }
}

async function runPracticeRecommendationIntegrationSmoke(browser, baseUrl) {
  await browser.setViewport(1280, 720);
  await navigateApp(browser, baseUrl, "practice recommendation seed");
  await browser.evaluate(`(() => {
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
  await navigateApp(browser, baseUrl, "practice recommendation reload");

  const startRecommendation = await waitUntil("start resume exposes the Focus-led recommendation", () => browser.evaluate(`(() => {
    const button = document.querySelector("#resumeTrainingButton");
    if (!button || button.classList.contains("hidden")) return null;
    return { text: button.textContent.trim(), ariaHidden: button.getAttribute("aria-hidden") };
  })()`));
  if (startRecommendation.text !== "继续训练 · R3 Style" || startRecommendation.ariaHidden !== "false") {
    errors.push("start resume should expose the shared Focus-led R3 Style recommendation: " + JSON.stringify(startRecommendation));
  }

  await clickSelector(browser, "#openTrainingButton");
  await waitUntil("recommendation practice panel opens", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  const next = await browser.evaluate(`(() => {
    const label = document.querySelector("#nextPracticeLabel");
    return { text: label.textContent, visible: label.getBoundingClientRect().height > 0 };
  })()`);
  if (!next.visible || next.text !== "下一项 · R3 Style") errors.push("collapsed Practice should advertise its next recommended drill");
  await openSettingsGroup(browser, ".settings-group-plan");
  await openSettingsGroup(browser, ".settings-group-training");
  await openSettingsGroup(browser, ".practice-subgroup-advanced");
  const surfaces = await waitUntil("all recommendation surfaces render from the seeded evidence", () => browser.evaluate(`(() => {
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

  await clickSelector(browser, "#settingsClose");
  await clickSelector(browser, "#resumeTrainingButton");
  const launched = await waitUntil("shared recommendation launches the exact R3 Style Drill", () => browser.evaluate(`(() => {
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

async function runResumeSmoke(browser, baseUrl) {
  await browser.setViewport(1280, 720);
  await navigateApp(browser, baseUrl, "direct resume seed");
  await browser.evaluate(`(() => {
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
  await navigateApp(browser, baseUrl, "direct resume reload");
  const startState = await browser.evaluate(`({
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
  await clickSelector(browser, "#resumeTrainingButton");
  await waitUntil("resume training starts drill", () => browser.evaluate(`/Drill/.test(document.querySelector("#gameStatus").textContent) && document.querySelector("#overlay").classList.contains("hidden")`), 5000);
}

async function runKeyboardSettingsSmoke(browser, baseUrl) {
  await browser.setViewport(1280, 720);
  await navigateApp(browser, baseUrl, "keyboard settings");
  await browser.evaluate(`localStorage.clear()`);
  await navigateApp(browser, baseUrl, "keyboard settings clean");

  await keyTap(browser, "KeyO", "O");
  await waitUntil("settings opens from keyboard O", () => browser.evaluate(`(() => {
    const panel = document.querySelector("#settingsPanel");
    const button = document.querySelector("#settingsButton");
    return !panel.classList.contains("hidden") && button.getAttribute("aria-expanded") === "true" && document.activeElement === document.querySelector("#settingsClose");
  })()`), 3500);

  await openSettingsGroup(browser, ".settings-group-feedback");
  await clickSelector(browser, "#feedbackNote");
  await keyTap(browser, "KeyO", "O");
  const textEntryState = await waitUntil("feedback textarea keeps O input local", () => browser.evaluate(`(() => {
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

  await keyTap(browser, "Escape", "Escape");
  await waitUntil("settings closes from keyboard Escape", () => browser.evaluate(`(() => {
    const panel = document.querySelector("#settingsPanel");
    const button = document.querySelector("#settingsButton");
    return panel.classList.contains("hidden") && button.getAttribute("aria-expanded") === "false" && document.activeElement === document.querySelector("#startButton");
  })()`), 3500);

  await clickSelector(browser, "#startSettingsButton");
  await waitUntil("pointer-opened settings focuses close", () => browser.evaluate(`document.activeElement === document.querySelector("#settingsClose")`), 3500);
  await openSettingsGroup(browser, ".settings-group-audio");
  await clickSelector(browser, "#audioTestButton");
  await waitUntil("modal action keeps focus inside panel", () => browser.evaluate(`document.querySelector("#settingsPanel").contains(document.activeElement)`), 3500);
  await browser.evaluate(`(() => {
    const panel = document.querySelector("#settingsPanel");
    const visible = [...panel.querySelectorAll("button, select, input, textarea, summary, [tabindex]")].filter((element) => element.getClientRects().length > 0 && !element.disabled && element.getAttribute("tabindex") !== "-1" && element.getAttribute("aria-hidden") !== "true");
    visible[visible.length - 1]?.focus();
  })()`);
  await keyTap(browser, "Tab", "Tab");
  await sleep(120);
  const focusWrapState = await browser.evaluate(`(() => {
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
  await keyTap(browser, "Escape", "Escape");
  await waitUntil("pointer opener regains focus", () => browser.evaluate(`document.activeElement === document.querySelector("#startSettingsButton")`), 3500);

  await keyTap(browser, "KeyO", "O");
  await waitUntil("settings reopens from keyboard O", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden")`), 3500);
  await keyTap(browser, "KeyO", "O");
  await waitUntil("settings toggles closed from keyboard O", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`), 3500);
  await keyTap(browser, "KeyP", "P");
  await waitUntil("practice opens from keyboard P", () => browser.evaluate(`(() => {
    const panel = document.querySelector("#settingsPanel");
    const button = document.querySelector("#practiceButton");
    return !panel.classList.contains("hidden") && panel.classList.contains("mode-practice") && button.getAttribute("aria-expanded") === "true";
  })()`), 3500);
  await keyTap(browser, "KeyP", "P");
  await waitUntil("practice toggles closed from keyboard P", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`), 3500);
  await clickSelector(browser, "#startSettingsButton");
  await openSettingsGroup(browser, ".settings-group-controls");
  await clickSelector(browser, '[data-preset-choice="classic"]');
  await clickSelector(browser, "#settingsClose");
  await browser.evaluate(`document.querySelector("#startButton").focus()`);
  await keyTap(browser, "Enter", "Enter");
  await waitUntil("classic preset shows current keys with idle gamepad connected", () => browser.evaluate(`(() => {
    const guide = document.querySelector("#openingGuide");
    const style = getComputedStyle(guide);
    return !guide.hidden
      && parseFloat(style.fontSize) >= 13
      && document.querySelector("#game").getAttribute("aria-describedby") === guide.id
      && Array.from(document.querySelectorAll("#openingGuideControls kbd"), cap => cap.textContent).at(-1) === "C";
  })()`));
  await sleep(3800);
  const stillReading = await browser.evaluate(`!document.querySelector("#openingGuide").hidden && document.querySelector("#runTime").textContent === "0:00.00"`);
  if (!stillReading) errors.push("first-time players should be able to read the guide before starting the run clock");

  await browser.evaluate(`window.__summitMockPadState.axes[0] = 1`);
  await waitUntil("first gamepad action updates the guide", () => browser.evaluate(`document.querySelector("#openingGuideControls kbd").textContent === "左摇杆"`));
  await browser.evaluate(`window.__summitMockPadState.axes[0] = 0`);
  await keyTap(browser, "KeyC", "c");
  await waitUntil("keyboard action restores the classic guide", () => browser.evaluate(`/C 跳跃/.test(document.querySelector("#openingGuideControls").textContent)`));
  await sleep(3800);
  if (await browser.evaluate('document.querySelector("#openingGuide").hidden')) errors.push("the first landing lesson should survive a jump at spawn");
  await keyTap(browser, "KeyR", "r");
  await waitUntil("retry keeps the first landing lesson", () => browser.evaluate('!document.querySelector("#openingGuide").hidden'));

}

async function runAssistModeSmoke(browser, baseUrl) {
  await browser.setViewport(1280, 720);
  await navigateApp(browser, baseUrl, "assist mode");
  await browser.evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("summit-spark-best-flow", "1");
  })()`);
  await navigateApp(browser, baseUrl, "assist mode clean");
  await clickSelector(browser, "#startSettingsButton");
  await openSettingsGroup(browser, ".settings-group-display");
  const enabled = await browser.evaluate(`(() => {
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
  await clickSelector(browser, "#settingsClose");
  await clickSelector(browser, "#startButton");
  const focusBefore = await browser.evaluate(`localStorage.getItem("summit-spark-room-focus")`);
  await keyTap(browser, "KeyX", "x");
  await keyTap(browser, "KeyR", "r");
  await sleep(220);
  const isolated = await browser.evaluate(`({
    bestFlow: localStorage.getItem("summit-spark-best-flow"),
    roomFocus: localStorage.getItem("summit-spark-room-focus"),
    assistMode: JSON.parse(localStorage.getItem("summit-spark-settings") || "{}").assistMode,
    stageClass: document.querySelector(".stage")?.classList.contains("assist-active")
  })`);
  if (isolated.bestFlow !== "1" || isolated.roomFocus !== focusBefore || isolated.assistMode !== "gentle" || !isolated.stageClass) {
    errors.push("assisted movement and retries must not replace Flow or room-focus records: " + JSON.stringify({ ...isolated, focusBefore }));
  }
}

async function runTrainingInterruptionSmoke(browser, baseUrl) {
  await browser.setViewport(1280, 720);
  await navigateApp(browser, baseUrl, "route interruption seed");
  await browser.evaluate(`localStorage.clear()`);
  await navigateApp(browser, baseUrl, "route interruption clean");

  await clickSelector(browser, "#openTrainingButton");
  await waitUntil("route interruption practice open", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-training");
  await openSettingsGroup(browser, ".practice-subgroup-route");
  await clickSelector(browser, "[data-route-contract]");
  await waitUntil("route contract starts before interruption", () => browser.evaluate(`/航线|稳定航线|节奏航线|高手航线/.test(document.querySelector("#gameStatus").textContent)`), 5000);
  await clickSelector(browser, "#practiceButton");
  await waitUntil("practice open during route contract", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-room");
  await clickSelector(browser, "#drillCleanButton");
  await waitUntil("plain drill interrupts route contract", () => browser.evaluate(`/Drill/.test(document.querySelector("#gameStatus").textContent) && document.querySelector("#settingsPanel").classList.contains("hidden")`), 5000);
  await clickSelector(browser, "#practiceButton");
  await waitUntil("practice reopened after route interruption", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-training");
  await openSettingsGroup(browser, ".practice-subgroup-route");
  const routeInterrupted = await browser.evaluate(`(() => {
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
  await clickSelector(browser, "[data-route-resume]");
  await waitUntil("route contract resumes from interrupted card", () => browser.evaluate(`/航线|稳定航线|节奏航线|高手航线/.test(document.querySelector("#gameStatus").textContent) && document.querySelector("#settingsPanel").classList.contains("hidden")`), 5000);

  await navigateApp(browser, baseUrl, "feel interruption seed");
  await browser.evaluate(`localStorage.clear()`);
  await navigateApp(browser, baseUrl, "feel interruption clean");
  await clickSelector(browser, "#openTrainingButton");
  await waitUntil("feel interruption practice open", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-training");
  await openSettingsGroup(browser, ".practice-subgroup-feel");
  await clickSelector(browser, "[data-feel-fixture]");
  await waitUntil("feel fixture starts before interruption", () => browser.evaluate(`/手感校准/.test(document.querySelector("#gameStatus").textContent)`), 5000);
  await clickSelector(browser, "#practiceButton");
  await waitUntil("practice open during feel fixture", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-room");
  await clickSelector(browser, "#drillPaceButton");
  await waitUntil("plain drill interrupts feel fixture", () => browser.evaluate(`/Drill/.test(document.querySelector("#gameStatus").textContent) && document.querySelector("#settingsPanel").classList.contains("hidden")`), 5000);
  await clickSelector(browser, "#practiceButton");
  await waitUntil("practice reopened after feel interruption", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  const feelInterrupted = await browser.evaluate(`(() => {
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

async function runSaveArchiveSmoke(browser, baseUrl) {
  await browser.setViewport(1280, 720);
  await navigateApp(browser, baseUrl, "save archive clean");
  await browser.evaluate(`localStorage.clear()`);
  await navigateApp(browser, baseUrl, "save archive ready");
  await clickSelector(browser, "#startSettingsButton");
  await waitUntil("save archive settings open", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  await openSettingsGroup(browser, ".settings-group-feedback");
  await clickSelector(browser, "#saveExportButton");
  const exported = await waitUntil("save archive export", () => browser.evaluate(`(() => {
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
  await waitUntil("save archive export status", () => browser.evaluate(`/存档/.test(document.querySelector("#gameStatus")?.textContent || "")`), 5000);
  await browser.evaluate(`(() => {
    const input = document.querySelector("#saveImportText");
    input.value = "{bad json";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  const invalidPreview = await browser.evaluate(`(() => ({
    text: document.querySelector("#saveImportStatus")?.textContent || "",
    error: document.querySelector("#saveImportStatus")?.classList.contains("error") || false
  }))()`);
  if (!invalidPreview.error || !/JSON/.test(invalidPreview.text)) errors.push("invalid save JSON should show import preview error: " + JSON.stringify(invalidPreview));
  await clickSelector(browser, "#saveImportButton");
  await sleep(360);
  const invalidImport = await browser.evaluate(`(() => ({
    ready: document.documentElement.classList.contains("app-ready"),
    status: document.querySelector("#gameStatus")?.textContent || "",
    text: document.querySelector("#saveImportStatus")?.textContent || "",
    stillOpen: !document.querySelector("#settingsPanel").classList.contains("hidden")
  }))()`);
  if (!invalidImport.ready || !invalidImport.stillOpen || !/导入失败/.test(invalidImport.status) || !/JSON/.test(invalidImport.text)) {
    errors.push("invalid save import should fail in place without reload: " + JSON.stringify(invalidImport));
  }
  await browser.evaluate(`(() => {
    const input = document.querySelector("#saveImportText");
    input.value = JSON.stringify({ kind: "other-save", storage: {} });
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  const wrongKindPreview = await browser.evaluate(`(() => ({
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
  await browser.evaluate(`(() => {
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
  await clickSelector(browser, "#saveImportButton");
  await sleep(360);
  const atomicFailure = await browser.evaluate(`(() => {
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
  await browser.evaluate(`(() => {
    const input = document.querySelector("#saveImportText");
    input.value = ${JSON.stringify(JSON.stringify(importArchive))};
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  const validPreview = await browser.evaluate(`(() => ({
    text: document.querySelector("#saveImportStatus")?.textContent || "",
    valid: document.querySelector("#saveImportStatus")?.classList.contains("valid") || false
  }))()`);
  if (!validPreview.valid || !/browser-smoke/.test(validPreview.text) || !/触控 62px/.test(validPreview.text)) {
    errors.push("valid save archive should show a useful import preview: " + JSON.stringify(validPreview));
  }
  await clickSelector(browser, "#saveImportButton");
  await sleep(980);
  await waitForAppReady(browser);
  const imported = await browser.evaluate(`(() => {
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
  await clickSelector(browser, "#openTrainingButton");
  await waitUntil("Practice opens for full-route Flow evidence", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  await openSettingsGroup(browser, ".settings-group-training");
  await openSettingsGroup(browser, ".practice-subgroup-profile");
  await openSettingsGroup(browser, ".practice-subgroup-advanced");
  const fullRouteFlowEvidence = await browser.evaluate(`(() => {
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
  await clickSelector(browser, "#settingsClose");
  await waitUntil("Practice closes after full-route Flow evidence check", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await clickSelector(browser, "#startSettingsButton");
  await waitUntil("settings opens for backup restore", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  await openSettingsGroup(browser, ".settings-group-feedback");
  const restoreReady = await browser.evaluate(`(() => ({
    disabled: document.querySelector("#saveRestoreButton")?.disabled || false,
    backupText: document.querySelector("#saveBackupStatus")?.textContent || ""
  }))()`);
  if (restoreReady.disabled || !/可恢复/.test(restoreReady.backupText)) errors.push("save backup restore should be available after import: " + JSON.stringify(restoreReady));
  await clickSelector(browser, "#saveRestoreButton");
  await sleep(980);
  await waitForAppReady(browser);
  const restored = await browser.evaluate(`(() => {
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

async function runVisualRegressionSmoke(browser, baseUrl) {
  await browser.setViewport(360, 640, { mobile: true });
  await navigateApp(browser, baseUrl, "mobile visual");
  await clickSelector(browser, "#startSettingsButton");
  await waitUntil("visual settings open", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  const visual = await browser.evaluate(`(() => {
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

async function runCanvasDensitySmoke(browser, baseUrl) {
  await browser.setViewport(960, 640, { pixelRatio: 2 });
  await navigateApp(browser, baseUrl, "high-DPI canvas");
  await browser.evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem("summit-spark-settings") || "{}");
    saved.lowPerformance = false;
    localStorage.setItem("summit-spark-settings", JSON.stringify(saved));
    location.reload();
  })()`);
  await waitForAppReady(browser);

  const normal = await browser.evaluate(`(() => {
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

  await clickSelector(browser, "#startSettingsButton");
  await waitUntil("high-DPI settings open", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await openSettingsGroup(browser, ".settings-group-display");
  await clickSelector(browser, "#lowPerformanceToggle");
  const reduced = await waitUntil("low-performance canvas buffer", () => browser.evaluate(`(() => {
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

  await clickSelector(browser, "#lowPerformanceToggle");
  const restored = await waitUntil("restored high-DPI canvas buffer", () => browser.evaluate(`(() => {
    const canvas = document.querySelector("#game");
    return canvas.width === ${normal.width} && canvas.height === ${normal.height}
      ? { width: canvas.width, height: canvas.height, enabled: document.querySelector("#lowPerformanceToggle").checked }
      : null;
  })()`));
  if (restored.enabled) errors.push("normal high-DPI canvas should be restored after disabling low-performance mode");
}

async function runRestartSoakSmoke(browser, baseUrl) {
  await browser.setViewport(1280, 720);
  await navigateApp(browser, baseUrl, "restart soak");
  await clickSelector(browser, await visibleStartSelector(browser));
  await waitUntil("restart soak game start", () => browser.evaluate(`document.querySelector("#overlay").classList.contains("hidden")`));
  await enableDebugPanel(browser);
  let last = await debugPosition(browser);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    await keyTap(browser, "KeyR", "R");
    const state = await waitUntil(`restart soak ${attempt + 1}`, () => browser.evaluate(`(() => {
      const status = document.querySelector("#gameStatus")?.textContent || "";
      const text = document.querySelector("#debugPanel")?.textContent || "";
      const dead = text.match(/dead ([\\d.]+)/);
      const overlap = text.match(/overlap (\\d+)/);
      return /快速重开/.test(status) && dead && Number(dead[1]) === 0 && overlap && Number(overlap[1]) === 0
        ? { status, text }
        : null;
    })()`), 3000, 40);
    const current = await debugPosition(browser);
    if (!Number.isFinite(current.x) || !Number.isFinite(current.y)) {
      errors.push("repeated quick retries should retain finite player coordinates: " + JSON.stringify({ attempt, state, current }));
      break;
    }
    await keyHold(browser, "KeyD", "D", 90);
    const moved = await debugPosition(browser);
    if (moved.x - current.x < 1) {
      errors.push("player should accept movement immediately after repeated retry: " + JSON.stringify({ attempt, current, moved }));
      break;
    }
    last = moved;
  }
  await browser.evaluate(`window.dispatchEvent(new CustomEvent("summit-spark:test-action", { detail: "corruptMotion" }))`);
  const selfHealed = await waitUntil("non-finite runtime state self-heals", () => browser.evaluate(`(() => {
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
  await keyHold(browser, "KeyD", "D", 90);
  const afterSelfHealMove = await debugPosition(browser);
  if (afterSelfHealMove.x - selfHealed.x < 1) {
    errors.push("a self-healed runtime should accept movement immediately: " + JSON.stringify({ selfHealed, afterSelfHealMove }));
  }
  await browser.evaluate(`window.dispatchEvent(new CustomEvent("summit-spark:test-action", { detail: "corruptStructure" }))`);
  let structureHealed;
  try {
    structureHealed = await waitUntil("damaged runtime collections self-heal", () => browser.evaluate(`(() => {
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
    await keyHold(browser, "KeyD", "D", 90);
    const afterStructureHealMove = await debugPosition(browser);
    if (afterStructureHealMove.x - structureHealed.x < 1) {
      errors.push("a structurally self-healed runtime should accept movement immediately: " + JSON.stringify({ structureHealed, afterStructureHealMove }));
    }
  } catch (error) {
    const probe = await debugPosition(browser);
    const runtimeErrors = await browser.evaluate(`window.__summitEarlyRuntimeErrors || []`);
    errors.push(`damaged runtime collections probe failed: ${error.message}: ${JSON.stringify({ probe, runtimeErrors })}`);
  }
  await browser.evaluate(`window.dispatchEvent(new CustomEvent("summit-spark:test-action", { detail: "throwFrame" }))`);
  const frameBoundary = await waitUntil("thrown frame boundary remains recoverable", () => browser.evaluate(`(() => {
    const status = document.querySelector("#gameStatus")?.textContent || "";
    const text = document.querySelector("#debugPanel")?.textContent || "";
    return /运行状态异常/.test(status) && /faults 1/.test(text) ? { status, text } : null;
  })()`), 3000, 30);
  await keyTap(browser, "KeyR", "R");
  const afterFrameBoundary = await waitUntil("retry after thrown frame boundary", () => browser.evaluate(`(() => {
    const status = document.querySelector("#gameStatus")?.textContent || "";
    const text = document.querySelector("#debugPanel")?.textContent || "";
    const position = text.match(/pos ([\\d.-]+), ([\\d.-]+)/);
    const dead = text.match(/dead ([\\d.]+)/);
    return /快速重开/.test(status) && position && dead && Number(dead[1]) === 0
      ? { status, x: Number(position[1]), y: Number(position[2]), text }
      : null;
  })()`), 3000, 30);
  await keyHold(browser, "KeyD", "D", 90);
  const afterFrameBoundaryMove = await debugPosition(browser);
  if (afterFrameBoundaryMove.x - afterFrameBoundary.x < 1) {
    errors.push("retry after a thrown frame should restore movement: " + JSON.stringify({ frameBoundary, afterFrameBoundary, afterFrameBoundaryMove }));
  }
  const contextLoss = await browser.evaluate(`(() => {
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
  const contextRestored = await browser.evaluate(`(() => {
    const canvas = document.querySelector("#game");
    canvas.dispatchEvent(new Event("contextrestored"));
    return document.querySelector("#gameStatus")?.textContent || "";
  })()`);
  const afterContextRestore = await waitUntil("canvas context restoration", () => browser.evaluate(`(() => {
    const status = document.querySelector("#gameStatus")?.textContent || "";
    const debug = document.querySelector("#debugPanel")?.textContent || "";
    return /画面已恢复/.test(status) && /canvas 1/.test(debug) ? { status, debug } : null;
  })()`), 3000, 30);
  await keyHold(browser, "KeyD", "D", 90);
  const afterContextRestoreMove = await debugPosition(browser);
  if (afterContextRestoreMove.x <= afterFrameBoundaryMove.x) {
    errors.push("movement should resume after canvas context restoration: " + JSON.stringify({ contextRestored, afterContextRestore, afterContextRestoreMove }));
  }
  const runtimeErrors = await browser.evaluate(`window.__summitEarlyRuntimeErrors || []`);
  if (runtimeErrors.length) errors.push("restart soak should not emit runtime errors: " + JSON.stringify(runtimeErrors));
  if (!Number.isFinite(last.x) || !Number.isFinite(last.y)) errors.push("restart soak should finish with a finite debug position: " + JSON.stringify(last));
}

async function runMobileSmoke(browser, baseUrl) {
  await browser.setViewport(390, 844, { mobile: true });
  await navigateApp(browser, baseUrl, "mobile portrait");
  const mobileStartContext = await browser.evaluate(`(() => {
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
  await clickSelector(browser, "#startAccountButton");
  await waitUntil("mobile account panel opens", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("account-focused")`));
  const mobileAccountTouchSafe = await browser.evaluate(`(() => {
    const controls = [...document.querySelectorAll(".settings-group-account button, .settings-group-account input")].filter((control) => {
      const rect = control.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return controls.length >= 6 && controls.every((control) => control.getBoundingClientRect().height >= 44);
  })()`);
  if (!mobileAccountTouchSafe) errors.push("mobile account inputs and actions should retain 44px touch targets");
  const accountDesign = await browser.evaluate(`(() => {
    const panel = document.querySelector('#settingsPanel').getBoundingClientRect();
    const status = document.querySelector('#accountStatus');
    const statusRect = status.getBoundingClientRect();
    const savedClass = status.className;
    const colors = {};
    try {
      for (const state of ['', 'error', 'valid']) {
        status.className = 'account-status ' + state;
        colors[state || 'normal'] = getComputedStyle(status).color;
      }
    } finally { status.className = savedClass; }
    return { emptyTail: panel.bottom - statusRect.bottom, colors,
      bodyScrolls: getComputedStyle(document.querySelector('#settingsPanel .settings-body')).overflowY === 'auto' };
  })()`);
  if (accountDesign.emptyTail < 16 || accountDesign.emptyTail > 30 || !accountDesign.bodyScrolls
    || accountDesign.colors.error !== 'rgb(138, 55, 55)' || accountDesign.colors.valid !== 'rgb(40, 100, 86)'
    || accountDesign.colors.error === accountDesign.colors.normal) {
    errors.push('account card should fit its content and retain semantic error/success colors: ' + JSON.stringify(accountDesign));
  }
  const accountSemantics = await browser.evaluate(`(() => {
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
  await clickSelector(browser, '[data-auth-mode="password"]');
  const signInTabLayout = await browser.evaluate(`(() => {
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
    const submitStyle = getComputedStyle(document.querySelector("#accountSubmit"));
    const submitText = luminance(parseRgba(submitStyle.color));
    const submitStops = submitStyle.backgroundImage.match(/rgb\\([^)]*\\)/g) || [];
    const submitContrast = submitStops.length ? Math.min(...submitStops.map((stop) => {
      const fill = luminance(parseRgba(stop));
      return (Math.max(fill, submitText) + 0.05) / (Math.min(fill, submitText) + 0.05);
    })) : 0;
    return {
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      recoveryHeight: recovery.getBoundingClientRect().height,
      modeNote: document.querySelector('#accountNote').textContent,
      submitContrast,
      recoveryContrast: Number(((Math.max(foregroundLum, backgroundLum) + 0.05) / (Math.min(foregroundLum, backgroundLum) + 0.05)).toFixed(2)),
      codePressed: code?.getAttribute("aria-pressed") || "",
      passwordPressed: tab?.getAttribute("aria-pressed") || ""
    };
  })()`);
  if (
    Number.parseFloat(signInTabLayout.outlineWidth) < 2
    || /rgb\(0, 0, 0\)/.test(signInTabLayout.outlineColor)
    || signInTabLayout.recoveryHeight < 44
    || !/首次使用请选择邮箱验证码/.test(signInTabLayout.modeNote)
    || signInTabLayout.recoveryContrast < 4.5
    || signInTabLayout.submitContrast < 4.5
    || signInTabLayout.codePressed !== "false"
    || signInTabLayout.passwordPressed !== "true"
  ) {
    errors.push("mobile password tab and recovery action should keep a refined visible focus ring and safe touch target: " + JSON.stringify(signInTabLayout));
  }
  await clickSelector(browser, "#settingsClose");
  await waitUntil("mobile account panel closes", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await tapSelector(browser, "#startSettingsButton");
  await waitUntil("mobile collapsed settings open", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  const collapsedSettingsFit = await browser.evaluate(`(() => {
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
  const mobileBackdropPoint = await browser.evaluate(`(() => {
    const rect = document.querySelector("#settingsPanel").getBoundingClientRect();
    return {
      x: Math.max(1, Math.floor(rect.left / 2)),
      y: Math.max(1, Math.min(innerHeight - 1, Math.round(rect.top + rect.height / 2)))
    };
  })()`);
  await tapPoint(browser, mobileBackdropPoint.x, mobileBackdropPoint.y);
  await waitUntil("mobile exposed backdrop tap dismisses without click-through", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden") && document.activeElement === document.querySelector("#startSettingsButton") && !document.querySelector("#overlay").classList.contains("hidden")`));
  await clickSelector(browser, "#openTrainingButton");
  await waitUntil("mobile practice open", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  const collapsedPracticeFit = await browser.evaluate(`(() => {
    const panel = document.querySelector("#settingsPanel").getBoundingClientRect();
    const dock = document.querySelector("#practiceLaunchDock").getBoundingClientRect();
    const groups = [...document.querySelectorAll(".settings-group.practice-only")].filter((group) => group.getBoundingClientRect().height > 0);
    const last = groups[groups.length - 1]?.getBoundingClientRect();
    return {
      panelHeight: Math.round(panel.height),
      viewportHeight: innerHeight,
      emptyTail: last ? Math.round(dock.top - last.bottom) : 999,
      allCollapsed: groups.length === 3 && groups.every((group) => !group.open),
      dockVisible: dock.height >= 44 && dock.bottom <= panel.bottom + 1,
      bounded: panel.top >= 0 && panel.bottom <= innerHeight
    };
  })()`);
  if (!collapsedPracticeFit.allCollapsed || !collapsedPracticeFit.dockVisible || !collapsedPracticeFit.bounded || collapsedPracticeFit.emptyTail > 28 || collapsedPracticeFit.panelHeight > collapsedPracticeFit.viewportHeight * 0.56) {
    errors.push("collapsed mobile Practice should fit its collapsed choices and launch action instead of leaving an empty full-height workspace: " + JSON.stringify(collapsedPracticeFit));
  }
  const roomGroupOpen = await browser.evaluate(`document.querySelector(".settings-group-room")?.open || false`);
  if (!roomGroupOpen) {
    await tapSelector(browser, ".settings-group-room summary");
    await waitUntil("mobile room settings open", () => browser.evaluate(`document.querySelector(".settings-group-room")?.open || false`));
  }
  await openSettingsGroup(browser, ".settings-group-training");
  const mobile = await browser.evaluate(`(() => {
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
  await browser.evaluate(`(() => {
    const close = document.querySelector("#settingsClose");
    window.__mobileCloseProbe = { click: 0, pointerup: 0, touchend: 0 };
    close?.addEventListener("click", () => { window.__mobileCloseProbe.click += 1; }, { once: true });
    close?.addEventListener("pointerup", () => { window.__mobileCloseProbe.pointerup += 1; }, { once: true });
    close?.addEventListener("touchend", () => { window.__mobileCloseProbe.touchend += 1; }, { once: true });
  })()`);
  await tapSelector(browser, "#settingsClose");
  try {
    await waitUntil("mobile settings closes", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`));
  } catch (error) {
    const closeState = await browser.evaluate(`(() => {
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
  await tapSelector(browser, "#startButton");
  await waitUntil("mobile game starts", () => browser.evaluate(`document.querySelector("#overlay").classList.contains("hidden")`));
  const touchUi = await browser.evaluate(`(() => {
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
    const rgb = (color) => color.match(/\\d+/g).slice(0, 3).map(Number);
    const luminance = (color) => rgb(color).reduce((sum, channel, index) => {
      const value = channel / 255;
      const linear = value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
      return sum + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
    const touchStyle = getComputedStyle(document.querySelector("[data-touch]"));
    const stops = touchStyle.backgroundImage.match(/rgb\\([^)]*\\)/g) || [];
    const touchContrast = stops.length
      ? Math.min(...stops.map((stop) => (luminance(touchStyle.color) + 0.05) / (luminance(stop) + 0.05)))
      : 0;
    return {
      visible: getComputedStyle(touch).display !== "none",
      position: getComputedStyle(touch).position,
      directionGrid: getComputedStyle(direction).display === "grid",
      actionGrid: getComputedStyle(action).display === "grid",
      touchContrast,
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
      controlHintRemoved: !document.querySelector("#controlHint") && document.querySelector("#openingGuide").hidden,
      retryLabels: [document.querySelector('[data-touch-command="retry"]'), document.querySelector('[data-touch-command="roomRestart"]')]
        .map((button) => (button?.getAttribute("aria-label") || "") + " " + (button?.getAttribute("title") || "")),
      stageTop: Math.round(stage.top)
    };
  })()`);
  if (!touchUi.visible || !touchUi.directionGrid || !touchUi.actionGrid || touchUi.touchContrast < 4.5 || !touchUi.allButtonsLarge || !touchUi.recallContextual || !touchUi.hudActionsTouchSafe || !touchUi.detachedFromPlayfield || touchUi.playfieldGap < 12 || touchUi.playfieldGap > 28 || !touchUi.portraitBriefVisible || !touchUi.portraitBriefAbove || touchUi.portraitBriefGap < 8 || touchUi.portraitBriefGap > 20 || !touchUi.portraitAtmosphere || !/R1.*起势山门/.test(touchUi.portraitBriefText) || !touchUi.controlHintRemoved || touchUi.stageTop > 380 || !touchUi.retryLabels[0].includes("回到检查点") || !touchUi.retryLabels[1].includes("回到房间起点")) {
    errors.push("touch controls should use visible direction/action grids with safe hit targets away from the portrait playfield: " + JSON.stringify(touchUi));
  }
  await tapSelector(browser, "#settingsButton");
  await waitUntil("active portrait settings opens", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden")`));
  const activePortraitPanel = await browser.evaluate(`(() => {
    const panel = document.querySelector("#settingsPanel");
    const close = document.querySelector("#settingsClose");
    const rect = panel?.getBoundingClientRect();
    const closeRect = close?.getBoundingClientRect();
    return {
      panel: rect ? { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) } : null,
      close: closeRect ? { left: Math.round(closeRect.left), top: Math.round(closeRect.top), right: Math.round(closeRect.right), bottom: Math.round(closeRect.bottom), width: Math.round(closeRect.width), height: Math.round(closeRect.height) } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      stageTransform: getComputedStyle(document.querySelector(".stage")).transform,
      panelPosition: getComputedStyle(panel).position,
      panelVisible: Boolean(panel && !panel.classList.contains("hidden"))
    };
  })()`);
  if (activePortraitPanel.panelVisible) {
    const panelFits = activePortraitPanel.panel
      && activePortraitPanel.panel.left >= -1
      && activePortraitPanel.panel.right <= activePortraitPanel.viewport.width + 1
      && activePortraitPanel.panel.top >= -1
      && activePortraitPanel.panel.bottom <= activePortraitPanel.viewport.height + 1;
    const closeFits = activePortraitPanel.close
      && activePortraitPanel.close.width >= 44
      && activePortraitPanel.close.height >= 44
      && activePortraitPanel.close.left >= -1
      && activePortraitPanel.close.right <= activePortraitPanel.viewport.width + 1
      && activePortraitPanel.close.top >= -1
      && activePortraitPanel.close.bottom <= activePortraitPanel.viewport.height + 1;
    if (!panelFits || !closeFits || activePortraitPanel.panelPosition !== "fixed" || activePortraitPanel.stageTransform !== "none") {
      errors.push("active portrait settings should stay fixed to the viewport and keep its close action reachable: " + JSON.stringify(activePortraitPanel));
    }
  }
  await tapSelector(browser, "#settingsClose");
  await waitUntil("active portrait settings closes", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await tapSelector(browser, '[data-touch-command="retry"]');
  await waitUntil("portrait touch quick retry responds", () => browser.evaluate(`/快速重开/.test(document.querySelector("#gameStatus")?.textContent || "")`));
  await tapSelector(browser, "#settingsButton");
  await tapSelector(browser, '[data-touch-command="roomRestart"]');
  await waitUntil("portrait touch room restart responds", () => browser.evaluate(`/房间重开/.test(document.querySelector("#gameStatus")?.textContent || "")`));
  const largeTouchUi = await browser.evaluate(`(() => {
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

  await enableDebugPanel(browser);
  const touchReleaseStart = await debugPosition(browser);
  const touchRightTarget = await targetPoint(browser, '[data-touch="right"]');
  await browser.evaluate(`(() => {
    const button = document.querySelector('[data-touch="right"]');
    window.__touchPointerProbe = null;
    button?.addEventListener("pointerdown", (event) => {
      window.__touchPointerProbe = event.pointerId;
    }, { once: true, capture: true });
  })()`);
  const heldTouchPoint = {
    x: touchRightTarget.inputX,
    y: touchRightTarget.inputY,
    id: 7,
    radiusX: 2,
    radiusY: 2,
    force: 1
  };
  await browser.touchDown(heldTouchPoint);
  await sleep(180);
  const touchReleaseHeld = await debugPosition(browser);
  const touchPointerId = await browser.evaluate("window.__touchPointerProbe");
  await browser.evaluate(`(function(pointerId) {
    document.querySelector('[data-touch="right"]').dispatchEvent(new PointerEvent("lostpointercapture", {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: "touch"
    }));
  })(${Number.isFinite(touchPointerId) ? touchPointerId : 7})`);
  await sleep(260);
  const touchReleaseLost = await debugPosition(browser);
  await browser.touchUp();
  if (touchReleaseHeld.x - touchReleaseStart.x < 1 || touchReleaseLost.x - touchReleaseHeld.x > 8) {
    errors.push("lost touch pointer capture should release movement without waiting for pointerup: " + JSON.stringify({ touchReleaseStart, touchReleaseHeld, touchReleaseLost }));
  }
  const multiTouchRelease = await browser.evaluate(`(() => {
    const button = document.querySelector('[data-touch="right"]');
    if (!button) return { supported: false };
    const dispatch = (type, pointerId) => button.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: "touch"
    }));
    dispatch("pointerdown", 21);
    dispatch("pointerdown", 22);
    const heldAfterSecondDown = button.classList.contains("active");
    dispatch("pointerup", 22);
    const heldAfterSecondRelease = button.classList.contains("active");
    dispatch("pointerup", 21);
    const releasedAfterFirstRelease = !button.classList.contains("active");
    return { supported: true, heldAfterSecondDown, heldAfterSecondRelease, releasedAfterFirstRelease };
  })()`);
  if (!multiTouchRelease.supported || !multiTouchRelease.heldAfterSecondDown || !multiTouchRelease.heldAfterSecondRelease || !multiTouchRelease.releasedAfterFirstRelease) {
    errors.push("multi-touch release should be owned by the first pointer that pressed a touch action: " + JSON.stringify(multiTouchRelease));
  }
  await keyTap(browser, "Digit9", "9");
  await waitUntil("mobile debug jump reaches Echo room", () => browser.evaluate(`/R9\\/10/.test(document.querySelector("#roomCount").textContent)`));
  const echoRecallReady = await waitUntil("touch Echo recall becomes available in the safe entry pocket", () => browser.evaluate(`(() => {
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
  await windowKeyHold(browser, "KeyA", "a", 220);
  const beforeTouchRecall = await debugPosition(browser);
  await tapSelector(browser, '[data-touch="recall"]');
  const afterTouchRecall = await waitUntil("touch Echo recall returns to the active anchor", () => browser.evaluate(`(() => {
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
  await keyTap(browser, "Digit0", "0");
  await waitUntil("mobile debug jump reaches finale room", () => browser.evaluate(`/R10\\/10/.test(document.querySelector("#roomCount").textContent)`));
  const finaleEchoReady = await waitUntil("R10 reuses Echo beside its entry checkpoint", () => browser.evaluate(`(() => {
    const button = document.querySelector('[data-touch="recall"]');
    const debug = document.querySelector("#debugPanel").textContent;
    return !button.hidden && !button.disabled && /anchor 1/.test(debug)
      ? { label: button.getAttribute("aria-label"), status: document.querySelector("#gameStatus").textContent }
      : null;
  })()`), 3500);
  if (finaleEchoReady.label !== "召回到回声锚点" || !/回声锚点已激活/.test(finaleEchoReady.status)) {
    errors.push("R10 should reactivate Echo from its stable entry pocket before the finale route: " + JSON.stringify(finaleEchoReady));
  }
  await keyTap(browser, "Digit1", "1");
  await keyTap(browser, "F3", "F3");

  await browser.setViewport(320, 480, { mobile: true });
  await sleep(100);
  const shortPortrait = await browser.evaluate(`(() => {
    const brief = document.querySelector("#portraitBrief").getBoundingClientRect();
    const hud = document.querySelector(".hud").getBoundingClientRect();
    const stage = document.querySelector(".stage");
    const touch = document.querySelector("#touchControls").getBoundingClientRect();
    const shell = document.querySelector(".shell");
    const previousSize = shell.style.getPropertyValue("--touch-size");
    const targets = [...document.querySelectorAll("#touchControls button:not([hidden])")];
    const measureControls = () => {
      const stageBottom = stage.getBoundingClientRect().bottom;
      const rects = targets.map((button) => button.getBoundingClientRect());
      return {
        minSize: Math.min(...rects.map((rect) => Math.min(rect.width, rect.height))),
        detached: rects.every((rect) => rect.top >= stageBottom + 4),
        fits: rects.every((rect) => rect.left >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1),
        clear: rects.every((rect, index) => rects.slice(index + 1).every((other) =>
          rect.right <= other.left || other.right <= rect.left || rect.bottom <= other.top || other.bottom <= rect.top
        ))
      };
    };
    const normal = measureControls();
    shell.style.setProperty("--touch-size", "64px");
    const large = measureControls();
    if (previousSize) shell.style.setProperty("--touch-size", previousSize);
    else shell.style.removeProperty("--touch-size");
    return {
      briefAboveHud: brief.bottom <= hud.top - 6,
      briefTop: Math.round(brief.top),
      briefBottom: Math.round(brief.bottom),
      hudTop: Math.round(hud.top),
      normal,
      large,
      touchBottom: Math.round(touch.bottom),
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  })()`);
  if (!shortPortrait.briefAboveHud || [shortPortrait.normal, shortPortrait.large].some((controls) =>
    !controls.detached || !controls.fits || !controls.clear || controls.minSize < 44
  )) {
    errors.push("320x480 portrait should keep the room brief clear of the HUD and all touch controls separate, reachable and on-screen: " + JSON.stringify(shortPortrait));
  }
}

async function runMobileSafeAreaSmoke(browser, baseUrl) {
  await browser.setViewport(390, 700, { mobile: true, pixelRatio: 3 });
  browser.setSafeAreaFixture({ top: 47, right: 0, bottom: 34, left: 0 });
  try {
    await clearGuestProgress(browser);
    await navigateApp(browser, baseUrl, "mobile safe-area entry");
    await waitUntil("safe-area entry chooser", () => browser.evaluate(`!document.querySelector("#entryGate")?.classList.contains("hidden")`), 7000);
    const entry = await browser.evaluate(`(() => {
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

    await browser.setViewport(320, 568, { mobile: true, pixelRatio: 2 });
    await sleep(120);
    const narrowEntry = await browser.evaluate(`(() => {
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

    await browser.setViewport(390, 700, { mobile: true, pixelRatio: 3 });
    await sleep(120);
    await clickSelector(browser, "#accountEntryButton");
    await waitUntil("safe-area account drawer opens", () => browser.evaluate(`!document.querySelector("#settingsPanel")?.classList.contains("hidden") && document.querySelector("#settingsPanel")?.classList.contains("account-focused")`));
    await browser.setViewport(390, 420, { mobile: true, pixelRatio: 3 });
    await sleep(180);
    await browser.evaluate(`document.querySelector("#accountEmail")?.focus({ preventScroll: false })`);
    await sleep(180);
    const keyboard = await browser.evaluate(`(() => {
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
    browser.setSafeAreaFixture(undefined);
    await browser.evaluate(`sessionStorage.setItem("summit-spark-entry-mode", "guest")`);
  }
}

async function runMobileLandscapeSmoke(browser, baseUrl) {
  await browser.setViewport(700, 390, { mobile: true });
  await navigateApp(browser, baseUrl, "mobile landscape");
  await tapSelector(browser, "#startSettingsButton");
  await waitUntil("mobile landscape settings open", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-settings")`));
  await openSettingsGroup(browser, ".settings-group-audio");
  const landscapeAudioTouchSafe = await browser.evaluate(`document.querySelector("#audioTestButton").getBoundingClientRect().height >= 44`);
  await openSettingsGroup(browser, ".settings-group-feedback");
  const landscapeFeedbackTouchSafe = await browser.evaluate(` [...document.querySelectorAll(".settings-group-feedback button")].filter((button) => button.getBoundingClientRect().height > 0).every((button) => button.getBoundingClientRect().height >= 44 && button.getBoundingClientRect().width >= 44)`);
  const landscape = await browser.evaluate(`(() => {
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
  await tapSelector(browser, "#settingsClose");
  await tapSelector(browser, "#startButton");
  await waitUntil("mobile landscape game starts", () => browser.evaluate(`document.querySelector("#overlay").classList.contains("hidden")`));
  const landscapeTouch = await browser.evaluate(`(() => {
    const touch = document.querySelector("#touchControls");
    const buttons = [...touch.querySelectorAll("button")].filter((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const rgba = getComputedStyle(buttons[0]).backgroundColor.match(/[\\d.]+/g)?.map(Number) || [];
    return {
      visible: getComputedStyle(touch).display === "flex",
      buttonCount: buttons.length,
      commandCount: buttons.filter(button => button.hasAttribute("data-touch-command")).length,
      openingGuideHidden: document.querySelector("#openingGuide").hidden,
      allLarge: buttons.every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }),
      backgroundAlpha: rgba.length >= 4 ? rgba[3] : 1,
      backdrop: getComputedStyle(buttons[0]).backdropFilter || ""
    };
  })()`);
  if (!landscapeTouch.visible || landscapeTouch.buttonCount !== 7 || landscapeTouch.commandCount !== 0 || !landscapeTouch.allLarge || landscapeTouch.backgroundAlpha > 0.34 || !/blur\(4px\)/.test(landscapeTouch.backdrop)) {
    errors.push("mobile landscape touch controls should remain usable without obscuring terrain: " + JSON.stringify(landscapeTouch));
  }
  await browser.setViewport(568, 320, { mobile: true });
  await sleep(100);
  await tapSelector(browser, "#practiceButton");
  await waitUntil("short landscape practice opens", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#settingsPanel").classList.contains("mode-practice")`));
  const shortLandscapePractice = await browser.evaluate(`(() => {
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
  await tapSelector(browser, "#settingsClose");
  await waitUntil("short landscape practice closes", () => browser.evaluate(`document.querySelector("#settingsPanel").classList.contains("hidden")`));
  await browser.evaluate(`(() => {
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
  const initialReviewDisclosure = await browser.evaluate(`(() => {
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
  await browser.evaluate(`document.querySelector(".review-more").open = true`);
  await sleep(120);
  await browser.evaluate(`(() => {
    const overlay = document.querySelector("#overlay");
    const focusable = [...overlay.querySelectorAll("button, select, input, textarea, summary, [tabindex]")]
      .filter((element) => element.getClientRects().length > 0 && !element.disabled && element.getAttribute("tabindex") !== "-1" && element.getAttribute("aria-hidden") !== "true");
    focusable[focusable.length - 1]?.focus();
  })()`);
  await keyTap(browser, "Tab", "Tab");
  await sleep(80);
  const finishForwardWrap = await browser.evaluate(`(() => {
    const overlay = document.querySelector("#overlay");
    const focusable = [...overlay.querySelectorAll("button, select, input, textarea, summary, [tabindex]")]
      .filter((element) => element.getClientRects().length > 0 && !element.disabled && element.getAttribute("tabindex") !== "-1" && element.getAttribute("aria-hidden") !== "true");
    return document.activeElement === focusable[0] && overlay.contains(document.activeElement);
  })()`);
  await browser.keyDown("Tab", "Tab", true);
  await browser.keyUp("Tab", "Tab", true);
  await sleep(80);
  const finishBackwardWrap = await browser.evaluate(`(() => {
    const overlay = document.querySelector("#overlay");
    const focusable = [...overlay.querySelectorAll("button, select, input, textarea, summary, [tabindex]")]
      .filter((element) => element.getClientRects().length > 0 && !element.disabled && element.getAttribute("tabindex") !== "-1" && element.getAttribute("aria-hidden") !== "true");
    return document.activeElement === focusable[focusable.length - 1] && overlay.contains(document.activeElement);
  })()`);
  if (!finishForwardWrap || !finishBackwardWrap) {
    errors.push("finish dialog should trap forward and backward Tab focus inside its modal surface");
  }
  await browser.evaluate(`(() => {
    document.querySelector("#finishTitle")?.focus({ preventScroll: true });
    document.querySelector("#overlay").scrollTop = 0;
  })()`);
  const review = await browser.evaluate(`(() => {
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
  await keyTap(browser, "KeyO", "o");
  await waitUntil("settings opens above finish review", () => browser.evaluate(`!document.querySelector("#settingsPanel").classList.contains("hidden") && document.querySelector("#overlay").hasAttribute("inert")`));
  await browser.evaluate(`document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }))`);
  const finishOutsideReturn = await waitUntil("outside settings dismissal restores finish focus", () => browser.evaluate(`(() => {
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
  await tapSelector(browser, "#restartButton");
  const restartedLifecycle = await waitUntil("finish restart lifecycle cleanup", () => browser.evaluate(`(() => {
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

async function runMenuFrameSmoke(browser, baseUrl) {
  const clock = await installFrameClock(browser);
  try {
    await navigateApp(browser, baseUrl, "controller menu seed");
    await clearGuestProgress(browser);
    await navigateApp(browser, baseUrl, "controller menu frames");
    function exercise() {
      const read = navigator.getGamepads.bind(navigator);
      let polls = 0;
      Object.defineProperty(navigator, "getGamepads", { configurable: true, value() { polls++; return read(); } });
      const pad = window.__summitMockPadState;
      const panel = document.getElementById("settingsPanel");
      const overlay = document.getElementById("overlay");
      const game = document.getElementById("game");
      const press = (index, down) => Object.assign(pad.buttons[index], { pressed: down, value: down ? 1 : 0 });
      function step(frames, expectedPolls = frames) {
        polls = 0;
        for (let i = 0; i < frames; i++) window.stepGameFrame();
        if (polls !== expectedPolls) throw new Error(`Expected ${expectedPolls} controller polls, received ${polls}`);
      }
      step(8);
      game.dispatchEvent(new Event("contextlost", { cancelable: true }));
      step(3, 0);
      game.dispatchEvent(new Event("contextrestored"));
      step(3);
      press(9, true); step(1);
      press(0, true); step(6);
      if (panel.classList.contains("hidden") || overlay.hidden) throw new Error("Holding Menu must keep settings open and A must not start a run behind it");
      press(9, false); press(0, false); step(1);
      press(9, true); step(5);
      if (!panel.classList.contains("hidden") || overlay.hidden) throw new Error("One new Menu press must close the panel once");
      press(9, false); step(1);
      press(0, true); step(1);
      if (!overlay.hidden || document.activeElement !== game) throw new Error("One A press must enter gameplay in this frame");
      press(0, false); step(2);
      press(9, true); step(6);
      if (panel.classList.contains("hidden")) throw new Error("Holding Menu during a run must keep it paused");
      return true;
    }
    await browser.evaluate("(" + exercise.toString() + ")()");
    await navigateApp(browser, baseUrl, "returning guest menu focus");
    await browser.evaluate(`(() => {
      for (const id of ["openTrainingButton", "startSettingsButton"]) {
        const button = document.getElementById(id);
        button.click();
        window.dispatchEvent(new Event("blur"));
        window.dispatchEvent(new Event("focus"));
        window.stepGameFrame();
        const panel = document.getElementById("settingsPanel");
        if (!panel.contains(document.activeElement)) throw new Error(id + " failed to retain dialog focus");
        document.getElementById("settingsClose").click();
        if (document.activeElement !== button || !panel.classList.contains("hidden")) throw new Error(id + " failed to restore focus to the trigger");
      }
      return true;
    })()`);
  } finally {
    await browser.removeInitScript(clock);
  }
}

async function runGamepadSmoke(browser, baseUrl) {
  await browser.setViewport(1280, 720);
  await navigateApp(browser, baseUrl, "gamepad seed");
  await clearGuestProgress(browser);
  await browser.evaluate(`localStorage.setItem("summit-spark-settings", JSON.stringify({ gamepadDeadzone: 0.4, audioEnabled: false }))`);
  await navigateApp(browser, baseUrl, "gamepad clean");
  const holdPadJump = (pressed) => browser.evaluate(`(() => {
    const button = window.__summitMockPadState.buttons[0];
    button.pressed = ${pressed};
    button.value = ${pressed ? 1 : 0};
  })()`);
  await holdPadJump(true);
  await waitUntil("one gamepad press starts a new guest run", () => browser.evaluate(`document.querySelector("#overlay").hidden && document.activeElement.id === "game"`));
  await holdPadJump(false);
  const gamepadErrorsBeforeThrow = await browser.evaluate(`window.__earlyRuntimeErrors?.length || window.__summitEarlyRuntimeErrors?.length || 0`);
  await browser.evaluate(`window.__summitMockPadState.throw = true`);
  await sleep(220);
  await browser.evaluate(`window.__summitMockPadState.throw = false`);
  const gamepadErrorsAfterThrow = await browser.evaluate(`window.__earlyRuntimeErrors?.length || window.__summitEarlyRuntimeErrors?.length || 0`);
  if (gamepadErrorsAfterThrow !== gamepadErrorsBeforeThrow) errors.push("a transient getGamepads exception should be treated as disconnected instead of an unhandled runtime error");
  await enableDebugPanel(browser);
  const beforeAxis = await debugPosition(browser);
  await browser.evaluate(`window.__summitMockPadState.axes[0] = 0.34`);
  await sleep(480);
  const blocked = await debugPosition(browser);
  if (blocked.x - beforeAxis.x > 4) errors.push("gamepad deadzone 0.40 should block 0.34 axis drift");
  const padStatus = await browser.evaluate(`document.querySelector("#gamepadStatus")?.textContent || ""`);
  if (!/轴 0\.34/.test(padStatus) || !/接近死区/.test(padStatus)) errors.push("gamepad status should expose axis magnitude and drift risk: " + padStatus);
  await browser.evaluate(`(() => {
    const slider = document.querySelector("#gamepadDeadzoneSlider");
    slider.value = "0.16";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await sleep(640);
  const moved = await debugPosition(browser);
  if (moved.x - blocked.x < 8) errors.push("gamepad mock did not move player after lowering deadzone");
  if (!/pad dz 0\.16/.test(moved.text)) errors.push("debug panel did not report updated gamepad deadzone");
}

async function installRuntimeFixture(browser) {
  await browser.addInitScript({
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
}

async function runNativeSafari({ motionOnly = false, mobile = false, extended = false } = {}) {
  const port = await findFreePort();
  const upstream = "http://127.0.0.1:" + port;
  const server = childProcess.spawn(process.execPath, ["game-server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: "inherit"
  });
  let fixture;
  let browser;
  try {
    await waitUntil("local server", () => requestText(upstream + "/").then(Boolean), 45_000);
    fixture = await startFixture(upstream);
    const deviceUDID = mobile ? process.env.SAFARI_IOS_UDID : undefined;
    if (mobile && !deviceUDID) throw new Error("SAFARI_IOS_UDID is required");
    if (mobile) {
      await require("./check-ios-safari.cjs").checkIOSSafari(fixture, deviceUDID);
      return;
    }
    browser = await launchSafari(fixture);
    const { url } = fixture;
    await installRuntimeFixture(browser);

    if (motionOnly) {
      await navigateApp(browser, url, "Safari reduced motion");
      await checkReducedMotion(browser);
      if (errors.length) throw new Error(errors.join("\n- "));
      console.log("Safari passed system reduced-motion preference and canvas transitions");
      return;
    }

    const scenarioGroups = [
      [ // Gameplay and save imports
        runRetryAndTouchAimSmoke,
        async function lightStepCrossings(browser) { await runLightStepSmoke(browser, upstream); },
        async function summitCollection(browser) { await runSummitCollection(browser, upstream); },
        runBootFailureSmoke,
        ...(extended ? [runDesktopSmoke] : []),
        runMenuScaleSmoke,
        runBackwardTransitionSmoke,
        ...(extended ? [runChapterTransitionInputSmoke] : []),
        ...(extended ? [runMountainGateLandmarkSmoke] : []),
        ...(extended ? [runOldPeakRelicSmoke] : []),
        runWindGorgeCrumbleRippleSmoke,
        ...(extended ? [runSpringApexSmoke] : []),
        runGroundRechargeSmoke,
        ...(extended ? [runKeyboardSettingsSmoke] : []),
        runAssistModeSmoke,
        runPracticeRecommendationIntegrationSmoke,
        runResumeSmoke,
        runTrainingInterruptionSmoke,
        async function storageRecovery(browser, url) {
          errors.push(...await checkStorageRecovery(
            readPage => browser.evaluate(`(${readPage})()`),
            () => navigateApp(browser, url, "save archive seed")
          ));
        },
        runSaveArchiveSmoke,
        ...(extended ? [runRestartSoakSmoke] : [])
      ],
      [ // Controller entry and account restoration
        runMenuFrameSmoke,
        runGamepadSmoke,
        ...(extended ? [runFreshEntryImmediateSmoke] : []),
        runCloudSdkRetrySmoke,
        runExpiredAccountHintSmoke,
        runAuthenticatedRefreshSmoke,
        runAccountRestoreTimeoutSmoke
      ],
      [ // Authentication and password recovery
        runRestrictedSessionStorageAuthSmoke,
        runPasswordRecoverySmoke
      ],
      [ // Cloud storage and conflicts
        runCloudSyncExitGuardSmoke,
        runLargeCloudArchiveSmoke,
        runCloudLogoutInspectionRaceSmoke,
        runCorruptCloudPermissionsSmoke,
        runCloudConflictGuardSmoke
      ],
    ];
    for (const [index, scenarios] of scenarioGroups.entries()) {
      if (index > 0) {
        await browser.close();
        browser = undefined;
        browser = await launchSafari(fixture);
        // Storage fixtures need the app origin before preparing their first navigation.
        await navigateApp(browser, url, "fresh Safari session");
      }
      for (const scenario of scenarios) {
        const errorCount = errors.length;
        try {
          await scenario(browser, url);
          if (errors.length === errorCount) console.log("Safari passed " + scenario.name);
        } catch (error) {
          errors.push(scenario.name + ": " + error.message);
        }
      }
    }
  } finally {
    try {
      await browser?.close();
    } finally {
      try { await fixture?.close(); } finally { await killProcess(server); }
    }
  }
  if (errors.length) throw new Error(errors.join("\n- "));
}

const mode = process.argv[2];
const modes = [undefined, "--native-safari", "--native-safari-reduced-motion", "--native-safari-ios", "--extended"];
if (!modes.includes(mode) || process.argv.length > 3) {
  console.error("Usage: node tools/check-browser-smoke.js [--extended|--native-safari-ios|--native-safari-reduced-motion]");
  process.exit(1);
}
const run = () => runNativeSafari({
  motionOnly: mode === "--native-safari-reduced-motion",
  mobile: mode === "--native-safari-ios",
  extended: mode === "--native-safari" || mode === "--extended"
});
run().catch((error) => {
  console.error("Browser smoke failed:");
  console.error("- " + error.message);
  process.exit(1);
});
