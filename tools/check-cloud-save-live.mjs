#!/usr/bin/env node
// Explicit opt-in: creates two temporary, email-free users and deletes them.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { commitCloudSave } from "../public/modules/systems/cloud-save.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
function cli(args) {
  // Session secrets remain in this process only; never echo CLI output.
  const result = spawnSync("appwrite", [...args, "--json", "--show-secrets"], {
    cwd: root, encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024
  });
  if (result.status !== 0) throw new Error(`Appwrite ${args.slice(0, 2).join(" ")} failed`);
  return JSON.parse(result.stdout || "{}");
}
const sdkContext = vm.createContext({
  fetch: (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(20000) }),
  URL, Headers, FormData, File, Blob, console: { warn() {}, log() {} }
});
vm.runInContext(fs.readFileSync(new URL("../public/vendor/appwrite-26.2.0.js", import.meta.url), "utf8"), sdkContext);
const sdk = sdkContext.Appwrite;
const createdUsers = [];
const testId = `audit-${Date.now()}`;
const location = { databaseId: "summit-spark", tableId: "saves", rowId: testId };
const permissions = ["read", "update", "delete"].map((action) => sdk.Permission[action](sdk.Role.user(testId)));
function session(userId) {
  const value = cli(["users", "create-session", "--user-id", userId]);
  if (!value.secret) throw new Error("Temporary session secret unavailable");
  return new sdk.TablesDB(new sdk.Client().setEndpoint("https://fra.cloud.appwrite.io/v1").setProject("summit-spark").setSession(value.secret));
}
const save = (tables, expectedRow, archive) => commitCloudSave(tables, {
  location, expectedRow, data: { build: "temporary-concurrency-check", archive }, permissions
});
const isConflict = (error) => error.type === "cloud_save_conflict";
function intercept(tables, method, before) {
  return Object.fromEntries(["createTransaction", "getRow", "upsertRow", "updateTransaction", "deleteTransaction"].map((name) => [name, async (args) => {
    if (name === method) await before(args);
    return tables[name](args);
  }]));
}

try {
  for (const userId of [testId, `${testId}-other`]) {
    cli(["users", "create", "--user-id", userId, "--name", "Temporary cloud concurrency verification"]);
    createdUsers.push(userId);
  }
  const a = session(testId);
  const b = session(testId);
  const outsider = session(`${testId}-other`);
  const base = await save(a, null, "baseline");
  assert.equal(base.archive, "baseline");
  const newer = await save(a, base, "device-A-newer");
  await assert.rejects(save(b, base, "device-B-stale"), isConflict);
  assert.equal((await a.getRow(location)).archive, "device-A-newer");
  console.log("PASS: stale authenticated device cannot overwrite a newer save.");

  const racingB = intercept(b, "updateTransaction", async ({ commit }) => {
    if (commit) await save(a, newer, "device-A-during-commit");
  });
  await assert.rejects(save(racingB, newer, "device-B-racing"), isConflict);
  assert.equal((await a.getRow(location)).archive, "device-A-during-commit");
  console.log("PASS: server rejects a write racing between version check and commit.");

  const latest = await a.getRow(location);
  const failing = intercept(b, "updateTransaction", async ({ commit }) => {
    if (commit) throw Object.assign(new Error("simulated network outage"), { code: 503 });
  });
  await assert.rejects(save(failing, latest, "must-not-persist"), (error) => error.code === 503);
  assert.equal((await a.getRow(location)).archive, latest.archive);
  console.log("PASS: failure before commit rolls staged changes back.");

  await assert.rejects(outsider.getRow(location), (error) => [401, 403, 404].includes(Number(error.code)));
  await assert.rejects(save(outsider, latest, "unauthorized"), (error) => [401, 403, 404].includes(Number(error.code)));
  assert.equal((await a.getRow(location)).archive, latest.archive);
  console.log("PASS: another authenticated user cannot read or replace the private save.");

  await a.deleteRow(location);
  const racingCreation = intercept(a, "upsertRow", async () => {});
  racingCreation.upsertRow = async (args) => {
    const staged = await a.upsertRow(args);
    // Device B creates the slot after A stages but before A reads or commits.
    await save(b, null, "device-B-first-save");
    return staged;
  };
  await assert.rejects(save(racingCreation, null, "device-A-first-save"), isConflict);
  assert.equal((await a.getRow(location)).archive, "device-B-first-save");
  console.log("PASS: competing first-save creation cannot replace the winning slot.");
} catch (error) {
  // Do not serialize SDK errors or requests: they may carry session headers.
  console.error(`Live cloud smoke failed: ${error.name || "Error"} (${error.type || error.code || "verification failure"})`);
  process.exitCode = 1;
} finally {
  let cleanupFailed = false;
  if (createdUsers.includes(testId)) {
    try { cli(["tablesdb", "delete-row", "--database-id", location.databaseId, "--table-id", location.tableId, "--row-id", testId]); }
    catch { cleanupFailed = true; console.error(`Temporary save cleanup failed for ${testId}`); }
  }
  for (const userId of createdUsers.reverse()) {
    try { cli(["users", "delete", "--user-id", userId]); }
    catch { cleanupFailed = true; console.error(`Temporary user cleanup failed for ${userId}`); }
  }
  if (cleanupFailed) process.exitCode = 1;
  else if (createdUsers.length) console.log("Temporary save, users and sessions removed.");
}
