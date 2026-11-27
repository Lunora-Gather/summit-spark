"use strict";

const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { setTimeout: delay } = require("node:timers/promises");
const run = promisify(execFile);

// This observer runs inside an ordinary Mobile Safari tab. All interaction comes from the simulator touchscreen.
function observePage() {
  const scene = new URLSearchParams(location.search).get("native-ios");
  if (!scene) return;
  let reporting = false;
  let navigating = false;
  let touch;
  let tapped;
  document.addEventListener("pointerdown", event => {
    if (!event.isTrusted || event.pointerType !== "touch") return;
    touch = {
      x: (event.clientX - visualViewport.offsetLeft) * visualViewport.scale,
      y: (event.clientY - visualViewport.offsetTop) * visualViewport.scale
    };
  }, true);
  document.addEventListener("pointerup", event => {
    if (event.isTrusted && event.pointerType === "touch" && event.target.id === "accountEmail") tapped = "accountEmail";
  }, true);
  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (event.isTrusted && button) tapped = button.id;
  }, true);

  const insets = document.createElement("div");
  insets.style.cssText = "position:fixed;pointer-events:none;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  setInterval(async () => {
    if (reporting || navigating || !document.documentElement.classList.contains("app-ready")) return;
    const viewport = visualViewport;
    const gate = document.getElementById("entryGate");
    const account = document.getElementById("settingsPanel");
    const field = document.getElementById("accountEmail");
    const accountOpen = account.classList.contains("account-focused");
    const playing = document.querySelector(".stage").classList.contains("run-started");
    const target = scene === "keyboard"
      ? (accountOpen ? field : document.getElementById("accountEntryButton"))
      : document.getElementById("guestEntryButton");
    const box = target.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const state = {
      screen: { width: screen.width, height: screen.height }, touch, tapped, playing, height: viewport.height,
      target: { x: (x - viewport.offsetLeft) * viewport.scale, y: (y - viewport.offsetTop) * viewport.scale,
        visible: box.width > 0 && box.height > 0 && target.contains(document.elementFromPoint(x, y)) }
    };
    if (scene === "entry" || scene === "notch") {
      if (!insets.isConnected) document.body.append(insets);
      const style = getComputedStyle(insets);
      const safe = Object.fromEntries(["Top", "Right", "Bottom", "Left"].map(side => [side, parseFloat(style["padding" + side])]));
      const rect = gate.getBoundingClientRect();
      state.entry = {
        safe, top: rect.top, below: innerHeight - rect.bottom, left: rect.left, right: innerWidth - rect.right,
        buttons: [...gate.querySelectorAll("button")].map(button => {
          const rect = button.getBoundingClientRect();
          return [rect.width, rect.height];
        }),
        briefHidden: getComputedStyle(document.getElementById("portraitBrief")).visibility === "hidden",
        guestFocused: document.activeElement === document.getElementById("guestEntryButton"),
        touchCount: navigator.maxTouchPoints, viewport: document.querySelector('meta[name="viewport"]').content
      };
    } else if (scene === "keyboard") {
      const rect = field.getBoundingClientRect();
      state.keyboard = {
        open: accountOpen, focused: document.activeElement === field,
        scrolls: ["auto", "scroll"].includes(getComputedStyle(account.querySelector(".settings-body")).overflowY),
        visible: rect.height > 0 && rect.top >= viewport.offsetTop - 1 && rect.bottom <= viewport.offsetTop + viewport.height + 1
      };
    } else if (playing && !document.getElementById("touchControls").hidden) {
      const stage = document.querySelector(".stage").getBoundingClientRect();
      const goal = document.getElementById("portraitRoomGoal");
      state.firstJumpHint = document.getElementById("openingGuide").hidden &&
        getComputedStyle(goal).visibility === "visible" && goal.getBoundingClientRect().height > 0 &&
        goal.textContent.includes("第一道山隙") && document.getElementById("game").getAttribute("aria-describedby") === goal.id;
      state.controls = [...document.querySelectorAll("#touchControls button")].filter(button => button.offsetHeight).map(button => {
        const rect = button.getBoundingClientRect();
        return { action: button.dataset.touch || button.dataset.touchCommand, width: rect.width, height: rect.height, gap: rect.top - stage.bottom,
          left: rect.left - viewport.offsetLeft, right: viewport.offsetLeft + viewport.width - rect.right,
          below: viewport.offsetTop + viewport.height - rect.bottom };
      });
    }
    // Keep one request in flight and repeat the snapshot if Mobile Safari briefly drops the connection.
    reporting = true;
    try {
      const response = await fetch("/__ios_state?scene=" + scene + "&state=" + encodeURIComponent(JSON.stringify(state)), {
        cache: "no-store", signal: AbortSignal.timeout(5000)
      });
      if (response.status === 200) {
        const nextScene = await response.text();
        navigating = true;
        location.replace("/?native-ios=" + encodeURIComponent(nextScene));
      }
    } catch {
      // The next report also polls for a scene change.
    } finally {
      reporting = false;
    }
  }, 150);
}

async function checkIOSSafari(fixture, udid) {
  let currentScene;
  let state;
  fixture.routes.set("/__ios_state", (url, response) => {
    if (url.searchParams.get("scene") !== currentScene) {
      response.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end(currentScene);
      return;
    }
    state = JSON.parse(url.searchParams.get("state"));
    response.writeHead(204, { "Cache-Control": "no-store" }).end();
  });
  fixture.scripts.set("ios", "(" + observePage.toString() + ")();");
  // Submit a single native simulator tap. Separate down/up delivery under load can select button text.
  const tap = (x, y) => run("axe", ["tap", "-x", String(x), "-y", String(y), "--tap-style", "simulator", "--udid", udid], { timeout: 45000 });
  async function waitFor(label, predicate, timeout = 25000) {
    const until = Date.now() + timeout;
    while (!state || !predicate(state)) {
      if (Date.now() >= until) throw new Error(label + ": " + JSON.stringify(state));
      await delay(150);
    }
  }
  async function openScene(scene) {
    const firstPage = !currentScene;
    currentScene = scene;
    state = undefined;
    // Use the same tab for the whole run, including the transition away from the open keyboard.
    if (firstPage) await run("xcrun", ["simctl", "openurl", udid, fixture.url + "/?native-ios=" + scene]);
    await waitFor("Load " + scene + " in Mobile Safari", report => report.target.visible, firstPage ? 120000 : 60000);
    console.log("Mobile Safari ready for " + scene);
  }
  async function locateViewport() {
    // Measure the native toolbar offset with a touch in a clear part of the entry artwork.
    const probe = { x: Math.round(state.screen.width * 0.04), y: Math.round(state.screen.height * 0.25) };
    await tap(probe.x, probe.y);
    await waitFor("Measure the Safari viewport from a native touch", report => report.touch);
    return { x: probe.x - state.touch.x, y: probe.y - state.touch.y };
  }
  const tapTarget = origin => tap(origin.x + state.target.x, origin.y + state.target.y);
  try {
    for (const scene of ["entry", "notch"]) {
      const notch = scene === "notch" ? { top: 47, right: 0, bottom: 34, left: 0 } : undefined;
      fixture.setSafeAreaFixture(notch);
      await openScene(scene);
      await waitFor("First-run actions fit the " + scene + " safe area", ({entry}) =>
        entry && entry.touchCount > 0 && entry.briefHidden && entry.guestFocused &&
        Object.values(entry.safe).every(Number.isFinite) &&
        entry.top >= (notch?.top ?? entry.safe.Top) - 1 && entry.below >= (notch?.bottom ?? entry.safe.Bottom) - 1 &&
        entry.left >= entry.safe.Left - 1 && entry.right >= entry.safe.Right - 1 &&
        entry.buttons.length === 2 && entry.buttons.every(([width, height]) => width >= 44 && height >= 44) &&
        entry.viewport.includes("viewport-fit=cover") && entry.viewport.includes("interactive-widget=resizes-content"));
    }
    fixture.setSafeAreaFixture(undefined);
    await openScene("keyboard");
    const fullHeight = state.height;
    const keyboardOrigin = await locateViewport();
    await tapTarget(keyboardOrigin);
    await waitFor("A native tap opens Account", r => r.tapped === "accountEntryButton" && r.keyboard.open && r.target.visible && !r.keyboard.focused);
    await tapTarget(keyboardOrigin);
    await waitFor("The software keyboard opens with its field in view", r => r.tapped === "accountEmail" && r.keyboard.focused &&
      r.keyboard.scrolls && r.keyboard.visible && r.height < fullHeight - 80);
    console.log("Native Safari keyboard verified at viewport heights " + fullHeight + " → " + state.height);

    fixture.setSafeAreaFixture({ top: 47, right: 0, bottom: 34, left: 0 });
    await openScene("play");
    const playOrigin = await locateViewport();
    await tapTarget(playOrigin);
    await waitFor("One native tap starts the climb with one portrait jump hint and controls below the landing area", r => r.tapped === "guestEntryButton" && r.playing && r.firstJumpHint &&
      r.controls?.some(b => b.action === "up") && r.controls.some(b => b.action === "grab") &&
      r.controls.every(b => b.width >= 44 && b.height >= 44 && b.gap >= 4 && b.left >= -1 && b.right >= -1 && b.below >= 33));
    console.log("Native Safari passed entry, notch and portrait playfield checks", state.controls);
  } catch (error) {
    if (process.env.RUNNER_TEMP) {
      await run("xcrun", ["simctl", "io", udid, "screenshot", process.env.RUNNER_TEMP + "/ios-safari-screen.png"]).catch(() => {});
    }
    throw error;
  } finally {
    fixture.setSafeAreaFixture(undefined);
    fixture.scripts.delete("ios");
    fixture.routes.delete("/__ios_state");
  }
}

module.exports = { checkIOSSafari };
