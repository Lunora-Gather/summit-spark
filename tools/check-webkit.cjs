"use strict";

// Playwright's inspector can override headless launch. Disable it before loading the driver.
process.env.PWDEBUG = "";
const { webkit } = require("playwright-core");
const { once } = require("node:events");
const server = require("../game-server.js");
const { collectorRoute, installReplayClock, startCollectionReplay } = require("./lib/summit-collection-replay.cjs");

async function run() {
  const browser = await webkit.launch({ headless: true });
  try {
    let url = process.env.SUMMIT_SPARK_URL;
    if (!url) {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      url = `http://127.0.0.1:${server.address().port}/`;
    }
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
