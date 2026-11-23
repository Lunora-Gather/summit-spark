// Native Safari exercise of the player entry point and saved training recommendation.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import net from "node:net";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { once } from "node:events";
import { Builder, By, Key, until } from "selenium-webdriver";
import { checkStorageRecovery } from "./check-storage-recovery.cjs";
import safari from "selenium-webdriver/safari.js";
import { maps } from "../public/modules/game/room-data.mjs";
import { roomEntrySpawnData } from "../public/modules/game/world-model.mjs";

// Safari automation can mask Canvas readbacks. Sample the composited viewport instead.
async function terrainPixel(driver, tileX, tileY, columns, expected) {
  await driver.executeScript(() => document.getElementById("roomTerrainMap").scrollIntoView({ block: "center", behavior: "instant" }));
  let lastSample;
  const geometry = await driver.wait(async () => {
    lastSample = await driver.executeScript((x, y, columns) => {
      const canvas = document.getElementById("roomTerrainMap");
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
      const tile = canvas.width / columns;
      const px = rect.left + (rect.width - canvas.width * scale) / 2 + x * tile * scale;
      const py = rect.top + (rect.height - canvas.height * scale) / 2 + y * tile * scale;
      const context = canvas.getContext("2d");
      let source;
      try { source = Array.from(context.getImageData(x * tile, y * tile, 1, 1).data); }
      catch (error) { source = String(error); }
      return { point: [(px - rect.left) / rect.width, (py - rect.top) / rect.height], visible: document.elementFromPoint(px, py) === canvas,
        source, contextLost: context.isContextLost?.() };
    }, tileX, tileY, columns);
    return lastSample.visible && expected.every((value, i) => value === lastSample.source[i]) && lastSample;
  }, 12000, () => "Practice marker failed to paint: " + JSON.stringify(lastSample));
  const { point } = geometry;
  assert.ok(geometry.visible, "The terrain marker must be visible inside the scrolling practice drawer");
  assert.ok(point.every(value => value >= 0 && value < 1), "Terrain marker must be on screen");
  // Safari snapshots the element's own bounds, independent of the host window backing scale.
  const terrain = await driver.findElement(By.id("roomTerrainMap"));
  const png = Buffer.from(await terrain.takeScreenshot(), "base64");
  if (process.env.RUNNER_TEMP) writeFileSync(join(process.env.RUNNER_TEMP, "practice-map.png"), png);
  const reader = `
    import Foundation
    import ImageIO
    import CoreGraphics
    let data = FileHandle.standardInput.readDataToEndOfFile()
    let source = CGImageSourceCreateWithData(data as CFData, nil)!
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)!
    let x = floor(Double(CommandLine.arguments[1])! * Double(image.width))
    let y = floor(Double(CommandLine.arguments[2])! * Double(image.height))
    let sample = image.cropping(to: CGRect(x: x, y: y, width: 1, height: 1))!
    let rgb = CGColorSpace(name: CGColorSpace.sRGB)!
    let context = CGContext(data: nil, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4,
                            space: rgb, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.draw(sample, in: CGRect(x: 0, y: 0, width: 1, height: 1))
    print(Array(UnsafeBufferPointer(start: context.data!.assumingMemoryBound(to: UInt8.self), count: 4)))
  `;
  return JSON.parse(execFileSync("/usr/bin/swift", ["-e", reader, ...point.map(String)], { input: png }));
}

const probe = net.createServer().listen(0, "127.0.0.1");
await once(probe, "listening");
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const server = spawn(process.execPath, ["game-server.js"], { env: { ...process.env, PORT: String(port) } });
const service = new safari.ServiceBuilder("/usr/bin/safaridriver").build();
let driver;
try {
  driver = await new Builder().disableEnvironmentOverrides().usingServer(await service.start()).forBrowser("safari").build();
  const url = `http://127.0.0.1:${port}/`;
  await driver.wait(async () => { try { return (await fetch(url)).ok; } catch { return false; } }, 10000);
  await driver.manage().window().setRect({ width: 1280, height: 800 });
  await driver.get(url);
  const ready = () => driver.executeScript('return document.documentElement.classList.contains("app-ready")');
  await driver.wait(ready, 10000);
  const calibration = await driver.executeScript(() => {
    const results = [];
    for (const willReadFrequently of [false, true]) {
      const probe = document.createElement("canvas");
      probe.width = probe.height = 16;
      const context = probe.getContext("2d", { willReadFrequently });
      context.fillStyle = "#5a91b2";
      context.fillRect(0, 0, 16, 16);
      try { results.push(Array.from(context.getImageData(1, 1, 1, 1).data)); }
      catch (error) { results.push(String(error)); }
    }
    return results;
  });
  console.log("Safari Canvas display calibration (default and readback surfaces)", calibration);
  const titleArtReady = await driver.executeAsyncScript(async done => {
    const cover = new Image();
    cover.src = "assets/moonlit-pass.jpg";
    try {
      await cover.decode();
      done(cover.naturalWidth >= 960 && getComputedStyle(document.querySelector("#overlay")).backgroundImage.includes("moonlit-pass.jpg"));
    } catch { done(false); }
  });
  assert.ok(titleArtReady, "The painted title scene must load from the game directory");
  await driver.findElement(By.id("guestEntryButton")).click();
  const start = await driver.findElement(By.id("startButton"));
  await driver.wait(until.elementIsVisible(start), 10000);
  await driver.wait(until.elementIsEnabled(start), 10000);
  // Observe the canvas itself so a download without an actual draw cannot pass.
  await driver.executeScript(() => {
    const game = document.querySelector("#game");
    const prototype = CanvasRenderingContext2D.prototype;
    const drawImage = prototype.drawImage;
    const materials = new WeakMap();
    const landmarks = new WeakMap();
    window.paintedLandmarks = new Set();
    window.supportFrames = new Set();
    prototype.drawImage = function (image, ...args) {
      const result = drawImage.call(this, image, ...args);
      if (image instanceof HTMLImageElement && image.src.includes("/assets/terrain/")) {
        materials.set(this.canvas, new URL(image.src).pathname.split("/").pop());
      }
      if (this.canvas === game && image instanceof HTMLImageElement && image.src.endsWith("/abutments.webp")) {
        window.supportFrames.add(args[0] / args[2] + 4 * args[1] / args[3]);
      }
      if (this.canvas === game && image instanceof HTMLImageElement && image.src.endsWith("/lumens.png")) {
        window.lastLumenChapter = args[0] / args[2] + 2 * args[1] / args[3];
      }
      if (image instanceof HTMLImageElement && image.src.endsWith("/ledges.png")) {
        landmarks.set(this.canvas, Math.floor(args[0] / (image.naturalWidth / 2)) + 2 * args[1] / args[3]);
      }
      if (this.canvas === game && landmarks.has(image)) window.paintedLandmarks.add(landmarks.get(image));
      if (this.canvas === game && materials.has(image)) window.lastPaintedMaterial = materials.get(image);
      if (this.canvas === game && image instanceof HTMLImageElement && image.src.includes("/assets/rooms/") && this.globalAlpha === 1) {
        window.lastPaintedRoom = new URL(image.src).pathname.split("/").pop();
      }
      return result;
    };
  });
  await start.click();
  await driver.wait(() => driver.executeScript('return window.lastPaintedRoom === "gate.jpg" && window.lastPaintedMaterial === "moss.jpg" && window.lastLumenChapter === 0 && window.paintedLandmarks.has(0) && window.supportFrames.has(0)'), 5000);
  await driver.wait(() => driver.executeScript('return document.querySelector("#overlay").classList.contains("hidden")'), 5000);
  const guideKeys = await driver.findElements(By.css("#openingGuideControls kbd"));
  assert.equal(guideKeys.length, 4);
  assert.ok((await guideKeys[1].getText()).length > 0);
  const keyEvent = (code, type) => driver.executeScript((code, type) =>
    window.dispatchEvent(new KeyboardEvent(type, {code, bubbles: true, cancelable: true})), code, type);
  await keyEvent("Escape", "keydown");
  await keyEvent("Escape", "keyup");
  assert.equal(await driver.findElement(By.id("panelTitle")).getText(), "已暂停");
  const resumePlay = await driver.findElement(By.id("settingsClose"));
  assert.equal(await resumePlay.getText(), "继续攀登");
  await resumePlay.click();
  await driver.wait(() => driver.executeScript('return settingsPanel.classList.contains("hidden")'), 5000);
  await driver.manage().window().setRect({ width: 390, height: 820 });
  for (const code of ["F3", "Digit0"]) {
    await keyEvent(code, "keydown");
    await keyEvent(code, "keyup");
  }
  await driver.wait(() => driver.executeScript('return window.lastPaintedRoom === "summit.jpg" && window.lastPaintedMaterial === "glacier.jpg" && window.lastLumenChapter === 3 && window.paintedLandmarks.has(7) && window.supportFrames.has(7)'), 5000);
  for (const code of ["KeyH", "F3"]) {
    await keyEvent(code, "keydown");
    await keyEvent(code, "keyup");
  }
  const adviceButton = await driver.wait(until.elementLocated(By.css(".finish-summary .primary-review")), 8000);
  const recommendationFits = await driver.executeScript(() => {
    const card = document.querySelector(".finish-summary .review-card.primary");
    const advice = card.querySelector(".review-advice").getBoundingClientRect();
    const button = card.querySelector("button").getBoundingClientRect();
    const progress = document.querySelector(".finish-progress").getBoundingClientRect();
    const bounds = card.getBoundingClientRect();
    return advice.height > 0 && advice.bottom <= bounds.bottom + 1
      && bounds.bottom <= progress.top + 1 && button.height >= 44;
  });
  assert.ok(recommendationFits, "The summit card must contain the advice and clear the progress row");
  await adviceButton.click();
  await driver.wait(() => driver.executeScript('return document.querySelector("#overlay").classList.contains("hidden") && /Drill/.test(document.querySelector("#gameStatus").textContent)'), 5000);
  await driver.manage().window().setRect({ width: 1280, height: 800 });
  await driver.executeScript('localStorage.setItem("summit-spark-room-focus", JSON.stringify({schemaVersion:1,rooms:[{faults:4,fall:4,drills:1,cleanWins:0}]}))');
  await driver.navigate().refresh();
  await driver.wait(ready, 10000);
  const resume = await driver.findElement(By.id("resumeTrainingButton"));
  await driver.wait(until.elementIsVisible(resume), 5000);
  assert.match(await resume.getText(), /继续训练/);
  await driver.manage().window().setRect({ width: 840, height: 320 });
  const menuFits = await driver.executeScript(() => {
    const frame = document.querySelector("#overlay").getBoundingClientRect();
    const controls = document.querySelectorAll("#startPanel .launch-signature, #startPanel h1, #startPanel .start-actions button");
    return [...controls].every(element => {
      const rect = element.getBoundingClientRect();
      return rect.height > 0 && rect.top >= frame.top && rect.bottom <= frame.bottom;
    });
  });
  assert.ok(menuFits, "Short landscape menu must fit the title and all five actions, including resume");

  await driver.manage().window().setRect({ width: 690, height: 850 });
  await driver.findElement(By.id("startAccountButton")).click();
  const panel = await driver.findElement(By.id("settingsPanel"));
  await driver.wait(until.elementIsVisible(panel), 5000);
  const form = await driver.executeScript(() => {
    const rect = document.querySelector("#settingsPanel").getBoundingClientRect();
    return { width: rect.width, centerOffset: rect.left + rect.width / 2 - innerWidth / 2,
      fontSize: parseFloat(getComputedStyle(document.querySelector("#accountEmail")).fontSize) };
  });
  assert.ok(form.width <= 430 && Math.abs(form.centerOffset) <= 1 && form.fontSize >= 16, JSON.stringify(form));
  await driver.findElement(By.id("settingsClose")).click();
  await driver.wait(until.elementIsNotVisible(panel), 5000);
  await driver.findElement(By.id("openTrainingButton")).click();
  await driver.wait(until.elementIsVisible(panel), 5000);
  const spaceAboveLaunch = await driver.executeScript(() => {
    const lastGroup = document.querySelector(".settings-group-training").getBoundingClientRect();
    const dock = document.querySelector("#practiceLaunchDock").getBoundingClientRect();
    return dock.top - lastGroup.bottom;
  });
  assert.ok(spaceAboveLaunch >= 0 && spaceAboveLaunch < 40, "Collapsed Practice should fit its visible rows after visiting Account");
  await driver.findElement(By.css(".settings-group-room > summary")).click();
  const roomSelect = await driver.findElement(By.id("roomSelect"));
  async function chooseRoom(index) {
    await driver.executeScript(select => select.scrollIntoView({ block: "center", behavior: "instant" }), roomSelect);
    await roomSelect.findElement(By.css(`option[value="${index}"]`)).click();
  }
  await chooseRoom(1);
  await driver.findElement(By.css("#roomTerrain > summary")).click();
  const terrain = await driver.findElement(By.id("roomTerrainMap"));
  await driver.wait(async () => (await terrain.getAttribute("data-room")) === "1", 5000);
  assert.match(await terrain.getAttribute("aria-label"), /R2 光继横桥/);
  const entry = roomEntrySpawnData(maps[1]);
  const pixel = await terrainPixel(driver, entry.tileX + 0.55, entry.tileY + 0.68, maps[1][0].length, [214, 243, 239, 255]);
  assert.deepEqual(pixel, [214, 243, 239, 255], "Checkpoint entries must also show the start marker");
  assert.ok(await driver.findElement(By.id("terrainCampKey")).isDisplayed());
  assert.match(await terrain.getAttribute("aria-label"), /光继/);
  assert.match(await driver.findElement(By.id("terrainMechanics")).getText(), /光继/);
  const zoom = await driver.findElement(By.id("terrainZoom"));
  await zoom.click();
  assert.equal(await zoom.getAttribute("aria-pressed"), "true");
  await chooseRoom(0);
  await driver.wait(async () => (await terrain.getAttribute("data-room")) === "0", 5000);
  assert.equal(await zoom.getAttribute("aria-pressed"), "false");
  assert.ok(!await driver.findElement(By.id("terrainCampKey")).isDisplayed());
  assert.match(await driver.findElement(By.id("terrainExitKey")).getText(), /向右出房/);
  await chooseRoom(9);
  await driver.wait(async () => (await terrain.getAttribute("data-room")) === "9", 5000);
  assert.match(await driver.findElement(By.id("terrainExitKey")).getText(), /星顶终点/);
  const viewport = await driver.findElement(By.id("terrainViewport"));
  await driver.executeScript(button => button.focus(), zoom);
  await zoom.sendKeys(Key.ENTER);
  await driver.wait(() => driver.executeScript(el => document.activeElement === el, viewport), 3000);
  const mapScroll = () => driver.executeScript(el => ({
    left: el.scrollLeft, max: el.scrollWidth - el.clientWidth,
    indicator: !document.getElementById("terrainPosition").hidden
  }), viewport);
  assert.ok((await mapScroll()).indicator, "A cropped map should show the displayed portion");
  await viewport.sendKeys(Key.ARROW_RIGHT);
  assert.ok((await mapScroll()).left > 0);
  await viewport.sendKeys(Key.END);
  let position = await mapScroll();
  assert.ok(Math.abs(position.left - position.max) <= 1);
  await viewport.sendKeys(Key.HOME);
  assert.equal((await mapScroll()).left, 0);
  await viewport.sendKeys(Key.ESCAPE);
  assert.equal(await zoom.getAttribute("aria-pressed"), "false");
  assert.ok(await panel.isDisplayed());
  assert.ok(await driver.executeScript(el => document.activeElement === el, zoom));
  const summitRow = maps[9].findIndex(row => row.includes("H"));
  const summitColumn = maps[9][summitRow].indexOf("H");
  const summitMark = await terrainPixel(driver, summitColumn + 0.5, summitRow + 0.5, maps[9][0].length, [255, 223, 154, 255]);
  assert.deepEqual(summitMark, [255, 223, 154, 255], "The last room preview must mark its actual summit");
  await chooseRoom(1);
  const target = await driver.findElement(By.id("practiceLaunchTarget")).getText();
  const launch = await driver.findElement(By.id("focusRoomButton"));
  assert.match(await launch.getText(), /^开始 R2 /);
  assert.ok(target.startsWith("目标：") && (await launch.getAttribute("title")).startsWith(target));
  await driver.findElement(By.id("settingsClose")).click();
  await driver.wait(until.elementIsNotVisible(panel), 5000);
  await driver.manage().window().setRect({ width: 1280, height: 800 });
  await driver.wait(() => driver.executeScript(button => {
    const rect = button.getBoundingClientRect();
    return !button.disabled && rect.height > 0 && button.contains(document.elementFromPoint(
      rect.left + rect.width / 2, rect.top + rect.height / 2));
  }, resume), 6000, "The launch menu must restore the saved training action after closing Practice");
  await resume.click();
  await driver.wait(() => driver.executeScript('return /Drill/.test(document.querySelector("#gameStatus").textContent)'), 5000);
  const recoveryErrors = await checkStorageRecovery(
    (readPage) => driver.executeScript(readPage),
    async () => {
      await driver.navigate().refresh();
      await driver.wait(ready, 10000);
    }
  );
  assert.deepEqual(recoveryErrors, []);
  console.log("Safari passed: climb, fit the resume menu and account form, select a training goal, resume and recover storage.");
} finally {
  try { await driver?.quit(); } finally { server.kill(); await service.kill(); }
}
