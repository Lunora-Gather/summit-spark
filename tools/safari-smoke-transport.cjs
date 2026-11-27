"use strict";

const http = require("node:http");
const { once } = require("node:events");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { setTimeout: delay } = require("node:timers/promises");
const { Builder, By, Key } = require("selenium-webdriver");
const safari = require("selenium-webdriver/safari");
const { Pointer } = require("selenium-webdriver/lib/input");

async function startFixture(upstream) {
  const port = new URL(upstream).port;
  const scripts = new Map();
  const routes = new Map();
  const blocked = new Set();
  let safeAreaFixture;
  const server = http.createServer((incoming, outgoing) => {
    const url = new URL(incoming.url, "http://127.0.0.1");
    if (routes.has(url.pathname)) return routes.get(url.pathname)(url, outgoing);
    if (blocked.has(url.pathname)) {
      outgoing.writeHead(503, {"Cache-Control": "no-store"}).end();
      return;
    }
    if (url.pathname === "/__safari_smoke_setup.js") {
      outgoing.writeHead(200, {"Content-Type": "text/javascript", "Cache-Control": "no-store"});
      outgoing.end([...scripts.values()].join("\n;\n"));
      return;
    }
    const proxy = http.request({
      hostname: "127.0.0.1",
      port,
      path: url.pathname + url.search,
      method: incoming.method
    }, response => {
      const headers = {...response.headers, "Cache-Control": "no-store"};
      const insets = url.pathname === "/summit-spark.css" ? safeAreaFixture : undefined;
      if (insets && incoming.method === "GET") {
        const css = [];
        response.on("data", chunk => css.push(chunk));
        response.on("end", () => {
          delete headers["content-length"];
          delete headers.etag;
          outgoing.writeHead(response.statusCode, headers);
          // Exercise the original Safari layout with a known unobstructed notch geometry.
          outgoing.end(Buffer.concat(css).toString("utf8").replace(
            /env\(safe-area-inset-(top|right|bottom|left)(?:,\s*[\w.%-]+)?\)/g,
            (_, side) => insets[side] + "px"
          ));
        });
        return;
      }
      if (!response.headers["content-type"]?.startsWith("text/html") || incoming.method === "HEAD") {
        outgoing.writeHead(response.statusCode, headers);
        response.pipe(outgoing);
        return;
      }
      const buffers = [];
      response.on("data", chunk => buffers.push(chunk));
      response.on("end", () => {
        delete headers["content-length"];
        delete headers.etag;
        outgoing.writeHead(response.statusCode, headers);
        outgoing.end(Buffer.concat(buffers).toString("utf8").replace(
          "<head>", '<head><script src="/__safari_smoke_setup.js"></script>'
        ));
      });
    });
    proxy.on("error", error => outgoing.destroy(error));
    incoming.pipe(proxy);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    scripts,
    routes,
    blocked,
    setSafeAreaFixture(insets) {safeAreaFixture = insets;},
    async close() {
      const closed = once(server, "close");
      server.close();
      server.closeAllConnections();
      await closed;
    }
  };
}

function safariKey({code, key}) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(-1).toLowerCase();
  if (/^Digit[0-9]$/.test(code)) return code.slice(-1);
  const aliases = {Escape: Key.ESCAPE, Enter: Key.ENTER, Tab: Key.TAB, Space: Key.SPACE, " ": Key.SPACE,
    ArrowLeft: Key.ARROW_LEFT, ArrowRight: Key.ARROW_RIGHT, ArrowDown: Key.ARROW_DOWN, ArrowUp: Key.ARROW_UP,
    F3: Key.F3, Shift: Key.SHIFT, ShiftLeft: Key.SHIFT, ShiftRight: Key.SHIFT, Backspace: Key.BACK_SPACE};
  return aliases[code] ?? aliases[key] ?? key;
}

function isHostedMac() {
  return process.platform === "darwin" && process.env.GITHUB_ACTIONS === "true" &&
    process.env.RUNNER_ENVIRONMENT === "github-hosted" && process.env.RUNNER_OS === "macOS";
}

function requireSafariPermission() {
  if (isHostedMac() || process.argv.slice(2).includes("--allow-local-safari")) return;
  throw new Error("Use npm run test:webkit for background debugging. For release verification, use the remote Mac " +
    "or ask the user before operating their Safari. Add --allow-local-safari only after they agree to this run.");
}

async function createSafariSession(deviceUDID) {
  requireSafariPermission();
  const hostedDesktop = !deviceUDID && isHostedMac();
  const attempts = hostedDesktop ? 2 : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const service = new safari.ServiceBuilder("/usr/bin/safaridriver").build();
    try {
      const address = await service.start(deviceUDID ? 120_000 : undefined);
      const builder = new Builder().disableEnvironmentOverrides().usingServer(address).forBrowser("safari");
      if (deviceUDID) builder.withCapabilities({
        browserName: "safari",
        platformName: "iOS",
        "safari:useSimulator": true,
        "safari:deviceUDID": deviceUDID
      });
      return { driver: await builder.build(), service };
    } catch (error) {
      await service.kill();
      const startupFailure = /timed out while connecting to a Safari instance|Server terminated early/i.test(error.message);
      if (attempt === attempts || !startupFailure) throw error;
      console.warn("Safari could not open its first automation window. Retrying on the disposable Mac.");
      await promisify(execFile)("/usr/bin/killall", ["-TERM", "Safari"]).catch(() => {});
      await delay(1500);
    }
  }
}

async function launchSafari(fixture, deviceUDID) {
  const { driver, service } = await createSafariSession(deviceUDID);
  const finger = new Pointer("smoke-finger", Pointer.Type.TOUCH);
  return {
    async evaluate(expression) {
      const result = await driver.executeAsyncScript(`const done = arguments[0]; (async () => (
        ${expression}
      ))().then(value => done({value}), error => done({error: String(error)}));`);
      if (result.error) throw new Error("Evaluation failed: " + result.error + "\n" + expression);
      return result.value;
    },
    navigate(url) { return driver.get(url); },
    reload() { return driver.navigate().refresh(); },
    addInitScript({source}) {
      const id = Symbol();
      fixture.scripts.set(id, source);
      return id;
    },
    removeInitScript(id) { fixture.scripts.delete(id); },
    blockAsset(pathname) { fixture.blocked.add(pathname); },
    unblockAssets() { fixture.blocked.clear(); },
    async setViewport(width, height, { mobile = false, pixelRatio } = {}) {
      if (mobile !== Boolean(deviceUDID)) throw new Error("The requested viewport requires a matching Safari device");
      if (pixelRatio && pixelRatio !== await driver.executeScript("return devicePixelRatio")) {
        throw new Error("Safari device pixel ratio differs from the requested fixture");
      }
      if (mobile) {
        const viewport = await driver.executeScript("return [innerWidth, innerHeight]");
        if (viewport[0] !== width || viewport[1] !== height) {
          throw new Error("Select a simulator with the required viewport: " + width + " x " + height);
        }
        return;
      }
      const [dx, dy] = await driver.executeScript("return [outerWidth - innerWidth, outerHeight - innerHeight]");
      await driver.manage().window().setRect({x: 0, y: 0, width: width + dx, height: height + dy});
    },
    async clickElement(selector) {
      await driver.findElement(By.css(selector)).click();
    },
    async clickAt(x, y) {
      await driver.actions().move({x: Math.round(x), y: Math.round(y)}).press().perform();
      await driver.actions().release().perform();
    },
    keyDown(code, key, shift = false) {
      const actions = driver.actions();
      if (shift) actions.keyDown(Key.SHIFT);
      return actions.keyDown(safariKey({code, key})).perform();
    },
    keyUp(code, key, shift = false) {
      const actions = driver.actions().keyUp(safariKey({code, key}));
      if (shift) actions.keyUp(Key.SHIFT);
      return actions.perform();
    },
    touchDown({x, y}) {
      if (!deviceUDID) throw new Error("Touch requires native iOS Safari");
      const move = finger.move({x: Math.round(x), y: Math.round(y), duration: 0});
      return driver.actions().insert(finger, move, finger.press()).perform();
    },
    touchUp() {
      if (!deviceUDID) throw new Error("Touch requires native iOS Safari");
      return driver.actions().insert(finger, finger.release()).perform();
    },
    insertText(text) {
      return driver.executeScript(value => {
        const editor = document.activeElement;
        editor.setRangeText(value, editor.selectionStart, editor.selectionEnd, "end");
        editor.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText", data: value}));
      }, text);
    },
    setSafeAreaFixture: fixture.setSafeAreaFixture,
    async close() {
      try { await driver.quit(); } finally { await service.kill(); }
    }
  };
}
module.exports = { createSafariSession, launchSafari, requireSafariPermission, startFixture };
