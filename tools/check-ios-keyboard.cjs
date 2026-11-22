"use strict";

const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { setTimeout: delay } = require("node:timers/promises");
const run = promisify(execFile);

// Runs in a normal Mobile Safari tab. Only observe the app and report actual viewport changes.
function observeKeyboard() {
  let last = "";
  let touch;
  let entryTapped = false;
  document.addEventListener("pointerdown", event => {
    if (!event.isTrusted || event.pointerType !== "touch") return;
    touch = {
      x: (event.clientX - visualViewport.offsetLeft) * visualViewport.scale,
      y: (event.clientY - visualViewport.offsetTop) * visualViewport.scale
    };
  }, true);
  let fieldTapped = false;
  document.addEventListener("click", event => {
    if (event.isTrusted && event.target.closest("#accountEntryButton")) entryTapped = true;
  }, true);
  document.addEventListener("pointerup", event => {
    if (event.isTrusted && event.pointerType === "touch" && event.target.id === "accountEmail") fieldTapped = true;
  }, true);
  setInterval(() => {
    if (!document.documentElement.classList.contains("app-ready")) return;
    const panel = document.getElementById("settingsPanel");
    const field = document.getElementById("accountEmail");
    const rect = field.getBoundingClientRect();
    const viewport = visualViewport;
    const target = panel.classList.contains("account-focused") ? field : document.getElementById("accountEntryButton");
    const box = target.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const report = JSON.stringify({
      screen: { width: screen.width, height: screen.height }, touch,
      target: { x: (x - viewport.offsetLeft) * viewport.scale, y: (y - viewport.offsetTop) * viewport.scale,
        visible: target.contains(document.elementFromPoint(x, y)) },
      height: viewport.height, open: panel.classList.contains("account-focused"), entryTapped, fieldTapped,
      focused: document.activeElement === field,
      scrolls: ["auto", "scroll"].includes(getComputedStyle(panel.querySelector(".settings-body")).overflowY),
      visible: rect.height > 0 && rect.top >= viewport.offsetTop - 1 && rect.bottom <= viewport.offsetTop + viewport.height + 1
    });
    if (report !== last) {
      last = report;
      void fetch("/__ios_keyboard?state=" + encodeURIComponent(report));
    }
  }, 150);
}

async function checkIOSKeyboard(fixture, udid) {
  let state;
  fixture.routes.set("/__ios_keyboard", (url, response) => {
    state = JSON.parse(url.searchParams.get("state"));
    response.writeHead(204, { "Cache-Control": "no-store" }).end();
  });
  fixture.scripts.set("keyboard", "(" + observeKeyboard.toString() + ")();");
  const axe = (...args) => run("axe", [...args, "--udid", udid], { timeout: 45000, maxBuffer: 4 * 1024 * 1024 });
  async function waitFor(label, predicate) {
    const until = Date.now() + 25000;
    while (Date.now() < until) {
      if (state && predicate(state)) return;
      await delay(150);
    }
    throw new Error(label + ": " + JSON.stringify(state));
  }
  const tap = (x, y) => axe("tap", "-x", String(x), "-y", String(y), "--tap-style", "physical");
  try {
    await run("xcrun", ["simctl", "openurl", udid, fixture.url + "/?native-keyboard"]);
    await waitFor("Regular Safari loads the entry gate", report => !report.open && report.target.visible);
    const fullHeight = state.height;
    // Mobile Safari places its viewport below the status bar. Measure its actual screen origin
    // with one touch in the entry artwork, using the coordinates delivered by WebKit itself.
    const probe = { x: Math.round(state.screen.width * 0.04), y: Math.round(state.screen.height * 0.25) };
    await tap(probe.x, probe.y);
    await waitFor("Receive the simulator touch in the entry artwork", report => !report.open && report.touch);
    const left = probe.x - state.touch.x, top = probe.y - state.touch.y;
    await tap(left + state.target.x, top + state.target.y);
    await waitFor("A native tap opens Account", report => report.entryTapped && report.open && report.target.visible);
    await tap(left + state.target.x, top + state.target.y);
    await waitFor("The software keyboard opens with its field in view", report => report.fieldTapped && report.focused &&
      report.scrolls && report.visible && report.height < fullHeight - 80);
    console.log("Native Safari keyboard verified at viewport heights " + fullHeight + " → " + state.height);
  } catch (error) {
    if (process.env.RUNNER_TEMP) {
      await run("xcrun", ["simctl", "io", udid, "screenshot", process.env.RUNNER_TEMP + "/ios-keyboard.png"]).catch(() => {});
    }
    throw error;
  } finally {
    fixture.scripts.delete("keyboard");
    fixture.routes.delete("/__ios_keyboard");
  }
}

module.exports = { checkIOSKeyboard };
