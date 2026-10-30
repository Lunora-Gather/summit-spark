#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const config = require("../appwrite.config.json");

// Compare metadata only. Never read users, save rows, API keys or CLI credentials.
function checkSnapshot({ project, policies, platforms, database, table }, expected = config) {
  const errors = [];
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const checkFlags = (actual, wanted, label) => {
    const flags = new Map((actual || []).map((entry) => [entry.$id, entry.enabled]));
    for (const [id, enabled] of Object.entries(wanted)) {
      check(flags.get(id) === enabled, `${label}.${id} differs`);
    }
  };
  check(project.$id === expected.projectId, "project ID differs");
  checkFlags(project.services, expected.settings.services, "services");
  checkFlags(project.protocols, expected.settings.protocols, "protocols");
  checkFlags(project.authMethods, expected.settings.auth.methods, "auth methods");
  const security = expected.settings.auth.security;
  const policyMap = new Map((policies.policies || []).map((entry) => [entry.$id, entry]));
  for (const [id, field, value] of [
    ["session-duration", "duration", security.duration],
    ["session-limit", "total", security.sessionsLimit],
    ["password-history", "total", security.passwordHistory],
    ["password-dictionary", "enabled", security.passwordDictionary],
    ["password-personal-data", "enabled", security.personalDataCheck],
    ["session-alert", "enabled", security.sessionAlerts]
  ]) check(policyMap.get(id)?.[field] === value, `policy ${id} differs`);
  const webHosts = (platforms.platforms || []).filter((entry) => entry.type === "web").map((entry) => entry.hostname);
  for (const host of ["localhost", "127.0.0.1", "lunora-gather.github.io"]) {
    check(webHosts.includes(host), `missing web platform ${host}`);
  }
  check(webHosts.every((host) => ["localhost", "127.0.0.1", "lunora-gather.github.io"].includes(host)), "unexpected web platform");
  const expectedTable = expected.tables[0];
  check(database.$id === expectedTable.databaseId && database.enabled === true, "database missing or disabled");
  check(table.$id === expectedTable.$id && table.databaseId === expectedTable.databaseId && table.enabled === true, "table missing or disabled");
  check(table.rowSecurity === true, "row security disabled");
  check(JSON.stringify([...(table.$permissions || [])].sort()) === JSON.stringify([...expectedTable.$permissions].sort()), "table permissions differ");
  check(table.columns?.length === expectedTable.columns.length, "column count differs");
  for (const column of expectedTable.columns) {
    const actual = table.columns?.find((entry) => entry.key === column.key);
    check(actual?.status === "available", `column ${column.key} unavailable`);
    for (const field of ["type", "required", "array", "size", "encrypt"]) {
      if (column[field] !== undefined) check(actual?.[field] === column[field], `column ${column.key}.${field} differs`);
    }
  }
  return errors;
}

function cli(args) {
  const result = spawnSync("appwrite", [...args, "--config-file", path.join(__dirname, "..", "appwrite.config.json"), "--json"], {
    encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024
  });
  // Do not echo raw responses or stderr, which may contain account metadata.
  if (result.error || result.status !== 0) throw new Error(`Appwrite ${args.slice(0, 2).join(" ")} failed; verify CLI login and project access`);
  try { return JSON.parse(result.stdout); }
  catch { throw new Error(`Appwrite ${args.slice(0, 2).join(" ")} did not return JSON`); }
}

function main() {
  const snapshot = {
    project: cli(["project", "get"]),
    policies: cli(["project", "list-policies", "--limit", "100"]),
    platforms: cli(["project", "list-platforms", "--limit", "100"]),
    database: cli(["tablesdb", "get", "--database-id", config.projectId]),
    table: cli(["tablesdb", "get-table", "--database-id", config.projectId, "--table-id", "saves"])
  };
  const errors = checkSnapshot(snapshot);
  if (errors.length) throw new Error(errors.join("; "));
  console.log("Live Appwrite check passed: auth, services, policies, web platforms, database, private table permissions and available columns match. No user data read or changed.");
}

module.exports = { checkSnapshot };
if (require.main === module) {
  try { main(); }
  catch (error) { console.error(`Live Appwrite check failed: ${error.message}`); process.exitCode = 1; }
}
