"use strict";

// Playwright's inspector can override headless launch. Disable it before loading the driver.
process.env.PWDEBUG = "";
const { webkit } = require("playwright-core");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const server = require("../game-server.js");
const { collectorRoute, installReplayClock, startCollectionReplay } = require("./lib/summit-collection-replay.cjs");

async function checkPauseControls(browser, url) {
  const page = await browser.newPage({ viewport: { width: 320, height: 480 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(url);
    await page.locator("#accountEntryButton").tap();
    const email = page.locator("#accountEmail");
    await email.focus();
    const imeKeysReserved = await email.evaluate(field => {
      for (const flags of [{ isComposing: true }, { keyCode: 229 }]) {
        for (const key of ["Enter", "Escape"]) {
          const event = new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true, ...flags });
          if (!field.dispatchEvent(event) || document.querySelector("#settingsPanel").inert) return false;
        }
      }
      return true;
    });
    assert.ok(imeKeysReserved, "The input method must keep its commit and cancel keys");
    await page.keyboard.press("Escape");
    await page.locator("#guestEntryButton").tap();
    for (const viewport of [{ width: 320, height: 480 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const layout = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        const actions = rect(".hud-actions");
        const brief = rect("#portraitBrief");
        const meters = rect(".meters");
        const canvas = rect("#game");
        const goal = document.querySelector("#portraitRoomGoal");
        return {
          buttonsFit: actions.left >= goal.getBoundingClientRect().right &&
            actions.top >= brief.top && actions.bottom <= brief.bottom && actions.bottom <= canvas.top,
          metersFit: meters.top >= canvas.bottom && meters.bottom + 4 <= rect('[data-touch="up"]').top,
          briefFits: brief.top >= 0 && goal.scrollWidth <= goal.clientWidth + 1
        };
      });
      assert.deepEqual(layout, { buttonsFit: true, metersFit: true, briefFits: true },
        `Portrait HUD at ${viewport.width}×${viewport.height}`);
    }
    await page.setViewportSize({ width: 932, height: 430 });
    await page.locator(".stage #openingGuide").waitFor();
    const guideBelowHud = await page.evaluate(() =>
      document.querySelector("#openingGuide").getBoundingClientRect().top >=
      document.querySelector("#gameHud .meters").getBoundingClientRect().bottom
    );
    assert.ok(guideBelowHud, "The first-jump hint must leave the landscape HUD visible");
    await page.setViewportSize({ width: 320, height: 480 });
    const pause = page.locator("#settingsButton");
    await pause.focus();
    await page.keyboard.press("Space");
    await page.locator("#settingsClose").waitFor();
    await page.keyboard.press("Space");
    assert.equal(await page.evaluate(() => document.activeElement.id), "game", "Resume must return the keyboard to the climb");
    const terrain = page.locator("#pauseTerrain");
    const retry = page.locator("#pauseRetries [data-pause-retry]");
    for (let faults = 0; faults <= 2; faults++) {
      await pause.tap();
      await retry.waitFor();
      assert.equal(await terrain.isVisible(), faults === 2, `Terrain action after ${faults} faults`);
      if (faults < 2) await retry.tap();
    }
    const buttonsFit = await page.locator("#pauseRetries button").evaluateAll(buttons => buttons.every(button => {
      const box = button.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(button);
      const label = range.getBoundingClientRect();
      return box.width >= 44 && box.height >= 44 && label.top >= box.top && label.bottom <= box.bottom &&
        label.left >= box.left && label.right <= box.right;
    }));
    assert.ok(buttonsFit, "Every pause action must contain its label and retain a full touch target");
    await terrain.tap();
    await page.locator("#roomTerrainMap").waitFor();
    assert.equal(await page.locator("#roomTerrainMap").getAttribute("data-room"), "0");
    await page.locator("#settingsClose").tap();
    await page.locator("#settingsPanel").waitFor({ state: "hidden", timeout: 3000 });
    assert.equal(await page.locator("#deathCount").textContent(), "失 2");
    await page.locator("#practiceButton").tap();
    const roomGroup = page.locator(".settings-group-room");
    if (!await roomGroup.evaluate(group => group.open)) await roomGroup.locator(":scope > summary").tap();
    await page.locator("#roomSelect").selectOption("7");
    await page.locator("#focusRoomButton").tap();
    await page.locator("#settingsPanel").waitFor({ state: "hidden" });
    await page.locator(".stage.training-active #deathCount").waitFor();
    const practiceHint = await page.locator("#portraitRoomGoal").evaluate(goal => ({
      cue: goal.textContent,
      fits: goal.scrollWidth <= goal.clientWidth + 1
    }));
    assert.match(practiceHint.cue, /棱镜.*实岩/);
    assert.ok(practiceHint.fits, "R8 practice must show the safe landing cue in full on a compact phone");
    const clippedMeters = await page.locator(".meters > :visible").evaluateAll(items => items.filter(item => {
      const box = item.getBoundingClientRect();
      const bar = item.parentElement.getBoundingClientRect();
      return box.left < Math.max(0, bar.left) || box.right > Math.min(innerWidth, bar.right) ||
        (item.classList.contains("counter") && item.scrollWidth > item.clientWidth + 1);
    }).map(item => item.id || item.className));
    assert.deepEqual(clippedMeters, [], "Every practice meter and counter must fit on a compact phone");
    assert.deepEqual(errors, [], "Portrait entry, rotation and practice should run without page errors");
  } finally {
    await page.close();
  }
}

async function checkLandscapeGameTip(browser, url) {
  const page = await browser.newPage({ viewport: { width: 480, height: 320 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.addInitScript(installReplayClock);
    await page.goto(url);
    await page.locator("html.app-ready").waitFor({ state: "attached" });
    await page.evaluate(() => window.stepGameFrame());
    await page.locator("#guestEntryButton").click({ force: true });
    await page.evaluate(startCollectionReplay, collectorRoute);
    const touchDock = await page.evaluate(() => {
      const touch = document.querySelector("#touchControls").getBoundingClientRect();
      const stage = document.querySelector(".stage").getBoundingClientRect();
      return {
        touchBottom: touch.bottom,
        stageBottom: stage.bottom,
        viewportBottom: innerHeight
      };
    });
    assert.ok(touchDock.touchBottom >= touchDock.stageBottom - 8 &&
      touchDock.touchBottom <= touchDock.viewportBottom - 4,
    `Landscape touch controls should sit at the lower safe edge: ${JSON.stringify(touchDock)}`);
    let tip = null;
    for (let frame = 0; frame < 6000 && !tip; frame += 8) {
      await page.evaluate(() => window.runCollectionBatch(8));
      if (await page.locator("#gameTip:not(.hidden)").count()) {
        tip = await page.locator("#gameTip:not(.hidden)").evaluate(element => {
          const box = element.getBoundingClientRect();
          const stage = document.querySelector(".stage").getBoundingClientRect();
          const controls = document.querySelector("#touchControls").getBoundingClientRect();
          return {
            height: box.height,
            top: box.top,
            bottom: box.bottom,
            stageTop: stage.top,
            controlsTop: controls.top
          };
        });
      }
    }
    assert.ok(tip, "A real collection cue should appear in the landscape route");
    assert.ok(tip.height <= 72 && tip.bottom <= tip.stageTop + 86 && tip.bottom <= tip.controlsTop - 8,
      `Landscape collection cue must stay compact and above touch controls: ${JSON.stringify(tip)}`);
    assert.deepEqual(errors, [], "Landscape collection cue should run without page errors");
  } finally {
    await page.close();
  }
}

async function checkTouchSizeComfort(browser, url) {
  const page = await browser.newPage({ viewport: { width: 320, height: 480 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(url);
    await page.locator("#guestEntryButton").tap();
    await page.locator("#settingsButton").tap();
    const controls = page.locator(".settings-group-controls");
    if (!await controls.evaluate(group => group.open)) await controls.locator(":scope > summary").tap();
    await page.locator("#touchSizeSlider").evaluate(input => {
      input.value = "64";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const setting = await page.evaluate(() => {
      const slider = document.querySelector("#touchSizeSlider");
      const touchButton = document.querySelector('#touchControls [data-touch="left"]');
      const help = document.querySelector("#touchAimHelp");
      return {
        value: slider?.value,
        describedBy: slider?.getAttribute("aria-describedby"),
        help: help?.textContent || "",
        renderedSize: Number.parseFloat(getComputedStyle(touchButton).width)
      };
    });
    assert.equal(setting.value, "64", "The largest touch preference should remain selectable");
    assert.equal(setting.describedBy, "touchAimHelp", "Touch sizing should expose its responsive behavior to assistive technology");
    assert.match(setting.help, /窄屏.*自动收窄/);
    assert.ok(setting.renderedSize >= 44 && setting.renderedSize < 64,
      `320px portrait should fit the largest preference without shrinking below 44px: ${JSON.stringify(setting)}`);
    await page.locator("#settingsClose").tap();
    const layout = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("#touchControls button")]
        .map(button => button.getBoundingClientRect())
        .filter(box => box.width > 0 && box.height > 0);
      return {
        buttonCount: buttons.length,
        buttonsFit: buttons.every(box => box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight),
        minimumSize: Math.min(...buttons.map(box => Math.min(box.width, box.height))),
        touchBottom: document.querySelector("#touchControls").getBoundingClientRect().bottom
      };
    });
    assert.equal(layout.buttonCount, 8, `Portrait touch controls should expose every action: ${JSON.stringify(layout)}`);
    assert.ok(layout.buttonsFit, `Portrait touch controls should remain inside the viewport: ${JSON.stringify(layout)}`);
    assert.ok(layout.minimumSize >= 44, `Portrait touch controls should retain the minimum target size: ${JSON.stringify(layout)}`);
    assert.ok(layout.touchBottom <= 476, `Portrait touch controls should retain a lower safe margin: ${JSON.stringify(layout)}`);
    assert.deepEqual(errors, [], "Touch sizing should run without page errors");
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await webkit.launch({ headless: true });
  try {
    let url = process.env.SUMMIT_SPARK_URL;
    if (!url) {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      url = `http://127.0.0.1:${server.address().port}/`;
    }
    await checkPauseControls(browser, url);
    await checkTouchSizeComfort(browser, url);
    await checkLandscapeGameTip(browser, url);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(installReplayClock);
    await page.goto(url);
    await page.locator("html.app-ready").waitFor({ state: "attached" });
    await page.evaluate(() => window.stepGameFrame());
    // Actionability waits for animation frames, which the replay advances by hand.
    await page.locator("#guestEntryButton").click({ force: true });
    await page.evaluate(startCollectionReplay, collectorRoute);
    for (let frames = 0; frames < 6000; frames += 48) {
      const result = await page.evaluate(() => window.runCollectionBatch(48));
      if (errors.length) throw new Error(errors.join("\n"));
      if (result) {
        console.log("Headless WebKit summit collection", result);
        return;
      }
    }
    throw new Error("Summit collection exceeded its frame limit");
  } finally {
    try {
      await browser.close();
    } finally {
      if (server.listening) await new Promise(resolve => server.close(resolve));
    }
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
