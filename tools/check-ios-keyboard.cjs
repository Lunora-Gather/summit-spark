"use strict";

const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { setTimeout: delay } = require("node:timers/promises");
const run = promisify(execFile);

// Runs in a normal Mobile Safari tab. Only observe the app and report actual viewport changes.
function observeKeyboard() {
  let last = "";
  let entryTapped = false;
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
    const report = JSON.stringify({
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
  async function tap(type, label) {
    // Use the actual screen-space accessibility frame, including Safari's toolbar and safe areas.
    const { stdout } = await axe("describe-ui");
    const matches = [];
    function visit(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === type && label.test([node.AXLabel, node.AXValue, node.AXUniqueId].join(" "))) matches.push(node);
      for (const child of Array.isArray(node) ? node : node.children || []) visit(child);
    }
    visit(JSON.parse(stdout));
    if (matches.length !== 1) throw new Error("Expected one native " + type + " matching " + label + ": " + stdout.slice(0, 6500));
    const { x, y, width, height } = matches[0].frame;
    await axe("tap", "-x", String(x + width / 2), "-y", String(y + height / 2), "--tap-style", "physical");
  }
  try {
    await run("xcrun", ["simctl", "openurl", udid, fixture.url + "/?native-keyboard"]);
    await waitFor("Regular Safari loads the entry gate", report => !report.open);
    const fullHeight = state.height;
    await tap("Button", /邮箱登录/);
    await waitFor("A native tap opens Account", report => report.entryTapped && report.open);
    await tap("TextField", /邮箱|name@example\.com|accountEmail/);
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
