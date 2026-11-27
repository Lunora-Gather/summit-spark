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
    const practiceHint = await page.locator("#portraitRoomGoal").evaluate(goal => ({
      cue: goal.textContent,
      fits: goal.scrollWidth <= goal.clientWidth + 1
    }));
    assert.match(practiceHint.cue, /棱镜.*实岩/);
    assert.ok(practiceHint.fits, "R8 practice must show the safe landing cue in full on a compact phone");
    assert.deepEqual(errors, [], "Portrait entry, rotation and practice should run without page errors");
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
