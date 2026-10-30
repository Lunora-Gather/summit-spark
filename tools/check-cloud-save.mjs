#!/usr/bin/env node
import assert from "node:assert/strict";
import { commitCloudSave } from "../public/modules/systems/cloud-save.mjs";

const location = { databaseId: "test", tableId: "saves", rowId: "owner" };
const permissions = ['read("user:owner")', 'update("user:owner")', 'delete("user:owner")'];
function backend(initial = { archive: "base", $updatedAt: "1" }) {
  let row = initial;
  let revision = 1;
  let nextId = 0;
  const transactions = new Map();
  const calls = [];
  const write = (archive) => { row = { archive, $updatedAt: String(++revision) }; return row; };
  const api = {
    calls, write,
    read: () => row && structuredClone(row),
    async createTransaction({ ttl }) {
      assert.equal(ttl, 60);
      const $id = String(++nextId);
      transactions.set($id, {});
      return { $id };
    },
    async upsertRow(payload) {
      assert.ok(payload.transactionId, "all writes must be staged");
      assert.deepEqual(payload.permissions, permissions);
      calls.push("stage");
      transactions.set(payload.transactionId, { payload, revision });
      await api.afterStage?.();
      return { ...payload.data, $updatedAt: "staged-not-committed" };
    },
    async getRow() {
      calls.push("read");
      await api.beforeRead?.();
      if (!row) throw { code: 404 };
      return api.read();
    },
    async updateTransaction({ transactionId, commit, rollback }) {
      if (rollback) { calls.push("rollback"); return {}; }
      assert.equal(commit, true);
      calls.push("commit");
      await api.beforeCommit?.();
      const staged = transactions.get(transactionId);
      if (staged.revision !== revision) throw { code: 409, type: "transaction_conflict" };
      write(staged.payload.data.archive);
      await api.afterCommit?.();
      return { status: "committed" };
    },
    async deleteTransaction({ transactionId }) { calls.push("cleanup"); transactions.delete(transactionId); }
  };
  return api;
}
const save = (api, expectedRow, archive = "local") => commitCloudSave(api, {
  location, expectedRow, data: { build: "test", archive }, permissions
});
const isConflict = (error) => error.type === "cloud_save_conflict";

{
  const api = backend();
  const result = await save(api, api.read());
  assert.equal(result.archive, "local");
  assert.notEqual(result.$updatedAt, "staged-not-committed");
  assert.deepEqual(api.calls, ["stage", "read", "commit", "read", "cleanup"]);
}
{
  const api = backend();
  const stale = api.read();
  api.write("newer-device");
  await assert.rejects(save(api, stale), isConflict);
  assert.equal(api.read().archive, "newer-device");
  assert.ok(!api.calls.includes("commit"));
  assert.ok(api.calls.includes("rollback"));
  // Explicit choice may replace the version that the user has now reviewed.
  await save(api, api.read());
  assert.equal(api.read().archive, "local");
}
for (const phase of ["afterStage", "beforeCommit", "afterCommit"]) {
  const api = backend();
  const expected = api.read();
  api[phase] = () => { api.write("concurrent-device"); };
  await assert.rejects(save(api, expected), isConflict);
  assert.equal(api.read().archive, "concurrent-device", phase);
  assert.ok(api.calls.includes("cleanup"));
}
{
  const api = backend(null);
  await save(api, null);
  assert.equal(api.read().archive, "local", "first save creates its private slot");
}
{
  const api = backend(null);
  api.afterStage = () => { api.write("other-first-save"); };
  await assert.rejects(save(api, null), isConflict);
  assert.equal(api.read().archive, "other-first-save");
}
for (const phase of ["afterStage", "beforeRead", "beforeCommit"]) {
  const api = backend();
  const expected = api.read();
  api[phase] = () => { throw { code: 503 }; };
  await assert.rejects(save(api, expected), (error) => error.code === 503);
  assert.equal(api.read().archive, "base", "failed operations preserve the prior row");
  assert.ok(api.calls.includes("rollback"));
  assert.ok(api.calls.includes("cleanup"));
}
{
  const api = backend();
  const expected = api.read();
  api.beforeCommit = () => { api.beforeRead = () => { throw { code: 503 }; }; throw { code: 409 }; };
  await assert.rejects(save(api, expected), (error) => isConflict(error) && !error.remoteKnown);
}
{
  const api = backend();
  api.updateTransaction = async () => { throw { code: 503 }; };
  api.deleteTransaction = async () => { throw new Error("cleanup unavailable"); };
  await assert.rejects(save(api, api.read()), (error) => error.code === 503, "cleanup must preserve the actionable failure");
}
await assert.rejects(save({}, null), TypeError, "missing transaction support must fail closed");
console.log("Cloud save checks passed: stage/read/commit ordering, stale devices, concurrent commits, first-save race, committed revisions, rollback, cleanup and fail-closed behavior.");
