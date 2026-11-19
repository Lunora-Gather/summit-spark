"use strict";

const http = require("node:http");
const { once } = require("node:events");
const { Builder, Key } = require("selenium-webdriver");
const safari = require("selenium-webdriver/safari");

async function startFixture(upstream) {
  const scripts = new Map();
  const blocked = new Set();
  const server = http.createServer((incoming, outgoing) => {
    const url = new URL(incoming.url, upstream);
    if (blocked.has(url.pathname)) {
      outgoing.writeHead(503, {"Cache-Control": "no-store"}).end();
      return;
    }
    if (url.pathname === "/__safari_smoke_setup.js") {
      outgoing.writeHead(200, {"Content-Type": "text/javascript", "Cache-Control": "no-store"});
      outgoing.end([...scripts.values()].join("\n;\n"));
      return;
    }
    const proxy = http.request(url, {method: incoming.method}, response => {
      const headers = {...response.headers, "Cache-Control": "no-store"};
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
    blocked,
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

async function launchDesktopSafari(fixture) {
  const service = new safari.ServiceBuilder("/usr/bin/safaridriver").build();
  let driver;
  try {
    driver = await new Builder().disableEnvironmentOverrides()
      .usingServer(await service.start()).forBrowser("safari").build();
  } catch (error) {
    await service.kill();
    throw error;
  }
  let initSequence = 0;
  async function send(method, options = {}) {
    switch (method) {
      case "Runtime.evaluate": {
        // The original scenarios may evaluate an expression or a statement block.
        const { expression } = options;
        const script = `const done = arguments[0]; (async () => {
          return (${expression}\n);
        })().then(value => done({result: {value}}), error => done({exceptionDetails: String(error)}));`;
        return driver.executeAsyncScript(script);
      }
      case "Page.navigate":
        return driver.get(options.url);
      case "Page.reload":
        return driver.navigate().refresh();
      case "Page.addScriptToEvaluateOnNewDocument": {
        const identifier = String(++initSequence);
        fixture.scripts.set(identifier, options.source);
        return {identifier};
      }
      case "Page.removeScriptToEvaluateOnNewDocument":
        fixture.scripts.delete(options.identifier);
        return;
      case "Emulation.setDeviceMetricsOverride": {
        if (options.mobile || options.deviceScaleFactor !== 1) {
          throw new Error("This scenario requires native mobile Safari or a separate high-DPI fixture");
        }
        const [dx, dy] = await driver.executeScript("return [outerWidth - innerWidth, outerHeight - innerHeight]");
        return driver.manage().window().setRect({x: 0, y: 0, width: options.width + dx, height: options.height + dy});
      }
      case "Emulation.setTouchEmulationEnabled":
        if (options.enabled) throw new Error("This scenario requires native mobile Safari");
        return;
      case "Input.dispatchMouseEvent": {
        const action = driver.actions();
        if (options.type === "mouseReleased") return action.release().perform();
        return action.move({x: Math.round(options.x), y: Math.round(options.y)}).press().perform();
      }
      case "Input.dispatchKeyEvent": {
        const key = safariKey(options);
        if (options.modifiers === 8) {
          const action = driver.actions();
          return options.type === "keyUp"
            ? action.keyUp(key).keyUp(Key.SHIFT).perform()
            : action.keyDown(Key.SHIFT).keyDown(key).perform();
        }
        return options.type === "keyUp"
          ? driver.actions().keyUp(key).perform()
          : driver.actions().keyDown(key).perform();
      }
      case "Input.insertText":
        return driver.executeScript(text => {
          const editor = document.activeElement;
          editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, "end");
          editor.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText", data: text}));
        }, options.text);
      case "Network.enable":
      case "Network.setCacheDisabled":
        // All test responses have no-store; blocking is an HTTP fixture rule.
        return;
      case "Network.setBlockedURLs":
        fixture.blocked.clear();
        for (const entry of options.urls) {
          const match = /^\*vendor\/([\w.-]+)\*$/.exec(entry);
          if (!match) throw new Error("Unsupported test asset block: " + entry);
          fixture.blocked.add("/vendor/" + match[1]);
        }
        return;
      default:
        throw new Error("Native Safari stage has no implementation for " + method);
    }
  }
  return {
    send,
    async close() {
      try { await driver.quit(); } finally { await service.kill(); }
    }
  };
}
module.exports = { launchDesktopSafari, startFixture };
