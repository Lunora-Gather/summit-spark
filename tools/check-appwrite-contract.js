#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

let config;
try {
  config = JSON.parse(read("appwrite.config.json"));
} catch (error) {
  fail(`appwrite.config.json is not valid JSON: ${error.message}`);
  config = {};
}

const source = read("summit-spark.js");
const methods = config.settings?.auth?.methods || {};
const security = config.settings?.auth?.security || {};
const database = (config.tablesDB || []).find((entry) => entry.$id === "summit-spark");
const table = (config.tables || []).find((entry) => entry.$id === "saves" && entry.databaseId === "summit-spark");

if (config.projectId !== "summit-spark") fail("Appwrite projectId must remain summit-spark");
if (config.endpoint !== "https://fra.cloud.appwrite.io/v1") fail("Appwrite project config must pin the fra regional endpoint");
if (!methods["email-password"] || !methods["email-otp"]) fail("email-password and email-otp authentication must both stay enabled");
if (methods.anonymous !== false || methods.phone !== false || methods["magic-url"] !== false) fail("unused anonymous, phone and magic-url authentication must stay disabled");
if (security.passwordDictionary !== true) fail("common-password dictionary protection must stay enabled");
if (security.personalDataCheck !== true) fail("password personal-data protection must stay enabled");
if (!database?.enabled) fail("summit-spark cloud-save database must exist and stay enabled");
if (!table?.enabled || table.rowSecurity !== true) fail("saves table must exist with row security enabled");

const permissions = table?.$permissions || [];
if (!permissions.includes('create("users")')) fail('saves table must allow create("users")');
if (permissions.some((permission) => /any|guests/.test(permission))) fail("saves table must not grant public or guest permissions");

const columns = new Map((table?.columns || []).map((column) => [column.key, column]));
const buildColumn = columns.get("build");
const archiveColumn = columns.get("archive");
if (!buildColumn || buildColumn.type !== "varchar" || buildColumn.size !== 64 || buildColumn.required !== true) {
  fail("saves.build must be a required varchar(64)");
}
if (!archiveColumn || archiveColumn.type !== "longtext" || archiveColumn.required !== true) {
  fail("saves.archive must be required longtext storage");
}
if (columns.size !== 2) fail("saves table should contain only build and archive columns");

for (const fragment of [
  "const SAVE_ARCHIVE_MAX_CHARS = 1000000",
  'const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1"',
  'const APPWRITE_PROJECT_ID = "summit-spark"',
  'const APPWRITE_DATABASE_ID = "summit-spark"',
  'const APPWRITE_SAVES_TABLE_ID = "saves"'
]) {
  if (!source.includes(fragment)) fail(`frontend Appwrite contract is missing ${fragment}`);
}

if (errors.length > 0) {
  console.error("Appwrite contract check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Appwrite contract check passed: regional endpoint, auth policies, private row security and saves schema verified.");
