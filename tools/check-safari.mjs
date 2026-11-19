// Native Safari exercise of the player entry point and saved training recommendation.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { once } from "node:events";
import { Builder, By, until } from "selenium-webdriver";
import { checkStorageRecovery } from "./check-storage-recovery.cjs";
import safari from "selenium-webdriver/safari.js";

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
  await driver.findElement(By.id("guestEntryButton")).click();
  const start = await driver.findElement(By.id("startButton"));
  await driver.wait(until.elementIsVisible(start), 10000);
  await driver.wait(until.elementIsEnabled(start), 10000);
  await start.click();
  await driver.wait(() => driver.executeScript('return document.querySelector("#overlay").classList.contains("hidden")'), 5000);
  await driver.executeScript('localStorage.setItem("summit-spark-room-focus", JSON.stringify({schemaVersion:1,rooms:[{faults:4,fall:4,drills:1,cleanWins:0}]}))');
  await driver.navigate().refresh();
  await driver.wait(ready, 10000);
  const resume = await driver.findElement(By.id("resumeTrainingButton"));
  await driver.wait(until.elementIsVisible(resume), 5000);
  assert.match(await resume.getText(), /继续训练/);
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
  console.log("Safari passed: start climbing, reload saved recommendation, enter training, recover corrupt storage.");
} finally {
  try { await driver?.quit(); } finally { server.kill(); await service.kill(); }
}
